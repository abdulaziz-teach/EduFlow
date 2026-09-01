import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getSummary,
  getSubjects,
  getActivity,
  getWeeklyDigest,
} from '../controllers/progressController.js';

const router = Router();

// Protect all endpoints with JWT middleware
router.use(protect);

router.get('/summary', getSummary);
router.get('/subjects', getSubjects);
router.get('/activity', getActivity);
router.get('/weekly-digest', getWeeklyDigest);

export default router;
