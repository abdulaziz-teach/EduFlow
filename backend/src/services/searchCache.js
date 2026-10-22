/**
 * High-Performance In-Memory LRU & TTL Search Cache
 *
 * Provides bounded caching for popular searches, autocomplete suggestions,
 * and static discovery feeds.
 *
 * Guarantees:
 * - TTL expiration
 * - Bounded maximum memory size with LRU eviction
 * - Strict isolation: Never caches user-personalized search globally
 * - Invalidation hooks for content updates
 */

class SearchCache {
  constructor(maxSize = 500, defaultTtlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
  }

  /**
   * Retrieve cached value if present and not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Set cache entry with TTL and enforce bounded size
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest entry (first item in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidate specific key
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. 'discovery:', 'courses:')
   */
  invalidatePrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Cache size
   */
  size() {
    return this.cache.size;
  }
}

export const searchCache = new SearchCache(500, 3 * 60 * 1000); // 3 minutes default TTL

/**
 * Generate a deterministic cache key.
 * If user-specific personalization is applied, key includes the userId so it is never shared.
 */
export function buildCacheKey(prefix, params = {}, userId = null) {
  const sortedEntries = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v).toLowerCase()}`);

  const userSuffix = userId ? `:user_${userId}` : ':public';
  return `${prefix}:${sortedEntries.join('&')}${userSuffix}`;
}

export default searchCache;
