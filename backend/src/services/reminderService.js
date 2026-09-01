import * as studyPlanService from './studyPlanService.js';
import { createNotification } from './notificationService.js';

/**
 * Scan all incomplete tasks for today and send a notification.
 */
export async function processTaskReminders(userId) {
  try {
    const activePlan = await studyPlanService.getCurrentPlan(userId);
    if (!activePlan || !activePlan.days || activePlan.days.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDay = activePlan.days.find((d) => d.date.toISOString().split('T')[0] === todayStr);

    if (!todayDay || !todayDay.tasks || todayDay.tasks.length === 0) return;

    // Filter unfinished tasks
    const incompleteTasks = todayDay.tasks.filter((t) => !t.completed);

    for (const task of incompleteTasks) {
      // Send task reminder with 24-hour uniqueKey cooldown
      await createNotification(userId, {
        type: 'task_reminder',
        title: 'Study Session Coming Up',
        message: `You planned to study ${task.subject} today: "${task.title}".`,
        link: '/study-plan',
        metadata: {
          uniqueKey: `reminder:task:${task._id || task.id}`,
          taskId: task._id || task.id,
        },
      });
    }
  } catch (err) {
    console.error(`Failed to process task reminders for user ${userId}:`, err.message);
  }
}
