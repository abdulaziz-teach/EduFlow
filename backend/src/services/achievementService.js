import UserAchievement from '../models/UserAchievement.js';
import { createNotification } from './notificationService.js';

const ACHIEVEMENT_DETAILS = {
  first_study_session: {
    title: 'First Study Session 🏆',
    message: 'You completed your first study session! Nice job taking the first step!',
  },
  first_practice: {
    title: 'First Practice 🏆',
    message: 'You completed your first practice set! Actively testing yourself improves recall.',
  },
  '10_practice_questions': {
    title: '10 Practice Questions 🏆',
    message: 'You have answered 10 practice questions! Outstanding progress.',
  },
  '5_completed_tasks': {
    title: '5 Completed Tasks 🏆',
    message: 'You completed 5 study plan tasks! Keeping the consistency going.',
  },
  '7_day_streak': {
    title: '7-Day Study Streak 🏆',
    message: 'You reached a 7-day study streak! Exceptional learning consistency.',
  },
};

/**
 * Check if user already unlocked the achievement. If not, unlock and trigger notification.
 */
export async function checkAndUnlock(userId, achievementKey) {
  try {
    // 1. Check if already unlocked
    const existing = await UserAchievement.findOne({ userId, achievementKey });
    if (existing) return null;

    // 2. Lock check and create
    const unlock = await UserAchievement.create({
      userId,
      achievementKey,
      unlockedAt: new Date(),
    });

    // 3. Send achievement unlocked notification
    const details = ACHIEVEMENT_DETAILS[achievementKey];
    if (details) {
      await createNotification(userId, {
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: details.title,
        link: '/profile',
        metadata: {
          uniqueKey: `achievement:${achievementKey}`,
          achievementKey,
        },
      });
    }

    return unlock;
  } catch (err) {
    // Unique compound index will prevent duplicate insert errors if checked concurrently
    if (err.code === 11000) {
      return null;
    }
    console.error('Failed to unlock achievement:', err.message);
    return null;
  }
}
