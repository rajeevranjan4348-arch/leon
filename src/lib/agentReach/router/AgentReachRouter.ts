/**
 * Agent-Reach Intelligent Router & Intent Classifier
 * Determines optimal channel, plans queries, classifies freshness, and executes multi-backend fallbacks.
 * MIT License
 */

import {
  AgentReachIntent,
  AgentReachPlatform,
  AgentReachResult,
  IntentClassification,
} from '../types';
import { webChannel } from '../channels/WebChannel';
import { youtubeChannel } from '../channels/YouTubeChannel';
import { gitHubChannel } from '../channels/GitHubChannel';
import { redditChannel } from '../channels/RedditChannel';
import { twitterChannel } from '../channels/TwitterChannel';
import { rssChannel } from '../channels/RSSChannel';
import { bilibiliChannel } from '../channels/BilibiliChannel';
import { v2exChannel } from '../channels/V2EXChannel';
import { searchChannel } from '../channels/SearchChannel';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class AgentReachRouter {
  private static instance: AgentReachRouter;

  private constructor() {}

  public static getInstance(): AgentReachRouter {
    if (!AgentReachRouter.instance) {
      AgentReachRouter.instance = new AgentReachRouter();
    }
    return AgentReachRouter.instance;
  }

  /**
   * Freshness keywords that signal real-time / current information need.
   */
  private static readonly FRESHNESS_REGEX = /\b(latest|recent|today|current|now|this\s+(week|month|year)|new\s+updates?|breaking|2026|live|trending)\b/i;

  /**
   * Classify user query or intent to determine the best internet access route.
   */
  public classifyIntent(input: string): IntentClassification {
    const text = (input || '').trim();
    const freshnessRequired = AgentReachRouter.FRESHNESS_REGEX.test(text);

    // 1. Direct URL Detection
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const rawUrl = urlMatch ? urlMatch[0] : null;

    if (rawUrl) {
      // YouTube URL
      if (/(?:youtube\.com|youtu\.be)/i.test(rawUrl)) {
        return {
          intent: 'YOUTUBE',
          platform: 'youtube',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected YouTube video/channel URL in user request.',
        };
      }

      // GitHub URL
      if (/github\.com/i.test(rawUrl)) {
        return {
          intent: 'GITHUB',
          platform: 'github',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected GitHub repository/code URL in user request.',
        };
      }

      // Reddit URL
      if (/reddit\.com/i.test(rawUrl)) {
        return {
          intent: 'REDDIT',
          platform: 'reddit',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected Reddit thread/community URL in user request.',
        };
      }

      // Twitter / X URL
      if (/(?:twitter\.com|x\.com)/i.test(rawUrl)) {
        return {
          intent: 'TWITTER',
          platform: 'twitter',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected X/Twitter tweet/status URL in user request.',
        };
      }

      // Bilibili URL
      if (/bilibili\.com/i.test(rawUrl)) {
        return {
          intent: 'BILIBILI',
          platform: 'bilibili',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected Bilibili video URL in user request.',
        };
      }

      // V2EX URL
      if (/v2ex\.com/i.test(rawUrl)) {
        return {
          intent: 'V2EX',
          platform: 'v2ex',
          targetUrl: rawUrl,
          confidence: 0.98,
          freshnessRequired: false,
          reasoning: 'Detected V2EX topic/community URL in user request.',
        };
      }

      // RSS / Atom feed URL (e.g. .rss, .xml, /feed, /rss)
      if (/(?:\.rss|\.xml|\/feed|\/rss|atom\.xml)/i.test(rawUrl)) {
        return {
          intent: 'RSS',
          platform: 'rss',
          targetUrl: rawUrl,
          confidence: 0.95,
          freshnessRequired: true,
          reasoning: 'Detected RSS/Atom feed URL in user request.',
        };
      }

      // Generic Webpage URL
      return {
        intent: 'WEBPAGE_READING',
        platform: 'web',
        targetUrl: rawUrl,
        confidence: 0.95,
        freshnessRequired: false,
        reasoning: 'Detected generic webpage URL for reading.',
      };
    }

    // 2. Keyword & Topic-Based Classification
    const lower = text.toLowerCase();

    // YouTube keywords
    if (/\b(youtube|video|transcript|subtitles?|watch\s+video)\b/i.test(lower)) {
      return {
        intent: 'YOUTUBE',
        platform: 'youtube',
        query: text.replace(/\b(search\s+youtube\s+for|youtube|find\s+video\s+about)\b/gi, '').trim(),
        confidence: 0.88,
        freshnessRequired,
        reasoning: 'User explicitly requested YouTube video search or transcript.',
      };
    }

    // GitHub keywords or owner/repo format
    const githubSlugMatch = text.match(/\b([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\b/);
    if (/\b(github|repo|repository|commit|readme|open\s*source)\b/i.test(lower) || githubSlugMatch) {
      const query = githubSlugMatch ? `${githubSlugMatch[1]}/${githubSlugMatch[2]}` : text.replace(/\b(github|repo|search\s+github\s+for)\b/gi, '').trim();
      return {
        intent: 'GITHUB',
        platform: 'github',
        query,
        confidence: 0.9,
        freshnessRequired,
        reasoning: 'User requested GitHub repository, code or documentation analysis.',
      };
    }

    // Reddit keywords
    if (/\b(reddit|subreddit|r\/[a-zA-Z0-9_]+|redditor)\b/i.test(lower)) {
      const subMatch = text.match(/\br\/([a-zA-Z0-9_]+)\b/i);
      return {
        intent: 'REDDIT',
        platform: 'reddit',
        query: text.replace(/\b(search\s+reddit\s+for|on\s+reddit|reddit)\b/gi, '').trim(),
        params: subMatch ? { subreddit: subMatch[1] } : undefined,
        confidence: 0.9,
        freshnessRequired,
        reasoning: 'User requested Reddit discussion or subreddit search.',
      };
    }

    // Twitter/X keywords
    if (/\b(twitter|tweet|tweets|x\.com|thread\s+on\s+x)\b/i.test(lower)) {
      return {
        intent: 'TWITTER',
        platform: 'twitter',
        query: text.replace(/\b(search\s+twitter\s+for|on\s+twitter|tweets?\s+about)\b/gi, '').trim(),
        confidence: 0.88,
        freshnessRequired: true,
        reasoning: 'User requested X/Twitter posts or discussions.',
      };
    }

    // RSS keywords
    if (/\b(rss|feed|atom|news\s+feed)\b/i.test(lower)) {
      return {
        intent: 'RSS',
        platform: 'rss',
        query: text,
        confidence: 0.85,
        freshnessRequired: true,
        reasoning: 'User requested RSS or Atom feed processing.',
      };
    }

    // Bilibili keywords
    if (/\b(bilibili|b站|bilibili\.com|bvid)\b/i.test(lower)) {
      return {
        intent: 'BILIBILI',
        platform: 'bilibili',
        query: text.replace(/\b(bilibili|b站)\b/gi, '').trim(),
        confidence: 0.9,
        freshnessRequired,
        reasoning: 'User requested Bilibili video or search.',
      };
    }

    // V2EX keywords
    if (/\b(v2ex|v2ex\.com|v2)\b/i.test(lower)) {
      return {
        intent: 'V2EX',
        platform: 'v2ex',
        query: text.replace(/\b(v2ex)\b/gi, '').trim(),
        confidence: 0.9,
        freshnessRequired,
        reasoning: 'User requested V2EX community topic.',
      };
    }

    // Web Search detection (questions about current facts, companies, people, news, prices, etc.)
    if (freshnessRequired || /\b(search\s+the\s+web|google|who\s+is|what\s+is\s+the\s+latest|price\s+of|weather|news\s+about)\b/i.test(lower)) {
      return {
        intent: 'WEB_SEARCH',
        platform: 'search',
        query: text,
        confidence: 0.85,
        freshnessRequired: true,
        reasoning: 'User query requires real-time web search or fresh external info.',
      };
    }

    // Default: No explicit web requirement
    return {
      intent: 'NO_WEB_REQUIRED',
      platform: 'web',
      query: text,
      confidence: 0.5,
      freshnessRequired: false,
      reasoning: 'No explicit online platform or web lookup detected.',
    };
  }

  /**
   * Intelligently route and execute the request using the appropriate channel.
   */
  public async routeAndExecute(input: string, options?: { forcePlatform?: AgentReachPlatform }): Promise<AgentReachResult> {
    const classification = this.classifyIntent(input);
    const platform = options?.forcePlatform || classification.platform;

    switch (platform) {
      case 'youtube': {
        const target = classification.targetUrl || classification.query || input;
        return youtubeChannel.getVideoDetails(target);
      }

      case 'github': {
        const target = classification.targetUrl || classification.query || input;
        return gitHubChannel.getRepoDetails(target);
      }

      case 'reddit': {
        const target = classification.targetUrl || classification.query || input;
        const sub = classification.params?.subreddit;
        if (classification.targetUrl) {
          return redditChannel.getPostOrThread(classification.targetUrl);
        }
        return redditChannel.searchReddit(target, sub);
      }

      case 'twitter': {
        const target = classification.targetUrl || classification.query || input;
        return twitterChannel.getTweetOrThread(target);
      }

      case 'rss': {
        const target = classification.targetUrl || input;
        return rssChannel.readFeed(target);
      }

      case 'bilibili': {
        const target = classification.targetUrl || classification.query || input;
        return bilibiliChannel.getVideoDetails(target);
      }

      case 'v2ex': {
        const target = classification.targetUrl || classification.query || input;
        return v2exChannel.getTopicOrNode(target);
      }

      case 'search': {
        const query = classification.query || input;
        return searchChannel.search(query, { freshness: classification.freshnessRequired });
      }

      case 'web':
      default: {
        if (classification.targetUrl) {
          return webChannel.readUrl(classification.targetUrl);
        }
        // Fallback to search if it's text without a URL
        return searchChannel.search(input);
      }
    }
  }

  /**
   * Multi-source concurrent research executor.
   * Dispatches independent searches concurrently to accelerate comprehensive research.
   */
  public async multiSourceResearch(
    queries: Array<{ platform: AgentReachPlatform; queryOrUrl: string }>
  ): Promise<AgentReachResult[]> {
    const promises = queries.map((q) =>
      this.routeAndExecute(q.queryOrUrl, { forcePlatform: q.platform })
    );
    return Promise.all(promises);
  }

  /**
   * Format results into a source-aware structured prompt context for the AI model.
   */
  public static formatForModelContext(results: AgentReachResult[]): string {
    if (!results || results.length === 0) return '';

    let formatted = `\n=== AGENT-REACH LIVE RETRIEVED SOURCES (SOURCE-AWARE CONTEXT) ===\n` +
      `Instructions for AI: The following content was retrieved live from external sources. ` +
      `Distinguish live retrieved facts from internal model knowledge. Always cite the corresponding platform & source URL.\n\n`;

    results.forEach((res, idx) => {
      formatted += `[SOURCE #${idx + 1} | Platform: ${res.platform.toUpperCase()} | Source: ${res.source}]\n` +
        `Title: ${res.title}\n` +
        `URL: ${res.url}\n` +
        `Retrieved At: ${res.retrievedAt}\n` +
        `Content:\n${res.content}\n` +
        `----------------------------------------\n\n`;
    });

    formatted += `=== END OF AGENT-REACH RETRIEVED SOURCES ===\n\n`;
    return formatted;
  }
}

export const agentReachRouter = AgentReachRouter.getInstance();
