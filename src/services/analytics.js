/**
 * EduFlow Product Analytics & Telemetry Service
 * 
 * Lightweight, privacy-first, provider-agnostic product analytics.
 * Automatically sanitizes sensitive PII (passwords, tokens, emails, MongoDB IDs)
 * and safely isolates failures to never break application workflows.
 */

// Generate or retrieve an anonymous session identifier stored per browser session
function getAnonymousSessionId() {
  try {
    let sessionId = sessionStorage.getItem('eduflow_anon_session_id');
    if (!sessionId) {
      sessionId = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem('eduflow_anon_session_id', sessionId);
    }
    return sessionId;
  } catch {
    return 'anon_ephemeral';
  }
}

// Prohibited PII / sensitive property keys
const PROHIBITED_KEYS = new Set([
  'password',
  'token',
  'jwt',
  'authorization',
  'email',
  'apikey',
  'api_key',
  'mongouri',
  'mongo_uri',
  'secret',
]);

/**
 * Cleanly sanitize event properties to prevent accidental PII leakage.
 */
function sanitizeProperties(properties = {}) {
  if (!properties || typeof properties !== 'object') return {};
  
  const clean = {};
  for (const [key, value] of Object.entries(properties)) {
    const lowerKey = key.toLowerCase();
    if (PROHIBITED_KEYS.has(lowerKey) || lowerKey.includes('pass') || lowerKey.includes('secret') || lowerKey.includes('token')) {
      continue; // Strip prohibited keys
    }
    // Only allow primitive types (string, number, boolean) or simple arrays of strings/numbers
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      clean[key] = value;
    } else if (Array.isArray(value)) {
      clean[key] = value.slice(0, 10).filter((item) => typeof item === 'string' || typeof item === 'number');
    }
  }
  return clean;
}

/**
 * Track a product analytics event.
 *
 * @param {string} eventName - Standardized event name (e.g. 'practice_completed')
 * @param {object} [properties] - Optional event metadata properties
 */
export function trackEvent(eventName, properties = {}) {
  try {
    if (!eventName || typeof eventName !== 'string') return;

    const payload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      anonymousSessionId: getAnonymousSessionId(),
      properties: sanitizeProperties(properties),
    };

    // In development or when no external provider is attached, log to console in debug mode
    if (import.meta.env.DEV) {
      console.debug('[EduFlow Analytics]', payload.event, payload.properties);
    }

    // Pluggable provider dispatch (e.g. PostHog, Plausible, Mixpanel, or custom endpoint)
    if (typeof window !== 'undefined' && window.eduflowAnalyticsProvider) {
      window.eduflowAnalyticsProvider.track(payload.event, payload.properties);
    }
  } catch (err) {
    // Non-blocking: analytics errors must never crash or affect user experience
    if (import.meta.env.DEV) {
      console.warn('[EduFlow Analytics] Tracking failed silently:', err.message);
    }
  }
}

/**
 * Standardized Analytics Events
 */
export const AnalyticsEvents = {
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  STUDY_PLAN_CREATED: 'study_plan_created',
  STUDY_SESSION_STARTED: 'study_session_started',
  STUDY_SESSION_COMPLETED: 'study_session_completed',
  PRACTICE_STARTED: 'practice_started',
  PRACTICE_COMPLETED: 'practice_completed',
  MENTOR_OPENED: 'mentor_opened',
  MENTOR_MESSAGE_SENT: 'mentor_message_sent',
  // Learning Funnel
  COURSE_VIEWED: 'course_viewed',
  COURSE_ENROLLED: 'course_enrolled',
  LESSON_STARTED: 'lesson_started',
  LESSON_COMPLETED: 'lesson_completed',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  FLASHCARD_REVIEWED: 'flashcard_reviewed',

  // Economy & Shop
  SHOP_VIEWED: 'shop_viewed',
  PURCHASE_STARTED: 'purchase_started',
  PURCHASE_COMPLETED: 'purchase_completed',

  // Gamification & Engagement
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  NOTIFICATION_OPENED: 'notification_opened',
};

export default {
  trackEvent,
  Events: AnalyticsEvents,
};
