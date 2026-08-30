/**
 * Agent-Reach RedditChannel
 * Reads public Reddit posts, discussion threads, comments, and performs subreddit searches with fallback.
 * MIT License
 */

import { AgentReachResult, RedditDiscussion } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class RedditChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Parse Reddit post or subreddit from URL.
   */
  public static parseRedditUrl(url: string): { subreddit?: string; postId?: string; isPost: boolean } | null {
    if (!url) return null;
    const clean = url.trim();

    // Match comments URL: https://reddit.com/r/reactjs/comments/123abc/title/
    const postMatch = clean.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9]+)/i);
    if (postMatch) {
      return {
        subreddit: postMatch[1],
        postId: postMatch[2],
        isPost: true,
      };
    }

    // Match subreddit URL: https://reddit.com/r/technology
    const subMatch = clean.match(/reddit\.com\/r\/([a-zA-Z0-9_]+)/i);
    if (subMatch) {
      return {
        subreddit: subMatch[1],
        isPost: false,
      };
    }

    return null;
  }

  /**
   * Read post and comments from a Reddit thread.
   */
  public async getPostOrThread(urlOrQuery: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const parsed = RedditChannel.parseRedditUrl(urlOrQuery);

    if (!parsed) {
      // If it's a topic query, search Reddit
      return this.searchReddit(urlOrQuery);
    }

    const errors: string[] = [];
    let targetUrl = urlOrQuery;
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

    // Tier 1: Reddit Public JSON API
    if (parsed.isPost && parsed.postId) {
      try {
        const jsonUrl = `https://www.reddit.com/r/${parsed.subreddit}/comments/${parsed.postId}.json?limit=10`;
        const resp = await fetch(jsonUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (AgentReach/1.0)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(RedditChannel.TIMEOUT_MS),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length >= 2) {
            const postData = data[0]?.data?.children?.[0]?.data;
            const commentsData = data[1]?.data?.children || [];

            if (postData) {
              const topComments = commentsData
                .filter((c: any) => c.kind === 't1' && c.data && c.data.body)
                .slice(0, 8)
                .map((c: any) => ({
                  author: c.data.author || '[deleted]',
                  body: c.data.body || '',
                  score: c.data.score || 0,
                }));

              let content = `### Reddit Post: ${postData.title}\n` +
                `**Subreddit**: r/${postData.subreddit} | **Author**: u/${postData.author} | **Score**: ⬆️ ${postData.score} | **Comments**: 💬 ${postData.num_comments}\n` +
                `**URL**: https://reddit.com${postData.permalink}\n\n`;

              if (postData.selftext) {
                content += `#### Post Content:\n${postData.selftext}\n\n`;
              }

              if (topComments.length > 0) {
                content += `#### Top Discussion Comments:\n`;
                topComments.forEach((c: any, idx: number) => {
                  content += `**${idx + 1}. u/${c.author}** (Score: ${c.score}):\n${c.body}\n\n`;
                });
              }

              const sanitized = ContentSanitizer.sanitize(content);
              return {
                source: 'AgentReach:RedditJSON',
                platform: 'reddit',
                url: `https://reddit.com${postData.permalink}`,
                title: `[Reddit] ${postData.title}`,
                content: sanitized.sanitizedContent,
                author: postData.author,
                publishedAt: new Date(postData.created_utc * 1000).toISOString(),
                metadata: {
                  subreddit: postData.subreddit,
                  score: postData.score,
                  numComments: postData.num_comments,
                  latencyMs: Date.now() - startTime,
                },
                retrievedAt: new Date().toISOString(),
                confidence: 0.95,
              };
            }
          }
        }
      } catch (err: any) {
        errors.push(`Reddit JSON error: ${err?.message || String(err)}`);
      }
    }

    // Tier 2: Fallback via Jina Reader on Reddit URL
    try {
      const jinaUrl = `https://r.jina.ai/${targetUrl}`;
      const resp = await fetch(jinaUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(RedditChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 100) {
          const sanitized = ContentSanitizer.sanitize(text);
          return {
            source: 'AgentReach:RedditProxy',
            platform: 'reddit',
            url: targetUrl,
            title: `Reddit Discussion (${parsed?.subreddit ? 'r/' + parsed.subreddit : 'Reddit'})`,
            content: sanitized.sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.85,
            metadata: {
              subreddit: parsed?.subreddit,
              latencyMs: Date.now() - startTime,
            },
            errors: errors.length > 0 ? errors : undefined,
          };
        }
      }
    } catch (err: any) {
      errors.push(`Reddit proxy error: ${err?.message || String(err)}`);
    }

    return {
      source: 'AgentReach:Reddit',
      platform: 'reddit',
      url: targetUrl,
      title: 'Reddit Content Retrieval Failed',
      content: `Failed to retrieve Reddit discussion for '${targetUrl}'.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0,
      errors,
    };
  }

  /**
   * Search Reddit for discussions on a topic.
   */
  public async searchReddit(query: string, subreddit?: string, limit: number = 6): Promise<AgentReachResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const searchUrl = subreddit
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=relevance&limit=${limit}`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${limit}`;

    try {
      const resp = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (AgentReach/1.0)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(RedditChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        const posts = data?.data?.children || [];

        if (posts.length > 0) {
          let content = `### Reddit Discussions for "${query}":\n\n`;
          posts.forEach((p: any, idx: number) => {
            const item = p.data;
            content += `${idx + 1}. **[${item.title}](https://reddit.com${item.permalink})**\n` +
              `   - Subreddit: \`r/${item.subreddit}\` | Score: ⬆️ ${item.score} | Comments: 💬 ${item.num_comments}\n` +
              `   - Excerpt: ${item.selftext ? item.selftext.slice(0, 200) + '...' : '(Link/Media post)'}\n\n`;
          });

          return {
            source: 'AgentReach:RedditSearch',
            platform: 'reddit',
            url: `https://reddit.com/search?q=${encodeURIComponent(query)}`,
            title: `Reddit Search: ${query}`,
            content: ContentSanitizer.sanitize(content).sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.92,
            metadata: {
              query,
              subreddit,
              count: posts.length,
              latencyMs: Date.now() - startTime,
            },
          };
        }
      }
    } catch (err: any) {
      errors.push(`Reddit search error: ${err?.message || String(err)}`);
    }

    // Fallback: Return structured fallback search result
    return {
      source: 'AgentReach:Reddit',
      platform: 'reddit',
      url: `https://reddit.com/search?q=${encodeURIComponent(query)}`,
      title: `Reddit Search: ${query}`,
      content: `Searched Reddit for: "${query}". See discussion posts on Reddit directly at https://reddit.com/search?q=${encodeURIComponent(query)}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.55,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const redditChannel = new RedditChannel();
