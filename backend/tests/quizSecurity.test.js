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
import Quiz from '../src/models/Quiz.js';
import QuizAttempt from '../src/models/QuizAttempt.js';
import { generateAccessToken } from '../src/services/sessionService.js';

let server;
let baseUrl;
let studentUser;
let studentToken;
let testQuiz;
let foreignQuiz;
let q1, q2, q3;
let foreignQ;

async function apiRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
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

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-json
  }

  return { status: res.status, ok: res.ok, data };
}

describe('🎯 Quiz Security & Score Inflation Protection Suite', () => {
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

    // Create student
    await User.deleteMany({ email: 'quiz_security_student@eduflow.internal' });
    studentUser = await User.create({
      name: 'Quiz Student',
      displayName: 'Quiz Student',
      email: 'quiz_security_student@eduflow.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
    });
    studentToken = generateAccessToken(studentUser._id, 'user');

    // Create test quiz with 3 questions (each 1 pt, passingScore = 70%)
    await Quiz.deleteMany({ title: 'Quiz Score Security Test' });
    testQuiz = await Quiz.create({
      lessonId: new mongoose.Types.ObjectId(),
      title: 'Quiz Score Security Test',
      passingScore: 70,
      status: 'published',
      questions: [
        {
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          explanation: '2 + 2 = 4',
          points: 1,
        },
        {
          question: 'What is the capital of France?',
          options: ['London', 'Berlin', 'Paris', 'Madrid'],
          correctAnswer: 'Paris',
          explanation: 'Paris is the capital of France',
          points: 1,
        },
        {
          question: 'Which planet is known as the Red Planet?',
          options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
          correctAnswer: 'Mars',
          explanation: 'Mars appears red due to iron oxide',
          points: 1,
        },
      ],
    });

    q1 = testQuiz.questions[0];
    q2 = testQuiz.questions[1];
    q3 = testQuiz.questions[2];

    // Create a foreign quiz belonging to another lesson
    foreignQuiz = await Quiz.create({
      lessonId: new mongoose.Types.ObjectId(),
      title: 'Foreign Unrelated Quiz',
      passingScore: 50,
      status: 'published',
      questions: [
        {
          question: 'Foreign Question?',
          options: ['Foreign Correct', 'Foreign Wrong'],
          correctAnswer: 'Foreign Correct',
          points: 5,
        },
      ],
    });
    foreignQ = foreignQuiz.questions[0];
  });

  after(async () => {
    await User.deleteMany({ email: 'quiz_security_student@eduflow.internal' });
    if (testQuiz?._id) {
      await QuizAttempt.deleteMany({ quizId: testQuiz._id });
      await Quiz.deleteOne({ _id: testQuiz._id });
    }
    if (foreignQuiz?._id) {
      await QuizAttempt.deleteMany({ quizId: foreignQuiz._id });
      await Quiz.deleteOne({ _id: foreignQuiz._id });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // Test 1 — Normal submission: Correct and incorrect produce expected score
  it('Test 1 — Normal submission: 2 correct and 1 incorrect produce exactly score=2/3, percentage=67%, passed=false', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '4' }, // correct
          { questionId: q2._id, selectedAnswer: 'Paris' }, // correct
          { questionId: q3._id, selectedAnswer: 'Venus' }, // incorrect
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 2);
    assert.equal(res.data.attempt.maxScore, 3);
    assert.equal(res.data.attempt.percentage, 67);
    assert.equal(res.data.attempt.passed, false);
  });

  // Test 2 — Duplicate correct answer
  it('Test 2 — Duplicate correct answer: submitting q1 3 times awards points ONLY ONCE (score=1/3)', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '4' },
          { questionId: q1._id, selectedAnswer: '4' },
          { questionId: q1._id, selectedAnswer: '4' },
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 1, 'Score must be 1, duplicate answers must NOT inflate points');
    assert.equal(res.data.attempt.maxScore, 3);
    assert.equal(res.data.attempt.percentage, 33);
    assert.equal(res.data.attempt.passed, false);
  });

  // Test 3 — Duplicate mixed answers: FIRST ANSWER WINS
  it('Test 3a — Duplicate mixed: q1 incorrect then q1 correct => score=0 (first answer wins)', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '3' }, // incorrect first
          { questionId: q1._id, selectedAnswer: '4' }, // correct later
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 0, 'First answer was incorrect; subsequent correct answer must be ignored');
  });

  it('Test 3b — Duplicate mixed: q1 correct then q1 incorrect => score=1 (first answer wins)', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '4' }, // correct first
          { questionId: q1._id, selectedAnswer: '3' }, // incorrect later
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 1, 'First answer was correct; subsequent incorrect answer must be ignored');
  });

  // Test 4 — Blind brute force: submitting all choices for the same questionId
  it('Test 4 — Blind brute force: submitting all 4 choices for q1 only evaluates the first choice', async () => {
    // If the attacker puts wrong answer first: ['3', '4', '5', '6']
    const resWrongFirst = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '3' },
          { questionId: q1._id, selectedAnswer: '4' }, // correct is 2nd
          { questionId: q1._id, selectedAnswer: '5' },
          { questionId: q1._id, selectedAnswer: '6' },
        ],
      },
    });

    assert.equal(resWrongFirst.status, 201);
    assert.equal(resWrongFirst.data.attempt.score, 0, 'Brute force must not hit the correct answer when wrong is first');

    // If the attacker puts correct answer first: ['4', '3', '5', '6']
    const resCorrectFirst = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '4' }, // correct is 1st
          { questionId: q1._id, selectedAnswer: '3' },
          { questionId: q1._id, selectedAnswer: '5' },
          { questionId: q1._id, selectedAnswer: '6' },
        ],
      },
    });

    assert.equal(resCorrectFirst.status, 201);
    assert.equal(resCorrectFirst.data.attempt.score, 1, 'Must only award maximum 1 point for the single question');
  });

  // Test 5 — Duplicate answer many times (10x, 100x)
  it('Test 5a — Duplicate answer 10x: score <= maxScore, percentage <= 100, no 500 error', async () => {
    const answers10x = Array(10).fill({ questionId: q1._id, selectedAnswer: '4' });
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: { answers: answers10x },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 1);
    assert.ok(res.data.attempt.score <= res.data.attempt.maxScore);
    assert.ok(res.data.attempt.percentage <= 100);
  });

  it('Test 5b — Duplicate answer 100x: score <= maxScore, percentage <= 100, no 500 error', async () => {
    const answers100x = Array(100).fill({ questionId: q1._id, selectedAnswer: '4' });
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: { answers: answers100x },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 1);
    assert.ok(res.data.attempt.score <= res.data.attempt.maxScore);
    assert.ok(res.data.attempt.percentage <= 100);
  });

  // Test 6 — Foreign question ID from another quiz
  it('Test 6 — Foreign question ID: answer for question belonging to another quiz is ignored (0 points)', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: foreignQ._id, selectedAnswer: 'Foreign Correct' }, // Foreign 5pt question
          { questionId: q1._id, selectedAnswer: '4' }, // Legitimate 1pt question
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 1, 'Foreign question points must NOT be awarded to this quiz attempt');
    assert.equal(res.data.attempt.maxScore, 3);
  });

  // Test 7 — Invalid / Malformed question ID
  it('Test 7a — Invalid question ID format returns 400 INVALID_ID without crashing', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: 'malformed-not-an-id', selectedAnswer: '4' },
        ],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error, 'INVALID_ID');
  });

  it('Test 7b — Invalid quiz ID format returns 400 INVALID_ID without crashing', async () => {
    const res = await apiRequest('/api/quizzes/invalid-quiz-id/attempt', {
      method: 'POST',
      token: studentToken,
      body: { answers: [] },
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.success, false);
    assert.equal(res.data.error, 'INVALID_ID');
  });

  // Test 8 — Empty answers: answers: []
  it('Test 8 — Empty answers array: score=0, percentage=0, passed=false without crashing', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: { answers: [] },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 0);
    assert.equal(res.data.attempt.percentage, 0);
    assert.equal(res.data.attempt.passed, false);
  });

  // Test 9 — Multiple legitimate questions: deduplication is PER QUESTION, not global
  it('Test 9 — Multiple legitimate questions: q1, q2, q3 each evaluated independently', async () => {
    const res = await apiRequest(`/api/quizzes/${testQuiz._id}/attempt`, {
      method: 'POST',
      token: studentToken,
      body: {
        answers: [
          { questionId: q1._id, selectedAnswer: '4' }, // correct (1 pt)
          { questionId: q2._id, selectedAnswer: 'Paris' }, // correct (1 pt)
          { questionId: q3._id, selectedAnswer: 'Mars' }, // correct (1 pt)
        ],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.attempt.score, 3);
    assert.equal(res.data.attempt.maxScore, 3);
    assert.equal(res.data.attempt.percentage, 100);
    assert.equal(res.data.attempt.passed, true);
  });

  // Test 10 — Downstream Verification: QuizAttempt document in MongoDB matches computed values
  it('Test 10 — Downstream Verification: persisted QuizAttempt in DB accurately reflects clamped score and percentage', async () => {
    const savedAttempt = await QuizAttempt.findOne({ quizId: testQuiz._id, userId: studentUser._id })
      .sort({ createdAt: -1 })
      .lean();

    assert.ok(savedAttempt);
    assert.ok(savedAttempt.score <= savedAttempt.maxScore);
    assert.ok(savedAttempt.percentage <= 100);
    assert.equal(typeof savedAttempt.passed, 'boolean');
  });
});
