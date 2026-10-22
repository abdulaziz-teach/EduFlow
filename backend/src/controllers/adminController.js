import mongoose from 'mongoose';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import Wallet from '../models/Wallet.js';
import Subscription from '../models/Subscription.js';
import AuditLog from '../models/AuditLog.js';
import { logAdminAction, queryAuditLogs } from '../services/auditService.js';
import { canManageRole, normalizeRole, ROLES } from '../services/rbacService.js';
import {
  listReports as listModerationReports,
  assignReport as assignModerationReport,
  resolveReport as resolveModerationReport,
  rejectReport as rejectModerationReport,
} from '../services/moderationService.js';
import {
  fetchAllFlags,
  upsertFeatureFlag,
  toggleEmergencyControl,
} from '../services/featureFlagService.js';
import {
  getAggregatedSystemHealth,
  createIncident as createSysIncident,
  updateIncident as updateSysIncident,
  listIncidents as listSysIncidents,
} from '../services/systemHealthService.js';
import { getUserPlan } from '../services/entitlementService.js';
import { escapeRegex, isSearchLengthValid, MAX_SEARCH_LENGTH } from '../utils/regexHelper.js';

// ==========================================
// 1. ADMIN OVERVIEW & DASHBOARD
// ==========================================

export const getAdminOverview = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeTodayUsers,
      totalCourses,
      draftCourses,
      pendingReports,
      featureFlagsMap,
      systemHealth,
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ lastLoginAt: { $gte: today } }),
      Course.countDocuments({ status: 'published' }),
      Course.countDocuments({ status: 'draft' }),
      mongoose.model('Report').countDocuments({ status: { $in: ['pending', 'under_review', 'escalated'] } }),
      fetchAllFlags(),
      getAggregatedSystemHealth(),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeTodayUsers,
          publishedCourses: totalCourses,
          draftCourses,
          pendingReports,
          totalFeatureFlags: Object.keys(featureFlagsMap).length,
        },
        systemHealth,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

export const listUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      if (!isSearchLengthValid(search, MAX_SEARCH_LENGTH)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Search query exceeds maximum allowed length of ${MAX_SEARCH_LENGTH} characters`,
        });
      }
      const sanitized = search.trim();
      const regex = new RegExp(escapeRegex(sanitized), 'i');
      query.$or = [
        { email: { $regex: regex } },
        { name: { $regex: regex } },
        { displayName: { $regex: regex } },
      ];
    }

    if (role && role !== 'all') {
      query.role = normalizeRole(role);
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password -passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          pages: Math.ceil(total / safeLimit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getUserDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ID',
        message: 'Invalid user ID format',
      });
    }

    const user = await User.findById(id).select('-password -passwordHash').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    const [enrollments, wallet, subscription, activePlan, recentAudits] = await Promise.all([
      Enrollment.find({ userId: id }).populate('courseId', 'title slug').lean(),
      Wallet.findOne({ userId: id }).lean(),
      Subscription.findOne({ userId: id }).lean(),
      getUserPlan(id),
      AuditLog.find({ targetId: String(id) }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        user,
        enrollments,
        wallet: wallet || { coins: 0, gems: 0, tickets: 0 },
        subscription,
        activePlan,
        recentAudits,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Terms of Service violation' } = req.body;

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'SELF_ACTION_DISALLOWED',
        message: 'You cannot suspend your own account',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    targetUser.status = 'suspended';
    await targetUser.save();

    // Revoke all active sessions immediately
    await Session.deleteMany({ userId: id });

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'user.suspend',
      resourceType: 'user',
      resourceId: id,
      metadata: { reason, userEmail: targetUser.email },
      req,
    });

    res.json({
      success: true,
      message: 'User suspended successfully and active sessions invalidated',
      user: {
        id: targetUser._id,
        email: targetUser.email,
        status: targetUser.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const unsuspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Reinstated by administrator' } = req.body;

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    targetUser.status = 'active';
    await targetUser.save();

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'user.unsuspend',
      resourceType: 'user',
      resourceId: id,
      metadata: { reason, userEmail: targetUser.email },
      req,
    });

    res.json({
      success: true,
      message: 'User unsuspended successfully',
      user: {
        id: targetUser._id,
        email: targetUser.email,
        status: targetUser.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_ROLE',
        message: 'New role is required',
      });
    }

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        error: 'SELF_ROLE_CHANGE_DISALLOWED',
        message: 'Administrators cannot alter their own role',
      });
    }

    const normalizedNewRole = normalizeRole(role);
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Role management authority check
    if (!canManageRole(req.user.role, normalizedNewRole) || !canManageRole(req.user.role, targetUser.role)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_ROLE_AUTHORITY',
        message: 'You do not have high enough authority to assign or modify this role level',
      });
    }

    const previousRole = targetUser.role;
    targetUser.role = normalizedNewRole;
    await targetUser.save();

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'user.role_change',
      resourceType: 'user',
      resourceId: id,
      metadata: { previousRole, newRole: normalizedNewRole, userEmail: targetUser.email },
      req,
    });

    res.json({
      success: true,
      message: `User role updated to ${normalizedNewRole}`,
      user: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const invalidateUserSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await Session.deleteMany({ userId: id });

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: 'user.sessions_invalidated',
      resourceType: 'user',
      resourceId: id,
      metadata: { deletedCount: result.deletedCount },
      req,
    });

    res.json({
      success: true,
      message: `Successfully invalidated ${result.deletedCount} active session(s)`,
    });
  } catch (err) {
    next(err);
  }
};

export const bulkUserAction = async (req, res, next) => {
  try {
    const { userIds = [], action, confirm, reason = 'Bulk administrative action' } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'CONFIRMATION_REQUIRED',
        message: 'Explicit confirm flag is required for bulk actions',
      });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_TARGETS',
        message: 'At least one target user ID must be specified',
      });
    }

    // Strict batch bound: max 25 items
    if (userIds.length > 25) {
      return res.status(400).json({
        success: false,
        error: 'BATCH_LIMIT_EXCEEDED',
        message: 'Bulk actions are bounded to a maximum of 25 users per request for safety',
      });
    }

    const safeIds = userIds.filter((uid) => String(uid) !== String(req.user._id));

    let affectedCount = 0;
    if (action === 'suspend') {
      const updateRes = await User.updateMany(
        { _id: { $in: safeIds } },
        { $set: { status: 'suspended' } }
      );
      await Session.deleteMany({ userId: { $in: safeIds } });
      affectedCount = updateRes.modifiedCount;
    } else if (action === 'unsuspend') {
      const updateRes = await User.updateMany(
        { _id: { $in: safeIds } },
        { $set: { status: 'active' } }
      );
      affectedCount = updateRes.modifiedCount;
    } else if (action === 'invalidate_sessions') {
      const delRes = await Session.deleteMany({ userId: { $in: safeIds } });
      affectedCount = delRes.deletedCount;
    } else {
      return res.status(400).json({
        success: false,
        error: 'INVALID_BULK_ACTION',
        message: 'Action must be suspend, unsuspend, or invalidate_sessions',
      });
    }

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `user.bulk_${action}`,
      resourceType: 'user',
      resourceId: 'bulk',
      metadata: { targetCount: safeIds.length, affectedCount, reason },
      req,
    });

    res.json({
      success: true,
      message: `Bulk ${action} completed successfully`,
      affectedCount,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 3. UNIFIED CONTENT WORKSPACE & GOVERNANCE
// ==========================================

export const listAllContent = async (req, res, next) => {
  try {
    const { type = 'all', status = 'all', search = '', page = 1, limit = 20 } = req.query;

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    if (search && !isSearchLengthValid(search, MAX_SEARCH_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Search query exceeds maximum allowed length of ${MAX_SEARCH_LENGTH} characters`,
      });
    }

    const buildFilter = (titleField = 'title') => {
      const f = {};
      if (status !== 'all') f.status = status;
      if (search.trim()) {
        f[titleField] = { $regex: new RegExp(escapeRegex(search.trim()), 'i') };
      }
      return f;
    };

    if (type === 'course' || type === 'all') {
      const [totalCourses, courses] = await Promise.all([
        Course.countDocuments(buildFilter('title')),
        Course.find(buildFilter('title'))
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate('instructorId', 'name email displayName')
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          entityType: 'course',
          items: courses,
          pagination: {
            total: totalCourses,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(totalCourses / safeLimit),
          },
        },
      });
    }

    if (type === 'lesson') {
      const [total, lessons] = await Promise.all([
        Lesson.countDocuments(buildFilter('title')),
        Lesson.find(buildFilter('title'))
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate('courseId', 'title slug')
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          entityType: 'lesson',
          items: lessons,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
      });
    }

    if (type === 'quiz') {
      const [total, quizzes] = await Promise.all([
        Quiz.countDocuments(buildFilter('title')),
        Quiz.find(buildFilter('title'))
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate('courseId', 'title slug')
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          entityType: 'quiz',
          items: quizzes,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
      });
    }

    if (type === 'flashcard') {
      const [total, decks] = await Promise.all([
        FlashcardDeck.countDocuments(buildFilter('title')),
        FlashcardDeck.find(buildFilter('title'))
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(safeLimit)
          .populate('userId', 'name email displayName')
          .lean(),
      ]);

      return res.json({
        success: true,
        data: {
          entityType: 'flashcard',
          items: decks,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            pages: Math.ceil(total / safeLimit),
          },
        },
      });
    }

    res.status(400).json({
      success: false,
      error: 'INVALID_TYPE',
      message: 'Type must be course, lesson, quiz, flashcard, or all',
    });
  } catch (err) {
    next(err);
  }
};

export const updateContentStatus = async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const { status, reason = 'Administrative lifecycle update' } = req.body;

    const validStatuses = ['draft', 'pending_review', 'approved', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let model;
    if (entityType === 'course') model = Course;
    else if (entityType === 'lesson') model = Lesson;
    else if (entityType === 'quiz') model = Quiz;
    else if (entityType === 'flashcard') model = FlashcardDeck;
    else {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ENTITY_TYPE',
        message: 'Supported entities: course, lesson, quiz, flashcard',
      });
    }

    const item = await model.findById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `${entityType} not found`,
      });
    }

    // Validate lifecycle transitions:
    // Disallow moving from draft directly to published without passing approval (if publication requires review)
    // Archived entities cannot jump to published without approval
    if (item.status === 'archived' && status === 'published') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_LIFECYCLE_TRANSITION',
        message: 'Archived content must be unarchived to draft/review before publishing',
      });
    }

    const previousStatus = item.status;
    item.status = status;
    if (entityType === 'lesson') {
      item.isPublished = status === 'published';
    }
    await item.save();

    await logAdminAction({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: `content.${entityType}_status_change`,
      resourceType: entityType,
      resourceId: id,
      metadata: { previousStatus, newStatus: status, reason },
      req,
    });

    res.json({
      success: true,
      message: `${entityType} status transitioned to ${status}`,
      item: {
        id: item._id,
        status: item.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 4. MODERATION QUEUE & REPORT TRIAGE
// ==========================================

export const listReports = async (req, res, next) => {
  try {
    const { status, priority, targetType, page = 1, limit = 20 } = req.query;
    const result = await listModerationReports(
      { status, priority, targetType },
      { page, limit }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const assignReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await assignModerationReport(id, req.user);
    res.json({ success: true, message: 'Report claimed successfully', report });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({
        success: false,
        error: err.code || 'CONCURRENT_CLAIM_CONFLICT',
        message: err.message,
      });
    }
    next(err);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution, action } = req.body;
    const report = await resolveModerationReport(id, { resolution, action }, req.user);
    res.json({ success: true, message: 'Report resolved successfully', report });
  } catch (err) {
    next(err);
  }
};

export const rejectReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const report = await rejectModerationReport(id, reason, req.user);
    res.json({ success: true, message: 'Report dismissed successfully', report });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 5. FEATURE FLAGS & EMERGENCY CONTROLS
// ==========================================

export const listFeatureFlags = async (req, res, next) => {
  try {
    const flagsMap = await fetchAllFlags(true);
    res.json({
      success: true,
      data: {
        flags: Object.values(flagsMap),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateFeatureFlag = async (req, res, next) => {
  try {
    const { key } = req.params;
    const flag = await upsertFeatureFlag(key, req.body, req.user);
    res.json({ success: true, message: 'Feature flag updated', flag });
  } catch (err) {
    next(err);
  }
};

export const setEmergencyControl = async (req, res, next) => {
  try {
    const { action } = req.params;
    const { isEnabled, reason = 'Operational safety intervention' } = req.body;

    const flag = await toggleEmergencyControl(action, isEnabled, reason, req.user);
    res.json({
      success: true,
      message: `Emergency control ${action} set to ${isEnabled}`,
      control: flag,
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 6. SYSTEM HEALTH & INCIDENT MANAGEMENT
// ==========================================

export const getSystemHealth = async (req, res, next) => {
  try {
    const health = await getAggregatedSystemHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    next(err);
  }
};

export const listIncidents = async (req, res, next) => {
  try {
    const { status, severity, affectedService, page = 1, limit = 20 } = req.query;
    const result = await listSysIncidents({ status, severity, affectedService }, { page, limit });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const createIncident = async (req, res, next) => {
  try {
    const incident = await createSysIncident(req.body, req.user);
    res.status(201).json({ success: true, message: 'Incident logged', incident });
  } catch (err) {
    next(err);
  }
};

export const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await updateSysIncident(id, req.body, req.user);
    res.json({ success: true, message: 'Incident updated', incident });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 7. AUDIT LOGS
// ==========================================

export const listAuditLogs = async (req, res, next) => {
  try {
    const { actorId, action, resourceType, startDate, endDate, page, limit = 20, cursor } = req.query;

    if (action && !isSearchLengthValid(action, MAX_SEARCH_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Action filter exceeds maximum allowed length of ${MAX_SEARCH_LENGTH} characters`,
      });
    }

    const result = await queryAuditLogs(
      { actorId, action, resourceType, startDate, endDate },
      { page, limit, cursor }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// 8. ADMIN CROSS-SEARCH
// ==========================================

export const adminCrossSearch = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    const queryStr = q.trim();

    if (q && !isSearchLengthValid(q, MAX_SEARCH_LENGTH)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Search query exceeds maximum allowed length of ${MAX_SEARCH_LENGTH} characters`,
      });
    }

    if (!queryStr || queryStr.length < 2) {
      return res.json({
        success: true,
        data: { users: [], courses: [], reports: [], auditLogs: [] },
      });
    }

    const regex = new RegExp(escapeRegex(queryStr), 'i');

    const [users, courses, reports, auditLogs] = await Promise.all([
      User.find({
        $or: [{ email: regex }, { name: regex }, { displayName: regex }],
      })
        .select('-password -passwordHash')
        .limit(5)
        .lean(),
      Course.find({ title: regex }).select('title slug status category level').limit(5).lean(),
      mongoose
        .model('Report')
        .find({ $or: [{ reason: regex }, { description: regex }] })
        .limit(5)
        .lean(),
      AuditLog.find({ $or: [{ action: regex }, { targetId: regex }, { resourceId: regex }] })
        .limit(5)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        users,
        courses,
        reports,
        auditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default {
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
};
