const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Reusable API request helper.
 * - Attaches JWT from localStorage when available
 * - Parses JSON responses
 * - Throws with a useful error message on non-2xx
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('eduflow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${endpoint}`, config);
  } catch {
    throw new Error('Unable to connect to EduFlow. Please check that the backend is running.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Received an invalid response from the server.');
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

export default api;
