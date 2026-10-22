import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: [true, 'Wallet ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['earn', 'spend', 'refund', 'reward', 'purchase', 'admin_adjustment'],
      required: true,
      index: true,
    },
    currency: {
      type: String,
      enum: ['coins', 'gems', 'tickets'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Transaction amount must be non-negative'],
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      default: 'system',
    },
    referenceId: {
      type: String,
      default: null,
    },
    idempotencyKey: {
      type: String,
      default: undefined,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for transaction history and idempotency protection
walletTransactionSchema.index({ userId: 1, createdAt: -1 });
walletTransactionSchema.index({ walletId: 1, createdAt: -1 });
walletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
