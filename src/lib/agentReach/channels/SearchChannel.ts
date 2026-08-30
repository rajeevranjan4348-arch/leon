/**
 * Agent-Reach SearchChannel
 * Semantic & multi-engine real-time web search with ranking and fallbacks.
 * MIT License
 */

import { AgentReachResult } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class SearchChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Perform a multi-backend web search.
   */
  public async search(query: string, options?: { limit?: number; freshness?: boolean }): Promise<AgentReachResult> {
    const startTime = Date.now();
    const limit = options?.limit || 6;
    const errors: string[] = [];

    // Tier 1: Jina Search API (returns clean markdown search results with source citations)
    try {
      const jinaSearchUrl = `https://s.jina.ai/${encodeURIComponent(query)}`;
      const resp = await fetch(jinaSearchUrl, {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgentReach-Search/1.0',
        },
        signal: AbortSignal.timeout(SearchChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50) {
          const sanitized = ContentSanitizer.sanitize(text);
          return {
            source: 'AgentReach:JinaSearch',
            platform: 'search',
            url: `https://s.jina.ai/${encodeURIComponent(query)}`,
            title: `Web Search: ${query}`,
            content: sanitized.sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: sanitized.safeConfidence,
            metadata: {
              engine: 'jina_search',
              query,
              latencyMs: Date.now() - startTime,
            },
          };
        }
      } else {
        errors.push(`Jina search HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      errors.push(`Jina search error: ${err?.message || String(err)}`);
    }

    // Tier 2: DuckDuckGo Instant Answers / HTML fallback
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const resp = await fetch(ddgUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(SearchChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        const results: Array<{ title: string; url: string; snippet: string }> = [];

        if (data.AbstractText) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL || 'https://duckduckgo.com',
            snippet: data.AbstractText,
          });
        }

        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics.slice(0, limit)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                url: topic.FirstURL,
                snippet: topic.Text,
              });
            }
          }
        }

        if (results.length > 0) {
          let content = `### Web Search Results for "${query}":\n\n`;
          results.forEach((r, idx) => {
            content += `${idx + 1}. **[${r.title}](${r.url})**\n   > ${r.snippet}\n\n`;
          });

          return {
            source: 'AgentReach:DuckDuckGo',
            platform: 'search',
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            title: `Search: ${query}`,
            content: ContentSanitizer.sanitize(content).sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.9,
            metadata: {
              engine: 'duckduckgo',
              query,
              count: results.length,
              latencyMs: Date.now() - startTime,
            },
            errors: errors.length > 0 ? errors : undefined,
          };
        }
      }
    } catch (err: any) {
      errors.push(`DuckDuckGo error: ${err?.message || String(err)}`);
    }

    // Tier 3: Search link fallback
    return {
      source: 'AgentReach:Search',
      platform: 'search',
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      title: `Search: ${query}`,
      content: `Live search query generated for: "${query}". See online results at https://www.google.com/search?q=${encodeURIComponent(query)}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.5,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const searchChannel = new SearchChannel();
