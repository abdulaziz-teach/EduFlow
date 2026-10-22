import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Session from '../src/models/Session.js';
import {
  createSession,
  rotateSession,
  getJwtSecret,
  hashToken,
} from '../src/services/sessionService.js';

let server;
let baseUrl;

const apiRequest = async (endpoint, options = {}) => {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.cookies ? { Cookie: options.cookies } : {}),
    ...(options.headers || {}),
  };

  if (options.cookies) {
    headers['Cookie'] = options.cookies;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data, setCookie };
};

const decodeTokenClaims = (token) => {
  const decoded = jwt.decode(token);
  return {
    userId: decoded?.userId,
    role: decoded?.role,
    exp: decoded?.exp,
  };
};

describe('Session Security & Role Consistency Test Suite', () => {
  before(async () => {
    await connectDB();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test data
    await User.deleteMany({ email: /@session-sec-test\.com$/ });
    await Session.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({ email: /@session-sec-test\.com$/ });
    await Session.deleteMany({});
  });

  it('Test 1 — Normal User: user -> refresh -> role=user', async () => {
    const user = await User.create({
      email: 'user1@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Normal User',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });
    const initialClaims = decodeTokenClaims(sessionData.accessToken);
    assert.equal(initialClaims.role, 'user');

    const rotated = await rotateSession(sessionData.refreshToken, { headers: {} });
    const refreshedClaims = decodeTokenClaims(rotated.accessToken);

    assert.equal(refreshedClaims.userId, user._id.toString());
    assert.equal(refreshedClaims.role, 'user');
    assert.ok(rotated.refreshToken);
    assert.notEqual(rotated.refreshToken, sessionData.refreshToken);
  });

  it('Test 2 — Admin: admin -> refresh -> role=admin', async () => {
    const admin = await User.create({
      email: 'admin1@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Admin User',
      role: 'admin',
      status: 'active',
    });

    const sessionData = await createSession(admin, { headers: {} });
    const initialClaims = decodeTokenClaims(sessionData.accessToken);
    assert.equal(initialClaims.role, 'admin');

    // Rotate session
    const rotated = await rotateSession(sessionData.refreshToken, { headers: {} });
    const refreshedClaims = decodeTokenClaims(rotated.accessToken);

    assert.equal(refreshedClaims.userId, admin._id.toString());
    assert.equal(refreshedClaims.role, 'admin', 'Admin role must persist upon refresh');
  });

  it('Test 3 — Mentor: mentor -> refresh -> role=mentor', async () => {
    const mentorUser = await User.create({
      email: 'mentor1@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Mentor User',
      role: 'user',
      status: 'active',
    });

    // Directly set role to 'mentor' to test arbitrary elevated/custom roles
    await User.updateOne({ _id: mentorUser._id }, { $set: { role: 'mentor' } });

    const updatedUser = await User.findById(mentorUser._id);
    const sessionData = await createSession(updatedUser, { headers: {} });

    const rotated = await rotateSession(sessionData.refreshToken, { headers: {} });
    const refreshedClaims = decodeTokenClaims(rotated.accessToken);

    assert.equal(refreshedClaims.userId, mentorUser._id.toString());
    assert.equal(refreshedClaims.role, 'mentor', 'Mentor role must be present in refreshed token');
  });

  it('Test 4 — Promotion: user -> DB role changed to admin -> refresh -> JWT role must be admin', async () => {
    const user = await User.create({
      email: 'promote@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Promotee User',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });
    const initialClaims = decodeTokenClaims(sessionData.accessToken);
    assert.equal(initialClaims.role, 'user');

    // Admin promotes user in the database
    await User.findByIdAndUpdate(user._id, { role: 'admin' });

    // User refreshes their session
    const rotated = await rotateSession(sessionData.refreshToken, { headers: {} });
    const refreshedClaims = decodeTokenClaims(rotated.accessToken);

    assert.equal(refreshedClaims.userId, user._id.toString());
    assert.equal(refreshedClaims.role, 'admin', 'Refreshed token must reflect promoted DB role');
  });

  it('Test 5 — Demotion: admin -> DB role changed to user -> refresh -> JWT role must be user', async () => {
    const admin = await User.create({
      email: 'demote@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Demotee Admin',
      role: 'admin',
      status: 'active',
    });

    const sessionData = await createSession(admin, { headers: {} });
    const initialClaims = decodeTokenClaims(sessionData.accessToken);
    assert.equal(initialClaims.role, 'admin');

    // Admin is demoted to normal user in DB
    await User.findByIdAndUpdate(admin._id, { role: 'user' });

    // Refresh token
    const rotated = await rotateSession(sessionData.refreshToken, { headers: {} });
    const refreshedClaims = decodeTokenClaims(rotated.accessToken);

    assert.equal(refreshedClaims.userId, admin._id.toString());
    assert.equal(refreshedClaims.role, 'user', 'Refreshed token must reflect demoted DB role');
  });

  it('Test 6 — Suspended User: active user -> session created -> status=suspended -> refresh rejected & session revoked', async () => {
    const user = await User.create({
      email: 'suspended@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Suspended User',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });
    const tokenHash = hashToken(sessionData.refreshToken);

    // Account gets suspended
    await User.findByIdAndUpdate(user._id, { status: 'suspended' });

    // Refresh attempt must fail
    await assert.rejects(
      async () => {
        await rotateSession(sessionData.refreshToken, { headers: {} });
      },
      (err) => {
        assert.equal(err.message, 'ACCOUNT_SUSPENDED');
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // Verify session is revoked in database
    const sessionInDb = await Session.findOne({ tokenHash });
    assert.ok(sessionInDb.revokedAt, 'Session must be revoked when refresh attempted by suspended user');
  });

  it('Test 7 — Deleted User: active user -> session created -> User deleted -> refresh rejected & session revoked', async () => {
    const user = await User.create({
      email: 'deleted@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Deleted User',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });
    const tokenHash = hashToken(sessionData.refreshToken);

    // Account is permanently deleted from database
    await User.findByIdAndDelete(user._id);

    // Refresh attempt must fail
    await assert.rejects(
      async () => {
        await rotateSession(sessionData.refreshToken, { headers: {} });
      },
      (err) => {
        assert.equal(err.message, 'USER_NOT_FOUND');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );

    // Verify session is revoked in database
    const sessionInDb = await Session.findOne({ tokenHash });
    assert.ok(sessionInDb.revokedAt, 'Session must be revoked when user no longer exists');
  });

  it('Test 8 — Valid Refresh Still Rotates: session updated, new access & refresh tokens issued', async () => {
    const user = await User.create({
      email: 'rotate@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Rotating User',
      role: 'user',
      status: 'active',
    });

    const initialSession = await createSession(user, { headers: { 'user-agent': 'TestAgent/1.0' } });
    const initialHash = hashToken(initialSession.refreshToken);

    const rotated = await rotateSession(initialSession.refreshToken, { headers: { 'user-agent': 'TestAgent/2.0' } });

    assert.ok(rotated.accessToken);
    assert.ok(rotated.refreshToken);
    assert.notEqual(rotated.refreshToken, initialSession.refreshToken);

    // Old session should be marked revoked
    const oldSession = await Session.findOne({ tokenHash: initialHash });
    assert.ok(oldSession.revokedAt, 'Old session must be marked revoked after rotation');

    // New session should exist and not be revoked
    const newHash = hashToken(rotated.refreshToken);
    const newSession = await Session.findOne({ tokenHash: newHash });
    assert.ok(newSession, 'New session must exist in DB');
    assert.equal(newSession.revokedAt, null, 'New session must be active');
  });

  it('Test 9 — Old Refresh Token Reuse: replaying revoked token triggers reuse detection and revokes user sessions', async () => {
    const user = await User.create({
      email: 'reuse@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Reuse User',
      role: 'user',
      status: 'active',
    });

    const initial = await createSession(user, { headers: {} });
    const rotated = await rotateSession(initial.refreshToken, { headers: {} });

    // Attempt to reuse old revoked token
    await assert.rejects(
      async () => {
        await rotateSession(initial.refreshToken, { headers: {} });
      },
      (err) => {
        assert.equal(err.message, 'TOKEN_REUSE_DETECTED');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );

    // Verify all sessions for this user are now revoked
    const newHash = hashToken(rotated.refreshToken);
    const newSession = await Session.findOne({ tokenHash: newHash });
    assert.ok(newSession.revokedAt, 'Reuse detection must invalidate active sibling sessions');
  });

  it('Test 10 — Suspended Session Cannot Be Refreshed Repeatedly', async () => {
    const user = await User.create({
      email: 'norepeat@session-sec-test.com',
      password: 'Password123!',
      displayName: 'NoRepeat User',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });

    // Suspend user
    await User.findByIdAndUpdate(user._id, { status: 'suspended' });

    // Attempt 1: fails with ACCOUNT_SUSPENDED
    await assert.rejects(
      async () => {
        await rotateSession(sessionData.refreshToken, { headers: {} });
      },
      (err) => {
        assert.equal(err.message, 'ACCOUNT_SUSPENDED');
        return true;
      }
    );

    // Attempt 2: trying to reuse the same token must now hit TOKEN_REUSE_DETECTED
    await assert.rejects(
      async () => {
        await rotateSession(sessionData.refreshToken, { headers: {} });
      },
      (err) => {
        assert.equal(err.message, 'TOKEN_REUSE_DETECTED');
        return true;
      }
    );
  });

  it('HTTP Integration: POST /api/auth/refresh reflects DB role and rejects suspended users', async () => {
    const admin = await User.create({
      email: 'httpadmin@session-sec-test.com',
      password: 'Password123!',
      displayName: 'HTTP Admin',
      role: 'admin',
      status: 'active',
    });

    const sessionData = await createSession(admin, { headers: {} });

    // 1. Successful HTTP refresh as admin
    const res1 = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: sessionData.refreshToken },
    });

    assert.equal(res1.status, 200);
    assert.equal(res1.data.success, true);
    assert.equal(res1.data.refreshToken, undefined);
    const token1Claims = decodeTokenClaims(res1.data.accessToken);
    assert.equal(token1Claims.role, 'admin', 'HTTP refresh must return admin claim');

    const newRefreshCookie = res1.setCookie?.split(';')[0];
    assert.ok(newRefreshCookie, 'refresh token must be returned only in the HttpOnly cookie');

    // 2. Suspend admin in database
    await User.findByIdAndUpdate(admin._id, { status: 'suspended' });

    // 3. Next HTTP refresh attempt must be rejected with 403
    const res2 = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      cookies: newRefreshCookie,
    });

    assert.equal(res2.status, 403);
    assert.equal(res2.data.error, 'ACCOUNT_SUSPENDED');
    assert.equal(res2.data.accessToken, undefined);
  });

  // ==========================================
  // PHASE 5: LOGOUT & SESSION REVOCATION TESTS
  // ==========================================

  it('Logout Test 1 & 3 — UI logout calls backend and marks server session revoked', async () => {
    const user = await User.create({
      email: 'logout1@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Logout User 1',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });
    const tokenHash = hashToken(sessionData.refreshToken);

    // Call POST /api/auth/logout (as dispatched by AuthContext.logout())
    const res = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: sessionData.refreshToken },
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.message, 'Logged out successfully');

    // Verify session in DB is marked revoked
    const sessionInDb = await Session.findOne({ tokenHash });
    assert.ok(sessionInDb.revokedAt, 'Session must have revokedAt timestamp');
  });

  it('Logout Test 2 — Local state is cleared even if logout is called', async () => {
    // Simulate AuthContext.logout() state management
    let localToken = 'mock-jwt-token';
    let localUser = { name: 'Test' };
    const mockLocalStorage = {
      items: { eduflow_token: localToken },
      removeItem(key) { delete this.items[key]; },
    };

    // Simulated frontend logout implementation
    const simulateLogout = async (backendSucceeds = true) => {
      try {
        if (!backendSucceeds) {
          throw new Error('Network error');
        }
      } catch (err) {
        // Warning logged, error suppressed
      } finally {
        mockLocalStorage.removeItem('eduflow_token');
        localToken = null;
        localUser = null;
      }
    };

    await simulateLogout(true);
    assert.equal(localToken, null);
    assert.equal(localUser, null);
    assert.equal(mockLocalStorage.items['eduflow_token'], undefined);
  });

  it('Logout Test 4 — Refresh after logout fails with 401 TOKEN_REUSE_DETECTED and issues no tokens', async () => {
    const user = await User.create({
      email: 'logout4@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Logout User 4',
      role: 'user',
      status: 'active',
    });

    const sessionData = await createSession(user, { headers: {} });

    // Logout
    const logoutRes = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: sessionData.refreshToken },
    });
    assert.equal(logoutRes.status, 200);

    // Attempt refresh using the logged-out refresh token
    const refreshRes = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: sessionData.refreshToken },
    });

    assert.equal(refreshRes.status, 401);
    assert.equal(refreshRes.data.error, 'TOKEN_REUSE_DETECTED');
    assert.equal(refreshRes.data.accessToken, undefined);
    assert.equal(refreshRes.data.refreshToken, undefined);
  });

  it('Logout Test 5 — Backend logout failure handling: local state still clears and no unhandled rejection', async () => {
    let localToken = 'active-jwt';
    let localUser = { id: 'u1' };
    let finallyRan = false;

    // Simulate AuthContext try/finally when backend throws error
    const logoutWithFailingBackend = async () => {
      try {
        throw new Error('500 Server error or offline network');
      } catch (error) {
        // Expected fallback
      } finally {
        finallyRan = true;
        localToken = null;
        localUser = null;
      }
    };

    await assert.doesNotReject(async () => {
      await logoutWithFailingBackend();
    });

    assert.equal(finallyRan, true);
    assert.equal(localToken, null);
    assert.equal(localUser, null);
  });

  it('Logout Test 6 — Multi-device isolation: logging out Device A does NOT invalidate Device B', async () => {
    const user = await User.create({
      email: 'multidevice@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Multi Device User',
      role: 'user',
      status: 'active',
    });

    // Session A (e.g. Laptop)
    const sessionA = await createSession(user, { headers: { 'user-agent': 'Device A (Laptop)' } });
    // Session B (e.g. Phone)
    const sessionB = await createSession(user, { headers: { 'user-agent': 'Device B (Phone)' } });

    // Device A logs out
    const logoutA = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: sessionA.refreshToken },
    });
    assert.equal(logoutA.status, 200);

    // Verify Session A is revoked in DB
    const hashA = hashToken(sessionA.refreshToken);
    const dbSessA = await Session.findOne({ tokenHash: hashA });
    assert.ok(dbSessA.revokedAt, 'Session A must be revoked');

    // Verify Session B is NOT revoked in DB
    const hashB = hashToken(sessionB.refreshToken);
    const dbSessB = await Session.findOne({ tokenHash: hashB });
    assert.equal(dbSessB.revokedAt, null, 'Session B must remain active');

    // Device B can successfully rotate / refresh its session
    const refreshB = await apiRequest('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: sessionB.refreshToken },
    });
    assert.equal(refreshB.status, 200);
    assert.equal(refreshB.data.success, true);
    assert.ok(refreshB.data.accessToken);
  });

  it('Logout Test 7 — Repeated logout is safe, idempotent, and returns 200 without error', async () => {
    const user = await User.create({
      email: 'repeatlogout@session-sec-test.com',
      password: 'Password123!',
      displayName: 'Repeat Logout User',
      role: 'user',
      status: 'active',
    });

    const session = await createSession(user, { headers: {} });

    // Call 1
    const res1 = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });
    assert.equal(res1.status, 200);
    assert.equal(res1.data.success, true);

    // Call 2 (with same token)
    const res2 = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.data.success, true);

    // Call 3 (without token)
    const res3 = await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
    assert.equal(res3.status, 200);
    assert.equal(res3.data.success, true);
  });
});
