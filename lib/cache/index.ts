/**
 * In-memory cache utility with TTL (Time To Live) support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttlMs: number;
  maxSize?: number;
}

/**
 * Creates a new in-memory cache instance with TTL support
 * @param options - Cache configuration options
 * @returns Cache instance with get, set, invalidate, and clear methods
 */
export function createCache<T>(options: CacheOptions) {
  const { ttlMs, maxSize = 100 } = options;
  const cache = new Map<string, CacheEntry<T>>();

  /**
   * Get cached data by key
   * Returns null if key doesn't exist or TTL has expired
   */
  function get(key: string): T | null {
    const cached = cache.get(key);
    if (!cached) return null;

    // Check if entry has expired
    if (Date.now() - cached.timestamp > ttlMs) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data by key
   * Automatically cleans up old entries if cache exceeds maxSize
   */
  function set(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });

    // Clean up old cache entries if cache exceeds maxSize
    if (cache.size > maxSize) {
      // Find oldest entry
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;

      for (const [k, entry] of Array.from(cache.entries())) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = k;
        }
      }

      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  }

  /**
   * Invalidate (remove) a specific cache entry by key
   */
  function invalidate(key: string): void {
    cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  function clear(): void {
    cache.clear();
  }

  /**
   * Get current cache size
   */
  function size(): number {
    return cache.size;
  }

  return {
    get,
    set,
    invalidate,
    clear,
    size,
  };
}

/**
 * Default cache instance for leaderboard data (30 second TTL)
 */
export const leaderboardCache = createCache<any>({
  ttlMs: 30000, // 30 seconds
  maxSize: 50,
});

/**
 * Default cache instance for player stats (30 second TTL)
 */
export const playerStatsCache = createCache<any>({
  ttlMs: 30000, // 30 seconds
  maxSize: 100,
});

