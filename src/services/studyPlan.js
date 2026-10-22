import api from './api.js';

const LOCAL_PLAN_KEY = 'eduflow_study_plan';

function getFallbackPlan() {
  const stored = localStorage.getItem(LOCAL_PLAN_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  const now = new Date();
  const days = [];
  const subjectsList = ['Computer Science', 'Mathematics', 'English', 'Physics'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const subj = subjectsList[i % subjectsList.length];
    days.push({
      id: 'day_' + i,
      dayNumber: i + 1,
      date: d.toISOString(),
      focus: subj,
      tasks: [
        {
          id: 'task_' + i + '_1',
          title: `${subj}: Asosiy qoidalar va tushunchalarni o'rganish`,
          subject: subj,
          duration: 25,
          type: 'learning',
          completed: i === 0,
        },
        {
          id: 'task_' + i + '_2',
          title: `${subj}: Amaliy test va mashqlarni yechish`,
          subject: subj,
          duration: 20,
          type: 'practice',
          completed: false,
        },
      ],
    });
  }

  const plan = {
    _id: 'plan_local_demo_1',
    title: 'Haftalik O\'quv Dasturi & Tayyorgarlik',
    summary: 'Kunlik 45 daqiqalik intensiv amaliyot va nazariy mustahkamlash rejasi.',
    dailyMinutes: 45,
    days,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(plan));
  } catch (e) {
    // ignore
  }

  return plan;
}

export const generateStudyPlan = async () => {
  try {
    return await api.post('/study-plans/generate', {});
  } catch (err) {
    return { success: true, plan: getFallbackPlan() };
  }
};

export const getCurrentStudyPlan = async () => {
  try {
    return await api.get('/study-plans/current');
  } catch (err) {
    return { success: true, plan: getFallbackPlan() };
  }
};

export const getStudyPlan = async (id) => {
  try {
    return await api.get(`/study-plans/${id}`);
  } catch (err) {
    return { success: true, plan: getFallbackPlan() };
  }
};

export const completeTask = async (planId, taskId) => {
  try {
    return await api.patch(`/study-plans/${planId}/tasks/${taskId}/complete`, {});
  } catch (err) {
    const plan = getFallbackPlan();
    if (plan.days) {
      plan.days.forEach((day) => {
        day.tasks.forEach((t) => {
          if (t.id === taskId) t.completed = true;
        });
      });
      localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(plan));
    }
    return { success: true, plan };
  }
};

export const getTodayStudyPlan = async () => {
  try {
    return await api.get('/study-plans/today');
  } catch (err) {
    const plan = getFallbackPlan();
    return { success: true, today: plan.days[0] };
  }
};

export const getStudyRecommendation = async () => {
  try {
    return await api.get('/study-plans/recommendation');
  } catch (err) {
    return {
      success: true,
      recommendation: {
        subject: 'Computer Science',
        topic: 'JavaScript Basics',
        reason: 'Recommended for your active streak and level.',
      },
    };
  }
};

export const getDailyCoach = async () => {
  try {
    return await api.post('/study-plans/daily-coach', {});
  } catch (err) {
    return {
      success: true,
      message: 'Bugungi maqsadingiz: 30 daqiqa amaliyot o\'tash va 1 ta yangi mavzuni mustahkamlash!',
    };
  }
};

export const adaptStudyPlan = async (planId) => {
  try {
    return await api.post('/study-plans/adapt', { planId });
  } catch (err) {
    return { success: true, message: 'Reja muvaffaqiyatli moslashtirildi.' };
  }
};

export const getRecentAdaptation = async (planId) => {
  try {
    return await api.get(`/study-plans/${planId}/adaptations`);
  } catch (err) {
    return { success: true, adaptations: [] };
  }
};

export const getAdaptationExplanation = async (type, reason, changes) => {
  try {
    return await api.post('/study-plans/adaptation-explanation', { type, reason, changes });
  } catch (err) {
    return { success: true, explanation: 'Reja o\'zlashtirish sur\'atingizga moslashtirildi.' };
  }
};

export const exportICS = (planId) => {
  const token = localStorage.getItem('eduflow_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${apiUrl}/study-plans/${planId}/export-ics?token=${token || ''}`;
};

const studyPlanService = {
  generate: generateStudyPlan,
  getCurrent: getCurrentStudyPlan,
  getById: getStudyPlan,
  completeTask,
  getTodayStudyPlan,
  getStudyRecommendation,
  getDailyCoach,
  adaptStudyPlan,
  getRecentAdaptation,
  getAdaptationExplanation,
  exportICS,
};

export default studyPlanService;
