import mongoose from 'mongoose';

/**
 * Subscription Data Model (Growth & Monetization Architecture)
 * 
 * Manages user subscription tiers (free, premium) independently of user authorization roles (user, admin).
 */
const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'expired'],
      default: 'active',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'lemonsqueezy', 'payme', 'click', 'internal', 'none'],
      default: 'none',
    },
    providerCustomerId: {
      type: String,
      default: null,
    },
    providerSubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active subscription lookups
subscriptionSchema.index({ userId: 1, status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
