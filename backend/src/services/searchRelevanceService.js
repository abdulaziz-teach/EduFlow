/**
 * Search Relevance & Query Normalization Service
 *
 * Implements deterministic relevance ranking, query normalization,
 * Levenshtein typo-distance matching, and explainable score factors.
 */
import { escapeRegex } from '../utils/regexHelper.js';

export { escapeRegex };

/**
 * Clean and normalize a search query safely
 */
export function normalizeQuery(rawQuery = '') {
  if (typeof rawQuery !== 'string') return '';
  return rawQuery
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script blocks
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_+.]/gu, '') // Keep letters, numbers, spaces, and basic separators
    .replace(/\s+/g, ' ')
    .substring(0, 100); // Limit to 100 chars
}

/**
 * Tokenize a query into unique significant words
 */
export function tokenizeQuery(normalizedQuery = '') {
  return normalizedQuery
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Calculate Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a = '', b = '') {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();

  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const matrix = Array.from({ length: s1.length + 1 }, () => new Int32Array(s2.length + 1));

  for (let i = 0; i <= s1.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[s1.length][s2.length];
}

/**
 * Find closest matching term from vocabulary using Levenshtein distance
 */
export function findTypoCorrection(query = '', vocabulary = []) {
  const normalized = normalizeQuery(query);
  if (!normalized || normalized.length < 3) return null;

  let bestMatch = null;
  let minDistance = 3; // Maximum tolerated edit distance

  for (const term of vocabulary) {
    if (!term || typeof term !== 'string') continue;
    const termNorm = normalizeQuery(term);
    if (termNorm === normalized) return null; // Already an exact match

    // Skip wildly different lengths
    if (Math.abs(termNorm.length - normalized.length) > 2) continue;

    const dist = levenshteinDistance(normalized, termNorm);
    if (dist > 0 && dist <= 2 && dist < minDistance) {
      minDistance = dist;
      bestMatch = term;
    }
  }

  return bestMatch;
}

/**
 * Calculate deterministic relevance score for a search result
 *
 * @param {Object} entity - The course, lesson, quiz, or flashcard item
 * @param {string} entityType - 'course' | 'lesson' | 'quiz' | 'flashcard' | 'topic'
 * @param {string} query - Clean normalized search query
 * @param {string[]} tokens - Tokenized words from query
 * @param {number} [textScore=0] - MongoDB text index score if available
 * @param {Object} [personalizationContext={}] - Learner profile, weak topics, active enrollments
 * @returns {{ finalScore: number, explanation: Object }}
 */
export function calculateRelevanceScore(
  entity,
  entityType,
  query,
  tokens = [],
  textScore = 0,
  personalizationContext = {}
) {
  let score = 0;
  const factors = {};

  const title = (entity.title || entity.front || entity.topic || '').toLowerCase();
  const description = (entity.description || entity.back || entity.content || '').toLowerCase();
  const tags = (entity.tags || []).map((t) => String(t).toLowerCase());
  const topics = (entity.topics || []).map((t) => String(t).toLowerCase());
  const category = (entity.category || entity.subject || '').toLowerCase();

  // 1. Exact title match (Highest priority)
  if (title === query) {
    score += 100;
    factors.exactTitle = 100;
  } else if (title.startsWith(query)) {
    score += 60;
    factors.titlePrefix = 60;
  } else if (query.length > 2 && title.includes(query)) {
    score += 40;
    factors.titlePhrase = 40;
  }

  // 2. Token overlap in title
  let tokenMatches = 0;
  for (const token of tokens) {
    if (title.includes(token)) {
      tokenMatches++;
    }
  }
  if (tokenMatches > 0) {
    const tokenScore = Math.min(40, tokenMatches * 15);
    score += tokenScore;
    factors.tokenOverlap = tokenScore;
  }

  // 3. Topics / Tags match
  const hasExactTag = tags.includes(query) || topics.includes(query);
  if (hasExactTag) {
    score += 30;
    factors.exactTag = 30;
  } else {
    const partialTag = tags.some((t) => t.includes(query)) || topics.some((t) => t.includes(query));
    if (partialTag) {
      score += 15;
      factors.partialTag = 15;
    }
  }

  // 4. Category / Subject match
  if (category === query) {
    score += 25;
    factors.exactCategory = 25;
  } else if (category && (category.includes(query) || query.includes(category))) {
    score += 12;
    factors.partialCategory = 12;
  }

  // 5. Description / Content match
  if (query.length > 2 && description.includes(query)) {
    score += 10;
    factors.descriptionMatch = 10;
  }

  // 6. MongoDB Native TextScore contribution
  if (textScore > 0) {
    const normalizedTextScore = Math.min(25, Math.round(textScore * 3));
    score += normalizedTextScore;
    factors.mongoTextScore = normalizedTextScore;
  }

  // 7. Freshness & Quality signals
  if (entity.thumbnail) {
    score += 2;
    factors.hasThumbnail = 2;
  }
  if (entity.publishedAt) {
    const ageDays = (Date.now() - new Date(entity.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) {
      score += 4;
      factors.freshness = 4;
    } else if (ageDays <= 90) {
      score += 2;
      factors.freshness = 2;
    }
  }

  // 8. Personalization Boost (Capped at 25 to prevent overriding search relevance)
  if (personalizationContext.userId) {
    let personalBoost = 0;

    // Weakness remediation match: Does this item address a known weak topic?
    const weakTopics = personalizationContext.weakTopics || [];
    const matchesWeakness = weakTopics.some(
      (wt) => topics.includes(wt.toLowerCase()) || title.includes(wt.toLowerCase())
    );
    if (matchesWeakness) {
      personalBoost += 12;
      factors.personalWeaknessMatch = 12;
    }

    // Goal alignment
    const goals = (personalizationContext.learningGoals || '').toLowerCase();
    if (goals && (title.includes(goals) || category.includes(goals) || tags.some((t) => goals.includes(t)))) {
      personalBoost += 8;
      factors.personalGoalAlignment = 8;
    }

    // Preferred difficulty alignment
    if (
      personalizationContext.preferredDifficulty &&
      entity.level === personalizationContext.preferredDifficulty
    ) {
      personalBoost += 5;
      factors.difficultyAlignment = 5;
    }

    // Active enrolled course relevance
    const enrolledCourseIds = personalizationContext.enrolledCourseIds || [];
    const courseIdStr = String(entity.courseId || entity._id);
    if (enrolledCourseIds.includes(courseIdStr)) {
      personalBoost += 5;
      factors.enrolledCourse = 5;
    }

    // Completed course deprioritization in generic searches
    const completedCourseIds = personalizationContext.completedCourseIds || [];
    if (completedCourseIds.includes(courseIdStr) && entityType === 'course') {
      personalBoost -= 10;
      factors.alreadyCompleted = -10;
    }

    // Bound personalization boost
    const boundedBoost = Math.max(-10, Math.min(25, personalBoost));
    score += boundedBoost;
  }

  // Normalize final score to range 0.01 - 0.99
  const finalScore = Math.max(0.01, Math.min(0.99, Number((score / 200).toFixed(2))));

  return {
    finalScore,
    rawScore: score,
    factors,
  };
}

export default {
  normalizeQuery,
  tokenizeQuery,
  levenshteinDistance,
  findTypoCorrection,
  calculateRelevanceScore,
};
