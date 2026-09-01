import api from './api';

export const generateQuestions = (data) => api.post('/practice/generate', data);
export const createPracticeSession = (data) => api.post('/practice/sessions', data);
export const quickStartPracticeSession = () => api.post('/practice/quick-start', {});
export const submitAnswer = (sessionId, data) => api.post(`/practice/sessions/${sessionId}/answer`, data);
export const completePracticeSession = (sessionId) => api.post(`/practice/sessions/${sessionId}/complete`, {});
export const getPracticeRecommendation = () => api.get('/practice/recommendation');
export const getPracticeHistory = () => api.get('/practice/history');
export const getPracticeSessionDetails = (sessionId) => api.get(`/practice/sessions/${sessionId}`);

const practiceService = {
  generateQuestions,
  createSession: createPracticeSession,
  quickStart: quickStartPracticeSession,
  submitAnswer,
  completeSession: completePracticeSession,
  getRecommendation: getPracticeRecommendation,
  getHistory: getPracticeHistory,
  getSessionDetails: getPracticeSessionDetails,
};

export default practiceService;
