import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import {
  hasPermission,
  hasAnyPermission,
  normalizeRole,
  ROLES,
} from '../services/rbacService.js';

/**
 * Protect routes — verify JWT from Authorization header and attach user to req.
 * Authenticated user identity comes exclusively from the token, never client body.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Not authorized — no token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret);

    // Fetch user without password or passwordHash
    const user = await User.findById(decoded.userId).select('-password -passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Not authorized — user not found',
      });
    }

    // Verify account status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Not authorized — invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Not authorized — token expired',
      });
    }

    next(error);
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 */
export const requireRole = (...roles) => {
  const normalizedAllowedRoles = roles.map((r) => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (!normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Granular Permission Guard Middleware
 * Verifies that the authenticated user possesses at least one of the required permissions.
 */
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (!hasAnyPermission(userRole, requiredPermissions)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Insufficient administrative permissions to perform this operation',
        requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware:
 * Attaches user to req.user if a valid token is provided,
 * but allows unauthenticated requests to proceed with req.user = null.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId).select('-password -passwordHash');
    if (user && user.status !== 'suspended' && user.status !== 'deleted') {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  } catch (_err) {
    req.user = null;
    next();
  }
};

export default protect;
