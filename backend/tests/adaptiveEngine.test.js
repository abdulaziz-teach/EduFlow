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
import Course from '../src/models/Course.js';
import Lesson from '../src/models/Lesson.js';
import Enrollment from '../src/models/Enrollment.js';
import Quiz from '../src/models/Quiz.js';
import QuizAttempt from '../src/models/QuizAttempt.js';
import FlashcardDeck from '../src/models/FlashcardDeck.js';
import Flashcard from '../src/models/Flashcard.js';
import FlashcardProgress from '../src/models/FlashcardProgress.js';
import UserTopicMastery from '../src/models/UserTopicMastery.js';
import MistakeLog from '../src/models/MistakeLog.js';
import { calculateMasteryMetrics, recordTopicInteraction } from '../src/services/masteryService.js';
import { checkPrerequisites } from '../src/services/prerequisiteEngine.js';
import { determineNextAction } from '../src/services/nextActionEngine.js';
import { getPrerequisitesForTopic, normalizeTopicName } from '../src/services/taxonomyService.js';

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

describe('⚡ Phase 19: Adaptive Learning & Learning Intelligence Engine Test Suite', () => {
  let studentToken;
  let studentId;
  let otherStudentToken;
  let otherStudentId;
  let adminToken;
  let adminId;

  let testCourseId;
  let testLessonId;
  let testQuizId;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Clean test records
    await User.deleteMany({ email: /test-phase19/ });
    await UserTopicMastery.deleteMany({});
    await MistakeLog.deleteMany({});
    await Course.deleteMany({ slug: /phase19/ });
    await Lesson.deleteMany({ slug: /phase19/ });

    // Register Student A
    const regStudentA = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test-phase19-student@example.com',
        password: 'Password123!',
        name: 'Student Ada',
      },
    });
    studentToken = regStudentA.data.token;
    studentId = regStudentA.data.user.id;

    // Register Student B (for isolation tests)
    const regStudentB = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test-phase19-other@example.com',
        password: 'Password123!',
        name: 'Student Byron',
      },
    });
    otherStudentToken = regStudentB.data.token;
    otherStudentId = regStudentB.data.user.id;

    // Register Admin
    const regAdmin = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test-phase19-admin@example.com',
        password: 'Password123!',
        name: 'Admin Turing',
      },
    });
    adminToken = regAdmin.data.token;
    adminId = regAdmin.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'admin' });

    // Create a published course with taxonomy and lesson
    const course = await Course.create({
      title: 'Adaptive Algebra I',
      slug: 'adaptive-algebra-phase19',
      description: 'Mastering equations and algebraic structures.',
      category: 'Mathematics',
      level: 'intermediate',
      status: 'published',
      instructorId: adminId,
      topics: ['Equations'],
      prerequisites: ['Algebra'],
    });
    testCourseId = course._id;

    const lesson = await Lesson.create({
      courseId: course._id,
      title: 'Solving Linear Equations',
      slug: 'linear-equations-phase19',
      description: 'Isolate variables using inverse operations.',
      order: 1,
      duration: 600,
      isPublished: true,
      topics: ['Equations'],
      prerequisites: ['Algebra'],
    });
    testLessonId = lesson._id;

    // Create a quiz with 2 questions
    const quiz = await Quiz.create({
      lessonId: testLessonId,
      title: 'Equations Mastery Quiz',
      passingScore: 70,
      status: 'published',
      questions: [
        {
          question: 'Solve for x: 2x + 4 = 10',
          options: ['x = 3', 'x = 2', 'x = 4', 'x = 5'],
          correctAnswer: 'x = 3',
          explanation: 'Subtract 4 to get 2x = 6, then divide by 2 to get x = 3.',
        },
        {
          question: 'Solve for y: 3y - 9 = 0',
          options: ['y = 3', 'y = 9', 'y = 0', 'y = -3'],
          correctAnswer: 'y = 3',
          explanation: 'Add 9 to both sides and divide by 3.',
        },
      ],
    });
    testQuizId = quiz._id;
  });

  after(async () => {
    await User.deleteMany({ email: /test-phase19/ });
    await UserTopicMastery.deleteMany({});
    await MistakeLog.deleteMany({});
    await Course.deleteMany({ _id: testCourseId });
    await Lesson.deleteMany({ _id: testLessonId });
    await Quiz.deleteMany({ _id: testQuizId });
    await QuizAttempt.deleteMany({ quizId: testQuizId });
    await FlashcardDeck.deleteMany({ userId: { $in: [studentId, otherStudentId] } });
    await Flashcard.deleteMany({});
    await FlashcardProgress.deleteMany({ userId: { $in: [studentId, otherStudentId] } });
    await Enrollment.deleteMany({ userId: { $in: [studentId, otherStudentId] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  describe('1. Topic Knowledge & Mastery Algorithm', () => {
    it('calculateMasteryMetrics calculates deterministic score, confidence, and difficulty', () => {
      // 0 interactions: initial baseline
      const zero = calculateMasteryMetrics({ evidenceCount: 0 });
      assert.equal(zero.knowledgeScore, 0.4);
      assert.equal(zero.confidence, 0);
      assert.equal(zero.status, 'learning');
      assert.equal(zero.recommendedDifficulty, 'easy');

      // 4 correct out of 4 interactions (high mastery)
      const strong = calculateMasteryMetrics({
        correctCount: 4,
        incorrectCount: 0,
        evidenceCount: 4,
      });
      assert.ok(strong.knowledgeScore >= 0.85);
      assert.ok(strong.confidence >= 0.5);
      assert.equal(strong.status, 'proficient');

      // 8 correct out of 8 interactions (mastered)
      const mastered = calculateMasteryMetrics({
        correctCount: 8,
        incorrectCount: 0,
        evidenceCount: 8,
      });
      assert.equal(mastered.status, 'mastered');
      assert.equal(mastered.recommendedDifficulty, 'hard');

      // Struggling (2 incorrect out of 2)
      const struggling = calculateMasteryMetrics({
        correctCount: 0,
        incorrectCount: 2,
        evidenceCount: 2,
      });
      assert.ok(struggling.knowledgeScore < 0.50);
      assert.equal(struggling.status, 'needs_review');
      assert.equal(struggling.recommendedDifficulty, 'easy');
    });

    it('recordTopicInteraction increments counts and persists UserTopicMastery', async () => {
      const record = await recordTopicInteraction({
        userId: studentId,
        topic: 'Algebra',
        subject: 'Mathematics',
        isCorrect: true,
      });

      assert.ok(record);
      assert.equal(record.topic, 'Algebra');
      assert.equal(record.correctCount, 1);
      assert.equal(record.evidenceCount, 1);
      assert.ok(record.explanation.length > 0);
    });

    it('GET /api/adaptive/mastery returns learner topic masteries', async () => {
      const res = await apiRequest('/api/adaptive/mastery', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.masteries));
      assert.ok(res.data.masteries.length >= 1);
      assert.equal(res.data.masteries[0].topic, 'Algebra');
    });

    it('GET /api/adaptive/mastery/:topic/explain returns transparent explanation', async () => {
      const res = await apiRequest('/api/adaptive/mastery/Algebra/explain', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.topic, 'Algebra');
      assert.ok(res.data.explanation);
      assert.ok(res.data.prerequisites);
    });
  });

  describe('2. Curriculum Taxonomy & Prerequisite Engine', () => {
    it('getPrerequisitesForTopic resolves curriculum prerequisites', () => {
      const eqPrereqs = getPrerequisitesForTopic('Equations', 'Mathematics');
      assert.deepEqual(eqPrereqs, ['Algebra']);

      const algPrereqs = getPrerequisitesForTopic('Algebra', 'Mathematics');
      assert.deepEqual(algPrereqs, ['Fractions']);

      const fractionsPrereqs = getPrerequisitesForTopic('Fractions', 'Mathematics');
      assert.deepEqual(fractionsPrereqs, []);
    });

    it('checkPrerequisites blocks advanced topic when prerequisite score < 0.50', async () => {
      // Equations requires Algebra (which requires Fractions). Since neither is completed, prerequisite check returns blocking prerequisite
      const prereqCheck = await checkPrerequisites(studentId, 'Equations', 'Mathematics');
      assert.equal(prereqCheck.satisfied, false);
      assert.ok(prereqCheck.blockingPrerequisite);
      assert.ok(['Algebra', 'Fractions'].includes(prereqCheck.blockingPrerequisite.topic));
      assert.ok(prereqCheck.reason);
    });

    it('checkPrerequisites permits topic when prerequisites are satisfied', async () => {
      // Boost Algebra mastery to >= 0.50
      await recordTopicInteraction({ userId: studentId, topic: 'Fractions', subject: 'Mathematics', isCorrect: true });
      await recordTopicInteraction({ userId: studentId, topic: 'Fractions', subject: 'Mathematics', isCorrect: true });
      await recordTopicInteraction({ userId: studentId, topic: 'Algebra', subject: 'Mathematics', isCorrect: true });
      await recordTopicInteraction({ userId: studentId, topic: 'Algebra', subject: 'Mathematics', isCorrect: true });

      const prereqCheck = await checkPrerequisites(studentId, 'Equations', 'Mathematics');
      assert.equal(prereqCheck.satisfied, true);
      assert.equal(prereqCheck.blockingPrerequisite, null);
    });

    it('GET /api/adaptive/prerequisites/:topic returns prerequisite status', async () => {
      const res = await apiRequest('/api/adaptive/prerequisites/Equations?subject=Mathematics', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.satisfied, true);
    });
  });

  describe('3. Automated Learning Event Pipeline', () => {
    it('POST /api/quizzes/:id/attempt updates topic mastery and logs mistakes', async () => {
      // Fetch quiz
      const quizRes = await apiRequest(`/api/quizzes/${testQuizId}`, { token: studentToken });
      const questions = quizRes.data.quiz.questions;

      // Submit 1 correct and 1 incorrect answer
      const attemptRes = await apiRequest(`/api/quizzes/${testQuizId}/attempt`, {
        method: 'POST',
        token: studentToken,
        body: {
          answers: [
            { questionId: questions[0].id, selectedAnswer: 'x = 3' }, // Correct
            { questionId: questions[1].id, selectedAnswer: 'y = 9' }, // Incorrect
          ],
        },
      });

      assert.equal(attemptRes.status, 201);
      assert.equal(attemptRes.data.attempt.score, 1);

      // Verify mistake logged in MistakeLog
      const mistakeRes = await apiRequest('/api/adaptive/mistakes', { token: studentToken });
      assert.equal(mistakeRes.status, 200);
      assert.ok(mistakeRes.data.mistakes.length >= 1);
      const logged = mistakeRes.data.mistakes.find((m) => m.question.includes('Solve for y'));
      assert.ok(logged, 'Incorrect question must be recorded in MistakeLog');
      assert.equal(logged.userAnswer, 'y = 9');
      assert.equal(logged.correctAnswer, 'y = 3');
      assert.equal(logged.resolved, false);
    });

    it('POST /api/flashcards/deck/:id/review updates mastery state', async () => {
      const deck = await FlashcardDeck.create({
        userId: studentId,
        title: 'Equations Flashcards',
        subject: 'Mathematics',
        cards: [
          {
            front: 'Linear Equation Standard Form',
            back: 'Ax + By = C',
            tags: ['Equations'],
          },
        ],
      });

      const cardId = deck.cards[0]._id;
      const reviewRes = await apiRequest(`/api/flashcards/${deck._id}/cards/${cardId}/review`, {
        method: 'POST',
        token: studentToken,
        body: { rating: 4 }, // Easy
      });

      assert.equal(reviewRes.status, 200);

      // Verify mastery interaction recorded
      const mastery = await UserTopicMastery.findOne({ userId: studentId, topic: 'Equations' });
      assert.ok(mastery);
      assert.ok(mastery.evidenceCount >= 1);
    });

    it('PATCH /api/courses/:courseId/lessons/:lessonId/progress updates familiarity', async () => {
      const progRes = await apiRequest(`/api/courses/${testCourseId}/lessons/${testLessonId}/progress`, {
        method: 'PATCH',
        token: studentToken,
        body: { completed: true },
      });

      assert.equal(progRes.status, 200);
      assert.equal(progRes.data.progress.completed, true);
    });
  });

  describe('4. Next-Best-Action (NBA) Engine', () => {
    it('GET /api/adaptive/next-action returns prioritized learning recommendation', async () => {
      const res = await apiRequest('/api/adaptive/next-action', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.action);
      assert.ok(res.data.action.title);
      assert.ok(res.data.action.subtitle);
      assert.ok(res.data.action.reason);
      assert.ok(res.data.action.priority >= 1);
      assert.ok(res.data.action.actionPayload);
    });

    it('Overdue flashcards are prioritized as top Next Best Action (Priority 1)', async () => {
      // Create overdue card for student
      const deck = await FlashcardDeck.create({
        userId: studentId,
        title: 'Priority Deck',
        subject: 'Mathematics',
      });
      const card = await Flashcard.create({
        deckId: deck._id,
        front: 'Overdue Q',
        back: 'Overdue A',
      });
      await FlashcardProgress.create({
        userId: studentId,
        flashcardId: card._id,
        dueAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days overdue
      });

      const res = await apiRequest('/api/adaptive/next-action', { token: studentToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.action.type, 'review_flashcards');
      assert.equal(res.data.action.priority, 1);
    });
  });

  describe('5. Mistake Review System', () => {
    it('POST /api/adaptive/mistakes/:id/resolve resolves a logged mistake', async () => {
      const mistakesRes = await apiRequest('/api/adaptive/mistakes', { token: studentToken });
      assert.ok(mistakesRes.data.mistakes.length >= 1);
      const targetMistakeId = mistakesRes.data.mistakes[0]._id;

      const resolveRes = await apiRequest(`/api/adaptive/mistakes/${targetMistakeId}/resolve`, {
        method: 'POST',
        token: studentToken,
      });

      assert.equal(resolveRes.status, 200);
      assert.equal(resolveRes.data.success, true);
      assert.equal(resolveRes.data.mistake.resolved, true);

      // Verify it no longer appears in unresolved list
      const afterRes = await apiRequest('/api/adaptive/mistakes', { token: studentToken });
      const stillExists = afterRes.data.mistakes.some((m) => m._id === targetMistakeId);
      assert.equal(stillExists, false);
    });
  });

  describe('6. Meaningful Learning Streaks', () => {
    it('Streak increments on meaningful learning activity and persists in database', async () => {
      const studentBefore = await User.findById(studentId);
      const initialStreak = studentBefore.streak || 0;

      // Performing quiz attempt with answers increments meaningful streak
      const quizRes = await apiRequest(`/api/quizzes/${testQuizId}`, { token: studentToken });
      const questions = quizRes.data.quiz.questions;

      await apiRequest(`/api/quizzes/${testQuizId}/attempt`, {
        method: 'POST',
        token: studentToken,
        body: {
          answers: [{ questionId: questions[0].id, selectedAnswer: 'x = 3' }],
        },
      });

      const studentAfter = await User.findById(studentId);
      assert.ok(studentAfter.streak >= 1);
      assert.ok(studentAfter.lastStudyDate);
    });
  });

  describe('7. Admin Learning Intelligence Insights', () => {
    it('GET /api/adaptive/admin/insights rejects non-admin users with 403', async () => {
      const res = await apiRequest('/api/adaptive/admin/insights', { token: studentToken });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'FORBIDDEN');
    });

    it('GET /api/adaptive/admin/insights returns curriculum analytics for admin', async () => {
      const res = await apiRequest('/api/adaptive/admin/insights', { token: adminToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.insights);
      assert.ok(Array.isArray(res.data.insights.difficultTopics));
      assert.ok(Array.isArray(res.data.insights.commonMistakes));
      assert.ok(res.data.insights.metrics);
      assert.ok(res.data.insights.metrics.totalQuizAttempts >= 1);
    });
  });

  describe('8. Security, Data Isolation & Unauthorized Access', () => {
    it('Student B CANNOT resolve Student A mistake (404/Forbidden)', async () => {
      // Create a mistake for Student A
      const mistakeA = await MistakeLog.create({
        userId: studentId,
        source: 'quiz',
        question: 'Private Question A',
        correctAnswer: 'Ans A',
        topic: 'Algebra',
        resolved: false,
      });

      const res = await apiRequest(`/api/adaptive/mistakes/${mistakeA._id}/resolve`, {
        method: 'POST',
        token: otherStudentToken,
      });

      assert.equal(res.status, 404);
      const check = await MistakeLog.findById(mistakeA._id);
      assert.equal(check.resolved, false, 'Mistake must remain unresolved for owner');
    });

    it('Unauthenticated requests are rejected with 401 across all adaptive endpoints', async () => {
      const endpoints = [
        '/api/adaptive/next-action',
        '/api/adaptive/mastery',
        '/api/adaptive/mistakes',
        '/api/adaptive/admin/insights',
      ];

      for (const ep of endpoints) {
        const res = await apiRequest(ep);
        assert.equal(res.status, 401, `Endpoint ${ep} must require authentication`);
      }
    });
  });
});
