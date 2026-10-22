import api from './api';

export const getNotifications = (params = {}) => api.get('/notifications', { params });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationAsRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = () => api.patch('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const getNotificationPreferences = () => api.get('/notifications/preferences');
export const updateNotificationPreferences = (data) => api.patch('/notifications/preferences', data);
export const getUserAchievements = () => api.get('/notifications/achievements');

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
