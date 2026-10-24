import api from './api.js';

const ACTIVE_SESSION_KEY = 'eduflow_active_session';
const SESSIONS_HISTORY_KEY = 'eduflow_sessions_history';

export const startSession = async (planId, taskId) => {
  try {
    return await api.post('/study-sessions/start', { planId, taskId });
  } catch {
    // Offline fallback: save active session locally in localStorage
    const session = {
      id: 'session_' + Date.now(),
      planId,
      taskId,
      startedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore
    }
    return { success: true, session };
  }
};

export const getActiveSession = async () => {
  try {
    return await api.get('/study-sessions/active');
  } catch {
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
      return { success: true, session: stored ? JSON.parse(stored) : null };
    } catch {
      return { success: true, session: null };
    }
  }
};

export const completeSession = async (id) => {
  try {
    return await api.patch(`/study-sessions/${id}/complete`, {});
  } catch {
    const completedAt = new Date().toISOString();
    try {
      const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
      let sessionData = stored ? JSON.parse(stored) : { id };
      sessionData = { ...sessionData, completedAt };

      const history = JSON.parse(localStorage.getItem(SESSIONS_HISTORY_KEY) || '[]');
      history.push(sessionData);
      localStorage.setItem(SESSIONS_HISTORY_KEY, JSON.stringify(history));
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch {
      // ignore
    }

    return {
      success: true,
      message: 'Study session completed successfully.',
      session: { id, completedAt },
    };
  }
};

export const logFocusSession = async (durationMinutes, subject) => {
  try {
    return await api.post('/study-sessions/log-focus', { durationMinutes, subject });
  } catch {
    try {
      const history = JSON.parse(localStorage.getItem(SESSIONS_HISTORY_KEY) || '[]');
      history.push({
        id: 'focus_' + Date.now(),
        durationMinutes,
        subject,
        completedAt: new Date().toISOString(),
      });
      localStorage.setItem(SESSIONS_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
    return { success: true, logged: true };
  }
};

const studySessionService = {
  startSession,
  getActiveSession,
  completeSession,
  logFocusSession,
};

export default studySessionService;
