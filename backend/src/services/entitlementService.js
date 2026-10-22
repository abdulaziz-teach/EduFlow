import Subscription from '../models/Subscription.js';
import AIUsageLog from '../models/AIUsageLog.js';
import { getPlan, getPlanEntitlements } from './planCatalog.js';

/**
 * EduFlow Entitlement Service
 * Centralized business logic for evaluating user feature entitlements,
 * subscription statuses, grace periods, and feature quotas.
 */

// Comprehensive Feature Tier Matrix
export const FEATURE_ENTITLEMENTS = {
  // Free Core Features
  basic_dashboard: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  basic_study_plan: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  basic_practice: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  basic_progress: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  basic_knowledge: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  study_plan_export_ics: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  weekly_digest: ['free', 'pro_monthly', 'pro_annual', 'premium'],
  'ai.mentor.basic': ['free', 'pro_monthly', 'pro_annual', 'premium'],

  // Premium & Pro Advanced Features
  'ai.mentor.advanced': ['pro_monthly', 'pro_annual', 'premium'],
  unlimited_ai_mentor: ['pro_monthly', 'pro_annual', 'premium'],
  unlimited_practice_generation: ['pro_monthly', 'pro_annual', 'premium'],
  advanced_study_adaptation: ['pro_monthly', 'pro_annual', 'premium'],
  extended_progress_analytics: ['pro_monthly', 'pro_annual', 'premium'],
  priority_ai_inference: ['pro_monthly', 'pro_annual', 'premium'],
  'learning.analytics.advanced': ['pro_monthly', 'pro_annual', 'premium'],
  'courses.premium': ['pro_monthly', 'pro_annual', 'premium'],
  'flashcards.advanced': ['pro_monthly', 'pro_annual', 'premium'],
  'recommendations.advanced': ['pro_monthly', 'pro_annual', 'premium'],
};

/**
 * Retrieve the active subscription plan for a given user.
 * Evaluates expiration and 3-day grace period for past_due status.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<string>} 'free' | 'pro_monthly' | 'pro_annual' | 'premium'
 */
export async function getUserPlan(userId) {
  if (!userId) return 'free';

  try {
    const sub = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing', 'past_due'] },
    }).sort({ createdAt: -1 });

    if (!sub) return 'free';

    const now = new Date();

    // 1. Check active/trialing expiration
    if (sub.status === 'active' || sub.status === 'trialing') {
      if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now) {
        return 'free';
      }
      return sub.planId || sub.plan || 'premium';
    }

    // 2. Check past_due with 3-day grace period
    if (sub.status === 'past_due') {
      const graceEnd = sub.gracePeriodEnd || (sub.currentPeriodEnd ? new Date(new Date(sub.currentPeriodEnd).getTime() + 3 * 24 * 60 * 60 * 1000) : null);
      if (graceEnd && graceEnd > now) {
        return sub.planId || sub.plan || 'premium';
      }
      return 'free';
    }
  } catch {
    // Fail safely to free tier without crashing application
    return 'free';
  }

  return 'free';
}

/**
 * Evaluate whether a user is entitled to use a specific feature.
 *
 * @param {object} user - Authenticated user document or object
 * @param {string} featureKey - Identifier from FEATURE_ENTITLEMENTS
 * @returns {Promise<boolean>}
 */
export async function canUse(user, featureKey) {
  if (!user) return false;

  // Admins always have full feature access
  if (user.role === 'admin' || user.isAdmin === true) {
    return true;
  }

  const allowedPlans = FEATURE_ENTITLEMENTS[featureKey];
  if (!allowedPlans) {
    // Unlisted feature defaults to true
    return true;
  }

  if (allowedPlans.includes('free')) {
    return true;
  }

  const userPlan = await getUserPlan(user._id || user.id);
  return allowedPlans.includes(userPlan);
}

/**
 * Get comprehensive entitlements profile for user
 */
export async function getEntitlements(userId) {
  const userPlan = await getUserPlan(userId);
  const planConfig = getPlan(userPlan) || getPlan('free');

  let subscription = null;
  if (userId) {
    subscription = await Subscription.findOne({ userId }).sort({ createdAt: -1 }).lean();
  }

  return {
    plan: userPlan,
    planName: planConfig.name,
    isPremium: userPlan !== 'free',
    status: subscription?.status || 'active',
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    features: getPlanEntitlements(userPlan),
    limits: planConfig.limits,
  };
}

/**
 * Grant or renew a user's subscription entitlement
 */
export async function grantSubscription(userId, {
  planId,
  provider = 'mock',
  providerSubscriptionId = null,
  providerCustomerId = null,
  currentPeriodStart = new Date(),
  currentPeriodEnd = null,
  metadata = {},
}) {
  const plan = getPlan(planId);
  if (!plan) {
    throw new Error(`Cannot grant unknown plan: ${planId}`);
  }

  // Calculate period end if not provided (default 30 days for month, 365 for year)
  let periodEnd = currentPeriodEnd;
  if (!periodEnd) {
    const days = plan.interval === 'year' ? 365 : 30;
    periodEnd = new Date(currentPeriodStart.getTime() + days * 24 * 60 * 60 * 1000);
  }

  let sub = await Subscription.findOne({ userId });
  if (sub) {
    sub.plan = plan.id;
    sub.planId = plan.id;
    sub.status = 'active';
    sub.provider = provider;
    sub.providerSubscriptionId = providerSubscriptionId || sub.providerSubscriptionId;
    sub.providerCustomerId = providerCustomerId || sub.providerCustomerId;
    sub.currentPeriodStart = currentPeriodStart;
    sub.currentPeriodEnd = periodEnd;
    sub.cancelAtPeriodEnd = false;
    sub.canceledAt = null;
    sub.gracePeriodEnd = null;
    sub.metadata = { ...sub.metadata, ...metadata };
    await sub.save();
  } else {
    sub = await Subscription.create({
      userId,
      plan: plan.id,
      planId: plan.id,
      status: 'active',
      provider,
      providerSubscriptionId,
      providerCustomerId,
      currentPeriodStart,
      currentPeriodEnd: periodEnd,
      metadata,
    });
  }

  return sub;
}

/**
 * Schedule cancellation of subscription
 */
export async function cancelSubscription(userId, atPeriodEnd = true) {
  const sub = await Subscription.findOne({ userId });
  if (!sub) {
    throw new Error('No active subscription found to cancel');
  }

  if (atPeriodEnd) {
    sub.cancelAtPeriodEnd = true;
    sub.canceledAt = new Date();
  } else {
    sub.status = 'canceled';
    sub.canceledAt = new Date();
  }

  await sub.save();
  return sub;
}

/**
 * Resume a canceled subscription before current period ends
 */
export async function resumeSubscription(userId) {
  const sub = await Subscription.findOne({ userId });
  if (!sub) {
    throw new Error('No subscription found to resume');
  }

  sub.cancelAtPeriodEnd = false;
  sub.canceledAt = null;
  await sub.save();
  return sub;
}

/**
 * Revoke subscription entitlement immediately (e.g. upon refund)
 */
export async function revokeSubscription(userId, reason = 'refunded') {
  const sub = await Subscription.findOne({ userId });
  if (!sub) return null;

  sub.status = 'expired';
  sub.plan = 'free';
  sub.planId = 'free';
  sub.metadata = {
    ...sub.metadata,
    revocationReason: reason,
    revokedAt: new Date(),
  };
  await sub.save();
  return sub;
}

/**
 * Check and enforce AI Mentor daily message quotas
 */
export async function checkAIMessageQuota(userId) {
  const plan = await getUserPlan(userId);
  const planConfig = getPlan(plan) || getPlan('free');
  const maxDaily = planConfig.limits?.aiMentorDailyMessages ?? 15;

  // Premium users have effectively unlimited messages
  if (plan !== 'free') {
    return {
      allowed: true,
      plan,
      limit: maxDaily,
      usedToday: 0,
      remaining: maxDaily,
    };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usedToday = await AIUsageLog.countDocuments({
    userId,
    action: 'chat',
    createdAt: { $gte: startOfDay },
  });

  const remaining = Math.max(0, maxDaily - usedToday);
  const allowed = usedToday < maxDaily;

  return {
    allowed,
    plan: 'free',
    limit: maxDaily,
    usedToday,
    remaining,
  };
}

export default {
  getUserPlan,
  canUse,
  getEntitlements,
  grantSubscription,
  cancelSubscription,
  resumeSubscription,
  revokeSubscription,
  checkAIMessageQuota,
  FEATURE_ENTITLEMENTS,
};
