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
  } else if (body.name.trim().length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
    errors.push('Email is required');
  } else if (body.email.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
    errors.push('Please provide a valid email address');
  }

  if (!body.password || typeof body.password !== 'string') {
    errors.push('Password is required');
  } else if (body.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (body.password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (body.preferredLanguage !== undefined &&
      !['en', 'ru', 'uz'].includes(body.preferredLanguage)) {
    errors.push('Preferred language must be en, ru, or uz');
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

  if (body.age !== undefined &&
      body.age !== null &&
      (!Number.isInteger(body.age) || body.age < 5 || body.age > 100)) {
    errors.push('Age must be a whole number between 5 and 100');
  }

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

  if (body.weakTopics !== undefined && !isStringList(body.weakTopics, 20, 100)) {
    errors.push('Weak topics must be a list of up to 20 strings, each no longer than 100 characters');
  }

  if (body.preferredLanguage !== undefined && !['en', 'ru', 'uz'].includes(body.preferredLanguage)) {
    errors.push('Preferred language must be en, ru, or uz');
  }

  if (body.studySchedule !== undefined && !isValidSchedule(body.studySchedule)) {
    errors.push('Study schedule contains invalid preferred days or time');
  }

  return errors;
};

const VALID_GOALS = ['exam', 'grades', 'learn', 'habit'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'revision'];
const VALID_STYLES = ['practice', 'theory', 'flashcards', 'mixed'];
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const VALID_TIMES = ['morning', 'afternoon', 'evening', 'anytime'];
const VALID_LANGUAGES = ['en', 'ru', 'uz'];

function isStringList(value, maxItems, maxLength) {
  return Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.trim().length <= maxLength);
}

function isValidSchedule(value) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value.preferredDays === undefined ||
      (Array.isArray(value.preferredDays) &&
        value.preferredDays.length <= 7 &&
        value.preferredDays.every((day) => VALID_DAYS.includes(day)))) &&
    (value.preferredTime === undefined || VALID_TIMES.includes(value.preferredTime));
}

export const validateOnboardingDraft = (body) => {
  const errors = [];
  if (body.step !== undefined && (!Number.isInteger(body.step) || body.step < 0 || body.step > 7)) {
    errors.push('Onboarding step must be between 0 and 7');
  }
  if (body.age !== undefined && body.age !== null &&
      (!Number.isInteger(body.age) || body.age < 5 || body.age > 100)) {
    errors.push('Age must be a whole number between 5 and 100');
  }
  if (body.goalType !== undefined && body.goalType !== '' && !VALID_GOALS.includes(body.goalType)) {
    errors.push('Learning goal is invalid');
  }
  if (body.goalDescription !== undefined &&
      (typeof body.goalDescription !== 'string' || body.goalDescription.length > 200)) {
    errors.push('Goal description must be no longer than 200 characters');
  }
  for (const field of ['subjects', 'weakTopics', 'preferredDays']) {
    if (body[field] !== undefined && !isStringList(body[field], field === 'preferredDays' ? 7 : 20, 100)) {
      errors.push(`${field} must be a valid list of strings`);
    }
  }
  if (body.preferredDays?.some((day) => !VALID_DAYS.includes(day))) {
    errors.push('Preferred study days are invalid');
  }
  if (body.level !== undefined && !VALID_LEVELS.includes(body.level)) errors.push('Knowledge level is invalid');
  if (body.learningStyle !== undefined && !VALID_STYLES.includes(body.learningStyle)) {
    errors.push('Learning style is invalid');
  }
  if (body.dailyStudyMinutes !== undefined &&
      body.dailyStudyMinutes !== null &&
      (!Number.isInteger(body.dailyStudyMinutes) || body.dailyStudyMinutes < 5 || body.dailyStudyMinutes > 720)) {
    errors.push('Daily study time must be between 5 and 720 minutes');
  }
  if (body.targetDate !== undefined &&
      body.targetDate !== '' &&
      (typeof body.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.targetDate) ||
        Number.isNaN(Date.parse(`${body.targetDate}T00:00:00.000Z`)) ||
        new Date(`${body.targetDate}T00:00:00.000Z`).toISOString().slice(0, 10) !== body.targetDate)) {
    errors.push('Target date must be a valid calendar date');
  }
  if (body.preferredTime !== undefined && !VALID_TIMES.includes(body.preferredTime)) {
    errors.push('Preferred study time is invalid');
  }
  if (body.preferredLanguage !== undefined && !VALID_LANGUAGES.includes(body.preferredLanguage)) {
    errors.push('Preferred language must be en, ru, or uz');
  }
  return errors;
};

export const validateOnboarding = (body) => {
  const errors = validateOnboardingDraft(body);
  if (!Number.isInteger(body.age) || body.age < 5 || body.age > 100) {
    errors.push('Enter an age between 5 and 100');
  }
  if (!VALID_GOALS.includes(body.goalType)) errors.push('Select a learning goal');
  if (!isStringList(body.subjects, 10, 100) || body.subjects.length === 0) {
    errors.push('Select at least one subject');
  }
  if (!VALID_LEVELS.includes(body.level)) errors.push('Select your knowledge level');
  if (!Number.isInteger(body.dailyStudyMinutes) || body.dailyStudyMinutes < 5 || body.dailyStudyMinutes > 720) {
    errors.push('Select a valid daily study time');
  }
  if (!Array.isArray(body.preferredDays) || body.preferredDays.length === 0) {
    errors.push('Select at least one preferred study day');
  }
  if (!VALID_TIMES.includes(body.preferredTime)) errors.push('Select your preferred study time');
  if (!VALID_LANGUAGES.includes(body.preferredLanguage)) errors.push('Select your preferred language');
  return errors;
};

export default validate;
