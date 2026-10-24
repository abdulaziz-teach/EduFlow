import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import studyPlanRoutes from './routes/studyPlanRoutes.js';
import mentorRoutes from './routes/mentorRoutes.js';
import studySessionRoutes from './routes/studySessionRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import practiceRoutes from './routes/practiceRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import smartNoteRoutes from './routes/smartNoteRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import adaptiveRoutes from './routes/adaptiveRoutes.js';
import adminContentRoutes from './routes/adminContentRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import featureFlagRoutes from './routes/featureFlagRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';
import requestLogger from './middleware/requestLogger.js';
import { getAllCircuitBreakersStats } from './utils/circuitBreaker.js';

const app = express();

// Trust first proxy hop when deployed behind reverse proxies (Render, Railway, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// Attach Request ID and structured request logger
app.use(requestLogger);

// Set security HTTP headers
app.use(helmet());

// CORS — allow configured client origins; development permits local tooling.
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000,http://127.0.0.1:5173';
const allowedOrigins = rawClientUrl
  .split(',')
  .map((o) => {
    const trimmed = o.trim();
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  });

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
      if (!origin) return cb(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes(origin.replace(/\/+$/, ''))
      ) {
        return cb(null, true);
      }
      return cb(new Error(`Blocked by CORS policy: origin ${origin} is not in allowedOrigins [${allowedOrigins.join(', ')}]`));
    },
    credentials: true,
  })
);

// Parse JSON with a reasonable size limit and capture raw body bytes for webhook verification
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Parse cookies for secure httpOnly refresh tokens
app.use(cookieParser());

// Global NoSQL injection sanitization (protects req.body, req.query, req.params)
app.use(mongoSanitize({ replaceWith: '_' }));

// Rate limiter for auth endpoints — development-friendly limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests — please try again later',
  },
});

// Rate limiter for AI generation — expensive operation
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 generations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many AI requests — please try again later',
  },
});

// --------------- Health Check Endpoints ---------------

const getHealthStatus = () => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  return {
    success: dbState === 1,
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };
};

const getDbHealthStatus = () => {
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;

  return {
    success: isConnected,
    status: isConnected ? 'healthy' : 'unhealthy',
    readyState: dbState,
    host: isConnected ? mongoose.connection.host : null,
    name: isConnected ? mongoose.connection.name : null,
  };
};

app.get(['/health', '/api/health'], (_req, res) => {
  const health = getHealthStatus();
  res.status(health.success ? 200 : 503).json(health);
});

// Liveness probe: checks process liveness only (does NOT depend on DB)
app.get(['/health/live', '/api/health/live'], (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe: checks dependency availability (MongoDB, circuit breakers)
app.get(['/health/ready', '/api/health/ready'], (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbReady = dbState === 1;
  const breakers = getAllCircuitBreakersStats();

  res.status(isDbReady ? 200 : 503).json({
    success: isDbReady,
    status: isDbReady ? 'ready' : 'not_ready',
    database: {
      connected: isDbReady,
      readyState: dbState,
      host: isDbReady ? mongoose.connection.host : null,
    },
    circuitBreakers: breakers,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get(['/health/db', '/api/health/db'], (_req, res) => {
  const dbHealth = getDbHealthStatus();
  res.status(dbHealth.success ? 200 : 503).json(dbHealth);
});

// --------------- Routes ---------------

// Auth routes (with rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// User routes
app.use('/api/users', userRoutes);

// Search & Discovery routes
app.use('/api/search', searchRoutes);

// Course routes
app.use('/api/courses', courseRoutes);

// Quiz routes
app.use('/api/quizzes', quizRoutes);

// Wallet / Economy routes
app.use('/api/wallet', walletRoutes);

// Shop & Inventory routes
app.use('/api/shop', shopRoutes);

// Achievement routes
app.use('/api/achievements', achievementRoutes);

// Study plan routes (generate uses AI rate limiter)
app.use('/api/study-plans', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/generate') {
    return aiLimiter(req, res, next);
  }
  next();
}, studyPlanRoutes);

// Mentor routes
app.use('/api/mentor', mentorRoutes);

// Personalization & AI Learning routes
app.use('/api/learning', learningRoutes);

// Adaptive Learning & Intelligence Engine routes
app.use('/api/adaptive', adaptiveRoutes);

// Admin, Moderation & Operations routes
app.use('/api/admin', adminRoutes);

// AI Content Engine & Course Builder (Admin Only)
app.use('/api/admin/content', adminContentRoutes);

// Study session routes
app.use('/api/study-sessions', studySessionRoutes);

// Progress routes
app.use('/api/progress', progressRoutes);

// Knowledge routes
app.use('/api/knowledge', knowledgeRoutes);

// Practice routes (generate uses AI rate limiter)
app.use('/api/practice', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/generate') {
    return aiLimiter(req, res, next);
  }
  next();
}, practiceRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Flashcards routes (with AI rate limit on generation)
app.use('/api/flashcards', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/generate') {
    return aiLimiter(req, res, next);
  }
  next();
}, flashcardRoutes);

// Smart notes & summarizer routes
app.use('/api/smart-notes', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/summarize') {
    return aiLimiter(req, res, next);
  }
  next();
}, smartNoteRoutes);

// Leaderboard routes
app.use('/api/leaderboard', leaderboardRoutes);

// Billing, Subscriptions & Monetization routes
app.use('/api/billing', billingRoutes);

// User Content Reporting routes
app.use('/api/reports', reportRoutes);

// Feature Flags client routes
app.use('/api/feature-flags', featureFlagRoutes);

// --------------- Error handling ---------------

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Route not found',
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
