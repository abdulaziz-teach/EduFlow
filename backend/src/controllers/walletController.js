import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { getOrCreateWallet, creditBalance, debitBalance } from '../services/walletService.js';
import { logAdminAction } from '../services/auditService.js';

/**
 * @desc    Get current user's wallet
 * @route   GET /api/wallet
 * @access  Protected
 */
export const getMyWallet = async (req, res, next) => {
  try {
    const wallet = await getOrCreateWallet(req.user._id);

    res.json({
      success: true,
      wallet: {
        id: wallet._id,
        coins: wallet.coins,
        gems: wallet.gems,
        tickets: wallet.tickets,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's wallet transaction history
 * @route   GET /api/wallet/transactions
 * @access  Protected
 */
export const getMyTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit, 10) || 20), 50);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Spend currency
 * @route   POST /api/wallet/spend
 * @access  Protected
 */
export const spend = async (req, res, next) => {
  try {
    const { currency, amount, referenceType, referenceId, idempotencyKey, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_AMOUNT',
        message: 'Amount must be greater than zero',
      });
    }

    const result = await debitBalance({
      userId: req.user._id,
      currency,
      amount,
      type: 'spend',
      referenceType: referenceType || 'user_action',
      referenceId,
      idempotencyKey,
      metadata,
    });

    res.json({
      success: true,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient balance to complete this operation',
      });
    }
    next(error);
  }
};

/**
 * @desc    Admin manual adjustment of user wallet
 * @route   POST /api/wallet/adjust
 * @access  Protected (Admin only)
 */
export const adminAdjustment = async (req, res, next) => {
  try {
    const { targetUserId, currency, amount, type, reason } = req.body;

    if (!targetUserId || !currency || typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Target user ID, currency, and non-zero amount are required',
      });
    }

    let result;
    if (amount > 0) {
      result = await creditBalance({
        userId: targetUserId,
        currency,
        amount,
        type: 'admin_adjustment',
        referenceType: 'admin',
        referenceId: req.user._id.toString(),
        metadata: { reason: reason || 'Manual adjustment' },
      });
    } else {
      result = await debitBalance({
        userId: targetUserId,
        currency,
        amount: Math.abs(amount),
        type: 'admin_adjustment',
        referenceType: 'admin',
        referenceId: req.user._id.toString(),
        metadata: { reason: reason || 'Manual adjustment' },
      });
    }

    await logAdminAction({
      adminUserId: req.user._id,
      action: 'wallet_adjusted',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { currency, amount, reason },
    });

    res.json({
      success: true,
      message: 'Wallet balance adjusted successfully',
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (error) {
    next(error);
  }
};
