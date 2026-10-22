/**
 * Notification Scheduler Service
 * Handles bounded batch processing for scheduled notifications, engagement sweeps,
 * and automated cleanup of expired or stale notifications.
 */

import User from '../models/User.js';
import Notification from '../models/Notification.js';
import JobLock from '../models/JobLock.js';
import {
  evaluateStreakRisk,
  evaluateFlashcardDue,
  evaluateDailyPlan,
} from './engagementEngine.js';

let schedulerInterval = null;

/**
 * Deliver deferred and scheduled notifications whose delivery time has arrived
 */
export async function processScheduledNotifications(batchSize = 50) {
  const now = new Date();
  const dueNotifications = await Notification.find({
    status: { $in: ['pending', 'deferred'] },
    scheduledAt: { $lte: now },
  })
    .limit(batchSize)
    .lean();

  let processedCount = 0;

  for (const notif of dueNotifications) {
    await Notification.updateOne(
      { _id: notif._id, status: { $in: ['pending', 'deferred'] } },
      {
        $set: {
          status: 'sent',
          sentAt: new Date(),
        },
      }
    );
    processedCount++;
  }

  return { processed: processedCount };
}

/**
 * Run streak risk evaluation across active users in bounded batches
 */
export async function processStreakSweeps(batchSize = 50) {
  const users = await User.find({
    status: 'active',
    streak: { $gt: 0 },
  })
    .select('_id streak lastStudyDate timezone')
    .limit(batchSize)
    .lean();

  let triggeredCount = 0;

  for (const user of users) {
    const res = await evaluateStreakRisk(user);
    if (res.triggered) triggeredCount++;
  }

  return { scanned: users.length, triggered: triggeredCount };
}

/**
 * Run flashcard review aggregation sweeps in bounded batches
 */
export async function processFlashcardSweeps(batchSize = 50) {
  const users = await User.find({ status: 'active' })
    .select('_id')
    .limit(batchSize)
    .lean();

  let triggeredCount = 0;

  for (const user of users) {
    const res = await evaluateFlashcardDue(user._id);
    if (res.triggered) triggeredCount++;
  }

  return { scanned: users.length, triggered: triggeredCount };
}

/**
 * Run daily plan check-in sweeps in bounded batches
 */
export async function processDailyPlanSweeps(batchSize = 50) {
  const users = await User.find({ status: 'active' })
    .select('_id')
    .limit(batchSize)
    .lean();

  let triggeredCount = 0;

  for (const user of users) {
    const res = await evaluateDailyPlan(user._id);
    if (res.triggered) triggeredCount++;
  }

  return { scanned: users.length, triggered: triggeredCount };
}

/**
 * Cleanup expired notifications and purge very old read notifications (> 90 days)
 */
export async function cleanupExpiredNotifications() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const expiredResult = await Notification.deleteMany({
    expiresAt: { $ne: null, $lte: now },
  });

  const staleResult = await Notification.deleteMany({
    read: true,
    createdAt: { $lte: ninetyDaysAgo },
  });

  return {
    expiredDeleted: expiredResult.deletedCount || 0,
    staleDeleted: staleResult.deletedCount || 0,
  };
}

/**
 * Execute all scheduled tasks once with distributed job lock coordination
 */
export async function runAllSweeps(batchSize = 50, useLock = true) {
  let lease = null;
  if (useLock) {
    lease = await JobLock.acquireLease('sweep:notifications', 45000);
    if (!lease.acquired) {
      return {
        skipped: true,
        reason: 'LOCKED_BY_ANOTHER_INSTANCE',
      };
    }
  }

  try {
    const scheduled = await processScheduledNotifications(batchSize);
    const streaks = await processStreakSweeps(batchSize);
    const flashcards = await processFlashcardSweeps(batchSize);
    const dailyPlans = await processDailyPlanSweeps(batchSize);
    const cleanup = await cleanupExpiredNotifications();

    return {
      scheduled,
      streaks,
      flashcards,
      dailyPlans,
      cleanup,
    };
  } finally {
    if (lease && lease.acquired) {
      await JobLock.releaseLease('sweep:notifications', lease.workerId);
    }
  }
}

/**
 * Start recurring background scheduler
 */
export function startScheduler({ intervalMs = 60000, batchSize = 50 } = {}) {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    try {
      await runAllSweeps(batchSize);
    } catch (err) {
      console.error('[NotificationScheduler] Sweep error:', err.message);
    }
  }, intervalMs);
}

/**
 * Stop recurring background scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export default {
  processScheduledNotifications,
  processStreakSweeps,
  processFlashcardSweeps,
  processDailyPlanSweeps,
  cleanupExpiredNotifications,
  runAllSweeps,
  startScheduler,
  stopScheduler,
};
