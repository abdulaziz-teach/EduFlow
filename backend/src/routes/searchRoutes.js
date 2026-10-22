import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  search,
  suggestions,
  discovery,
  trackEvent,
  adminAnalytics,
} from '../controllers/searchController.js';
import protect, { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Dedicated rate limiter for search to prevent abuse and denial-of-service
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 searches/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many search requests — please slow down.',
  },
});

// Search & Discovery routes
router.get('/', searchLimiter, optionalAuth, search);
router.get('/suggestions', searchLimiter, suggestions);
router.get('/discovery', optionalAuth, discovery);
router.post('/events', optionalAuth, trackEvent);

// Admin analytics (Protected)
router.get('/admin/analytics', protect, requireAdmin, adminAnalytics);

export default router;
