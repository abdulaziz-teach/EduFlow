import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import connectDB, { disconnectDB } from '../src/config/db.js';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import FlashcardDeck from '../src/models/FlashcardDeck.js';
import Flashcard from '../src/models/Flashcard.js';
import FlashcardProgress from '../src/models/FlashcardProgress.js';
import DailyLearningPlan from '../src/models/DailyLearningPlan.js';
import UserTopicMastery from '../src/models/UserTopicMastery.js';

import {
  formatNotificationPayload,
  sanitizeDeepLink,
  sanitizeText,
  NOTIFICATION_TEMPLATES,
} from '../src/services/notificationTemplates.js';
import {
  isWithinQuietHours,
  getTimeInTimezone,
  parseTimeToMinutes,
} from '../src/services/quietHoursService.js';
import {
  dispatchNotification,
  getOrCreatePreferences,
  normalizeCategory,
  isCategoryEnabled,
} from '../src/services/notificationEngine.js';
import {
  evaluateStreakRisk,
  evaluateFlashcardDue,
  evaluateDailyPlan,
  evaluateWeakTopics,
  triggerCourseMilestone,
} from '../src/services/engagementEngine.js';
import {
  processScheduledNotifications,
  cleanupExpiredNotifications,
  runAllSweeps,
} from '../src/services/notificationSchedulerService.js';
import { generateAccessToken } from '../src/services/sessionService.js';

let server;
let baseUrl;

async function apiRequest(endpoint, options = {}) {
  const url = baseUrl + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
    ...options.headers,
  };

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON
  }

  return { status: res.status, ok: res.ok, data };
}

describe('🔔 Phase 22: Notifications, Engagement Automation & Retention Engine', () => {
  let adminUser;
  let adminToken;
  let studentUser1;
  let studentToken1;
  let studentUser2;
  let studentToken2;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Cleanup existing test data
    await User.deleteMany({ email: /@notiftest\.internal$/ });
    await Notification.deleteMany({});
    await NotificationPreference.deleteMany({});
    await FlashcardDeck.deleteMany({ title: /NotifTest/ });
    await Flashcard.deleteMany({});
    await FlashcardProgress.deleteMany({});
    await DailyLearningPlan.deleteMany({});
    await UserTopicMastery.deleteMany({});

    // 1. Create Admin
    adminUser = await User.create({
      name: 'Notif Admin',
      displayName: 'Notif Admin',
      email: 'admin_notif@notiftest.internal',
      password: 'Password123!',
      role: 'admin',
      status: 'active',
    });
    adminToken = generateAccessToken(adminUser._id, 'admin');

    // 2. Create Student 1
    studentUser1 = await User.create({
      name: 'Student One',
      displayName: 'Student One',
      email: 'student1@notiftest.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
      streak: 5,
      lastStudyDate: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
      timezone: 'America/New_York',
    });
    studentToken1 = generateAccessToken(studentUser1._id, 'user');

    // 3. Create Student 2
    studentUser2 = await User.create({
      name: 'Student Two',
      displayName: 'Student Two',
      email: 'student2@notiftest.internal',
      password: 'Password123!',
      role: 'user',
      status: 'active',
      streak: 0,
      timezone: 'UTC',
    });
    studentToken2 = generateAccessToken(studentUser2._id, 'user');
  });

  after(async () => {
    await User.deleteMany({ email: /@notiftest\.internal$/ });
    await Notification.deleteMany({});
    await NotificationPreference.deleteMany({});
    await FlashcardDeck.deleteMany({ title: /NotifTest/ });
    await Flashcard.deleteMany({});
    await FlashcardProgress.deleteMany({});
    await DailyLearningPlan.deleteMany({});
    await UserTopicMastery.deleteMany({});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  });

  describe('1. Templates, Copy Formatting & Sanitization', () => {
    it('formats streak reminder with supportive, non-manipulative copy', () => {
      const payload = formatNotificationPayload('STREAK_REMINDER', { streakDays: 7 });
      assert.equal(payload.type, 'STREAK_REMINDER');
      assert.ok(payload.title.toLowerCase().includes('streak'));
      assert.ok(payload.message.includes('7-day streak'));
      // Ensure supportive phrasing
      assert.ok(
        payload.message.toLowerCase().includes('ready') ||
        payload.message.toLowerCase().includes('cheering')
      );
      assert.equal(payload.link, '/dashboard');
    });

    it('formats aggregated flashcard review notification', () => {
      const payload = formatNotificationPayload('FLASHCARD_REVIEW', { count: 12 });
      assert.equal(payload.type, 'FLASHCARD_REVIEW');
      assert.ok(payload.title.includes('12 Flashcards Due'));
      assert.ok(payload.message.includes('12 cards'));
      assert.equal(payload.link, '/flashcards');
    });

    it('sanitizes malicious script tags and HTML injection from text', () => {
      const malicious = '<script>alert("hacked")</script><b>Hello</b> World!';
      const cleaned = sanitizeText(malicious);
      assert.equal(cleaned, 'Hello World!');
    });

    it('sanitizes deep links: rejects javascript: and data: URIs, enforces internal paths', () => {
      assert.equal(sanitizeDeepLink('javascript:alert(1)'), '');
      assert.equal(sanitizeDeepLink('data:text/html,<script>'), '');
      assert.equal(sanitizeDeepLink('courses/123'), '/courses/123');
      assert.equal(sanitizeDeepLink('/quizzes'), '/quizzes');
      assert.equal(sanitizeDeepLink('https://eduflow.internal/mentor?topic=math'), '/mentor?topic=math');
    });
  });

  describe('2. Quiet Hours & Timezone Engine', () => {
    it('parses time strings to total minutes accurately', () => {
      assert.equal(parseTimeToMinutes('00:00'), 0);
      assert.equal(parseTimeToMinutes('08:30'), 510);
      assert.equal(parseTimeToMinutes('22:15'), 1335);
    });

    it('accurately evaluates daytime quiet hours window', () => {
      const config = {
        enabled: true,
        start: '13:00',
        end: '17:00',
        timezone: 'UTC',
      };

      // 14:30 UTC -> inside
      const insideDate = new Date('2026-09-05T14:30:00Z');
      const resInside = isWithinQuietHours(config, insideDate);
      assert.equal(resInside.inQuietHours, true);
      assert.ok(resInside.nextAllowedDate > insideDate);

      // 18:00 UTC -> outside
      const outsideDate = new Date('2026-09-05T18:00:00Z');
      const resOutside = isWithinQuietHours(config, outsideDate);
      assert.equal(resOutside.inQuietHours, false);
      assert.equal(resOutside.nextAllowedDate, null);
    });

    it('accurately evaluates overnight quiet hours window (22:00 to 08:00)', () => {
      const config = {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      };

      // 23:30 UTC -> inside
      const lateNight = new Date('2026-09-05T23:30:00Z');
      assert.equal(isWithinQuietHours(config, lateNight).inQuietHours, true);

      // 03:15 UTC -> inside
      const earlyMorning = new Date('2026-09-05T03:15:00Z');
      assert.equal(isWithinQuietHours(config, earlyMorning).inQuietHours, true);

      // 12:00 UTC -> outside
      const midday = new Date('2026-09-05T12:00:00Z');
      assert.equal(isWithinQuietHours(config, midday).inQuietHours, false);
    });

    it('correctly uses user custom timezone', () => {
      const timeInNY = getTimeInTimezone(new Date('2026-09-05T18:00:00Z'), 'America/New_York');
      // 18:00 UTC is 14:00 EDT (UTC-4)
      assert.equal(timeInNY.hours, 14);
    });
  });

  describe('3. Notification Engine & Preference Control', () => {
    it('dispatches a normal notification successfully', async () => {
      const result = await dispatchNotification({
        userId: studentUser1._id,
        type: 'LEARNING_REMINDER',
        title: 'Study Math',
        message: 'Review calculus fundamentals.',
        link: '/study-plan',
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'sent');
      assert.ok(result.notification);
      assert.equal(result.notification.read, false);
    });

    it('suppresses duplicate notification when deduplicationKey matches within cooldown', async () => {
      const dedupKey = `test_dedup_${Date.now()}`;

      const res1 = await dispatchNotification({
        userId: studentUser1._id,
        type: 'STREAK_REMINDER',
        deduplicationKey: dedupKey,
      });
      assert.equal(res1.success, true);

      const res2 = await dispatchNotification({
        userId: studentUser1._id,
        type: 'STREAK_REMINDER',
        deduplicationKey: dedupKey,
      });
      assert.equal(res2.skipped, true);
      assert.equal(res2.reason, 'duplicate_suppressed');
    });

    it('suppresses notification when category is toggled off in preferences', async () => {
      const pref = await getOrCreatePreferences(studentUser1._id);
      pref.streaks = false;
      await pref.save();

      const res = await dispatchNotification({
        userId: studentUser1._id,
        type: 'STREAK_REMINDER',
        data: { streakDays: 5 },
      });

      assert.equal(res.skipped, true);
      assert.equal(res.reason, 'category_disabled');

      // Re-enable streaks
      pref.streaks = true;
      await pref.save();
    });

    it('urgent priority and security notifications bypass preferences and quiet hours', async () => {
      const pref = await getOrCreatePreferences(studentUser1._id);
      pref.enabled = false; // Globally disabled
      await pref.save();

      // Normal reminder should be skipped
      const normalRes = await dispatchNotification({
        userId: studentUser1._id,
        type: 'LEARNING_REMINDER',
        priority: 'normal',
      });
      assert.equal(normalRes.skipped, true);
      assert.equal(normalRes.reason, 'user_notifications_disabled');

      // Urgent security notice must be delivered
      const urgentRes = await dispatchNotification({
        userId: studentUser1._id,
        type: 'SECURITY',
        priority: 'urgent',
        title: 'Security Alert',
        message: 'New sign-in from another device.',
      });
      assert.equal(urgentRes.success, true);
      assert.equal(urgentRes.status, 'sent');

      // Restore enabled
      pref.enabled = true;
      await pref.save();
    });
  });

  describe('4. Engagement & Retention Engine Evaluators', () => {
    it('evaluates streak risk: triggers supportive reminder when user has not studied today', async () => {
      const result = await evaluateStreakRisk(studentUser1);
      assert.equal(result.triggered, true);
      assert.equal(result.status, 'sent');

      // Second evaluation today should be deduplicated
      const repeatResult = await evaluateStreakRisk(studentUser1);
      assert.equal(repeatResult.triggered, false);
      assert.equal(repeatResult.reason, 'duplicate_suppressed');
    });

    it('aggregates due flashcards into a single daily notification with count', async () => {
      // Create deck and flashcard progress for student 1
      const deck = await FlashcardDeck.create({
        userId: adminUser._id,
        title: 'NotifTest Chemistry Deck',
        subject: 'Chemistry',
        cards: [],
      });

      const card1 = await Flashcard.create({
        deckId: deck._id,
        front: 'H2O',
        back: 'Water',
        createdBy: adminUser._id,
      });

      const card2 = await Flashcard.create({
        deckId: deck._id,
        front: 'NaCl',
        back: 'Sodium Chloride',
        createdBy: adminUser._id,
      });

      await FlashcardProgress.create({
        userId: studentUser1._id,
        flashcardId: card1._id,
        dueAt: new Date(Date.now() - 3600000), // due 1 hour ago
      });

      await FlashcardProgress.create({
        userId: studentUser1._id,
        flashcardId: card2._id,
        dueAt: new Date(Date.now() - 7200000), // due 2 hours ago
      });

      const result = await evaluateFlashcardDue(studentUser1._id);
      assert.equal(result.triggered, true);
      assert.equal(result.count, 2);

      // Verify the notification record
      const notif = await Notification.findOne({
        userId: studentUser1._id,
        type: 'FLASHCARD_REVIEW',
      }).sort({ createdAt: -1 });

      assert.ok(notif);
      assert.ok(notif.title.includes('2 Flashcards Due'));
    });

    it('evaluates daily plan and notifies user about pending tasks', async () => {
      await DailyLearningPlan.create({
        userId: studentUser1._id,
        dateStr: new Date().toISOString().split('T')[0],
        tasks: [
          {
            id: 'task_1',
            title: 'Complete Quiz on Stoichiometry',
            type: 'quiz_practice',
            estimatedMinutes: 15,
            completed: false,
          },
          {
            id: 'task_2',
            title: 'Read organic chemistry notes',
            type: 'lesson_continue',
            estimatedMinutes: 20,
            completed: true,
          },
        ],
      });

      const result = await evaluateDailyPlan(studentUser1._id);
      assert.equal(result.triggered, true);
      assert.equal(result.pendingCount, 1);
    });

    it('triggers course progress milestone on quartile completion', async () => {
      const res = await triggerCourseMilestone(studentUser1._id, {
        courseId: new mongoose.Types.ObjectId(),
        courseTitle: 'Advanced Physics',
        percentage: 75,
      });

      assert.equal(res.triggered, true);
      assert.equal(res.status, 'sent');
    });
  });

  describe('5. REST APIs, Security & Tenant Isolation', () => {
    let student1NotifId;

    it('GET /api/notifications returns paginated notifications with unread count', async () => {
      const res = await apiRequest('/api/notifications?page=1&limit=10', {
        token: studentToken1,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(Array.isArray(res.data.notifications));
      assert.ok(res.data.notifications.length > 0);
      assert.ok(typeof res.data.unreadCount === 'number');
      assert.ok(typeof res.data.total === 'number');
      assert.ok(typeof res.data.totalPages === 'number');

      student1NotifId = res.data.notifications[0]._id;
    });

    it('GET /api/notifications?unreadOnly=true filters by unread status', async () => {
      const res = await apiRequest('/api/notifications?unreadOnly=true', {
        token: studentToken1,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      for (const n of res.data.notifications) {
        assert.equal(n.read, false);
      }
    });

    it('GET /api/notifications/unread-count returns integer count', async () => {
      const res = await apiRequest('/api/notifications/unread-count', {
        token: studentToken1,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.ok(typeof res.data.unreadCount === 'number');
    });

    it('PATCH /api/notifications/:id/read marks notification read', async () => {
      const res = await apiRequest(`/api/notifications/${student1NotifId}/read`, {
        method: 'PATCH',
        token: studentToken1,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.notification.read, true);
      assert.ok(res.data.notification.readAt);
    });

    it('Strict Tenant Isolation: Student 2 cannot mark read or delete Student 1 notification (returns 404)', async () => {
      // Student 2 attempts to mark read Student 1's notification
      const readRes = await apiRequest(`/api/notifications/${student1NotifId}/read`, {
        method: 'PATCH',
        token: studentToken2,
      });
      assert.equal(readRes.status, 404);

      // Student 2 attempts to delete Student 1's notification
      const delRes = await apiRequest(`/api/notifications/${student1NotifId}`, {
        method: 'DELETE',
        token: studentToken2,
      });
      assert.equal(delRes.status, 404);
    });

    it('DELETE /api/notifications/:id deletes user own notification', async () => {
      const res = await apiRequest(`/api/notifications/${student1NotifId}`, {
        method: 'DELETE',
        token: studentToken1,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);

      // Verify deletion
      const check = await Notification.findById(student1NotifId);
      assert.equal(check, null);
    });

    it('GET and PATCH /api/notifications/preferences works and syncs legacy fields', async () => {
      const getRes = await apiRequest('/api/notifications/preferences', {
        token: studentToken1,
      });

      assert.equal(getRes.status, 200);
      assert.equal(getRes.data.success, true);
      assert.ok(getRes.data.preferences);

      const patchRes = await apiRequest('/api/notifications/preferences', {
        method: 'PATCH',
        token: studentToken1,
        body: {
          dailyPlan: false,
          quietHours: {
            enabled: true,
            start: '23:00',
            end: '07:00',
            timezone: 'America/New_York',
          },
        },
      });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.data.success, true);
      assert.equal(patchRes.data.preferences.dailyPlan, false);
      assert.equal(patchRes.data.preferences.studyPlanNotifications, false); // Synced to legacy
      assert.equal(patchRes.data.preferences.quietHours.enabled, true);
      assert.equal(patchRes.data.preferences.quietHours.start, '23:00');
    });

    it('Admin RBAC: non-admin cannot broadcast or fetch stats (returns 403)', async () => {
      const broadcastRes = await apiRequest('/api/notifications/admin/broadcast', {
        method: 'POST',
        token: studentToken1,
        body: { title: 'Test', message: 'Hello' },
      });
      assert.equal(broadcastRes.status, 403);

      const statsRes = await apiRequest('/api/notifications/admin/stats', {
        token: studentToken1,
      });
      assert.equal(statsRes.status, 403);
    });

    it('Admin RBAC: Admin can broadcast and view notification stats', async () => {
      const broadcastRes = await apiRequest('/api/notifications/admin/broadcast', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'System Maintenance',
          message: 'EduFlow will undergo planned maintenance at midnight.',
          priority: 'high',
        },
      });

      assert.equal(broadcastRes.status, 200);
      assert.equal(broadcastRes.data.success, true);
      assert.ok(broadcastRes.data.sentCount >= 2);

      const statsRes = await apiRequest('/api/notifications/admin/stats', {
        token: adminToken,
      });

      assert.equal(statsRes.status, 200);
      assert.equal(statsRes.data.success, true);
      assert.ok(statsRes.data.stats.total >= 2);
      assert.ok(statsRes.data.stats.priorityBreakdown);
      assert.ok(statsRes.data.stats.typeBreakdown);
    });
  });

  describe('6. Scheduler & Expired Notification Cleanup', () => {
    it('processScheduledNotifications delivers pending/deferred notifications whose scheduledAt <= now', async () => {
      // Create a deferred notification scheduled in the past
      const pastScheduled = new Date(Date.now() - 60000);
      const scheduledNotif = await Notification.create({
        userId: studentUser2._id,
        type: 'LEARNING_REMINDER',
        title: 'Deferred Study Session',
        message: 'Quiet hours ended, here is your reminder.',
        status: 'deferred',
        scheduledAt: pastScheduled,
      });

      const result = await processScheduledNotifications(50);
      assert.ok(result.processed >= 1);

      const updated = await Notification.findById(scheduledNotif._id);
      assert.equal(updated.status, 'sent');
      assert.ok(updated.sentAt);
    });

    it('cleanupExpiredNotifications removes notifications where expiresAt <= now', async () => {
      // Create an expired notification
      const expiredNotif = await Notification.create({
        userId: studentUser2._id,
        type: 'SYSTEM',
        title: 'Flash Sale Ending',
        message: 'Special study pack discount ends now.',
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
      });

      const result = await cleanupExpiredNotifications();
      assert.ok(result.expiredDeleted >= 1);

      const check = await Notification.findById(expiredNotif._id);
      assert.equal(check, null);
    });

    it('runAllSweeps executes scheduled, streak, flashcard, and cleanup sweeps cleanly', async () => {
      const sweepResults = await runAllSweeps(10);
      assert.ok(sweepResults.scheduled);
      assert.ok(sweepResults.streaks);
      assert.ok(sweepResults.flashcards);
      assert.ok(sweepResults.dailyPlans);
      assert.ok(sweepResults.cleanup);
    });
  });
});
