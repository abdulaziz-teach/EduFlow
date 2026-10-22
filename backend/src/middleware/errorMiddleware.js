/**
 * Centralized error-handling middleware.
 *
 * Handles known error types (Mongoose validation, duplicate keys, cast errors,
 * JWT errors) and falls back to a generic 500 for anything unexpected.
 * Stack traces and sensitive internal details are only included in development responses.
 */
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages[0] || 'Validation failed';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    message = field === 'email'
      ? 'An account with this email already exists'
      : `Duplicate value for ${field}`;
  }

  // Mongoose CastError (bad ObjectId, invalid type/format)
  if (err.name === 'CastError') {
    statusCode = 400;
    if (err.kind === 'ObjectId') {
      errorCode = 'INVALID_ID';
      message = 'Invalid resource ID format';
    } else {
      errorCode = 'INVALID_FORMAT';
      message = `Invalid format for parameter: ${err.path || 'field'}`;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Not authorized — invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Not authorized — token expired';
  }

  // Handle CORS blocked requests
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    errorCode = 'CORS_ERROR';
    message = 'Not allowed by CORS';
  }

  // Sanitize 500 errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred. Please try again later.';
  }

  const response = {
    success: false,
    error: errorCode,
    message,
    requestId: req.id || undefined,
  };

  // Include stack trace in development only
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
