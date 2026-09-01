import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  generateQuestions,
  createSession,
  quickStartSession,
  submitAnswer,
  completeSession,
  getRecommendation,
  getHistory,
  getSessionDetails,
} from '../controllers/practiceController.js';

const router = Router();

// All practice endpoints require authentication
router.use(protect);

router.post('/generate', generateQuestions);
router.post('/sessions', createSession);
router.post('/quick-start', quickStartSession);
router.get('/sessions/:id', getSessionDetails);
router.post('/sessions/:id/answer', submitAnswer);
router.post('/sessions/:id/complete', completeSession);
router.get('/recommendation', getRecommendation);
router.get('/history', getHistory);

export default router;
