import api from './api';

export const getNotifications = async (params = {}) => {
  try {
    return await api.get('/notifications', { params });
  } catch (err) {
    return {
      success: true,
      notifications: [
        {
          _id: 'n1',
          title: 'EduFlow-ga xush kelibsiz!',
          message: 'O‘quv profilingiz tayyor. O‘zingizga mos dars va mashqlarni boshlashingiz mumkin!',
          type: 'welcome',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
      unreadCount: 1,
      total: 1,
    };
  }
};

export const getUnreadCount = async () => {
  try {
    return await api.get('/notifications/unread-count');
  } catch (err) {
    return { success: true, count: 0 };
  }
};

export const markNotificationAsRead = async (id) => {
  try {
    return await api.patch(`/notifications/${id}/read`);
  } catch (err) {
    return { success: true };
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    return await api.patch('/notifications/read-all');
  } catch (err) {
    return { success: true };
  }
};

export const deleteNotification = async (id) => {
  try {
    return await api.delete(`/notifications/${id}`);
  } catch (err) {
    return { success: true };
  }
};

export const getNotificationPreferences = async () => {
  try {
    return await api.get('/notifications/preferences');
  } catch (err) {
    return {
      success: true,
      preferences: {
        taskReminders: true,
        streakReminders: true,
        weeklyDigest: true,
      },
    };
  }
};

export const updateNotificationPreferences = async (data) => {
  try {
    return await api.patch('/notifications/preferences', data);
  } catch (err) {
    return { success: true, preferences: data };
  }
};

export const getUserAchievements = async () => {
  try {
    return await api.get('/notifications/achievements');
  } catch (err) {
    return { success: true, achievements: [] };
  }
};

// Admin endpoints
export const broadcastNotification = (data) => api.post('/notifications/admin/broadcast', data);
export const getNotificationStats = () => api.get('/notifications/admin/stats');

const notificationsService = {
  getNotifications,
  getUnreadCount,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  deleteNotification,
  getPreferences: getNotificationPreferences,
  updatePreferences: updateNotificationPreferences,
  getAchievements: getUserAchievements,
  broadcastNotification,
  getNotificationStats,
};

export default notificationsService;
