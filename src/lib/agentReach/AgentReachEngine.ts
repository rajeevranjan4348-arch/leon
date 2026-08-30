/**
 * AgentReachEngine - Core Capability & Coordination Engine
 * Coordinates intelligent routing, channel execution, TTL caching, and source-aware formatting.
 * MIT License
 */

import {
  AgentReachPlatform,
  AgentReachResult,
  DoctorReport,
} from './types';
import { agentReachRouter } from './router/AgentReachRouter';
import { webChannel } from './channels/WebChannel';
import { youtubeChannel } from './channels/YouTubeChannel';
import { gitHubChannel } from './channels/GitHubChannel';
import { redditChannel } from './channels/RedditChannel';
import { twitterChannel } from './channels/TwitterChannel';
import { rssChannel } from './channels/RSSChannel';
import { bilibiliChannel } from './channels/BilibiliChannel';
import { v2exChannel } from './channels/V2EXChannel';
import { searchChannel } from './channels/SearchChannel';
import { AgentReachDoctor } from './diagnostics/AgentReachDoctor';

interface CacheEntry {
  result: AgentReachResult;
  expiresAt: number;
}

export class AgentReachEngine {
  private static instance: AgentReachEngine;
  private cache: Map<string, CacheEntry> = new Map();
  private inFlightRequests: Map<string, Promise<AgentReachResult>> = new Map();
  private defaultTtlMs = 1000 * 60 * 5; // 5 minutes cache

  private constructor() {}

  public static getInstance(): AgentReachEngine {
    if (!AgentReachEngine.instance) {
      AgentReachEngine.instance = new AgentReachEngine();
    }
    return AgentReachEngine.instance;
  }

  /**
   * Helper to execute with caching and in-flight deduplication.
   */
  private async executeCached(
    cacheKey: string,
    fetcher: () => Promise<AgentReachResult>,
    ttlMs: number = this.defaultTtlMs
  ): Promise<AgentReachResult> {
    const now = Date.now();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.result;
    }

    // Deduplicate concurrent in-flight requests for same key
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const promise = fetcher().then((res) => {
      if (res.confidence > 0.4) {
        this.cache.set(cacheKey, {
          result: res,
          expiresAt: Date.now() + ttlMs,
        });
      }
      this.inFlightRequests.delete(cacheKey);
      return res;
    }).catch((err) => {
      this.inFlightRequests.delete(cacheKey);
      throw err;
    });

    this.inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  /**
   * Read any webpage URL with fallback.
   */
  public async readUrl(url: string, options?: { timeoutMs?: number; maxLength?: number }): Promise<AgentReachResult> {
    const cacheKey = `url:${url}`;
    return this.executeCached(cacheKey, () => webChannel.readUrl(url, options));
  }

  /**
   * Search the web for real-time information.
   */
  public async search(query: string, options?: { limit?: number; freshness?: boolean }): Promise<AgentReachResult> {
    const cacheKey = `search:${query}:${Boolean(options?.freshness)}`;
    return this.executeCached(cacheKey, () => searchChannel.search(query, options), 1000 * 60 * 3);
  }

  /**
   * Retrieve YouTube video details, transcript, or search videos.
   */
  public async getYouTube(urlOrQuery: string): Promise<AgentReachResult> {
    const cacheKey = `youtube:${urlOrQuery}`;
    return this.executeCached(cacheKey, () => youtubeChannel.getVideoDetails(urlOrQuery));
  }

  /**
   * Retrieve public GitHub repository details, README, and code.
   */
  public async getGitHub(urlOrSlug: string): Promise<AgentReachResult> {
    const cacheKey = `github:${urlOrSlug}`;
    return this.executeCached(cacheKey, () => gitHubChannel.getRepoDetails(urlOrSlug), 1000 * 60 * 10);
  }

  /**
   * Retrieve Reddit discussion post or search subreddit.
   */
  public async getReddit(urlOrQuery: string, subreddit?: string): Promise<AgentReachResult> {
    const cacheKey = `reddit:${urlOrQuery}:${subreddit || ''}`;
    return this.executeCached(cacheKey, () => {
      if (RedditChannelIsUrl(urlOrQuery)) {
        return redditChannel.getPostOrThread(urlOrQuery);
      }
      return redditChannel.searchReddit(urlOrQuery, subreddit);
    });
  }

  /**
   * Retrieve X/Twitter tweet, thread, or search.
   */
  public async getTwitter(urlOrQuery: string): Promise<AgentReachResult> {
    const cacheKey = `twitter:${urlOrQuery}`;
    return this.executeCached(cacheKey, () => twitterChannel.getTweetOrThread(urlOrQuery));
  }

  /**
   * Read and parse RSS / Atom feed.
   */
  public async getRSS(feedUrl: string, limit: number = 10): Promise<AgentReachResult> {
    const cacheKey = `rss:${feedUrl}:${limit}`;
    return this.executeCached(cacheKey, () => rssChannel.readFeed(feedUrl, limit));
  }

  /**
   * Retrieve Bilibili video details and stats.
   */
  public async getBilibili(urlOrId: string): Promise<AgentReachResult> {
    const cacheKey = `bilibili:${urlOrId}`;
    return this.executeCached(cacheKey, () => bilibiliChannel.getVideoDetails(urlOrId));
  }

  /**
   * Retrieve V2EX topic or latest discussions.
   */
  public async getV2EX(urlOrId: string): Promise<AgentReachResult> {
    const cacheKey = `v2ex:${urlOrId}`;
    return this.executeCached(cacheKey, () => v2exChannel.getTopicOrNode(urlOrId));
  }

  /**
   * Automatically classify intent and route to the best channel.
   */
  public async route(input: string, options?: { forcePlatform?: AgentReachPlatform }): Promise<AgentReachResult> {
    return agentReachRouter.routeAndExecute(input, options);
  }

  /**
   * Execute diagnostics health check across all channels.
   */
  public async doctor(): Promise<DoctorReport> {
    return AgentReachDoctor.runDoctor();
  }

  /**
   * Clear cache.
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

function RedditChannelIsUrl(str: string): boolean {
  return /reddit\.com/i.test(str);
}

export const agentReachEngine = AgentReachEngine.getInstance();
