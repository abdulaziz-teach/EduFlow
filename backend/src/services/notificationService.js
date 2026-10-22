import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { dispatchNotification, normalizeCategory } from './notificationEngine.js';

/**
 * Helper to resolve user notification preferences or create default
 */
async function resolvePreferences(userId) {
  let prefs = await NotificationPreference.findOne({ userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }
  return prefs;
}

/**
 * Create a new notification for a student. Enforces preferences, deduplication, and cooldowns.
 */
export async function createNotification(userId, { type, title, message, link, metadata = {}, data = {}, priority = 'normal', channel = 'in_app', deduplicationKey, scheduledAt, expiresAt, force = false }) {
  try {
    const effectiveDedupKey = deduplicationKey || metadata?.uniqueKey || data?.uniqueKey;

    const result = await dispatchNotification({
      userId,
      type,
      title,
      message,
      link,
      data: { ...metadata, ...data },
      metadata: { ...metadata, ...data },
      priority,
      channel,
      scheduledAt,
      expiresAt,
      deduplicationKey: effectiveDedupKey,
      force,
    });

    if (result.skipped) {
      return null;
    }

    return result.notification || null;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Fetch notifications for a user with optional pagination and filters
 */
export async function getNotifications(userId, options = {}) {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const query = { userId };

  if (options.unreadOnly === true || options.unreadOnly === 'true') {
    query.read = false;
  }

  if (options.type) {
    query.type = options.type;
  } else if (options.category) {
    const cat = String(options.category).toLowerCase();
    // Map category to matching types
    const catTypeMap = {
      dailyplan: ['study_plan', 'DAILY_PLAN'],
      streaks: ['streak', 'STREAK_REMINDER', 'STREAK_MILESTONE'],
      quizzes: ['task_due', 'task_reminder', 'QUIZ_REMINDER'],
      flashcards: ['FLASHCARD_REVIEW'],
      achievements: ['achievement', 'ACHIEVEMENT_UNLOCKED', 'wallet_reward'],
      recommendations: ['review_recommendation', 'practice_recommendation', 'RECOMMENDATION'],
      aiinsights: ['AI_INSIGHT'],
      system: ['system', 'SYSTEM', 'SECURITY'],
    };
    if (catTypeMap[cat]) {
      query.type = { $in: catTypeMap[cat] };
    }
  }

  const queryChain = Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

  if (options.paginate) {
    const [notifications, total, unreadCount] = await Promise.all([
      queryChain.exec(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  return queryChain.exec();
}

/**
 * Mark a specific notification as read after validating owner
 */
export async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    error.errorCode = 'NOT_FOUND';
    throw error;
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();
  return notification;
}

/**
 * Mark all unread notifications read for this user
 */
export async function markAllAsRead(userId) {
  await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
}

/**
 * Delete a specific notification after validating owner
 */
export async function deleteNotification(userId, notificationId) {
  const result = await Notification.deleteOne({ _id: notificationId, userId });
  if (result.deletedCount === 0) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    error.errorCode = 'NOT_FOUND';
    throw error;
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

/**
 * Retention cleanup: delete notifications older than configurable days
 */
export async function cleanupOldNotifications(retentionDays = 90) {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoff },
    });
    console.log(`Notification cleanup complete. Deleted ${result.deletedCount} notifications older than ${retentionDays} days.`);
  } catch (err) {
    console.error('Notification cleanup job failed:', err.message);
  }
}
