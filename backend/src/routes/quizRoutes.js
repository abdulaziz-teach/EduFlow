import { Router } from 'express';
import {
  getQuiz,
  submitQuiz,
  getQuizAttempts,
  createQuiz,
} from '../controllers/quizController.js';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:id', protect, getQuiz);
router.post('/:id/attempt', protect, submitQuiz);
router.get('/:id/attempts', protect, getQuizAttempts);
router.post('/', protect, requireAdmin, createQuiz);

export default router;
