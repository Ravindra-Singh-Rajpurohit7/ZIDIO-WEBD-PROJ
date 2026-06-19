import express from 'express';
import { createTeam, getTeams, addMemberToTeam, updateSharedNotes } from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createTeam)
  .get(protect, getTeams);

router.route('/:teamId/member')
  .post(protect, addMemberToTeam);

router.route('/:teamId/notes')
  .put(protect, updateSharedNotes);

export default router;
