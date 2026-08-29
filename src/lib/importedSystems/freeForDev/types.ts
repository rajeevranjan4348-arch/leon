/**
 * Free-For-Dev Catalog & Recommendation Architecture
 * Reference: https://github.com/ripienaar/free-for-dev (HTML5 / CC0 / Open)
 * 
 * Defines schemas for free developer tiers across cloud providers, databases,
 * storage, auth, CI/CD, and developer tooling.
 */

export type FreeDevCategory =
  | 'hosting-paas'
  | 'databases-backends'
  | 'storage-media'
  | 'cicd-automation'
  | 'auth-identity'
  | 'messaging-email-sms'
  | 'monitoring-analytics'
  | 'ai-machine-learning'
  | 'apis-data'
  | 'security-pki'
  | 'developer-tools';

export interface FreeDevServiceItem {
  id: string;
  name: string;
  category: FreeDevCategory;
  description: string;
  url: string;
  freeTierDetails: string;
  requiresCreditCard: boolean;
  limits: {
    bandwidthOrRequests?: string;
    storage?: string;
    usersOrSeats?: string;
    computeOrRuntime?: string;
  };
  tags: string[];
  recommendedFor: string[];
}

export interface FreeDevSearchQuery {
  category?: FreeDevCategory;
  keyword?: string;
  noCreditCardOnly?: boolean;
  tags?: string[];
  projectRequirement?: string;
}

export interface FreeDevRecommendation {
  service: FreeDevServiceItem;
  matchScore: number;
  reason: string;
  alternativeOptions: string[];
}
