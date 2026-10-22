/**
 * Engagement Engine
 * Retention logic and triggers: streak protection, aggregated flashcard reviews,
 * daily plan check-ins, mastery-driven recommendations, and course milestones.
 */

import User from '../models/User.js';
import FlashcardProgress from '../models/FlashcardProgress.js';
import DailyLearningPlan from '../models/DailyLearningPlan.js';
import UserTopicMastery from '../models/UserTopicMastery.js';
import { dispatchNotification } from './notificationEngine.js';

function getTodayKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().split('T')[0];
}

/**
 * Evaluate streak risk for a user and trigger supportive reminder if needed
 */
export async function evaluateStreakRisk(user) {
  if (!user || typeof user.streak !== 'number' || user.streak <= 0) {
    return { triggered: false, reason: 'no_active_streak' };
  }

  const todayKey = getTodayKey();
  if (user.lastStudyDate) {
    const lastStudyKey = getTodayKey(new Date(user.lastStudyDate));
    if (lastStudyKey === todayKey) {
      return { triggered: false, reason: 'already_studied_today' };
    }
  }

  const deduplicationKey = `streak_reminder_${user._id}_${todayKey}`;

  const result = await dispatchNotification({
    userId: user._id,
    type: 'STREAK_REMINDER',
    data: {
      streakDays: user.streak,
    },
    deduplicationKey,
    priority: 'normal',
    link: '/dashboard',
  });

  return { triggered: !result.skipped, ...result };
}

/**
 * Aggregate due flashcards into a SINGLE daily notification
 */
export async function evaluateFlashcardDue(userId) {
  const dueCount = await FlashcardProgress.countDocuments({
    userId,
    dueAt: { $lte: new Date() },
  });

  if (dueCount === 0) {
    return { triggered: false, count: 0 };
  }

  const todayKey = getTodayKey();
  const deduplicationKey = `flashcard_due_${userId}_${todayKey}`;

  const result = await dispatchNotification({
    userId,
    type: 'FLASHCARD_REVIEW',
    data: {
      count: dueCount,
    },
    deduplicationKey,
    priority: 'normal',
    link: '/flashcards',
  });

  return { triggered: !result.skipped, count: dueCount, ...result };
}

/**
 * Evaluate pending daily plan tasks and trigger check-in
 */
export async function evaluateDailyPlan(userId) {
  const todayKey = getTodayKey();

  const plan = await DailyLearningPlan.findOne({
    userId,
    dateStr: todayKey,
  });

  if (!plan || !plan.tasks || plan.tasks.length === 0) {
    return { triggered: false, reason: 'no_plan_for_today' };
  }

  const pendingTasks = plan.tasks.filter((t) => !t.completed);
  if (pendingTasks.length === 0) {
    return { triggered: false, reason: 'all_tasks_completed' };
  }

  const deduplicationKey = `daily_plan_${userId}_${todayKey}`;

  const result = await dispatchNotification({
    userId,
    type: 'DAILY_PLAN',
    data: {
      taskCount: pendingTasks.length,
    },
    deduplicationKey,
    priority: 'normal',
    link: '/daily-plan',
  });

  return { triggered: !result.skipped, pendingCount: pendingTasks.length, ...result };
}

/**
 * Identify weak topics and suggest targeted review
 */
export async function evaluateWeakTopics(userId) {
  const weakMastery = await UserTopicMastery.findOne({
    userId,
    $or: [{ status: 'needs_review' }, { knowledgeScore: { $lt: 0.6 } }],
  })
    .sort({ knowledgeScore: 1 })
    .lean();

  if (!weakMastery) {
    return { triggered: false, reason: 'no_weak_topics' };
  }

  const weekKey = getWeekKey();
  const deduplicationKey = `weak_topic_${userId}_${weakMastery.topic.replace(/\s+/g, '_')}_${weekKey}`;

  const result = await dispatchNotification({
    userId,
    type: 'RECOMMENDATION',
    data: {
      topic: weakMastery.topic,
      subject: weakMastery.subject,
    },
    deduplicationKey,
    priority: 'normal',
    link: '/courses',
  });

  return { triggered: !result.skipped, topic: weakMastery.topic, ...result };
}

/**
 * Trigger course milestone celebration
 */
export async function triggerCourseMilestone(userId, { courseId, courseTitle, percentage }) {
  // Round to nearest quartile
  const quartile = Math.floor(percentage / 25) * 25;
  if (quartile === 0) return { triggered: false, reason: 'below_milestone' };

  const deduplicationKey = `course_milestone_${userId}_${courseId}_${quartile}`;

  const result = await dispatchNotification({
    userId,
    type: 'COURSE_PROGRESS',
    data: {
      courseId,
      courseTitle,
      percentage: `${percentage}%`,
    },
    deduplicationKey,
    priority: quartile >= 100 ? 'high' : 'normal',
    link: `/courses/${courseId}`,
  });

  return { triggered: !result.skipped, ...result };
}

export default {
  evaluateStreakRisk,
  evaluateFlashcardDue,
  evaluateDailyPlan,
  evaluateWeakTopics,
  triggerCourseMilestone,
};
