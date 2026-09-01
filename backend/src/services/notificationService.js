import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';

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
 * Create a new notification for a student. Enforces preferences and cooldowns.
 */
export async function createNotification(userId, { type, title, message, link, metadata = {} }) {
  try {
    const prefs = await resolvePreferences(userId);

    // 1. Check global toggle
    if (!prefs.enabled) return null;

    // 2. Check individual notification type switches
    const typeMapping = {
      task_reminder: prefs.taskReminders,
      task_due: prefs.taskReminders,
      review_recommendation: prefs.reviewRecommendations,
      practice_recommendation: prefs.practiceRecommendations,
      streak: prefs.streakNotifications,
      achievement: prefs.achievementNotifications,
      study_plan: prefs.studyPlanNotifications,
      system: true, // System notifications are always enabled
    };

    if (typeMapping[type] === false) {
      console.log(`Notification skipped. Type "${type}" is toggled OFF for user ${userId}`);
      return null;
    }

    // 3. Prevent duplicate notifications using 24h cooldown on metadata.uniqueKey
    if (metadata && metadata.uniqueKey) {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const duplicate = await Notification.findOne({
        userId,
        'metadata.uniqueKey': metadata.uniqueKey,
        createdAt: { $gte: oneDayAgo },
      });

      if (duplicate) {
        console.log(`Duplicate notification skipped. uniqueKey: "${metadata.uniqueKey}" in cooldown.`);
        return null;
      }
    }

    // 4. Write to DB
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link: link || '',
      metadata,
      read: false,
    });

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Fetch latest 30 notifications for a user
 */
export async function getNotifications(userId) {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30);
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
