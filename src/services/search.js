import api from './api';

/**
 * EduFlow Search & Discovery API Client
 */

/**
 * Execute global multi-entity search
 */
export async function searchCourses({
  q = '',
  type = 'all',
  category = '',
  level = '',
  language = '',
  sort = 'relevance',
  page = 1,
  limit = 20,
  ai = false,
  signal = null,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type && type !== 'all') params.set('type', type);
  if (category) params.set('category', category);
  if (level) params.set('level', level);
  if (language) params.set('language', language);
  if (sort) params.set('sort', sort);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (ai) params.set('ai', 'true');

  const response = await api.get(`/search?${params.toString()}`, { signal });
  return response.data;
}

/**
 * Get autocomplete search suggestions
 */
export async function getSearchSuggestions(query = '', limit = 8, signal = null) {
  if (!query || query.trim().length < 2) {
    return { suggestions: [] };
  }
  const params = new URLSearchParams({ q: query.trim(), limit: String(limit) });
  const response = await api.get(`/search/suggestions?${params.toString()}`, { signal });
  return response.data;
}

/**
 * Get Course Discovery feeds
 */
export async function getDiscoveryFeed(signal = null) {
  const response = await api.get('/search/discovery', { signal });
  return response.data;
}

/**
 * Send search telemetry event
 */
export async function trackSearchTelemetry(eventData = {}) {
  try {
    await api.post('/search/events', eventData);
  } catch (_err) {
    // Silent failure for telemetry
  }
}

/**
 * Fetch Admin Search Analytics
 */
export async function getAdminSearchAnalytics(days = 30) {
  const response = await api.get(`/search/admin/analytics?days=${days}`);
  return response.data;
}

export default {
  searchCourses,
  getSearchSuggestions,
  getDiscoveryFeed,
  trackSearchTelemetry,
  getAdminSearchAnalytics,
};
