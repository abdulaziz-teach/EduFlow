import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { aiChatLimiter } from '../middleware/aiRateLimiter.js';
import {
  chat,
  getConversations,
  getConversationById,
  deleteConversation,
  submitFeedback,
} from '../controllers/mentorController.js';

const router = Router();

// Protect all mentor routes with JWT authentication
router.use(protect);

router.post('/chat', aiChatLimiter, chat);
router.post('/feedback', submitFeedback);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);

export default router;
