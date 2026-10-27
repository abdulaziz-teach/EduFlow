const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_URL =
  import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:5000/api' : '/api');

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;
let refreshPromise;

/**
 * Delay helper for exponential backoff
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function refreshAccessToken() {
  const currentToken = typeof window !== 'undefined' ? localStorage.getItem('eduflow_token') : null;
  const isLocalDemo = Boolean(
    currentToken?.startsWith('demo_local_session_') ||
    (typeof window !== 'undefined' && localStorage.getItem('eduflow_is_demo') === 'true')
  );
  if (isLocalDemo) {
    return currentToken;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const options = {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      };
      let response;

      try {
        response = await fetch(`${API_URL}/auth/refresh`, options);
      } catch (error) {
        if (!API_URL.startsWith('http')) throw error;
        response = await fetch('/api/auth/refresh', options);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Received an invalid refresh response from the server.');
      }

      if (!response.ok || !data.accessToken) {
        localStorage.removeItem('eduflow_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('eduflow:session-expired'));
        }
        throw new Error(data.message || 'Your session has expired. Please log in again.');
      }

      localStorage.setItem('eduflow_token', data.accessToken);
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/**
 * Reusable API request helper with client-side timeout and transient failure retry.
 * - Attaches JWT from localStorage when available
 * - AbortController timeout protection
 * - Exponential backoff retry on transient network failures for GET requests
 * - Parses JSON responses and normalizes error structures
 */
async function request(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('eduflow_token') : null;
  const isLocalDemo = Boolean(
    token?.startsWith('demo_local_session_') ||
    (typeof window !== 'undefined' && localStorage.getItem('eduflow_is_demo') === 'true')
  );
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs || (endpoint.includes('/mentor/') ? 30000 : DEFAULT_TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach real JWT to server requests; do not pass mock/demo tokens as real server credentials
  if (token && !isLocalDemo) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    credentials: options.credentials || 'include',
    ...options,
    method,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const isIdempotent = method === 'GET';
  const maxAttempts = isIdempotent ? MAX_GET_RETRIES + 1 : 1;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let res;
      try {
        res = await fetch(`${API_URL}${endpoint}`, {
          ...config,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        // Fallback: try relative /api path (supported via Vite dev proxy)
        if (API_URL.startsWith('http')) {
          try {
            res = await fetch(`/api${endpoint}`, {
              ...config,
              signal: controller.signal,
            });
          } catch (fallbackErr) {
            throw fetchErr;
          }
        } else {
          throw fetchErr;
        }
      } finally {
        clearTimeout(timerId);
      }

      if (res?.status === 401 && token && !endpoint.startsWith('/auth/')) {
        if (isLocalDemo) {
          throw new Error('This action is not available in offline demo mode.');
        }
        const refreshedToken = await refreshAccessToken();
        headers.Authorization = `Bearer ${refreshedToken}`;

        try {
          res = await fetch(`${API_URL}${endpoint}`, {
            ...config,
            signal: controller.signal,
          });
        } catch (fetchErr) {
          if (!API_URL.startsWith('http')) throw fetchErr;
          res = await fetch(`/api${endpoint}`, {
            ...config,
            signal: controller.signal,
          });
        }
      }

      if (!res) {
        throw new Error('Unable to connect to EduFlow server. Please check your network connection.');
      }

      // If server returned 503 and this is an idempotent request, retry if attempts remain
      if (res.status === 503 && isIdempotent && attempt < maxAttempts) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      let data;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch {
          throw new Error('Received an invalid JSON payload from the server.');
        }
      } else {
        await res.text();
        const err = new Error(
          res.status === 404
            ? `API endpoint not found (${endpoint}).`
            : 'Unable to reach EduFlow backend server.'
        );
        err.noRetry = true;
        throw err;
      }

      if (!res.ok) {
        const err = new Error(data.message || data.error || `Request failed with status ${res.status}`);
        err.noRetry = res.status < 500;
        throw err;
      }

      return data;
    } catch (err) {
      lastError = err;

      if (err.name === 'AbortError') {
        throw new Error(`Request to ${endpoint} timed out after ${timeoutMs / 1000}s. Please try again.`);
      }

      // Retry idempotent GET requests on transient network drops
      if (isIdempotent && !err.noRetry && attempt < maxAttempts) {
        await sleep(500 * Math.pow(2, attempt - 1));
        continue;
      }

      break;
    }
  }

  throw lastError;
}

const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};

export default api;
