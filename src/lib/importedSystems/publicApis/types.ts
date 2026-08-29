/**
 * Public APIs Integration System Types
 */

export type AuthType = 'apiKey_header' | 'apiKey_query' | 'bearer' | 'none' | 'oauth2';

export type APICategory = 
  | 'Weather'
  | 'News'
  | 'Development'
  | 'Maps & Geocoding'
  | 'Image Generation'
  | 'Web Search'
  | 'AI Models & Reasoning'
  | 'Science & Knowledge'
  | 'Finance'
  | 'Utilities';

export type CapabilityIntent = 
  | 'weather'
  | 'news'
  | 'github_search'
  | 'map_location'
  | 'generate_image'
  | 'web_search'
  | 'llm_reasoning'
  | 'dictionary_lookup'
  | 'finance_stock';

export type APIIntegrationStatus = 'ENABLED' | 'MISSING_CREDENTIAL' | 'OAUTH_REQUIRED' | 'DISABLED_ERROR';

export interface RetryPolicy {
  maxRetries: number;
  initialBackoffMs: number;
  backoffFactor: number;
}

export interface APIRegistryEntry {
  id: string;
  name: string;
  category: APICategory;
  description: string;
  documentationUrl: string;
  baseUrl: string;
  endpoint: string;
  authType: AuthType;
  credentialVariable?: string; // e.g., 'WEATHER_API_KEY'
  authHeaderName?: string;     // e.g., 'X-Api-Key' or 'Authorization'
  authParamName?: string;      // e.g., 'api_key' or 'key'
  httpsSupport: boolean;
  corsSupport: boolean;
  rateLimitInfo?: string;
  isFree: boolean;
  capabilities: CapabilityIntent[];
  fallbackGroup: CapabilityIntent;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  status: APIIntegrationStatus;
  statusReason?: string;
}

export interface APIRouteRequest {
  intent?: CapabilityIntent;
  query: string;
  params?: Record<string, string>;
  body?: any;
  headers?: Record<string, string>;
  preferApiId?: string;
}

export interface APIRouteResponse<T = any> {
  success: boolean;
  data?: T;
  apiUsed: string;
  fallbackTriggered: boolean;
  fallbackChain: string[];
  executionTimeMs: number;
  error?: string;
  redactedError?: string;
}

export interface RegistrySummary {
  totalRegistered: number;
  enabledCount: number;
  missingCredentialCount: number;
  oauthRequiredCount: number;
  byCategory: Record<string, number>;
  enabledAPIs: Array<{
    id: string;
    name: string;
    category: string;
    fallbackGroup: string;
    status: APIIntegrationStatus;
    credentialVariable?: string;
  }>;
}
