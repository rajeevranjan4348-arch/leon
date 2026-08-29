/**
 * Types and interfaces for the Jina AI Reader + Web Search system.
 * Based on https://github.com/jina-ai/reader
 */

export type JinaSourceType =
  | 'official_doc'
  | 'government'
  | 'academic'
  | 'company'
  | 'reputable_news'
  | 'technical'
  | 'community'
  | 'general_web';

export interface JinaSearchResultItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  content?: string;
  publishedDate?: string;
  retrievedAt: number;
  sourceType: JinaSourceType;
  relevanceScore: number;
  isRead?: boolean;
}

export interface JinaPageContent {
  url: string;
  title: string;
  domain: string;
  content: string;
  markdown: string;
  description?: string;
  publishedTime?: string;
  headings?: string[];
  cleanTextLength: number;
  retrievedAt: number;
  isSuccess: boolean;
  error?: string;
}

export interface JinaSearchOptions {
  query: string;
  maxResults?: number;
  freshnessRequired?: boolean;
  signal?: AbortSignal;
}

export interface JinaReaderOptions {
  url: string;
  returnFormat?: 'markdown' | 'text';
  targetSelector?: string;
  waitForSelector?: string;
  timeoutMs?: number;
  noCache?: boolean;
  signal?: AbortSignal;
}

export interface WebSearchRouterDecision {
  mode: 'none' | 'read_url' | 'single_search' | 'deep_research';
  reason: string;
  detectedUrls?: string[];
  optimizedQueries?: string[];
  isLiveRequired: boolean;
  targetTopic?: string;
}

export interface JinaResearchProgress {
  stage: 'analyzing' | 'searching' | 'reading_sources' | 'cross_checking' | 'synthesizing' | 'completed' | 'failed';
  message: string;
  subMessage?: string;
  queries?: string[];
  sourcesCount?: number;
  sources?: JinaSearchResultItem[];
  progressPercent?: number;
}

export interface JinaResearchResult {
  query: string;
  answer: string;
  sources: JinaSearchResultItem[];
  citations: string[];
  durationMs: number;
  isSuccessful: boolean;
  routerDecision: WebSearchRouterDecision;
  error?: string;
}
