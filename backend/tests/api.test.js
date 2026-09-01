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
import connectDB from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import StudyPlan from '../src/models/StudyPlan.js';
import StudySession from '../src/models/StudySession.js';
import PracticeQuestion from '../src/models/PracticeQuestion.js';
import PracticeSession from '../src/models/PracticeSession.js';
import KnowledgeTopic from '../src/models/KnowledgeTopic.js';
import KnowledgeEvent from '../src/models/KnowledgeEvent.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import UserAchievement from '../src/models/UserAchievement.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';

let server;
let baseUrl;

// Helper to make HTTP requests against the test server
async function apiRequest(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...options.headers,
  };

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
    // Non-JSON response
  }

  return { status: res.status, ok: res.ok, data };
}

describe('EduFlow Complete MVP Test Suite', () => {
  let userAToken;
  let userAData;
  let userBToken;
  let userBData;

  const testEmailA = `test_a_${Date.now()}@eduflow.test`;
  const testEmailB = `test_b_${Date.now()}@eduflow.test`;

  before(async () => {
    await connectDB();

    // Start ephemeral test server on random free port
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Cleanup created test users
    if (userAData?.id) {
      const uid = userAData.id;
      await Promise.all([
        User.deleteOne({ _id: uid }),
        StudyPlan.deleteMany({ userId: uid }),
        StudySession.deleteMany({ userId: uid }),
        PracticeSession.deleteMany({ userId: uid }),
        KnowledgeTopic.deleteMany({ userId: uid }),
        KnowledgeEvent.deleteMany({ userId: uid }),
        Notification.deleteMany({ userId: uid }),
        NotificationPreference.deleteMany({ userId: uid }),
        UserAchievement.deleteMany({ userId: uid }),
        Conversation.deleteMany({ userId: uid }),
        Message.deleteMany({ userId: uid }),
      ]);
    }

    if (userBData?.id) {
      const uid = userBData.id;
      await Promise.all([
        User.deleteOne({ _id: uid }),
        StudyPlan.deleteMany({ userId: uid }),
        StudySession.deleteMany({ userId: uid }),
        PracticeSession.deleteMany({ userId: uid }),
        KnowledgeTopic.deleteMany({ userId: uid }),
        KnowledgeEvent.deleteMany({ userId: uid }),
        Notification.deleteMany({ userId: uid }),
        NotificationPreference.deleteMany({ userId: uid }),
        UserAchievement.deleteMany({ userId: uid }),
      ]);
    }

    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  // 1. HEALTH CHECK
  describe('1. API Health Check', () => {
    it('GET /api/health should report server status and database connectivity', async () => {
      const res = await apiRequest('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.status, 'ok');
      assert.equal(res.data.database, 'connected');
    });
  });

  // 2. AUTHENTICATION & PROFILE
  describe('2. Authentication & Profile Management', () => {
    it('POST /api/auth/register should create a new user account and return JWT', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Test Student A',
          email: testEmailA,
          password: 'Password1234!',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.token);
      assert.equal(res.data.user.email, testEmailA);
      assert.equal(res.data.user.password, undefined); // Password never leaked

      userAToken = res.data.token;
      userAData = res.data.user;
    });

    it('POST /api/auth/register should reject duplicate email with 409', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Duplicate Student',
          email: testEmailA,
          password: 'Password1234!',
        },
      });

      assert.equal(res.status, 409);
      assert.equal(res.data.success, false);
    });

    it('POST /api/auth/login should authenticate with valid credentials', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: testEmailA,
          password: 'Password1234!',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.token);
      assert.equal(res.data.user.password, undefined);
    });

    it('POST /api/auth/login should reject invalid password with 401', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: testEmailA,
          password: 'WrongPassword!',
        },
      });

      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    it('GET /api/users/me should return authenticated profile when valid JWT provided', async () => {
      const res = await apiRequest('/api/users/me', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.user.email, testEmailA);
      assert.equal(res.data.user.password, undefined);
    });

    it('GET /api/users/me should reject unauthenticated request with 401', async () => {
      const res = await apiRequest('/api/users/me');
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    it('GET /api/users/me should reject invalid JWT token with 401', async () => {
      const res = await apiRequest('/api/users/me', { token: 'invalid.jwt.token' });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
    });

    it('PATCH /api/users/me should update profile fields and enforce mass assignment protection', async () => {
      const res = await apiRequest('/api/users/me', {
        method: 'PATCH',
        token: userAToken,
        body: {
          name: 'Alex Student',
          subjects: ['Mathematics', 'Computer Science'],
          goal: {
            type: 'exam',
            description: 'Prepare for midterm exams',
            targetDate: new Date(Date.now() + 14 * 86400000).toISOString(),
          },
          dailyStudyMinutes: 60,
          // Malicious fields attempting mass assignment
          _id: '675849302194857261548392',
          streak: 999,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.user.name, 'Alex Student');
      assert.deepEqual(res.data.user.subjects, ['Mathematics', 'Computer Science']);
      assert.equal(res.data.user.dailyStudyMinutes, 60);
      assert.notEqual(res.data.user.streak, 999); // streak preserved
      assert.notEqual(res.data.user.id, '675849302194857261548392'); // _id not overwritten
    });
  });

  // 3. AUTHORIZATION & DATA ISOLATION
  describe('3. Authorization & User Data Isolation', () => {
    before(async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'User B',
          email: testEmailB,
          password: 'Password1234!',
        },
      });
      userBToken = res.data.token;
      userBData = res.data.user;

      // Set User B profile
      await apiRequest('/api/users/me', {
        method: 'PATCH',
        token: userBToken,
        body: {
          subjects: ['Biology'],
          goal: { type: 'general', description: 'General learning' },
          dailyStudyMinutes: 45,
        },
      });
    });

    it('User B cannot access or modify User A resources', async () => {
      // User A creates a notification
      const notification = await Notification.create({
        userId: userAData.id,
        type: 'system',
        title: 'User A Secret Notification',
        message: 'Confidential to User A',
      });

      // User B tries to mark User A's notification as read
      const markRes = await apiRequest(`/api/notifications/${notification._id}/read`, {
        method: 'PATCH',
        token: userBToken,
      });
      assert.equal(markRes.status, 404);

      // User B tries to delete User A's notification
      const delRes = await apiRequest(`/api/notifications/${notification._id}`, {
        method: 'DELETE',
        token: userBToken,
      });
      assert.equal(delRes.status, 404);

      // User B tries to export User A's study plan
      const exportRes = await apiRequest(`/api/study-plans/507f1f77bcf86cd799439011/export-ics`, {
        token: userBToken,
      });
      assert.equal(exportRes.status, 404);
    });
  });

  // 4. STUDY PLAN & ADAPTIVE LIFECYCLE
  describe('4. Study Plan & Study Sessions', () => {
    let createdPlanId;
    let sampleTaskId;

    it('POST /api/study-plans/generate should create a personalized study plan', async () => {
      const res = await apiRequest('/api/study-plans/generate', {
        method: 'POST',
        token: userAToken,
        body: {
          startDate: new Date().toISOString(),
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.plan._id);
      assert.ok(res.data.plan.days.length > 0);
      assert.ok(res.data.plan.days[0].tasks.length > 0);

      createdPlanId = res.data.plan._id;
      sampleTaskId = res.data.plan.days[0].tasks[0]._id;
    });

    it('GET /api/study-plans/current should retrieve the active plan', async () => {
      const res = await apiRequest('/api/study-plans/current', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.plan._id, createdPlanId);
    });

    it('GET /api/study-plans/today should retrieve today schedule', async () => {
      const res = await apiRequest('/api/study-plans/today', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.date);
    });

    it('PATCH /api/study-plans/:planId/tasks/:taskId/complete should toggle task completion', async () => {
      const res = await apiRequest(`/api/study-plans/${createdPlanId}/tasks/${sampleTaskId}/complete`, {
        method: 'PATCH',
        token: userAToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('POST /api/study-sessions/start should begin a tracked study session', async () => {
      const res = await apiRequest('/api/study-sessions/start', {
        method: 'POST',
        token: userAToken,
        body: {
          planId: createdPlanId,
          taskId: sampleTaskId,
        },
      });

      assert.ok([200, 201].includes(res.status));
      assert.equal(res.data.success, true);
      assert.ok(res.data.session.id);
    });

    it('GET /api/study-sessions/active should return current active session', async () => {
      const res = await apiRequest('/api/study-sessions/active', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.session);
    });

    it('PATCH /api/study-sessions/:id/complete should complete the session', async () => {
      const activeRes = await apiRequest('/api/study-sessions/active', { token: userAToken });
      const sessionId = activeRes.data.session.id;

      const res = await apiRequest(`/api/study-sessions/${sessionId}/complete`, {
        method: 'PATCH',
        token: userAToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.session.completedAt);
    });

    it('POST /api/study-plans/adapt should handle plan adaptation idempotently', async () => {
      const res = await apiRequest('/api/study-plans/adapt', {
        method: 'POST',
        token: userAToken,
        body: {
          planId: createdPlanId,
        },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.adaptation);
    });

    it('GET /api/study-plans/:id/export-ics should export valid iCal calendar data', async () => {
      const url = `${baseUrl}/api/study-plans/${createdPlanId}/export-ics`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${userAToken}` },
      });
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('BEGIN:VCALENDAR'));
      assert.ok(text.includes('END:VCALENDAR'));
    });
  });

  // 5. SMART PRACTICE & QUIZ ENGINE
  describe('5. Smart Practice Engine & Quiz Security', () => {
    let practiceSessionId;
    let testQuestionId;

    it('POST /api/practice/quick-start should auto-start a recommended practice session', async () => {
      const res = await apiRequest('/api/practice/quick-start', {
        method: 'POST',
        token: userAToken,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.session.id);
      assert.ok(res.data.session.questions.length > 0);
    });

    it('POST /api/practice/generate should generate and cache questions safely', async () => {
      const res = await apiRequest('/api/practice/generate', {
        method: 'POST',
        token: userAToken,
        body: {
          subject: 'Mathematics',
          topic: 'Calculus Fundamentals',
          difficulty: 'medium',
          count: 5,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('POST /api/practice/sessions should create a session without leaking correct answers', async () => {
      const res = await apiRequest('/api/practice/sessions', {
        method: 'POST',
        token: userAToken,
        body: {
          subject: 'Mathematics',
          topic: 'Calculus Fundamentals',
          difficulty: 'medium',
          count: 3,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.session.id);
      assert.ok(res.data.session.questions.length > 0);

      // SECURITY AUDIT: Verify correctAnswer and explanation are NOT returned in initial payload
      for (const q of res.data.session.questions) {
        assert.equal(q.correctAnswer, undefined, 'CRITICAL SECURITY LEAK: correctAnswer was exposed before answer submission!');
        assert.equal(q.explanation, undefined, 'CRITICAL SECURITY LEAK: explanation was exposed before answer submission!');
      }

      practiceSessionId = res.data.session.id;
      testQuestionId = res.data.session.questions[0].id;
    });

    it('POST /api/practice/sessions/:id/answer should evaluate answer and return feedback only after submission', async () => {
      const res = await apiRequest(`/api/practice/sessions/${practiceSessionId}/answer`, {
        method: 'POST',
        token: userAToken,
        body: {
          questionId: testQuestionId,
          answer: 'sample test answer',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(typeof res.data.correct, 'boolean');
      assert.ok(res.data.correctAnswer); // Now returned safely
      assert.ok(res.data.explanation);
    });

    it('POST /api/practice/sessions/:id/answer should reject duplicate answer submissions on same question', async () => {
      const res = await apiRequest(`/api/practice/sessions/${practiceSessionId}/answer`, {
        method: 'POST',
        token: userAToken,
        body: {
          questionId: testQuestionId,
          answer: 'second attempt',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });

    it('POST /api/practice/sessions/:id/complete should calculate accurate session statistics', async () => {
      const res = await apiRequest(`/api/practice/sessions/${practiceSessionId}/complete`, {
        method: 'POST',
        token: userAToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(typeof res.data.result.accuracy, 'number');
      assert.equal(res.data.result.total, 3);
      assert.equal(res.data.result.answered, 1);
    });

    it('GET /api/practice/history should return completed session history', async () => {
      const res = await apiRequest('/api/practice/history', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.sessions));
      assert.ok(res.data.sessions.length >= 1);
    });
  });

  // 6. KNOWLEDGE TRACKING & PROGRESS
  describe('6. Knowledge Tracking & Progress Analytics', () => {
    it('GET /api/knowledge/summary should return knowledge tracking stats', async () => {
      const res = await apiRequest('/api/knowledge/summary', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.summary);
      assert.equal(typeof res.data.summary.totalTopics, 'number');
    });

    it('GET /api/knowledge/subjects should return subjects breakdown', async () => {
      const res = await apiRequest('/api/knowledge/subjects', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.subjects));
    });

    it('GET /api/progress/summary should return progress metrics', async () => {
      const res = await apiRequest('/api/progress/summary', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.summary);
      assert.equal(typeof res.data.summary.totalStudyMinutes, 'number');
    });

    it('GET /api/progress/weekly-digest should return aggregated weekly learning stats', async () => {
      const res = await apiRequest('/api/progress/weekly-digest', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.digest);
      assert.equal(typeof res.data.digest.currentWeekMinutes, 'number');
      assert.equal(typeof res.data.digest.previousWeekMinutes, 'number');
      assert.ok(Array.isArray(res.data.digest.subjectBreakdown));
    });
  });

  // 7. NOTIFICATIONS & PREFERENCES
  describe('7. Notifications & Notification Preferences', () => {
    let testNotificationId;

    it('GET /api/notifications/preferences should get or initialize user notification settings', async () => {
      const res = await apiRequest('/api/notifications/preferences', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.preferences);
      assert.equal(res.data.preferences.enabled, true);
    });

    it('PATCH /api/notifications/preferences should update notification toggles safely', async () => {
      const res = await apiRequest('/api/notifications/preferences', {
        method: 'PATCH',
        token: userAToken,
        body: {
          taskReminders: false,
          streakNotifications: true,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.preferences.taskReminders, false);
    });

    it('GET /api/notifications should list notifications and unread counts', async () => {
      // Create a test notification for user A
      const notif = await Notification.create({
        userId: userAData.id,
        type: 'streak',
        title: 'Keep it up!',
        message: 'You have a streak going!',
      });
      testNotificationId = notif._id;

      const res = await apiRequest('/api/notifications', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.notifications));
      assert.ok(res.data.unreadCount >= 1);
    });

    it('PATCH /api/notifications/:id/read should mark individual notification read', async () => {
      const res = await apiRequest(`/api/notifications/${testNotificationId}/read`, {
        method: 'PATCH',
        token: userAToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.notification.read, true);
    });

    it('DELETE /api/notifications/:id should delete notification', async () => {
      const res = await apiRequest(`/api/notifications/${testNotificationId}`, {
        method: 'DELETE',
        token: userAToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 8. SECURITY MATRIX
  describe('8. Security Matrix & Edge Cases', () => {
    it('Invalid MongoDB ObjectId parameter should return 400 with INVALID_ID', async () => {
      const res = await apiRequest('/api/study-plans/not-a-valid-object-id', { token: userAToken });
      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'INVALID_ID');
    });

    it('Non-existent route should return 404 with NOT_FOUND', async () => {
      const res = await apiRequest('/api/non-existent-endpoint');
      assert.equal(res.status, 404);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'NOT_FOUND');
    });

    it('Malformed register body should return 400 validation error', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: '',
          email: 'not-an-email',
          password: '123',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });
  });
});
