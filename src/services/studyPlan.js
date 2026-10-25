import api from './api.js';
import { SUBJECTS_CONFIG } from '../data/practicePool.js';

const LOCAL_PLAN_KEY = 'eduflow_study_plan';

function getActiveUser() {
  try {
    const raw = localStorage.getItem('eduflow_local_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function getUserChosenSubjects() {
  const user = getActiveUser();
  if (Array.isArray(user?.subjects) && user.subjects.length > 0) {
    return user.subjects;
  }
  return ['Mathematics'];
}

export function buildClientStudyPlan(userSubjects) {
  const user = getActiveUser();
  const rawSubjs = (Array.isArray(userSubjects) && userSubjects.length > 0)
    ? userSubjects
    : getUserChosenSubjects();

  // Deduplicate and filter non-empty strings
  const subjects = [...new Set(rawSubjs.filter((s) => typeof s === 'string' && s.trim()))];
  const activeSubjects = subjects.length > 0 ? subjects : ['Mathematics'];

  const lang = localStorage.getItem('eduflow_language') || user?.preferredLanguage || 'uz';
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = [];
  let dayCounter = 0;

  // Har bir tanlangan fandan aynan 6 tadan darslik tuziladi
  activeSubjects.forEach((subj) => {
    const cfg = SUBJECTS_CONFIG.find(
      (c) => c.id.toLowerCase() === subj.toLowerCase() || c.title?.uz === subj || c.title?.en === subj
    );
    const topicList = cfg?.topics?.[lang] || cfg?.topics?.uz || cfg?.topics?.en || [
      'Asosiy tushunchalar',
      'Nazariy qoidalar',
      'Amaliy misollar',
      'Murakkab masalalar',
      'Mustahkamlash mashqlari',
      'Yakuniy test va tahlil',
    ];

    const sixTopics = topicList.slice(0, 6);
    while (sixTopics.length < 6) {
      sixTopics.push(`${subj} bo'yicha ${sixTopics.length + 1}-mavzu`);
    }

    sixTopics.forEach((topicName, lessonIdx) => {
      const lessonNumber = lessonIdx + 1;
      const dayDate = new Date(now.getTime() + dayCounter * 24 * 60 * 60 * 1000);
      const type = lessonIdx === 0 ? 'learning' : lessonIdx === 5 ? 'quiz' : (lessonIdx % 2 === 1 ? 'practice' : 'revision');

      days.push({
        id: `day_${dayCounter + 1}`,
        dayNumber: dayCounter + 1,
        date: dayDate.toISOString(),
        focus: `${subj}: ${topicName}`,
        tasks: [
          {
            id: `task_${subj.replace(/\s+/g, '_')}_lesson_${lessonNumber}`,
            _id: `task_${subj.replace(/\s+/g, '_')}_lesson_${lessonNumber}`,
            title: `${subj}: ${lessonNumber}-dars - ${topicName}`,
            subject: subj,
            duration: 25,
            type,
            completed: false,
          },
          {
            id: `task_${subj.replace(/\s+/g, '_')}_practice_${lessonNumber}`,
            _id: `task_${subj.replace(/\s+/g, '_')}_practice_${lessonNumber}`,
            title: `${subj}: ${lessonNumber}-dars amaliyoti va test`,
            subject: subj,
            duration: 20,
            type: 'practice',
            completed: false,
          },
        ],
      });

      dayCounter += 1;
    });
  });

  const plan = {
    _id: `plan_${Date.now()}`,
    title: 'Shaxsiy O‘quv Rejasi',
    summary: `Tanlangan fanlar: ${activeSubjects.join(', ')}. Har bir fandan 6 ta darslik va amaliyot.`,
    subjects: activeSubjects,
    dailyMinutes: user?.dailyStudyMinutes || 45,
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

export function getFallbackPlan(explicitSubjects) {
  const chosenSubjects = (Array.isArray(explicitSubjects) && explicitSubjects.length > 0)
    ? explicitSubjects
    : getUserChosenSubjects();

  const stored = localStorage.getItem(LOCAL_PLAN_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.days) && parsed.days.length > 0) {
        // Tekshirish: saqlangan rejada faqat tanlangan fanlar bormi?
        const planSubjs = [...new Set(parsed.days.flatMap((d) => d.tasks.map((t) => t.subject)))];
        const isMatch = chosenSubjects.length === planSubjs.length &&
          chosenSubjects.every((s) => planSubjs.includes(s));
        if (isMatch) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return buildClientStudyPlan(chosenSubjects);
}

export const generateStudyPlan = async () => {
  try {
    const res = await api.post('/study-plans/generate', {});
    if (res?.plan?.days?.length) {
      return res;
    }
    return { success: true, plan: getFallbackPlan() };
  } catch (err) {
    return { success: true, plan: getFallbackPlan() };
  }
};

export const getCurrentStudyPlan = async () => {
  try {
    const res = await api.get('/study-plans/current');
    if (res?.plan?.days?.length) {
      // Server rejasi foydalanuvchi tanlagan fanlarga mos kelishini tekshiramiz
      const chosen = getUserChosenSubjects();
      const planSubjs = [...new Set(res.plan.days.flatMap((d) => d.tasks.map((t) => t.subject)))];
      const hasUnwanted = planSubjs.some((s) => !chosen.includes(s));
      if (hasUnwanted) {
        // Eski aralashib ketgan fanlar bo'lsa, toza reja bilan yangilaymiz
        return { success: true, plan: buildClientStudyPlan(chosen) };
      }
      return res;
    }
    return { success: true, plan: getFallbackPlan() };
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
          if (t.id === taskId || t._id === taskId) t.completed = true;
        });
      });
      localStorage.setItem(LOCAL_PLAN_KEY, JSON.stringify(plan));
    }
    return { success: true, plan };
  }
};

export const getTodayStudyPlan = async () => {
  try {
    const res = await api.get('/study-plans/today');
    if (res?.day) return res;
    const plan = getFallbackPlan();
    return { success: true, day: plan.days[0], today: plan.days[0] };
  } catch (err) {
    const plan = getFallbackPlan();
    return { success: true, day: plan.days[0], today: plan.days[0] };
  }
};

export const getStudyRecommendation = async () => {
  try {
    return await api.get('/study-plans/recommendation');
  } catch (err) {
    const chosen = getUserChosenSubjects();
    const primarySubject = chosen[0] || 'Mathematics';
    return {
      success: true,
      recommendation: {
        subject: primarySubject,
        topic: `${primarySubject} 1-dars`,
        reason: 'Tanlangan o‘quv yo‘nalishingiz uchun tavsiya etildi.',
      },
    };
  }
};

export const getDailyCoach = async () => {
  try {
    return await api.post('/study-plans/daily-coach', {});
  } catch (err) {
    const chosen = getUserChosenSubjects();
    const primarySubject = chosen[0] || 'Mathematics';
    return {
      success: true,
      message: `Bugungi maqsadingiz: ${primarySubject} fanidan 1 ta yangi darsni o'zlashtirish va amaliyot o'tash!`,
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
