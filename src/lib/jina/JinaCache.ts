import { JinaPageContent, JinaSearchResultItem } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

/**
 * JinaCache: In-memory lightweight cache with TTL and live-query bypass.
 */
export class JinaCache {
  private static pageCache = new Map<string, CacheEntry<JinaPageContent>>();
  private static searchCache = new Map<string, CacheEntry<JinaSearchResultItem[]>>();
  private static readonly DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_ENTRIES = 100;

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  public static getPage(url: string, bypassCache = false): JinaPageContent | null {
    if (bypassCache) return null;
    const entry = this.pageCache.get(url);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.DEFAULT_TTL_MS) {
      this.pageCache.delete(url);
      return null;
    }
    return entry.data;
  }

  public static setPage(url: string, content: JinaPageContent): void {
    if (this.pageCache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.pageCache.keys().next().value;
      if (oldestKey) this.pageCache.delete(oldestKey);
    }
    this.pageCache.set(url, {
      data: content,
      timestamp: Date.now(),
      hash: this.simpleHash(content.content || ''),
    });
  }

  public static getSearch(query: string, bypassCache = false): JinaSearchResultItem[] | null {
    if (bypassCache) return null;
    const key = query.trim().toLowerCase();
    const entry = this.searchCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.DEFAULT_TTL_MS) {
      this.searchCache.delete(key);
      return null;
    }
    return entry.data;
  }

  public static setSearch(query: string, results: JinaSearchResultItem[]): void {
    const key = query.trim().toLowerCase();
    if (this.searchCache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.searchCache.keys().next().value;
      if (oldestKey) this.searchCache.delete(oldestKey);
    }
    this.searchCache.set(key, {
      data: results,
      timestamp: Date.now(),
      hash: this.simpleHash(JSON.stringify(results)),
    });
  }

  public static clear(): void {
    this.pageCache.clear;
    this.searchCache.clear();
  }
}
