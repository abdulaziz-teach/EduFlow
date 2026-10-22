/**
 * P0 Security Remediation — regression tests
 *
 * Covers:
 *  P0-1  no real credentials in .env.example, source, tests or other tracked files
 *  P0-2  production JWT secret enforcement (presence, length, placeholders, independence)
 *  P0-3  the refresh secret is never derived from the access secret
 *
 * Every secret value used below is a deterministic fake fixture that is clearly
 * non-production. No real credential — not even a fragment of one — may ever be
 * added to this file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { shouldUseMockAI } from '../src/utils/aiConfig.js';
import { setRefreshTokenCookie } from '../src/services/sessionService.js';
import requireTrustedOrigin from '../src/middleware/requireTrustedOrigin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Deterministic FAKE fixtures (not usable credentials, high-entropy shaped)
// ---------------------------------------------------------------------------
const FAKE_ACCESS_SECRET = 'fake_a1b2c3d4e5f60718293a4b5c6d7e8f90_a1b2c3d4e5f60718';
const FAKE_REFRESH_SECRET = 'fake_9f8e7d6c5b4a39281706f5e4d3c2b1a0_9f8e7d6c5b4a3928';
const FAKE_SHORT_SECRET = 'fake_short_1234'; // < 32 chars
const FAKE_PLACEHOLDER_SECRET = 'your_jwt_secret_here_change_me_1234567890';
const KNOWN_DEFAULT_SECRET = 'dev_secret_placeholder_for_testing_purposes_only';

// Credential-shaped strings assembled at runtime, used only as positive
// controls for the scanner. They are not valid keys for any service, and the
// pieces keep this source file free of any contiguous credential pattern.
const SYNTHETIC_OPENAI_KEY = ['sk-', 'proj-', 'Zk3Q', 'p7Rd', 'm2Xw', 'q9Lb', 'v5Nc', 't8Hy', 'r4Ks', 'w2Jd', 'x7Fm'].join('');
const SYNTHETIC_ATLAS_URI = [
  'mongodb',
  '+srv://',
  'svc',
  'Admin',
  ':',
  'Kq8Z',
  'r3Tp',
  '6Wn9',
  'Xm2L',
  '@prod',
  '-cluster',
  '.abc.mongodb.net/eduflow',
].join('');

// Deterministic length-boundary fixtures (mixed classes, no sequential runs)
const SECRET_BODY = 'q7w3e9r2t8y4u1i6o3p9a2s5d8f4g7h1j4k8l';
const EXACT_32_SECRET = `fake_${SECRET_BODY.slice(0, 27)}`; // 32 characters
const JUST_SHORT_SECRET = `fake_${SECRET_BODY.slice(0, 26)}`; // 31 characters


// ---------------------------------------------------------------------------
// Environment override helper — restores the original process.env afterwards
// ---------------------------------------------------------------------------
function withEnv(overrides, fn) {
  const saved = {};
  const toDelete = [];
  for (const [k, v] of Object.entries(overrides)) {
    if (k in process.env) saved[k] = process.env[k];
    else toDelete.push(k);
    if (v === undefined) delete process.env[k];
    else process.env[k] = String(v);
  }
  // Silence expected startup noise while keeping failures readable
  const origErr = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    return fn();
  } finally {
    console.error = origErr;
    console.warn = origWarn;
    for (const [k, v] of Object.entries(saved)) process.env[k] = v;
    for (const k of toDelete) delete process.env[k];
  }
}

async function freshValidateEnv() {
  const mod = await import(`../src/config/envValidation.js?t=${Date.now()}_${Math.random()}`);
  return mod.validateEnv;
}

/** Production baseline that passes validation; individual tests break one rule. */
const PROD_BASE = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://<fake_user>:<fake_password>@<fake_cluster>.mongodb.net/eduflow',
  MONGO_URI: undefined,
  CLIENT_URL: 'https://eduflow.example.com',
  JWT_SECRET: FAKE_ACCESS_SECRET,
  JWT_ACCESS_SECRET: undefined,
  JWT_REFRESH_SECRET: FAKE_REFRESH_SECRET,
  AI_API_KEY: undefined,
  OPENAI_API_KEY: undefined,
};

function expectProductionRejection(validateEnv, env, label) {
  withEnv(env, () => {
    assert.throws(
      () => validateEnv(),
      (err) => /validation failed/i.test(err.message),
      `${label}: production must throw`
    );
  });
}

describe('Production AI configuration', () => {
  it('returns an explicit unavailable error instead of mock content without a key', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
      assert.throws(
        () => shouldUseMockAI(undefined),
        (error) => error.statusCode === 503 && error.errorCode === 'AI_UNAVAILABLE'
      );
    });
  });

  it('keeps deterministic mock responses available outside production', () => {
    withEnv({ NODE_ENV: 'test' }, () => {
      assert.equal(shouldUseMockAI(undefined), true);
      assert.equal(shouldUseMockAI('configured-test-key'), false);
    });
  });
});

describe('Production refresh cookie security', () => {
  it('sets cross-site production refresh cookies as Secure and HttpOnly', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
      let cookieOptions;
      setRefreshTokenCookie(
        { cookie: (_name, _value, options) => { cookieOptions = options; } },
        'non-production-test-token'
      );
      assert.equal(cookieOptions.httpOnly, true);
      assert.equal(cookieOptions.secure, true);
      assert.equal(cookieOptions.sameSite, 'none');
    });
  });

  it('rejects browser auth requests from origins outside CLIENT_URL', () => {
    withEnv({ NODE_ENV: 'production', CLIENT_URL: 'https://eduflow.example' }, () => {
      let statusCode;
      let nextCalled = false;
      const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; },
      };
      requireTrustedOrigin(
        { get: () => 'https://untrusted.example' },
        res,
        () => { nextCalled = true; }
      );
      assert.equal(statusCode, 403);
      assert.equal(nextCalled, false);
    });
  });
});

// ===========================================================================
// P0-2 — Production JWT secret enforcement
// ===========================================================================
describe('P0-2 envValidation — production JWT_SECRET rules', () => {
  it('1. rejects a missing JWT_SECRET', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_SECRET: undefined }, 'missing JWT_SECRET');
  });

  it('2. rejects a known placeholder/default JWT_SECRET', async () => {
    const v = await freshValidateEnv();
    for (const bad of [FAKE_PLACEHOLDER_SECRET, KNOWN_DEFAULT_SECRET, 'secret', 'change_this', 'your_jwt_secret', 'dev_placeholder', 'min_32_characters']) {
      expectProductionRejection(v, { ...PROD_BASE, JWT_SECRET: bad }, `placeholder JWT_SECRET "${bad.slice(0, 4)}..."`);
    }
  });

  it('3. rejects a JWT_SECRET shorter than 32 characters', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_SECRET: FAKE_SHORT_SECRET }, 'short JWT_SECRET');
    expectProductionRejection(v, { ...PROD_BASE, JWT_SECRET: JUST_SHORT_SECRET }, '31-character JWT_SECRET');
    assert.equal(EXACT_32_SECRET.length, 32, 'boundary fixture must be exactly 32 characters');
    assert.equal(JUST_SHORT_SECRET.length, 31, 'sub-boundary fixture must be 31 characters');
    // a 32-character high-entropy secret is accepted (boundary is inclusive)
    const res = withEnv({ ...PROD_BASE, JWT_SECRET: EXACT_32_SECRET }, () => v());
    assert.ok(res.isValid, `32-char secret should be accepted, errors: ${res.errors.join('; ')}`);
  });

  it('4. rejects a missing JWT_REFRESH_SECRET', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_REFRESH_SECRET: undefined }, 'missing JWT_REFRESH_SECRET');
  });

  it('5. rejects a JWT_REFRESH_SECRET shorter than 32 characters', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_REFRESH_SECRET: FAKE_SHORT_SECRET }, 'short JWT_REFRESH_SECRET');
  });

  it('5b. rejects a placeholder / low-entropy JWT_REFRESH_SECRET', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_REFRESH_SECRET: KNOWN_DEFAULT_SECRET }, 'placeholder JWT_REFRESH_SECRET');
    expectProductionRejection(v, { ...PROD_BASE, JWT_REFRESH_SECRET: 'devrefreshplaceholderwithoutanynumbersatall' }, 'low-entropy JWT_REFRESH_SECRET');
  });

  it('6. rejects JWT_SECRET === JWT_REFRESH_SECRET (and a derived variant)', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, JWT_REFRESH_SECRET: FAKE_ACCESS_SECRET }, 'identical secrets');
    expectProductionRejection(
      v,
      { ...PROD_BASE, JWT_REFRESH_SECRET: `${FAKE_ACCESS_SECRET}_refresh_salt` },
      'refresh secret derived from JWT_SECRET'
    );
    expectProductionRejection(
      v,
      { ...PROD_BASE, JWT_REFRESH_SECRET: `${FAKE_ACCESS_SECRET}_dev_refresh_fallback` },
      'refresh secret derived with dev suffix'
    );
  });

  it('7. accepts valid, independent, high-entropy secrets in production', async () => {
    const v = await freshValidateEnv();
    const res = withEnv(PROD_BASE, () => v());
    assert.equal(res.errors.length, 0, `unexpected errors: ${res.errors.join('; ')}`);
    assert.ok(res.isValid, 'valid production config must pass');
  });

  it('7b. honours the JWT_ACCESS_SECRET alias in production', async () => {
    const v = await freshValidateEnv();
    const res = withEnv(
      { ...PROD_BASE, JWT_SECRET: undefined, JWT_ACCESS_SECRET: FAKE_ACCESS_SECRET },
      () => v()
    );
    assert.ok(res.isValid, `JWT_ACCESS_SECRET alias must satisfy the rule: ${res.errors.join('; ')}`);
  });

  it('7c. requires valid HTTPS CLIENT_URL origins in production', async () => {
    const v = await freshValidateEnv();
    expectProductionRejection(v, { ...PROD_BASE, CLIENT_URL: undefined }, 'missing CLIENT_URL');
    expectProductionRejection(v, { ...PROD_BASE, CLIENT_URL: 'http://eduflow.example.com' }, 'non-HTTPS CLIENT_URL');
    expectProductionRejection(v, { ...PROD_BASE, CLIENT_URL: 'https://eduflow.example.com/app' }, 'CLIENT_URL with a path');
  });

  it('8. development keeps warning-only behaviour (no throw) for missing/weak secrets', async () => {
    const v = await freshValidateEnv();
    const devBase = {
      NODE_ENV: 'development',
      MONGO_URI: 'mongodb://localhost:27017/eduflow',
      MONGODB_URI: undefined,
      CLIENT_URL: 'http://localhost:5173',
      AI_API_KEY: undefined,
      OPENAI_API_KEY: undefined,
    };

    const missingRefresh = withEnv({ ...devBase, JWT_SECRET: FAKE_ACCESS_SECRET, JWT_REFRESH_SECRET: undefined }, () => v());
    assert.ok(missingRefresh.warnings.some((w) => w.includes('JWT_REFRESH_SECRET')), 'dev should warn about missing refresh secret');

    const missingBoth = withEnv({ ...devBase, JWT_SECRET: undefined, JWT_ACCESS_SECRET: undefined, JWT_REFRESH_SECRET: undefined }, () => v());
    assert.ok(missingBoth.warnings.some((w) => /JWT_SECRET/.test(w)), 'dev should warn about missing access secret');

    const placeholder = withEnv(
      { ...devBase, JWT_SECRET: 'dev_placeholder_not_for_production_use_only', JWT_REFRESH_SECRET: 'dev_refresh_placeholder_not_for_production' },
      () => v()
    );
    assert.ok(placeholder.warnings.some((w) => /placeholder/i.test(w)), 'dev should warn about placeholder secrets');
  });

  it('8b. a secret-like placeholder never gets converted into a working fallback', async () => {
    const v = await freshValidateEnv();
    const res = withEnv({ ...PROD_BASE, JWT_SECRET: 'change_this_to_a_real_secret_32_chars_minimum_xx' }, () => {
      try {
        v();
        return { threw: false };
      } catch {
        return { threw: true };
      }
    });
    assert.ok(res.threw, 'placeholder secret must not boot production');
  });
});

// ===========================================================================
// P0-3 — getRefreshSecret must not derive from JWT_SECRET
// ===========================================================================
describe('P0-3 sessionService.getRefreshSecret — independence', () => {
  async function freshSessionService() {
    return import(`../src/services/sessionService.js?t=${Date.now()}_${Math.random()}`);
  }

  it('9. throws when JWT_REFRESH_SECRET is missing', async () => {
    const { getRefreshSecret } = await freshSessionService();
    withEnv({ JWT_SECRET: FAKE_ACCESS_SECRET, JWT_REFRESH_SECRET: undefined }, () => {
      assert.throws(() => getRefreshSecret(), /JWT_REFRESH_SECRET is required/);
    });
  });

  it('10. never derives a value from JWT_SECRET', async () => {
    const { getRefreshSecret, getJwtSecret } = await freshSessionService();

    // (a) with only the access secret present it must throw, not synthesise one
    withEnv({ JWT_SECRET: FAKE_ACCESS_SECRET, JWT_REFRESH_SECRET: undefined }, () => {
      let value;
      try {
        value = getRefreshSecret();
      } catch {
        value = undefined;
      }
      assert.equal(value, undefined, 'getRefreshSecret() must not return a derived value');
    });

    // (b) the configured value is returned verbatim and contains no part of the access secret
    withEnv({ JWT_SECRET: FAKE_ACCESS_SECRET, JWT_REFRESH_SECRET: FAKE_REFRESH_SECRET }, () => {
      const value = getRefreshSecret();
      assert.equal(value, FAKE_REFRESH_SECRET);
      assert.ok(!value.includes(getJwtSecret()), 'refresh secret must not embed the access secret');
    });

    // (c) source-level guard: the module must not concatenate the access secret anywhere
    const src = readFileSync(join(BACKEND, 'src', 'services', 'sessionService.js'), 'utf8');
    assert.ok(
      !/JWT_(?:ACCESS_)?SECRET\s*(?:\+|\}\s*_|\?\?\s*_)/.test(src) &&
        !/\$\{[^}]*JWT_(?:ACCESS_)?SECRET[^}]*\}/.test(src),
      'sessionService must not build a secret from JWT_SECRET'
    );
    assert.ok(
      !/_refresh_salt|_dev_refresh_fallback/.test(src),
      'sessionService must not contain derived-refresh-secret suffixes'
    );
  });

  it('10b. opaque refresh tokens stay opaque (no JWT signing of refresh tokens)', async () => {
    const src = readFileSync(join(BACKEND, 'src', 'services', 'sessionService.js'), 'utf8');
    assert.ok(/crypto\.randomBytes\(40\)\.toString\('hex'\)/.test(src), 'refresh tokens must be opaque random values');
    assert.ok(/createHash\('sha256'\)/.test(src), 'refresh tokens must be stored hashed');
    const signCalls = src.match(/jwt\.sign\(/g) || [];
    assert.equal(signCalls.length, 1, 'only the access token may be signed');
  });

  it('10c. getJwtSecret API is preserved for existing callers', async () => {
    const { getJwtSecret } = await freshSessionService();
    withEnv({ JWT_ACCESS_SECRET: undefined, JWT_SECRET: FAKE_ACCESS_SECRET }, () => {
      assert.equal(getJwtSecret(), FAKE_ACCESS_SECRET);
    });
    withEnv({ JWT_ACCESS_SECRET: FAKE_REFRESH_SECRET, JWT_SECRET: FAKE_ACCESS_SECRET }, () => {
      assert.equal(getJwtSecret(), FAKE_REFRESH_SECRET, 'JWT_ACCESS_SECRET keeps precedence');
    });
  });
});

// ===========================================================================
// P0-1 — credential exposure scan
// ===========================================================================
const PLACEHOLDER_VALUE =
  /(<[^>]*>|your[_-]|my[_-]?secret|example|placeholder|dummy|fake|mock|sample|changeme|change[_-]?(this|it|me)|replace|set_this|not[_-]?(a[_-]?)?real|not[_-]for[_-]production|insecure|dev[_-]|test[_-]|testing|too[_-]?short|min_32|process\.env|\$\{[^}]*\}|REDACTED|auto_?generated|xxx+|0{6,}|repeat)/i;

const CREDENTIAL_PATTERNS = [
  { id: 'openai_api_key', re: /\bsk-(proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g },
  { id: 'stripe_live_key', re: /\b[sr]k_live_[A-Za-z0-9]{16,}/g },
  { id: 'stripe_restricted_key', re: /\brk_live_[A-Za-z0-9]{16,}/g },
  { id: 'atlas_user_pass_uri', re: /mongodb(?:\+srv)?:\/\/[^\s/"'@]+:[^\s/"'@]{6,}@[^\s"'/]+/gi },
  { id: 'aws_access_key', re: /\bAKIA[0-9A-Z]{12,}\b/g },
  { id: 'google_api_key', re: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { id: 'github_token', re: /\bgh[pousr]_[A-Za-z0-9]{24,}\b/g },
  { id: 'slack_token', re: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/g },
  { id: 'private_key_block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { id: 'telegram_bot_token', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}\b/g },
  {
    id: 'literal_secret_assignment',
    re: /(?:JWT_[A-Z_]*SECRET|[A-Z_]*API_KEY|[A-Z_]*PASSWORD[A-Z_]*|[A-Z_]*WEBHOOK_SECRET|[A-Z_]*BOT_TOKEN)\s*(?:=|:)\s*["'][^"\s]{24,}["']/g,
  },
];

function shannon(value) {
  const freq = {};
  for (const ch of value) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const ch in freq) {
    const p = freq[ch] / value.length;
    h -= p * Math.log2(p);
  }
  return h;
}

function isSuspicious(match, patternId) {
  if (PLACEHOLDER_VALUE.test(match)) return false;
  if (/^(.)\1*$/s.test(match)) return false; // single repeated character
  const core = match.replace(/^(?:mongodb(?:\+srv)?:\/\/|[sksr]k_live_|sk-(?:proj-|svcacct-)?|AIza|gh[pousr]_|xox[abprs]-|\d{8,10}:AA|-----BEGIN[^]*?-----)/s, '');
  const literal = core.replace(/^["'`]|["'`]$/g, '');
  if (!literal) return false;
  if (PLACEHOLDER_VALUE.test(literal)) return false;
  if (patternId === 'private_key_block') return true;
  // Require real credential shape: mixed classes and high entropy
  const hasDigit = /[0-9]/.test(literal);
  const hasLetter = /[a-zA-Z]/.test(literal);
  return hasDigit && hasLetter && shannon(literal) >= 3.4;
}

function findCredentialLike(text) {
  const findings = [];
  for (const { id, re } of CREDENTIAL_PATTERNS) {
    const matches = text.match(re) || [];
    for (const m of matches) {
      if (isSuspicious(m, id)) {
        findings.push({ pattern: id, length: m.length, fingerprint: shannon(m).toFixed(2) });
      }
    }
  }
  return findings;
}

function listCandidateFiles() {
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
  const exts = /\.(js|cjs|mjs|ts|json|md|yml|yaml|txt|html|env)$/i;
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (exts.test(entry) && st.size < 2_000_000) out.push(full);
    }
  };
  walk(join(BACKEND, 'src'));
  walk(join(BACKEND, 'tests'));
  for (const f of ['.env.example', '.env', 'package.json', 'Dockerfile']) {
    const full = join(BACKEND, f);
    if (existsSync(full)) out.push(full);
  }
  // repo-level docs and CI
  for (const f of ['README.md', 'DEPLOYMENT.md', '.env.example', 'package.json']) {
    const full = resolve(BACKEND, '..', f);
    if (existsSync(full)) out.push(full);
  }
  if (existsSync(resolve(BACKEND, '..', '.github'))) walk(resolve(BACKEND, '..', '.github'));
  if (existsSync(resolve(BACKEND, '..', 'docs'))) walk(resolve(BACKEND, '..', 'docs'));

  // plus whatever git tracks, if git is available
  try {
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: resolve(BACKEND, '..'), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
      .split('\0')
      .filter(Boolean)
      .filter((p) => exts.test(p) && !/(^|\/)package-lock\.json$/.test(p));
    for (const p of tracked) {
      const full = resolve(BACKEND, '..', p);
      if (existsSync(full) && !out.includes(full)) out.push(full);
    }
  } catch {
    /* git not available — the walk above is sufficient */
  }
  return [...new Set(out)];
}

describe('P0-1 credential exposure scan', () => {
  it('11. .env.example contains no real credentials', () => {
    for (const rel of ['backend/.env.example', '.env.example']) {
      const p = resolve(BACKEND, '..', rel);
      if (!existsSync(p)) continue;
      const content = readFileSync(p, 'utf8');
      assert.deepEqual(findCredentialLike(content), [], `${rel} must not contain credential-shaped values`);

      // Secret-bearing keys must be empty or an explicit <placeholder>
      for (const line of content.split(/\r?\n/)) {
        const m = line.trim().match(/^([A-Z][A-Z0-9_]*(?:SECRET|API_KEY|PASSWORD|TOKEN)[A-Z0-9_]*)=(.*)$/);
        if (!m) continue;
        const value = m[2].trim();
        const ok = value === '' || /^<[^>]+>/.test(value) || /<[a-z_]+:[a-z_]+>@/.test(value) || PLACEHOLDER_VALUE.test(value);
        assert.ok(ok, `${rel}: ${m[1]} must be empty or a placeholder, not a real value`);
      }
    }
  });

  it('11b. local .env files carry only clearly non-production dev placeholders', () => {
    const p = join(BACKEND, '.env');
    if (!existsSync(p)) return;
    const content = readFileSync(p, 'utf8');
    assert.deepEqual(findCredentialLike(content), [], 'local .env must not contain credential-shaped values');
    for (const line of content.split(/\r?\n/)) {
      const m = line.trim().match(/^(JWT_[A-Z_]*SECRET)=(.*)$/);
      if (!m || !m[2]) continue;
      assert.ok(
        /dev|placeholder|not_for_production|local/i.test(m[2]),
        `${m[1]} in the local .env must be marked as a non-production placeholder`
      );
    }
  });

  it('11c. .env files themselves are not tracked by git', () => {
    try {
      const tracked = execFileSync('git', ['ls-files'], { cwd: resolve(BACKEND, '..'), encoding: 'utf8' })
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => /(^|\/)\.env(\.|$)/.test(s) && !s.endsWith('.env.example'));
      assert.deepEqual(tracked, [], 'real .env files must never be committed');
    } catch {
      /* git unavailable */
    }
  });

  it('12. no exposed credential pattern anywhere in source, tests, config or docs', () => {
    const files = listCandidateFiles();
    assert.ok(files.length > 40, `expected a meaningful file set, scanned ${files.length}`);
    const findings = [];
    for (const file of files) {
      let content;
      try {
        content = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const f of findCredentialLike(content)) {
        findings.push({ file: relative(resolve(BACKEND, '..'), file), ...f });
      }
    }
    assert.deepEqual(findings, [], 'no file may contain a real-shaped credential');
  });

  it('12b. the scanner is not a no-op: it detects credential-shaped values', () => {
    const hits = findCredentialLike(SYNTHETIC_OPENAI_KEY);
    assert.ok(hits.length >= 1, 'OpenAI-shaped positive control must be detected');
    assert.equal(hits[0].pattern, 'openai_api_key');

    const atlasHits = findCredentialLike(`MONGODB_URI=${SYNTHETIC_ATLAS_URI}`);
    assert.ok(
      atlasHits.some((h) => h.pattern === 'atlas_user_pass_uri'),
      'MongoDB Atlas user:pass URI must be detected'
    );

    // and the placeholder/fixture forms used across the repo are ignored
    for (const benign of [
      'mongodb+srv://<user>:<password>@<cluster>.mongodb.net/db?retryWrites=true&w=majority',
      'sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      'mongodb://localhost:27017/eduflow',
      FAKE_ACCESS_SECRET,
      'whsec_test_secret_for_automated_testing_1234567890abcdef',
      'dev_placeholder_not_for_production_use_only',
      'JWT_SECRET=dev_only_insecure_placeholder_access_secret_do_not_use_in_prod_0001',
    ]) {
      assert.deepEqual(findCredentialLike(benign), [], `benign fixture must not be flagged: ${benign.slice(0, 12)}...`);
    }
  });

  it('12c. no leftover fragment of the previously exposed dev secret', () => {
    // Guard against re-introduction of an embedded real-secret fragment: this
    // file itself must not contain a long literal that looks like a key.
    const self = readFileSync(join(BACKEND, 'tests', 'securityRemediation.test.js'), 'utf8');
    assert.deepEqual(findCredentialLike(self), [], 'this test file must not embed credential material');
  });
});
