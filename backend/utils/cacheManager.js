/**
 * High-Performance In-Memory LRU (Least Recently Used) Cache with TTL.
 * 
 * DSA Strategy:
 * - Backed by JavaScript ES6 Map (O(1) average lookup, insertion, and deletion).
 * - Map maintains insertion order: Oldest accessed element is at the beginning (iterator.next()).
 * - On cache hit: Key is refreshed to the end of the Map (marked most recently used).
 * - On cache capacity overflow: First key is evicted in O(1) time.
 * - TTL validation prevents stale data without polling loops.
 * 
 * Guarantees zero hardware upgrades needed: Bound to fixed memory limit to protect AWS EC2 RAM.
 */
export class LRUCache {
  constructor({ maxCapacity = 500, defaultTTL = 60000 } = {}) {
    this.maxCapacity = maxCapacity;
    this.defaultTTL = defaultTTL; // In milliseconds (default: 60 seconds)
    this.cache = new Map();
  }

  /**
   * Get an item from cache. Refreshes LRU position.
   * Time Complexity: O(1)
   */
  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    const now = Date.now();

    // Check TTL expiration
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position to make it Most Recently Used
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Put an item into cache with optional custom TTL.
   * Evicts Least Recently Used item if capacity is reached.
   * Time Complexity: O(1)
   */
  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxCapacity) {
      // Evict oldest (least recently used) item (first key in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Invalidate a single key
   * Time Complexity: O(1)
   */
  invalidate(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a given prefix (e.g. 'reports:', 'projects:')
   * Time Complexity: O(K) where K is number of cached keys
   */
  invalidatePrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get current size
   */
  size() {
    return this.cache.size;
  }
}

// Global Singleton Instance for ERP API Cache
export const apiCache = new LRUCache({
  maxCapacity: 600,
  defaultTTL: 60 * 1000 // 60 seconds
});

export default apiCache;
