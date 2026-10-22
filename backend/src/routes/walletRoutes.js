import { Router } from 'express';
import {
  getMyWallet,
  getMyTransactions,
  spend,
  adminAdjustment,
} from '../controllers/walletController.js';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', protect, getMyWallet);
router.get('/transactions', protect, getMyTransactions);
router.post('/spend', protect, spend);
router.post('/adjust', protect, requireAdmin, adminAdjustment);

export default router;
