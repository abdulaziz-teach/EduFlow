/**
 * Notification Engine
 * Central orchestration service handling eligibility, user preferences,
 * quiet hours, deduplication, cooldowns, and multi-channel delivery.
 */

import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import User from '../models/User.js';
import { formatNotificationPayload, sanitizeDeepLink, sanitizeText } from './notificationTemplates.js';
import { isWithinQuietHours } from './quietHoursService.js';
import { getChannelProvider } from './channelProviders.js';

/**
 * Maps any legacy type or alternative type to canonical category string
 */
export function normalizeCategory(type) {
  const t = String(type).toUpperCase();
  switch (t) {
    case 'STUDY_PLAN':
    case 'DAILY_PLAN':
      return 'dailyPlan';
    case 'STREAK':
    case 'STREAK_REMINDER':
    case 'STREAK_MILESTONE':
      return 'streaks';
    case 'QUIZ_REMINDER':
    case 'TASK_DUE':
      return 'quizReminders';
    case 'FLASHCARD_REVIEW':
      return 'flashcardReminders';
    case 'ACHIEVEMENT':
    case 'ACHIEVEMENT_UNLOCKED':
    case 'WALLET_REWARD':
      return 'achievements';
    case 'REVIEW_RECOMMENDATION':
    case 'PRACTICE_RECOMMENDATION':
    case 'RECOMMENDATION':
      return 'recommendations';
    case 'AI_INSIGHT':
      return 'aiInsights';
    case 'COURSE_PROGRESS':
    case 'COURSE_UPDATE':
      return 'courseProgress';
    default:
      return null;
  }
}

/**
 * Retrieve or initialize user notification preferences
 */
export async function getOrCreatePreferences(userId) {
  let pref = await NotificationPreference.findOne({ userId });
  if (!pref) {
    // Check if user has custom timezone
    const user = await User.findById(userId).select('timezone').lean();
    pref = await NotificationPreference.create({
      userId,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: user?.timezone || 'UTC',
      },
    });
  }
  return pref;
}

/**
 * Check if the user has enabled notifications for a given category
 */
export function isCategoryEnabled(pref, type) {
  if (!pref || pref.enabled === false) return false;

  const category = normalizeCategory(type);
  if (!category) return true; // System & security types default to enabled

  return pref[category] !== false;
}

/**
 * Check cooldown and daily frequency cap for reminder notifications
 */
export async function checkFrequencyCap(userId, type, pref) {
  const maxDaily = pref?.frequencyCap?.maxDailyReminders ?? 5;
  const cooldownMinutes = pref?.frequencyCap?.reminderCooldownMinutes ?? 60;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Count notifications created today
  const todayCount = await Notification.countDocuments({
    userId,
    createdAt: { $gte: startOfDay },
    type: { $nin: ['SYSTEM', 'SECURITY'] },
  });

  if (todayCount >= maxDaily) {
    return { allowed: false, reason: 'daily_cap_exceeded' };
  }

  // Check last notification of the same type/category for cooldown
  if (cooldownMinutes > 0) {
    const cooldownThreshold = new Date(Date.now() - cooldownMinutes * 60 * 1000);
    const recent = await Notification.findOne({
      userId,
      type,
      createdAt: { $gte: cooldownThreshold },
      priority: { $nin: ['high', 'urgent'] },
    });

    if (recent) {
      return { allowed: false, reason: 'cooldown_active' };
    }
  }

  return { allowed: true };
}

/**
 * Central notification dispatch method
 */
export async function dispatchNotification(params) {
  const {
    userId,
    type,
    title,
    message,
    link,
    data = {},
    metadata = {},
    priority = 'normal',
    channel = 'in_app',
    scheduledAt = null,
    expiresAt = null,
    deduplicationKey = null,
    force = false,
  } = params;

  if (!userId || !type) {
    throw new Error('userId and type are required to dispatch notification');
  }

  const isUrgent = priority === 'urgent' || String(type).toUpperCase() === 'SECURITY';

  // 1. Check user preferences unless forced or urgent
  const pref = await getOrCreatePreferences(userId);

  if (!force && !isUrgent) {
    if (pref.enabled === false) {
      return { skipped: true, reason: 'user_notifications_disabled' };
    }

    if (!isCategoryEnabled(pref, type)) {
      return { skipped: true, reason: 'category_disabled' };
    }
  }

  // 2. Deduplication check (evaluated before cooldown)
  if (deduplicationKey) {
    const existing = await Notification.findOne({
      userId,
      deduplicationKey,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existing) {
      return { skipped: true, reason: 'duplicate_suppressed', existingId: existing._id };
    }
  }

  // 3. Frequency cap & cooldown for automated reminders (when no explicit deduplicationKey is provided)
  if (!force && !isUrgent) {
    const isReminderType = [
      'LEARNING_REMINDER',
      'DAILY_PLAN',
      'STREAK_REMINDER',
      'QUIZ_REMINDER',
      'FLASHCARD_REVIEW',
    ].includes(String(type).toUpperCase());

    if (isReminderType && priority === 'normal' && !deduplicationKey) {
      const capCheck = await checkFrequencyCap(userId, type, pref);
      if (!capCheck.allowed) {
        return { skipped: true, reason: capCheck.reason };
      }
    }
  }

  // 4. Prepare payload using templates and sanitization
  const formatted = formatNotificationPayload(type, {
    title,
    message,
    link,
    priority,
    ...data,
    ...metadata,
  });

  // 5. Quiet hours check
  let status = 'sent';
  let effectiveScheduledAt = scheduledAt;

  if (!force && !isUrgent && pref.quietHours?.enabled) {
    const quietCheck = isWithinQuietHours(pref.quietHours);
    if (quietCheck.inQuietHours) {
      // Defer delivery until quiet hours end
      status = 'deferred';
      effectiveScheduledAt = quietCheck.nextAllowedDate;
    }
  }

  // 6. Handle scheduled delivery
  if (effectiveScheduledAt && new Date(effectiveScheduledAt) > new Date()) {
    status = status === 'deferred' ? 'deferred' : 'pending';
  }

  // 7. Deliver via provider
  const provider = getChannelProvider(channel);
  const deliveryResult = await provider.send({
    userId,
    type: formatted.type,
    priority: formatted.priority,
    channel,
    status,
    scheduledAt: effectiveScheduledAt,
    sentAt: status === 'sent' ? new Date() : null,
    expiresAt,
    deduplicationKey,
    title: formatted.title,
    message: formatted.message,
    link: formatted.link,
    data: { ...data, ...metadata },
    metadata: { ...data, ...metadata },
  });

  return {
    success: true,
    ...deliveryResult,
  };
}

export default {
  dispatchNotification,
  getOrCreatePreferences,
  normalizeCategory,
  isCategoryEnabled,
  checkFrequencyCap,
};
