import { Router } from 'express';
import {
  getAchievements,
  unlock,
  createAchievement,
} from '../controllers/achievementController.js';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, getAchievements);
router.post('/:id/unlock', protect, unlock);
router.post('/', protect, requireAdmin, createAchievement);

export default router;
