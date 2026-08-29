/**
 * Awesome Resources Catalog Architecture
 * Reference: https://github.com/sindresorhus/awesome (CC0 1.0 Universal)
 * 
 * Defines structured schemas for curated developer resources, lists, libraries, and frameworks.
 */

export type AwesomeCategory =
  | 'platforms'
  | 'programming-languages'
  | 'front-end-development'
  | 'back-end-development'
  | 'ai-machine-learning'
  | 'databases'
  | 'devops-cloud'
  | 'security'
  | 'mobile'
  | 'design-ui'
  | 'computer-science'
  | 'testing-qa'
  | 'tools-productivity';

export interface AwesomeResourceItem {
  id: string;
  name: string;
  category: AwesomeCategory;
  subcategory?: string;
  description: string;
  url: string;
  githubRepo?: string;
  stars?: number;
  tags: string[];
  license?: string;
  language?: string;
  isCurated: boolean;
}

export interface AwesomeTopicList {
  id: string;
  title: string;
  category: AwesomeCategory;
  description: string;
  url: string;
  githubRepo: string;
  resourcesCount: number;
  items: AwesomeResourceItem[];
}

export interface AwesomeSearchQuery {
  keyword?: string;
  category?: AwesomeCategory;
  tags?: string[];
  language?: string;
  limit?: number;
}

export interface AwesomeSearchResult {
  query: string;
  totalMatches: number;
  resources: AwesomeResourceItem[];
  matchedTopics: string[];
  suggestedTags: string[];
}
