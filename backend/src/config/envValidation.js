/**
 * Production Environment Configuration Validator
 * Validates critical environment variables before server startup.
 *
 * P0 Security Remediation:
 * - JWT_SECRET: mandatory in production, minimum 32 chars, rejects known placeholders
 * - JWT_REFRESH_SECRET: mandatory in production, must differ from JWT_SECRET
 * - Derived refresh-secret fallback is no longer accepted in production
 */

const MIN_SECRET_LENGTH = 32;

/**
 * Exact known development / documentation / default placeholder values.
 * Matched case-insensitively against the whole value (after trimming quotes).
 */
const KNOWN_PLACEHOLDER_VALUES = new Set([
  'secret',
  'secrets',
  'password',
  'changeme',
  'change_me',
  'change_this',
  'changeit',
  'replace_me',
  'replace_this',
  'set_this',
  'your_secret',
  'your_jwt_secret',
  'your_jwt',
  'your_openai_api_key',
  'jwt_secret',
  'access_secret',
  'refresh_secret',
  'dev_secret',
  'dev_placeholder',
  'development_secret',
  'min_32_characters',
  'please_change',
  'not_set',
  'none',
  'null',
  'undefined',
  'todo',
  'tbd',
  'xxxx',
  'placeholder',
  'example',
  'sample',
  'dummy',
]);

/**
 * Unambiguous weakness markers. Kept deliberately narrow so that a genuine
 * high-entropy secret that merely *mentions* a word is not rejected, while
 * obvious template values always are.
 */
const KNOWN_PLACEHOLDER_PATTERNS = [
  /^["']?(your|my|the)[_-]/i,
  /^["']?(change|replace|set|fill|insert|put)[_-]?(it|this|that|me|here)/i,
  /^["']?(dev|development|local|default)[_-]?(secret|key|token|jwt|placeholder)/i,
  /placeholder/i,
  /not[_-]?a[_-]?real/i,
  /not[_-]?for[_-]?production/i,
  /^["']?dummy/i,
  /^["']?sample/i,
  /^["']?example/i,
  /foobar/i,
  /abc123/i,
  /qwerty/i,
  /^\s*<[^>]*>\s*$/,
  /^\s*$/,
];

/** Values that look like a secret but carry almost no entropy. */
function isLowEntropy(value) {
  const v = String(value).trim().replace(/^["']|["']$/g, '');
  if (!v) return true;
  if (/^(.)\1*$/s.test(v)) return true; // single repeated character
  if (/abcdefghijklmnopqrstuvwxyz|zyxwvutsrqponmlkjihgfedcba|0123456789/i.test(v)) return true;
  // Only lowercase letters and separators — typical hand-typed template value,
  // never produced by a secure generator (hex/base64 always contains digits or case mix).
  if (/^[a-z_.:-]+$/i.test(v) && !/[0-9]/.test(v) && !/[A-Z]/.test(v)) return true;
  return false;
}

/**
 * Whether a secret value is a known development/default placeholder.
 */
export function isKnownPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const raw = String(value).trim();
  if (!raw) return true;
  const unquoted = raw.replace(/^["']|["']$/g, '');
  if (KNOWN_PLACEHOLDER_VALUES.has(unquoted.toLowerCase())) return true;
  return KNOWN_PLACEHOLDER_PATTERNS.some((re) => re.test(raw));
}

/**
 * Shared JWT secret assessment used for both access and refresh secrets.
 * Returns the list of production-blocking errors and dev warnings.
 */
function assessSecret(label, value, { isProduction }) {
  const errors = [];
  const warnings = [];

  if (!value) {
    if (isProduction) {
      errors.push(`${label} is required in production.`);
    } else {
      warnings.push(`${label} is not set. A real value is required in production.`);
    }
    return { errors, warnings };
  }

  if (isKnownPlaceholder(value)) {
    if (isProduction) {
      errors.push(`${label} cannot be a known placeholder or default development secret.`);
    } else {
      warnings.push(`${label} is a placeholder value. Replace it with a high-entropy secret before deploying.`);
    }
  }

  if (String(value).trim().length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      errors.push(`${label} must be at least ${MIN_SECRET_LENGTH} characters long.`);
    } else {
      warnings.push(`${label} is shorter than ${MIN_SECRET_LENGTH} characters.`);
    }
  }

  if (isProduction && isLowEntropy(value) && !isKnownPlaceholder(value)) {
    errors.push(`${label} does not look like a high-entropy secret. Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`);
  }

  return { errors, warnings };
}

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URL ||
    process.env.MONGO_PRIVATE_URL;
  const jwtSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  const clientUrl = process.env.CLIENT_URL;
  const aiApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  // 1. MONGO_URI / MONGODB_URI / MONGO_URL validation
  if (!mongoUri) {
    if (isProduction && process.env.ALLOW_IN_MEMORY_DB !== 'true') {
      errors.push('MONGODB_URI (or MONGO_URL) is required.');
    } else {
      warnings.push('MONGODB_URI is not set. In-memory database will be used as fallback.');
    }
  } else if (isProduction) {
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      errors.push('MONGODB_URI must point to a production database (e.g. MongoDB Atlas or Railway MongoDB), not localhost.');
    }
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      errors.push('MONGODB_URI must be a valid MongoDB connection string.');
    }
    // Production multi-document operations require transactions, which require a Replica Set (Atlas mongodb+srv:// or replicaSet param)
    if (!mongoUri.startsWith('mongodb+srv://') && !mongoUri.includes('replicaSet=')) {
      warnings.push(
        'MONGODB_URI does not appear to use mongodb+srv:// or specify replicaSet. Ensure MongoDB deployment supports multi-document transactions in production.'
      );
    }
  }

  // 2. JWT access secret — must exist, be long enough, never a placeholder (P0-2)
  const access = assessSecret('JWT_SECRET / JWT_ACCESS_SECRET', jwtSecret, { isProduction });
  errors.push(...access.errors);
  warnings.push(...access.warnings);

  // 3. JWT_REFRESH_SECRET — mandatory, independent, never derived from JWT_SECRET (P0-2 / P0-3)
  const refresh = assessSecret('JWT_REFRESH_SECRET', refreshSecret, { isProduction });
  errors.push(...refresh.errors);
  warnings.push(...refresh.warnings);

  // 3b. The two secrets must be different values. A refresh secret derived from the
  // access secret (e.g. `${JWT_SECRET}_refresh_salt`) is treated as identical.
  if (jwtSecret && refreshSecret) {
    const derived =
      refreshSecret === jwtSecret ||
      refreshSecret.startsWith(jwtSecret) ||
      jwtSecret.startsWith(refreshSecret);
    if (derived) {
      if (isProduction) {
        errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different independent secrets (deriving one from the other is not allowed).');
      } else {
        warnings.push('JWT_SECRET and JWT_REFRESH_SECRET should be different independent secrets.');
      }
    }
  }

  // 4. CLIENT_URL validation
  if (!clientUrl) {
    if (isProduction) {
      errors.push('CLIENT_URL is required in production.');
    } else {
      warnings.push('CLIENT_URL is not set. Defaulting to http://localhost:5173');
    }
  } else if (isProduction) {
    const origins = clientUrl.split(',').map((o) => o.trim());
    const hasLocalhost = origins.some((o) => o.includes('localhost') || o.includes('127.0.0.1'));
    if (hasLocalhost) {
      errors.push('CLIENT_URL in production must not contain localhost or 127.0.0.1.');
    }
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (parsed.protocol !== 'https:') {
          errors.push('CLIENT_URL in production must use HTTPS origins.');
          break;
        }
        if (parsed.pathname && parsed.pathname !== '/') {
          warnings.push(`CLIENT_URL contains path '${parsed.pathname}'. CORS origin will match base origin '${parsed.origin}'.`);
        }
      } catch {
        errors.push('CLIENT_URL in production must contain valid HTTPS origins.');
        break;
      }
    }
  }

  // 5. AI API Key validation (never a placeholder; never commit a real key)
  if (aiApiKey) {
    if (isKnownPlaceholder(aiApiKey)) {
      if (isProduction) {
        errors.push('AI_API_KEY / OPENAI_API_KEY is a placeholder value and cannot be used in production.');
      } else {
        warnings.push('AI_API_KEY / OPENAI_API_KEY is a placeholder value; AI calls will be skipped.');
      }
    }
  } else if (isProduction) {
    warnings.push('AI_API_KEY is not set — AI-powered features stay disabled.');
  }

  // Output non-fatal warnings in every environment
  if (warnings.length > 0) {
    warnings.forEach((w) => console.warn(`[ENV WARNING] ${w}`));
  }

  // Handle errors: fatal in production, loud in development
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
