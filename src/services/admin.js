import api from './api';

/**
 * Admin API Service — Operations, Moderation & Governance Client
 */

// 1. Overview
export const getAdminOverview = async () => {
  const res = await api.get('/admin/overview');
  return res.data?.data || {};
};

// 2. Users
export const getAdminUsers = async (params = {}) => {
  const res = await api.get('/admin/users', { params });
  return res.data?.data || { users: [], pagination: {} };
};

export const getAdminUserDetails = async (id) => {
  const res = await api.get(`/admin/users/${id}`);
  return res.data?.data || {};
};

export const suspendUser = async (id, reason) => {
  const res = await api.post(`/admin/users/${id}/suspend`, { reason });
  return res.data;
};

export const unsuspendUser = async (id, reason) => {
  const res = await api.post(`/admin/users/${id}/unsuspend`, { reason });
  return res.data;
};

export const updateUserRole = async (id, role) => {
  const res = await api.post(`/admin/users/${id}/role`, { role });
  return res.data;
};

export const invalidateUserSessions = async (id) => {
  const res = await api.post(`/admin/users/${id}/invalidate-sessions`);
  return res.data;
};

export const bulkUserAction = async (userIds, action, reason) => {
  const res = await api.post('/admin/users/bulk', {
    userIds,
    action,
    confirm: true,
    reason,
  });
  return res.data;
};

// 3. Content
export const getAdminContent = async (params = {}) => {
  const res = await api.get('/admin/content', { params });
  return res.data?.data || { items: [], pagination: {} };
};

export const updateContentStatus = async (entityType, id, status, reason) => {
  const res = await api.patch(`/admin/content/${entityType}/${id}/status`, {
    status,
    reason,
  });
  return res.data;
};

// 4. Moderation
export const getAdminReports = async (params = {}) => {
  const res = await api.get('/admin/moderation/reports', { params });
  return res.data?.data || { reports: [], pagination: {} };
};

export const assignReport = async (id) => {
  const res = await api.post(`/admin/moderation/reports/${id}/assign`);
  return res.data;
};

export const resolveReport = async (id, resolution, action = 'none') => {
  const res = await api.post(`/admin/moderation/reports/${id}/resolve`, {
    resolution,
    action,
  });
  return res.data;
};

export const rejectReport = async (id, reason) => {
  const res = await api.post(`/admin/moderation/reports/${id}/reject`, {
    reason,
  });
  return res.data;
};

export const submitUserReport = async (reportData) => {
  const res = await api.post('/reports', reportData);
  return res.data;
};

// 5. Feature Flags & Emergency Controls
export const getAdminFeatureFlags = async () => {
  const res = await api.get('/admin/feature-flags');
  return res.data?.data?.flags || [];
};

export const updateFeatureFlag = async (key, updates) => {
  const res = await api.patch(`/admin/feature-flags/${key}`, updates);
  return res.data?.flag;
};

export const setEmergencyControl = async (action, isEnabled, reason) => {
  const res = await api.post(`/admin/emergency/${action}`, {
    isEnabled,
    reason,
  });
  return res.data;
};

// 6. System Health & Incidents
export const getSystemHealth = async () => {
  const res = await api.get('/admin/system/health');
  return res.data?.data || {};
};

export const getIncidents = async (params = {}) => {
  const res = await api.get('/admin/system/incidents', { params });
  return res.data?.data || { incidents: [], pagination: {} };
};

export const createIncident = async (incidentData) => {
  const res = await api.post('/admin/system/incidents', incidentData);
  return res.data?.incident;
};

export const updateIncident = async (id, updateData) => {
  const res = await api.patch(`/admin/system/incidents/${id}`, updateData);
  return res.data?.incident;
};

// 7. Audit Logs
export const getAuditLogs = async (params = {}) => {
  const res = await api.get('/admin/audit-logs', { params });
  return res.data?.data || { logs: [], pagination: {} };
};

// 8. Admin Search
export const adminCrossSearch = async (q) => {
  const res = await api.get('/admin/search', { params: { q } });
  return res.data?.data || { users: [], courses: [], reports: [], auditLogs: [] };
};

export default {
  getAdminOverview,
  getAdminUsers,
  getAdminUserDetails,
  suspendUser,
  unsuspendUser,
  updateUserRole,
  invalidateUserSessions,
  bulkUserAction,
  getAdminContent,
  updateContentStatus,
  getAdminReports,
  assignReport,
  resolveReport,
  rejectReport,
  submitUserReport,
  getAdminFeatureFlags,
  updateFeatureFlag,
  setEmergencyControl,
  getSystemHealth,
  getIncidents,
  createIncident,
  updateIncident,
  getAuditLogs,
  adminCrossSearch,
};
