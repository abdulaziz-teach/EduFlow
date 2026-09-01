import * as notificationService from '../services/notificationService.js';
import NotificationPreference from '../models/NotificationPreference.js';
import UserAchievement from '../models/UserAchievement.js';

/**
 * @desc    Get user's latest 30 notifications and unread count
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await notificationService.getNotifications(userId);
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
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
      prefs = await NotificationPreference.create({ userId });
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
    const {
      enabled,
      taskReminders,
      reviewRecommendations,
      practiceRecommendations,
      streakNotifications,
      achievementNotifications,
      studyPlanNotifications,
    } = req.body;

    // Validate fields strictly to prevent arbitrary MongoDB writes
    const updateFields = {};
    if (enabled !== undefined) updateFields.enabled = !!enabled;
    if (taskReminders !== undefined) updateFields.taskReminders = !!taskReminders;
    if (reviewRecommendations !== undefined) updateFields.reviewRecommendations = !!reviewRecommendations;
    if (practiceRecommendations !== undefined) updateFields.practiceRecommendations = !!practiceRecommendations;
    if (streakNotifications !== undefined) updateFields.streakNotifications = !!streakNotifications;
    if (achievementNotifications !== undefined) updateFields.achievementNotifications = !!achievementNotifications;
    if (studyPlanNotifications !== undefined) updateFields.studyPlanNotifications = !!studyPlanNotifications;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

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
