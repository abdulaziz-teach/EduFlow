import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import errorHandler from './middleware/errorMiddleware.js';

const app = express();

// Trust first proxy hop when deployed behind reverse proxies (Render, Railway, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// --------------- Security middleware ---------------

// Set security HTTP headers
app.use(helmet());

// CORS — only allow configured client origins (comma-separated for multi-port dev)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman, mobile apps, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

// Parse JSON with a reasonable size limit
app.use(express.json({ limit: '1mb' }));

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

// --------------- Routes ---------------

// Health check with safe database connectivity status
app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    status: 'ok',
    database: dbStatus,
  });
});

// Auth routes (with rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// User routes
app.use('/api/users', userRoutes);

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

// Study plan routes (generate uses AI rate limiter)
app.use('/api/study-plans', (req, res, next) => {
  // Apply AI rate limiter only to the generate endpoint
  if (req.method === 'POST' && req.path === '/generate') {
    return aiLimiter(req, res, next);
  }
  next();
}, studyPlanRoutes);

// Mentor routes
app.use('/api/mentor', mentorRoutes);

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
