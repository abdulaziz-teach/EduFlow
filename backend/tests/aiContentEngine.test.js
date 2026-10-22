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
import Quiz from '../src/models/Quiz.js';
import FlashcardDeck from '../src/models/FlashcardDeck.js';
import Enrollment from '../src/models/Enrollment.js';
import Progress from '../src/models/Progress.js';
import QuizAttempt from '../src/models/QuizAttempt.js';
import AIContentGeneration from '../src/models/AIContentGeneration.js';
import ContentVersion from '../src/models/ContentVersion.js';
import { validateCourseStructure, validateStructuredLesson, validateQuizQuestions, validateFlashcards } from '../src/services/contentValidationPipeline.js';
import { checkCourseDuplicates, checkLessonDuplicates, checkQuizDuplicates, tokenSimilarity } from '../src/services/duplicateDetectionService.js';
import { createVersionSnapshot, getVersionHistory, rollbackToVersion } from '../src/services/contentVersioningService.js';

let server;
let baseUrl;

async function apiRequest(endpoint, options = {}) {
  const url = baseUrl + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
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
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
}

describe('⚡ Phase 20: AI Content Engine & Course Builder Test Suite', () => {
  let adminUser, adminToken;
  let studentUser, studentToken;

  const adminEmail = 'content_admin_' + Date.now() + '@eduflow.test';
  const studentEmail = 'content_student_' + Date.now() + '@eduflow.test';

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = 'http://localhost:' + port;
        resolve();
      });
    });

    // 1. Create Admin
    const regAdmin = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Content Admin', email: adminEmail, password: 'AdminPassword123!' },
    });
    assert.equal(regAdmin.status, 201);
    adminUser = regAdmin.data.user;

    await User.updateOne({ _id: adminUser.id }, { role: 'admin' });
    const loginAdmin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'AdminPassword123!' },
    });
    adminToken = loginAdmin.data.token;

    // 2. Create Student
    const regStudent = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: { name: 'Learner User', email: studentEmail, password: 'StudentPassword123!' },
    });
    assert.equal(regStudent.status, 201);
    studentUser = regStudent.data.user;
    studentToken = regStudent.data.token;
  });

  after(async () => {
    const uids = [adminUser?.id, studentUser?.id].filter(Boolean);
    if (uids.length > 0) {
      await Promise.all([
        User.deleteMany({ _id: { $in: uids } }),
        Course.deleteMany({ instructorId: { $in: uids } }),
        FlashcardDeck.deleteMany({ userId: { $in: uids } }),
        AIContentGeneration.deleteMany({ requestedBy: { $in: uids } }),
        ContentVersion.deleteMany({ authorId: { $in: uids } }),
        Enrollment.deleteMany({ userId: { $in: uids } }),
        Progress.deleteMany({ userId: { $in: uids } }),
        QuizAttempt.deleteMany({ userId: { $in: uids } }),
      ]);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Content Validation Pipeline & Quality Gates', () => {
    it('validateCourseStructure checks title, modules, and lessons integrity', () => {
      const invalid = validateCourseStructure({ title: 'A', modules: [] });
      assert.equal(invalid.isValid, false);
      assert.ok(invalid.issues.length >= 2);

      const valid = validateCourseStructure({
        title: 'Complete Python Course',
        description: 'Learn Python from scratch with hands-on projects and quizzes.',
        modules: [
          {
            title: 'Module 1: Basics',
            lessons: [{ title: 'Variables' }, { title: 'Conditionals' }],
          },
        ],
      });
      assert.equal(valid.isValid, true);
      assert.ok(valid.qualityScore >= 0.8);
    });

    it('validateStructuredLesson requires objectives, pedagogical depth, and summary', () => {
      const invalid = validateStructuredLesson({ title: 'X', objectives: [] });
      assert.equal(invalid.isValid, false);

      const valid = validateStructuredLesson({
        title: 'Asynchronous JavaScript & Event Loop',
        objectives: ['Master the event loop', 'Use promises and async/await cleanly'],
        explanation: 'The JavaScript runtime uses a single-threaded event loop mechanism with task and microtask queues.',
        keyConcepts: ['Call Stack', 'Microtask Queue'],
        summary: 'Mastering the event loop prevents performance bottlenecks.',
      });
      assert.equal(valid.isValid, true);
      assert.ok(valid.qualityScore >= 0.85);
    });

    it('validateQuizQuestions enforces unique options, correct answer presence, and explanations', () => {
      // Missing correct answer in options
      const broken = validateQuizQuestions([
        {
          question: 'What is O(1) time complexity?',
          options: ['Linear time', 'Quadratic time'],
          correctAnswer: 'Constant time',
        },
      ]);
      assert.equal(broken.isValid, false);
      assert.ok(broken.issues.some((i) => i.field.includes('correctAnswer')));

      // Valid questions
      const good = validateQuizQuestions([
        {
          question: 'What is O(1) time complexity?',
          options: ['Constant time', 'Linear time', 'Logarithmic time'],
          correctAnswer: 'Constant time',
          explanation: 'Constant time operations execute in the same duration regardless of input size.',
        },
      ]);
      assert.equal(good.isValid, true);
      assert.ok(good.qualityScore >= 0.9);
    });

    it('validateFlashcards verifies front, back, and absence of empty definitions', () => {
      const empty = validateFlashcards([]);
      assert.equal(empty.isValid, false);

      const valid = validateFlashcards([
        { front: 'Polymorphism', back: 'Ability of different objects to respond to the same message.' },
        { front: 'Encapsulation', back: 'Bundling of data with the methods that operate on that data.' },
      ]);
      assert.equal(valid.isValid, true);
      assert.equal(valid.issues.length, 0);
    });
  });

  describe('2. Duplicate Detection Heuristics', () => {
    it('tokenSimilarity computes Jaccard similarity accurately', () => {
      const highSim = tokenSimilarity('Introduction to Linear Algebra', 'Introduction to Linear Algebra & Vectors');
      assert.ok(highSim >= 0.7);

      const lowSim = tokenSimilarity('Introduction to Python', 'Quantum Physics Principles');
      assert.ok(lowSim < 0.2);
    });

    it('checkCourseDuplicates flags colliding slugs and near-duplicate titles', async () => {
      const existing = await Course.create({
        title: 'Advanced JavaScript Mastery',
        slug: 'advanced-js-mastery-test',
        category: 'Computer Science',
        instructorId: adminUser.id,
      });

      const dupCheck = await checkCourseDuplicates({
        title: 'Advanced JavaScript Mastery Guide',
        slug: 'advanced-js-mastery-test',
      });

      assert.equal(dupCheck.isDuplicate, true);
      assert.ok(dupCheck.matches.length >= 1);

      await Course.deleteOne({ _id: existing._id });
    });
  });

  describe('3. AI Content Generation Endpoints (Admin Protected)', () => {
    let generatedCourseId;
    let generatedLessonId;

    it('POST /api/admin/content/ai/course generates a proposed curriculum in pending_review', async () => {
      const res = await apiRequest('/api/admin/content/ai/course', {
        method: 'POST',
        token: adminToken,
        body: {
          subject: 'JavaScript',
          title: 'JavaScript Fundamentals',
          targetLevel: 'beginner',
          language: 'uz',
          objectives: ['Learn JS syntax', 'Understand DOM manipulation'],
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.course);
      assert.equal(res.data.reviewStatus, 'pending_review');
      assert.ok(res.data.generationId);
      assert.equal(res.data.validation.isValid, true);

      // Verify AIContentGeneration DB record
      const genDoc = await AIContentGeneration.findById(res.data.generationId);
      assert.ok(genDoc);
      assert.equal(genDoc.contentType, 'course');
      assert.equal(genDoc.language, 'uz');
      assert.equal(genDoc.reviewStatus, 'pending_review');

      // Human Approves the generated course
      const approveRes = await apiRequest('/api/admin/content/ai/generations/' + genDoc._id + '/approve', {
        method: 'POST',
        token: adminToken,
      });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.data.success, true);
      assert.equal(approveRes.data.entity.status, 'draft');
      generatedCourseId = approveRes.data.entity._id;

      // Verify ContentVersion 1 snapshot was created
      const versionHistory = await getVersionHistory({ entityType: 'Course', entityId: generatedCourseId });
      assert.equal(versionHistory.length, 1);
      assert.equal(versionHistory[0].versionNumber, 1);
    });

    it('POST /api/admin/content/ai/lesson generates grounded lesson draft', async () => {
      const res = await apiRequest('/api/admin/content/ai/lesson', {
        method: 'POST',
        token: adminToken,
        body: {
          courseId: generatedCourseId,
          title: 'Variables and Scope',
          topic: 'Variables',
          targetLevel: 'beginner',
          language: 'en',
          groundingContent: 'JavaScript supports let, const, and var with lexical scoping.',
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.lesson.explanation);
      assert.ok(res.data.lesson.objectives.length > 0);
      assert.ok(res.data.lesson.keyConcepts.length > 0);

      // Approve lesson to attach to course
      const approveRes = await apiRequest('/api/admin/content/ai/generations/' + res.data.generationId + '/approve', {
        method: 'POST',
        token: adminToken,
        body: { courseId: generatedCourseId },
      });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.data.entity.status, 'draft');
      assert.equal(approveRes.data.entity.isPublished, false);
      generatedLessonId = approveRes.data.entity._id;
    });

    it('POST /api/admin/content/ai/quiz generates draft questions grounded in lesson', async () => {
      const res = await apiRequest('/api/admin/content/ai/quiz', {
        method: 'POST',
        token: adminToken,
        body: {
          lessonId: generatedLessonId,
          topic: 'Variables & Scope',
          difficulty: 'medium',
          count: 3,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.quiz.questions.length, 3);
      assert.equal(res.data.validation.isValid, true);

      // Approve quiz
      const approveRes = await apiRequest('/api/admin/content/ai/generations/' + res.data.generationId + '/approve', {
        method: 'POST',
        token: adminToken,
        body: { lessonId: generatedLessonId },
      });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.data.entity.status, 'draft');
    });

    it('POST /api/admin/content/ai/flashcards generates active recall cards from lesson', async () => {
      const res = await apiRequest('/api/admin/content/ai/flashcards', {
        method: 'POST',
        token: adminToken,
        body: {
          lessonId: generatedLessonId,
          topic: 'Variables',
          count: 4,
        },
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.deck.cards.length, 4);

      // Approve flashcards
      const approveRes = await apiRequest('/api/admin/content/ai/generations/' + res.data.generationId + '/approve', {
        method: 'POST',
        token: adminToken,
      });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.data.entity.status, 'draft');
      assert.equal(approveRes.data.entity.isPublic, false);
    });

    it('POST /api/admin/content/ai/regenerate refines a specific explanation section', async () => {
      const res = await apiRequest('/api/admin/content/ai/regenerate', {
        method: 'POST',
        token: adminToken,
        body: {
          sectionName: 'explanation',
          instruction: 'simplify_for_beginners',
          currentContent: 'Scope is the accessibility of variables and functions in different parts of code.',
          topic: 'Variables',
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(res.data.refinedContent.length > 0);
    });
  });

  describe('4. Publishing Workflow & Student Accessibility', () => {
    let testCourseId;
    let testLessonId;

    before(async () => {
      const course = await Course.create({
        title: 'Publishing Workflow Course',
        slug: 'publishing-course-' + Date.now(),
        category: 'Computer Science',
        instructorId: adminUser.id,
        status: 'draft',
      });
      testCourseId = course._id;

      const lesson = await Lesson.create({
        courseId: testCourseId,
        title: 'Draft Lesson 1',
        slug: 'draft-lesson-' + Date.now(),
        content: 'Draft content for testing publication gate.',
        order: 1,
        status: 'draft',
        isPublished: false,
      });
      testLessonId = lesson._id;
    });

    it('Student CANNOT access draft course or draft lesson', async () => {
      const course = await Course.findById(testCourseId);
      assert.equal(course.status, 'draft');

      // Student attempt to enroll in draft course fails with 404
      const enrollRes = await apiRequest('/api/courses/' + testCourseId + '/enroll', {
        method: 'POST',
        token: studentToken,
      });
      assert.equal(enrollRes.status, 404);
    });

    it('POST /api/admin/content/:entityType/:id/publish publishes course and lessons', async () => {
      const pubCourse = await apiRequest('/api/admin/content/course/' + testCourseId + '/publish', {
        method: 'POST',
        token: adminToken,
      });
      assert.equal(pubCourse.status, 200);
      assert.equal(pubCourse.data.item.status, 'published');

      const pubLesson = await apiRequest('/api/admin/content/lesson/' + testLessonId + '/publish', {
        method: 'POST',
        token: adminToken,
      });
      assert.equal(pubLesson.status, 200);
      assert.equal(pubLesson.data.item.status, 'published');
      assert.equal(pubLesson.data.item.isPublished, true);

      // Now student CAN enroll and study
      const enrollRes = await apiRequest('/api/courses/' + testCourseId + '/enroll', {
        method: 'POST',
        token: studentToken,
      });
      assert.equal(enrollRes.status, 201);
      assert.equal(enrollRes.data.success, true);
    });
  });

  describe('5. Content Versioning & Non-Destructive Rollback', () => {
    let courseId;
    let studentEnrollment;

    before(async () => {
      const course = await Course.create({
        title: 'Original Title v1',
        slug: 'version-course-' + Date.now(),
        description: 'Original description v1',
        category: 'Mathematics',
        status: 'published',
        instructorId: adminUser.id,
      });
      courseId = course._id;

      // Create initial snapshot v1
      await createVersionSnapshot({
        entityType: 'Course',
        entityId: courseId,
        snapshot: {
          title: 'Original Title v1',
          description: 'Original description v1',
          category: 'Mathematics',
          level: 'beginner',
        },
        changeSummary: 'Initial release',
        authorId: adminUser.id,
      });

      // Student enrolls in course
      const enroll = await Enrollment.create({
        userId: studentUser.id,
        courseId,
        status: 'active',
      });
      studentEnrollment = enroll;

      // Update course to v2
      await Course.findByIdAndUpdate(courseId, {
        title: 'Erroneous Title v2',
        description: 'Corrupted description with bad information',
      });

      await createVersionSnapshot({
        entityType: 'Course',
        entityId: courseId,
        snapshot: {
          title: 'Erroneous Title v2',
          description: 'Corrupted description with bad information',
          category: 'Mathematics',
          level: 'beginner',
        },
        changeSummary: 'Faulty edit that needs rollback',
        authorId: adminUser.id,
      });
    });

    it('GET /api/admin/content/:entityType/:id/versions retrieves version history', async () => {
      const res = await apiRequest('/api/admin/content/course/' + courseId + '/versions', {
        token: adminToken,
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.versions.length, 2);
      assert.equal(res.data.versions[0].versionNumber, 2);
      assert.equal(res.data.versions[1].versionNumber, 1);
    });

    it('POST /api/admin/content/:entityType/:id/rollback restores v1 non-destructively', async () => {
      const res = await apiRequest('/api/admin/content/course/' + courseId + '/rollback', {
        method: 'POST',
        token: adminToken,
        body: { targetVersionNumber: 1 },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.restoredVersion.versionNumber, 3);
      assert.equal(res.data.restoredVersion.restoredFromVersion, 1);

      // Verify course content in database now has v1 title & description
      const updatedCourse = await Course.findById(courseId);
      assert.equal(updatedCourse.title, 'Original Title v1');
      assert.equal(updatedCourse.description, 'Original description v1');

      // CRITICAL: Verify student enrollment is COMPLETELY UNHARMED
      const checkEnrollment = await Enrollment.findById(studentEnrollment._id);
      assert.ok(checkEnrollment);
      assert.equal(String(checkEnrollment.userId), String(studentUser.id));
      assert.equal(String(checkEnrollment.courseId), String(courseId));
      assert.equal(checkEnrollment.status, 'active');
    });
  });

  describe('6. Security, RBAC & Multi-Tenant Authorization', () => {
    it('Normal student is blocked with 403 FORBIDDEN on all admin content endpoints', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/admin/content/ai/course', body: { subject: 'Hacking' } },
        { method: 'POST', path: '/api/admin/content/ai/lesson', body: { title: 'Hacking' } },
        { method: 'POST', path: '/api/admin/content/ai/quiz', body: { topic: 'Hacking' } },
        { method: 'POST', path: '/api/admin/content/ai/flashcards', body: { topic: 'Hacking' } },
        { method: 'POST', path: '/api/admin/content/course/123/publish' },
        { method: 'POST', path: '/api/admin/content/course/123/rollback', body: { targetVersionNumber: 1 } },
      ];

      for (const ep of endpoints) {
        const res = await apiRequest(ep.path, {
          method: ep.method,
          token: studentToken,
          body: ep.body,
        });
        assert.equal(res.status, 403, 'Expected 403 for student on ' + ep.path);
      }
    });

    it('Unauthenticated requests are rejected with 401 across all admin content endpoints', async () => {
      const res = await apiRequest('/api/admin/content/ai/course', {
        method: 'POST',
        body: { subject: 'Math' },
      });
      assert.equal(res.status, 401);
    });
  });
});
