import mongoose from 'mongoose';
import RateLimitBucket from '../models/RateLimitBucket.js';

// Local in-memory fallback store if database is unreachable
const memoryFallback = new Map();

/**
 * Creates a horizontally scalable, MongoDB-backed distributed rate limiter.
 *
 * @param {Object} options
 * @param {number} options.windowMs Window duration in milliseconds (default 15 mins)
 * @param {number} options.max Maximum requests permitted per window (default 100)
 * @param {string} options.prefix Prefix namespace for rate limit keys (default 'rl')
 * @param {Function} options.keyGenerator Key generator function (default: IP)
 * @param {string|Object} options.message Error message or payload returned on 429
 * @param {Function} options.skip Predicate function to skip rate limiting
 */
export function distributedRateLimit({
  windowMs = 15 * 60 * 1000,
  max = 100,
  prefix = 'rl',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip',
  message = 'Too many requests, please try again later.',
  skip = () => false,
} = {}) {
  return async (req, res, next) => {
    if (skip(req)) return next();

    const clientKey = keyGenerator(req);
    const bucketKey = `${prefix}:${clientKey}`;
    const now = new Date();

    // 1. If MongoDB is not connected, use memory fallback
    if (mongoose.connection.readyState !== 1) {
      const entry = memoryFallback.get(bucketKey);
      if (!entry || entry.resetAt <= now.getTime()) {
        memoryFallback.set(bucketKey, { hits: 1, resetAt: now.getTime() + windowMs });
        return next();
      }

      entry.hits++;
      if (entry.hits > max) {
        const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now.getTime()) / 1000));
        res.setHeader('Retry-After', retryAfterSec);
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: typeof message === 'string' ? message : message.message || 'Rate limit exceeded',
        });
      }
      return next();
    }

    try {
      // 2. Try incrementing existing active bucket
      let bucket = await RateLimitBucket.findOneAndUpdate(
        { _id: bucketKey, resetAt: { $gt: now } },
        { $inc: { hits: 1 } },
        { returnDocument: 'after' }
      );

      // 3. If no active bucket exists, initialize new bucket atomically
      if (!bucket) {
        const resetAt = new Date(Date.now() + windowMs);
        try {
          bucket = await RateLimitBucket.create({
            _id: bucketKey,
            hits: 1,
            resetAt,
          });
        } catch (dupErr) {
          // If concurrent request inserted simultaneously, increment
          if (dupErr.code === 11000) {
            bucket = await RateLimitBucket.findOneAndUpdate(
              { _id: bucketKey },
              { $inc: { hits: 1 } },
              { returnDocument: 'after' }
            );
          } else {
            throw dupErr;
          }
        }
      }

      const remaining = Math.max(0, max - bucket.hits);
      const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000));

      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', remaining);
      res.setHeader('RateLimit-Reset', resetSeconds);

      if (bucket.hits > max) {
        res.setHeader('Retry-After', resetSeconds);
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message: typeof message === 'string' ? message : message.message || 'Rate limit exceeded',
        });
      }

      return next();
    } catch (err) {
      console.warn(`[DistributedRateLimiter] Database error, falling back to bypass: ${err.message}`);
      return next();
    }
  };
}

export default distributedRateLimit;
