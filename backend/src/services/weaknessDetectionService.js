import QuizAttempt from '../models/QuizAttempt.js';
import Quiz from '../models/Quiz.js';
import Lesson from '../models/Lesson.js';
import FlashcardProgress from '../models/FlashcardProgress.js';
import Flashcard from '../models/Flashcard.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import KnowledgeEvent from '../models/KnowledgeEvent.js';
import PracticeSession from '../models/PracticeSession.js';

/**
 * Weakness Detection Service
 *
 * Rigorously identifies learner weaknesses using multi-factor evidence.
 *
 * Rules:
 * 1. Single mistake NEVER labels a learner as weak.
 * 2. Minimum negative evidence threshold: at least 2 negative events across activities.
 * 3. Quantified confidence score in range [0.0, 1.0]:
 *    confidence = min(1.0, (failCount / 5) * 0.4 + errorRate * 0.4 + recencyFactor * 0.2)
 */

export async function detectWeaknesses(userId) {
  const topicMap = new Map();

  function getOrCreateTopic(topicName, subject = 'General') {
    const key = topicName.trim().toLowerCase();
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topic: topicName.trim(),
        subject: subject.trim(),
        quizFailures: 0,
        quizTotal: 0,
        flashcardLapses: 0,
        practiceErrors: 0,
        practiceTotal: 0,
        helpRequests: 0,
        lastFailureDate: null,
      });
    }
    return topicMap.get(key);
  }

  // 1. Gather Quiz Mistakes
  const quizAttempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(20);
  for (const attempt of quizAttempts) {
    const quiz = await Quiz.findById(attempt.quizId);
    if (!quiz) continue;

    const lesson = await Lesson.findById(quiz.lessonId);
    const topic = lesson?.title || quiz.title || 'General';

    const item = getOrCreateTopic(topic);
    item.quizTotal += attempt.answers.length;

    for (const ans of attempt.answers) {
      if (!ans.isCorrect) {
        item.quizFailures += 1;
        if (!item.lastFailureDate || attempt.createdAt > item.lastFailureDate) {
          item.lastFailureDate = attempt.createdAt;
        }
      }
    }
  }

  // 2. Gather Flashcard Lapses
  const flashcardProgresses = await FlashcardProgress.find({
    userId,
    lapses: { $gte: 1 },
  }).populate('flashcardId');

  for (const fp of flashcardProgresses) {
    if (!fp.flashcardId) continue;
    const topic = fp.flashcardId.tags?.[0] || 'Flashcard Concepts';
    const item = getOrCreateTopic(topic);
    item.flashcardLapses += fp.lapses;
    if (fp.lastReviewedAt && (!item.lastFailureDate || fp.lastReviewedAt > item.lastFailureDate)) {
      item.lastFailureDate = fp.lastReviewedAt;
    }
  }

  // 3. Gather Knowledge Events (needs_review topics or negative events)
  const knowledgeTopics = await KnowledgeTopic.find({ userId });
  for (const kt of knowledgeTopics) {
    const item = getOrCreateTopic(kt.topic, kt.subject);
    if (kt.status === 'needs_review') {
      item.helpRequests += Math.max(1, 3 - Math.floor(kt.confidence / 20));
      if (kt.lastPracticedAt && (!item.lastFailureDate || kt.lastPracticedAt > item.lastFailureDate)) {
        item.lastFailureDate = kt.lastPracticedAt;
      }
    }
  }

  const helpEvents = await KnowledgeEvent.find({
    userId,
    type: { $in: ['asked_help', 'incorrect'] },
  }).limit(50);

  for (const ev of helpEvents) {
    const kt = knowledgeTopics.find((t) => t._id.toString() === ev.topicId.toString());
    if (kt) {
      const item = getOrCreateTopic(kt.topic, kt.subject);
      if (ev.type === 'asked_help') item.helpRequests += 1;
      if (ev.type === 'incorrect') item.practiceErrors += 1;
      if (ev.createdAt && (!item.lastFailureDate || ev.createdAt > item.lastFailureDate)) {
        item.lastFailureDate = ev.createdAt;
      }
    }
  }

  // 4. Gather Practice Sessions
  const practiceSessions = await PracticeSession.find({ userId }).sort({ startedAt: -1 }).limit(15);
  for (const ps of practiceSessions) {
    const item = getOrCreateTopic(ps.topic, ps.subject);
    for (const q of ps.questions) {
      if (q.isCorrect === false) {
        item.practiceErrors += 1;
        item.practiceTotal += 1;
        if (q.answeredAt && (!item.lastFailureDate || q.answeredAt > item.lastFailureDate)) {
          item.lastFailureDate = q.answeredAt;
        }
      } else if (q.isCorrect === true) {
        item.practiceTotal += 1;
      }
    }
  }

  // 5. Evaluate confidence & filter out single-occurrence noise
  const weakTopics = [];

  for (const data of topicMap.values()) {
    const totalNegativeSignals =
      data.quizFailures + data.flashcardLapses + data.practiceErrors + data.helpRequests;

    // Rule: Never label as weak based on a single mistake (must have at least 2 negative signals)
    if (totalNegativeSignals < 2) {
      continue;
    }

    // Calculate error rate where attempts were tracked
    const trackedAttempts = data.quizTotal + data.practiceTotal;
    const trackedErrors = data.quizFailures + data.practiceErrors;
    const errorRate = trackedAttempts > 0 ? trackedErrors / trackedAttempts : 0.7;

    // Recency factor (more recent mistakes increase confidence of ongoing struggle)
    let recencyFactor = 0.5;
    if (data.lastFailureDate) {
      const daysSince = (Date.now() - new Date(data.lastFailureDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 2) recencyFactor = 1.0;
      else if (daysSince <= 7) recencyFactor = 0.8;
      else if (daysSince <= 14) recencyFactor = 0.6;
      else recencyFactor = 0.3;
    }

    // Quantified confidence formula
    const failureVolumeScore = Math.min(1.0, totalNegativeSignals / 6);
    const rawConfidence = failureVolumeScore * 0.4 + errorRate * 0.4 + recencyFactor * 0.2;
    const confidence = Math.min(1.0, Math.max(0.2, Math.round(rawConfidence * 100) / 100));

    weakTopics.push({
      topic: data.topic,
      subject: data.subject,
      confidence,
      evidence: {
        quizFailures: data.quizFailures,
        flashcardLapses: data.flashcardLapses,
        practiceErrors: data.practiceErrors,
        helpRequests: data.helpRequests,
      },
      lastObservedAt: data.lastFailureDate || new Date(),
    });
  }

  // Sort by highest confidence weakness first
  weakTopics.sort((a, b) => b.confidence - a.confidence);

  return weakTopics;
}

export default {
  detectWeaknesses,
};
