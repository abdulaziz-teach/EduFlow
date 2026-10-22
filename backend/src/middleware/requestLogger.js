import crypto from 'crypto';

/**
 * Production-Safe Structured Logging Middleware
 *
 * Attaches unique request ID and logs request metadata upon completion.
 * Never logs sensitive data (passwords, tokens, keys).
 */
export const requestLogger = (req, res, next) => {
  // Extract or generate unique Request ID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    // Only log in production or if requested (skip noisy health probes in tests)
    if (process.env.NODE_ENV === 'test' && req.path.startsWith('/api/health')) {
      return;
    }

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: parseFloat(durationMs.toFixed(2)),
      userAgent: req.headers['user-agent'] || undefined,
    };

    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ ...logEntry, level: 'ERROR' }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ ...logEntry, level: 'WARN' }));
    } else if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ ...logEntry, level: 'INFO' }));
    }
  });

  next();
};

export default requestLogger;
