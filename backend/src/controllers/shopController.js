import ShopItem from '../models/ShopItem.js';
import Inventory from '../models/Inventory.js';
import { purchaseItem } from '../services/shopService.js';
import { logAdminAction } from '../services/auditService.js';

/**
 * @desc    Get active shop items
 * @route   GET /api/shop/items
 * @access  Public
 */
export const getShopItems = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = { active: true };
    if (type) query.type = type;

    const items = await ShopItem.find(query).sort({ price: 1 }).lean();

    res.json({
      success: true,
      items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Purchase shop item
 * @route   POST /api/shop/purchase
 * @access  Protected
 */
export const buyItem = async (req, res, next) => {
  try {
    const { itemId, idempotencyKey } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'ITEM_REQUIRED',
        message: 'Item ID is required',
      });
    }

    const result = await purchaseItem({
      userId: req.user._id,
      itemId,
      idempotencyKey,
    });

    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's purchased inventory
 * @route   GET /api/shop/inventory
 * @access  Protected
 */
export const getMyInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.find({ userId: req.user._id })
      .populate('itemId', 'name description type price currency metadata')
      .sort({ acquiredAt: -1 })
      .lean();

    res.json({
      success: true,
      inventory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create shop item
 * @route   POST /api/shop/items
 * @access  Protected (Admin only)
 */
export const createShopItem = async (req, res, next) => {
  try {
    const { name, description, type, price, currency, metadata, stock, active } = req.body;

    const item = await ShopItem.create({
      name,
      description: description || '',
      type,
      price,
      currency: currency || 'coins',
      metadata: metadata || {},
      stock: stock !== undefined ? stock : -1,
      active: active !== undefined ? active : true,
    });

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'shop_item_created',
      targetType: 'ShopItem',
      targetId: item._id,
      metadata: { name: item.name, price: item.price, currency: item.currency },
    });

    res.status(201).json({
      success: true,
      item,
    });
  } catch (error) {
    next(error);
  }
};
