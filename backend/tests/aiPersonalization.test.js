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
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import AIMemory from '../src/models/AIMemory.js';
import AIFeedback from '../src/models/AIFeedback.js';
import AIUsageLog from '../src/models/AIUsageLog.js';
import LearnerProfile from '../src/models/LearnerProfile.js';
import DailyLearningPlan from '../src/models/DailyLearningPlan.js';
import { detectWeaknesses } from '../src/services/weaknessDetectionService.js';
import { validateQuizQuestion } from '../src/services/aiQuizGeneratorService.js';

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

describe('⚡ Phase 18: AI Mentor 2.0 & Personalization Engine Test Suite', () => {
  let userAToken;
  let userAId;
  let userBToken;
  let userBId;
  let testCourseId;
  let testLessonId;
  let testQuizId;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Clean up test collections
    await User.deleteMany({ email: /test-phase18/ });
    await LearnerProfile.deleteMany({});
    await DailyLearningPlan.deleteMany({});
    await AIMemory.deleteMany({});
    await AIFeedback.deleteMany({});
    await AIUsageLog.deleteMany({});

    // Register User A (experienced learner)
    const regResA = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test-phase18-a@example.com',
        password: 'Password123!',
        name: 'Alice Learner',
      },
    });
    userAToken = regResA.data.token;
    userAId = regResA.data.user.id;

    // Register User B (for isolation tests)
    const regResB = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: 'test-phase18-b@example.com',
        password: 'Password123!',
        name: 'Bob Learner',
      },
    });
    userBToken = regResB.data.token;
    userBId = regResB.data.user.id;

    // Set User A preferences
    await User.findByIdAndUpdate(userAId, {
      subjects: ['Algebra', 'Biology'],
      goal: { description: 'Score high in Math', type: 'exam' },
      dailyStudyMinutes: 45,
      level: 'intermediate',
      learningStyle: 'practice',
      streak: 5,
    });

    // Create a published course and lesson
    const course = await Course.create({
      title: 'Calculus Fundamentals',
      slug: 'calculus-fundamentals-p18',
      description: 'Core calculus and derivative basics.',
      category: 'Mathematics',
      level: 'intermediate',
      status: 'published',
      instructorId: userAId,
    });
    testCourseId = course._id;

    const lesson = await Lesson.create({
      courseId: course._id,
      title: 'Derivatives and Limits',
      slug: 'derivatives-and-limits-p18',
      description: 'Understanding rates of change and epsilon-delta limits.',
      order: 1,
      duration: 900,
      isPublished: true,
    });
    testLessonId = lesson._id;

    // Enroll User A in the course
    await Enrollment.create({
      userId: userAId,
      courseId: testCourseId,
      status: 'active',
    });

    // Create a quiz for the lesson
    const quiz = await Quiz.create({
      lessonId: testLessonId,
      title: 'Derivatives Quiz',
      passingScore: 70,
      status: 'published',
      questions: [
        {
          question: 'What is the derivative of x^2?',
          options: ['2x', 'x', 'x^2', '2'],
          correctAnswer: '2x',
          explanation: 'Power rule gives 2x.',
        },
      ],
    });
    testQuizId = quiz._id;
  });

  after(async () => {
    await User.deleteMany({ email: /test-phase18/ });
    await Course.deleteMany({ _id: testCourseId });
    await Lesson.deleteMany({ _id: testLessonId });
    await Quiz.deleteMany({ _id: testQuizId });
    await QuizAttempt.deleteMany({ userId: userAId });
    await FlashcardProgress.deleteMany({ userId: userAId });
    await Conversation.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Message.deleteMany({ userId: { $in: [userAId, userBId] } });
    await LearnerProfile.deleteMany({});
    await DailyLearningPlan.deleteMany({});
    await AIMemory.deleteMany({});
    await AIFeedback.deleteMany({});
    await AIUsageLog.deleteMany({});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.close();
  });

  describe('1. Learner Profile & Caching', () => {
    it('GET /api/learning/profile generates safe derived profile for new user B', async () => {
      const res = await apiRequest('/api/learning/profile', { token: userBToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.profile);
      assert.equal(res.data.profile.userId, userBId);
      assert.equal(res.data.profile.completedLessonsCount, 0);
      assert.ok(Array.isArray(res.data.profile.weakTopics));
      assert.ok(Array.isArray(res.data.profile.strongTopics));
    });

    it('GET /api/learning/profile reflects active enrollments & stats for user A', async () => {
      const res = await apiRequest('/api/learning/profile', { token: userAToken });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.profile.enrolledCoursesSummary.length >= 1);
      assert.equal(res.data.profile.enrolledCoursesSummary[0].title, 'Calculus Fundamentals');
      assert.equal(res.data.profile.preferredDifficulty, 'intermediate');
      assert.equal(res.data.profile.learningGoals, 'Score high in Math');
    });

    it('GET /api/learning/profile utilizes cached profile on immediate second call', async () => {
      const first = await apiRequest('/api/learning/profile', { token: userAToken });
      const second = await apiRequest('/api/learning/profile', { token: userAToken });
      assert.equal(first.data.profile.lastCalculatedAt, second.data.profile.lastCalculatedAt);
    });

    it('GET /api/learning/profile?refresh=true forces recalculation', async () => {
      const refreshed = await apiRequest('/api/learning/profile?refresh=true', { token: userAToken });
      assert.equal(refreshed.status, 200);
      assert.ok(refreshed.data.profile.lastCalculatedAt);
    });
  });

  describe('2. Weakness Detection & Confidence Scoring', () => {
    it('Single mistake does NOT label a learner as weak', async () => {
      // Record 1 quiz mistake
      await QuizAttempt.create({
        userId: userAId,
        quizId: testQuizId,
        score: 0,
        maxScore: 1,
        percentage: 0,
        passed: false,
        answers: [{ questionId: new mongoose.Types.ObjectId(), selectedAnswer: 'x', isCorrect: false }],
      });

      const weaknesses = await detectWeaknesses(userAId);
      // Since it's only 1 mistake, weakness detector must filter it out
      assert.equal(weaknesses.length, 0, 'Single mistake should not mark topic as weak');
    });

    it('Multiple failures trigger weakness with explicit confidence score (0.2 to 1.0)', async () => {
      // Record a second quiz attempt with mistakes on the same quiz
      await QuizAttempt.create({
        userId: userAId,
        quizId: testQuizId,
        score: 0,
        maxScore: 1,
        percentage: 0,
        passed: false,
        answers: [{ questionId: new mongoose.Types.ObjectId(), selectedAnswer: 'x^2', isCorrect: false }],
      });

      const weaknesses = await detectWeaknesses(userAId);
      assert.ok(weaknesses.length >= 1, 'Should detect weakness after >= 2 failures');
      const detected = weaknesses[0];
      assert.ok(detected.confidence >= 0.2 && detected.confidence <= 1.0);
      assert.equal(detected.evidence.quizFailures, 2);

      const res = await apiRequest('/api/learning/weak-topics', { token: userAToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.weakTopics.length >= 1);
    });
  });

  describe('3. Personalized Educational Recommendations', () => {
    it('GET /api/learning/recommendations prioritizes learning value', async () => {
      const res = await apiRequest('/api/learning/recommendations', { token: userAToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.recommendations));
      assert.ok(res.data.recommendations.length > 0);

      // Verify structure of recommendation
      const topRec = res.data.recommendations[0];
      assert.ok(topRec.id);
      assert.ok(topRec.title);
      assert.ok(topRec.reason);
      assert.ok(topRec.priority >= 1);
      assert.ok(topRec.action);
    });

    it('Overdue flashcards are prioritized at highest rank (priority 1)', async () => {
      // Create a deck, card, and overdue progress
      const deck = await FlashcardDeck.create({
        userId: userAId,
        title: 'Biology Terms',
        subject: 'Biology',
      });
      const card = await Flashcard.create({
        deckId: deck._id,
        front: 'Mitochondria',
        back: 'Powerhouse of cell',
      });
      await FlashcardProgress.create({
        userId: userAId,
        flashcardId: card._id,
        dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue by 1 day
        repetitions: 1,
        lapses: 0,
      });

      // Recalculate profile and fetch recommendations
      await apiRequest('/api/learning/profile?refresh=true', { token: userAToken });
      const res = await apiRequest('/api/learning/recommendations', { token: userAToken });

      const flashcardRec = res.data.recommendations.find((r) => r.type === 'flashcard_review');
      assert.ok(flashcardRec, 'Should recommend overdue flashcard review');
      assert.equal(flashcardRec.priority, 1, 'Flashcard review must be top priority');
    });
  });

  describe('4. Daily Learning Plan', () => {
    it('GET /api/learning/daily-plan generates a realistic daily plan respecting time limit', async () => {
      const res = await apiRequest('/api/learning/daily-plan', { token: userAToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.plan);
      assert.ok(res.data.plan.tasks.length > 0);
      assert.ok(res.data.plan.totalEstimatedMinutes <= 60, 'Should not overload the learner');
    });

    it('PATCH /api/learning/daily-plan/tasks/:taskId toggles task completion', async () => {
      const planRes = await apiRequest('/api/learning/daily-plan', { token: userAToken });
      const taskId = planRes.data.plan.tasks[0].id;

      const toggleRes = await apiRequest(`/api/learning/daily-plan/tasks/${taskId}`, {
        method: 'PATCH',
        token: userAToken,
        body: { completed: true },
      });
      assert.equal(toggleRes.status, 200);
      const updatedTask = toggleRes.data.plan.tasks.find((t) => t.id === taskId);
      assert.equal(updatedTask.completed, true);
      assert.ok(toggleRes.data.plan.completedTasksCount >= 1);
    });
  });

  describe('5. AI Mentor 2.0 — Modes, Grounding & Validations', () => {
    let convId;

    it('POST /api/mentor/chat in Explain Mode returns structured explanation', async () => {
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: {
          message: 'Can you explain limits in calculus?',
          subject: 'Mathematics',
          mode: 'explain',
          courseId: testCourseId.toString(),
          lessonId: testLessonId.toString(),
        },
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.message.content.length > 20);
      assert.equal(res.data.context.mode, 'explain');
      assert.equal(res.data.context.isGrounded, true);
      assert.equal(res.data.context.lessonTitle, 'Derivatives and Limits');
      convId = res.data.conversation.id;
    });

    it('POST /api/mentor/chat in Socratic Mode guides with hints & questions', async () => {
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: {
          conversationId: convId,
          message: 'How do I find the derivative of x^3?',
          mode: 'socratic',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.context.mode, 'socratic');
      // Socratic response should formulate hints or guided steps
      assert.ok(
        res.data.message.content.toLowerCase().includes('hint') ||
        res.data.message.content.toLowerCase().includes('step') ||
        res.data.message.content.includes('?')
      );
    });

    it('POST /api/mentor/chat rejects message exceeding 2000 characters with 400', async () => {
      const longMessage = 'A'.repeat(2005);
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: { message: longMessage },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });

    it('POST /api/mentor/chat rejects empty message with 400', async () => {
      const res = await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: { message: '   ' },
      });

      assert.equal(res.status, 400);
      assert.equal(res.data.success, false);
    });
  });

  describe('6. AI Quiz Generator & Validator', () => {
    it('validateQuizQuestion validates proper question and rejects malformed inputs', () => {
      const valid = validateQuizQuestion({
        question: 'What is 2 + 2?',
        options: ['1', '2', '3', '4'],
        correctAnswer: '4',
        explanation: 'Standard arithmetic.',
        difficulty: 'easy',
      });
      assert.ok(valid);
      assert.equal(valid.correctAnswer, '4');
      assert.equal(valid.difficulty, 'easy');

      // Reject question with correctAnswer not in options
      const invalidAnswer = validateQuizQuestion({
        question: 'What is 2 + 2?',
        options: ['1', '2', '3'],
        correctAnswer: '99',
      });
      assert.equal(invalidAnswer, null);

      // Reject question with fewer than 2 options
      const tooFewOpts = validateQuizQuestion({
        question: 'What is 2 + 2?',
        options: ['4'],
        correctAnswer: '4',
      });
      assert.equal(tooFewOpts, null);
    });

    it('POST /api/learning/quiz/generate generates structured questions from lesson', async () => {
      const res = await apiRequest('/api/learning/quiz/generate', {
        method: 'POST',
        token: userAToken,
        body: {
          courseId: testCourseId.toString(),
          lessonId: testLessonId.toString(),
          difficulty: 'medium',
          count: 3,
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.questions));
      assert.equal(res.data.questions.length, 3);
      assert.equal(res.data.sourceLesson, 'Derivatives and Limits');

      for (const q of res.data.questions) {
        assert.ok(q.question);
        assert.equal(q.options.length, 4);
        assert.ok(q.options.includes(q.correctAnswer));
        assert.ok(q.explanation);
      }
    });
  });

  describe('7. AI Feedback Loop & Usage Analytics', () => {
    let assistantMsgId;

    before(async () => {
      const convRes = await apiRequest('/api/mentor/conversations', { token: userAToken });
      const convId = convRes.data.conversations[0].id;
      const details = await apiRequest(`/api/mentor/conversations/${convId}`, { token: userAToken });
      const assistantMsg = details.data.messages.find((m) => m.role === 'assistant');
      assistantMsgId = assistantMsg.id;
    });

    it('POST /api/mentor/feedback records helpfulness feedback with reason', async () => {
      const res = await apiRequest('/api/mentor/feedback', {
        method: 'POST',
        token: userAToken,
        body: {
          messageId: assistantMsgId,
          helpful: true,
          reason: 'very_clear',
          comment: 'The step-by-step example cleared up my confusion.',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.feedback.helpful, true);
      assert.equal(res.data.feedback.reason, 'very_clear');
    });

    it('GET /api/learning/analytics returns tracked AI operational events & feedback metrics', async () => {
      const res = await apiRequest('/api/learning/analytics', { token: userAToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.analytics.totalRequests >= 1);
      assert.ok(res.data.analytics.totalFeedback >= 1);
      assert.ok(res.data.analytics.helpfulFeedback >= 1);
    });
  });

  describe('8. Safe AI Memory & Privacy Controls', () => {
    it('Extracts justified educational goals from chat into long-term memory', async () => {
      await apiRequest('/api/mentor/chat', {
        method: 'POST',
        token: userAToken,
        body: {
          message: 'My goal is master differential equations for engineering exams.',
        },
      });

      const res = await apiRequest('/api/learning/memories', { token: userAToken });
      assert.equal(res.status, 200);
      assert.ok(res.data.memories.length >= 1);
      const goalMem = res.data.memories.find((m) => m.category === 'goal');
      assert.ok(goalMem, 'Should store educational goal memory');
    });

    it('DELETE /api/learning/memories/:id allows user to delete a memory (GDPR/Privacy)', async () => {
      const memRes = await apiRequest('/api/learning/memories', { token: userAToken });
      const memId = memRes.data.memories[0]._id;

      const delRes = await apiRequest(`/api/learning/memories/${memId}`, {
        method: 'DELETE',
        token: userAToken,
      });
      assert.equal(delRes.status, 200);
      assert.equal(delRes.data.success, true);

      // Verify deletion
      const afterRes = await apiRequest('/api/learning/memories', { token: userAToken });
      const exists = afterRes.data.memories.some((m) => m._id === memId);
      assert.equal(exists, false);
    });
  });

  describe('9. Security, Authorization & IDOR Matrix', () => {
    it('User B CANNOT access User A conversation by ID (404/Forbidden)', async () => {
      const convListA = await apiRequest('/api/mentor/conversations', { token: userAToken });
      const convIdA = convListA.data.conversations[0].id;

      const accessRes = await apiRequest(`/api/mentor/conversations/${convIdA}`, { token: userBToken });
      assert.equal(accessRes.status, 404);
      assert.equal(accessRes.data.success, false);
    });

    it('User B CANNOT delete User A conversation (404/Forbidden)', async () => {
      const convListA = await apiRequest('/api/mentor/conversations', { token: userAToken });
      const convIdA = convListA.data.conversations[0].id;

      const delRes = await apiRequest(`/api/mentor/conversations/${convIdA}`, {
        method: 'DELETE',
        token: userBToken,
      });
      assert.equal(delRes.status, 404);
    });

    it('User B CANNOT delete User A AI memory', async () => {
      // Create memory for User A
      const mem = await AIMemory.create({
        userId: userAId,
        category: 'strength',
        concept: 'Calculus Limits',
        observation: 'Fast calculation of polynomial limits',
      });

      const delRes = await apiRequest(`/api/learning/memories/${mem._id}`, {
        method: 'DELETE',
        token: userBToken,
      });
      assert.equal(delRes.status, 404);

      // Verify memory still exists
      const check = await AIMemory.findById(mem._id);
      assert.ok(check);
    });

    it('Unauthenticated requests are rejected with 401 across all personalization endpoints', async () => {
      const endpoints = [
        '/api/learning/profile',
        '/api/learning/weak-topics',
        '/api/learning/recommendations',
        '/api/learning/daily-plan',
        '/api/learning/memories',
        '/api/learning/analytics',
      ];

      for (const ep of endpoints) {
        const res = await apiRequest(ep);
        assert.equal(res.status, 401, `Endpoint ${ep} should reject unauthenticated call with 401`);
      }
    });
  });
});
