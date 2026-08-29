export type FreshnessLevel = 'breaking' | 'today' | 'this_week' | 'recent' | 'historical' | 'stable';

export type SearchIntentCategory = 
  | 'informational'
  | 'news'
  | 'product_research'
  | 'technical_docs'
  | 'troubleshooting'
  | 'local'
  | 'current_events'
  | 'academic_research'
  | 'official_government'
  | 'role_or_office'
  | 'live_price_or_market'
  | 'weather'
  | 'sports_or_events'
  | 'product_or_version'
  | 'general_fact'
  | 'deep_research'
  | 'casual_or_stable';

export interface FreshnessDetectionResult {
  needsSearch: boolean;
  freshnessLevel: FreshnessLevel;
  category: SearchIntentCategory;
  isNewsQuery: boolean;
  isRoleQuery: boolean;
  isOfficialRequested: boolean;
  reason: string;
  suggestedQueries: string[];
  targetDomain?: string;
}

export type SourceTier = 
  | 'official_government'
  | 'official_company'
  | 'official_docs'
  | 'academic'
  | 'reputable_news'
  | 'tech_publication'
  | 'general'
  | 'low_quality';

export type ReadStatus = 'read_success' | 'snippet_only' | 'unverified' | 'failed';

export interface VerifiedSourceItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  contentSummary?: string;
  publishedTime?: string;
  publishedDate?: string;
  authoritativeScore: number; // 0 to 100
  sourceTier: SourceTier;
  isOfficial: boolean;
  isRead?: boolean;
  readStatus?: ReadStatus;
  type?: 'web' | 'news' | 'maps';
}

export interface NewsArticleItem {
  id: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedTime: string;
  summary: string;
  category?: string;
  imageUrl?: string;
}

export type SearchProgressStage = 
  | 'idle'
  | 'detecting_intent'
  | 'generating_queries'
  | 'searching_web'
  | 'retrieving_sources'
  | 'reading_webpages'
  | 'verifying_sources'
  | 'synthesizing_answer'
  | 'done'
  | 'error';

export interface SearchProgressEvent {
  stage: SearchProgressStage;
  message: string;
  subMessage?: string;
  queries?: string[];
  sourcesFound?: number;
  isDeepSearch?: boolean;
}

export interface SearchExecutionResult {
  text: string;
  sources: VerifiedSourceItem[];
  newsArticles?: NewsArticleItem[];
  freshness: FreshnessDetectionResult;
  isLiveSearchExecuted: boolean;
  searchDurationMs: number;
  errorNotice?: string;
}
