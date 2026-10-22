import api from './api.js';

export const getProfile = (refresh = false) =>
  api.get(`/learning/profile${refresh ? '?refresh=true' : ''}`);

export const getWeakTopics = () =>
  api.get('/learning/weak-topics');

export const getRecommendations = () =>
  api.get('/learning/recommendations');

export const getDailyPlan = () =>
  api.get('/learning/daily-plan');

export const regenerateDailyPlan = () =>
  api.post('/learning/daily-plan/generate');

export const toggleDailyPlanTask = (taskId, completed) =>
  api.patch(`/learning/daily-plan/tasks/${taskId}`, { completed });

export const getMemories = () =>
  api.get('/learning/memories');

export const deleteMemory = (id) =>
  api.delete(`/learning/memories/${id}`);

export const generateQuiz = (payload) =>
  api.post('/learning/quiz/generate', payload);

export const getAnalytics = () =>
  api.get('/learning/analytics');

const learningService = {
  getProfile,
  getWeakTopics,
  getRecommendations,
  getDailyPlan,
  regenerateDailyPlan,
  toggleDailyPlanTask,
  getMemories,
  deleteMemory,
  generateQuiz,
  getAnalytics,
};

export default learningService;
