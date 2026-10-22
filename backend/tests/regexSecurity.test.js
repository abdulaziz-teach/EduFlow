import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import AuditLog from '../src/models/AuditLog.js';
import { generateAccessToken } from '../src/services/sessionService.js';
import {
  escapeRegex,
  isSearchLengthValid,
  createLiteralRegex,
  MAX_SEARCH_LENGTH,
} from '../src/utils/regexHelper.js';

let server;
let baseUrl;
let adminUser;
let adminToken;

const apiRequest = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON
  }

  return { status: res.status, ok: res.ok, data };
};

describe('🔒 ReDoS and Dynamic RegExp Security Test Suite', () => {
  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create an admin user for authenticated requests
    await User.deleteMany({ email: 'regex_admin@eduflow.internal' });
    adminUser = await User.create({
      name: 'Regex Admin',
      displayName: 'Regex Security Admin',
      email: 'regex_admin@eduflow.internal',
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // Create test user with metacharacters in name to test literal matching
    await User.deleteMany({ email: 'metachar_user@eduflow.internal' });
    await User.create({
      name: 'Test [Special] User+Plus',
      displayName: 'Test [Special] User+Plus',
      email: 'metachar_user@eduflow.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
    });

    // Create test course with metacharacters
    await Course.deleteMany({
      slug: { $in: ['special-course-test', 'modern-fullstack-course', 'literal-metachar-course'] },
    });
    await Course.create({
      title: 'Learn C++ & Node.js (2026)',
      slug: 'special-course-test',
      description: 'Special metacharacter course for regex safety testing',
      category: 'Development',
      level: 'beginner',
      status: 'published',
      instructorId: adminUser._id,
      tags: ['c++', 'node.js', 'backend'],
    });

    await Course.create({
      title: 'Modern Full-Stack Web Development',
      slug: 'modern-fullstack-course',
      description: 'Master frontend, backend, and cloud architectures',
      category: 'Development',
      level: 'intermediate',
      status: 'published',
      instructorId: adminUser._id,
      tags: ['web', 'javascript', 'react', 'node', 'full-stack'],
    });

    await Course.create({
      title: 'Course with [test] & ^test$ and foo|bar',
      slug: 'literal-metachar-course',
      description: 'Description containing .* and (a+)+ pattern',
      category: 'Development',
      level: 'advanced',
      status: 'published',
      instructorId: adminUser._id,
      tags: ['hyphenated-tag', 'test-tag'],
    });

    // Create test audit log with metacharacters
    await AuditLog.create({
      actorId: adminUser._id,
      actorRole: 'admin',
      action: 'admin.settings[update]+v1',
      resourceType: 'system',
      resourceId: 'sys-123',
    });
  });

  after(async () => {
    await User.deleteMany({ email: /regex_admin|metachar_user/ });
    await Course.deleteMany({
      slug: { $in: ['special-course-test', 'modern-fullstack-course', 'literal-metachar-course'] },
    });
    await AuditLog.deleteMany({ action: 'admin.settings[update]+v1' });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ==========================================
  // SECTION 1: UNIT TESTS FOR regexHelper.js
  // ==========================================
  describe('1. Centralized regexHelper Unit Verification', () => {
    const METACHARS = ['.', '*', '+', '?', '^', '$', '(', ')', '[', ']', '{', '}', '|', '\\'];

    it('escapes every single standard regex metacharacter individually without SyntaxError', () => {
      for (const char of METACHARS) {
        const escaped = escapeRegex(char);
        assert.equal(escaped, `\\${char}`, `Failed escaping metacharacter: ${char}`);

        // Must construct a valid RegExp without throwing SyntaxError
        assert.doesNotThrow(() => {
          const rx = new RegExp(escaped, 'i');
          assert.equal(rx.test(char), true, `Regex should match literal character: ${char}`);
          assert.equal(rx.test('other'), false, `Regex should not match random character`);
        });
      }
    });

    it('ensures "a+b" matches literal "a+b" and does NOT match regex-expanded "aaab"', () => {
      const rx = createLiteralRegex('a+b');
      assert.ok(rx !== null);
      assert.equal(rx.test('a+b'), true, 'Must match literal "a+b"');
      assert.equal(rx.test('aaab'), false, 'Must NOT match regex quantifier "aaab"');
      assert.equal(rx.test('ab'), false, 'Must NOT match "ab"');
    });

    it('ensures "[abc]" matches literal "[abc]" and does NOT match "a", "b", or "c"', () => {
      const rx = createLiteralRegex('[abc]');
      assert.ok(rx !== null);
      assert.equal(rx.test('[abc]'), true, 'Must match literal "[abc]"');
      assert.equal(rx.test('a'), false, 'Must NOT match character class member "a"');
      assert.equal(rx.test('b'), false, 'Must NOT match character class member "b"');
      assert.equal(rx.test('c'), false, 'Must NOT match character class member "c"');
    });

    it('ensures single unclosed parenthesis "(" does not throw SyntaxError and matches literal "("', () => {
      assert.doesNotThrow(() => {
        const rx = createLiteralRegex('(');
        assert.ok(rx !== null);
        assert.equal(rx.test('('), true);
        assert.equal(rx.test('x'), false);
      });
    });

    it('ensures single backslash "\\" does not produce an invalid regex', () => {
      assert.doesNotThrow(() => {
        const rx = createLiteralRegex('\\');
        assert.ok(rx !== null);
        assert.equal(rx.test('\\'), true);
        assert.equal(rx.test('n'), false);
      });
    });

    it('preserves case-insensitive behavior by default', () => {
      const rx = createLiteralRegex('EduFlow');
      assert.ok(rx !== null);
      assert.equal(rx.test('eduflow'), true);
      assert.equal(rx.test('EDUFLOW'), true);
      assert.equal(rx.test('EduFlow'), true);
      assert.equal(rx.test('other'), false);
    });

    it('validates search length boundaries correctly', () => {
      assert.equal(isSearchLengthValid('short'), true);
      assert.equal(isSearchLengthValid('a'.repeat(MAX_SEARCH_LENGTH)), true);
      assert.equal(isSearchLengthValid('a'.repeat(MAX_SEARCH_LENGTH + 1)), false);
      assert.equal(isSearchLengthValid(null), true);
      assert.equal(isSearchLengthValid(undefined), true);
    });
  });

  // ==========================================
  // SECTION 2: ENDPOINT & HTTP REGRESSION TESTS
  // ==========================================
  describe('2. HTTP Endpoints ReDoS & Malformed Input Safety', () => {
    // --- Normal Literal Searches ---
    it('GET /api/admin/users handles normal searches successfully', async () => {
      const res = await apiRequest('/api/admin/users?search=Regex Admin', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.users));
      const found = res.data.data.users.some((u) => u.email === 'regex_admin@eduflow.internal');
      assert.equal(found, true);
    });

    it('GET /api/admin/content handles normal searches successfully', async () => {
      const res = await apiRequest('/api/admin/content?search=Learn C++', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.items));
      const found = res.data.data.items.some((c) => c.slug === 'special-course-test');
      assert.equal(found, true);
    });

    it('GET /api/admin/audit-logs handles normal action filters successfully', async () => {
      const res = await apiRequest('/api/admin/audit-logs?action=admin.settings', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.logs));
    });

    // --- Metacharacter Literal Matching ---
    it('GET /api/admin/users: searches with "[" or "[Special]" match literally without 500 error', async () => {
      const res = await apiRequest('/api/admin/users?search=[Special]', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const found = res.data.data.users.some((u) => u.email === 'metachar_user@eduflow.internal');
      assert.equal(found, true, 'Should find user with literal "[Special]" in name');
    });

    it('GET /api/admin/users: raw unbalanced brackets "[" do not crash with SyntaxError', async () => {
      const res = await apiRequest('/api/admin/users?search=[', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/users: raw backslash "\\" does not crash with SyntaxError', async () => {
      const res = await apiRequest('/api/admin/users?search=\\', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/content: raw parentheses and plus "C++ & Node.js (" do not crash with SyntaxError', async () => {
      const query = encodeURIComponent('C++ & Node.js (');
      const res = await apiRequest(`/api/admin/content?search=${query}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const found = res.data.data.items.some((c) => c.slug === 'special-course-test');
      assert.equal(found, true, 'Should find course with literal "C++ & Node.js ("');
    });

    it('GET /api/admin/content: raw unbalanced bracket "[" does not crash with SyntaxError', async () => {
      const res = await apiRequest('/api/admin/content?search=[', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/audit-logs: raw metacharacters in action parameter do not crash', async () => {
      const query = encodeURIComponent('[update]+v1');
      const res = await apiRequest(`/api/admin/audit-logs?action=${query}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.logs));
      const found = res.data.data.logs.some((l) => l.action === 'admin.settings[update]+v1');
      assert.equal(found, true, 'Should find audit log with literal "[update]+v1"');
    });

    // --- Catastrophic Backtracking / ReDoS Payloads ---
    it('GET /api/admin/users: nested quantifier ReDoS pattern is treated as literal text and does not hang', async () => {
      const payload = encodeURIComponent('((((((a+)+)+)+)+)+!');
      const startTime = Date.now();
      const res = await apiRequest(`/api/admin/users?search=${payload}`, { token: adminToken });
      const elapsed = Date.now() - startTime;

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      // Verify the event loop was not locked up: normal completion
      assert.ok(elapsed < 2000, `Request took too long (${elapsed}ms), possible event loop blocking`);
    });

    it('GET /api/admin/content: nested quantifier pattern does not cause ReDoS', async () => {
      const payload = encodeURIComponent('(x+x+)+y');
      const res = await apiRequest(`/api/admin/content?search=${payload}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/search: nested quantifier pattern in cross-search does not cause ReDoS', async () => {
      const payload = encodeURIComponent('(a+)+$');
      const res = await apiRequest(`/api/admin/search?q=${payload}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/audit-logs: nested quantifier pattern in action does not cause ReDoS', async () => {
      const payload = encodeURIComponent('((((((a+)+)+)+)+)+!');
      const res = await apiRequest(`/api/admin/audit-logs?action=${payload}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    // --- Input Length Validation Tests ---
    it('GET /api/admin/users: rejects query exceeding 100 characters with 400 VALIDATION_ERROR', async () => {
      const oversized = 'a'.repeat(101);
      const res = await apiRequest(`/api/admin/users?search=${oversized}`, { token: adminToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'VALIDATION_ERROR');
    });

    it('GET /api/admin/content: rejects query exceeding 100 characters with 400 VALIDATION_ERROR', async () => {
      const oversized = 'b'.repeat(101);
      const res = await apiRequest(`/api/admin/content?search=${oversized}`, { token: adminToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'VALIDATION_ERROR');
    });

    it('GET /api/admin/audit-logs: rejects action exceeding 100 characters with 400 VALIDATION_ERROR', async () => {
      const oversized = 'c'.repeat(101);
      const res = await apiRequest(`/api/admin/audit-logs?action=${oversized}`, { token: adminToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'VALIDATION_ERROR');
    });

    it('GET /api/admin/search: rejects query exceeding 100 characters with 400 VALIDATION_ERROR', async () => {
      const oversized = 'd'.repeat(101);
      const res = await apiRequest(`/api/admin/search?q=${oversized}`, { token: adminToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'VALIDATION_ERROR');
    });

    // --- Authentication Integrity Guard ---
    it('preserves authentication requirement: unauthenticated requests to search endpoints return 401', async () => {
      const res = await apiRequest('/api/admin/users?search=test');
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });
  });

  // ==========================================
  // SECTION 3: COURSE SEARCH REGRESSION & SEMANTICS
  // ==========================================
  describe('3. Course Search Semantics & Functional Regression Verification', () => {
    // --- Partial Matching in Title ---
    it('partial title match: "Mode" matches "Modern Full-Stack Web Development"', async () => {
      const res = await apiRequest('/api/courses?search=Mode');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true, 'Expected to find Modern Full-Stack course via partial title "Mode"');
    });

    it('partial title match: "develop" matches "Modern Full-Stack Web Development"', async () => {
      const res = await apiRequest('/api/courses?search=develop');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true, 'Expected to find course via partial title "develop"');
    });

    // --- Partial Matching in Description ---
    it('partial description match: "Mas" matches "Master frontend..."', async () => {
      const res = await apiRequest('/api/courses?search=Mas');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true, 'Expected to find course via partial description "Mas"');
    });

    // --- Partial Matching in Tags ---
    it('partial and exact tag matches: "we" and "web" match tag "web"', async () => {
      const resPartial = await apiRequest('/api/courses?search=we');
      assert.equal(resPartial.status, 200);
      const foundPartial = resPartial.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(foundPartial, true, 'Expected to find course via partial tag "we"');

      const resExact = await apiRequest('/api/courses?search=web');
      assert.equal(resExact.status, 200);
      const foundExact = resExact.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(foundExact, true, 'Expected to find course via exact tag "web"');
    });

    it('tag match: "node" matches tag "node"', async () => {
      const res = await apiRequest('/api/courses?search=node');
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true, 'Expected to find course via tag "node"');
    });

    it('tag match: "react" matches tag "react"', async () => {
      const res = await apiRequest('/api/courses?search=react');
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true, 'Expected to find course via tag "react"');
    });

    it('hyphenated tag match: "full-stack" and "full" match "full-stack"', async () => {
      const resHyphen = await apiRequest('/api/courses?search=full-stack');
      assert.equal(resHyphen.status, 200);
      const foundHyphen = resHyphen.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(foundHyphen, true, 'Expected to find course via hyphenated tag "full-stack"');

      const resPartial = await apiRequest('/api/courses?search=full');
      assert.equal(resPartial.status, 200);
      const foundPartial = resPartial.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(foundPartial, true, 'Expected to find course via partial hyphenated tag "full"');
    });

    // --- One-Character Search ---
    it('one-character search: "a" matches across title, description, and tags', async () => {
      const res = await apiRequest('/api/courses?search=a');
      assert.equal(res.status, 200);
      assert.ok(res.data.courses.length > 0, 'One-character search "a" should match courses');
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true);
    });

    it('one-character search: "m" matches title "Modern"', async () => {
      const res = await apiRequest('/api/courses?search=m');
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true);
    });

    it('one-character search: "e" matches across fields', async () => {
      const res = await apiRequest('/api/courses?search=e');
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'modern-fullstack-course');
      assert.equal(found, true);
    });

    // --- Case-Insensitivity ---
    it('case-insensitivity: "React" and "react" return identical course matches', async () => {
      const resUpper = await apiRequest('/api/courses?search=React');
      const resLower = await apiRequest('/api/courses?search=react');

      assert.equal(resUpper.status, 200);
      assert.equal(resLower.status, 200);
      assert.equal(resUpper.data.courses.length, resLower.data.courses.length);
      assert.equal(
        resUpper.data.courses.some((c) => c.slug === 'modern-fullstack-course'),
        resLower.data.courses.some((c) => c.slug === 'modern-fullstack-course')
      );
    });

    // --- Regex Metacharacters as Literal Text ---
    it('literal metacharacter: ".*" does not act as regex wildcard', async () => {
      const query = encodeURIComponent('.*');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      // Should match literal-metachar-course whose description contains literal ".*"
      const found = res.data.courses.some((c) => c.slug === 'literal-metachar-course');
      assert.equal(found, true, 'Should find course with literal ".*" in description');
      // Should NOT match all courses as a wildcard would
      const notWildcard = res.data.courses.every(
        (c) => c.slug === 'literal-metachar-course' || (c.description && c.description.includes('.*'))
      );
      assert.equal(notWildcard, true, 'Must not act as regex wildcard matching everything');
    });

    it('literal metacharacter: "(a+)+" is treated as literal text and does not hang', async () => {
      const query = encodeURIComponent('(a+)+');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'literal-metachar-course');
      assert.equal(found, true, 'Should find course with literal "(a+)+" in description');
    });

    it('literal metacharacter: "^test$" does not anchor regex and matches literal text', async () => {
      const query = encodeURIComponent('^test$');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'literal-metachar-course');
      assert.equal(found, true, 'Should find course with literal "^test$" in title');
    });

    it('literal metacharacter: "[test]" does not act as character class and matches literal text', async () => {
      const query = encodeURIComponent('[test]');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'literal-metachar-course');
      assert.equal(found, true, 'Should find course with literal "[test]" in title');
    });

    it('literal metacharacter: "foo|bar" does not act as regex alternation', async () => {
      const query = encodeURIComponent('foo|bar');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c.slug === 'literal-metachar-course');
      assert.equal(found, true, 'Should find course with literal "foo|bar" in title');
    });

    it('literal metacharacter: trailing backslash "\\" does not crash with SyntaxError', async () => {
      const query = encodeURIComponent('\\');
      const res = await apiRequest(`/api/courses?search=${query}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    // --- Length Boundary ---
    it('length boundary: exactly 100 characters processes safely without crash', async () => {
      const query100 = 'a'.repeat(100);
      const res = await apiRequest(`/api/courses?search=${query100}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('length boundary: 101 characters is ignored safely without error or ReDoS', async () => {
      const query101 = 'a'.repeat(101);
      const res = await apiRequest(`/api/courses?search=${query101}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      // Ignored query returns default list
      assert.ok(Array.isArray(res.data.courses));
    });

    // --- Empty / Whitespace Input ---
    it('empty input: "" and "   " preserve existing unfiltered behavior', async () => {
      const resEmpty = await apiRequest('/api/courses?search=');
      assert.equal(resEmpty.status, 200);
      assert.ok(resEmpty.data.courses.length > 0);

      const resWhitespace = await apiRequest('/api/courses?search=%20%20%20');
      assert.equal(resWhitespace.status, 200);
      assert.equal(resWhitespace.data.courses.length, resEmpty.data.courses.length);
    });
  });
});
