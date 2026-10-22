import { Router } from 'express';
import protect, { requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../services/rbacService.js';
import {
  getAdminOverview,
  listUsers,
  getUserDetails,
  suspendUser,
  unsuspendUser,
  updateUserRole,
  invalidateUserSessions,
  bulkUserAction,
  listAllContent,
  updateContentStatus,
  listReports,
  assignReport,
  resolveReport,
  rejectReport,
  listFeatureFlags,
  updateFeatureFlag,
  setEmergencyControl,
  getSystemHealth,
  listIncidents,
  createIncident,
  updateIncident,
  listAuditLogs,
  adminCrossSearch,
} from '../controllers/adminController.js';

const router = Router();

// All administrative endpoints require authentication
router.use(protect);

// 1. Overview & Dashboard
router.get(
  '/overview',
  requirePermission(PERMISSIONS.ANALYTICS_READ, PERMISSIONS.SYSTEM_OPERATIONS, PERMISSIONS.USERS_READ),
  getAdminOverview
);

// 2. User Management
router.get('/users', requirePermission(PERMISSIONS.USERS_READ), listUsers);
router.get('/users/:id', requirePermission(PERMISSIONS.USERS_READ), getUserDetails);
router.post('/users/:id/suspend', requirePermission(PERMISSIONS.USERS_SUSPEND), suspendUser);
router.post('/users/:id/unsuspend', requirePermission(PERMISSIONS.USERS_SUSPEND), unsuspendUser);
router.post('/users/:id/role', requirePermission(PERMISSIONS.USERS_MANAGE), updateUserRole);
router.post(
  '/users/:id/invalidate-sessions',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  invalidateUserSessions
);
router.post(
  '/users/bulk',
  requirePermission(PERMISSIONS.USERS_MANAGE, PERMISSIONS.USERS_SUSPEND),
  bulkUserAction
);

// 3. Content Workspace & Governance
router.get('/content', requirePermission(PERMISSIONS.CONTENT_READ), listAllContent);
router.patch(
  '/content/:entityType/:id/status',
  requirePermission(PERMISSIONS.CONTENT_PUBLISH, PERMISSIONS.CONTENT_EDIT),
  updateContentStatus
);

// 4. Content Moderation
router.get('/moderation/reports', requirePermission(PERMISSIONS.CONTENT_MODERATE), listReports);
router.post('/moderation/reports/:id/assign', requirePermission(PERMISSIONS.CONTENT_MODERATE), assignReport);
router.post('/moderation/reports/:id/resolve', requirePermission(PERMISSIONS.CONTENT_MODERATE), resolveReport);
router.post('/moderation/reports/:id/reject', requirePermission(PERMISSIONS.CONTENT_MODERATE), rejectReport);

// 5. Feature Flags & Emergency Controls
router.get('/feature-flags', requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), listFeatureFlags);
router.patch('/feature-flags/:key', requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), updateFeatureFlag);
router.post(
  '/emergency/:action',
  requirePermission(PERMISSIONS.SYSTEM_OPERATIONS, PERMISSIONS.FEATURE_FLAGS_MANAGE),
  setEmergencyControl
);

// 6. System Health & Incident Management
router.get('/system/health', requirePermission(PERMISSIONS.SYSTEM_OPERATIONS), getSystemHealth);
router.get('/system/incidents', requirePermission(PERMISSIONS.SYSTEM_OPERATIONS), listIncidents);
router.post('/system/incidents', requirePermission(PERMISSIONS.SYSTEM_OPERATIONS), createIncident);
router.patch('/system/incidents/:id', requirePermission(PERMISSIONS.SYSTEM_OPERATIONS), updateIncident);

// 7. Audit Logs
router.get('/audit-logs', requirePermission(PERMISSIONS.AUDIT_LOGS_READ), listAuditLogs);

// 8. Cross-Entity Search
router.get(
  '/search',
  requirePermission(PERMISSIONS.USERS_READ, PERMISSIONS.CONTENT_READ),
  adminCrossSearch
);

export default router;
