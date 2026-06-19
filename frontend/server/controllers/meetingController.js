import Meeting from '../models/Meeting.js';
import crypto from 'crypto';

// Generate standard format room id: e.g. abc-def-ghi
const generateMeetingId = () => {
  const p1 = crypto.randomBytes(2).toString('hex').slice(0, 3);
  const p2 = crypto.randomBytes(2).toString('hex').slice(0, 4);
  const p3 = crypto.randomBytes(2).toString('hex').slice(0, 3);
  return `${p1}-${p2}-${p3}`;
};

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
export const createMeeting = async (req, res) => {
  try {
    const { title, scheduledAt } = req.body;

    const meeting = await Meeting.create({
      meetingId: generateMeetingId(),
      host: req.user._id,
      title: title || 'Quick Video Meet',
      scheduledAt: scheduledAt || new Date(),
      participants: [req.user._id],
    });

    return res.status(201).json(meeting);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get details / join a meeting
// @route   GET /api/meetings/:meetingId
// @access  Private
export const getMeetingDetails = async (req, res) => {
  try {
    const { meetingId } = req.params;

    let meeting = await Meeting.findOne({ meetingId })
      .populate('host', 'name email avatar')
      .populate('participants', 'name email avatar');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Add user as participant if they aren't already listed
    const isParticipant = meeting.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      meeting.participants.push(req.user._id);
      await meeting.save();
      
      // Re-populate details after saving
      meeting = await Meeting.findOne({ meetingId })
        .populate('host', 'name email avatar')
        .populate('participants', 'name email avatar');
    }

    return res.json(meeting);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's meeting history
// @route   GET /api/meetings/history
// @access  Private
export const getMeetingHistory = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { participants: req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('host', 'name email avatar')
    .populate('participants', 'name email avatar');

    return res.json(meetings);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
