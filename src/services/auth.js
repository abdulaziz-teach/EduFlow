import api from './api.js';

const auth = {
  /** POST /api/auth/register */
  register: ({ name, email, password }) =>
    api.post('/auth/register', { name, email, password }),

  /** POST /api/auth/login */
  login: ({ email, password }) =>
    api.post('/auth/login', { email, password }),

  /** GET /api/users/me — uses JWT from localStorage */
  getMe: () => api.get('/users/me'),

  /** PATCH /api/users/me */
  updateMe: (data) => api.patch('/users/me', data),
};

export default auth;
