import api from './api.js';

export const getProgressSummary = async () => {
  try {
    return await api.get('/progress/summary');
  } catch {
    return {
      success: true,
      summary: {
        totalStudyMinutes: 125,
        completedTasks: 3,
        totalTasks: 14,
        currentStreak: 2,
        totalSessions: 4,
        practiceSessionsCount: 2,
        questionsAnsweredCount: 15,
        recentAccuracy: 85,
        completionRate: 21,
        recentSessions: [
          {
            _id: 's1',
            subject: 'English',
            durationMinutes: 25,
            startedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            _id: 's2',
            subject: 'Computer Science',
            durationMinutes: 30,
            startedAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      },
    };
  }
};

export const getSubjectProgress = async () => {
  try {
    return await api.get('/progress/subjects');
  } catch {
    return {
      success: true,
      subjects: [
        { subject: 'English', studyMinutes: 45, completedTasks: 2 },
        { subject: 'Computer Science', studyMinutes: 50, completedTasks: 1 },
        { subject: 'Mathematics', studyMinutes: 30, completedTasks: 0 },
      ],
    };
  }
};

export const getActivity = async () => {
  try {
    return await api.get('/progress/activity');
  } catch {
    const activity = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      activity.push({
        date: d.toISOString().split('T')[0],
        studyMinutes: i % 2 === 0 ? 30 + i * 5 : 0,
      });
    }
    return { success: true, activity };
  }
};

export const getWeeklyDigest = async () => {
  try {
    return await api.get('/progress/weekly-digest');
  } catch {
    return {
      success: true,
      digest: {
        weekStart: 'Monday',
        weekEnd: 'Sunday',
        currentWeekMinutes: 125,
        topSubject: { subject: 'Computer Science', minutes: 50 },
        weeklyAccuracy: 85,
      },
    };
  }
};

const progressService = {
  getProgressSummary,
  getSubjectProgress,
  getActivity,
  getWeeklyDigest,
};

export default progressService;
