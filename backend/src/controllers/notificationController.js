import * as notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import UserAchievement from '../models/UserAchievement.js';
import User from '../models/User.js';
import { dispatchNotification } from '../services/notificationEngine.js';

/**
 * @desc    Get user's notifications with pagination and filtering
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 30, unreadOnly, type, category } = req.query;

    const result = await notificationService.getNotifications(userId, {
      page,
      limit,
      unreadOnly,
      type,
      category,
      paginate: true,
    });

    res.status(200).json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get count of unread notifications
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await notificationService.markAsRead(userId, notificationId);
    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all user's notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    await notificationService.deleteNotification(userId, notificationId);
    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's notification settings preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
export const getPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) {
      const user = await User.findById(userId).select('timezone').lean();
      prefs = await NotificationPreference.create({
        userId,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: user?.timezone || 'UTC',
        },
      });
    }

    res.status(200).json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification settings preferences
 * @route   PATCH /api/notifications/preferences
 * @access  Private
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let prefs = await NotificationPreference.findOne({ userId });
    if (!prefs) {
      prefs = new NotificationPreference({ userId });
    }

    const {
      enabled,
      // Legacy flags
      taskReminders,
      reviewRecommendations,
      practiceRecommendations,
      streakNotifications,
      achievementNotifications,
      studyPlanNotifications,
      // Phase 22 modern categories
      dailyPlan,
      streaks,
      quizReminders,
      flashcardReminders,
      achievements,
      recommendations,
      aiInsights,
      courseProgress,
      // Channels, quiet hours, frequency
      channels,
      quietHours,
      frequencyCap,
    } = req.body;

    if (enabled !== undefined) prefs.enabled = Boolean(enabled);

    // Modern categories
    if (dailyPlan !== undefined) prefs.dailyPlan = Boolean(dailyPlan);
    if (streaks !== undefined) prefs.streaks = Boolean(streaks);
    if (quizReminders !== undefined) prefs.quizReminders = Boolean(quizReminders);
    if (flashcardReminders !== undefined) prefs.flashcardReminders = Boolean(flashcardReminders);
    if (achievements !== undefined) prefs.achievements = Boolean(achievements);
    if (recommendations !== undefined) prefs.recommendations = Boolean(recommendations);
    if (aiInsights !== undefined) prefs.aiInsights = Boolean(aiInsights);
    if (courseProgress !== undefined) prefs.courseProgress = Boolean(courseProgress);

    // Legacy flags
    if (taskReminders !== undefined) prefs.taskReminders = Boolean(taskReminders);
    if (reviewRecommendations !== undefined) prefs.reviewRecommendations = Boolean(reviewRecommendations);
    if (practiceRecommendations !== undefined) prefs.practiceRecommendations = Boolean(practiceRecommendations);
    if (streakNotifications !== undefined) prefs.streakNotifications = Boolean(streakNotifications);
    if (achievementNotifications !== undefined) prefs.achievementNotifications = Boolean(achievementNotifications);
    if (studyPlanNotifications !== undefined) prefs.studyPlanNotifications = Boolean(studyPlanNotifications);

    // Channels
    if (channels && typeof channels === 'object') {
      prefs.channels = {
        ...prefs.channels,
        ...(channels.inApp !== undefined && { inApp: Boolean(channels.inApp) }),
        ...(channels.email !== undefined && { email: Boolean(channels.email) }),
        ...(channels.push !== undefined && { push: Boolean(channels.push) }),
        ...(channels.telegram !== undefined && { telegram: Boolean(channels.telegram) }),
      };
    }

    // Quiet hours
    if (quietHours && typeof quietHours === 'object') {
      prefs.quietHours = {
        ...prefs.quietHours,
        ...(quietHours.enabled !== undefined && { enabled: Boolean(quietHours.enabled) }),
        ...(quietHours.start !== undefined && { start: String(quietHours.start) }),
        ...(quietHours.end !== undefined && { end: String(quietHours.end) }),
        ...(quietHours.timezone !== undefined && { timezone: String(quietHours.timezone) }),
      };
    }

    // Frequency cap
    if (frequencyCap && typeof frequencyCap === 'object') {
      prefs.frequencyCap = {
        ...prefs.frequencyCap,
        ...(frequencyCap.maxDailyReminders !== undefined && {
          maxDailyReminders: Math.max(1, parseInt(frequencyCap.maxDailyReminders, 10)),
        }),
        ...(frequencyCap.reminderCooldownMinutes !== undefined && {
          reminderCooldownMinutes: Math.max(0, parseInt(frequencyCap.reminderCooldownMinutes, 10)),
        }),
      };
    }

    await prefs.save();

    res.status(200).json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's unlocked achievements
 * @route   GET /api/notifications/achievements
 * @access  Private
 */
export const getAchievements = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unlocked = await UserAchievement.find({ userId }).sort({ unlockedAt: -1 });

    res.status(200).json({
      success: true,
      unlocked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Broadcast notification to all active users or target users
 * @route   POST /api/notifications/admin/broadcast
 * @access  Private (Admin)
 */
export const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, link = '/notifications', priority = 'normal', channel = 'in_app', targetUsers } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required for broadcast',
      });
    }

    let recipientIds = [];
    if (Array.isArray(targetUsers) && targetUsers.length > 0) {
      recipientIds = targetUsers;
    } else {
      const users = await User.find({ status: 'active' }).select('_id').lean();
      recipientIds = users.map((u) => u._id);
    }

    let sentCount = 0;
    for (const userId of recipientIds) {
      await dispatchNotification({
        userId,
        type: 'SYSTEM',
        title,
        message,
        link,
        priority,
        channel,
        force: true, // admin broadcast bypasses user category preference
      });
      sentCount++;
    }

    res.status(200).json({
      success: true,
      message: `Broadcast delivered to ${sentCount} user(s).`,
      sentCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin: Get aggregate notification telemetry & delivery stats
 * @route   GET /api/notifications/admin/stats
 * @access  Private (Admin)
 */
export const getNotificationStats = async (req, res, next) => {
  try {
    const [totalCount, unreadCount, priorityBreakdown, statusBreakdown, typeBreakdown] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ read: false }),
      Notification.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
        priorityBreakdown: Object.fromEntries(priorityBreakdown.map((p) => [p._id || 'unknown', p.count])),
        statusBreakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id || 'unknown', s.count])),
        typeBreakdown: Object.fromEntries(typeBreakdown.map((t) => [t._id || 'unknown', t.count])),
      },
    });
  } catch (error) {
    next(error);
  }
};

