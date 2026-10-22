import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for AI Mentor Chat requests
 */
export const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 messages per 15 minutes per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests to the AI Mentor. Please wait a few minutes before asking more questions.',
  },
});

/**
 * Rate limiter for AI Quiz Generation requests (expensive operation)
 */
export const aiQuizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 quiz generations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Quiz generation limit reached. Please wait before generating more practice quizzes.',
  },
});

export default {
  aiChatLimiter,
  aiQuizLimiter,
};
