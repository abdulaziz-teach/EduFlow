import api from './api.js';

export const generateStudyPlan = () => api.post('/study-plans/generate', {});
export const getCurrentStudyPlan = () => api.get('/study-plans/current');
export const getStudyPlan = (id) => api.get(`/study-plans/${id}`);
export const completeTask = (planId, taskId) =>
  api.patch(`/study-plans/${planId}/tasks/${taskId}/complete`, {});
export const getTodayStudyPlan = () => api.get('/study-plans/today');
export const getStudyRecommendation = () => api.get('/study-plans/recommendation');
export const getDailyCoach = () => api.post('/study-plans/daily-coach', {});
export const adaptStudyPlan = (planId) => api.post('/study-plans/adapt', { planId });
export const getRecentAdaptation = (planId) => api.get(`/study-plans/${planId}/adaptations`);
export const getAdaptationExplanation = (type, reason, changes) =>
  api.post('/study-plans/adaptation-explanation', { type, reason, changes });
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
