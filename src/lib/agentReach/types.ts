/**
 * Agent-Reach Capability Layer - Type Definitions
 * Inspired by Panniantong/Agent-Reach (MIT License)
 * 
 * Provides unified data structures, platform types, intent classifications,
 * result normalizations, and diagnostic contracts for internet access.
 */

export type AgentReachPlatform =
  | 'web'
  | 'youtube'
  | 'github'
  | 'reddit'
  | 'twitter'
  | 'rss'
  | 'bilibili'
  | 'v2ex'
  | 'search'
  | 'academic'
  | 'other';

export type AgentReachIntent =
  | 'DIRECT_URL'
  | 'WEB_SEARCH'
  | 'WEBPAGE_READING'
  | 'YOUTUBE'
  | 'GITHUB'
  | 'REDDIT'
  | 'TWITTER'
  | 'RSS'
  | 'BILIBILI'
  | 'V2EX'
  | 'OTHER_SUPPORTED_PLATFORM'
  | 'NO_WEB_REQUIRED';

export interface AgentReachResult {
  source: string;
  platform: AgentReachPlatform;
  url: string;
  title: string;
  content: string;
  author?: string;
  publishedAt?: string;
  metadata?: Record<string, any>;
  retrievedAt: string; // ISO 8601 string
  confidence: number;  // 0.0 to 1.0
  errors?: string[];
}

export interface IntentClassification {
  intent: AgentReachIntent;
  platform: AgentReachPlatform;
  targetUrl?: string;
  query?: string;
  params?: Record<string, any>;
  confidence: number;
  freshnessRequired: boolean;
  reasoning?: string;
}

export interface ChannelHealth {
  channel: string;
  status: 'healthy' | 'degraded' | 'unauthenticated' | 'offline';
  activeBackend: string;
  fallbackBackend: string;
  authenticationStatus: 'none_required' | 'configured' | 'missing_optional' | 'missing_required';
  lastError?: string;
  latencyMs: number;
  lastChecked: string;
}

export interface DoctorReport {
  timestamp: number;
  overallStatus: 'healthy' | 'degraded' | 'offline';
  channels: ChannelHealth[];
  environment: {
    hasGitHubToken: boolean;
    hasRedditCredentials: boolean;
    hasTwitterBearer: boolean;
    hasJinaKey: boolean;
    hasSearxngUrl: boolean;
  };
}

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
  transcriptAvailable: boolean;
  transcriptSnippets?: Array<{ text: string; start: number; duration: number }>;
}

export interface GitHubRepoDetails {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  forks: number;
  defaultBranch: string;
  readme?: string;
  latestRelease?: string;
  topFiles?: string[];
  recentCommits?: Array<{ sha: string; message: string; author: string; date: string }>;
}

export interface RedditDiscussion {
  subreddit: string;
  postId?: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  numComments: number;
  url: string;
  topComments: Array<{ author: string; body: string; score: number }>;
}

export interface TwitterTweetItem {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  createdAt: string;
  likes?: number;
  retweets?: number;
  isThread?: boolean;
  threadTweets?: string[];
}

export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate?: string;
  author?: string;
  summary: string;
  content?: string;
  categories?: string[];
}

export interface BilibiliVideoDetails {
  bvid: string;
  title: string;
  author: string;
  description: string;
  playCount?: number;
  commentCount?: number;
  publishTime?: string;
  danmakuCount?: number;
  subtitles?: string[];
}

export interface V2EXTopicDetails {
  id: number;
  title: string;
  content: string;
  author: string;
  nodeTitle: string;
  created: number;
  repliesCount: number;
  topReplies?: Array<{ author: string; content: string }>;
}
