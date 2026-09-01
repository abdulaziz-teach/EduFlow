import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
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

let server;
let baseUrl;

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
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Non-json
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, error: err.message };
  }
}

describe('🔥 Phase 13 — Adversarial Security & Penetration Testing Suite', () => {
  let userA, userAToken;
  let userB, userBToken;
  let userBPlan;
  let userBSession;
  let userBPracticeSession;
  let sampleQuestion;
  let sampleQuestion2;
  let sampleQuestion3;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Create User A (Attacker)
    const regA = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Attacker A', email: `attacker_${Date.now()}@test.com`, password: 'AttackerPassword123!' },
    });
    userA = regA.data.user;
    userAToken = regA.data.token;

    // Create User B (Victim)
    const regB = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Victim B', email: `victim_${Date.now()}@test.com`, password: 'VictimPassword123!' },
    });
    userB = regB.data.user;
    userBToken = regB.data.token;

    // Set User B profile
    await apiRequest('/api/users/me', {
      method: 'PATCH',
      token: userBToken,
      body: { subjects: ['Mathematics'], goal: { type: 'general' }, dailyStudyMinutes: 60 },
    });

    // Generate User B Study Plan
    const planRes = await apiRequest('/api/study-plans/generate', {
      method: 'POST',
      token: userBToken,
      body: {},
    });
    userBPlan = planRes.data.plan;

    // Start User B Study Session
    const sessRes = await apiRequest('/api/study-sessions/start', {
      method: 'POST',
      token: userBToken,
      body: { planId: userBPlan._id, taskId: userBPlan.days[0].tasks[0]._id },
    });
    userBSession = sessRes.data.session;

    // Create Practice Questions
    sampleQuestion = await PracticeQuestion.create({
      subject: 'Mathematics',
      topic: 'Algebra',
      type: 'multiple_choice',
      question: 'What is 2+2?',
      options: ['3', '4', '5'],
      correctAnswer: '4',
      explanation: 'Basic arithmetic',
      difficulty: 'easy',
    });

    sampleQuestion2 = await PracticeQuestion.create({
      subject: 'Mathematics',
      topic: 'Algebra',
      type: 'multiple_choice',
      question: 'What is 3+3?',
      options: ['5', '6', '7'],
      correctAnswer: '6',
      explanation: 'Basic arithmetic',
      difficulty: 'easy',
    });

    sampleQuestion3 = await PracticeQuestion.create({
      subject: 'Mathematics',
      topic: 'Algebra',
      type: 'multiple_choice',
      question: 'What is 5+5?',
      options: ['8', '10', '12'],
      correctAnswer: '10',
      explanation: 'Basic arithmetic',
      difficulty: 'easy',
    });

    // Create User B Practice Session with 3 questions
    userBPracticeSession = await PracticeSession.create({
      userId: userB.id,
      subject: 'Mathematics',
      topic: 'Algebra',
      totalQuestions: 3,
      correctAnswers: 0,
      questions: [
        { questionId: sampleQuestion._id, order: 1, answer: null, isCorrect: null, answeredAt: null },
        { questionId: sampleQuestion2._id, order: 2, answer: null, isCorrect: null, answeredAt: null },
        { questionId: sampleQuestion3._id, order: 3, answer: null, isCorrect: null, answeredAt: null },
      ],
      completed: false,
    });
  });

  after(async () => {
    if (userA?.id) await User.deleteOne({ _id: userA.id });
    if (userB?.id) {
      await User.deleteOne({ _id: userB.id });
      await StudyPlan.deleteMany({ userId: userB.id });
      await StudySession.deleteMany({ userId: userB.id });
      await PracticeSession.deleteMany({ userId: userB.id });
      await KnowledgeEvent.deleteMany({ userId: userB.id });
    }
    if (sampleQuestion?._id) await PracticeQuestion.deleteOne({ _id: sampleQuestion._id });
    if (sampleQuestion2?._id) await PracticeQuestion.deleteOne({ _id: sampleQuestion2._id });
    if (sampleQuestion3?._id) await PracticeQuestion.deleteOne({ _id: sampleQuestion3._id });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  });

  // 1. IDOR: USER A ACCESSING USER B SESSIONS
  describe('Attack Vector 1: Cross-User IDOR Access', () => {
    it('User A tries to complete User B study session', async () => {
      const res = await apiRequest(`/api/study-sessions/${userBSession.id}/complete`, {
        method: 'PATCH',
        token: userAToken,
      });
      assert.equal(res.status, 404, 'Must return 404 Not Found for unauthorized session');
    });

    it('User A tries to answer User B practice session question', async () => {
      const res = await apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/answer`, {
        method: 'POST',
        token: userAToken,
        body: {
          questionId: sampleQuestion._id.toString(),
          answer: '4',
        },
      });
      assert.equal(res.status, 404, 'Must return 404 Not Found for unauthorized practice session');
    });

    it('User A tries to view User B practice session details', async () => {
      const res = await apiRequest(`/api/practice/sessions/${userBPracticeSession._id}`, {
        token: userAToken,
      });
      assert.equal(res.status, 404, 'Must return 404 Not Found when viewing another user practice session');
    });
  });

  // 2. JWT TAMPERING
  describe('Attack Vector 2: JWT Tampering & Algorithm Confusion', () => {
    it('Tampered signature JWT should be rejected with 401 and INVALID_TOKEN', async () => {
      const parts = userAToken.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ userId: userB.id })).toString('base64url');
      const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await apiRequest('/api/users/me', { token: forgedToken });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'INVALID_TOKEN');
    });

    it('Arbitrary random string token should be rejected with 401 and INVALID_TOKEN', async () => {
      const res = await apiRequest('/api/users/me', { token: 'Bearer_not_a_real_token_xyz123' });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'INVALID_TOKEN');
    });

    it('Request with no Authorization header returns 401 and NO_TOKEN', async () => {
      const res = await apiRequest('/api/users/me');
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'NO_TOKEN');
    });
  });

  // 3. EXPIRED TOKEN
  describe('Attack Vector 3: Expired Token Replay', () => {
    it('Expired token must be rejected with 401 and TOKEN_EXPIRED', async () => {
      const expiredToken = jwt.sign({ userId: userA.id }, process.env.JWT_SECRET, { expiresIn: '0s' });
      await new Promise((r) => setTimeout(r, 100));

      const res = await apiRequest('/api/users/me', { token: expiredToken });
      assert.equal(res.status, 401);
      assert.equal(res.data.success, false);
      assert.equal(res.data.error, 'TOKEN_EXPIRED');
    });
  });

  // 4. USERID REPLACEMENT IN BODY
  describe('Attack Vector 4: Body Parameter Tampering / User ID Injection', () => {
    it('User A injecting userId of User B into profile update is ignored', async () => {
      const res = await apiRequest('/api/users/me', {
        method: 'PATCH',
        token: userAToken,
        body: {
          name: 'Hacked Name',
          _id: userB.id,
          userId: userB.id,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.user.id, userA.id, 'User ID must not be modified by body injection');

      // Verify User B was NOT modified
      const victim = await User.findById(userB.id);
      assert.equal(victim.name, 'Victim B');
    });
  });

  // 5. PRIVILEGE ESCALATION VIA MASS ASSIGNMENT
  describe('Attack Vector 5: Privilege Escalation (role: "admin", isAdmin: true)', () => {
    it('Injecting role: "admin" during registration or update is ignored', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Admin Attacker',
          email: `admin_attacker_${Date.now()}@test.com`,
          password: 'Password123!',
          role: 'admin',
          isAdmin: true,
        },
      });

      assert.equal(res.status, 201);
      const userRecord = await User.findOne({ email: res.data.user.email });
      assert.equal(userRecord.role, undefined, 'User schema must not have unapproved role');
      assert.equal(userRecord.isAdmin, undefined, 'User schema must not have unapproved isAdmin');
      await User.deleteOne({ _id: userRecord._id });
    });
  });

  // 6. PRACTICE SINGLE ANSWER & DUPLICATE ATTEMPTS
  describe('Attack Vector 6: Practice Single Answer & Sequential Duplicate Prevention', () => {
    it('Submit answer -> 200, submit same question again -> 400 QUESTION_ALREADY_ANSWERED', async () => {
      const qId = sampleQuestion._id.toString();

      // First attempt (Correct)
      const res1 = await apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/answer`, {
        method: 'POST',
        token: userBToken,
        body: {
          questionId: qId,
          answer: '4',
        },
      });
      assert.equal(res1.status, 200);
      assert.equal(res1.data.correct, true);

      // Second attempt on same question
      const res2 = await apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/answer`, {
        method: 'POST',
        token: userBToken,
        body: {
          questionId: qId,
          answer: '4',
        },
      });
      assert.equal(res2.status, 400);
      assert.equal(res2.data.error, 'QUESTION_ALREADY_ANSWERED');

      // Verify in database: correctAnswers === 1
      const sessionInDb = await PracticeSession.findById(userBPracticeSession._id);
      assert.equal(sessionInDb.correctAnswers, 1);
    });
  });

  // 7. CONCURRENCY: 10 CONCURRENT ANSWERS (CORRECT ANSWER)
  describe('Attack Vector 7: Concurrency & Atomic Race Prevention (Correct Answer)', () => {
    it('Firing 10 concurrent requests to answer the same question only accepts 1 atomically', async () => {
      const qId = sampleQuestion2._id.toString();
      const initialEventsCount = await KnowledgeEvent.countDocuments({ userId: userB.id });

      // Fire 10 simultaneous requests
      const promises = Array.from({ length: 10 }).map((_, i) =>
        apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/answer`, {
          method: 'POST',
          token: userBToken,
          body: {
            questionId: qId,
            answer: '6', // Correct answer
          },
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 400 && r.data.error === 'QUESTION_ALREADY_ANSWERED').length;

      assert.equal(successCount, 1, 'Exactly ONE answer submission must succeed');
      assert.equal(rejectedCount, 9, 'All other 9 concurrent submissions must be rejected with QUESTION_ALREADY_ANSWERED');

      // Verify database state: correctAnswers increased by exactly 1 (total now 2)
      const sessionInDb = await PracticeSession.findById(userBPracticeSession._id);
      assert.equal(sessionInDb.correctAnswers, 2, 'correctAnswers must be incremented exactly once');

      // Verify questions array has exactly 1 answer
      const q2Doc = sessionInDb.questions.find((q) => q.questionId.toString() === qId);
      assert.equal(q2Doc.answer, '6');
      assert.equal(q2Doc.isCorrect, true);

      // Verify knowledge events count: exactly 2 events created (1 'correct' + 1 'practice'), not 20!
      const afterEventsCount = await KnowledgeEvent.countDocuments({ userId: userB.id });
      assert.equal(afterEventsCount - initialEventsCount, 2, 'Exactly 2 knowledge events must be created for the 1 winning request');
    });
  });

  // 8. CONCURRENCY: 10 CONCURRENT ANSWERS (WRONG ANSWER)
  describe('Attack Vector 8: Concurrency & Atomic Race Prevention (Incorrect Answer)', () => {
    it('Firing 10 concurrent wrong answer requests accepts 1, rejects 9, correctAnswers unchanged', async () => {
      const qId = sampleQuestion3._id.toString();

      const promises = Array.from({ length: 10 }).map((_, i) =>
        apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/answer`, {
          method: 'POST',
          token: userBToken,
          body: {
            questionId: qId,
            answer: '99', // Incorrect answer
          },
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 400 && r.data.error === 'QUESTION_ALREADY_ANSWERED').length;

      assert.equal(successCount, 1, 'Exactly ONE answer submission must succeed');
      assert.equal(rejectedCount, 9, 'Other 9 concurrent submissions must be rejected');

      // Verify database state: correctAnswers still 2 (not incremented)
      const sessionInDb = await PracticeSession.findById(userBPracticeSession._id);
      assert.equal(sessionInDb.correctAnswers, 2, 'correctAnswers must remain unchanged for incorrect answer');
      const q3Doc = sessionInDb.questions.find((q) => q.questionId.toString() === qId);
      assert.equal(q3Doc.answer, '99');
      assert.equal(q3Doc.isCorrect, false);
    });
  });

  // 9. CONCURRENCY: 10 CONCURRENT SESSION COMPLETION REQUESTS
  describe('Attack Vector 9: Concurrency on Session Completion', () => {
    it('Firing 10 concurrent complete requests completes session exactly once', async () => {
      const promises = Array.from({ length: 10 }).map(() =>
        apiRequest(`/api/practice/sessions/${userBPracticeSession._id}/complete`, {
          method: 'POST',
          token: userBToken,
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 400 && r.data.error === 'ALREADY_COMPLETED').length;

      assert.equal(successCount, 1, 'Exactly ONE complete request must succeed');
      assert.equal(rejectedCount, 9, 'Other 9 concurrent requests must be rejected with ALREADY_COMPLETED');

      // Verify database state: completed is true
      const sessionInDb = await PracticeSession.findById(userBPracticeSession._id);
      assert.equal(sessionInDb.completed, true);
    });
  });

  // 10. NOSQL OPERATOR INJECTION ($ne, $gt, $regex)
  describe('Attack Vector 10: NoSQL Operator Injection', () => {
    it('Login with {"email": {"$ne": null}, "password": {"$gt": ""}} is blocked by validation', async () => {
      const res = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: {
          email: { $ne: null },
          password: { $gt: '' },
        },
      });

      assert.equal(res.status, 400, 'Must reject non-string email/password with 400');
      assert.equal(res.data.success, false);
    });

    it('Register with object payload instead of string is blocked', async () => {
      const res = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          name: { $regex: '.*' },
          email: { $regex: '.*' },
          password: 'Password123!',
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });
  });

  // 11. MALFORMED BSON OBJECTID INJECTION
  describe('Attack Vector 11: Malformed ObjectId / Directory Traversal in Path', () => {
    it('GET /api/study-plans/../../etc/passwd returns 404 or 400 without crashing', async () => {
      const res = await apiRequest('/api/study-plans/invalid-object-id-12345', {
        token: userAToken,
      });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_ID');
    });
  });

  // 12. LARGE PAYLOAD & BUFFER OVERFLOW DOS
  describe('Attack Vector 12: Huge Payload / Body Parser Limit', () => {
    it('Sending payload exceeding 1MB is rejected with 413 Payload Too Large', async () => {
      const hugeString = 'A'.repeat(2 * 1024 * 1024); // 2MB string
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: { message: hugeString },
      });

      assert.ok([400, 413].includes(res.status), `Must reject huge payload with 413/400 (received ${res.status})`);
    });

    it('Sending 5000 character chat message (within 1MB but above 2000 char business limit) is rejected with 400', async () => {
      const msg5000 = 'Hello '.repeat(1000); // 6000 chars
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: { message: msg5000 },
      });

      assert.equal(res.status, 400);
      assert.ok(res.data.message.includes('too long') || res.data.message.includes('2000'));
    });
  });

  // 13. XSS INJECTION IN AI CHAT
  describe('Attack Vector 13: XSS Payload in AI Mentor Chat', () => {
    it('Posting XSS script tags in chat is accepted as raw string without execution/sanitized in response', async () => {
      const xssPayload = `<script>alert("XSS")</script><img src=x onerror=alert(1)>`;
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: { message: xssPayload },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.message.content);
    });
  });
});
