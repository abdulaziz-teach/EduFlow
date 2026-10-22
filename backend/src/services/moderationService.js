import Report from '../models/Report.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import Session from '../models/Session.js';
import { logAdminAction } from './auditService.js';

/**
 * Moderation Service — Content Safety, Triage & Incident Resolution
 */

/**
 * Submit a new content or user report
 */
export const submitReport = async ({
  reporterId,
  targetType,
  targetId,
  reason,
  description = '',
}) => {
  // Deduplication: Avoid duplicate pending reports by the exact same user on the same target
  const existingReport = await Report.findOne({
    reporterId,
    targetType,
    targetId: String(targetId),
    status: { $in: ['pending', 'under_review', 'escalated'] },
  });

  if (existingReport) {
    return {
      report: existingReport,
      isDuplicate: true,
    };
  }

  // Auto-escalation: Count total pending reports on this target
  const pendingCount = await Report.countDocuments({
    targetType,
    targetId: String(targetId),
    status: { $in: ['pending', 'under_review', 'escalated'] },
  });

  let priority = 'medium';
  if (reason === 'unsafe' || reason === 'prompt_injection') {
    priority = 'urgent';
  } else if (pendingCount >= 2) {
    priority = 'high';
  }

  const report = await Report.create({
    reporterId,
    targetType,
    targetId: String(targetId),
    reason,
    description: description.substring(0, 1000),
    priority,
    status: 'pending',
  });

  return {
    report,
    isDuplicate: false,
  };
};

/**
 * List reports with filtering and pagination
 */
export const listReports = async (filters = {}, { page = 1, limit = 20 } = {}) => {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.assignedTo) query.assignedTo = filters.assignedTo;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [total, reports] = await Promise.all([
    Report.countDocuments(query),
    Report.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('reporterId', 'name email displayName avatar')
      .populate('assignedTo', 'name email displayName role avatar')
      .lean(),
  ]);

  return {
    reports,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Assign / Claim a report with concurrency protection
 */
export const assignReport = async (reportId, moderatorUser) => {
  const modId = moderatorUser._id || moderatorUser.id;

  // Atomic update: only claim if not already assigned or assigned to self
  const updated = await Report.findOneAndUpdate(
    {
      _id: reportId,
      $or: [
        { assignedTo: null },
        { assignedTo: modId },
      ],
    },
    {
      $set: {
        assignedTo: modId,
        assignedAt: new Date(),
        status: 'under_review',
      },
      $inc: { version: 1 },
    },
    { new: true }
  ).populate('assignedTo', 'name email displayName role avatar');

  if (!updated) {
    // Check if it was already assigned to someone else
    const current = await Report.findById(reportId).populate('assignedTo', 'name email displayName');
    if (current && current.assignedTo && String(current.assignedTo._id) !== String(modId)) {
      const error = new Error(`Report is already claimed by moderator: ${current.assignedTo.name || current.assignedTo.email}`);
      error.code = 'CONCURRENT_CLAIM_CONFLICT';
      error.status = 409;
      throw error;
    }
    throw new Error('Report not found');
  }

  await logAdminAction({
    actorId: modId,
    actorRole: moderatorUser.role,
    action: 'moderation.claim',
    resourceType: 'report',
    resourceId: reportId,
    metadata: { reportId },
  });

  return updated;
};

/**
 * Resolve a report and optionally enforce content/user administrative actions
 */
export const resolveReport = async (
  reportId,
  { resolution, action = 'none' },
  moderatorUser
) => {
  const modId = moderatorUser._id || moderatorUser.id;

  const report = await Report.findById(reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  // Execute associated remediation action
  if (action === 'content_hidden' || action === 'content_removed') {
    if (report.targetType === 'course') {
      await Course.findByIdAndUpdate(report.targetId, { status: 'archived' });
    } else if (report.targetType === 'lesson') {
      await Lesson.findByIdAndUpdate(report.targetId, { isPublished: false, status: 'archived' });
    } else if (report.targetType === 'flashcard') {
      await FlashcardDeck.findByIdAndUpdate(report.targetId, { status: 'private', isPublic: false });
    }
  } else if (action === 'user_suspended' && report.targetType === 'user') {
    await User.findByIdAndUpdate(report.targetId, { status: 'suspended' });
    await Session.deleteMany({ userId: report.targetId });
  }

  report.status = 'resolved';
  report.resolution = resolution || 'Resolved by moderator';
  report.resolutionAction = action;
  report.resolvedBy = modId;
  report.resolvedAt = new Date();
  await report.save();

  await logAdminAction({
    actorId: modId,
    actorRole: moderatorUser.role,
    action: 'moderation.resolve',
    resourceType: 'report',
    resourceId: reportId,
    metadata: {
      targetType: report.targetType,
      targetId: report.targetId,
      action,
      resolution,
    },
  });

  return report;
};

/**
 * Reject or dismiss an invalid report
 */
export const rejectReport = async (reportId, reason, moderatorUser) => {
  const modId = moderatorUser._id || moderatorUser.id;

  const report = await Report.findById(reportId);
  if (!report) {
    throw new Error('Report not found');
  }

  report.status = 'rejected';
  report.resolution = reason || 'Dismissed as non-violating';
  report.resolutionAction = 'dismissed';
  report.resolvedBy = modId;
  report.resolvedAt = new Date();
  await report.save();

  await logAdminAction({
    actorId: modId,
    actorRole: moderatorUser.role,
    action: 'moderation.reject',
    resourceType: 'report',
    resourceId: reportId,
    metadata: { reason },
  });

  return report;
};

export default {
  submitReport,
  listReports,
  assignReport,
  resolveReport,
  rejectReport,
};
