/**
 * Public APIs Central Registry
 * Catalog of public APIs with credential mapping, fallback group assignment, and status evaluation.
 */

import { APIRegistryEntry, APIIntegrationStatus, RegistrySummary, CapabilityIntent } from './types';
import {
  getGeminiKeyInfo,
  getOpenAIKeyInfo,
  getMiniMaxKeyInfo,
  getBFLKeyInfo,
  getQwenKeyInfo,
  getCodeKeyInfo,
  getVoiceKeyInfo,
  getNvidiaChatKeyInfo,
  getParallelSearchKeyInfo,
} from '../../settings';

export class PublicAPIRegistry {
  private static instance: PublicAPIRegistry;
  private registry: Map<string, APIRegistryEntry> = new Map();

  private constructor() {
    this.registerCatalog();
  }

  public static getInstance(): PublicAPIRegistry {
    if (!PublicAPIRegistry.instance) {
      PublicAPIRegistry.instance = new PublicAPIRegistry();
    }
    return PublicAPIRegistry.instance;
  }

  /**
   * Helper to retrieve secret credential value internally without exposing it to client/logs.
   */
  public getCredentialValue(credentialVar?: string): string {
    if (!credentialVar) return '';

    switch (credentialVar) {
      case 'GEMINI_API_KEY':
        return getGeminiKeyInfo().key || '';
      case 'OPENAI_API_KEY':
        return getOpenAIKeyInfo().key || '';
      case 'MINIMAX_API_KEY':
        return getMiniMaxKeyInfo().key || '';
      case 'BFL_API_KEY':
        return getBFLKeyInfo().key || '';
      case 'QWEN_API_KEY':
        return getQwenKeyInfo().key || '';
      case 'CODE_API_KEY':
        return getCodeKeyInfo().key || '';
      case 'VOICE_API_KEY':
        return getVoiceKeyInfo().key || '';
      case 'NVIDIA_CHAT_API_KEY':
        return getNvidiaChatKeyInfo().key || '';
      case 'PARALLEL_SEARCH_API_KEY':
        return getParallelSearchKeyInfo().key || '';
      case 'GOOGLE_MAPS_PLATFORM_KEY':
        return (
          (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
          (import.meta as any).env?.GOOGLE_MAPS_PLATFORM_KEY ||
          (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.GOOGLE_MAPS_PLATFORM_KEY) ||
          ''
        );
      case 'GITHUB_TOKEN':
        return (
          (import.meta as any).env?.VITE_GITHUB_TOKEN ||
          (import.meta as any).env?.GITHUB_TOKEN ||
          (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.GITHUB_TOKEN) ||
          ''
        );
      case 'WEATHER_API_KEY':
        return (
          (import.meta as any).env?.VITE_WEATHER_API_KEY ||
          (import.meta as any).env?.WEATHER_API_KEY ||
          (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.WEATHER_API_KEY) ||
          ''
        );
      case 'NEWS_API_KEY':
        return (
          (import.meta as any).env?.VITE_NEWS_API_KEY ||
          (import.meta as any).env?.NEWS_API_KEY ||
          (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NEWS_API_KEY) ||
          ''
        );
      default: {
        const envVal =
          (import.meta as any).env?.[credentialVar] ||
          (import.meta as any).env?.[`VITE_${credentialVar}`] ||
          (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.[credentialVar]) ||
          '';
        return envVal;
      }
    }
  }

  /**
   * Check if an API entry has valid credential configured.
   */
  private evaluateStatus(entry: Partial<APIRegistryEntry>): { status: APIIntegrationStatus; reason?: string } {
    if (entry.authType === 'none') {
      return { status: 'ENABLED' };
    }
    if (entry.authType === 'oauth2') {
      return { status: 'OAUTH_REQUIRED', reason: 'Requires explicit user OAuth login consent flow.' };
    }

    const val = this.getCredentialValue(entry.credentialVariable);
    if (val && val.trim().length > 0) {
      return { status: 'ENABLED' };
    }

    return {
      status: 'MISSING_CREDENTIAL',
      reason: `Credential variable ${entry.credentialVariable || 'UNKNOWN'} is not set in environment or settings.`,
    };
  }

  /**
   * Register Public APIs catalog entries based on public-apis repository definitions.
   */
  private registerCatalog(): void {
    const rawCatalog: Array<Omit<APIRegistryEntry, 'status' | 'statusReason'>> = [
      // 1. Weather APIs
      {
        id: 'open-meteo-weather',
        name: 'Open-Meteo Weather API',
        category: 'Weather',
        description: 'Free open-source weather API providing hourly and 7-day forecast data globally.',
        documentationUrl: 'https://open-meteo.com/en/docs',
        baseUrl: 'https://api.open-meteo.com/v1',
        endpoint: '/forecast',
        authType: 'none',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '10,000 requests/day free',
        isFree: true,
        capabilities: ['weather'],
        fallbackGroup: 'weather',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 500, backoffFactor: 2 },
      },
      {
        id: 'openweathermap-api',
        name: 'OpenWeatherMap API',
        category: 'Weather',
        description: 'Current weather, forecasts, historical data, and weather alerts.',
        documentationUrl: 'https://openweathermap.org/api',
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        endpoint: '/weather',
        authType: 'apiKey_query',
        credentialVariable: 'WEATHER_API_KEY',
        authParamName: 'appid',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '60 calls/min free',
        isFree: true,
        capabilities: ['weather'],
        fallbackGroup: 'weather',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 500, backoffFactor: 2 },
      },

      // 2. News & Search APIs
      {
        id: 'parallel-search-api',
        name: 'Parallel Search Engine API',
        category: 'Web Search',
        description: 'Fast high-precision AI web search and news indexing provider.',
        documentationUrl: 'https://parallel.ai/docs',
        baseUrl: 'https://api.parallel.ai/v1',
        endpoint: '/search',
        authType: 'bearer',
        credentialVariable: 'PARALLEL_SEARCH_API_KEY',
        authHeaderName: 'Authorization',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '100 requests/min',
        isFree: false,
        capabilities: ['web_search', 'news'],
        fallbackGroup: 'news',
        timeoutMs: 10000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 1000, backoffFactor: 2 },
      },
      {
        id: 'news-api-org',
        name: 'NewsAPI.org',
        category: 'News',
        description: 'Search world news and top headlines from over 80,000 news sources.',
        documentationUrl: 'https://newsapi.org/docs',
        baseUrl: 'https://newsapi.org/v2',
        endpoint: '/top-headlines',
        authType: 'apiKey_header',
        credentialVariable: 'NEWS_API_KEY',
        authHeaderName: 'X-Api-Key',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '100 requests/day free',
        isFree: true,
        capabilities: ['news'],
        fallbackGroup: 'news',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 500, backoffFactor: 2 },
      },

      // 3. Development / GitHub APIs
      {
        id: 'github-rest-api',
        name: 'GitHub REST API',
        category: 'Development',
        description: 'Search repositories, code, users, issues, and commit histories.',
        documentationUrl: 'https://docs.github.com/en/rest',
        baseUrl: 'https://api.github.com',
        endpoint: '/search/repositories',
        authType: 'bearer',
        credentialVariable: 'GITHUB_TOKEN',
        authHeaderName: 'Authorization',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '60 requests/hr unauthenticated, 5000/hr authenticated',
        isFree: true,
        capabilities: ['github_search'],
        fallbackGroup: 'github_search',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 500, backoffFactor: 2 },
      },

      // 4. Maps & Location APIs
      {
        id: 'openstreetmap-nominatim',
        name: 'OpenStreetMap Nominatim Geocoding',
        category: 'Maps & Geocoding',
        description: 'Reverse geocoding and location lookup via OpenStreetMap.',
        documentationUrl: 'https://nominatim.org/release-docs/latest/api/Overview/',
        baseUrl: 'https://nominatim.openstreetmap.org',
        endpoint: '/search',
        authType: 'none',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '1 request/second',
        isFree: true,
        capabilities: ['map_location'],
        fallbackGroup: 'map_location',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 1000, backoffFactor: 2 },
      },
      {
        id: 'google-maps-platform',
        name: 'Google Maps Geocoding & Places API',
        category: 'Maps & Geocoding',
        description: 'High precision maps, place details, geocoding, and routing.',
        documentationUrl: 'https://developers.google.com/maps/documentation',
        baseUrl: 'https://maps.googleapis.com/maps/api',
        endpoint: '/geocode/json',
        authType: 'apiKey_query',
        credentialVariable: 'GOOGLE_MAPS_PLATFORM_KEY',
        authParamName: 'key',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: 'Pay as you go with free monthly credit tier',
        isFree: true,
        capabilities: ['map_location'],
        fallbackGroup: 'map_location',
        timeoutMs: 8000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 500, backoffFactor: 2 },
      },

      // 5. Image Generation APIs
      {
        id: 'black-forest-labs-flux',
        name: 'Black Forest Labs (BFL FLUX) API',
        category: 'Image Generation',
        description: 'State-of-the-art text-to-image FLUX generation models.',
        documentationUrl: 'https://docs.bfl.ml',
        baseUrl: 'https://api.bfl.ml/v1',
        endpoint: '/flux-pro-1.1',
        authType: 'apiKey_header',
        credentialVariable: 'BFL_API_KEY',
        authHeaderName: 'X-Key',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: 'Pay per generation tier',
        isFree: false,
        capabilities: ['generate_image'],
        fallbackGroup: 'generate_image',
        timeoutMs: 20000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 2000, backoffFactor: 2 },
      },
      {
        id: 'openai-dall-e-3',
        name: 'OpenAI DALL-E 3 API',
        category: 'Image Generation',
        description: 'Advanced prompt comprehension image generation.',
        documentationUrl: 'https://platform.openai.com/docs/guides/images',
        baseUrl: 'https://api.openai.com/v1',
        endpoint: '/images/generations',
        authType: 'bearer',
        credentialVariable: 'OPENAI_API_KEY',
        authHeaderName: 'Authorization',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: 'Depends on usage tier',
        isFree: false,
        capabilities: ['generate_image'],
        fallbackGroup: 'generate_image',
        timeoutMs: 20000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 1500, backoffFactor: 2 },
      },

      // 6. AI Models & Reasoning APIs
      {
        id: 'google-gemini-api',
        name: 'Google Gemini 2.5/3.0 API',
        category: 'AI Models & Reasoning',
        description: 'Multimodal AI generation, reasoning, and search grounding.',
        documentationUrl: 'https://ai.google.dev/docs',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        endpoint: '/models/gemini-2.5-flash:generateContent',
        authType: 'apiKey_query',
        credentialVariable: 'GEMINI_API_KEY',
        authParamName: 'key',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: '15 RPM free tier',
        isFree: true,
        capabilities: ['llm_reasoning'],
        fallbackGroup: 'llm_reasoning',
        timeoutMs: 15000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 1000, backoffFactor: 2 },
      },
      {
        id: 'qwen-dashscope-api',
        name: 'Alibaba Qwen DashScope API',
        category: 'AI Models & Reasoning',
        description: 'High performance language and vision models.',
        documentationUrl: 'https://help.aliyun.com/dashscope',
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
        endpoint: '/services/aigc/text-generation/generation',
        authType: 'bearer',
        credentialVariable: 'QWEN_API_KEY',
        authHeaderName: 'Authorization',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: 'Free trial quota available',
        isFree: true,
        capabilities: ['llm_reasoning'],
        fallbackGroup: 'llm_reasoning',
        timeoutMs: 15000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 1000, backoffFactor: 2 },
      },

      // 7. Science & Knowledge APIs
      {
        id: 'free-dictionary-api',
        name: 'Free Dictionary API',
        category: 'Science & Knowledge',
        description: 'Word definitions, phonetics, audio pronunciations, and etymologies.',
        documentationUrl: 'https://dictionaryapi.dev/',
        baseUrl: 'https://api.dictionaryapi.dev/api/v2/entries/en',
        endpoint: '',
        authType: 'none',
        httpsSupport: true,
        corsSupport: true,
        rateLimitInfo: 'Unlimited free usage',
        isFree: true,
        capabilities: ['dictionary_lookup'],
        fallbackGroup: 'dictionary_lookup',
        timeoutMs: 5000,
        retryPolicy: { maxRetries: 2, initialBackoffMs: 300, backoffFactor: 2 },
      },
    ];

    rawCatalog.forEach(item => {
      const { status, reason } = this.evaluateStatus(item);
      const fullEntry: APIRegistryEntry = {
        ...item,
        status,
        statusReason: reason,
      };
      this.registry.set(fullEntry.id, fullEntry);
    });
  }

  /**
   * Get an API entry by ID.
   */
  public getAPI(id: string): APIRegistryEntry | undefined {
    return this.registry.get(id);
  }

  /**
   * Get all registered APIs.
   */
  public getAllAPIs(): APIRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get enabled APIs for a target capability/fallback group.
   */
  public getAPIsForFallbackGroup(group: CapabilityIntent): APIRegistryEntry[] {
    return Array.from(this.registry.values()).filter(
      item => item.fallbackGroup === group && item.status === 'ENABLED'
    );
  }

  /**
   * Refresh credential statuses across registry.
   */
  public refreshRegistryStatuses(): void {
    this.registry.forEach((entry, id) => {
      const { status, reason } = this.evaluateStatus(entry);
      this.registry.set(id, {
        ...entry,
        status,
        statusReason: reason,
      });
    });
  }

  /**
   * Return a summary report of the registry without leaking secret credential values.
   */
  public getRegistrySummary(): RegistrySummary {
    this.refreshRegistryStatuses();
    const all = this.getAllAPIs();

    const enabledList = all.filter(a => a.status === 'ENABLED');
    const missingCreds = all.filter(a => a.status === 'MISSING_CREDENTIAL');
    const oauthReq = all.filter(a => a.status === 'OAUTH_REQUIRED');

    const byCategory: Record<string, number> = {};
    all.forEach(a => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    });

    return {
      totalRegistered: all.length,
      enabledCount: enabledList.length,
      missingCredentialCount: missingCreds.length,
      oauthRequiredCount: oauthReq.length,
      byCategory,
      enabledAPIs: enabledList.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        fallbackGroup: e.fallbackGroup,
        status: e.status,
        credentialVariable: e.credentialVariable,
      })),
    };
  }
}

export const publicAPIRegistry = PublicAPIRegistry.getInstance();
