import { Router } from 'express';
import {
  getShopItems,
  buyItem,
  getMyInventory,
  createShopItem,
} from '../controllers/shopController.js';
import protect, { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/items', getShopItems);
router.post('/purchase', protect, buyItem);
router.get('/inventory', protect, getMyInventory);
router.post('/items', protect, requireAdmin, createShopItem);

export default router;
