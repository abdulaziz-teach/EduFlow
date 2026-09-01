import * as studyPlanService from './studyPlanService.js';

/**
 * Format Date object to local YYYY-MM-DD string format
 */
export function formatDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get active study plan and information for today's day block.
 */
export async function getTodayDayInfo(userId, dateStr) {
  const activePlan = await studyPlanService.getCurrentPlan(userId);
  if (!activePlan || !activePlan.days) {
    return { plan: null, todayDay: null };
  }

  // Find the day matching today's YYYY-MM-DD date string
  const todayDay = activePlan.days.find(
    (d) => formatDateString(d.date) === dateStr
  );

  return { plan: activePlan, todayDay: todayDay || null };
}

/**
 * Retrieve incomplete tasks from days prior to dateStr.
 */
export async function getOverdueTasks(plan, dateStr) {
  if (!plan || !plan.days) return [];

  const overdue = [];
  const targetTime = new Date(dateStr + 'T00:00:00Z').getTime();

  plan.days.forEach((day) => {
    const dayDateStr = formatDateString(day.date);
    const dayTime = new Date(dayDateStr + 'T00:00:00Z').getTime();

    // Check if day is prior to dateStr
    if (dayTime < targetTime) {
      day.tasks.forEach((task) => {
        if (!task.completed) {
          overdue.push({
            id: task._id,
            title: task.title,
            subject: task.subject,
            duration: task.duration,
            type: task.type,
            completed: task.completed,
            dayNumber: day.dayNumber,
            date: day.date,
          });
        }
      });
    }
  });

  return overdue;
}
