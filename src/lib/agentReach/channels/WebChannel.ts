/**
 * Agent-Reach WebChannel
 * Reads public web pages, articles, and documentation with multi-tier fallback.
 * MIT License
 */

import { AgentReachResult } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class WebChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Read and parse any public webpage URL with automatic fallback.
   */
  public async readUrl(url: string, options?: { timeoutMs?: number; maxLength?: number }): Promise<AgentReachResult> {
    const timeout = options?.timeoutMs || WebChannel.TIMEOUT_MS;
    const errors: string[] = [];
    const startTime = Date.now();

    // Clean and validate URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch {
      return {
        source: 'AgentReach-Web',
        platform: 'web',
        url: targetUrl,
        title: 'Invalid URL',
        content: `Error: The provided URL '${url}' is not a valid web address.`,
        retrievedAt: new Date().toISOString(),
        confidence: 0,
        errors: [`Invalid URL format: ${url}`],
      };
    }

    // Tier 1: Jina Reader API (high-quality clean markdown with metadata)
    try {
      const jinaUrl = `https://r.jina.ai/${targetUrl}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const resp = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const text = await resp.text();
        if (text && text.trim().length > 50) {
          const sanitized = ContentSanitizer.sanitize(text, options?.maxLength);
          
          // Extract title from markdown heading or first line
          let title = targetUrl;
          const titleMatch = text.match(/^Title:\s*(.+)$/m) || text.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }

          return {
            source: 'AgentReach:JinaReader',
            platform: 'web',
            url: targetUrl,
            title,
            content: sanitized.sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: sanitized.safeConfidence,
            metadata: {
              engine: 'jina_reader',
              latencyMs: Date.now() - startTime,
              warnings: sanitized.warnings,
            },
          };
        }
      } else {
        errors.push(`JinaReader HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      errors.push(`JinaReader error: ${err?.message || String(err)}`);
    }

    // Tier 2: Direct Fetch with DOM Text Extraction (Fallback)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const resp = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const html = await resp.text();
        const extracted = this.extractTextFromHtml(html);
        if (extracted.content.length > 50) {
          const sanitized = ContentSanitizer.sanitize(extracted.content, options?.maxLength);
          return {
            source: 'AgentReach:DirectHTML',
            platform: 'web',
            url: targetUrl,
            title: extracted.title || targetUrl,
            content: sanitized.sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.85,
            metadata: {
              engine: 'direct_html_parser',
              latencyMs: Date.now() - startTime,
              warnings: sanitized.warnings,
            },
            errors: errors.length ? errors : undefined,
          };
        }
      } else {
        errors.push(`DirectFetch HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      errors.push(`DirectFetch error: ${err?.message || String(err)}`);
    }

    // Tier 3: All online backends failed
    return {
      source: 'AgentReach-Web',
      platform: 'web',
      url: targetUrl,
      title: 'Webpage Retrieval Failed',
      content: `Failed to fetch web content from '${targetUrl}'. The page may be blocked, require authentication, or be unreachable.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0,
      errors,
    };
  }

  /**
   * Helper to extract readable clean text and title from HTML.
   */
  private extractTextFromHtml(html: string): { title: string; content: string } {
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Remove script, style, nav, footer, header tags
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

    // Replace line break and paragraph tags with newlines
    cleanHtml = cleanHtml
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n');

    // Strip all remaining HTML tags
    const textContent = cleanHtml.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    const decoded = textContent
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const normalized = decoded
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    return {
      title,
      content: normalized,
    };
  }
}

export const webChannel = new WebChannel();
