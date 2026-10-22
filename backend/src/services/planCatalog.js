/**
 * Plan Catalog & Pricing Configuration
 * Central server-side source of truth for subscription plans, pricing, and feature entitlements.
 */

export const PLANS = {
  free: {
    id: 'free',
    name: 'EduFlow Basic',
    description: 'Core educational features and community learning.',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      'Access to foundational courses & lessons',
      'Interactive quizzes & flashcard study',
      '15 AI Mentor queries per day',
      'Standard learning dashboard & streak tracking',
    ],
    entitlements: [
      'basic_dashboard',
      'basic_study_plan',
      'basic_practice',
      'basic_progress',
      'basic_knowledge',
      'study_plan_export_ics',
      'weekly_digest',
      'ai.mentor.basic',
    ],
    limits: {
      aiMentorDailyMessages: 15,
    },
    bonusRewards: { coins: 0, gems: 0 },
    active: true,
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'EduFlow Pro (Monthly)',
    description: 'Unlimited AI mentoring, predictive analytics, and premium content.',
    price: 1200, // in integer cents ($12.00)
    currency: 'USD',
    interval: 'month',
    features: [
      'Everything in Basic',
      'Unlimited AI Mentor with Socratic explanations',
      'Advanced learning analytics & mastery prediction',
      'Full access to all premium courses & content packs',
      'Priority AI inference & custom study plan adaptation',
      'Monthly bonus: 500 Coins + 20 Gems',
    ],
    entitlements: [
      'basic_dashboard',
      'basic_study_plan',
      'basic_practice',
      'basic_progress',
      'basic_knowledge',
      'study_plan_export_ics',
      'weekly_digest',
      'ai.mentor.basic',
      'ai.mentor.advanced',
      'unlimited_ai_mentor',
      'unlimited_practice_generation',
      'advanced_study_adaptation',
      'extended_progress_analytics',
      'priority_ai_inference',
      'learning.analytics.advanced',
      'courses.premium',
      'flashcards.advanced',
      'recommendations.advanced',
    ],
    limits: {
      aiMentorDailyMessages: 1000,
    },
    bonusRewards: { coins: 500, gems: 20 },
    active: true,
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'EduFlow Pro (Annual)',
    description: 'All Pro features billed annually with 31% savings.',
    price: 9900, // in integer cents ($99.00)
    currency: 'USD',
    interval: 'year',
    savingsPercent: 31,
    features: [
      'Everything in Pro Monthly',
      'Save 31% compared to monthly billing ($8.25/mo)',
      'Annual bonus: 2,000 Coins + 100 Gems',
      'Early access to new AI models & course packs',
    ],
    entitlements: [
      'basic_dashboard',
      'basic_study_plan',
      'basic_practice',
      'basic_progress',
      'basic_knowledge',
      'study_plan_export_ics',
      'weekly_digest',
      'ai.mentor.basic',
      'ai.mentor.advanced',
      'unlimited_ai_mentor',
      'unlimited_practice_generation',
      'advanced_study_adaptation',
      'extended_progress_analytics',
      'priority_ai_inference',
      'learning.analytics.advanced',
      'courses.premium',
      'flashcards.advanced',
      'recommendations.advanced',
    ],
    limits: {
      aiMentorDailyMessages: 1000,
    },
    bonusRewards: { coins: 2000, gems: 100 },
    active: true,
  },
};

// Aliases for backward compatibility
PLANS.premium = PLANS.pro_monthly;

export function getPlan(planId) {
  if (!planId) return PLANS.free;
  return PLANS[planId] || null;
}

export function getAllActivePlans() {
  return [PLANS.free, PLANS.pro_monthly, PLANS.pro_annual];
}

export function isPlanValid(planId) {
  return Boolean(PLANS[planId] && PLANS[planId].active);
}

export function getPlanPrice(planId) {
  const plan = getPlan(planId);
  return plan ? plan.price : 0;
}

export function getPlanEntitlements(planId) {
  const plan = getPlan(planId);
  return plan ? plan.entitlements : PLANS.free.entitlements;
}

export default {
  PLANS,
  getPlan,
  getAllActivePlans,
  isPlanValid,
  getPlanPrice,
  getPlanEntitlements,
};
