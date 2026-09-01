import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  startSession,
  completeSession,
  getActiveSession,
} from '../controllers/studySessionController.js';

const router = Router();

// Protect all endpoints with JWT middleware
router.use(protect);

router.post('/start', startSession);
router.get('/active', getActiveSession);
router.patch('/:id/complete', completeSession);

export default router;
