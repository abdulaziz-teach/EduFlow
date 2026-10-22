import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getNextAction,
  getMasteryList,
  explainTopicMastery,
  checkTopicPrerequisites,
  getMistakes,
  resolveMistake,
  getAdminInsights,
} from '../controllers/adaptiveController.js';

const router = Router();

// All adaptive routes require authentication
router.use(protect);

router.get('/next-action', getNextAction);
router.get('/mastery', getMasteryList);
router.get('/mastery/:topic/explain', explainTopicMastery);
router.get('/prerequisites/:topic', checkTopicPrerequisites);
router.get('/mistakes', getMistakes);
router.post('/mistakes/:id/resolve', resolveMistake);
router.get('/admin/insights', getAdminInsights);

export default router;
