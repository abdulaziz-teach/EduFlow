import api from './api.js';

const LOCAL_USER_KEY = 'eduflow_local_user';
const TOKEN_KEY = 'eduflow_token';

function getFallbackUser() {
  const stored = localStorage.getItem(LOCAL_USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // ignore
    }
  }

  return {
    _id: 'user_demo_mvp_68201',
    name: 'EduFlow O‘quvchi',
    email: 'student@eduflow.uz',
    preferredLanguage: localStorage.getItem('eduflow_language') || 'uz',
    onboardingComplete: true,
    subjects: ['Computer Science', 'Mathematics', 'English', 'Physics'],
    learningGoal: 'exam',
    studyStreak: 7,
    dailyMinutes: 45,
    role: 'student',
    stats: {
      totalStudyMinutes: 320,
      quizzesTaken: 12,
      accuracy: 88,
    },
    createdAt: new Date().toISOString(),
  };
}

function saveFallbackUser(user) {
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Could not save user to localStorage:', e);
  }
}

const auth = {
  /** POST /api/auth/register */
  register: async ({ name, email, password, preferredLanguage = 'uz' }) => {
    try {
      return await api.post('/auth/register', { name, email, password, preferredLanguage });
    } catch (err) {
      console.warn('Backend unavailable, proceeding with standalone local account:', err.message);
      const newUser = {
        _id: 'user_' + Date.now(),
        name: name || 'O‘quvchi',
        email: email || 'student@eduflow.uz',
        preferredLanguage,
        onboardingComplete: true,
        subjects: ['Computer Science', 'Mathematics', 'English'],
        learningGoal: 'skill',
        studyStreak: 1,
        dailyMinutes: 30,
        role: 'student',
        createdAt: new Date().toISOString(),
      };
      saveFallbackUser(newUser);
      const fakeToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem(TOKEN_KEY, fakeToken);
      return { success: true, token: fakeToken, user: newUser };
    }
  },

  /** POST /api/auth/login */
  login: async ({ email, password }) => {
    try {
      return await api.post('/auth/login', { email, password });
    } catch (err) {
      console.warn('Backend unavailable, activating instant standalone session:', err.message);
      let user = getFallbackUser();
      if (email) {
        user.email = email;
        user.name = email.split('@')[0] || user.name;
        saveFallbackUser(user);
      }
      const fakeToken = 'mock_jwt_token_' + Date.now();
      localStorage.setItem(TOKEN_KEY, fakeToken);
      return { success: true, token: fakeToken, user };
    }
  },

  /** GET /api/users/me */
  getMe: async () => {
    try {
      return await api.get('/users/me');
    } catch (err) {
      const user = getFallbackUser();
      return { success: true, user };
    }
  },

  /** PATCH /api/users/me */
  updateMe: async (data) => {
    try {
      return await api.patch('/users/me', data);
    } catch (err) {
      const user = { ...getFallbackUser(), ...data };
      saveFallbackUser(user);
      return { success: true, user };
    }
  },

  /** PATCH /api/users/me/onboarding-draft */
  saveOnboardingDraft: async (data) => {
    try {
      return await api.patch('/users/me/onboarding-draft', data);
    } catch (err) {
      const user = { ...getFallbackUser(), ...data };
      saveFallbackUser(user);
      return { success: true, user };
    }
  },

  /** POST /api/users/me/onboarding */
  completeOnboarding: async (data) => {
    try {
      return await api.post('/users/me/onboarding', data);
    } catch (err) {
      const user = { ...getFallbackUser(), ...data, onboardingComplete: true };
      saveFallbackUser(user);
      return { success: true, user };
    }
  },

  /** POST /api/auth/refresh */
  refreshToken: async () => {
    try {
      return await api.post('/auth/refresh', {});
    } catch (err) {
      return { accessToken: localStorage.getItem(TOKEN_KEY) || 'mock_refreshed_token' };
    }
  },

  /** POST /api/auth/logout */
  logout: async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (err) {
      // offline fallback
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    return { success: true };
  },
};

export default auth;
