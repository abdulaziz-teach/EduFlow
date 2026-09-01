import StudyPlan from '../models/StudyPlan.js';
import { generateStudyPlanAI } from './aiService.js';
import * as knowledgeService from './knowledgeService.js';
import KnowledgeTopic from '../models/KnowledgeTopic.js';
import * as achievementService from './achievementService.js';

const VALID_TASK_TYPES = ['learning', 'practice', 'revision', 'quiz'];

/**
 * Validate the AI-generated plan structure before saving.
 * Returns { valid: true } or { valid: false, reason }.
 */
function validateAIPlan(plan, { subjects, totalDays, dailyMinutes }) {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, reason: 'AI response is not a valid object' };
  }

  if (!plan.title || typeof plan.title !== 'string') {
    return { valid: false, reason: 'Missing or invalid title' };
  }

  if (!plan.summary || typeof plan.summary !== 'string') {
    return { valid: false, reason: 'Missing or invalid summary' };
  }

  if (!Array.isArray(plan.days) || plan.days.length === 0) {
    return { valid: false, reason: 'Missing or empty days array' };
  }

  // Validate each day
  for (const day of plan.days) {
    if (day.dayNumber === undefined || typeof day.dayNumber !== 'number') {
      return { valid: false, reason: `Day has missing or invalid dayNumber` };
    }

    if (!day.focus || typeof day.focus !== 'string') {
      return { valid: false, reason: `Day ${day.dayNumber} missing or invalid focus` };
    }

    if (!Array.isArray(day.tasks) || day.tasks.length === 0) {
      return { valid: false, reason: `Day ${day.dayNumber} has no tasks` };
    }

    let dayDuration = 0;

    for (const task of day.tasks) {
      if (!task.title || typeof task.title !== 'string') {
        return { valid: false, reason: `Invalid task title in day ${day.dayNumber}` };
      }

      if (!task.subject || typeof task.subject !== 'string') {
        return { valid: false, reason: `Invalid task subject in day ${day.dayNumber}` };
      }

      if (typeof task.duration !== 'number' || task.duration <= 0) {
        return { valid: false, reason: `Invalid task duration in day ${day.dayNumber}` };
      }

      if (!VALID_TASK_TYPES.includes(task.type)) {
        return { valid: false, reason: `Invalid task type "${task.type}" in day ${day.dayNumber}` };
      }

      dayDuration += task.duration;
    }

    // Daily workload check: sum(task.duration) must NOT significantly exceed user.dailyStudyMinutes
    // Allow up to 10% over daily limit
    if (dayDuration > dailyMinutes * 1.1) {
      return {
        valid: false,
        reason: `Day ${day.dayNumber} workload (${dayDuration} min) exceeds daily limit of ${dailyMinutes} min`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate a study plan for the given user.
 * Returns the saved StudyPlan document.
 */
export async function generatePlan(user, options = {}) {
  const goalDescription = user.goal?.description || '';
  const goalType = user.goal?.type || 'General study';

  let startDate = new Date();
  if (options.startDate) {
    const parsedDate = new Date(options.startDate);
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate;
    } else {
      startDate.setDate(startDate.getDate() + 1); // Tomorrow default
    }
  } else {
    // Start tomorrow by default
    startDate.setDate(startDate.getDate() + 1);
  }
  startDate.setHours(0, 0, 0, 0);

  let endDate;
  if (user.goal?.targetDate) {
    endDate = new Date(user.goal.targetDate);
  } else {
    // Default: 14 days from start
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 13);
  }

  const totalDays = Math.max(
    1,
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  );

  // Cap at 30 days for MVP to keep AI output manageable
  const cappedDays = Math.min(totalDays, 30);

  // Get knowledge context for personalization
  let knowledgeContext = null;
  try {
    const recs = await knowledgeService.getRecommendations(user._id);
    const strongTopics = await KnowledgeTopic.find({ userId: user._id, status: 'strong' });

    if (recs.length > 0 || strongTopics.length > 0) {
      knowledgeContext = {
        needsReview: recs.map((r) => r.topic),
        strong: strongTopics.map((s) => s.topic),
      };
    }
  } catch (err) {
    console.error('Failed to get knowledge context for study plan generation:', err.message);
  }

  const aiInput = {
    goal: goalDescription || goalType,
    subjects: user.subjects,
    dailyMinutes: user.dailyStudyMinutes,
    totalDays: cappedDays,
    startDate,
    knowledgeContext,
  };

  // Call AI
  let aiPlan;
  try {
    aiPlan = await generateStudyPlanAI(aiInput);
  } catch (err) {
    console.error('AI generation failed:', err.message);
    throw new Error('AI_GENERATION_FAILED');
  }

  // Validate AI output
  const validation = validateAIPlan(aiPlan, {
    subjects: user.subjects,
    totalDays: cappedDays,
    dailyMinutes: user.dailyStudyMinutes,
  });

  if (!validation.valid) {
    console.error('AI validation failed:', validation.reason);
    throw new Error('AI_VALIDATION_FAILED');
  }

  // Map AI days to proper dates and add completed: false to all tasks
  const days = aiPlan.days.map((day, i) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);

    return {
      dayNumber: day.dayNumber || i + 1,
      date: dayDate,
      focus: day.focus,
      tasks: day.tasks.map((task) => ({
        title: task.title,
        subject: task.subject,
        duration: task.duration,
        type: task.type,
        completed: false,
      })),
    };
  });

  // Save to DB
  const studyPlan = await StudyPlan.create({
    userId: user._id,
    title: aiPlan.title,
    summary: aiPlan.summary,
    goal: {
      type: goalType,
      description: goalDescription,
    },
    dailyMinutes: user.dailyStudyMinutes,
    startDate,
    endDate: days[days.length - 1].date,
    days,
  });

  return studyPlan;
}

/**
 * Get the most recent study plan for a user, or null.
 */
export async function getCurrentPlan(userId) {
  return StudyPlan.findOne({ userId }).sort({ createdAt: -1 });
}

/**
 * Get a specific plan by ID for a user — returns null if not found or unauthorized.
 */
export async function getPlanById(planId, userId) {
  const query = { _id: planId };
  if (userId) {
    query.userId = userId;
  }
  return StudyPlan.findOne(query);
}

/**
 * Toggle a task's completed status. Returns the updated plan.
 */
export async function toggleTaskCompletion(plan, taskId) {
  // Search all days for the task
  let found = false;
  let matchedTask = null;
  for (const day of plan.days) {
    const task = day.tasks.id(taskId);
    if (task) {
      task.completed = !task.completed;
      matchedTask = task;
      found = true;
      break;
    }
  }

  if (!found || !matchedTask) {
    return null;
  }

  await plan.save();

  // Log knowledge event if task is completed
  if (matchedTask.completed) {
    const extractedTopic = knowledgeService.extractTopicFromTitle(matchedTask.title);
    knowledgeService.logEvent(plan.userId, matchedTask.subject, extractedTopic, 'task', 'completed')
      .catch((err) => console.error('Error logging task knowledge event:', err.message));

    // Calculate count of completed tasks across all days
    let completedCount = 0;
    for (const d of plan.days) {
      completedCount += d.tasks.filter((t) => t.completed).length;
    }

    if (completedCount >= 5) {
      achievementService.checkAndUnlock(plan.userId, '5_completed_tasks')
        .catch((err) => console.error('Completed tasks achievement check failed:', err.message));
    }
  }

  return plan;
}
