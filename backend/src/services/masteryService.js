import UserTopicMastery from '../models/UserTopicMastery.js';
import { normalizeTopicName } from './taxonomyService.js';

const DECAY_GRACE_DAYS = 5;
const DECAY_PER_DAY = 0.02;
const MAX_DECAY = 0.20;

/**
 * Calculate knowledge score, confidence, and status from empirical evidence
 *
 * NOTE: This is a product-derived heuristic estimate designed for educational
 * pacing and pacing recommendations, not an accredited psychometric score.
 */
export function calculateMasteryMetrics({
  correctCount = 0,
  incorrectCount = 0,
  evidenceCount = 0,
  lastPracticedAt = null,
}) {
  const totalAnswers = correctCount + incorrectCount;
  const accuracy = totalAnswers > 0 ? correctCount / totalAnswers : 0.5;

  // Confidence grows with volume of distinct evidence items (saturates at 8 events)
  const confidence = Math.min(1.0, Math.max(0.0, Math.round((evidenceCount / 8) * 100) / 100));

  // Memory decay calculation if time has elapsed since last practice
  let decayPenalty = 0;
  if (lastPracticedAt) {
    const daysSince = (Date.now() - new Date(lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > DECAY_GRACE_DAYS) {
      decayPenalty = Math.min(MAX_DECAY, (daysSince - DECAY_GRACE_DAYS) * DECAY_PER_DAY);
    }
  }

  // Base familiarity bonus (max 0.2) + accuracy factor (max 0.8) - recency decay
  const familiarity = Math.min(1.0, evidenceCount / 4);
  const rawScore = 0.2 * familiarity + 0.8 * accuracy - decayPenalty;
  const knowledgeScore = Math.min(1.0, Math.max(0.0, Math.round(rawScore * 100) / 100));

  // Determine status
  let status = 'learning';
  if (evidenceCount >= 4 && knowledgeScore >= 0.85 && confidence >= 0.70) {
    status = 'mastered';
  } else if (knowledgeScore >= 0.70 && confidence >= 0.50) {
    status = 'proficient';
  } else if (evidenceCount >= 2 && (knowledgeScore < 0.50 || accuracy < 0.50)) {
    status = 'needs_review';
  }

  // Adaptive difficulty selection
  let recommendedDifficulty = 'medium';
  if (knowledgeScore >= 0.80 && confidence >= 0.60) {
    recommendedDifficulty = 'hard';
  } else if (knowledgeScore < 0.50 || status === 'needs_review') {
    recommendedDifficulty = 'easy';
  }

  // Transparent explanation of the estimate
  let explanation = '';
  if (status === 'mastered') {
    explanation = `High mastery demonstrated across ${evidenceCount} activities with ${(accuracy * 100).toFixed(0)}% accuracy. Advanced material recommended.`;
  } else if (status === 'proficient') {
    explanation = `Consistent performance with ${(accuracy * 100).toFixed(0)}% accuracy. Ready for standard or challenging practice.`;
  } else if (status === 'needs_review') {
    explanation = `Recent accuracy dropped to ${(accuracy * 100).toFixed(0)}% over ${totalAnswers} attempts. Reviewing foundational concepts or easier practice will reinforce understanding.`;
  } else {
    explanation = `Emerging topic with ${evidenceCount} learning interaction(s). Continued practice will build familiarity and confidence.`;
  }

  return {
    knowledgeScore,
    confidence,
    status,
    recommendedDifficulty,
    explanation,
  };
}

/**
 * Record a learning interaction for a topic and recalculate mastery
 */
export async function recordTopicInteraction({
  userId,
  topic,
  subject = 'General',
  isCorrect = null, // true, false, or null (e.g. read a lesson)
}) {
  const normTopic = normalizeTopicName(topic);
  const normSubject = normalizeTopicName(subject);

  let record = await UserTopicMastery.findOne({
    userId,
    subject: normSubject,
    topic: normTopic,
  });

  if (!record) {
    record = new UserTopicMastery({
      userId,
      subject: normSubject,
      topic: normTopic,
      evidenceCount: 0,
      correctCount: 0,
      incorrectCount: 0,
    });
  }

  record.evidenceCount += 1;
  if (isCorrect === true) {
    record.correctCount += 1;
  } else if (isCorrect === false) {
    record.incorrectCount += 1;
  }

  record.lastPracticedAt = new Date();

  // Recalculate metrics
  const metrics = calculateMasteryMetrics({
    correctCount: record.correctCount,
    incorrectCount: record.incorrectCount,
    evidenceCount: record.evidenceCount,
    lastPracticedAt: record.lastPracticedAt,
  });

  record.knowledgeScore = metrics.knowledgeScore;
  record.confidence = metrics.confidence;
  record.status = metrics.status;
  record.recommendedDifficulty = metrics.recommendedDifficulty;
  record.explanation = metrics.explanation;
  record.lastEvaluatedAt = new Date();

  await record.save();
  return record;
}

/**
 * Get all topic masteries for a user
 */
export async function getUserMasteries(userId) {
  return await UserTopicMastery.find({ userId }).sort({ updatedAt: -1 });
}

/**
 * Get single topic mastery record with explanation
 */
export async function getTopicMastery(userId, topic, subject = '') {
  const normTopic = normalizeTopicName(topic);
  const query = { userId, topic: normTopic };
  if (subject) {
    query.subject = normalizeTopicName(subject);
  }

  return await UserTopicMastery.findOne(query);
}

export default {
  calculateMasteryMetrics,
  recordTopicInteraction,
  getUserMasteries,
  getTopicMastery,
};
