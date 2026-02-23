// ---------------------------------------------------------------------------
// Generic LRU (Least-Recently-Used) cache
//
// Backed by a Map, which preserves insertion order in JS.  The "least
// recently used" entry is always the first item in the Map; the "most
// recently used" is always the last.  On every get() or set() access the
// touched key is moved to the tail.
//
// Primary use: caching rendered PDF pages (ArrayBuffer or rendered bitmap)
// so that navigating back to a species avoids re-fetching the file.
// Default capacity: 5 entries.
// ---------------------------------------------------------------------------

export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly cache: Map<K, V>;

  constructor(capacity: number = 5) {
    if (capacity < 1) {
      throw new RangeError(`LRUCache capacity must be >= 1, got ${capacity}`);
    }
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  // ---------------------------------------------------------------------------
  // has — O(1)
  // ---------------------------------------------------------------------------
  has(key: K): boolean {
    return this.cache.has(key);
  }

  // ---------------------------------------------------------------------------
  // get — returns the value and promotes key to MRU position.  O(1)
  // ---------------------------------------------------------------------------
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;

    // Promote to tail (most-recently-used position)
    const value = this.cache.get(key) as V;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  // ---------------------------------------------------------------------------
  // set — inserts or updates a key, evicting LRU entry when over capacity. O(1)
  // ---------------------------------------------------------------------------
  set(key: K, value: V): this {
    if (this.cache.has(key)) {
      // Remove existing entry so it gets re-inserted at the tail
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict the least-recently-used entry (first key in Map iteration order)
      const lruKey = this.cache.keys().next().value as K;
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
    return this;
  }

  // ---------------------------------------------------------------------------
  // delete — removes a key if present.  O(1)
  // ---------------------------------------------------------------------------
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  // ---------------------------------------------------------------------------
  // clear — empties the cache.  O(n)
  // ---------------------------------------------------------------------------
  clear(): void {
    this.cache.clear();
  }

  // ---------------------------------------------------------------------------
  // Introspection helpers (useful for testing / debugging)
  // ---------------------------------------------------------------------------

  /** Current number of cached entries. */
  get size(): number {
    return this.cache.size;
  }

  /** Maximum capacity this cache was constructed with. */
  get maxSize(): number {
    return this.capacity;
  }

  /**
   * Returns all keys in LRU → MRU order (oldest first).
   * Iterating the underlying Map gives insertion order, which tracks usage.
   */
  keys(): K[] {
    return [...this.cache.keys()];
  }
}
