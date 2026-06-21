import express from 'express';
import { createMeeting, getMeetingDetails, getMeetingHistory } from '../controllers/meetingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createMeeting);

router.route('/history')
  .get(protect, getMeetingHistory);

router.route('/:meetingId')
  .get(protect, getMeetingDetails);

export default router;
