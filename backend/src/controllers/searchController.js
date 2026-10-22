import {
  executeGlobalSearch,
  getSearchSuggestions,
  getCourseDiscovery,
} from '../services/searchService.js';
import {
  recordSearchEvent,
  getAdminSearchAnalytics,
} from '../services/searchAnalyticsService.js';

/**
 * @desc    Global multi-entity search
 * @route   GET /api/search
 * @access  Public (Optional auth for personalization)
 */
export const search = async (req, res, next) => {
  try {
    const {
      q,
      query,
      type,
      category,
      level,
      language,
      sort,
      page,
      limit,
      ai,
    } = req.query;

    const searchTerm = q !== undefined ? q : query || '';
    const userId = req.user?._id || null;
    const userRole = req.user?.role || 'user';
    const anonymousSessionId = req.headers['x-anonymous-session-id'] || null;

    const results = await executeGlobalSearch({
      query: searchTerm,
      type: type || 'all',
      category: category || null,
      level: level || null,
      language: language || null,
      sort: sort || 'relevance',
      page: page || 1,
      limit: limit || 20,
      userId,
      userRole,
      enableAi: ai === 'true' || ai === '1',
      anonymousSessionId,
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Autocomplete search suggestions
 * @route   GET /api/search/suggestions
 * @access  Public
 */
export const suggestions = async (req, res, next) => {
  try {
    const { q, query, limit } = req.query;
    const searchTerm = q !== undefined ? q : query || '';

    const data = await getSearchSuggestions({
      query: searchTerm,
      limit: limit || 8,
    });

    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Course Discovery feeds (Recommended, Trending, Popular, Topics)
 * @route   GET /api/search/discovery
 * @access  Public (Optional auth for personalized recommendations)
 */
export const discovery = async (req, res, next) => {
  try {
    const userId = req.user?._id || null;
    const data = await getCourseDiscovery({ userId });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track privacy-conscious search event from client
 * @route   POST /api/search/events
 * @access  Public (Optional auth)
 */
export const trackEvent = async (req, res, next) => {
  try {
    const {
      query,
      eventType,
      resultCount,
      executionTimeMs,
      selectedResult,
      filters,
    } = req.body;

    const userId = req.user?._id || null;
    const anonymousSessionId = req.headers['x-anonymous-session-id'] || req.body.anonymousSessionId || null;

    await recordSearchEvent({
      query,
      userId,
      anonymousSessionId,
      eventType,
      resultCount,
      executionTimeMs,
      selectedResult,
      filters,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get search telemetry & analytics for admin
 * @route   GET /api/search/admin/analytics
 * @access  Protected (Admin only)
 */
export const adminAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const analytics = await getAdminSearchAnalytics(days);

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  search,
  suggestions,
  discovery,
  trackEvent,
  adminAnalytics,
};
