import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';
import {
  chat,
  getConversations,
  getConversationById,
  deleteConversation,
} from '../controllers/mentorController.js';

const router = Router();

// Dedicated rate limiter for POST /api/mentor/chat — MVP safety limits
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 messages per 15 minutes - generous and safe
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many messages to the AI Mentor — please try again later',
  },
});

// Protect all mentor routes with JWT authentication
router.use(protect);

router.post('/chat', chatLimiter, chat);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

export default router;
