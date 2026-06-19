import Team from '../models/Team.js';
import User from '../models/User.js';

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required.' });
    }

    const team = await Team.create({
      name,
      description,
      creator: req.user._id,
      members: [req.user._id],
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar');

    return res.status(201).json(populatedTeam);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's teams
// @route   GET /api/teams
// @access  Private
export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      members: req.user._id
    })
    .sort({ createdAt: -1 })
    .populate('creator', 'name email avatar')
    .populate('members', 'name email avatar');

    return res.json(teams);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to team
// @route   POST /api/teams/:teamId/member
// @access  Private
export const addMemberToTeam = async (req, res) => {
  try {
    const { email } = req.body;
    const { teamId } = req.params;

    if (!email) {
      return res.status(400).json({ message: 'User email is required.' });
    }

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    // Verify that the request sender is a member of the team
    const isUserMember = team.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isUserMember) {
      return res.status(403).json({ message: 'Not authorized to modify this team.' });
    }

    const userToAdd = await User.findOne({ email });

    if (!userToAdd) {
      return res.status(404).json({ message: 'User not found with this email.' });
    }

    const isAlreadyMember = team.members.some(
      (m) => m._id.toString() === userToAdd._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this team.' });
    }

    team.members.push(userToAdd._id);
    await team.save();

    const updatedTeam = await Team.findById(teamId)
      .populate('creator', 'name email avatar')
      .populate('members', 'name email avatar');

    return res.json(updatedTeam);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update team shared notes
// @route   PUT /api/teams/:teamId/notes
// @access  Private
export const updateSharedNotes = async (req, res) => {
  try {
    const { sharedNotes } = req.body;
    const { teamId } = req.params;

    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ message: 'Team not found.' });
    }

    // Verify membership
    const isUserMember = team.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isUserMember) {
      return res.status(403).json({ message: 'Not authorized to update notes.' });
    }

    team.sharedNotes = sharedNotes || '';
    await team.save();

    return res.json({ sharedNotes: team.sharedNotes });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
