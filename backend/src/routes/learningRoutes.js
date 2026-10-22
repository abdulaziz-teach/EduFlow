import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { aiQuizLimiter } from '../middleware/aiRateLimiter.js';
import {
  getProfile,
  getWeakTopics,
  getRecommendations,
  getDailyPlan,
  regenerateDailyPlan,
  toggleDailyPlanTask,
  getMemories,
  deleteMemory,
  generateQuiz,
  getAnalytics,
} from '../controllers/learningController.js';

const router = Router();

// Protect all personalization and learning routes
router.use(protect);

router.get('/profile', getProfile);
router.get('/weak-topics', getWeakTopics);
router.get('/recommendations', getRecommendations);
router.get('/daily-plan', getDailyPlan);
router.post('/daily-plan/generate', regenerateDailyPlan);
router.patch('/daily-plan/tasks/:taskId', toggleDailyPlanTask);
router.get('/memories', getMemories);
router.delete('/memories/:id', deleteMemory);
router.post('/quiz/generate', aiQuizLimiter, generateQuiz);
router.get('/analytics', getAnalytics);

export default router;
