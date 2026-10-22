import api from './api.js';

const auth = {
  /** POST /api/auth/register */
  register: ({ name, email, password, preferredLanguage }) =>
    api.post('/auth/register', { name, email, password, preferredLanguage }),

  /** POST /api/auth/login */
  login: ({ email, password }) =>
    api.post('/auth/login', { email, password }),

  /** GET /api/users/me — uses JWT from localStorage */
  getMe: () => api.get('/users/me'),

  /** PATCH /api/users/me */
  updateMe: (data) => api.patch('/users/me', data),

  /** PATCH /api/users/me/onboarding-draft */
  saveOnboardingDraft: (data) => api.patch('/users/me/onboarding-draft', data),

  /** POST /api/users/me/onboarding */
  completeOnboarding: (data) => api.post('/users/me/onboarding', data),

  /** POST /api/auth/refresh */
  refreshToken: () => api.post('/auth/refresh', {}),

  /** POST /api/auth/logout */
  logout: () => api.post('/auth/logout', {}),
};

export default auth;
