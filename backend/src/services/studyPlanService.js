import StudyPlan from '../models/StudyPlan.js';
import * as knowledgeService from './knowledgeService.js';
import * as achievementService from './achievementService.js';

const PLAN_COPY = {
  en: {
    title: 'Rule-based study plan',
    summary: (goal, level, minutes, session, breakMinutes, time) =>
      `A practical ${level} plan for ${goal}. It schedules up to ${minutes} focused minutes per ${time} study day in sessions of no more than ${session} minutes, with a suggested ${breakMinutes}-minute break between sessions. Breaks are additional to focused study time. This is a transparent, rule-based suggestion, not a guarantee of results.`,
    focus: (subject, topic) => `${subject}: ${topic}`,
    task: {
      learning: (topic, level) => `Review ${topic} with ${level}-level explanations`,
      practice: (topic) => `Practice ${topic} with a short set of problems`,
      revision: (topic) => `Recall key ideas from ${topic}`,
      quiz: (topic) => `Check your understanding of ${topic}`,
    },
    level: { beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced', revision: 'revision' },
    times: { morning: 'morning', afternoon: 'afternoon', evening: 'evening', anytime: 'flexible' },
  },
  ru: {
    title: 'Учебный план по правилам',
    summary: (goal, level, minutes, session, breakMinutes, time) =>
      `Практичный план уровня «${level}» для цели «${goal}». В ${time} запланировано не более ${minutes} минут занятий блоками до ${session} минут с рекомендуемым перерывом ${breakMinutes} минут между блоками. Перерывы не входят во время занятий. Это прозрачная рекомендация по правилам, а не гарантия результата.`,
    focus: (subject, topic) => `${subject}: ${topic}`,
    task: {
      learning: (topic, level) => `Повторите тему «${topic}» с объяснениями уровня «${level}»`,
      practice: (topic) => `Решите несколько заданий по теме «${topic}»`,
      revision: (topic) => `Вспомните основные идеи темы «${topic}»`,
      quiz: (topic) => `Проверьте понимание темы «${topic}»`,
    },
    level: { beginner: 'начальный', intermediate: 'средний', advanced: 'продвинутый', revision: 'повторение' },
    times: { morning: 'утром', afternoon: 'днём', evening: 'вечером', anytime: 'в удобное время' },
  },
  uz: {
    title: 'Qoidalarga asoslangan o‘quv rejasi',
    summary: (goal, level, minutes, session, breakMinutes, time) =>
      `“${goal}” maqsadi uchun ${level} darajasiga mos amaliy reja. ${time} o‘qish kunida ${minutes} daqiqagacha, har biri ${session} daqiqadan oshmaydigan mashg‘ulotlar rejalashtiriladi; ular orasida ${breakMinutes} daqiqalik tanaffus tavsiya etiladi. Tanaffus o‘qish vaqtiga kirmaydi. Bu shaffof, qoidalarga asoslangan tavsiya bo‘lib, natijani kafolatlamaydi.`,
    focus: (subject, topic) => `${subject}: ${topic}`,
    task: {
      learning: (topic, level) => `“${topic}” mavzusini ${level} darajadagi tushuntirish bilan takrorlang`,
      practice: (topic) => `“${topic}” bo‘yicha bir nechta mashq bajaring`,
      revision: (topic) => `“${topic}” mavzusining asosiy g‘oyalarini eslang`,
      quiz: (topic) => `“${topic}” mavzusini qanchalik tushunganingizni tekshiring`,
    },
    level: { beginner: 'boshlang‘ich', intermediate: 'o‘rta', advanced: 'ilg‘or', revision: 'takrorlash' },
    times: { morning: 'ertalab', afternoon: 'kunduzi', evening: 'kechqurun', anytime: 'qulay vaqtda' },
  },
};

export function buildRuleBasedPlan(user, options = {}) {
  const subjects = Array.isArray(user?.subjects)
    ? user.subjects.filter((subject) => typeof subject === 'string' && subject.trim())
    : [];
  if (!user || subjects.length === 0 ||
      !Number.isInteger(user.dailyStudyMinutes) || user.dailyStudyMinutes < 1) {
    throw new Error('STUDY_PROFILE_INCOMPLETE');
  }
  if (user.age !== undefined && user.age !== null &&
      (!Number.isInteger(user.age) || user.age < 5 || user.age > 100)) {
    throw new Error('INVALID_AGE');
  }

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

  const availableDays = Math.max(1, Math.min(30,
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1
  ));
  const age = Number.isInteger(user.age) ? user.age : null;
  const ageSessionLimit = age === null ? 40 : age < 13 ? 15 : age < 18 ? 25 : 45;
  const maxSessionMinutes = user.level === 'beginner'
    ? Math.min(ageSessionLimit, age !== null && age < 18 ? ageSessionLimit : 30)
    : ageSessionLimit;
  const breakMinutes = age !== null && age < 13 ? 5 : 10;
  const dailyLimit = age !== null && age < 13 ? 60 : age !== null && age < 18 ? 120 : 180;
  const plannedMinutes = Math.min(user.dailyStudyMinutes || 0, dailyLimit, maxSessionMinutes * 4);
  const locale = PLAN_COPY[user.preferredLanguage] ? user.preferredLanguage : 'en';
  const copy = PLAN_COPY[locale];
  const timePreference = copy.times[user.studySchedule?.preferredTime] || copy.times.anytime;
  const level = ['beginner', 'intermediate', 'advanced', 'revision'].includes(user.level)
    ? user.level
    : 'intermediate';
  const levelLabel = copy.level[level];
  const weakTopics = Array.isArray(user.weakTopics) ? user.weakTopics.filter(Boolean) : [];
  const preferredDays = user.studySchedule?.preferredDays || [];
  const topicFor = (index) => (weakTopics.length
    ? weakTopics[index % weakTopics.length]
    : subjects[index % subjects.length]);
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const planDays = [];
  for (let offset = 0; offset < availableDays; offset += 1) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + offset);
    const dayName = dayNames[date.getUTCDay()];
    if (preferredDays.length && !preferredDays.includes(dayName)) continue;

    const subject = subjects[planDays.length % subjects.length];
    const topic = topicFor(planDays.length);
    const tasks = [];
    let remaining = plannedMinutes;
    let session = 0;
    while (remaining > 0) {
      const duration = Math.min(maxSessionMinutes, remaining);
      const types = level === 'revision'
        ? ['revision', 'quiz']
        : user.learningStyle === 'practice'
          ? ['practice', 'quiz']
          : user.learningStyle === 'theory'
            ? ['learning', 'revision']
            : user.learningStyle === 'flashcards'
              ? ['revision', 'quiz']
              : level === 'beginner'
                ? ['learning', 'practice']
                : ['learning', 'practice', 'quiz'];
      const type = types[session % types.length];
      tasks.push({
        title: copy.task[type](topic, levelLabel),
        subject,
        duration,
        type,
        completed: false,
      });
      remaining -= duration;
      session += 1;
    }

    planDays.push({
      dayNumber: planDays.length + 1,
      date,
      focus: copy.focus(subject, topic),
      tasks,
    });
  }
  if (!planDays.length && subjects.length && plannedMinutes > 0) {
    const subject = subjects[0];
    const topic = topicFor(0);
    planDays.push({
      dayNumber: 1,
      date: startDate,
      focus: copy.focus(subject, topic),
      tasks: [{
        title: copy.task[level === 'revision' ? 'revision' : 'learning'](topic, levelLabel),
        subject,
        duration: plannedMinutes,
        type: level === 'revision' ? 'revision' : 'learning',
        completed: false,
      }],
    });
  }
  const goal = goalDescription || goalType;

  return {
    title: copy.title,
    summary: copy.summary(goal, levelLabel, plannedMinutes, maxSessionMinutes, breakMinutes, timePreference),
    goal: {
      type: goalType,
      description: goalDescription,
    },
    dailyMinutes: plannedMinutes,
    startDate,
    endDate: planDays[planDays.length - 1]?.date || startDate,
    days: planDays,
    breakMinutes,
  };
}

/**
 * Generate and persist a transparent, rule-based plan for the authenticated user.
 */
export async function generatePlan(user, options = {}) {
  const plan = buildRuleBasedPlan(user, options);
  return StudyPlan.create({ userId: user._id, ...plan });
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
