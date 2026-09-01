import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  generatePlan,
  getCurrentPlan,
  getPlanById,
  completeTask,
  getTodayTasks,
  getStudyRecommendation,
  getDailyCoach,
  adaptPlan,
  getAdaptations,
  getAdaptationExplanation,
  exportPlanICS,
} from '../controllers/studyPlanController.js';

const router = Router();

// All study plan routes require authentication
router.use(protect);

router.post('/generate', generatePlan);
router.get('/current', getCurrentPlan);
router.get('/today', getTodayTasks);
router.get('/recommendation', getStudyRecommendation);
router.post('/daily-coach', getDailyCoach);
router.post('/adapt', adaptPlan);
router.post('/adaptation-explanation', getAdaptationExplanation);
router.get('/:id/export-ics', exportPlanICS);
router.get('/:id/adaptations', getAdaptations);
router.get('/:id', getPlanById);
router.patch('/:planId/tasks/:taskId/complete', completeTask);

export default router;
