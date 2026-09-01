/**
 * Simple request body validation middleware.
 * Takes a validation function that returns an array of error messages.
 * If there are errors, responds with 400; otherwise continues.
 */
const validate = (validationFn) => {
  return (req, res, next) => {
    const errors = validationFn(req.body);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: errors[0], // Return first error for clarity
        errors,
      });
    }

    next();
  };
};

// --- Validation functions ---

export const validateRegister = (body) => {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('Name is required');
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    errors.push('Email is required');
  } else if (!/^\S+@\S+\.\S+$/.test(body.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  } else if (body.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  return errors;
};

export const validateLogin = (body) => {
  const errors = [];

  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    errors.push('Email is required');
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  }

  return errors;
};

export const validateProfileUpdate = (body) => {
  const errors = [];

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      errors.push('Name must be a non-empty string');
    }
  }

  if (body.subjects !== undefined) {
    if (!Array.isArray(body.subjects)) {
      errors.push('Subjects must be an array');
    } else if (body.subjects.some((s) => typeof s !== 'string')) {
      errors.push('Each subject must be a string');
    }
  }

  if (body.dailyStudyMinutes !== undefined && body.dailyStudyMinutes !== null) {
    if (typeof body.dailyStudyMinutes !== 'number' || body.dailyStudyMinutes < 0) {
      errors.push('Daily study minutes must be a non-negative number');
    }
  }

  if (body.goal !== undefined && body.goal !== null) {
    if (typeof body.goal !== 'object' || Array.isArray(body.goal)) {
      errors.push('Goal must be an object');
    }
  }

  return errors;
};

export default validate;
