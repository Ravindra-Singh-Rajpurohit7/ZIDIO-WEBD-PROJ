import express from 'express';
import { generateSummary, getSummary } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/summary/:meetingId')
  .post(protect, generateSummary)
  .get(protect, getSummary);

export default router;
