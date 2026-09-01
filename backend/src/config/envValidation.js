/**
 * Production Environment Configuration Validator
 * Validates critical environment variables before server startup.
 */

const KNOWN_PLACEHOLDERS = [
  'your_openai_api_key',
  'change_this',
  'your_jwt_secret',
  'secret',
  'dev_secret',
  'placeholder',
];

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const mongoUri = process.env.MONGO_URI;
  const jwtSecret = process.env.JWT_SECRET;
  const clientUrl = process.env.CLIENT_URL;
  const aiApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  // 1. MONGO_URI validation
  if (!mongoUri) {
    errors.push('MONGO_URI is required.');
  } else if (isProduction) {
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      errors.push('MONGO_URI must point to a production database (e.g. MongoDB Atlas), not localhost.');
    }
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      errors.push('MONGO_URI must be a valid MongoDB connection string.');
    }
  }

  // 2. JWT_SECRET validation
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required.');
  } else {
    const isPlaceholder = KNOWN_PLACEHOLDERS.some((p) => jwtSecret.toLowerCase().includes(p));
    if (isProduction) {
      if (isPlaceholder) {
        errors.push('JWT_SECRET cannot use placeholder or default development secrets in production.');
      }
      if (jwtSecret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long for high entropy in production.');
      }
    } else if (isPlaceholder) {
      warnings.push('JWT_SECRET is using a development placeholder. Remember to provide a high-entropy secret in production.');
    }
  }

  // 3. CLIENT_URL validation
  if (!clientUrl) {
    warnings.push('CLIENT_URL is not set. Defaulting to http://localhost:5173');
  } else if (isProduction) {
    const origins = clientUrl.split(',').map((o) => o.trim());
    const hasLocalhost = origins.some((o) => o.includes('localhost') || o.includes('127.0.0.1'));
    if (hasLocalhost) {
      errors.push('CLIENT_URL in production must not contain localhost or 127.0.0.1.');
    }
  }

  // 4. AI API Key validation
  if (aiApiKey) {
    const isPlaceholder = KNOWN_PLACEHOLDERS.some((p) => aiApiKey.toLowerCase().startsWith(p));
    if (isProduction && isPlaceholder) {
      errors.push('AI_API_KEY / OPENAI_API_KEY cannot be a placeholder in production.');
    }
  }

  // Output warnings
  if (warnings.length > 0 && !isProduction) {
    warnings.forEach((w) => console.warn(`[ENV WARNING] ${w}`));
  }

  // Handle production errors
  if (errors.length > 0) {
    console.error('\n❌ CRITICAL: Environment configuration validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    console.error('');

    if (isProduction) {
      throw new Error(`Production environment validation failed with ${errors.length} error(s).`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export default validateEnv;
