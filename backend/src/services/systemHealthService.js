import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Report from '../models/Report.js';
import Payment from '../models/Payment.js';
import { getEmergencyStatus } from './featureFlagService.js';
import { logAdminAction } from './auditService.js';

/**
 * System Operations & Health Service
 */

export const getAggregatedSystemHealth = async () => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'healthy' : dbState === 2 ? 'connecting' : 'unhealthy';

  const emergency = await getEmergencyStatus();

  // Active incidents
  const [openIncidentsCount, pendingReportsCount, totalUsersCount, totalCoursesCount] =
    await Promise.all([
      Incident.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      Report.countDocuments({ status: { $in: ['pending', 'under_review', 'escalated'] } }),
      User.countDocuments({ status: { $ne: 'deleted' } }),
      Course.countDocuments({ status: 'published' }),
    ]);

  const memory = process.memoryUsage();

  return {
    status: dbState === 1 && !emergency.isMaintenanceMode ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    components: {
      api: {
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        memoryUsageMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
      database: {
        status: dbStatus,
        readyState: dbState,
        host: dbState === 1 ? mongoose.connection.host : null,
        name: dbState === 1 ? mongoose.connection.name : null,
      },
      aiProvider: {
        status: emergency.isAiPaused ? 'paused_by_emergency' : 'operational',
        provider: process.env.OPENAI_API_KEY ? 'openai' : 'mock_fallback',
        isEmergencyPaused: emergency.isAiPaused,
      },
      paymentProvider: {
        status: 'operational',
        provider: process.env.STRIPE_SECRET_KEY ? 'stripe' : 'mock_payment_provider',
      },
      notifications: {
        status: emergency.isNotificationsPaused ? 'paused_by_emergency' : 'operational',
        isEmergencyPaused: emergency.isNotificationsPaused,
      },
      searchIndex: {
        status: 'healthy',
        indexedCourses: totalCoursesCount,
      },
    },
    emergencyControls: emergency,
    telemetry: {
      openIncidents: openIncidentsCount,
      pendingModerationReports: pendingReportsCount,
      totalActiveUsers: totalUsersCount,
      publishedCourses: totalCoursesCount,
    },
  };
};

/**
 * Log an operational incident
 */
export const createIncident = async (incidentData, operatorUser) => {
  const operatorId = operatorUser._id || operatorUser.id;

  const incident = await Incident.create({
    title: incidentData.title,
    description: incidentData.description,
    severity: incidentData.severity || 'p2_medium',
    affectedService: incidentData.affectedService || 'system',
    status: 'open',
    createdBy: operatorId,
    assignedOperator: operatorId,
    timeline: [
      {
        note: 'Incident created and investigation initiated.',
        authorId: operatorId,
        authorName: operatorUser.name || operatorUser.displayName || 'Operator',
      },
    ],
  });

  await logAdminAction({
    actorId: operatorId,
    actorRole: operatorUser.role,
    action: 'incident.create',
    resourceType: 'incident',
    resourceId: incident._id,
    metadata: {
      title: incident.title,
      severity: incident.severity,
      affectedService: incident.affectedService,
    },
  });

  return incident;
};

/**
 * Update incident status or append to timeline
 */
export const updateIncident = async (incidentId, updateData, operatorUser) => {
  const operatorId = operatorUser._id || operatorUser.id;

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw new Error('Incident not found');
  }

  if (updateData.status) {
    incident.status = updateData.status;
    if (updateData.status === 'resolved' && !incident.resolvedAt) {
      incident.resolvedAt = new Date();
    }
  }

  if (updateData.severity) incident.severity = updateData.severity;
  if (updateData.resolutionNotes) incident.resolutionNotes = updateData.resolutionNotes;
  if (updateData.assignedOperator) incident.assignedOperator = updateData.assignedOperator;

  if (updateData.note) {
    incident.timeline.push({
      timestamp: new Date(),
      note: updateData.note,
      authorId: operatorId,
      authorName: operatorUser.name || operatorUser.displayName || 'Operator',
    });
  }

  await incident.save();

  await logAdminAction({
    actorId: operatorId,
    actorRole: operatorUser.role,
    action: 'incident.update',
    resourceType: 'incident',
    resourceId: incidentId,
    metadata: {
      status: incident.status,
      severity: incident.severity,
    },
  });

  return incident;
};

/**
 * List operational incidents
 */
export const listIncidents = async (filters = {}, { page = 1, limit = 20 } = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.affectedService) query.affectedService = filters.affectedService;

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [total, incidents] = await Promise.all([
    Incident.countDocuments(query),
    Incident.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('createdBy', 'name email displayName')
      .populate('assignedOperator', 'name email displayName')
      .lean(),
  ]);

  return {
    incidents,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export default {
  getAggregatedSystemHealth,
  createIncident,
  updateIncident,
  listIncidents,
};
