/**
 * Agent-Reach TwitterChannel
 * Reads public X/Twitter tweets, threads, and user discussions with multi-tier fallback.
 * MIT License
 */

import { AgentReachResult, TwitterTweetItem } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class TwitterChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Extract tweet ID and username from tweet URL.
   */
  public static parseTweetUrl(url: string): { tweetId?: string; username?: string } | null {
    if (!url) return null;
    const clean = url.trim();

    // Match tweet URL: https://twitter.com/user/status/123456789 or https://x.com/user/status/123456789
    const match = clean.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/i);
    if (match) {
      return {
        username: match[1],
        tweetId: match[2],
      };
    }

    // Match raw tweet ID
    if (/^[0-9]{15,22}$/.test(clean)) {
      return {
        tweetId: clean,
      };
    }

    return null;
  }

  /**
   * Get single tweet or thread content by URL or ID.
   */
  public async getTweetOrThread(urlOrId: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const parsed = TwitterChannel.parseTweetUrl(urlOrId);

    if (!parsed?.tweetId) {
      // If it's a search term or user handle, search Twitter
      return this.searchTwitter(urlOrId);
    }

    const { tweetId, username } = parsed;
    const tweetUrl = `https://x.com/${username || 'i'}/status/${tweetId}`;
    const errors: string[] = [];

    // Tier 1: Twitter Syndication JSON API (no API key required)
    try {
      const syndicationUrl = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`;
      const resp = await fetch(syndicationUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(TwitterChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.text) {
          const authorName = data.user?.name || username || 'Twitter User';
          const authorScreenName = data.user?.screen_name || username || 'user';
          const createdAt = data.created_at || new Date().toISOString();
          const likes = data.favorite_count || 0;
          const replies = data.reply_count || 0;

          let content = `### Tweet from @${authorScreenName} (${authorName}):\n\n` +
            `"${data.text}"\n\n` +
            `**Date**: ${createdAt}\n` +
            `**Engagement**: ❤️ ${likes.toLocaleString()} likes | 💬 ${replies} replies | 🔄 ${data.retweet_count || 0} retweets\n` +
            `**URL**: ${tweetUrl}\n`;

          // Handle parent tweet if in a thread
          if (data.parent?.text) {
            content = `*(Replying to @${data.parent.user?.screen_name || 'parent'}*: "${data.parent.text}")\n\n` + content;
          }

          const sanitized = ContentSanitizer.sanitize(content);
          return {
            source: 'AgentReach:TwitterSyndication',
            platform: 'twitter',
            url: tweetUrl,
            title: `[X/Twitter] Tweet by @${authorScreenName}`,
            content: sanitized.sanitizedContent,
            author: `@${authorScreenName}`,
            publishedAt: createdAt,
            metadata: {
              tweetId,
              likes,
              replies,
              latencyMs: Date.now() - startTime,
            },
            retrievedAt: new Date().toISOString(),
            confidence: 0.96,
          };
        }
      }
    } catch (err: any) {
      errors.push(`Syndication error: ${err?.message || String(err)}`);
    }

    // Tier 2: Jina Reader Proxy fallback
    try {
      const jinaUrl = `https://r.jina.ai/${tweetUrl}`;
      const resp = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(TwitterChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50) {
          const sanitized = ContentSanitizer.sanitize(text);
          return {
            source: 'AgentReach:TwitterProxy',
            platform: 'twitter',
            url: tweetUrl,
            title: `[X/Twitter] Tweet (${tweetId})`,
            content: sanitized.sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.82,
            metadata: {
              tweetId,
              latencyMs: Date.now() - startTime,
            },
            errors: errors.length > 0 ? errors : undefined,
          };
        }
      }
    } catch (err: any) {
      errors.push(`Twitter proxy error: ${err?.message || String(err)}`);
    }

    return {
      source: 'AgentReach:Twitter',
      platform: 'twitter',
      url: tweetUrl,
      title: 'Tweet Retrieval Failed',
      content: `Failed to retrieve tweet from '${tweetUrl}'. It may be private, deleted, or require login.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0,
      errors,
    };
  }

  /**
   * Search X/Twitter for discussions or keywords.
   */
  public async searchTwitter(query: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const cleanQuery = query.replace(/^#/, '');
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=live`;

    // Attempt web search over twitter discussions
    try {
      const jinaUrl = `https://r.jina.ai/${searchUrl}`;
      const resp = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(TwitterChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 100) {
          return {
            source: 'AgentReach:TwitterSearch',
            platform: 'twitter',
            url: searchUrl,
            title: `X/Twitter Search: ${query}`,
            content: ContentSanitizer.sanitize(text).sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.85,
            metadata: {
              query,
              latencyMs: Date.now() - startTime,
            },
          };
        }
      }
    } catch {
      // Fallback
    }

    return {
      source: 'AgentReach:Twitter',
      platform: 'twitter',
      url: searchUrl,
      title: `X/Twitter Search: ${query}`,
      content: `Searched X/Twitter for: "${query}". See active discussion at https://x.com/search?q=${encodeURIComponent(query)}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.5,
      errors: ['Direct search stream fallback used.'],
    };
  }
}

export const twitterChannel = new TwitterChannel();
