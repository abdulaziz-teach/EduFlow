import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import { summarizeContent, convertToDeck } from '../controllers/smartNoteController.js';

const router = Router();

router.use(protect);

router.post('/summarize', summarizeContent);
router.post('/convert-to-deck', convertToDeck);

export default router;
