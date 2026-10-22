import { Router } from 'express';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getAchievements,
  broadcastNotification,
  getNotificationStats,
} from '../controllers/notificationController.js';

const router = Router();

// Protect all notification routes
router.use(protect);

// User endpoints
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/preferences', getPreferences);
router.patch('/preferences', updatePreferences);
router.get('/achievements', getAchievements);

// Admin endpoints
router.post('/admin/broadcast', requireAdmin, broadcastNotification);
router.get('/admin/stats', requireAdmin, getNotificationStats);

// Item actions
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
