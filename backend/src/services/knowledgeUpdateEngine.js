import User from '../models/User.js';
import { recordTopicInteraction } from './masteryService.js';
import { recordMistake, autoResolveQuestionMistakes } from './mistakeService.js';
import { extractTopicsFromContent } from './taxonomyService.js';
import { recalculateLearnerProfile } from './learnerProfileService.js';

/**
 * Handle meaningful streak update
 * Meaningful activity: quiz attempt, lesson completion, or practice session.
 */
async function updateMeaningfulStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (user.lastStudyDate) {
    const lastDateStr = new Date(user.lastStudyDate).toISOString().split('T')[0];
    if (lastDateStr === todayStr) {
      // Already credited for today
      return;
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (lastDateStr === yesterday) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1; // Reset streak if missed more than 1 day
    }
  } else {
    user.streak = 1;
  }

  user.lastStudyDate = now;
  await user.save();
}

/**
 * Event: Quiz attempt submitted
 */
export async function onQuizAttemptSubmitted({ userId, attempt, quiz, review = [] }) {
  const topics = extractTopicsFromContent({ quiz });
  const primaryTopic = topics[0] || 'Quiz Concepts';

  for (const item of review) {
    const isCorrect = item.isCorrect === true;

    // Record interaction in mastery engine
    await recordTopicInteraction({
      userId,
      topic: primaryTopic,
      isCorrect,
    });

    if (!isCorrect) {
      // Log to mistake review
      await recordMistake({
        userId,
        source: 'quiz',
        sourceId: quiz._id,
        question: item.question,
        options: item.options,
        userAnswer: item.userAnswer,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
        topic: primaryTopic,
      });
    } else {
      // Auto-resolve any previous mistake for this question
      await autoResolveQuestionMistakes(userId, item.question);
    }
  }

  // Update streak if quiz had at least 1 answer
  if (attempt.answers?.length > 0) {
    await updateMeaningfulStreak(userId);
  }

  // Refresh derived learner profile in background
  try {
    await recalculateLearnerProfile(userId);
  } catch (err) {
    console.error('Error recalculating profile after quiz:', err.message);
  }
}

/**
 * Event: Flashcard reviewed
 */
export async function onFlashcardReviewed({ userId, card, deck, tags, topic, rating, subject = 'General' }) {
  const isCorrect = rating >= 3;
  const resolvedTopic =
    topic ||
    (Array.isArray(card?.tags) && card.tags[0]) ||
    (Array.isArray(deck?.tags) && deck.tags[0]) ||
    (Array.isArray(tags) && tags[0]) ||
    (deck?.title ? deck.title.replace(/flashcards?/i, '').trim() : null) ||
    'Spaced Repetition';

  await recordTopicInteraction({
    userId,
    topic: resolvedTopic,
    subject: deck?.subject || subject,
    isCorrect,
  });

  if (!isCorrect && card?.front && card?.back) {
    await recordMistake({
      userId,
      source: 'practice',
      sourceId: card._id,
      question: card.front,
      options: [],
      userAnswer: 'Recalled incorrectly',
      correctAnswer: card.back,
      explanation: card.hint || 'Review flashcard definition.',
      topic: resolvedTopic,
      subject: deck?.subject || subject,
    });
  }
}

/**
 * Event: Lesson progress updated
 */
export async function onLessonProgressUpdated({ userId, lesson, course, completed }) {
  if (!completed) return;

  const topics = extractTopicsFromContent({ lesson, course });
  for (const topic of topics) {
    await recordTopicInteraction({
      userId,
      topic,
      subject: course?.category || 'General',
      isCorrect: null, // Reading/completing a lesson builds familiarity without pass/fail bias
    });
  }

  await updateMeaningfulStreak(userId);

  try {
    await recalculateLearnerProfile(userId);
  } catch (err) {
    console.error('Error recalculating profile after lesson:', err.message);
  }
}

/**
 * Event: Practice session completed
 */
export async function onPracticeSessionCompleted({ userId, session, questions = [] }) {
  const topic = session.topic || 'General Practice';
  const subject = session.subject || 'General';

  for (const q of session.questions) {
    const isCorrect = q.isCorrect === true;
    await recordTopicInteraction({
      userId,
      topic,
      subject,
      isCorrect,
    });

    const fullQ = questions.find((item) => item._id.toString() === q.questionId.toString());
    if (!isCorrect && fullQ) {
      await recordMistake({
        userId,
        source: 'practice',
        sourceId: session._id,
        question: fullQ.question,
        options: fullQ.options,
        userAnswer: q.answer || '',
        correctAnswer: fullQ.correctAnswer,
        explanation: fullQ.explanation,
        topic,
        subject,
      });
    } else if (isCorrect && fullQ) {
      await autoResolveQuestionMistakes(userId, fullQ.question);
    }
  }

  await updateMeaningfulStreak(userId);

  try {
    await recalculateLearnerProfile(userId);
  } catch (err) {
    console.error('Error recalculating profile after practice:', err.message);
  }
}

export default {
  onQuizAttemptSubmitted,
  onFlashcardReviewed,
  onLessonProgressUpdated,
  onPracticeSessionCompleted,
};
