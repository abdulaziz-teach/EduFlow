import User from '../models/User.js';
import {
  createSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  hashToken,
} from '../services/sessionService.js';
import { getOrCreateWallet } from '../services/walletService.js';
import Session from '../models/Session.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, displayName, email, password, preferredLanguage } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Never trust client-provided role or status during registration
    const user = await User.create({
      name: (name || displayName || '').trim(),
      displayName: (displayName || name || '').trim(),
      email: normalizedEmail,
      password,
      ...(preferredLanguage ? { preferredLanguage } : {}),
      status: 'active',
    });

    // Initialize user wallet with default balances (100 coins, 0 gems, 5 tickets)
    await getOrCreateWallet(user._id);

    // Create session and generate tokens
    const { accessToken, refreshToken, sessionId } = await createSession(user, req);

    // Set secure httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: user.toSafeObject(),
      token: accessToken, // Legacy compatibility
      accessToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Find user and explicitly select password and passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+password +passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify account status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended. Please contact support.',
      });
    }

    if (user.status === 'deleted') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Ensure wallet exists
    await getOrCreateWallet(user._id);

    // Create session
    const { accessToken, refreshToken, sessionId } = await createSession(user, req);

    // Set secure httpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.toSafeObject(),
      token: accessToken, // Legacy compatibility
      accessToken,
      sessionId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token using refresh token session
 * @route   POST /api/auth/refresh
 * @access  Public (via refresh token)
 */
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      });
    }

    const { accessToken, refreshToken, sessionId, userId } = await rotateSession(token, req);

    // Update refresh cookie
    setRefreshTokenCookie(res, refreshToken);

    res.json({
      success: true,
      token: accessToken,
      accessToken,
      sessionId,
      userId,
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    if (error.message === 'ACCOUNT_SUSPENDED' || error.errorCode === 'ACCOUNT_SUSPENDED') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended. Please contact support.',
      });
    }
    if (error.message === 'ACCOUNT_DELETED' || error.errorCode === 'ACCOUNT_DELETED') {
      return res.status(403).json({
        success: false,
        error: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
      });
    }
    if (['INVALID_REFRESH_TOKEN', 'SESSION_NOT_FOUND', 'TOKEN_REUSE_DETECTED', 'SESSION_EXPIRED', 'USER_NOT_FOUND'].includes(error.message)) {
      return res.status(401).json({
        success: false,
        error: error.message,
        message: 'Invalid or expired session. Please log in again.',
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.errorCode || error.message,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Logout user and revoke current session
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      const tokenHash = hashToken(token);
      await Session.findOneAndUpdate({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
    }

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke all sessions for current user (global logout)
 * @route   POST /api/auth/revoke-all
 * @access  Protected
 */
export const revokeAll = async (req, res, next) => {
  try {
    await revokeAllUserSessions(req.user._id);
    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: 'All active sessions have been revoked',
    });
  } catch (error) {
    next(error);
  }
};
