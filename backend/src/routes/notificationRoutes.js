import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getAchievements,
} from '../controllers/notificationController.js';

const router = Router();

// Protect all notification routes
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.get('/achievements', getAchievements);

router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
