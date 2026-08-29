/**
 * Smart API Router
 * Intent detection, failover routing, retry handling, secret redaction, and SSRF protection.
 */

import {
  APIRouteRequest,
  APIRouteResponse,
  CapabilityIntent,
  APIRegistryEntry
} from './types';
import { publicAPIRegistry } from './PublicAPIRegistry';

export class PublicAPIRouter {
  private static instance: PublicAPIRouter;

  private constructor() {}

  public static getInstance(): PublicAPIRouter {
    if (!PublicAPIRouter.instance) {
      PublicAPIRouter.instance = new PublicAPIRouter();
    }
    return PublicAPIRouter.instance;
  }

  /**
   * Intent detection classifier for routing requests to candidate API fallback groups.
   */
  public detectIntent(query: string): CapabilityIntent {
    const q = query.toLowerCase().trim();

    if (/\b(weather|temperature|forecast|rain|snow|climate|humidity|degrees|celsius|fahrenheit)\b/.test(q)) {
      return 'weather';
    }
    if (/\b(news|headline|headlines|breaking news|article|editorial|press)\b/.test(q)) {
      return 'news';
    }
    if (/\b(github|repo|repository|commit|issue|pull request|git search)\b/.test(q)) {
      return 'github_search';
    }
    if (/\b(map|location|geocode|address|gps|latitude|longitude|directions|where is)\b/.test(q)) {
      return 'map_location';
    }
    if (/\b(generate image|create image|draw|picture of|illustration|render image|artwork)\b/.test(q)) {
      return 'generate_image';
    }
    if (/\b(define|dictionary|meaning of|definition|pronunciation|etymology)\b/.test(q)) {
      return 'dictionary_lookup';
    }
    if (/\b(stock|share price|finance|market cap|nasdaq|crypto|ticker)\b/.test(q)) {
      return 'finance_stock';
    }
    if (/\b(search|find on web|google search|internet search|browse)\b/.test(q)) {
      return 'web_search';
    }

    return 'llm_reasoning';
  }

  /**
   * SSRF protection guard against local or metadata internal URLs.
   */
  private validateURL(urlStr: string): boolean {
    try {
      const parsed = new URL(urlStr);
      const host = parsed.hostname.toLowerCase();

      // Block local/internal hostnames
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

      // Ensure HTTPS/HTTP protocol
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
      return false;
    }
  }

  /**
   * Secret redaction helper to sanitize raw error messages or payloads.
   */
  public redactSecrets(text: string): string {
    if (!text) return '';
    let result = text;

    // Pattern matching common API keys
    const secretPatterns = [
      /sk-[a-zA-Z0-9_-]{20,}/g,
      /nvapi-[a-zA-Z0-9_-]{20,}/g,
      /bfl_[a-zA-Z0-9_-]{15,}/g,
      /AIzaSy[a-zA-Z0-9_-]{33}/g,
      /ghp_[a-zA-Z0-9]{36}/g,
      /bearer\s+[a-zA-Z0-9._-]{15,}/gi,
      /api_key=[a-zA-Z0-9._-]{10,}/gi,
      /appid=[a-zA-Z0-9._-]{10,}/gi,
      /key=[a-zA-Z0-9._-]{10,}/gi,
    ];

    secretPatterns.forEach(pat => {
      result = result.replace(pat, '[REDACTED_SECRET]');
    });

    return result;
  }

  /**
   * Execute single API call with retry and timeout policies.
   */
  private async executeSingleCall(
    api: APIRegistryEntry,
    req: APIRouteRequest
  ): Promise<any> {
    const credVal = publicAPIRegistry.getCredentialValue(api.credentialVariable);

    let fullUrl = api.baseUrl + (api.endpoint ? (api.endpoint.startsWith('/') ? api.endpoint : '/' + api.endpoint) : '');

    if (!this.validateURL(fullUrl)) {
      throw new Error(`SSRF Guard: Target URL ${fullUrl} is not permitted.`);
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Google-AI-Studio-Applet/1.0',
      'Content-Type': 'application/json',
      ...(req.headers || {}),
    };

    const urlParams = new URLSearchParams(req.params || {});

    // Configure Authentication Injection
    if (api.authType === 'bearer' && credVal) {
      headers['Authorization'] = `Bearer ${credVal}`;
    } else if (api.authType === 'apiKey_header' && credVal && api.authHeaderName) {
      headers[api.authHeaderName] = credVal;
    } else if (api.authType === 'apiKey_query' && credVal && api.authParamName) {
      urlParams.set(api.authParamName, credVal);
    }

    // Default query parameter mapping for specific public APIs
    if (api.id === 'open-meteo-weather') {
      if (!urlParams.has('latitude')) urlParams.set('latitude', '37.7749');
      if (!urlParams.has('longitude')) urlParams.set('longitude', '-122.4194');
      if (!urlParams.has('current_weather')) urlParams.set('current_weather', 'true');
    } else if (api.id === 'openstreetmap-nominatim') {
      if (!urlParams.has('q')) urlParams.set('q', req.query);
      if (!urlParams.has('format')) urlParams.set('format', 'json');
    } else if (api.id === 'free-dictionary-api') {
      fullUrl = `${api.baseUrl}/${encodeURIComponent(req.query.trim())}`;
    }

    const queryString = urlParams.toString();
    const targetUrl = queryString ? `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${queryString}` : fullUrl;

    let retriesLeft = api.retryPolicy.maxRetries;
    let backoff = api.retryPolicy.initialBackoffMs;
    let lastError: Error | null = null;

    while (retriesLeft >= 0) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), api.timeoutMs);

      try {
        const fetchOptions: RequestInit = {
          method: req.body ? 'POST' : 'GET',
          headers,
          signal: controller.signal,
        };
        if (req.body) {
          fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const res = await fetch(targetUrl, fetchOptions);
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        return data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${api.timeoutMs}ms`);
        }

        if (retriesLeft > 0) {
          await new Promise(r => setTimeout(r, backoff));
          backoff *= api.retryPolicy.backoffFactor;
        }
        retriesLeft--;
      }
    }

    throw lastError || new Error(`Failed to call ${api.name}`);
  }

  /**
   * Route user request to candidate APIs with automatic fallback failover execution.
   */
  public async routeRequest<T = any>(req: APIRouteRequest): Promise<APIRouteResponse<T>> {
    const startTime = Date.now();
    const intent = req.intent || this.detectIntent(req.query);

    // Candidates in fallback group
    let candidates: APIRegistryEntry[] = [];

    if (req.preferApiId) {
      const pref = publicAPIRegistry.getAPI(req.preferApiId);
      if (pref && pref.status === 'ENABLED') {
        candidates.push(pref);
      }
    }

    const groupCandidates = publicAPIRegistry.getAPIsForFallbackGroup(intent);
    groupCandidates.forEach(c => {
      if (!candidates.some(existing => existing.id === c.id)) {
        candidates.push(c);
      }
    });

    if (candidates.length === 0) {
      return {
        success: false,
        apiUsed: 'none',
        fallbackTriggered: false,
        fallbackChain: [],
        executionTimeMs: Date.now() - startTime,
        error: `No enabled API integration available for capability intent: ${intent}.`,
        redactedError: `No enabled API integration available for capability intent: ${intent}.`,
      };
    }

    const fallbackChain: string[] = [];
    let lastRedactedError = '';

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      fallbackChain.push(candidate.id);

      try {
        const data = await this.executeSingleCall(candidate, req);
        return {
          success: true,
          data,
          apiUsed: candidate.id,
          fallbackTriggered: i > 0,
          fallbackChain,
          executionTimeMs: Date.now() - startTime,
        };
      } catch (err: any) {
        const rawErr = err?.message || String(err);
        lastRedactedError = this.redactSecrets(rawErr);
        console.warn(`[PublicAPIRouter] Call to ${candidate.id} failed (${lastRedactedError}). Attempting fallback...`);
      }
    }

    return {
      success: false,
      apiUsed: candidates[candidates.length - 1]?.id || 'unknown',
      fallbackTriggered: candidates.length > 1,
      fallbackChain,
      executionTimeMs: Date.now() - startTime,
      error: 'All candidate API endpoints in the fallback group failed.',
      redactedError: lastRedactedError || 'All candidate API endpoints in the fallback group failed.',
    };
  }
}

export const publicAPIRouter = PublicAPIRouter.getInstance();
