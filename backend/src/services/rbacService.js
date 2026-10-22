/**
 * RBAC Service — Centralized Role & Permission Registry
 * 
 * Provides explicit, non-inherited permission validation for EduFlow administrators,
 * content managers, moderators, support agents, and analysts.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CONTENT_MANAGER: 'content_manager',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  ANALYST: 'analyst',
  USER: 'user',
};

export const PERMISSIONS = {
  // User operations
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',
  USERS_SUSPEND: 'users.suspend',

  // Curriculum & content operations
  CONTENT_READ: 'content.read',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_MODERATE: 'content.moderate',

  // AI Content operations
  AI_CONTENT_REVIEW: 'ai_content.review',
  AI_CONTENT_APPROVE: 'ai_content.approve',

  // Monetization & billing operations
  BILLING_READ: 'billing.read',
  BILLING_MANAGE: 'billing.manage',

  // Intelligence & analytics
  ANALYTICS_READ: 'analytics.read',

  // Notification management
  NOTIFICATIONS_MANAGE: 'notifications.manage',

  // Operational toggles & feature flags
  FEATURE_FLAGS_MANAGE: 'feature_flags.manage',

  // Audit logs & investigation
  AUDIT_LOGS_READ: 'audit_logs.read',

  // System & incident operations
  SYSTEM_OPERATIONS: 'system.operations',
};

/**
 * Explicit Role-to-Permissions Mapping
 * No hidden inheritance; each role defines its complete permissible action set.
 */
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.AI_CONTENT_REVIEW,
    PERMISSIONS.AI_CONTENT_APPROVE,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
    PERMISSIONS.FEATURE_FLAGS_MANAGE,
    PERMISSIONS.AUDIT_LOGS_READ,
    PERMISSIONS.SYSTEM_OPERATIONS,
  ],

  [ROLES.CONTENT_MANAGER]: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_EDIT,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.AI_CONTENT_REVIEW,
    PERMISSIONS.AI_CONTENT_APPROVE,
    PERMISSIONS.ANALYTICS_READ,
  ],

  [ROLES.MODERATOR]: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_MODERATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_SUSPEND,
    PERMISSIONS.AUDIT_LOGS_READ,
  ],

  [ROLES.SUPPORT]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.AUDIT_LOGS_READ,
  ],

  [ROLES.ANALYST]: [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.AUDIT_LOGS_READ,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.USERS_READ,
  ],

  [ROLES.USER]: [],
};

/**
 * Normalize role string to canonical lowercase representation
 */
export const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return ROLES.USER;
  const lower = role.toLowerCase().trim();
  if (lower === 'super_admin' || lower === 'superadmin') return ROLES.SUPER_ADMIN;
  if (lower === 'admin') return ROLES.ADMIN;
  if (lower === 'content_manager' || lower === 'contentmanager') return ROLES.CONTENT_MANAGER;
  if (lower === 'moderator') return ROLES.MODERATOR;
  if (lower === 'support') return ROLES.SUPPORT;
  if (lower === 'analyst') return ROLES.ANALYST;
  return ROLES.USER;
};

/**
 * Retrieve list of granted permissions for a given role
 */
export const getPermissionsForRole = (role) => {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm] || [];
};

/**
 * Check if a role possesses a specific permission
 */
export const hasPermission = (role, permission) => {
  const perms = getPermissionsForRole(role);
  return perms.includes(permission);
};

/**
 * Check if a role possesses at least one of the listed permissions
 */
export const hasAnyPermission = (role, permissions = []) => {
  const perms = getPermissionsForRole(role);
  return permissions.some((p) => perms.includes(p));
};

/**
 * Check if a role is an administrative/staff role
 */
export const isAdministrativeRole = (role) => {
  const norm = normalizeRole(role);
  return norm !== ROLES.USER;
};

/**
 * Validate role change authority
 * (Only SUPER_ADMIN can assign/revoke SUPER_ADMIN, only ADMIN or SUPER_ADMIN can manage other roles)
 */
export const canManageRole = (actorRole, targetRole) => {
  const normActor = normalizeRole(actorRole);
  const normTarget = normalizeRole(targetRole);

  if (normActor === ROLES.SUPER_ADMIN) return true;
  if (normActor === ROLES.ADMIN) {
    // Normal admin cannot create or modify a super_admin
    return normTarget !== ROLES.SUPER_ADMIN;
  }
  return false;
};

export default {
  ROLES,
  PERMISSIONS,
  normalizeRole,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  isAdministrativeRole,
  canManageRole,
};
