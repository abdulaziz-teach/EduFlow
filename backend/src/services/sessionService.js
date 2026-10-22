import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import User from '../models/User.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Hash raw refresh token with SHA-256 for secure database storage
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Hash client IP address to protect user privacy while tracking session context
 */
export const hashIp = (ip) => {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
};

export const getJwtSecret = () => {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
};

export const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is required. The refresh secret must be set as an independent environment variable and must not be derived from JWT_SECRET.');
  }
  return secret;
};

/**
 * Generate a 15-minute access token
 */
export const generateAccessToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId: userId.toString(), role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * Create a new user session and issue access + refresh tokens
 */
export const createSession = async (user, req) => {
  const userId = user._id || user.id;
  const role = user.role || 'user';

  // 1. Generate access token
  const accessToken = generateAccessToken(userId, role);

  // 2. Generate cryptographically secure refresh token
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);

  // 3. Compute expiration date (7 days)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // 4. Capture request metadata
  const userAgent = req?.headers ? req.headers['user-agent'] || '' : '';
  const ip = req?.ip || (req?.headers ? req.headers['x-forwarded-for'] : '') || '';
  const ipHash = hashIp(ip);

  // 5. Store session document
  const session = await Session.create({
    userId,
    tokenHash,
    expiresAt,
    userAgent,
    ipHash,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId: session._id,
    expiresAt,
  };
};

/**
 * Rotate refresh token: validate existing session, verify active user, revoke old session, and create a fresh one
 */
export const rotateSession = async (rawRefreshToken, req) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
    const err = new Error('INVALID_REFRESH_TOKEN');
    err.statusCode = 401;
    err.errorCode = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ tokenHash }).select('+tokenHash');

  if (!session) {
    const err = new Error('SESSION_NOT_FOUND');
    err.statusCode = 401;
    err.errorCode = 'SESSION_NOT_FOUND';
    throw err;
  }

  // Detect token reuse: if already revoked, revoke ALL user sessions as a security precaution
  if (session.revokedAt) {
    await Session.updateMany({ userId: session.userId, revokedAt: null }, { revokedAt: new Date() });
    const err = new Error('TOKEN_REUSE_DETECTED');
    err.statusCode = 401;
    err.errorCode = 'TOKEN_REUSE_DETECTED';
    throw err;
  }

  if (session.expiresAt < new Date()) {
    const err = new Error('SESSION_EXPIRED');
    err.statusCode = 401;
    err.errorCode = 'SESSION_EXPIRED';
    throw err;
  }

  // Authoritative user verification from database
  const user = await User.findById(session.userId);

  if (!user) {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('USER_NOT_FOUND');
    err.statusCode = 401;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  // Verify account standing
  if (user.status === 'suspended') {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('ACCOUNT_SUSPENDED');
    err.statusCode = 403;
    err.errorCode = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  if (user.status === 'deleted') {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('ACCOUNT_DELETED');
    err.statusCode = 403;
    err.errorCode = 'ACCOUNT_DELETED';
    throw err;
  }

  if (user.status && user.status !== 'active') {
    session.revokedAt = new Date();
    await session.save();
    const err = new Error('ACCOUNT_INACTIVE');
    err.statusCode = 403;
    err.errorCode = 'ACCOUNT_INACTIVE';
    throw err;
  }

  // Revoke current session
  session.revokedAt = new Date();
  await session.save();

  // Create new session for user
  const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
  const newTokenHash = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const userAgent = req?.headers ? req.headers['user-agent'] || session.userAgent : session.userAgent;
  const ip = req?.ip || (req?.headers ? req.headers['x-forwarded-for'] : '') || '';
  const ipHash = ip ? hashIp(ip) : session.ipHash;

  const newSession = await Session.create({
    userId: session.userId,
    tokenHash: newTokenHash,
    expiresAt,
    userAgent,
    ipHash,
  });

  // Use authoritative current role from the User document
  const accessToken = generateAccessToken(session.userId, user.role || 'user');

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
    sessionId: newSession._id,
    userId: session.userId,
    expiresAt,
  };
};

/**
 * Revoke an individual session
 */
export const revokeSession = async (sessionId, userId) => {
  return Session.findOneAndUpdate(
    { _id: sessionId, userId, revokedAt: null },
    { revokedAt: new Date() },
    { new: true }
  );
};

/**
 * Revoke all sessions for a user (e.g. password reset or global logout)
 */
export const revokeAllUserSessions = async (userId) => {
  return Session.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

/**
 * Set secure httpOnly cookie for refresh token
 */
export const setRefreshTokenCookie = (res, refreshToken) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
};

/**
 * Clear refresh token cookie on logout
 */
export const clearRefreshTokenCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  });
};
