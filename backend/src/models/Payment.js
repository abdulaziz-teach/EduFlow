import mongoose from 'mongoose';

/**
 * Payment Model
 * Durable record of financial transactions, billing events, and payment receipts.
 */
const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'lemonsqueezy', 'payme', 'click', 'internal', 'mock'],
      required: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: null,
      index: true,
    },
    providerCustomerId: {
      type: String,
      default: null,
    },
    planId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payment amount must be non-negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled'],
      default: 'pending',
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'one_time'],
      default: 'subscription',
    },
    idempotencyKey: {
      type: String,
      default: undefined,
      sparse: true,
      unique: true,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user payment history and revenue analysis
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, providerPaymentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
