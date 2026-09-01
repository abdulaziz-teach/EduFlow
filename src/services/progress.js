import api from './api.js';

export const getProgressSummary = () => api.get('/progress/summary');
export const getSubjectProgress = () => api.get('/progress/subjects');
export const getActivity = () => api.get('/progress/activity');
export const getWeeklyDigest = () => api.get('/progress/weekly-digest');

const progressService = {
  getProgressSummary,
  getSubjectProgress,
  getActivity,
  getWeeklyDigest,
};

export default progressService;
