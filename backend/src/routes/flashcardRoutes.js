import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getDecks,
  getDeckById,
  createDeck,
  generateDeckWithAI,
  reviewCard,
  updateDeck,
  deleteDeck,
  reviewStandaloneCard,
  getDueCards,
} from '../controllers/flashcardController.js';

const router = Router();

router.use(protect);

router.get('/', getDecks);
router.post('/', createDeck);
router.post('/generate', generateDeckWithAI);
router.get('/due', getDueCards);
router.get('/:id', getDeckById);
router.put('/:id', updateDeck);
router.delete('/:id', deleteDeck);
router.post('/:id/cards/:cardId/review', reviewCard);
router.post('/cards/:id/review', reviewStandaloneCard);

export default router;
