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
import Notification from '../src/models/Notification.js';
import AIConversation from '../src/models/AIConversation.js';
import AIMessage from '../src/models/AIMessage.js';
import LeaderboardEntry from '../src/models/LeaderboardEntry.js';

let server;
let baseUrl;

async function api(endpoint, options = {}) {
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
    // non-json
  }

  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, data, setCookie };
}

describe('🚀 Phase 16: Complete System-Wide E2E Testing & Launch Certification Suite', () => {
  let adminUser, adminToken;
  let studentUser, studentToken, studentRefreshTokenCookie;
  let activeCourse, activeLesson, activeQuiz;
  let activeFlashcard;
  let activeAchievement;
  let activeShopItem;

  const timestamp = Date.now();
  const adminEmail = `e2e_admin_${timestamp}@eduflow.test`;
  const studentEmail = `e2e_student_${timestamp}@eduflow.test`;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });

    // 1. Setup Admin Account
    const regAdmin = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'E2E Administrator', email: adminEmail, password: 'AdminPassword123!' },
    });
    assert.equal(regAdmin.status, 201);
    adminUser = regAdmin.data.user;

    await User.updateOne({ _id: adminUser.id }, { role: 'admin' });
    const logAdmin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'AdminPassword123!' },
    });
    adminToken = logAdmin.data.token;
  });

  after(async () => {
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
        Notification.deleteMany({ userId: { $in: uids } }),
        AIConversation.deleteMany({ userId: { $in: uids } }),
        AIMessage.deleteMany({ userId: { $in: uids } }),
        LeaderboardEntry.deleteMany({ userId: { $in: uids } }),
      ]);
    }

    if (activeCourse?._id) {
      await Course.deleteOne({ _id: activeCourse._id });
      await Lesson.deleteMany({ courseId: activeCourse._id });
    }
    if (activeQuiz?._id) await Quiz.deleteOne({ _id: activeQuiz._id });
    if (activeFlashcard?._id) await Flashcard.deleteOne({ _id: activeFlashcard._id });
    if (activeAchievement?._id) await Achievement.deleteOne({ _id: activeAchievement._id });
    if (activeShopItem?._id) await ShopItem.deleteOne({ _id: activeShopItem._id });

    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  // 1. FRESH USER LIFECYCLE
  describe('1. Fresh User Lifecycle & Registration Verification', () => {
    it('Creates brand new student account with hashed password and initialized economy balance', async () => {
      const res = await api('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Sarah Connor',
          email: studentEmail,
          password: 'SecurePassword123!',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.token);
      assert.ok(res.setCookie, 'httpOnly refresh token cookie must be issued');

      studentUser = res.data.user;
      studentToken = res.data.token;
      studentRefreshTokenCookie = res.setCookie;

      // Verify DB record
      const dbUser = await User.findById(studentUser.id).select('+passwordHash');
      assert.ok(dbUser);
      assert.equal(dbUser.email, studentEmail.toLowerCase());
      assert.ok(dbUser.passwordHash.startsWith('$2'), 'Password must be bcrypt hashed');
      assert.equal(dbUser.password, undefined);

      // Verify Wallet Auto-Provisioning
      const dbWallet = await Wallet.findOne({ userId: studentUser.id });
      assert.ok(dbWallet);
      assert.equal(dbWallet.coins, 100);
      assert.equal(dbWallet.gems, 0);
      assert.equal(dbWallet.tickets, 5);
    });

    it('Verifies user email status', async () => {
      await User.updateOne({ _id: studentUser.id }, { emailVerified: true });
      const updated = await User.findById(studentUser.id);
      assert.equal(updated.emailVerified, true);
    });

    it('Logs in user and updates lastLoginAt', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email: studentEmail, password: 'SecurePassword123!' },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      studentToken = res.data.token;
      studentRefreshTokenCookie = res.setCookie;

      const userInDb = await User.findById(studentUser.id);
      assert.ok(userInDb.lastLoginAt instanceof Date);
    });
  });

  // 2. ADMIN SETUP & COURSE DISCOVERY
  describe('2. Admin Content Publishing & Course Discovery', () => {
    it('Admin creates course and adds published lessons', async () => {
      const cRes = await api('/api/courses', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Full-Stack Distributed Systems',
          slug: `distributed-systems-${timestamp}`,
          description: 'Learn scalable cloud architecture and database design.',
          category: 'Computer Science',
          level: 'advanced',
          status: 'published',
        },
      });

      assert.equal(cRes.status, 201);
      activeCourse = cRes.data.course;

      const lRes = await api(`/api/courses/${activeCourse._id}/lessons`, {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Raft Consensus Protocol',
          slug: 'raft-consensus',
          description: 'Master leader election and log replication.',
          content: 'Detailed Raft guide...',
          order: 1,
          duration: 900,
          isPublished: true,
        },
      });

      assert.equal(lRes.status, 201);
      activeLesson = lRes.data.lesson;
    });

    it('Student discovers published course in catalog', async () => {
      const res = await api('/api/courses', { token: studentToken });
      assert.equal(res.status, 200);
      const found = res.data.courses.some((c) => c._id === activeCourse._id);
      assert.equal(found, true);
    });
  });

  // 3. COURSE ENROLLMENT & LESSON COMPLETION
  describe('3. Course Enrollment & Progress Tracking Flow', () => {
    it('Student enrolls in course', async () => {
      const res = await api(`/api/courses/${activeCourse._id}/enroll`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.enrollment.status, 'active');
    });

    it('Student updates lesson progress and completes lesson', async () => {
      const res = await api(`/api/courses/${activeCourse._id}/lessons/${activeLesson._id}/progress`, {
        method: 'PATCH',
        token: studentToken,
        body: {
          watchTime: 900,
          lastPosition: 900,
          completed: true,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.progress.completed, true);
      assert.equal(res.data.courseProgress.percentage, 100);

      // Verify in DB
      const pDoc = await Progress.findOne({ userId: studentUser.id, lessonId: activeLesson._id });
      assert.ok(pDoc);
      assert.equal(pDoc.completed, true);
      assert.equal(pDoc.watchTime, 900);
    });
  });

  // 4. QUIZ FLOW & ANSWER PROTECTION
  describe('4. Assessment Flow & Verified Scoring', () => {
    it('Admin creates quiz for lesson', async () => {
      const res = await api('/api/quizzes', {
        method: 'POST',
        token: adminToken,
        body: {
          lessonId: activeLesson._id,
          title: 'Raft Understanding Check',
          passingScore: 80,
          questions: [
            {
              question: 'Who design Raft?',
              options: ['Ongaro & Ousterhout', 'Lamport', 'Liskov'],
              correctAnswer: 'Ongaro & Ousterhout',
              explanation: 'Stanford researchers created Raft.',
              points: 1,
            },
            {
              question: 'Does Raft guarantee linearizability?',
              options: ['Yes', 'No', 'Only with Paxos'],
              correctAnswer: 'Yes',
              explanation: 'Linearizable reads and writes are guaranteed.',
              points: 1,
            },
          ],
        },
      });

      assert.equal(res.status, 201);
      activeQuiz = res.data.quiz;
    });

    it('Student retrieves quiz: correctAnswer & explanation MUST NOT exist in payload', async () => {
      const res = await api(`/api/quizzes/${activeQuiz._id}`, { token: studentToken });
      assert.equal(res.status, 200);

      for (const q of res.data.quiz.questions) {
        assert.equal(q.correctAnswer, undefined, 'CRITICAL LEAK: correctAnswer exposed to student!');
        assert.equal(q.explanation, undefined, 'CRITICAL LEAK: explanation exposed to student!');
      }
    });

    it('Student submits quiz answers; server calculates verified score and passing state', async () => {
      const q1 = activeQuiz.questions[0];
      const q2 = activeQuiz.questions[1];

      const res = await api(`/api/quizzes/${activeQuiz._id}/attempt`, {
        method: 'POST',
        token: studentToken,
        body: {
          answers: [
            { questionId: q1._id, selectedAnswer: 'Ongaro & Ousterhout' },
            { questionId: q2._id, selectedAnswer: 'Yes' },
          ],
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.attempt.score, 2);
      assert.equal(res.data.attempt.maxScore, 2);
      assert.equal(res.data.attempt.percentage, 100);
      assert.equal(res.data.attempt.passed, true);

      // Verify Attempt in DB
      const attemptInDb = await QuizAttempt.findOne({ userId: studentUser.id, quizId: activeQuiz._id });
      assert.ok(attemptInDb);
      assert.equal(attemptInDb.passed, true);
    });
  });

  // 5. FLASHCARDS & SPACED REPETITION (SM-2)
  describe('5. Flashcards & Spaced Repetition (SM-2)', () => {
    it('Creates standalone flashcard and records user SM-2 review', async () => {
      activeFlashcard = await Flashcard.create({
        deckId: new mongoose.Types.ObjectId(),
        front: 'What is quorum in distributed systems?',
        back: 'The minimum number of votes required for an operation to be valid (usually N/2 + 1).',
        difficulty: 'medium',
      });

      const res = await api(`/api/flashcards/cards/${activeFlashcard._id}/review`, {
        method: 'POST',
        token: studentToken,
        body: { rating: 5 },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.progress.interval, 1);
      assert.equal(res.data.progress.repetitions, 1);
      assert.ok(res.data.progress.easeFactor >= 2.5);

      // Verify in DB
      const srsDoc = await FlashcardProgress.findOne({
        userId: studentUser.id,
        flashcardId: activeFlashcard._id,
      });
      assert.ok(srsDoc);
      assert.equal(srsDoc.repetitions, 1);
    });
  });

  // 6. ACHIEVEMENTS & GAMIFICATION
  describe('6. Achievements & Atomic Reward Claim', () => {
    it('Admin creates achievement and student unlocks it with wallet credit', async () => {
      activeAchievement = await Achievement.create({
        name: `Distributed Maestro ${timestamp}`,
        description: 'Passed Raft consensus exam with 100%.',
        icon: 'trophy',
        conditionType: 'custom',
        conditionValue: 1,
        reward: { currency: 'coins', amount: 50 },
      });

      const res = await api(`/api/achievements/${activeAchievement._id}/unlock`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.rewardGranted, true);
      assert.equal(res.data.wallet.coins, 150); // 100 + 50 = 150

      // DB verification
      const userAch = await UserAchievement.findOne({
        userId: studentUser.id,
        achievementId: activeAchievement._id,
      });
      assert.ok(userAch);
    });

    it('Repeated claim request is idempotent: DOES NOT grant duplicate coins', async () => {
      const res = await api(`/api/achievements/${activeAchievement._id}/unlock`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.alreadyUnlocked, true);
      assert.equal(res.data.rewardGranted, false);

      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 150, 'Duplicate reward was illegally granted!');
    });
  });

  // 7. SHOP & ECONOMY E2E
  describe('7. Shop Purchases, Wallet Ledger & Inventory', () => {
    it('Admin creates active shop item', async () => {
      activeShopItem = await ShopItem.create({
        name: `Cyber Hologram Avatar ${timestamp}`,
        description: 'Futuristic avatar style.',
        type: 'avatar_frame',
        price: 30,
        currency: 'coins',
        stock: 5,
        active: true,
      });
    });

    it('Student purchases item: debits wallet, creates inventory, logs transaction', async () => {
      const res = await api('/api/shop/purchase', {
        method: 'POST',
        token: studentToken,
        body: { itemId: activeShopItem._id },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.wallet.coins, 120); // 150 - 30 = 120

      // Verify Inventory in DB
      const inv = await Inventory.findOne({ userId: studentUser.id, itemId: activeShopItem._id });
      assert.ok(inv);
      assert.equal(inv.quantity, 1);

      // Verify Transaction in DB
      const tx = await WalletTransaction.findOne({
        userId: studentUser.id,
        type: 'purchase',
        referenceId: activeShopItem._id.toString(),
      });
      assert.ok(tx);
      assert.equal(Math.abs(tx.amount), 30);
      assert.equal(tx.balanceAfter, 120);
    });

    it('Insufficient funds: purchasing item priced at 500 coins fails cleanly with balance intact', async () => {
      const expensiveItem = await ShopItem.create({
        name: `Legendary Crown ${timestamp}`,
        type: 'theme',
        price: 500,
        currency: 'coins',
        active: true,
      });

      const res = await api('/api/shop/purchase', {
        method: 'POST',
        token: studentToken,
        body: { itemId: expensiveItem._id },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'INSUFFICIENT_FUNDS');

      const wallet = await Wallet.findOne({ userId: studentUser.id });
      assert.equal(wallet.coins, 120, 'Balance must remain unchanged');
      await ShopItem.deleteOne({ _id: expensiveItem._id });
    });
  });

  // 8. LEADERBOARD & NOTIFICATIONS
  describe('8. Leaderboard & Notification Dispatch', () => {
    it('Records leaderboard entry and queries ranked standings', async () => {
      await LeaderboardEntry.findOneAndUpdate(
        { userId: studentUser.id, period: 'allTime' },
        { score: 250, rank: 1 },
        { upsert: true }
      );

      const res = await api('/api/leaderboard?period=allTime', { token: studentToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.leaderboard));
    });

    it('Dispatches notification and marks it as read', async () => {
      const notif = await Notification.create({
        userId: studentUser.id,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'You earned 50 coins.',
      });

      const listRes = await api('/api/notifications', { token: studentToken });
      assert.equal(listRes.status, 200);
      assert.ok(listRes.data.notifications.length > 0);

      const readRes = await api(`/api/notifications/${notif._id}/read`, {
        method: 'PATCH',
        token: studentToken,
      });
      assert.equal(readRes.status, 200);
      assert.equal(readRes.data.notification.read, true);
    });
  });

  // 9. AI MENTOR CONVERSATION
  describe('9. AI Mentor Conversations & Message Persistence', () => {
    it('Starts conversation and sends message to AI Mentor', async () => {
      const msgRes = await api('/api/mentor/chat', {
        method: 'POST',
        token: studentToken,
        body: {
          message: 'Can Raft handle Byzantine faults?',
          subject: 'Distributed Systems',
        },
      });
      assert.equal(msgRes.status, 200);
      assert.ok(msgRes.data.message.content);
      const conversationId = msgRes.data.conversation.id;

      // Verify conversation in DB
      const conv = await AIConversation.findById(conversationId);
      assert.ok(conv);

      // Verify messages in DB
      const messages = await AIMessage.find({ conversationId });
      assert.ok(messages.length >= 2); // user + assistant
    });
  });

  // 10. SESSION ROTATION, LOGOUT & RELOGIN PERSISTENCE
  describe('10. Session Rotation, Logout & Relogin Persistence', () => {
    it('Rotates session token via /api/auth/refresh', async () => {
      const cookieVal = studentRefreshTokenCookie.split(';')[0];
      const res = await api('/api/auth/refresh', {
        method: 'POST',
        cookies: cookieVal,
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.accessToken);
      studentToken = res.data.accessToken;
      studentRefreshTokenCookie = res.setCookie;
    });

    it('Logs out student and revokes active session', async () => {
      const cookieVal = studentRefreshTokenCookie.split(';')[0];
      const res = await api('/api/auth/logout', {
        method: 'POST',
        cookies: cookieVal,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('Logs in again: confirms all data (courses, progress, wallet, inventory) persists in MongoDB', async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { email: studentEmail, password: 'SecurePassword123!' },
      });

      assert.equal(res.status, 200);
      const newAuthToken = res.data.token;

      // Verify Course Progress
      const pRes = await api(`/api/courses/${activeCourse._id}/progress`, { token: newAuthToken });
      assert.equal(pRes.status, 200);
      assert.equal(pRes.data.percentage, 100);

      // Verify Wallet Balance
      const wRes = await api('/api/wallet', { token: newAuthToken });
      assert.equal(wRes.status, 200);
      assert.equal(wRes.data.wallet.coins, 120);

      // Verify Inventory
      const iRes = await api('/api/shop/inventory', { token: newAuthToken });
      assert.equal(iRes.status, 200);
      assert.equal(iRes.data.inventory.length, 1);
    });
  });

  // 11. DATA CONSISTENCY & INTEGRITY AUDIT
  describe('11. Database Referential Integrity & Orphan Check', () => {
    it('Verifies zero orphan documents or dangling references across collections', async () => {
      // 1. All enrollments have existing users and courses
      const enrollments = await Enrollment.find({ userId: studentUser.id });
      for (const e of enrollments) {
        const u = await User.findById(e.userId);
        const c = await Course.findById(e.courseId);
        assert.ok(u, 'Enrollment must reference valid User');
        assert.ok(c, 'Enrollment must reference valid Course');
      }

      // 2. All wallet transactions have existing user and wallet
      const txs = await WalletTransaction.find({ userId: studentUser.id });
      for (const t of txs) {
        const u = await User.findById(t.userId);
        const w = await Wallet.findById(t.walletId);
        assert.ok(u, 'Transaction must reference valid User');
        assert.ok(w, 'Transaction must reference valid Wallet');
      }

      // 3. All inventories have existing user and shop item
      const invs = await Inventory.find({ userId: studentUser.id });
      for (const inv of invs) {
        const u = await User.findById(inv.userId);
        const item = await ShopItem.findById(inv.itemId);
        assert.ok(u, 'Inventory must reference valid User');
        assert.ok(item, 'Inventory must reference valid ShopItem');
      }
    });
  });
});
