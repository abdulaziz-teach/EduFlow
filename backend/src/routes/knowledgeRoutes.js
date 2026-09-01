import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getSummary,
  getSubjectsBreakdown,
  getRecommendations,
  getTopicDetail,
} from '../controllers/knowledgeController.js';

const router = Router();

// All knowledge endpoints require authenticated user session
router.use(protect);

router.get('/summary', getSummary);
router.get('/subjects', getSubjectsBreakdown);
router.get('/recommendations', getRecommendations);
router.get('/topics/:id', getTopicDetail);

export default router;
