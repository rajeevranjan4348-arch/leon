import { CrawlConfig, CrawledPage, CrawlProgress, CrawlResult, ScrapedContentQuery } from './types';
import { ScraplingExtractor } from './ScraplingExtractor';

interface QueueItem {
  url: string;
  depth: number;
}

/**
 * ScraplingCrawlerEngine
 * Recursive multi-page web crawler with link discovery, depth control,
 * duplicate filtering, rate limiting, and structured knowledge indexing.
 */
export class ScraplingCrawlerEngine {
  private static instance: ScraplingCrawlerEngine;
  private siteKnowledgeBase = new Map<string, CrawledPage[]>(); // domain -> pages
  private activeCrawls = new Map<string, AbortController>();

  private constructor() {}

  public static getInstance(): ScraplingCrawlerEngine {
    if (!ScraplingCrawlerEngine.instance) {
      ScraplingCrawlerEngine.instance = new ScraplingCrawlerEngine();
    }
    return ScraplingCrawlerEngine.instance;
  }

  /**
   * SSRF Protection & URL safety validator
   */
  private isSafeUrl(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '169.254.169.254' ||
        host.endsWith('.local') ||
        host.endsWith('.internal')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if URL matches domain and pattern rules.
   */
  private isUrlAllowed(candidateUrl: string, rootDomain: string, config: CrawlConfig): boolean {
    try {
      const candidateHost = new URL(candidateUrl).hostname.toLowerCase();
      const allowedDomains = config.allowedDomains && config.allowedDomains.length > 0
        ? config.allowedDomains.map(d => d.toLowerCase())
        : [rootDomain];

      const matchesDomain = allowedDomains.some(
        d => candidateHost === d || candidateHost.endsWith(`.${d}`)
      );
      if (!matchesDomain) return false;

      // Include/Exclude patterns
      if (config.urlFilters?.excludePatterns) {
        for (const pattern of config.urlFilters.excludePatterns) {
          if (new RegExp(pattern, 'i').test(candidateUrl)) return false;
        }
      }

      if (config.urlFilters?.includePatterns && config.urlFilters.includePatterns.length > 0) {
        const matchesInclude = config.urlFilters.includePatterns.some(pat =>
          new RegExp(pat, 'i').test(candidateUrl)
        );
        if (!matchesInclude) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches single page HTML with retry and timeout.
   */
  private async fetchPage(
    url: string,
    timeoutMs: number,
    retries: number,
    signal?: AbortSignal,
    customHeaders?: Record<string, string>
  ): Promise<{ html: string; status: number }> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= retries) {
      if (signal?.aborted) {
        throw new Error('Crawl aborted by user');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // Merge signals
      const onParentAbort = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', onParentAbort);
      }

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScraplingBot/1.0; +https://github.com/D4Vinci/Scrapling)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ...(customHeaders || {}),
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return { html, status: response.status };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onParentAbort);

        lastError = err;
        attempts++;
        if (attempts <= retries && !signal?.aborted) {
          await new Promise(r => setTimeout(r, 800 * attempts));
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url}`);
  }

  /**
   * Execute recursive crawling job on a target website.
   */
  public async crawl(
    config: CrawlConfig,
    onProgress?: (progress: CrawlProgress) => void
  ): Promise<CrawlResult> {
    const startTime = Date.now();
    const maxDepth = config.maxDepth ?? 2;
    const maxPages = config.maxPages ?? 10;
    const rateLimitMs = config.rateLimitMs ?? 400;
    const timeoutMs = config.timeoutMs ?? 10000;
    const maxRetries = config.maxRetries ?? 2;

    if (!this.isSafeUrl(config.startUrl)) {
      throw new Error(`Scrapling SSRF Guard: Target URL ${config.startUrl} is invalid or restricted.`);
    }

    const startUrlParsed = new URL(config.startUrl);
    const rootDomain = startUrlParsed.hostname.toLowerCase();

    // Abort controller for cancellation
    const crawlId = `${rootDomain}-${Date.now()}`;
    const abortController = new AbortController();
    this.activeCrawls.set(crawlId, abortController);

    const visitedUrls = new Set<string>();
    const queue: QueueItem[] = [{ url: config.startUrl, depth: 0 }];
    const crawledPages: CrawledPage[] = [];
    const discoveredUrls = new Set<string>([config.startUrl]);

    let totalWords = 0;
    let status: 'completed' | 'aborted' | 'limit_reached' | 'failed' = 'completed';

    try {
      while (queue.length > 0 && crawledPages.length < maxPages) {
        if (abortController.signal.aborted) {
          status = 'aborted';
          break;
        }

        const currentItem = queue.shift()!;
        const currentUrl = currentItem.url;
        const currentDepth = currentItem.depth;

        // Skip if already visited
        if (visitedUrls.has(currentUrl)) {
          continue;
        }
        visitedUrls.add(currentUrl);

        onProgress?.({
          crawledCount: crawledPages.length,
          queuedCount: queue.length,
          currentUrl,
          currentDepth,
          status: 'running',
        });

        try {
          // Fetch page
          const { html, status: httpStatus } = await this.fetchPage(
            currentUrl,
            timeoutMs,
            maxRetries,
            abortController.signal,
            config.customHeaders
          );

          // Parse page content and links
          const page = ScraplingExtractor.parseHtml(html, currentUrl, currentDepth, httpStatus);
          crawledPages.push(page);
          totalWords += page.wordCount;

          // Discover and enqueue internal links if not at maxDepth
          if (currentDepth < maxDepth) {
            for (const link of page.internalLinks) {
              discoveredUrls.add(link);
              if (!visitedUrls.has(link) && this.isUrlAllowed(link, rootDomain, config)) {
                // Ensure not already queued
                if (!queue.some(q => q.url === link)) {
                  queue.push({ url: link, depth: currentDepth + 1 });
                }
              }
            }
          }

          // Rate limit delay between page fetches
          if (queue.length > 0 && rateLimitMs > 0) {
            await new Promise(r => setTimeout(r, rateLimitMs));
          }
        } catch (pageErr: any) {
          // Log page error without failing the whole crawl
          crawledPages.push({
            url: currentUrl,
            title: `Error: ${currentUrl}`,
            text: '',
            depth: currentDepth,
            internalLinks: [],
            externalLinks: [],
            headings: [],
            wordCount: 0,
            fetchedAt: new Date().toISOString(),
            status: 0,
            error: pageErr?.message || 'Fetch failed',
          });
        }
      }

      if (crawledPages.length >= maxPages && queue.length > 0) {
        status = 'limit_reached';
      }
    } catch (crawlErr: any) {
      if (abortController.signal.aborted) {
        status = 'aborted';
      } else {
        status = 'failed';
      }
    } finally {
      this.activeCrawls.delete(crawlId);
    }

    // Index into site knowledge base
    this.siteKnowledgeBase.set(rootDomain, crawledPages);

    const summary = `Crawled ${crawledPages.length} page(s) on ${rootDomain} across ${discoveredUrls.size} discovered links (${totalWords} words extracted).`;

    onProgress?.({
      crawledCount: crawledPages.length,
      queuedCount: 0,
      currentUrl: config.startUrl,
      currentDepth: maxDepth,
      status: status === 'failed' ? 'failed' : 'completed',
    });

    return {
      startUrl: config.startUrl,
      rootDomain,
      totalPagesCrawled: crawledPages.length,
      pages: crawledPages,
      totalWords,
      executionTimeMs: Date.now() - startTime,
      summary,
      discoveredUrls: Array.from(discoveredUrls),
      status,
    };
  }

  /**
   * Search within the indexed site knowledge base.
   */
  public querySiteKnowledge(params: ScrapedContentQuery): CrawledPage[] {
    const domain = new URL(params.siteUrl).hostname.toLowerCase();
    const pages = this.siteKnowledgeBase.get(domain) || [];
    const queryLower = params.query.toLowerCase().trim();
    const limit = params.limit || 5;

    return pages
      .map(page => {
        let score = 0;
        if (page.title.toLowerCase().includes(queryLower)) score += 40;
        if (page.text.toLowerCase().includes(queryLower)) score += 25;
        if (page.headings.some(h => h.text.toLowerCase().includes(queryLower))) score += 30;
        return { page, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.page);
  }

  /**
   * Abort an active crawl.
   */
  public cancelAllActiveCrawls(): void {
    this.activeCrawls.forEach(controller => controller.abort());
    this.activeCrawls.clear();
  }
}

export const scraplingCrawlerEngine = ScraplingCrawlerEngine.getInstance();
