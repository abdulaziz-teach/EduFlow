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
import Lesson from '../src/models/Lesson.js';
import Report from '../src/models/Report.js';
import FeatureFlag from '../src/models/FeatureFlag.js';
import Incident from '../src/models/Incident.js';
import AuditLog from '../src/models/AuditLog.js';
import Session from '../src/models/Session.js';
import { generateAccessToken } from '../src/services/sessionService.js';
import {
  ROLES,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  canManageRole,
} from '../src/services/rbacService.js';
import { isFeatureEnabled, calculateRolloutBucket } from '../src/services/featureFlagService.js';

let server;
let baseUrl;

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
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
};

describe('🛡️ Phase 25: Advanced Admin, Moderation & Operations Engine', () => {
  // Test Users
  let superAdminUser, superAdminToken;
  let adminUser, adminToken;
  let modUser, modToken;
  let contentManagerUser, contentManagerToken;
  let supportUser, supportToken;
  let analystUser, analystToken;
  let studentUser, studentToken;

  // Test Entities
  let testCourse;
  let testLesson;

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

    // Cleanup old test data
    await User.deleteMany({ email: /@admintest\.internal$/ });
    await Report.deleteMany({});
    await Incident.deleteMany({});
    await Course.deleteMany({ title: /AdminTest Course/ });
    await Lesson.deleteMany({ title: /AdminTest Lesson/ });
    await FeatureFlag.deleteMany({});
    await AuditLog.deleteMany({ action: /^test\./ });

    // 1. Create Super Admin
    superAdminUser = await User.create({
      name: 'Super Administrator',
      displayName: 'Super Admin',
      email: 'superadmin@admintest.internal',
      password: 'Password123!',
      role: 'super_admin',
      status: 'active',
    });
    superAdminToken = generateAccessToken(superAdminUser._id, 'super_admin');

    // 2. Create Regular Admin
    adminUser = await User.create({
      name: 'Operations Admin',
      displayName: 'Admin User',
      email: 'admin@admintest.internal',
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // 3. Create Moderator
    modUser = await User.create({
      name: 'Safety Moderator',
      displayName: 'Moderator User',
      email: 'moderator@admintest.internal',
      password: 'Password123!',
      role: 'moderator',
      status: 'active',
    });
    modToken = generateAccessToken(modUser._id, 'moderator');

    // 4. Create Content Manager
    contentManagerUser = await User.create({
      name: 'Curriculum Manager',
      displayName: 'Content Manager',
      email: 'contentmanager@admintest.internal',
      password: 'Password123!',
      role: 'content_manager',
      status: 'active',
    });
    contentManagerToken = generateAccessToken(contentManagerUser._id, 'content_manager');

    // 5. Create Support Agent
    supportUser = await User.create({
      name: 'Support Agent',
      displayName: 'Support User',
      email: 'support@admintest.internal',
      password: 'Password123!',
      role: 'support',
      status: 'active',
    });
    supportToken = generateAccessToken(supportUser._id, 'support');

    // 6. Create Analyst
    analystUser = await User.create({
      name: 'Data Analyst',
      displayName: 'Analyst User',
      email: 'analyst@admintest.internal',
      password: 'Password123!',
      role: 'analyst',
      status: 'active',
    });
    analystToken = generateAccessToken(analystUser._id, 'analyst');

    // 7. Create Normal Student
    studentUser = await User.create({
      name: 'Regular Student',
      displayName: 'Student User',
      email: 'student@admintest.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
    });
    studentToken = generateAccessToken(studentUser._id, 'user');

    // Create Test Course & Lesson
    testCourse = await Course.create({
      title: 'AdminTest Course on System Architecture',
      slug: 'admintest-course-system-architecture',
      description: 'Educational course for administration test suite',
      category: 'Computer Science',
      level: 'intermediate',
      status: 'draft',
      instructorId: adminUser._id,
    });

    testLesson = await Lesson.create({
      title: 'AdminTest Lesson: High Availability',
      slug: 'admintest-lesson-high-availability',
      courseId: testCourse._id,
      order: 1,
      content: 'Deep architectural details on high availability and fault tolerance.',
      status: 'draft',
      isPublished: false,
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@admintest\.internal$/ });
    await Report.deleteMany({});
    await Incident.deleteMany({});
    await Course.deleteMany({ title: /AdminTest Course/ });
    await Lesson.deleteMany({ title: /AdminTest Lesson/ });
    await FeatureFlag.deleteMany({});
    await Session.deleteMany({ userId: { $in: [studentUser?._id, adminUser?._id] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ==========================================
  // SUITE 1: RBAC & Permission Security Matrix
  // ==========================================
  describe('1. Role-Based Access Control (RBAC) & Permission Security Matrix', () => {
    it('unit: validates explicit permissions for all supported roles', () => {
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SYSTEM_OPERATIONS), true);
      assert.equal(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.USERS_MANAGE), true);

      assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE), true);
      assert.equal(hasPermission(ROLES.ADMIN, PERMISSIONS.CONTENT_PUBLISH), true);

      assert.equal(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.CONTENT_PUBLISH), true);
      assert.equal(hasPermission(ROLES.CONTENT_MANAGER, PERMISSIONS.USERS_SUSPEND), false);

      assert.equal(hasPermission(ROLES.MODERATOR, PERMISSIONS.CONTENT_MODERATE), true);
      assert.equal(hasPermission(ROLES.MODERATOR, PERMISSIONS.BILLING_MANAGE), false);

      assert.equal(hasPermission(ROLES.SUPPORT, PERMISSIONS.USERS_READ), true);
      assert.equal(hasPermission(ROLES.SUPPORT, PERMISSIONS.USERS_SUSPEND), false);

      assert.equal(hasPermission(ROLES.ANALYST, PERMISSIONS.ANALYTICS_READ), true);
      assert.equal(hasPermission(ROLES.ANALYST, PERMISSIONS.USERS_MANAGE), false);

      assert.equal(hasPermission(ROLES.USER, PERMISSIONS.USERS_READ), false);
    });

    it('unit: enforces role modification hierarchy via canManageRole', () => {
      // Super admin can manage anyone
      assert.equal(canManageRole(ROLES.SUPER_ADMIN, ROLES.SUPER_ADMIN), true);
      assert.equal(canManageRole(ROLES.SUPER_ADMIN, ROLES.ADMIN), true);

      // Normal admin cannot create/alter super_admin
      assert.equal(canManageRole(ROLES.ADMIN, ROLES.SUPER_ADMIN), false);
      assert.equal(canManageRole(ROLES.ADMIN, ROLES.MODERATOR), true);

      // Support/Moderator cannot manage roles
      assert.equal(canManageRole(ROLES.MODERATOR, ROLES.USER), false);
      assert.equal(canManageRole(ROLES.SUPPORT, ROLES.USER), false);
    });

    it('rejects unauthenticated requests to /api/admin with 401', async () => {
      const res = await apiRequest('/api/admin/overview');
      assert.equal(res.status, 401);
      assert.equal(res.data.error, 'NO_TOKEN');
    });

    it('rejects standard student user from /api/admin endpoints with 403 FORBIDDEN', async () => {
      const res = await apiRequest('/api/admin/overview', { token: studentToken });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'FORBIDDEN');
    });

    it('moderator can access moderation queue but is blocked (403) from feature flags', async () => {
      const modReportsRes = await apiRequest('/api/admin/moderation/reports', { token: modToken });
      assert.equal(modReportsRes.status, 200);

      const modFlagsRes = await apiRequest('/api/admin/feature-flags', { token: modToken });
      assert.equal(modFlagsRes.status, 403);
      assert.equal(modFlagsRes.data.error, 'FORBIDDEN');
    });

    it('content manager can view content but is blocked from user suspensions (403)', async () => {
      const contentRes = await apiRequest('/api/admin/content', { token: contentManagerToken });
      assert.equal(contentRes.status, 200);

      const suspendRes = await apiRequest(`/api/admin/users/${studentUser._id}/suspend`, {
        method: 'POST',
        token: contentManagerToken,
        body: { reason: 'Unauthorized attempt' },
      });
      assert.equal(suspendRes.status, 403);
    });

    it('super admin has unrestricted access across administrative endpoints', async () => {
      const res = await apiRequest('/api/admin/overview', { token: superAdminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.data.stats);
    });
  });

  // ==========================================
  // SUITE 2: User Administration & Safety
  // ==========================================
  describe('2. User Administration, Safety & Bounded Bulk Operations', () => {
    it('GET /api/admin/users lists paginated users without exposing password hashes', async () => {
      const res = await apiRequest('/api/admin/users?limit=5', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.users));
      assert.ok(res.data.data.users.length > 0);

      // Verify no passwords or hashes leaked
      for (const u of res.data.data.users) {
        assert.equal(u.password, undefined);
        assert.equal(u.passwordHash, undefined);
      }
    });

    it('GET /api/admin/users/:id returns user details and associated learning state', async () => {
      const res = await apiRequest(`/api/admin/users/${studentUser._id}`, { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.user.email, studentUser.email);
      assert.equal(res.data.data.user.password, undefined);
      assert.ok(res.data.data.wallet !== undefined);
      assert.ok(res.data.data.activePlan !== undefined);
    });

    it('disallows self-suspension (returns 400)', async () => {
      const res = await apiRequest(`/api/admin/users/${adminUser._id}/suspend`, {
        method: 'POST',
        token: adminToken,
        body: { reason: 'Self suspend test' },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'SELF_ACTION_DISALLOWED');
    });

    it('POST /api/admin/users/:id/suspend suspends user and revokes active sessions', async () => {
      // Create an active session for the student
      await Session.create({
        userId: studentUser._id,
        tokenHash: 'hash_test_123',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const res = await apiRequest(`/api/admin/users/${studentUser._id}/suspend`, {
        method: 'POST',
        token: adminToken,
        body: { reason: 'Suspicious bot activity' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);

      // Verify DB status
      const updated = await User.findById(studentUser._id);
      assert.equal(updated.status, 'suspended');

      // Verify active sessions were completely cleared
      const sessions = await Session.find({ userId: studentUser._id });
      assert.equal(sessions.length, 0);
    });

    it('POST /api/admin/users/:id/unsuspend reinstates user to active', async () => {
      const res = await apiRequest(`/api/admin/users/${studentUser._id}/unsuspend`, {
        method: 'POST',
        token: adminToken,
        body: { reason: 'Resolved upon verification' },
      });

      assert.equal(res.status, 200);
      const updated = await User.findById(studentUser._id);
      assert.equal(updated.status, 'active');
    });

    it('role hierarchy: regular admin cannot promote anyone to super_admin (returns 403)', async () => {
      const res = await apiRequest(`/api/admin/users/${studentUser._id}/role`, {
        method: 'POST',
        token: adminToken,
        body: { role: 'super_admin' },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'INSUFFICIENT_ROLE_AUTHORITY');
    });

    it('role hierarchy: super admin can promote user to moderator', async () => {
      const res = await apiRequest(`/api/admin/users/${studentUser._id}/role`, {
        method: 'POST',
        token: superAdminToken,
        body: { role: 'moderator' },
      });
      assert.equal(res.status, 200);
      const check = await User.findById(studentUser._id);
      assert.equal(check.role, 'moderator');

      // Reset back to user for remaining tests
      await User.updateOne({ _id: studentUser._id }, { role: 'user' });
    });

    it('bulk action safety: rejects batch exceeding 25 user IDs with 400', async () => {
      const excessiveIds = Array.from({ length: 26 }, () => new mongoose.Types.ObjectId());
      const res = await apiRequest('/api/admin/users/bulk', {
        method: 'POST',
        token: adminToken,
        body: {
          userIds: excessiveIds,
          action: 'suspend',
          confirm: true,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'BATCH_LIMIT_EXCEEDED');
    });

    it('bulk action safety: rejects bulk action without explicit confirm flag', async () => {
      const res = await apiRequest('/api/admin/users/bulk', {
        method: 'POST',
        token: adminToken,
        body: {
          userIds: [studentUser._id],
          action: 'suspend',
          confirm: false,
        },
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'CONFIRMATION_REQUIRED');
    });
  });

  // ==========================================
  // SUITE 3: Content Workspace & Governance
  // ==========================================
  describe('3. Content Workspace, Lifecycle Transitions & Governance', () => {
    it('GET /api/admin/content returns courses and lessons with pagination', async () => {
      const res = await apiRequest('/api/admin/content?type=course', { token: contentManagerToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.items));
    });

    it('PATCH /api/admin/content/course/:id/status transitions draft to approved', async () => {
      const res = await apiRequest(`/api/admin/content/course/${testCourse._id}/status`, {
        method: 'PATCH',
        token: contentManagerToken,
        body: { status: 'approved', reason: 'Peer review completed' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.item.status, 'approved');

      const course = await Course.findById(testCourse._id);
      assert.equal(course.status, 'approved');
    });

    it('PATCH /api/admin/content/course/:id/status publishes approved content', async () => {
      const res = await apiRequest(`/api/admin/content/course/${testCourse._id}/status`, {
        method: 'PATCH',
        token: contentManagerToken,
        body: { status: 'published', reason: 'Published to student catalogue' },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.item.status, 'published');
    });

    it('governance guard: disallows jumping from archived directly to published without review', async () => {
      // Archive course first
      await Course.updateOne({ _id: testCourse._id }, { status: 'archived' });

      const res = await apiRequest(`/api/admin/content/course/${testCourse._id}/status`, {
        method: 'PATCH',
        token: contentManagerToken,
        body: { status: 'published' },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_LIFECYCLE_TRANSITION');
    });
  });

  // ==========================================
  // SUITE 4: Moderation Queue, Concurrency & Resolution
  // ==========================================
  describe('4. Content Moderation Queue, Concurrency & Resolution', () => {
    let createdReportId;

    it('POST /api/reports submits report safely from authenticated student', async () => {
      const res = await apiRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          targetType: 'lesson',
          targetId: testLesson._id.toString(),
          reason: 'inaccurate',
          description: 'The formula on step 3 contains a typo in the variable name.',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.report._id);
      createdReportId = res.data.report._id;
    });

    it('duplicate report submission by same user returns 200 with isDuplicate note', async () => {
      const res = await apiRequest('/api/reports', {
        method: 'POST',
        token: studentToken,
        body: {
          targetType: 'lesson',
          targetId: testLesson._id.toString(),
          reason: 'inaccurate',
          description: 'Repeated identical report',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.report._id, createdReportId);
    });

    it('GET /api/admin/moderation/reports returns queued reports for moderator', async () => {
      const res = await apiRequest('/api/admin/moderation/reports?status=pending', { token: modToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.data.reports.length >= 1);
    });

    it('moderator can claim report, concurrent claim by another moderator is prevented', async () => {
      // Mod 1 claims report
      const res1 = await apiRequest(`/api/admin/moderation/reports/${createdReportId}/assign`, {
        method: 'POST',
        token: modToken,
      });
      assert.equal(res1.status, 200);
      assert.equal(res1.data.report.status, 'under_review');

      // Admin attempts concurrent claim -> rejected with 409 conflict
      const res2 = await apiRequest(`/api/admin/moderation/reports/${createdReportId}/assign`, {
        method: 'POST',
        token: adminToken,
      });
      assert.equal(res2.status, 409);
      assert.equal(res2.data.error, 'CONCURRENT_CLAIM_CONFLICT');
    });

    it('resolve report with content_hidden automatically updates target lesson status', async () => {
      const res = await apiRequest(`/api/admin/moderation/reports/${createdReportId}/resolve`, {
        method: 'POST',
        token: modToken,
        body: {
          resolution: 'Confirmed typo; hiding lesson until revision.',
          action: 'content_hidden',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.report.status, 'resolved');

      // Verify target lesson was un-published and archived
      const lesson = await Lesson.findById(testLesson._id);
      assert.equal(lesson.isPublished, false);
      assert.equal(lesson.status, 'archived');
    });
  });

  // ==========================================
  // SUITE 5: Feature Flags, Rollouts & Emergency Controls
  // ==========================================
  describe('5. Dynamic Feature Flags, Rollouts & Emergency Controls', () => {
    it('GET /api/admin/feature-flags returns registered feature flags', async () => {
      const res = await apiRequest('/api/admin/feature-flags', { token: adminToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.data.flags));
      assert.ok(res.data.data.flags.length >= 7);
    });

    it('evaluates deterministic rollout percentage consistently for identical user ID', async () => {
      const dummyUid = new mongoose.Types.ObjectId();
      const bucket1 = calculateRolloutBucket(dummyUid, 'ai_mentor_v2');
      const bucket2 = calculateRolloutBucket(dummyUid, 'ai_mentor_v2');
      assert.equal(bucket1, bucket2);
      assert.ok(bucket1 >= 0 && bucket1 < 100);
    });

    it('PATCH /api/admin/feature-flags/:key updates rollout percentage and isEnabled', async () => {
      const res = await apiRequest('/api/admin/feature-flags/experimental_features', {
        method: 'PATCH',
        token: adminToken,
        body: {
          isEnabled: true,
          rolloutPercentage: 50,
          description: 'Gradual beta feature test',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.flag.isEnabled, true);
      assert.equal(res.data.flag.rolloutPercentage, 50);
    });

    it('POST /api/admin/emergency/emergency_pause_ai activates emergency kill-switch', async () => {
      const res = await apiRequest('/api/admin/emergency/emergency_pause_ai', {
        method: 'POST',
        token: adminToken,
        body: {
          isEnabled: true,
          reason: 'Testing AI circuit breaker',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.control.isEnabled, true);

      // Verify immediate reflection in flag evaluation
      const enabled = await isFeatureEnabled('emergency_pause_ai');
      assert.equal(enabled, true);

      // Deactivate emergency switch to restore clean baseline
      await apiRequest('/api/admin/emergency/emergency_pause_ai', {
        method: 'POST',
        token: adminToken,
        body: { isEnabled: false, reason: 'Test finished' },
      });
    });
  });

  // ==========================================
  // SUITE 6: System Health & Incident Management
  // ==========================================
  describe('6. System Operations, Health & Incident Management', () => {
    let createdIncidentId;

    it('GET /api/admin/system/health returns detailed operational metrics', async () => {
      const res = await apiRequest('/api/admin/system/health', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.data.components.database);
      assert.ok(res.data.data.components.api);
      assert.equal(res.data.data.components.database.status, 'healthy');
    });

    it('POST /api/admin/system/incidents logs new operational incident', async () => {
      const res = await apiRequest('/api/admin/system/incidents', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'OpenAI 429 Rate Limit Spike',
          description: 'Spike in external AI mentor responses taking > 5 seconds',
          severity: 'p1_high',
          affectedService: 'ai_service',
        },
      });

      assert.equal(res.status, 201);
      assert.ok(res.data.incident._id);
      assert.equal(res.data.incident.status, 'open');
      createdIncidentId = res.data.incident._id;
    });

    it('PATCH /api/admin/system/incidents/:id resolves incident and records timeline note', async () => {
      const res = await apiRequest(`/api/admin/system/incidents/${createdIncidentId}`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          status: 'resolved',
          note: 'Fallback to secondary key executed. Latency normalized.',
          resolutionNotes: 'Mitigated with dynamic rate limiter adjustments.',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.incident.status, 'resolved');

      const inc = await Incident.findById(createdIncidentId);
      assert.equal(inc.status, 'resolved');
      assert.ok(inc.timeline.length >= 2);
    });
  });

  // ==========================================
  // SUITE 7: Audit Log Immutability & Safe Telemetry
  // ==========================================
  describe('7. Audit Log Immutability & Safe Telemetry', () => {
    it('verifies that administrative operations wrote immutable AuditLog entries', async () => {
      const auditCount = await AuditLog.countDocuments({
        actorId: { $in: [adminUser._id, superAdminUser._id, modUser._id] },
      });
      assert.ok(auditCount >= 4, `Expected at least 4 audit logs, found ${auditCount}`);
    });

    it('GET /api/admin/audit-logs returns paginated audit records with actor population', async () => {
      const res = await apiRequest('/api/admin/audit-logs?limit=10', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.data.logs));
      assert.ok(res.data.data.logs.length > 0);

      // Verify no passwords, tokens, or hashes are present in metadata
      for (const log of res.data.data.logs) {
        assert.equal(log.metadata.password, undefined);
        assert.equal(log.metadata.passwordHash, undefined);
        assert.equal(log.metadata.token, undefined);
        assert.equal(log.metadata.refreshToken, undefined);
      }
    });
  });

  // ==========================================
  // SUITE 8: Adversarial Security & Parameter Tampering
  // ==========================================
  describe('8. Adversarial Security & Input Sanitization', () => {
    it('invalid MongoDB ObjectId parameter returns 400 with INVALID_ID without crashing', async () => {
      const res = await apiRequest('/api/admin/users/not-a-valid-mongo-id', { token: adminToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_ID');
    });

    it('GET /api/admin/search safely handles regex characters and escapes input', async () => {
      const res = await apiRequest('/api/admin/search?q=.*+?^${}()|[]\\', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });
});
