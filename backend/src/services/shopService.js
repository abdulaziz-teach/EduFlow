import ShopItem from '../models/ShopItem.js';
import Inventory from '../models/Inventory.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { debitBalance } from './walletService.js';
import { withTransaction } from '../utils/transactionHelper.js';

/**
 * Atomic Shop Item Purchase Workflow
 */
export const purchaseItem = async ({ userId, itemId, idempotencyKey = null }) => {
  return withTransaction(async (session) => {
    const sessionOpts = session ? { session } : {};

    // 1. Idempotency verification
    if (idempotencyKey) {
      const existingTx = await WalletTransaction.findOne(
        { idempotencyKey },
        null,
        sessionOpts
      );
      if (existingTx) {
        const inventory = await Inventory.findOne({ userId, itemId }, null, sessionOpts);
        return {
          success: true,
          duplicate: true,
          transaction: existingTx,
          inventory,
          message: 'Item already purchased (idempotent request)',
        };
      }
    }

    // 2. Validate shop item existence & active status
    const item = await ShopItem.findById(itemId, null, sessionOpts);
    if (!item) {
      const err = new Error('Item not found');
      err.statusCode = 404;
      err.errorCode = 'ITEM_NOT_FOUND';
      throw err;
    }

    if (!item.active) {
      const err = new Error('Item is currently inactive');
      err.statusCode = 400;
      err.errorCode = 'ITEM_INACTIVE';
      throw err;
    }

    // 3. Validate stock if limited
    if (item.stock !== -1 && item.stock <= 0) {
      const err = new Error('Item is out of stock');
      err.statusCode = 400;
      err.errorCode = 'OUT_OF_STOCK';
      throw err;
    }

    // 4. Atomically debit currency from user wallet
    let walletResult;
    try {
      walletResult = await debitBalance({
        userId,
        currency: item.currency,
        amount: item.price,
        type: 'purchase',
        referenceType: 'shop_item',
        referenceId: item._id.toString(),
        idempotencyKey,
        metadata: { itemName: item.name, itemType: item.type },
        session,
      });
    } catch (err) {
      if (err.message === 'INSUFFICIENT_FUNDS') {
        const error = new Error(`Insufficient ${item.currency} balance for this purchase`);
        error.statusCode = 400;
        error.errorCode = 'INSUFFICIENT_FUNDS';
        throw error;
      }
      throw err;
    }

    // 5. Decrement stock if finite
    if (item.stock > 0) {
      const updatedStock = await ShopItem.findOneAndUpdate(
        { _id: item._id, stock: { $gt: 0 } },
        { $inc: { stock: -1 } },
        { new: true, ...sessionOpts }
      );
      if (!updatedStock) {
        const err = new Error('Item went out of stock during transaction');
        err.statusCode = 400;
        err.errorCode = 'OUT_OF_STOCK';
        throw err;
      }
    }

    // 6. Upsert user inventory
    const inventory = await Inventory.findOneAndUpdate(
      { userId, itemId: item._id },
      {
        $inc: { quantity: 1 },
        $setOnInsert: { acquiredAt: new Date() },
      },
      { upsert: true, new: true, ...sessionOpts }
    );

    return {
      success: true,
      duplicate: false,
      item,
      inventory,
      wallet: walletResult.wallet,
      transaction: walletResult.transaction,
    };
  });
};
