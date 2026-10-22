import SearchEvent from '../models/SearchEvent.js';
import { normalizeQuery } from './searchRelevanceService.js';

/**
 * Privacy-Conscious Search Analytics & Telemetry Service
 */

/**
 * Record a search event safely
 */
export async function recordSearchEvent({
  query,
  userId = null,
  anonymousSessionId = null,
  eventType = 'search',
  resultCount = 0,
  executionTimeMs = 0,
  selectedResult = null,
  filters = {},
}) {
  try {
    const cleanQuery = typeof query === 'string' ? query.trim().substring(0, 100) : '';
    if (!cleanQuery) return null;

    const normalizedQuery = normalizeQuery(cleanQuery);

    return await SearchEvent.create({
      query: cleanQuery,
      normalizedQuery,
      userId,
      anonymousSessionId,
      eventType,
      resultCount: Math.max(0, Number(resultCount) || 0),
      executionTimeMs: Math.max(0, Number(executionTimeMs) || 0),
      selectedResult: selectedResult ? {
        entityType: selectedResult.entityType || null,
        entityId: selectedResult.entityId ? String(selectedResult.entityId) : null,
        position: selectedResult.position !== undefined ? Number(selectedResult.position) : null,
        title: selectedResult.title ? String(selectedResult.title).substring(0, 150) : null,
      } : null,
      filters: typeof filters === 'object' ? filters : {},
    });
  } catch (err) {
    // Non-blocking: analytics failures should never crash search
    console.error('[SearchAnalytics] Failed to record search event:', err.message);
    return null;
  }
}

/**
 * Aggregate search analytics for admin dashboard
 */
export async function getAdminSearchAnalytics(timeWindowDays = 30) {
  const sinceDate = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);

  const [
    topSearches,
    zeroResultQueries,
    totalSearches,
    totalClicks,
    entityClicks,
    dailyTrends,
  ] = await Promise.all([
    // 1. Top searched queries
    SearchEvent.aggregate([
      { $match: { eventType: 'search', createdAt: { $gte: sinceDate } } },
      { $group: { _id: '$normalizedQuery', count: { $sum: 1 }, avgResults: { $avg: '$resultCount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, avgResults: { $round: ['$avgResults', 1] }, _id: 0 } },
    ]),

    // 2. Most frequent zero-result queries
    SearchEvent.aggregate([
      { $match: { eventType: { $in: ['search', 'zero_results'] }, resultCount: 0, createdAt: { $gte: sinceDate } } },
      { $group: { _id: '$normalizedQuery', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } },
    ]),

    // 3. Total searches count
    SearchEvent.countDocuments({ eventType: 'search', createdAt: { $gte: sinceDate } }),

    // 4. Total clicks count
    SearchEvent.countDocuments({ eventType: 'result_click', createdAt: { $gte: sinceDate } }),

    // 5. Clicks by entity type
    SearchEvent.aggregate([
      { $match: { eventType: 'result_click', 'selectedResult.entityType': { $ne: null }, createdAt: { $gte: sinceDate } } },
      { $group: { _id: '$selectedResult.entityType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { type: '$_id', count: 1, _id: 0 } },
    ]),

    // 6. Daily search volume trend
    SearchEvent.aggregate([
      { $match: { eventType: 'search', createdAt: { $gte: sinceDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          searches: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', searches: 1, _id: 0 } },
    ]),
  ]);

  const clickThroughRate = totalSearches > 0 ? Number(((totalClicks / totalSearches) * 100).toFixed(1)) : 0;

  return {
    timeWindowDays,
    summary: {
      totalSearches,
      totalClicks,
      clickThroughRate,
    },
    topSearches,
    zeroResultQueries,
    entityClicks,
    dailyTrends,
  };
}

export default {
  recordSearchEvent,
  getAdminSearchAnalytics,
};
