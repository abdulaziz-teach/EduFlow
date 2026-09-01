import User from '../models/User.js';
import * as reminderService from '../services/reminderService.js';
import * as knowledgeService from '../services/knowledgeService.js';
import * as studyPlanService from '../services/studyPlanService.js';
import { createNotification, cleanupOldNotifications } from '../services/notificationService.js';

/**
 * Loops all users and schedules task reminders for today's incomplete goals
 */
export async function processTaskReminders() {
  try {
    const users = await User.find({});
    for (const user of users) {
      await reminderService.processTaskReminders(user._id);
    }
    console.log('Task reminders job completed.');
  } catch (err) {
    console.error('Task reminders job failed:', err.message);
  }
}

/**
 * Loops all users and alerts them about topics needing review
 */
export async function processReviewRecommendations() {
  try {
    const users = await User.find({});
    for (const user of users) {
      const recs = await knowledgeService.getRecommendations(user.id);
      if (recs && recs.length > 0) {
        // Fetch highest priority review topic
        const topic = recs[0];
        await createNotification(user._id, {
          type: 'review_recommendation',
          title: 'Review Recommended',
          message: `${topic.topic} in ${topic.subject} could use some extra practice.`,
          link: `/practice?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.topic)}`,
          metadata: {
            uniqueKey: `review:recommendation:${topic.subject}:${topic.topic}`,
            subject: topic.subject,
            topic: topic.topic,
          },
        });
      }
    }
    console.log('Review recommendations job completed.');
  } catch (err) {
    console.error('Review recommendations job failed:', err.message);
  }
}

/**
 * Compiles today's summary digest: tasks planned, review topics, and study recommendations
 */
export async function processDailyDigest() {
  try {
    const users = await User.find({});
    const todayStr = new Date().toISOString().split('T')[0];

    for (const user of users) {
      // 1. Resolve today's tasks count
      let tasksCount = 0;
      const activePlan = await studyPlanService.getCurrentPlan(user._id);
      if (activePlan && activePlan.days) {
        const todayDay = activePlan.days.find((d) => d.date.toISOString().split('T')[0] === todayStr);
        if (todayDay && todayDay.tasks) {
          tasksCount = todayDay.tasks.filter((t) => !t.completed).length;
        }
      }

      // 2. Resolve review topics count
      const recs = await knowledgeService.getRecommendations(user._id);
      const recsCount = recs ? recs.length : 0;

      // Skip digest if there's nothing planned or needs review
      if (tasksCount === 0 && recsCount === 0) continue;

      // 3. Construct message digest
      const message = `Today's Study: ${tasksCount} task(s) planned, ${recsCount} topic(s) to review. Practice suggestions are ready!`;

      await createNotification(user._id, {
        type: 'study_plan',
        title: "Today's Study Digest 📅",
        message,
        link: '/dashboard',
        metadata: {
          uniqueKey: `daily:digest:${todayStr}`,
        },
      });
    }
    console.log('Daily digest job completed.');
  } catch (err) {
    console.error('Daily digest job failed:', err.message);
  }
}

/**
 * Triggers automatic retention sweeps for notifications older than 90 days
 */
export async function processRetentionCleanup() {
  await cleanupOldNotifications(90);
}
