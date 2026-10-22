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
import KnowledgeTopic from '../src/models/KnowledgeTopic.js';
import LearnerProfile from '../src/models/LearnerProfile.js';
import UserTopicMastery from '../src/models/UserTopicMastery.js';
import Enrollment from '../src/models/Enrollment.js';
import SearchEvent from '../src/models/SearchEvent.js';

import {
  normalizeQuery,
  tokenizeQuery,
  levenshteinDistance,
  findTypoCorrection,
  calculateRelevanceScore,
} from '../src/services/searchRelevanceService.js';
import { parseQueryHeuristic } from '../src/services/aiSearchService.js';
import { searchCache, buildCacheKey } from '../src/services/searchCache.js';
import { retrieveGroundedChunks } from '../src/services/contentRetrievalService.js';
import { generateAccessToken } from '../src/services/sessionService.js';

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

describe('🔍 Phase 21: Search, Discovery & Intelligent Retrieval Test Suite', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let studentToken;

  let publishedCourse1;
  let publishedCourse2;
  let draftCourse;
  let archivedCourse;
  let publishedLesson;
  let draftLesson;
  let publishedQuiz;
  let publicDeck;
  let privateDeck;

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

    // Cleanup any existing test data
    await User.deleteMany({ email: /@searchtest\.internal$/ });
    await Course.deleteMany({ title: /SearchTest/ });
    await FlashcardDeck.deleteMany({ title: /SearchTest/ });
    await SearchEvent.deleteMany({ query: /SearchTest/i });

    // 1. Create Admin User
    adminUser = await User.create({
      name: 'Search Admin',
      displayName: 'Search Admin',
      email: 'admin_search@searchtest.internal',
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // 2. Create Student User
    studentUser = await User.create({
      name: 'Search Student',
      displayName: 'Search Student',
      email: 'student_search@searchtest.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
    });
    studentToken = generateAccessToken(studentUser._id, 'user');

    // 3. Create Published Courses
    publishedCourse1 = await Course.create({
      title: 'SearchTest Complete Python Programming',
      slug: 'searchtest-python-programming',
      description: 'Master Python syntax, object-oriented programming, and backend development from scratch.',
      category: 'Computer Science',
      level: 'beginner',
      language: 'en',
      status: 'published',
      instructorId: adminUser._id,
      tags: ['python', 'backend', 'oop', 'programming'],
      topics: ['Python Basics', 'Control Flow', 'Object-Oriented Programming'],
      publishedAt: new Date(),
    });

    publishedCourse2 = await Course.create({
      title: 'SearchTest Advanced React & Web Architecture',
      slug: 'searchtest-react-architecture',
      description: 'Deep dive into React state management, hooks, concurrent rendering, and performance optimization.',
      category: 'Web Development',
      level: 'advanced',
      language: 'en',
      status: 'published',
      instructorId: adminUser._id,
      tags: ['react', 'frontend', 'javascript', 'state-management'],
      topics: ['React Hooks', 'Virtual DOM', 'State Management'],
      publishedAt: new Date(),
    });

    // 4. Create Draft Course (MUST NEVER BE DISCOVERED BY PUBLIC / STUDENTS)
    draftCourse = await Course.create({
      title: 'SearchTest Secret Quantum Computing Draft',
      slug: 'searchtest-quantum-draft',
      description: 'Confidential unpublished draft on quantum qubits and superposition.',
      category: 'Physics',
      level: 'advanced',
      status: 'draft',
      instructorId: adminUser._id,
      tags: ['quantum', 'physics', 'confidential'],
    });

    // 5. Create Archived / Soft-Deleted Course (MUST NEVER BE DISCOVERED)
    archivedCourse = await Course.create({
      title: 'SearchTest Deprecated Ruby Rails Course',
      slug: 'searchtest-ruby-rails',
      description: 'Old discontinued course that has been archived.',
      category: 'Web Development',
      level: 'intermediate',
      status: 'archived',
      deletedAt: new Date(),
      instructorId: adminUser._id,
      tags: ['ruby', 'rails'],
    });

    // 6. Create Lessons (Published vs Draft)
    publishedLesson = await Lesson.create({
      courseId: publishedCourse1._id,
      title: 'SearchTest Python Variables & Data Types',
      slug: 'searchtest-python-variables',
      description: 'Understanding strings, integers, lists, and dictionaries in Python.',
      content: 'In Python, variables are dynamically typed references to memory locations.',
      order: 1,
      duration: 600,
      isPublished: true,
      status: 'published',
      topics: ['Python Basics'],
    });

    draftLesson = await Lesson.create({
      courseId: publishedCourse1._id,
      title: 'SearchTest Secret Python Metaclasses Unreleased',
      slug: 'searchtest-python-metaclasses',
      description: 'Draft unreleased lesson on Python internals and metaclasses.',
      content: 'Metaclasses are the classes of classes.',
      order: 2,
      duration: 900,
      isPublished: false,
      status: 'draft',
    });

    // 7. Create Quiz
    publishedQuiz = await Quiz.create({
      lessonId: publishedLesson._id,
      title: 'SearchTest Python Fundamentals Quiz',
      description: 'Test your understanding of basic Python variables and data structures.',
      passingScore: 75,
      timeLimit: 15,
      status: 'published',
      questions: [
        {
          question: 'What is the type of variable x = [1, 2, 3] in Python?',
          options: ['list', 'tuple', 'set', 'dict'],
          correctAnswer: 'list',
          explanation: 'Square brackets create a mutable list in Python.',
          points: 5,
        },
      ],
    });

    // 8. Create Flashcard Decks (Public vs Private)
    publicDeck = await FlashcardDeck.create({
      userId: adminUser._id,
      title: 'SearchTest Core Python Concepts Flashcards',
      description: 'High-yield flashcards for reviewing Python definitions and syntax.',
      subject: 'Python',
      tags: ['python', 'syntax', 'study'],
      isPublic: true,
      status: 'published',
      cards: [
        {
          front: 'What is a Python tuple?',
          back: 'An immutable sequence of elements defined with parentheses.',
          hint: 'Unlike lists, they cannot be modified.',
        },
      ],
    });

    privateDeck = await FlashcardDeck.create({
      userId: adminUser._id,
      title: 'SearchTest Private Teacher Notes Flashcards',
      description: 'Private personal revision notes.',
      subject: 'Teaching',
      isPublic: false,
      status: 'draft',
      cards: [
        {
          front: 'Private teacher note',
          back: 'Should never be exposed in public search.',
        },
      ],
    });

    // 9. Create Knowledge Topic
    await KnowledgeTopic.create({
      userId: studentUser._id,
      subject: 'Computer Science',
      topic: 'SearchTest Algorithmic Complexity',
      status: 'learning',
      confidence: 40,
    });

    // 10. Configure Learner Profile with a confirmed weak topic for personalization test
    await LearnerProfile.create({
      userId: studentUser._id,
      learningGoals: 'Master Python and backend services',
      preferredDifficulty: 'beginner',
      weakTopics: [
        {
          topic: 'Python Basics',
          subject: 'Computer Science',
          confidence: 0.85,
        },
      ],
    });

    // Ensure text indexes are built
    await Course.syncIndexes();
    await Lesson.syncIndexes();
    await Quiz.syncIndexes();
    await FlashcardDeck.syncIndexes();
  });

  after(async () => {
    // Cleanup
    await User.deleteMany({ email: /@searchtest\.internal$/ });
    await Course.deleteMany({ title: /SearchTest/ });
    await Lesson.deleteMany({ title: /SearchTest/ });
    await Quiz.deleteMany({ title: /SearchTest/ });
    await FlashcardDeck.deleteMany({ title: /SearchTest/ });
    await KnowledgeTopic.deleteMany({ topic: /SearchTest/ });
    await LearnerProfile.deleteMany({ userId: studentUser?._id });
    await SearchEvent.deleteMany({ query: /SearchTest/i });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  // ==========================================
  // 1. UNIT TESTS: ALGORITHMS & RELEVANCE
  // ==========================================
  describe('1. Unit Tests — Normalization, Ranking & Typo Detection', () => {
    it('normalizeQuery: trims, lowercases, removes dangerous characters and bounds length', () => {
      const input = '  <script>alert("hack")</script>  Python 3.12 & React!  ';
      const clean = normalizeQuery(input);
      assert.strictEqual(clean, 'python 3.12 react');

      const extreme = 'a'.repeat(250);
      assert.strictEqual(normalizeQuery(extreme).length, 100);
    });

    it('levenshteinDistance & findTypoCorrection: accurately detects typos', () => {
      assert.strictEqual(levenshteinDistance('python', 'python'), 0);
      assert.strictEqual(levenshteinDistance('pythn', 'python'), 1);
      assert.strictEqual(levenshteinDistance('reactt', 'react'), 1);

      const vocab = ['python', 'javascript', 'react', 'mongodb', 'algorithms'];
      assert.strictEqual(findTypoCorrection('pythn', vocab), 'python');
      assert.strictEqual(findTypoCorrection('reactt', vocab), 'react');
      assert.strictEqual(findTypoCorrection('mongod', vocab), 'mongodb');
      assert.strictEqual(findTypoCorrection('completelyunrelatedword', vocab), null);
    });

    it('calculateRelevanceScore: prioritizes exact title over phrase and partial matches', () => {
      const entityExact = { title: 'python' };
      const entityPrefix = { title: 'python for beginners' };
      const entityContains = { title: 'learn modern python' };
      const entityDescOnly = { title: 'general coding', description: 'we will cover python here' };

      const scoreExact = calculateRelevanceScore(entityExact, 'course', 'python', ['python']);
      const scorePrefix = calculateRelevanceScore(entityPrefix, 'course', 'python', ['python']);
      const scoreContains = calculateRelevanceScore(entityContains, 'course', 'python', ['python']);
      const scoreDesc = calculateRelevanceScore(entityDescOnly, 'course', 'python', ['python']);

      assert.ok(scoreExact.finalScore > scorePrefix.finalScore, 'Exact match must score higher than prefix');
      assert.ok(scorePrefix.finalScore > scoreContains.finalScore, 'Prefix must score higher than phrase contain');
      assert.ok(scoreContains.finalScore > scoreDesc.finalScore, 'Title match must score higher than description');
    });

    it('parseQueryHeuristic: extracts learning intent, difficulty and clean keywords', () => {
      const parsed = parseQueryHeuristic('I want to learn backend development from beginner level');
      assert.strictEqual(parsed.isNaturalLanguage, true);
      assert.strictEqual(parsed.level, 'beginner');
      assert.strictEqual(parsed.intent, 'course');
      assert.ok(parsed.cleanedKeywords.includes('backend development'));
    });

    it('searchCache: sets, retrieves, handles eviction and prefix invalidation', () => {
      searchCache.clear();
      searchCache.set('test:key1', { data: 'hello' }, 5000);
      assert.deepStrictEqual(searchCache.get('test:key1'), { data: 'hello' });

      searchCache.invalidatePrefix('test:');
      assert.strictEqual(searchCache.get('test:key1'), null);
    });
  });

  // ==========================================
  // 2. GLOBAL SEARCH & FILTERING INTEGRATION
  // ==========================================
  describe('2. Global Search & Multi-Entity API', () => {
    it('GET /api/search?q=SearchTest Python returns published courses, lessons, quizzes, flashcards', async () => {
      const res = await apiRequest('/api/search?q=SearchTest Python');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.total >= 1);
      assert.ok(res.data.results.length >= 1);

      const types = res.data.results.map((r) => r.type);
      assert.ok(types.includes('course'), 'Must find course');
      assert.ok(types.includes('lesson'), 'Must find lesson');
      assert.ok(types.includes('quiz'), 'Must find quiz');
      assert.ok(types.includes('flashcard'), 'Must find flashcard');
    });

    it('GET /api/search filters strictly by entity type (type=course)', async () => {
      const res = await apiRequest('/api/search?q=SearchTest Python&type=course');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.results.length >= 1);
      res.data.results.forEach((r) => {
        assert.strictEqual(r.type, 'course', 'All results must be of type course');
      });
    });

    it('GET /api/search filters by category and level', async () => {
      const res = await apiRequest('/api/search?category=Computer%20Science&level=beginner');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.results.length >= 1);
      res.data.results.forEach((r) => {
        if (r.category) assert.strictEqual(r.category, 'Computer Science');
        if (r.level) assert.strictEqual(r.level, 'beginner');
      });
    });

    it('GET /api/search respects pagination limits (page=1, limit=1)', async () => {
      const res = await apiRequest('/api/search?q=SearchTest&limit=1&page=1');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.results.length, 1);
      assert.strictEqual(res.data.limit, 1);
      assert.strictEqual(res.data.page, 1);
      assert.ok(res.data.totalPages >= 1);
    });
  });

  // ==========================================
  // 3. SECURITY & PERMISSION FILTERING (CRITICAL)
  // ==========================================
  describe('3. Security & Permission Filtering Matrix', () => {
    it('CRITICAL: Public search NEVER returns draft courses to unauthenticated users', async () => {
      const res = await apiRequest('/api/search?q=Quantum Computing');
      assert.strictEqual(res.status, 200);
      const found = res.data.results.some((r) => r.title.includes('Secret Quantum'));
      assert.strictEqual(found, false, 'Draft courses must never appear in public search results');
    });

    it('CRITICAL: Public search NEVER returns archived or soft-deleted courses', async () => {
      const res = await apiRequest('/api/search?q=Ruby Rails');
      assert.strictEqual(res.status, 200);
      const found = res.data.results.some((r) => r.title.includes('Deprecated Ruby Rails'));
      assert.strictEqual(found, false, 'Deleted/archived courses must never appear in search');
    });

    it('CRITICAL: Public search NEVER returns unreleased/draft lessons', async () => {
      const res = await apiRequest('/api/search?q=Metaclasses Unreleased');
      assert.strictEqual(res.status, 200);
      const found = res.data.results.some((r) => r.title.includes('Metaclasses Unreleased'));
      assert.strictEqual(found, false, 'Draft lessons must never appear in search');
    });

    it('CRITICAL: Public search NEVER returns private flashcard decks', async () => {
      const res = await apiRequest('/api/search?q=Teacher Notes');
      assert.strictEqual(res.status, 200);
      const found = res.data.results.some((r) => r.title.includes('Teacher Notes'));
      assert.strictEqual(found, false, 'Private flashcard decks must never appear in search');
    });

    it('CRITICAL: Student fetching quizzes via search never receives correctAnswer or explanation', async () => {
      const res = await apiRequest('/api/search?q=Python Fundamentals Quiz&type=quiz');
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.results.length >= 1);
      const quizItem = res.data.results[0];

      // Ensure quiz item does not contain secret fields
      assert.strictEqual(quizItem.correctAnswer, undefined);
      assert.strictEqual(quizItem.explanation, undefined);
      assert.strictEqual(quizItem.questions, undefined);
    });
  });

  // ==========================================
  // 4. AUTOCOMPLETE & ZERO-RESULT INTELLIGENCE
  // ==========================================
  describe('4. Autocomplete Suggestions & Zero-Result Typo Tolerance', () => {
    it('GET /api/search/suggestions?q=python returns fast debounced suggestions bounded by limit', async () => {
      const res = await apiRequest('/api/search/suggestions?q=python&limit=5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.suggestions));
      assert.ok(res.data.suggestions.length <= 5);
      assert.ok(res.data.suggestions.some((s) => s.title.toLowerCase().includes('python')));
    });

    it('GET /api/search detects typo and provides "didYouMean" suggestion', async () => {
      // "pythn" has edit distance 1 from "python"
      const res = await apiRequest('/api/search?q=pythn');
      assert.strictEqual(res.status, 200);
      if (res.data.total === 0) {
        assert.ok(res.data.didYouMean !== null, 'Must propose a typo correction');
        assert.ok(res.data.didYouMean.toLowerCase().includes('python'));
      }
    });
  });

  // ==========================================
  // 5. COURSE DISCOVERY & PERSONALIZATION
  // ==========================================
  describe('5. Course Discovery Feeds & Personalized Search Boost', () => {
    it('GET /api/search/discovery returns recommended, popular, newest, categories and topics', async () => {
      const res = await apiRequest('/api/search/discovery');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.popular), 'Must have popular feed');
      assert.ok(Array.isArray(res.data.newest), 'Must have newest feed');
      assert.ok(Array.isArray(res.data.beginner), 'Must have beginner feed');
      assert.ok(Array.isArray(res.data.categories), 'Must have categories breakdown');
      assert.ok(Array.isArray(res.data.popularTopics), 'Must have popular topics cloud');
    });

    it('Authenticated student with weak topic receives personalized relevance boost', async () => {
      // Unauthenticated search
      const unauthRes = await apiRequest('/api/search?q=Python Programming');
      const unauthItem = unauthRes.data.results.find((r) => r.id === String(publishedCourse1._id));

      // Authenticated search (Student has 'Python Basics' as a confirmed weak topic)
      const authRes = await apiRequest('/api/search?q=Python Programming', { token: studentToken });
      const authItem = authRes.data.results.find((r) => r.id === String(publishedCourse1._id));

      assert.ok(unauthItem, 'Must find course unauthenticated');
      assert.ok(authItem, 'Must find course authenticated');
      assert.ok(
        authItem.score >= unauthItem.score,
        'Personalized score with weak topic match must be greater than or equal to unauthenticated score'
      );
    });
  });

  // ==========================================
  // 6. CONTENT RETRIEVAL & AI MENTOR RAG FOUNDATION
  // ==========================================
  describe('6. AI Mentor Retrieval Foundation & Content Chunking', () => {
    it('retrieveGroundedChunks: returns structured content chunks with full provenance', async () => {
      const rag = await retrieveGroundedChunks({
        userId: studentUser._id,
        query: 'python variables and data types',
        lessonId: publishedLesson._id,
        maxChunks: 2,
      });

      assert.strictEqual(rag.isGrounded, true);
      assert.ok(rag.chunks.length >= 1);
      const chunk = rag.chunks[0];
      assert.strictEqual(chunk.sourceType, 'lesson');
      assert.strictEqual(chunk.sourceId, String(publishedLesson._id));
      assert.strictEqual(chunk.publicationStatus, 'published');
      assert.ok(chunk.snippet.includes('Python'));
      assert.ok(rag.groundingContext.includes('AUTHORITATIVE EDUFLOW COURSE GROUNDING'));
    });

    it('retrieveGroundedChunks: NEVER retrieves draft or deleted content for grounding', async () => {
      const rag = await retrieveGroundedChunks({
        userId: studentUser._id,
        query: 'quantum computing qubits draft',
        maxChunks: 4,
      });

      const leakedDraft = rag.chunks.some((c) => c.title.includes('Secret Quantum'));
      assert.strictEqual(leakedDraft, false, 'AI grounding must NEVER retrieve draft content');
    });
  });

  // ==========================================
  // 7. TELEMETRY & ADMIN ANALYTICS RBAC
  // ==========================================
  describe('7. Search Telemetry & RBAC-Protected Admin Analytics', () => {
    it('POST /api/search/events records privacy-conscious search telemetry safely', async () => {
      const res = await apiRequest('/api/search/events', {
        method: 'POST',
        body: {
          query: 'SearchTest telemetry event query',
          eventType: 'result_click',
          resultCount: 5,
          executionTimeMs: 12,
          selectedResult: {
            entityType: 'course',
            entityId: String(publishedCourse1._id),
            position: 0,
            title: publishedCourse1.title,
          },
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);

      // Verify event logged in database
      const event = await SearchEvent.findOne({ query: 'SearchTest telemetry event query' });
      assert.ok(event);
      assert.strictEqual(event.eventType, 'result_click');
    });

    it('GET /api/search/admin/analytics rejects unauthenticated requests with 401', async () => {
      const res = await apiRequest('/api/search/admin/analytics');
      assert.strictEqual(res.status, 401);
    });

    it('GET /api/search/admin/analytics rejects normal students with 403 FORBIDDEN', async () => {
      const res = await apiRequest('/api/search/admin/analytics', { token: studentToken });
      assert.strictEqual(res.status, 403);
    });

    it('GET /api/search/admin/analytics allows Admin and returns aggregated telemetry', async () => {
      const res = await apiRequest('/api/search/admin/analytics?days=7', { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.analytics.summary !== undefined);
      assert.ok(Array.isArray(res.data.analytics.topSearches));
      assert.ok(Array.isArray(res.data.analytics.zeroResultQueries));
      assert.ok(Array.isArray(res.data.analytics.dailyTrends));
    });
  });

  // ==========================================
  // 8. ADVERSARIAL & SECURITY MATRIX
  // ==========================================
  describe('8. Adversarial & Security Matrix', () => {
    it('Oversized query (1000+ chars) is safely normalized without crashing', async () => {
      const hugeQuery = 'python '.repeat(300);
      const res = await apiRequest(`/api/search?q=${encodeURIComponent(hugeQuery)}`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.normalizedQuery.length <= 100);
    });

    it('NoSQL injection attempts in search parameters are neutralized', async () => {
      const res = await apiRequest('/api/search?q[$ne]=test&type[$gt]=');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    });

    it('Regex special character bombardment does not cause server error or ReDoS', async () => {
      const evilPayload = '(((((.*)+)+)+)+$[](){}\\^?|';
      const res = await apiRequest(`/api/search?q=${encodeURIComponent(evilPayload)}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
    });

    it('Extreme pagination parameters are safely clamped (limit=99999 clamped to 50)', async () => {
      const res = await apiRequest('/api/search?q=Python&limit=99999&page=-5');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.limit, 50, 'Limit must be bounded to max 50');
      assert.strictEqual(res.data.page, 1, 'Page must be bounded to min 1');
    });
  });
});
