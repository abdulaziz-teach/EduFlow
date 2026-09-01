import StudySession from '../models/StudySession.js';
import * as studyPlanService from './studyPlanService.js';
import PracticeSession from '../models/PracticeSession.js';

/**
 * Format Date object to local YYYY-MM-DD string format
 */
function formatDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate current streak and longest streak from completed study sessions.
 */
export async function calculateStreaks(userId) {
  // Load all completed sessions for this user, sorted by start date
  const sessions = await StudySession.find({
    userId,
    completedAt: { $ne: null },
    durationMinutes: { $gt: 0 },
  }).sort({ startedAt: 1 });

  if (sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Format all session dates to unique YYYY-MM-DD calendar dates
  const dates = sessions.map((s) => formatDateString(s.startedAt));
  const uniqueDates = Array.from(new Set(dates)).sort();

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // 1. Calculate Longest Streak
  let longestStreak = 1;
  let runningStreak = 1;
  let prevTime = new Date(uniqueDates[0] + 'T00:00:00Z').getTime();

  for (let i = 1; i < uniqueDates.length; i++) {
    const curTime = new Date(uniqueDates[i] + 'T00:00:00Z').getTime();
    const diffDays = Math.round((curTime - prevTime) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      runningStreak += 1;
    } else if (diffDays > 1) {
      runningStreak = 1;
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevTime = curTime;
  }

  // 2. Calculate Current Streak
  const todayStr = formatDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateString(yesterday);

  let currentStreak = 0;
  const lastStudyDateStr = uniqueDates[uniqueDates.length - 1];

  // A streak continues only if they studied today or yesterday
  if (lastStudyDateStr === todayStr || lastStudyDateStr === yesterdayStr) {
    currentStreak = 1;
    let lastTime = new Date(lastStudyDateStr + 'T00:00:00Z').getTime();

    // Loop backwards from the second-to-last unique date
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const curTime = new Date(uniqueDates[i] + 'T00:00:00Z').getTime();
      const diffDays = Math.round((lastTime - curTime) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1;
        lastTime = curTime;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculate progress statistics summary
 */
export async function getProgressSummary(userId) {
  // Aggregate total studied minutes and total sessions count
  const sessions = await StudySession.find({
    userId,
    completedAt: { $ne: null },
  });

  const totalStudyMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalSessions = sessions.length;

  // Retrieve active study plan details
  const activePlan = await studyPlanService.getCurrentPlan(userId);
  let completedTasks = 0;
  let totalTasks = 0;

  if (activePlan && activePlan.days) {
    for (const day of activePlan.days) {
      totalTasks += day.tasks.length;
      completedTasks += day.tasks.filter((t) => t.completed).length;
    }
  }

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const { currentStreak, longestStreak } = await calculateStreaks(userId);

  // Calculate today's activity stats
  const todayStr = formatDateString(new Date());
  const todaySessions = sessions.filter((s) => formatDateString(s.completedAt) === todayStr);
  const todayStudyMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const todayCompletedTasks = todaySessions.length;

  // Retrieve last 10 completed study sessions
  const recentSessions = await StudySession.find({
    userId,
    completedAt: { $ne: null },
  })
    .sort({ startedAt: -1 })
    .limit(10);

  // Retrieve practice stats
  const practiceSessions = await PracticeSession.find({ userId, completed: true });
  const totalPracticeSessions = practiceSessions.length;

  let totalQuestionsAnswered = 0;
  let totalCorrectAnswers = 0;

  practiceSessions.forEach((s) => {
    totalCorrectAnswers += s.correctAnswers;
    totalQuestionsAnswered += s.questions.filter((q) => q.answer !== null).length;
  });

  const recentAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
    : null;

  return {
    totalStudyMinutes,
    totalSessions,
    completedTasks,
    totalTasks,
    completionRate,
    currentStreak,
    longestStreak,
    todayStudyMinutes,
    todayCompletedTasks,
    practiceSessionsCount: totalPracticeSessions,
    questionsAnsweredCount: totalQuestionsAnswered,
    recentAccuracy,
    recentSessions: recentSessions.map((s) => ({
      id: s._id,
      subject: s.subject,
      durationMinutes: s.durationMinutes,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    })),
  };
}

/**
 * Calculate studied minutes and completed tasks per subject
 */
export async function getSubjectProgress(userId) {
  // 1. Group studied sessions by subject
  const sessions = await StudySession.find({
    userId,
    completedAt: { $ne: null },
  });

  const activePlan = await studyPlanService.getCurrentPlan(userId);
  
  // Calculate completed task counts from active plan per subject
  const planCompletedCounts = {};
  if (activePlan && activePlan.days) {
    for (const day of activePlan.days) {
      for (const task of day.tasks) {
        if (task.completed) {
          planCompletedCounts[task.subject] = (planCompletedCounts[task.subject] || 0) + 1;
        }
      }
    }
  }

  const subjectMap = {};

  // Parse sessions
  for (const s of sessions) {
    if (!subjectMap[s.subject]) {
      subjectMap[s.subject] = {
        subject: s.subject,
        studyMinutes: 0,
        completedTasks: 0,
      };
    }
    subjectMap[s.subject].studyMinutes += s.durationMinutes;
  }

  // Parse completed plan tasks
  for (const [subj, count] of Object.entries(planCompletedCounts)) {
    if (!subjectMap[subj]) {
      subjectMap[subj] = {
        subject: subj,
        studyMinutes: 0,
        completedTasks: 0,
      };
    }
    subjectMap[subj].completedTasks = count;
  }

  // Ensure that completedTasks is synced for subjects loaded via session grouping
  for (const subj of Object.keys(subjectMap)) {
    subjectMap[subj].completedTasks = planCompletedCounts[subj] || 0;
  }

  // Filter only subjects with actual studied minutes or completed tasks
  return Object.values(subjectMap).filter((s) => s.studyMinutes > 0 || s.completedTasks > 0);
}

/**
 * Calculate daily studied minutes and session counts for the last 30 days
 */
export async function getDailyActivity(userId) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const sessions = await StudySession.find({
    userId,
    completedAt: { $ne: null },
    startedAt: { $gte: thirtyDaysAgo },
  });

  const dailyMap = {};

  for (const s of sessions) {
    const dateStr = formatDateString(s.startedAt);
    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        date: dateStr,
        studyMinutes: 0,
        sessions: 0,
      };
    }
    dailyMap[dateStr].studyMinutes += s.durationMinutes;
    dailyMap[dateStr].sessions += 1;
  }

  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate weekly learning digest aggregating metrics over the past 7 days vs prior 7 days
 */
export async function getWeeklyDigest(userId) {
  const now = new Date();
  const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [currentSessions, previousSessions, practiceSessions, streakInfo] = await Promise.all([
    StudySession.find({
      userId,
      completedAt: { $ne: null, $gte: currentWeekStart },
    }),
    StudySession.find({
      userId,
      completedAt: { $ne: null, $gte: previousWeekStart, $lt: currentWeekStart },
    }),
    PracticeSession.find({
      userId,
      completed: true,
      completedAt: { $gte: currentWeekStart },
    }),
    calculateStreaks(userId),
  ]);

  const currentMinutes = currentSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const previousMinutes = previousSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const minutesTrend = previousMinutes > 0
    ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100)
    : currentMinutes > 0 ? 100 : 0;

  // Group study time by subject for current week
  const subjectMinutes = {};
  for (const s of currentSessions) {
    subjectMinutes[s.subject] = (subjectMinutes[s.subject] || 0) + s.durationMinutes;
  }

  const topSubjectEntry = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1])[0] || null;

  let totalQuestions = 0;
  let correctAnswers = 0;
  practiceSessions.forEach((ps) => {
    totalQuestions += ps.questions.filter((q) => q.answer !== null).length;
    correctAnswers += ps.correctAnswers;
  });

  const weeklyAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;

  return {
    weekStart: currentWeekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
    currentWeekMinutes: currentMinutes,
    previousWeekMinutes: previousMinutes,
    minutesTrendPercent: minutesTrend,
    sessionsCount: currentSessions.length,
    practiceQuizzesCount: practiceSessions.length,
    questionsAnswered: totalQuestions,
    weeklyAccuracy,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    topSubject: topSubjectEntry ? { subject: topSubjectEntry[0], minutes: topSubjectEntry[1] } : null,
    subjectBreakdown: Object.entries(subjectMinutes).map(([subject, minutes]) => ({
      subject,
      minutes,
    })),
  };
}
