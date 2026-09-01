import api from './api.js';

export const startSession = (planId, taskId) =>
  api.post('/study-sessions/start', { planId, taskId });

export const getActiveSession = () =>
  api.get('/study-sessions/active');

export const completeSession = (id) =>
  api.patch(`/study-sessions/${id}/complete`, {});

const studySessionService = {
  startSession,
  getActiveSession,
  completeSession,
};

export default studySessionService;
