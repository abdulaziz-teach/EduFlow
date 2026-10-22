import Payment from '../models/Payment.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { getAllActivePlans, getPlan, isPlanValid } from '../services/planCatalog.js';
import { getPaymentProvider } from '../services/paymentProviders.js';
import {
  getEntitlements,
  cancelSubscription as cancelSubService,
  resumeSubscription as resumeSubService,
  revokeSubscription,
} from '../services/entitlementService.js';
import { processWebhook } from '../services/billingWebhookService.js';

/**
 * @desc    Get all available subscription plans & pricing
 * @route   GET /api/billing/plans
 * @access  Public / Authenticated
 */
export const getPlans = async (_req, res, next) => {
  try {
    const plans = getAllActivePlans();
    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's current subscription & entitlements
 * @route   GET /api/billing/subscription
 * @access  Private
 */
export const getSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const entitlements = await getEntitlements(userId);

    res.status(200).json({
      success: true,
      ...entitlements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create checkout session for plan upgrade
 * @route   POST /api/billing/checkout
 * @access  Private
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { planId, provider = 'mock', successUrl, cancelUrl } = req.body;

    if (!planId || !isPlanValid(planId)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PLAN',
        message: 'Invalid or inactive plan selected.',
      });
    }

    const plan = getPlan(planId);
    if (plan.price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'FREE_PLAN_CHECKOUT',
        message: 'The basic plan is free and does not require checkout.',
      });
    }

    const paymentProvider = getPaymentProvider(provider);
    const checkoutResult = await paymentProvider.createCheckout({
      userId,
      planId: plan.id,
      customerEmail: req.user.email,
      successUrl,
      cancelUrl,
      metadata: { userId: userId.toString(), planId: plan.id },
    });

    // Create durable pending Payment record
    const payment = await Payment.create({
      userId,
      provider,
      providerPaymentId: checkoutResult.sessionId,
      planId: plan.id,
      amount: plan.price,
      currency: plan.currency,
      status: 'pending',
      type: 'subscription',
      metadata: {
        sessionId: checkoutResult.sessionId,
      },
    });

    res.status(200).json({
      success: true,
      checkoutUrl: checkoutResult.checkoutUrl,
      sessionId: checkoutResult.sessionId,
      paymentId: payment._id,
      amount: plan.price,
      currency: plan.currency,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel active subscription
 * @route   POST /api/billing/cancel
 * @access  Private
 */
export const cancelSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { atPeriodEnd = true } = req.body;

    const subscription = await cancelSubService(userId, atPeriodEnd);

    res.status(200).json({
      success: true,
      message: atPeriodEnd
        ? 'Your subscription has been scheduled to cancel at the end of the current billing cycle.'
        : 'Your subscription has been canceled immediately.',
      subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resume a canceled subscription before current period ends
 * @route   POST /api/billing/resume
 * @access  Private
 */
export const resumeSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const subscription = await resumeSubService(userId);

    res.status(200).json({
      success: true,
      message: 'Your subscription has been successfully resumed!',
      subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's payment and billing history
 * @route   GET /api/billing/history
 * @access  Private
 */
export const getBillingHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ userId }),
    ]);

    res.status(200).json({
      success: true,
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process incoming provider webhook
 * @route   POST /api/billing/webhook
 * @access  Public (Signature-verified)
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const provider = req.query.provider || 'mock';
    const signatureHeader = req.headers['stripe-signature'] || req.headers['x-signature'] || '';
    const rawBody = req.rawBody;

    const result = await processWebhook({
      provider,
      payload: req.body,
      rawBody,
      payloadString: rawBody ? rawBody.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)),
      signatureHeader,
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.errorCode === 'INVALID_SIGNATURE') {
      return res.status(401).json({ success: false, error: 'INVALID_SIGNATURE', message: error.message });
    }
    if (error.errorCode === 'MALFORMED_PAYLOAD') {
      return res.status(400).json({ success: false, error: 'MALFORMED_PAYLOAD', message: error.message });
    }
    next(error);
  }
};

// -------------------------------------------------------------
// Admin Billing Endpoints
// -------------------------------------------------------------

/**
 * @desc    Admin: Get overview revenue metrics & subscriber counts
 * @route   GET /api/billing/admin/stats
 * @access  Private (Admin)
 */
export const getAdminBillingStats = async (_req, res, next) => {
  try {
    const [
      activeCount,
      pastDueCount,
      canceledCount,
      succeededPayments,
      failedPaymentsCount,
      refundedPaymentsCount,
      planBreakdown,
    ] = await Promise.all([
      Subscription.countDocuments({ status: 'active', plan: { $ne: 'free' } }),
      Subscription.countDocuments({ status: 'past_due' }),
      Subscription.countDocuments({ status: 'canceled' }),
      Payment.aggregate([
        { $match: { status: 'succeeded' } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ status: 'refunded' }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
      ]),
    ]);

    // Calculate Monthly Recurring Revenue (MRR in cents)
    let mrrCents = 0;
    const planCounts = Object.fromEntries(planBreakdown.map((p) => [p._id, p.count]));
    if (planCounts.pro_monthly) mrrCents += planCounts.pro_monthly * 1200;
    if (planCounts.premium) mrrCents += planCounts.premium * 1200;
    if (planCounts.pro_annual) mrrCents += Math.round((planCounts.pro_annual * 9900) / 12);

    const totalRevenueCents = succeededPayments[0]?.totalAmount || 0;

    res.status(200).json({
      success: true,
      stats: {
        mrr: mrrCents / 100,
        totalRevenue: totalRevenueCents / 100,
        activeSubscribers: activeCount,
        pastDueSubscribers: pastDueCount,
        canceledSubscribers: canceledCount,
        failedPayments: failedPaymentsCount,
        refundedPayments: refundedPaymentsCount,
        planBreakdown: planCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get paginated subscriptions
 * @route   GET /api/billing/admin/subscriptions
 * @access  Private (Admin)
 */
export const getAdminSubscriptions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.plan) query.plan = req.query.plan;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('userId', 'email name displayName role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      subscriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get paginated payments
 * @route   GET /api/billing/admin/payments
 * @access  Private (Admin)
 */
export const getAdminPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'email name displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Issue refund for a payment and revoke subscription entitlement
 * @route   POST /api/billing/admin/refund
 * @access  Private (Admin)
 */
export const processAdminRefund = async (req, res, next) => {
  try {
    const { paymentId, reason = 'admin_issued_refund' } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Payment record not found.' });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({ success: false, error: 'ALREADY_REFUNDED', message: 'This payment has already been refunded.' });
    }

    const provider = getPaymentProvider(payment.provider);
    await provider.refundPayment(payment.providerPaymentId, payment.amount);

    payment.status = 'refunded';
    payment.refundedAmount = payment.amount;
    await payment.save();

    // Revoke entitlement
    await revokeSubscription(payment.userId, reason);

    await AuditLog.create({
      actorId: req.user._id,
      actorRole: 'admin',
      action: 'admin_refund_issued',
      resourceType: 'payment',
      resourceId: payment._id.toString(),
      metadata: { amount: payment.amount, reason, userId: payment.userId },
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: 'Payment refunded and subscription entitlement revoked successfully.',
      payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Reconcile payments and subscriptions
 * @route   POST /api/billing/admin/reconcile
 * @access  Private (Admin)
 */
export const reconcileBilling = async (_req, res, next) => {
  try {
    // Find active subscriptions whose period has expired
    const expiredActive = await Subscription.find({
      status: 'active',
      plan: { $ne: 'free' },
      currentPeriodEnd: { $lt: new Date() },
    }).select('_id userId plan currentPeriodEnd').lean();

    // Reconcile expired subscriptions to 'expired'
    let reconciledCount = 0;
    for (const sub of expiredActive) {
      await Subscription.updateOne(
        { _id: sub._id },
        { $set: { status: 'expired', plan: 'free', planId: 'free' } }
      );
      reconciledCount++;
    }

    res.status(200).json({
      success: true,
      message: `Reconciliation complete. ${reconciledCount} expired subscription(s) updated.`,
      reconciledCount,
      expiredActiveCount: expiredActive.length,
    });
  } catch (error) {
    next(error);
  }
};
