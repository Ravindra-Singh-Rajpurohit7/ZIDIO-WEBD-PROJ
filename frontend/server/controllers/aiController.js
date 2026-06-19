import Meeting from '../models/Meeting.js';
import Message from '../models/Message.js';
import Summary from '../models/Summary.js';
import { generateMeetingSummary } from '../utils/openaiHelper.js';

// @desc    Generate summary & action items for a meeting
// @route   POST /api/ai/summary/:meetingId
// @access  Private
export const generateSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }

    // Retrieve all messages for this meeting, sorted in chronological order
    const messages = await Message.find({ meeting: meeting._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name email');

    if (messages.length === 0) {
      return res.status(400).json({ message: 'No messages found to generate summary.' });
    }

    // Call OpenAI or local fallback helper
    const { summary, actionItems } = await generateMeetingSummary(messages);

    // Format full transcript for storage
    const transcriptText = messages
      .map((m) => `${m.sender?.name || 'User'}: ${m.text}`)
      .join('\n');

    // Save or update existing summary
    let summaryDoc = await Summary.findOne({ meeting: meeting._id });

    if (summaryDoc) {
      summaryDoc.transcript = transcriptText;
      summaryDoc.summary = summary;
      summaryDoc.actionItems = actionItems;
      summaryDoc.generatedBy = req.user._id;
      await summaryDoc.save();
    } else {
      summaryDoc = await Summary.create({
        meeting: meeting._id,
        transcript: transcriptText,
        summary,
        actionItems,
        generatedBy: req.user._id,
      });
    }

    return res.status(201).json(summaryDoc);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get summary for a meeting
// @route   GET /api/ai/summary/:meetingId
// @access  Private
export const getSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found.' });
    }

    const summary = await Summary.findOne({ meeting: meeting._id })
      .populate('generatedBy', 'name email');

    if (!summary) {
      return res.status(404).json({ message: 'No summary generated yet for this meeting.' });
    }

    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
