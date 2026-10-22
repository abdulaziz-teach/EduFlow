const DEVELOPMENT_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export default function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();

  const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (
    allowedOrigins.includes(origin) ||
    (process.env.NODE_ENV !== 'production' && DEVELOPMENT_ORIGIN_PATTERN.test(origin))
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'UNTRUSTED_ORIGIN',
    message: 'Request origin is not allowed.',
  });
}
