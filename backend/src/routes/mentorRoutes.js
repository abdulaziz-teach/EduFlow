import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { aiChatLimiter } from '../middleware/aiRateLimiter.js';
import {
  chat,
  getConversations,
  getConversationById,
  deleteConversation,
  submitFeedback,
} from '../controllers/mentorController.js';

const router = Router();

// Allow both logged-in and guest users to chat with the AI mentor
router.use(optionalAuth);

router.post('/chat', aiChatLimiter, chat);
router.post('/feedback', submitFeedback);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

export default router;
