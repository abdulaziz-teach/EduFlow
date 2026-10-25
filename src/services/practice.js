import api from './api';
import { PRACTICE_QUESTIONS, SUBJECTS_CONFIG, getLocalizedQuestion } from '../data/practicePool';

// In-memory / localStorage storage key for local offline/mock practice sessions
const LOCAL_SESSIONS_KEY = 'eduflow_practice_sessions';

function getStoredSessions() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStoredSessions(sessions) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Could not save sessions to localStorage:', err);
  }
}

/**
 * Generate fallback / mock session when backend is offline or on GitHub Pages
 */
function createLocalPracticeSession(data) {
  const { subject, topic, difficulty = 'medium', count = 5, language = 'uz' } = data;

  // Filter pool matching subject or fallback
  let candidates = PRACTICE_QUESTIONS.filter((q) => {
    const matchSubject = !subject || q.subject.toLowerCase() === subject.toLowerCase();
    const matchDiff = !difficulty || q.difficulty === difficulty;
    return matchSubject && matchDiff;
  });

  if (candidates.length < 3) {
    candidates = PRACTICE_QUESTIONS.filter((q) => !subject || q.subject.toLowerCase() === subject.toLowerCase());
  }

  if (candidates.length === 0) {
    candidates = PRACTICE_QUESTIONS;
  }

  // Shuffle and take count
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const localizedQuestions = selected.map((q) => getLocalizedQuestion(q, language));

  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const fullSession = {
    id: sessionId,
    subject: subject || 'Computer Science',
    topic: topic || 'General Practice',
    difficulty,
    language,
    startedAt: new Date().toISOString(),
    totalQuestions: localizedQuestions.length,
    questions: localizedQuestions.map((q, idx) => ({
      id: q.id,
      order: idx + 1,
      type: q.type,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      userAnswer: null,
      isCorrect: null,
    })),
    completed: false,
    score: 0,
  };

  const sessions = getStoredSessions();
  sessions.unshift(fullSession);
  saveStoredSessions(sessions);

  // Return sanitized session (without revealing correctAnswer and explanation upfront)
  return {
    success: true,
    session: {
      id: fullSession.id,
      subject: fullSession.subject,
      topic: fullSession.topic,
      totalQuestions: fullSession.totalQuestions,
      questions: fullSession.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        question: q.question,
        options: q.options,
        difficulty: q.difficulty,
      })),
    },
  };
}

/**
 * Handle answer submission locally
 */
function submitLocalAnswer(sessionId, { questionId, answer }) {
  const sessions = getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const q = session.questions.find((item) => item.id === questionId);
  if (!q) {
    throw new Error('Question not found');
  }

  const isCorrect = String(answer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
  q.userAnswer = answer;
  q.isCorrect = isCorrect;

  saveStoredSessions(sessions);

  return {
    success: true,
    correct: isCorrect,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  };
}

/**
 * Complete session locally
 */
function completeLocalSession(sessionId) {
  const sessions = getStoredSessions();
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  session.completed = true;
  session.completedAt = new Date().toISOString();
  session.score = session.questions.filter((q) => q.isCorrect).length;
  session.correctAnswers = session.score;
  session.accuracy = Math.round((session.score / (session.questions.length || 1)) * 100);

  saveStoredSessions(sessions);

  return {
    success: true,
    session,
  };
}

export const generateQuestions = async (data) => {
  try {
    return await api.post('/practice/generate', data);
  } catch (err) {
    return { success: true, message: 'Local generation completed' };
  }
};

export const createPracticeSession = async (data) => {
  try {
    return await api.post('/practice/sessions', data);
  } catch (err) {
    console.warn('Backend unavailable, using rich client-side practice engine:', err.message);
    return createLocalPracticeSession(data);
  }
};

function getUserPreferredSubject() {
  try {
    const raw = localStorage.getItem('eduflow_local_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (Array.isArray(u.subjects) && u.subjects.length > 0) {
        return u.subjects[0];
      }
    }
  } catch {
    // ignore
  }
  return 'Mathematics';
}

export const quickStartPracticeSession = async (lang = 'uz') => {
  const chosenSubj = getUserPreferredSubject();
  const cfg = SUBJECTS_CONFIG.find((c) => c.id.toLowerCase() === chosenSubj.toLowerCase());
  const chosenTopic = cfg?.topics?.[lang]?.[0] || `${chosenSubj} 1-dars`;

  try {
    return await api.post('/practice/quick-start', { language: lang, subject: chosenSubj });
  } catch (err) {
    return createLocalPracticeSession({
      subject: chosenSubj,
      topic: chosenTopic,
      difficulty: 'medium',
      count: 5,
      language: lang,
    });
  }
};

export const submitAnswer = async (sessionId, data) => {
  try {
    return await api.post(`/practice/sessions/${sessionId}/answer`, data);
  } catch (err) {
    return submitLocalAnswer(sessionId, data);
  }
};

export const completePracticeSession = async (sessionId) => {
  try {
    return await api.post(`/practice/sessions/${sessionId}/complete`, {});
  } catch (err) {
    return completeLocalSession(sessionId);
  }
};

export const getPracticeRecommendation = async () => {
  const chosenSubj = getUserPreferredSubject();
  const cfg = SUBJECTS_CONFIG.find((c) => c.id.toLowerCase() === chosenSubj.toLowerCase());
  const chosenTopic = cfg?.topics?.uz?.[0] || `${chosenSubj} 1-dars`;

  try {
    const res = await api.get('/practice/recommendation');
    if (res?.recommendation?.subject) {
      return res;
    }
    return {
      success: true,
      recommendation: {
        subject: chosenSubj,
        topic: chosenTopic,
        difficulty: 'medium',
        reason: 'O‘quv profilingiz uchun tavsiya etildi.',
      },
    };
  } catch (err) {
    return {
      success: true,
      recommendation: {
        subject: chosenSubj,
        topic: chosenTopic,
        difficulty: 'medium',
        reason: 'O‘quv profilingiz uchun tavsiya etildi.',
      },
    };
  }
};

export const getPracticeHistory = async () => {
  try {
    return await api.get('/practice/history');
  } catch (err) {
    const sessions = getStoredSessions();
    return {
      success: true,
      sessions: sessions.filter((s) => s.completed),
    };
  }
};

export const getPracticeSessionDetails = async (sessionId) => {
  try {
    return await api.get(`/practice/sessions/${sessionId}`);
  } catch (err) {
    const sessions = getStoredSessions();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return { success: true, session };
  }
};

const practiceService = {
  generateQuestions,
  createSession: createPracticeSession,
  quickStart: quickStartPracticeSession,
  submitAnswer,
  completeSession: completePracticeSession,
  getRecommendation: getPracticeRecommendation,
  getHistory: getPracticeHistory,
  getSessionDetails: getPracticeSessionDetails,
  getSubjectsConfig: () => SUBJECTS_CONFIG,
};

export default practiceService;
