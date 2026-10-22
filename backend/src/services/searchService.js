import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import FlashcardDeck from '../models/FlashcardDeck.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import Enrollment from '../models/Enrollment.js';
import LearnerProfile from '../models/LearnerProfile.js';
import UserTopicMastery from '../models/UserTopicMastery.js';

import { searchCache, buildCacheKey } from './searchCache.js';
import {
  normalizeQuery,
  tokenizeQuery,
  calculateRelevanceScore,
  findTypoCorrection,
  escapeRegex,
} from './searchRelevanceService.js';
import { understandSearchQuery } from './aiSearchService.js';
import { recordSearchEvent } from './searchAnalyticsService.js';

/**
 * Cache vocabulary list for fast Levenshtein typo correction
 */
let cachedVocabulary = [];
let vocabLastUpdated = 0;

async function getSearchVocabulary() {
  const now = Date.now();
  if (cachedVocabulary.length > 0 && now - vocabLastUpdated < 10 * 60 * 1000) {
    return cachedVocabulary;
  }

  try {
    const [courseTitles, categories, topics, deckSubjects] = await Promise.all([
      Course.find({ status: 'published', deletedAt: null }).distinct('title'),
      Course.find({ status: 'published', deletedAt: null }).distinct('category'),
      Course.find({ status: 'published', deletedAt: null }).distinct('topics'),
      FlashcardDeck.find({ status: 'published', isPublic: true }).distinct('subject'),
    ]);

    const set = new Set([
      ...courseTitles,
      ...categories,
      ...topics,
      ...deckSubjects,
      'javascript', 'python', 'react', 'node', 'express', 'mongodb', 'html', 'css',
      'docker', 'typescript', 'algorithms', 'frontend', 'backend', 'data science',
    ]);

    cachedVocabulary = Array.from(set).filter(Boolean);
    vocabLastUpdated = now;
    return cachedVocabulary;
  } catch (_err) {
    return cachedVocabulary;
  }
}

/**
 * Build personalization context for an authenticated user
 */
async function buildUserPersonalizationContext(userId) {
  if (!userId) return {};

  try {
    const [profile, activeEnrollments, completedEnrollments, masteries] = await Promise.all([
      LearnerProfile.findOne({ userId }).lean(),
      Enrollment.find({ userId, status: 'active' }).select('courseId').lean(),
      Enrollment.find({ userId, status: 'completed' }).select('courseId').lean(),
      UserTopicMastery.find({ userId, status: 'needs_review' }).select('topic').limit(5).lean(),
    ]);

    const weakTopics = [
      ...(profile?.weakTopics?.map((w) => w.topic) || []),
      ...(masteries?.map((m) => m.topic) || []),
    ];

    return {
      userId,
      learningGoals: profile?.learningGoals || '',
      preferredDifficulty: profile?.preferredDifficulty || null,
      weakTopics: Array.from(new Set(weakTopics)),
      enrolledCourseIds: activeEnrollments.map((e) => String(e.courseId)),
      completedCourseIds: completedEnrollments.map((e) => String(e.courseId)),
    };
  } catch (_err) {
    return { userId };
  }
}

/**
 * Global Multi-Entity Search
 */
export async function executeGlobalSearch({
  query = '',
  type = 'all', // 'all' | 'course' | 'lesson' | 'quiz' | 'flashcard' | 'topic'
  category = null,
  level = null,
  language = null,
  sort = 'relevance', // 'relevance' | 'newest' | 'popular'
  page = 1,
  limit = 20,
  userId = null,
  userRole = 'user',
  enableAi = false,
  anonymousSessionId = null,
}) {
  const startTime = Date.now();
  const isAdmin = userRole === 'admin';

  // 1. Query Normalization & Input Validation
  const rawQuery = String(query || '').trim();
  const normalized = normalizeQuery(rawQuery);
  const tokens = tokenizeQuery(normalized);

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // If query is empty and no filters are specified, return an empty search or redirect to discovery
  if (!normalized && !category && !level && type === 'all') {
    return {
      query: '',
      normalizedQuery: '',
      total: 0,
      page: safePage,
      limit: safeLimit,
      totalPages: 0,
      facets: { types: {}, categories: {}, levels: {} },
      results: [],
      didYouMean: null,
      intentAnalysis: null,
    };
  }

  // 2. Check Search Cache for public unpersonalized searches
  const isPersonalized = Boolean(userId);
  const cacheKey = buildCacheKey('search', {
    q: normalized,
    type,
    category,
    level,
    language,
    sort,
    page: safePage,
    limit: safeLimit,
  }, isPersonalized ? userId : null);

  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 3. AI-Assisted Query Understanding (if natural language query or explicitly enabled)
  let intentAnalysis = null;
  let effectiveLevel = level;
  let effectiveQuery = normalized;

  if (normalized.length >= 5) {
    intentAnalysis = await understandSearchQuery(rawQuery);
    if (!level && intentAnalysis.level) {
      effectiveLevel = intentAnalysis.level;
    }
    if (intentAnalysis.isNaturalLanguage && intentAnalysis.cleanedKeywords) {
      effectiveQuery = normalizeQuery(intentAnalysis.cleanedKeywords);
    }
  }

  const effectiveTokens = tokenizeQuery(effectiveQuery);

  // 4. Fetch Personalization Context if authenticated
  const personalizationContext = isPersonalized ? await buildUserPersonalizationContext(userId) : {};

  // 5. Query Entities in Parallel
  const tasks = [];

  // Base visibility filters
  const courseBaseFilter = { deletedAt: null };
  if (!isAdmin) courseBaseFilter.status = 'published';
  if (category) courseBaseFilter.category = category;
  if (effectiveLevel) courseBaseFilter.level = effectiveLevel;
  if (language) courseBaseFilter.language = language;

  // --- Courses Search ---
  if (type === 'all' || type === 'course') {
    tasks.push(
      (async () => {
        const filter = { ...courseBaseFilter };
        if (effectiveQuery.length >= 2) {
          filter.$text = { $search: effectiveQuery };
        }

        let queryBuilder = Course.find(filter);
        if (effectiveQuery.length >= 2) {
          queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
        }

        const courses = await queryBuilder
          .populate('instructorId', 'displayName name avatar')
          .limit(60)
          .lean();

        return courses.map((c) => {
          const { finalScore, factors } = calculateRelevanceScore(
            c,
            'course',
            effectiveQuery,
            effectiveTokens,
            c.score || 0,
            personalizationContext
          );

          return {
            type: 'course',
            id: String(c._id),
            title: c.title,
            slug: c.slug,
            description: c.description,
            thumbnail: c.thumbnail,
            category: c.category,
            level: c.level,
            language: c.language,
            tags: c.tags || [],
            topics: c.topics || [],
            instructor: c.instructorId ? {
              name: c.instructorId.displayName || c.instructorId.name,
              avatar: c.instructorId.avatar,
            } : null,
            score: finalScore,
            scoreFactors: isAdmin ? factors : undefined,
            publishedAt: c.publishedAt || c.createdAt,
            createdAt: c.createdAt,
          };
        });
      })()
    );
  }

  // --- Lessons Search ---
  if (type === 'all' || type === 'lesson') {
    tasks.push(
      (async () => {
        const lessonFilter = {};
        if (!isAdmin) {
          lessonFilter.isPublished = true;
          lessonFilter.status = 'published';
        }
        if (effectiveQuery.length >= 2) {
          lessonFilter.$text = { $search: effectiveQuery };
        }

        let queryBuilder = Lesson.find(lessonFilter);
        if (effectiveQuery.length >= 2) {
          queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
        }

        const lessons = await queryBuilder
          .populate('courseId', 'title slug status category level deletedAt')
          .limit(40)
          .lean();

        const validLessons = lessons.filter(
          (l) => l.courseId && (isAdmin || (l.courseId.status === 'published' && !l.courseId.deletedAt))
        );

        return validLessons.map((l) => {
          const { finalScore, factors } = calculateRelevanceScore(
            l,
            'lesson',
            effectiveQuery,
            effectiveTokens,
            l.score || 0,
            personalizationContext
          );

          return {
            type: 'lesson',
            id: String(l._id),
            title: l.title,
            slug: l.slug,
            description: l.description,
            order: l.order,
            duration: l.duration,
            courseId: l.courseId ? String(l.courseId._id) : null,
            courseTitle: l.courseId?.title || '',
            courseSlug: l.courseId?.slug || '',
            category: l.courseId?.category || '',
            level: l.courseId?.level || 'beginner',
            score: finalScore,
            scoreFactors: isAdmin ? factors : undefined,
            createdAt: l.createdAt,
          };
        });
      })()
    );
  }

  // --- Quizzes Search ---
  if (type === 'all' || type === 'quiz') {
    tasks.push(
      (async () => {
        const quizFilter = {};
        if (!isAdmin) quizFilter.status = 'published';
        if (effectiveQuery.length >= 2) {
          quizFilter.$text = { $search: effectiveQuery };
        }

        let queryBuilder = Quiz.find(quizFilter);
        if (effectiveQuery.length >= 2) {
          queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
        }

        const quizzes = await queryBuilder
          .populate('lessonId', 'title slug courseId isPublished status')
          .limit(30)
          .lean();

        const validQuizzes = quizzes.filter(
          (q) => q.lessonId && (isAdmin || (q.lessonId.isPublished && q.lessonId.status === 'published'))
        );

        return validQuizzes.map((q) => {
          const { finalScore, factors } = calculateRelevanceScore(
            q,
            'quiz',
            effectiveQuery,
            effectiveTokens,
            q.score || 0,
            personalizationContext
          );

          return {
            type: 'quiz',
            id: String(q._id),
            title: q.title,
            description: q.description,
            passingScore: q.passingScore,
            timeLimit: q.timeLimit,
            questionsCount: (q.questions || []).length,
            lessonId: q.lessonId ? String(q.lessonId._id) : null,
            lessonTitle: q.lessonId?.title || '',
            score: finalScore,
            scoreFactors: isAdmin ? factors : undefined,
            createdAt: q.createdAt,
          };
        });
      })()
    );
  }

  // --- Flashcards Search ---
  if (type === 'all' || type === 'flashcard') {
    tasks.push(
      (async () => {
        const deckFilter = {};
        if (!isAdmin) {
          deckFilter.status = 'published';
          deckFilter.isPublic = true;
        }
        if (effectiveQuery.length >= 2) {
          deckFilter.$text = { $search: effectiveQuery };
        }

        let queryBuilder = FlashcardDeck.find(deckFilter);
        if (effectiveQuery.length >= 2) {
          queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
        }

        const decks = await queryBuilder.limit(30).lean();

        return decks.map((d) => {
          const { finalScore, factors } = calculateRelevanceScore(
            d,
            'flashcard',
            effectiveQuery,
            effectiveTokens,
            d.score || 0,
            personalizationContext
          );

          return {
            type: 'flashcard',
            id: String(d._id),
            title: d.title,
            description: d.description,
            subject: d.subject,
            tags: d.tags || [],
            cardsCount: (d.cards || []).length,
            score: finalScore,
            scoreFactors: isAdmin ? factors : undefined,
            createdAt: d.createdAt,
          };
        });
      })()
    );
  }

  // --- Topics Search ---
  if (type === 'all' || type === 'topic') {
    tasks.push(
      (async () => {
        if (effectiveQuery.length < 2) return [];

        const topics = await KnowledgeTopic.find({
          topic: { $regex: escapeRegex(effectiveQuery), $options: 'i' },
        })
          .limit(15)
          .lean();

        return topics.map((t) => ({
          type: 'topic',
          id: String(t._id),
          title: t.topic,
          subject: t.subject,
          score: 0.7,
          createdAt: t.createdAt,
        }));
      })()
    );
  }

  // Wait for all entity search queries to finish
  const entityResults = await Promise.all(tasks);
  let allResults = entityResults.flat();

  // 6. Compute Facets before pagination
  const facets = {
    types: {},
    categories: {},
    levels: {},
  };

  for (const item of allResults) {
    facets.types[item.type] = (facets.types[item.type] || 0) + 1;
    if (item.category) {
      facets.categories[item.category] = (facets.categories[item.category] || 0) + 1;
    }
    if (item.level) {
      facets.levels[item.level] = (facets.levels[item.level] || 0) + 1;
    }
  }

  // 7. Apply Sorting
  if (sort === 'newest') {
    allResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sort === 'popular') {
    // Rank courses with more tags / cards / higher score
    allResults.sort((a, b) => b.score - a.score);
  } else {
    // Default: Sort strictly by computed relevance score descending
    allResults.sort((a, b) => b.score - a.score);
  }

  // 8. Pagination Slice
  const total = allResults.length;
  const totalPages = Math.ceil(total / safeLimit);
  const skip = (safePage - 1) * safeLimit;
  const paginatedResults = allResults.slice(skip, skip + safeLimit);

  // 9. Zero-Result Typo Tolerance & "Did you mean?" Intelligence
  let didYouMean = null;
  if (total === 0 && effectiveQuery.length >= 3) {
    const vocab = await getSearchVocabulary();
    didYouMean = findTypoCorrection(effectiveQuery, vocab);
  }

  const executionTimeMs = Date.now() - startTime;

  const responsePayload = {
    success: true,
    query: rawQuery,
    normalizedQuery: effectiveQuery,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    facets,
    results: paginatedResults,
    didYouMean,
    intentAnalysis: intentAnalysis?.isNaturalLanguage ? intentAnalysis : null,
    executionTimeMs,
  };

  // Cache public result
  searchCache.set(cacheKey, responsePayload);

  // 10. Record Telemetry (Non-blocking)
  recordSearchEvent({
    query: rawQuery,
    userId,
    anonymousSessionId,
    eventType: total === 0 ? 'zero_results' : 'search',
    resultCount: total,
    executionTimeMs,
    filters: { type, category, level, language, sort },
  });

  return responsePayload;
}

/**
 * Autocomplete Search Suggestions
 */
export async function getSearchSuggestions({ query = '', limit = 8 }) {
  const norm = normalizeQuery(query);
  if (!norm || norm.length < 2) {
    return { suggestions: [] };
  }

  const cacheKey = `suggestions:${norm}:${limit}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const safeLimit = Math.min(15, Math.max(1, parseInt(limit, 10) || 8));

  // Find prefix/text matches across courses, topics, and subjects
  const [courses, decks, topics] = await Promise.all([
    Course.find({
      status: 'published',
      deletedAt: null,
      $text: { $search: norm },
    })
      .select('title slug category level')
      .limit(safeLimit)
      .lean(),

    FlashcardDeck.find({
      status: 'published',
      isPublic: true,
      $text: { $search: norm },
    })
      .select('title subject')
      .limit(4)
      .lean(),

    Course.find({
      status: 'published',
      deletedAt: null,
      topics: { $in: [new RegExp(`^${escapeRegex(norm)}`, 'i')] },
    })
      .distinct('topics'),
  ]);

  const suggestions = [];

  // Add course suggestions
  courses.forEach((c) => {
    suggestions.push({
      type: 'course',
      id: String(c._id),
      title: c.title,
      slug: c.slug,
      category: c.category,
      level: c.level,
    });
  });

  // Add topic suggestions
  topics.slice(0, 3).forEach((top) => {
    if (!suggestions.some((s) => s.title.toLowerCase() === top.toLowerCase())) {
      suggestions.push({
        type: 'topic',
        title: top,
      });
    }
  });

  // Add deck suggestions
  decks.forEach((d) => {
    if (suggestions.length < safeLimit) {
      suggestions.push({
        type: 'flashcard',
        id: String(d._id),
        title: d.title,
        subject: d.subject,
      });
    }
  });

  const finalSuggestions = suggestions.slice(0, safeLimit);
  const result = { suggestions: finalSuggestions };

  searchCache.set(cacheKey, result, 60 * 1000); // 1 minute TTL for autocomplete
  return result;
}

/**
 * Course Discovery Feeds
 */
export async function getCourseDiscovery({ userId = null }) {
  const cacheKey = buildCacheKey('discovery', {}, userId);
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  const [
    popularCourses,
    newestCourses,
    beginnerCourses,
    categoriesWithCounts,
    distinctTopics,
  ] = await Promise.all([
    // Popular courses
    Course.find({ status: 'published', deletedAt: null })
      .populate('instructorId', 'displayName name avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),

    // Newest courses
    Course.find({ status: 'published', deletedAt: null })
      .populate('instructorId', 'displayName name avatar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(6)
      .lean(),

    // Beginner friendly
    Course.find({ status: 'published', deletedAt: null, level: 'beginner' })
      .populate('instructorId', 'displayName name avatar')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),

    // Distinct categories with counts
    Course.aggregate([
      { $match: { status: 'published', deletedAt: null } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]),

    // Distinct popular topics
    Course.find({ status: 'published', deletedAt: null }).distinct('topics'),
  ]);

  // Personalization recommendations for authenticated user
  let recommendedCourses = [];
  if (userId) {
    const userContext = await buildUserPersonalizationContext(userId);
    const completedSet = new Set(userContext.completedCourseIds || []);

    // Filter out already completed courses from recommendations
    recommendedCourses = popularCourses.filter((c) => !completedSet.has(String(c._id))).slice(0, 4);

    // If user has weak topics, boost courses covering those topics
    if (userContext.weakTopics && userContext.weakTopics.length > 0) {
      const weaknessCourses = await Course.find({
        status: 'published',
        deletedAt: null,
        _id: { $nin: userContext.completedCourseIds || [] },
        topics: { $in: userContext.weakTopics },
      })
        .populate('instructorId', 'displayName name avatar')
        .limit(4)
        .lean();

      if (weaknessCourses.length > 0) {
        recommendedCourses = weaknessCourses;
      }
    }
  } else {
    recommendedCourses = popularCourses.slice(0, 4);
  }

  const discoveryPayload = {
    success: true,
    recommended: recommendedCourses,
    popular: popularCourses,
    newest: newestCourses,
    beginner: beginnerCourses,
    categories: categoriesWithCounts,
    popularTopics: distinctTopics.slice(0, 15),
  };

  searchCache.set(cacheKey, discoveryPayload, 5 * 60 * 1000); // 5 min TTL
  return discoveryPayload;
}

export default {
  executeGlobalSearch,
  getSearchSuggestions,
  getCourseDiscovery,
};
