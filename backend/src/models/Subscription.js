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
      enum: ['free', 'premium', 'pro_monthly', 'pro_annual'],
      default: 'free',
      required: true,
    },
    planId: {
      type: String,
      default: 'free',
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
      enum: ['stripe', 'lemonsqueezy', 'payme', 'click', 'internal', 'mock', 'none'],
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
    canceledAt: {
      type: Date,
      default: null,
    },
    gracePeriodEnd: {
      type: Date,
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

// Compound indexes for active subscription and period lookups
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

// Pre-save sync between plan & planId
subscriptionSchema.pre('save', function (next) {
  if (this.planId && this.planId !== 'free' && (!this.plan || this.plan === 'free')) {
    this.plan = this.planId;
  }
  if (this.plan && !this.planId) {
    this.planId = this.plan;
  }
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
