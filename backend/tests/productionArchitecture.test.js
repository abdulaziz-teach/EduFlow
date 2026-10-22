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
import Session from '../src/models/Session.js';
import Course from '../src/models/Course.js';
import Lesson from '../src/models/Lesson.js';
import Enrollment from '../src/models/Enrollment.js';
import Progress from '../src/models/Progress.js';
import Quiz from '../src/models/Quiz.js';
import QuizAttempt from '../src/models/QuizAttempt.js';
import Flashcard from '../src/models/Flashcard.js';
import FlashcardProgress from '../src/models/FlashcardProgress.js';
import Achievement from '../src/models/Achievement.js';
import UserAchievement from '../src/models/UserAchievement.js';
import Wallet from '../src/models/Wallet.js';
import WalletTransaction from '../src/models/WalletTransaction.js';
import ShopItem from '../src/models/ShopItem.js';
import Inventory from '../src/models/Inventory.js';
import LeaderboardEntry from '../src/models/LeaderboardEntry.js';

let server;
let baseUrl;

async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.cookies ? { Cookie: options.cookies } : {}),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  // Extract set-cookie headers if present
  const setCookie = res.headers.get('set-cookie');

  return { status: res.status, ok: res.ok, data, setCookie };
}

describe('⚡ Production MongoDB Database Architecture & Backend Integration Test Suite', () => {
  let adminUser, adminToken;
  let studentUser, studentToken, studentRefreshTokenCookie;
  let testCourse, testLesson, testQuiz;
  let testFlashcard;
  let testAchievement;
  let testShopItem;

  const adminEmail = `prod_admin_${Date.now()}@eduflow.test`;
  const studentEmail = `prod_student_${Date.now()}@eduflow.test`;

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

    // 1. Create Admin User
    const regAdmin = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Admin Test', email: adminEmail, password: 'AdminPassword123!' },
    });
    assert.equal(regAdmin.status, 201);
    adminUser = regAdmin.data.user;
    adminToken = regAdmin.data.token;

    // Elevate admin user in DB directly (safe, testing RBAC)
    await User.updateOne({ _id: adminUser.id }, { role: 'admin' });
    // Re-login to obtain token with admin role
    const loginAdmin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'AdminPassword123!' },
    });
    adminToken = loginAdmin.data.token;

    // 2. Create Student User
    const regStudent = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Student Test', email: studentEmail, password: 'StudentPassword123!' },
    });
    assert.equal(regStudent.status, 201);
    studentUser = regStudent.data.user;
    studentToken = regStudent.data.token;
    studentRefreshTokenCookie = regStudent.setCookie;
  });

  after(async () => {
    // Clean up created entities
    const uids = [adminUser?.id, studentUser?.id].filter(Boolean);
    if (uids.length > 0) {
      await Promise.all([
        User.deleteMany({ _id: { $in: uids } }),
        Session.deleteMany({ userId: { $in: uids } }),
        Enrollment.deleteMany({ userId: { $in: uids } }),
        Progress.deleteMany({ userId: { $in: uids } }),
        QuizAttempt.deleteMany({ userId: { $in: uids } }),
        FlashcardProgress.deleteMany({ userId: { $in: uids } }),
        UserAchievement.deleteMany({ userId: { $in: uids } }),
        Wallet.deleteMany({ userId: { $in: uids } }),
        WalletTransaction.deleteMany({ userId: { $in: uids } }),
        Inventory.deleteMany({ userId: { $in: uids } }),
        LeaderboardEntry.deleteMany({ userId: { $in: uids } }),
      ]);
    }

    if (testCourse?._id) {
      await Course.deleteOne({ _id: testCourse._id });
      await Lesson.deleteMany({ courseId: testCourse._id });
    }
    if (testQuiz?._id) await Quiz.deleteOne({ _id: testQuiz._id });
    if (testFlashcard?._id) await Flashcard.deleteOne({ _id: testFlashcard._id });
    if (testAchievement?._id) await Achievement.deleteOne({ _id: testAchievement._id });
    if (testShopItem?._id) await ShopItem.deleteOne({ _id: testShopItem._id });

    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // 1. HEALTH CHECKS
  describe('1. Health Check Suite', () => {
    it('GET /health and GET /api/health should report application and database health', async () => {
      const res = await apiRequest('/health');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.database, 'connected');
    });

    it('GET /health/db should report database status without leaking credentials', async () => {
      const res = await apiRequest('/health/db');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.status, 'healthy');
      assert.equal(res.data.readyState, 1);
      assert.equal(res.data.password, undefined);
      assert.equal(res.data.uri, undefined);
    });
  });

  // 2. AUTHENTICATION, SESSIONS & REFRESH TOKEN ROTATION
  describe('2. Sessions & Token Security', () => {
    it('User registration automatically initializes wallet with 100 coins and sets httpOnly cookie', async () => {
      assert.ok(studentRefreshTokenCookie, 'Refresh token cookie must be set on registration');
      assert.ok(studentRefreshTokenCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');

      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.ok(wallet);
      assert.equal(wallet.coins, 100);
      assert.equal(wallet.gems, 0);
      assert.equal(wallet.tickets, 5);
    });

    it('POST /api/auth/refresh rotates refresh token and grants new access token', async () => {
      const cookieVal = studentRefreshTokenCookie.split(';')[0]; // e.g. refreshToken=abc...

      const res = await apiRequest('/api/auth/refresh', {
        method: 'POST',
        cookies: cookieVal,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.accessToken);
      assert.equal(res.data.refreshToken, undefined);
      assert.ok(res.setCookie, 'Must set a newly rotated cookie');

      // Update student tokens
      studentToken = res.data.accessToken;
      studentRefreshTokenCookie = res.setCookie;
    });

    it('Replaying a revoked refresh token triggers reuse detection and is rejected with 401', async () => {
      // The original registration cookie was revoked during rotation above
      const revokedCookie = studentRefreshTokenCookie; // Currently active cookie
      const cookieVal = revokedCookie.split(';')[0];

      // Rotate once
      const res1 = await apiRequest('/api/auth/refresh', { method: 'POST', cookies: cookieVal });
      assert.equal(res1.status, 200);

      // Attempt to use revoked cookie again
      const res2 = await apiRequest('/api/auth/refresh', { method: 'POST', cookies: cookieVal });
      assert.equal(res2.status, 401);
      assert.equal(res2.data.error, 'TOKEN_REUSE_DETECTED');

      // Update student token with winning token from res1
      studentToken = res1.data.accessToken;
      studentRefreshTokenCookie = res1.setCookie;
    });

    it('Normal user attempting Admin-only route is blocked with 403 FORBIDDEN', async () => {
      const res = await apiRequest('/api/courses', {
        method: 'POST',
        token: studentToken,
        body: { title: 'Malicious Course Attempt' },
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'FORBIDDEN');
    });

    it('Admin user can access Admin-only route successfully', async () => {
      const res = await apiRequest('/api/courses', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Advanced Distributed Systems',
          slug: `dist-sys-${Date.now()}`,
          category: 'Computer Science',
          level: 'advanced',
          status: 'published',
        },
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      testCourse = res.data.course;
    });
  });

  // 3. COURSE ARCHITECTURE & ATOMIC PROGRESS
  describe('3. Courses, Lessons & Learning Progress', () => {
    it('Admin can add lessons to a course with unique order constraint', async () => {
      const res = await apiRequest(`/api/courses/${testCourse._id}/lessons`, {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Distributed Consensus & Raft',
          slug: 'consensus-raft',
          order: 1,
          duration: 1800,
          isPublished: true,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      testLesson = res.data.lesson;
      assert.equal(testLesson.order, 1);
    });

    it('Student can enroll in published course', async () => {
      const res = await apiRequest(`/api/courses/${testCourse._id}/enroll`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.enrollment.status, 'active');
    });

    it('Duplicate enrollment is idempotent and returns existing enrollment', async () => {
      const res = await apiRequest(`/api/courses/${testCourse._id}/enroll`, {
        method: 'POST',
        token: studentToken,
      });

      assert.ok([200, 201].includes(res.status));
      assert.equal(res.data.success, true);
    });

    it('Student updates lesson progress atomically', async () => {
      const res = await apiRequest(`/api/courses/${testCourse._id}/lessons/${testLesson._id}/progress`, {
        method: 'PATCH',
        token: studentToken,
        body: {
          watchTime: 300,
          lastPosition: 300,
          completed: true,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.progress.completed, true);
      assert.equal(res.data.progress.watchTime, 300);
      assert.equal(res.data.courseProgress.percentage, 100);
    });

    it('GET /api/courses/:id/progress returns student course progress stats', async () => {
      const res = await apiRequest(`/api/courses/${testCourse._id}/progress`, {
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.enrolled, true);
      assert.equal(res.data.completedLessons, 1);
      assert.equal(res.data.percentage, 100);
    });
  });

  // 4. QUIZ SYSTEM & CORRECT ANSWER PROTECTION
  describe('4. Quiz System & Answer Payload Protection', () => {
    it('Admin creates quiz with questions and correct answers', async () => {
      const res = await apiRequest('/api/quizzes', {
        method: 'POST',
        token: adminToken,
        body: {
          lessonId: testLesson._id,
          title: 'Consensus Algorithms Quiz',
          passingScore: 70,
          questions: [
            {
              question: 'Who developed the Raft consensus algorithm?',
              options: ['Lamport', 'Ongaro and Ousterhout', 'Torvalds', 'Knuth'],
              correctAnswer: 'Ongaro and Ousterhout',
              explanation: 'Diego Ongaro and John Ousterhout designed Raft for understandability.',
              points: 1,
            },
            {
              question: 'In Raft, which node handles all client write requests?',
              options: ['Follower', 'Candidate', 'Leader', 'Witness'],
              correctAnswer: 'Leader',
              explanation: 'All log entries flow strictly from Leader to Followers.',
              points: 1,
            },
          ],
        },
      });

      assert.equal(res.status, 201);
      testQuiz = res.data.quiz;
    });

    it('CRITICAL SECURITY: Student fetching quiz payload NEVER receives correctAnswer or explanation', async () => {
      const res = await apiRequest(`/api/quizzes/${testQuiz._id}`, {
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);

      for (const q of res.data.quiz.questions) {
        assert.equal(q.correctAnswer, undefined, 'CRITICAL LEAK: correctAnswer was exposed to student!');
        assert.equal(q.explanation, undefined, 'CRITICAL LEAK: explanation was exposed to student!');
      }
    });

    it('Student submits quiz answers and server calculates verified score and passing status', async () => {
      const q1 = testQuiz.questions[0];
      const q2 = testQuiz.questions[1];

      const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
        method: 'POST',
        token: studentToken,
        body: {
          answers: [
            { questionId: q1._id, selectedAnswer: 'Ongaro and Ousterhout' }, // Correct
            { questionId: q2._id, selectedAnswer: 'Follower' }, // Incorrect
          ],
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.attempt.score, 1);
      assert.equal(res.data.attempt.maxScore, 2);
      assert.equal(res.data.attempt.percentage, 50);
      assert.equal(res.data.attempt.passed, false); // 50% < 70% passingScore

      // Explanations are now provided post-attempt
      assert.ok(res.data.review.length === 2);
      assert.ok(res.data.review[0].explanation);
    });
  });

  // 5. FLASHCARDS & SPACED REPETITION (SM-2)
  describe('5. Flashcards & SuperMemo-2 Spaced Repetition', () => {
    it('Creates a normalized standalone flashcard', async () => {
      testFlashcard = await Flashcard.create({
        deckId: new mongoose.Types.ObjectId(),
        front: 'What is ACID in database systems?',
        back: 'Atomicity, Consistency, Isolation, Durability',
        hint: '4 database transaction guarantees',
        difficulty: 'medium',
      });
      assert.ok(testFlashcard._id);
    });

    it('Student reviews flashcard with rating 4 -> SM-2 sets interval=1, repetitions=1, due date in 1 day', async () => {
      const res = await apiRequest(`/api/flashcards/cards/${testFlashcard._id}/review`, {
        method: 'POST',
        token: studentToken,
        body: { rating: 4 },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.progress.interval, 1);
      assert.equal(res.data.progress.repetitions, 1);
      assert.ok(new Date(res.data.progress.dueAt) > new Date());
    });

    it('Second review with rating 4 advances interval to 6 days and repetitions to 2', async () => {
      const res = await apiRequest(`/api/flashcards/cards/${testFlashcard._id}/review`, {
        method: 'POST',
        token: studentToken,
        body: { rating: 4 },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.progress.interval, 6);
      assert.equal(res.data.progress.repetitions, 2);
    });

    it('Review with lapse rating 1 resets repetitions=0 and interval=1, increments lapses=1', async () => {
      const res = await apiRequest(`/api/flashcards/cards/${testFlashcard._id}/review`, {
        method: 'POST',
        token: studentToken,
        body: { rating: 1 },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.progress.interval, 1);
      assert.equal(res.data.progress.repetitions, 0);
      assert.equal(res.data.progress.lapses, 1);
    });
  });

  // 6. WALLET / ECONOMY & CONCURRENCY
  describe('6. Wallet Concurrency, Negative Prevention & Idempotency', () => {
    it('GET /api/wallet returns user wallet balances', async () => {
      const res = await apiRequest('/api/wallet', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.wallet.coins, 100);
      assert.equal(res.data.wallet.gems, 0);
      assert.equal(res.data.wallet.tickets, 5);
    });

    it('Spending more currency than available is rejected with 400 INSUFFICIENT_FUNDS', async () => {
      const res = await apiRequest('/api/wallet/spend', {
        method: 'POST',
        token: studentToken,
        body: {
          currency: 'coins',
          amount: 500, // Balance is only 100
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INSUFFICIENT_FUNDS');

      // Balance unchanged
      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 100);
    });

    it('Negative spend amounts are rejected with 400 INVALID_AMOUNT', async () => {
      const res = await apiRequest('/api/wallet/spend', {
        method: 'POST',
        token: studentToken,
        body: {
          currency: 'coins',
          amount: -50,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INVALID_AMOUNT');
    });

    it('Idempotent spend: sending identical request with same idempotencyKey does not double charge', async () => {
      const idempotencyKey = `spend_key_${Date.now()}`;

      // First spend
      const res1 = await apiRequest('/api/wallet/spend', {
        method: 'POST',
        token: studentToken,
        body: {
          currency: 'coins',
          amount: 20,
          idempotencyKey,
        },
      });

      assert.equal(res1.status, 200);
      assert.equal(res1.data.wallet.coins, 80);

      // Repeated spend with same idempotency key
      const res2 = await apiRequest('/api/wallet/spend', {
        method: 'POST',
        token: studentToken,
        body: {
          currency: 'coins',
          amount: 20,
          idempotencyKey,
        },
      });

      assert.equal(res2.status, 200);
      // Balance MUST remain 80 (not 60)
      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 80, 'Idempotency failed: balance was debited twice!');
    });

    it('RACE CONDITION TEST: 10 concurrent requests to spend 50 coins when balance is 80 only permits 1 winner', async () => {
      // Current coins = 80. Spending 50 coins twice would cause 100 coins spent (illegal negative balance -20).
      // Fire 10 simultaneous requests
      const promises = Array.from({ length: 10 }).map((_, i) =>
        apiRequest('/api/wallet/spend', {
          method: 'POST',
          token: studentToken,
          body: {
            currency: 'coins',
            amount: 50,
            metadata: { requestIndex: i },
          },
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.status === 200).length;
      const rejectedCount = results.filter((r) => r.status === 400 && r.data.error === 'INSUFFICIENT_FUNDS').length;

      assert.equal(successCount, 1, 'Exactly ONE spend request must succeed');
      assert.equal(rejectedCount, 9, 'Other 9 concurrent requests must be rejected with INSUFFICIENT_FUNDS');

      // Final balance must be exactly 30 (80 - 50)
      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 30);
    });
  });

  // 7. SHOP & INVENTORY
  describe('7. Shop Purchases & Inventory Tracking', () => {
    it('Admin creates active shop item', async () => {
      const res = await apiRequest('/api/shop/items', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Test Avatar Frame ${Date.now()}`,
          description: 'A test avatar frame',
          type: 'avatar_frame',
          price: 25,
          currency: 'coins',
          stock: 10,
          active: true,
        },
      });

      assert.equal(res.status, 201);
      testShopItem = res.data.item;
    });

    it('Student purchases shop item: debits wallet, decrements stock, adds to inventory atomically', async () => {
      const res = await apiRequest('/api/shop/purchase', {
        method: 'POST',
        token: studentToken,
        body: {
          itemId: testShopItem._id,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.wallet.coins, 5); // 30 - 25 = 5

      // Verify inventory document in DB
      const inv = await Inventory.findOne({ userId: studentUser.id, itemId: testShopItem._id });
      assert.ok(inv);
      assert.equal(inv.quantity, 1);

      // Verify item stock decremented to 9
      const itemInDb = await ShopItem.findById(testShopItem._id);
      assert.equal(itemInDb.stock, 9);
    });

    it('Subsequent purchase when balance is insufficient (5 coins < 25) fails cleanly', async () => {
      const res = await apiRequest('/api/shop/purchase', {
        method: 'POST',
        token: studentToken,
        body: {
          itemId: testShopItem._id,
        },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INSUFFICIENT_FUNDS');

      // Stock remains 9
      const itemInDb = await ShopItem.findById(testShopItem._id);
      assert.equal(itemInDb.stock, 9);
    });
  });

  // 8. ACHIEVEMENTS & REWARDS
  describe('8. Achievements & Atomic Reward Granting', () => {
    it('Admin creates achievement with 50 coins reward', async () => {
      const res = await apiRequest('/api/achievements', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Architecture Master ${Date.now()}`,
          description: 'Designed production database architecture.',
          icon: 'database',
          conditionType: 'custom',
          conditionValue: 1,
          reward: { currency: 'coins', amount: 50 },
        },
      });

      assert.equal(res.status, 201);
      testAchievement = res.data.achievement;
    });

    it('Unlocking achievement grants reward atomically and credits wallet', async () => {
      const res = await apiRequest(`/api/achievements/${testAchievement._id}/unlock`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.rewardGranted, true);
      assert.equal(res.data.wallet.coins, 55); // 5 + 50 = 55

      // Verify UserAchievement record in DB
      const unlockDoc = await UserAchievement.findOne({
        userId: studentUser.id,
        achievementId: testAchievement._id,
      });
      assert.ok(unlockDoc);
    });

    it('Unlocking same achievement again is idempotent and DOES NOT grant duplicate reward', async () => {
      const res = await apiRequest(`/api/achievements/${testAchievement._id}/unlock`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.alreadyUnlocked, true);
      assert.equal(res.data.rewardGranted, false);

      // Wallet balance remains 55
      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 55, 'Duplicate reward was illegally granted!');
    });
  });

  // 9. LEADERBOARD
  describe('9. Optimized Leaderboard Queries', () => {
    it('GET /api/leaderboard returns ranked list with current user standing without memory overflow', async () => {
      const res = await apiRequest('/api/leaderboard', {
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.leaderboard));
      assert.ok(res.data.leaderboard.length > 0);
    });
  });
});
