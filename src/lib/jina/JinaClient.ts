import { getJinaKeyInfo } from '../settings';
import {
  JinaPageContent,
  JinaReaderOptions,
  JinaSearchOptions,
  JinaSearchResultItem
} from './types';
import { WebContentProcessor } from './WebContentProcessor';
import { JinaCache } from './JinaCache';

/**
 * JinaClient: Handles real-time web reading (r.jina.ai) and web search (s.jina.ai).
 * Official reference: https://github.com/jina-ai/reader
 */
export class JinaClient {
  private static readonly READER_BASE = 'https://r.jina.ai/';
  private static readonly SEARCH_BASE = 'https://s.jina.ai/';

  /**
   * Search the live web using Jina Search (s.jina.ai)
   */
  public static async searchWeb(options: JinaSearchOptions): Promise<JinaSearchResultItem[]> {
    const cleanQuery = options.query?.trim();
    if (!cleanQuery) return [];

    // Check cache
    const cached = JinaCache.getSearch(cleanQuery, options.freshnessRequired);
    if (cached) return cached;

    const keyInfo = getJinaKeyInfo();
    const apiKey = keyInfo.key;

    const searchUrl = `${this.SEARCH_BASE}${encodeURIComponent(cleanQuery)}`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Return-Format': 'markdown',
      'X-Timeout': '12',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (options.freshnessRequired) {
      headers['X-No-Cache'] = 'true';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let items: JinaSearchResultItem[] = [];

        if (contentType.includes('application/json')) {
          const json = await response.json();
          const rawItems = Array.isArray(json.data) ? json.data : Array.isArray(json.results) ? json.results : [];

          items = rawItems.map((item: any, idx: number) => {
            const url = item.url || item.link || '';
            const title = item.title || item.name || `Source ${idx + 1}`;
            const domain = WebContentProcessor.extractDomain(url);
            const sourceType = WebContentProcessor.classifySourceType(url, title);
            const content = item.content || item.markdown || item.description || '';
            const snippet = item.description || WebContentProcessor.createSnippet(content);
            const relevanceScore = WebContentProcessor.calculateRelevanceScore(sourceType, title, content, cleanQuery);

            return {
              id: `jina_src_${Date.now()}_${idx}`,
              title,
              url,
              domain,
              snippet,
              content: content.slice(0, 4000),
              publishedDate: item.publishedTime || item.date,
              retrievedAt: Date.now(),
              sourceType,
              relevanceScore,
              isRead: Boolean(content && content.length > 200),
            };
          });
        } else {
          // Fallback: Parse markdown text response if JSON not returned
          const markdownText = await response.text();
          items = this.parseMarkdownSearchResults(markdownText, cleanQuery);
        }

        // Limit results
        const max = options.maxResults || 8;
        const finalResults = items.slice(0, max);

        // Cache results
        if (finalResults.length > 0) {
          JinaCache.setSearch(cleanQuery, finalResults);
        }

        return finalResults;
      }
    } catch (err) {
      console.warn('Jina web search error, falling back:', err);
    }

    return [];
  }

  /**
   * Read and extract clean markdown content from any live webpage or document via r.jina.ai
   */
  public static async readWebpage(options: JinaReaderOptions): Promise<JinaPageContent> {
    const targetUrl = options.url?.trim();
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return {
        url: targetUrl || '',
        title: 'Invalid URL',
        domain: '',
        content: '',
        markdown: '',
        cleanTextLength: 0,
        retrievedAt: Date.now(),
        isSuccess: false,
        error: 'Invalid or missing HTTP/HTTPS URL',
      };
    }

    // Check cache
    const cached = JinaCache.getPage(targetUrl, options.noCache);
    if (cached) return cached;

    const keyInfo = getJinaKeyInfo();
    const apiKey = keyInfo.key;

    const readerUrl = `${this.READER_BASE}${targetUrl}`;
    const headers: Record<string, string> = {
      'Accept': 'text/plain, text/markdown',
      'X-Return-Format': options.returnFormat || 'markdown',
      'X-Timeout': `${Math.round((options.timeoutMs || 10000) / 1000)}`,
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    if (options.targetSelector) {
      headers['X-Target-Selector'] = options.targetSelector;
    }

    if (options.waitForSelector) {
      headers['X-Wait-For-Selector'] = options.waitForSelector;
    }

    if (options.noCache) {
      headers['X-No-Cache'] = 'true';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 10000);

      const response = await fetch(readerUrl, {
        method: 'GET',
        headers,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const rawMarkdown = await response.text();
        const processed = WebContentProcessor.processMarkdown(rawMarkdown, targetUrl);
        const domain = WebContentProcessor.extractDomain(targetUrl);

        const pageResult: JinaPageContent = {
          url: targetUrl,
          title: processed.title,
          domain,
          content: processed.content,
          markdown: rawMarkdown,
          description: processed.description,
          publishedTime: processed.publishedTime,
          headings: processed.headings,
          cleanTextLength: processed.content.length,
          retrievedAt: Date.now(),
          isSuccess: true,
        };

        JinaCache.setPage(targetUrl, pageResult);
        return pageResult;
      }
    } catch (err: any) {
      console.warn(`Jina Reader error for URL ${targetUrl}:`, err);
    }

    // Direct fallback if Jina Reader is unreachable or throttled
    return this.fallbackDirectFetch(targetUrl);
  }

  /**
   * Parses markdown formatted search outputs from s.jina.ai when returned as plain text.
   */
  private static parseMarkdownSearchResults(markdown: string, query: string): JinaSearchResultItem[] {
    const results: JinaSearchResultItem[] = [];
    if (!markdown) return results;

    // Pattern matching [Title](URL) or ### [Title](URL)
    const itemBlocks = markdown.split(/\n(?=#{1,3}\s+\[|\[)/g);

    itemBlocks.forEach((block, idx) => {
      const linkMatch = block.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      if (linkMatch) {
        const title = linkMatch[1].trim();
        const url = linkMatch[2].trim();
        const domain = WebContentProcessor.extractDomain(url);
        const sourceType = WebContentProcessor.classifySourceType(url, title);
        const cleanContent = block.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
        const snippet = WebContentProcessor.createSnippet(cleanContent);
        const relevanceScore = WebContentProcessor.calculateRelevanceScore(sourceType, title, cleanContent, query);

        results.push({
          id: `jina_md_${Date.now()}_${idx}`,
          title,
          url,
          domain,
          snippet,
          content: cleanContent.slice(0, 3000),
          retrievedAt: Date.now(),
          sourceType,
          relevanceScore,
          isRead: cleanContent.length > 200,
        });
      }
    });

    return results;
  }

  /**
   * Lightweight direct fetch fallback if proxy is restricted
   */
  private static async fallbackDirectFetch(url: string): Promise<JinaPageContent> {
    const domain = WebContentProcessor.extractDomain(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        headers: { 'Accept': 'text/html,text/plain' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const text = await response.text();
        const processed = WebContentProcessor.processMarkdown(text, url);
        return {
          url,
          title: processed.title || domain,
          domain,
          content: processed.content,
          markdown: processed.content,
          headings: processed.headings,
          cleanTextLength: processed.content.length,
          retrievedAt: Date.now(),
          isSuccess: true,
        };
      }
    } catch {}

    return {
      url,
      title: domain,
      domain,
      content: '',
      markdown: '',
      cleanTextLength: 0,
      retrievedAt: Date.now(),
      isSuccess: false,
      error: 'Direct webpage fetch failed (CORS or network restriction)',
    };
  }
}
