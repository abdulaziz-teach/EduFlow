import crypto from 'crypto';
import AuditLog from '../models/AuditLog.js';
import { escapeRegex, isSearchLengthValid, MAX_SEARCH_LENGTH } from '../utils/regexHelper.js';

/**
 * Hash IP address for privacy-conscious security tracing
 */
const hashIp = (ip) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
};

/**
 * Audit Logging Service for Administrative Operations
 * 
 * Centralized, append-only logger that sanitizes payloads to prevent credential leakage.
 */
export const logAdminAction = async ({
  actorId,
  adminUserId,
  actorRole = 'admin',
  action,
  resourceType,
  targetType,
  resourceId,
  targetId,
  metadata = {},
  req = null,
  ipHashOrSafeIdentifier = null,
  userAgent = null,
}) => {
  try {
    const finalActorId = actorId || adminUserId;
    const finalResourceType = resourceType || targetType || 'system';
    const finalResourceId = resourceId || targetId || 'none';

    // Derive safe IP and User-Agent if request object was provided
    let safeIp = ipHashOrSafeIdentifier;
    let safeUserAgent = userAgent;

    if (req) {
      if (!safeIp) {
        const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        safeIp = hashIp(rawIp);
      }
      if (!safeUserAgent) {
        safeUserAgent = req.headers['user-agent'] || 'unknown';
      }
    }

    // Sanitize metadata: strip passwords, tokens, API keys, cards
    const safeMetadata = { ...metadata };
    const forbiddenKeys = [
      'password',
      'passwordHash',
      'token',
      'tokenHash',
      'refreshToken',
      'secret',
      'authorization',
      'creditCard',
      'cvv',
      'apiKey',
    ];

    for (const key of forbiddenKeys) {
      delete safeMetadata[key];
    }

    return await AuditLog.create({
      actorId: finalActorId,
      adminUserId: finalActorId,
      actorRole,
      action,
      resourceType: finalResourceType,
      targetType: finalResourceType,
      resourceId: String(finalResourceId),
      targetId: String(finalResourceId),
      metadata: safeMetadata,
      ipHashOrSafeIdentifier: safeIp,
      userAgent: safeUserAgent,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
    return null;
  }
};

/**
 * Encode a deterministic pagination cursor from an AuditLog document.
 */
export const encodeCursor = (doc) => {
  if (!doc || !doc.createdAt || !doc._id) return null;
  const payload = {
    t: new Date(doc.createdAt).getTime(),
    id: doc._id.toString(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

/**
 * Decode and validate a deterministic pagination cursor.
 * Throws an error with errorCode = 'INVALID_CURSOR' if malformed or tampered.
 */
export const decodeCursor = (cursorStr) => {
  if (!cursorStr || typeof cursorStr !== 'string') return null;
  try {
    const raw = Buffer.from(cursorStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.t !== 'number' || !parsed.id || typeof parsed.id !== 'string') {
      const err = new Error('Invalid cursor structure');
      err.errorCode = 'INVALID_CURSOR';
      err.statusCode = 400;
      throw err;
    }
    const date = new Date(parsed.t);
    if (isNaN(date.getTime()) || !/^[0-9a-fA-F]{24}$/.test(parsed.id)) {
      const err = new Error('Invalid cursor timestamp or ID');
      err.errorCode = 'INVALID_CURSOR';
      err.statusCode = 400;
      throw err;
    }
    return { createdAt: date, _id: parsed.id };
  } catch (err) {
    if (err.errorCode === 'INVALID_CURSOR') throw err;
    const error = new Error('Malformed or corrupted pagination cursor');
    error.errorCode = 'INVALID_CURSOR';
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Query Audit Logs with deterministic cursor-based pagination and backward-compatible page support.
 */
export const queryAuditLogs = async (filters = {}, { cursor = null, page = null, limit = 20 } = {}) => {
  const andClauses = [];

  if (filters.actorId) {
    andClauses.push({ $or: [{ actorId: filters.actorId }, { adminUserId: filters.actorId }] });
  }
  if (filters.action && typeof filters.action === 'string') {
    if (!isSearchLengthValid(filters.action, MAX_SEARCH_LENGTH)) {
      const err = new Error(`Action filter exceeds maximum allowed length of ${MAX_SEARCH_LENGTH} characters`);
      err.errorCode = 'VALIDATION_ERROR';
      err.statusCode = 400;
      throw err;
    }
    andClauses.push({ action: { $regex: new RegExp(escapeRegex(filters.action.trim()), 'i') } });
  }
  if (filters.resourceType) {
    andClauses.push({ $or: [{ resourceType: filters.resourceType }, { targetType: filters.resourceType }] });
  }
  if (filters.startDate || filters.endDate) {
    const dateFilter = {};
    if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);
    andClauses.push({ createdAt: dateFilter });
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  // 1. Pure Cursor Pagination path (no skip, deterministic O(1) index scan)
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      andClauses.push({
        $or: [
          { createdAt: { $lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, _id: { $lt: decoded._id } },
        ],
      });
    }

    const finalQuery = andClauses.length > 0 ? { $and: andClauses } : {};

    const rawLogs = await AuditLog.find(finalQuery)
      .sort({ createdAt: -1, _id: -1 })
      .limit(safeLimit + 1)
      .populate('actorId', 'name email displayName role avatar')
      .lean();

    const hasMore = rawLogs.length > safeLimit;
    const logs = hasMore ? rawLogs.slice(0, safeLimit) : rawLogs;
    const nextCursor = hasMore && logs.length > 0 ? encodeCursor(logs[logs.length - 1]) : null;

    return {
      logs,
      pagination: {
        nextCursor,
        hasMore,
        limit: safeLimit,
        cursor,
      },
    };
  }

  // 2. Initial / Backward-compatible Offset Pagination path
  const finalQuery = andClauses.length > 0 ? { $and: andClauses } : {};
  const safePage = Math.max(Number(page) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  const [total, rawLogs] = await Promise.all([
    AuditLog.countDocuments(finalQuery),
    AuditLog.find(finalQuery)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(safeLimit + 1)
      .populate('actorId', 'name email displayName role avatar')
      .lean(),
  ]);

  const hasMore = rawLogs.length > safeLimit;
  const logs = hasMore ? rawLogs.slice(0, safeLimit) : rawLogs;
  const nextCursor = hasMore && logs.length > 0 ? encodeCursor(logs[logs.length - 1]) : null;

  return {
    logs,
    pagination: {
      nextCursor,
      hasMore,
      limit: safeLimit,
      page: safePage,
      total,
      pages: Math.ceil(total / safeLimit),
      cursor: null,
    },
  };
};

export default {
  logAdminAction,
  queryAuditLogs,
  encodeCursor,
  decodeCursor,
};
