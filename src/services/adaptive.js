import api from './api.js';

export const getNextAction = () =>
  api.get('/adaptive/next-action');

export const getMasteries = () =>
  api.get('/adaptive/mastery');

export const explainMastery = (topic, subject = '') =>
  api.get(`/adaptive/mastery/${encodeURIComponent(topic)}/explain${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`);

export const checkPrerequisites = (topic, subject = '') =>
  api.get(`/adaptive/prerequisites/${encodeURIComponent(topic)}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`);

export const getMistakes = (limit = 20) =>
  api.get(`/adaptive/mistakes?limit=${limit}`);

export const resolveMistake = (id) =>
  api.post(`/adaptive/mistakes/${id}/resolve`);

export const getAdminInsights = () =>
  api.get('/adaptive/admin/insights');

const adaptiveService = {
  getNextAction,
  getMasteries,
  explainMastery,
  checkPrerequisites,
  getMistakes,
  resolveMistake,
  getAdminInsights,
};

export default adaptiveService;
