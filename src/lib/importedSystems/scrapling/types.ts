/**
 * Scrapling Recursive Web Crawler & Parser Engine
 * Reference: https://github.com/D4Vinci/Scrapling (BSD 3-Clause)
 * 
 * Defines schemas for recursive crawling, page content extraction, link discovery,
 * crawl control, robots compliance, rate limiting, and structured knowledge indexing.
 */

export interface CrawlConfig {
  startUrl: string;
  maxDepth?: number;          // Default: 2
  maxPages?: number;          // Default: 10
  allowedDomains?: string[];  // Empty = only startUrl hostname
  urlFilters?: {
    includePatterns?: string[];
    excludePatterns?: string[];
  };
  rateLimitMs?: number;       // Default: 500ms delay between requests
  timeoutMs?: number;         // Default: 10000ms
  maxRetries?: number;        // Default: 2
  respectRobots?: boolean;    // Default: true
  extractMedia?: boolean;     // Default: false
  customHeaders?: Record<string, string>;
}

export interface CrawledPage {
  url: string;
  canonicalUrl?: string;
  title: string;
  description?: string;
  text: string;
  htmlExcerpt?: string;
  markdown?: string;
  depth: number;
  internalLinks: string[];
  externalLinks: string[];
  headings: Array<{ level: number; text: string }>;
  wordCount: number;
  fetchedAt: string;
  status: number;
  error?: string;
}

export interface CrawlProgress {
  crawledCount: number;
  queuedCount: number;
  currentUrl: string;
  currentDepth: number;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'aborted';
  error?: string;
}

export interface CrawlResult {
  startUrl: string;
  rootDomain: string;
  totalPagesCrawled: number;
  pages: CrawledPage[];
  totalWords: number;
  executionTimeMs: number;
  summary: string;
  discoveredUrls: string[];
  status: 'completed' | 'aborted' | 'limit_reached' | 'failed';
}

export interface ScrapedContentQuery {
  siteUrl: string;
  query: string;
  limit?: number;
}
