import Subscription from '../models/Subscription.js';

/**
 * EduFlow Entitlement Service
 * 
 * Centralized business logic for evaluating user feature entitlements.
 * Decouples controllers from direct billing or subscription logic.
 */

// Feature Tier Matrix
const FEATURE_ENTITLEMENTS = {
  // Free Core Features
  basic_dashboard: ['free', 'premium'],
  basic_study_plan: ['free', 'premium'],
  basic_practice: ['free', 'premium'],
  basic_progress: ['free', 'premium'],
  basic_knowledge: ['free', 'premium'],
  study_plan_export_ics: ['free', 'premium'],
  weekly_digest: ['free', 'premium'],

  // Premium Advanced Features
  unlimited_ai_mentor: ['premium'],
  unlimited_practice_generation: ['premium'],
  advanced_study_adaptation: ['premium'],
  extended_progress_analytics: ['premium'],
  priority_ai_inference: ['premium'],
};

/**
 * Retrieve the active subscription plan for a given user.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<string>} 'free' | 'premium'
 */
export async function getUserPlan(userId) {
  if (!userId) return 'free';

  try {
    const sub = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'trialing'] },
    }).sort({ createdAt: -1 });

    if (sub && sub.plan === 'premium') {
      // Verify expiration if currentPeriodEnd is defined
      if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
        return 'free';
      }
      return 'premium';
    }
  } catch {
    // Fail safely to free tier without crashing
    return 'free';
  }

  return 'free';
}

/**
 * Evaluate whether a user is entitled to use a specific feature.
 *
 * @param {object} user - Authenticated user document or object (must contain _id or id)
 * @param {string} featureKey - Identifier from FEATURE_ENTITLEMENTS
 * @returns {Promise<boolean>}
 */
export async function canUse(user, featureKey) {
  if (!user) return false;
  
  // Admins always have full feature access for testing and support
  if (user.role === 'admin' || user.isAdmin === true) {
    return true;
  }

  const allowedPlans = FEATURE_ENTITLEMENTS[featureKey];
  if (!allowedPlans) {
    // Unknown feature defaults to true if unlisted or false if strict
    return true;
  }

  // If free plan is permitted, all authenticated users can access
  if (allowedPlans.includes('free')) {
    return true;
  }

  const userPlan = await getUserPlan(user._id || user.id);
  return allowedPlans.includes(userPlan);
}

export default {
  getUserPlan,
  canUse,
  FEATURE_ENTITLEMENTS,
};
