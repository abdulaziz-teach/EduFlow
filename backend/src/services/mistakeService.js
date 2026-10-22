import MistakeLog from '../models/MistakeLog.js';
import { normalizeTopicName } from './taxonomyService.js';

/**
 * Record an incorrect answer to the student's mistake review log
 */
export async function recordMistake({
  userId,
  source,
  sourceId = null,
  question,
  options = [],
  userAnswer = '',
  correctAnswer,
  explanation = '',
  topic,
  subject = 'General',
}) {
  const normTopic = normalizeTopicName(topic);
  const cleanQ = question.trim();

  // Deduplicate: If an existing unresolved mistake exists for this exact question, increment attempt count
  const existing = await MistakeLog.findOne({
    userId,
    question: cleanQ,
    resolved: false,
  });

  if (existing) {
    existing.attemptsCount += 1;
    existing.userAnswer = userAnswer;
    existing.lastAttemptAt = new Date();
    await existing.save();
    return existing;
  }

  const mistake = await MistakeLog.create({
    userId,
    source,
    sourceId,
    question: cleanQ,
    options,
    userAnswer,
    correctAnswer,
    explanation,
    topic: normTopic,
    subject,
    resolved: false,
    attemptsCount: 1,
    lastAttemptAt: new Date(),
  });

  return mistake;
}

/**
 * Retrieve unresolved mistakes for the learner
 */
export async function getUnresolvedMistakes(userId, limit = 20) {
  return await MistakeLog.find({ userId, resolved: false })
    .sort({ lastAttemptAt: -1 })
    .limit(limit);
}

/**
 * Resolve a mistake after successful re-attempt
 */
export async function resolveMistake(userId, mistakeId) {
  const mistake = await MistakeLog.findOneAndUpdate(
    { _id: mistakeId, userId, resolved: false },
    {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
      },
    },
    { new: true }
  );

  return mistake;
}

/**
 * Automatically resolve mistakes matching a question text when answered correctly
 */
export async function autoResolveQuestionMistakes(userId, questionText) {
  if (!questionText) return;
  await MistakeLog.updateMany(
    { userId, question: questionText.trim(), resolved: false },
    {
      $set: {
        resolved: true,
        resolvedAt: new Date(),
      },
    }
  );
}

export default {
  recordMistake,
  getUnresolvedMistakes,
  resolveMistake,
  autoResolveQuestionMistakes,
};
