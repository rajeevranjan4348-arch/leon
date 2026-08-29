/**
 * Public API Service Facade
 * Provides high-level methods for consuming integrated Public APIs.
 */

import { publicAPIRouter } from './PublicAPIRouter';
import { publicAPIRegistry } from './PublicAPIRegistry';
import { APIRouteResponse, RegistrySummary } from './types';

export class PublicAPIService {
  private static instance: PublicAPIService;

  private constructor() {}

  public static getInstance(): PublicAPIService {
    if (!PublicAPIService.instance) {
      PublicAPIService.instance = new PublicAPIService();
    }
    return PublicAPIService.instance;
  }

  /**
   * Fetch weather data for target location or coordinates.
   */
  public async getWeather(locationOrQuery: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'weather',
      query: locationOrQuery,
    });
  }

  /**
   * Fetch top headlines or search news topics.
   */
  public async getNews(topic: string = 'technology'): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'news',
      query: topic,
      params: { q: topic, category: 'technology' },
    });
  }

  /**
   * Search GitHub repositories or code snippets.
   */
  public async searchGitHub(query: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'github_search',
      query,
      params: { q: query },
    });
  }

  /**
   * Resolve location geocoding or address map details.
   */
  public async getMapInfo(addressOrPlace: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'map_location',
      query: addressOrPlace,
      params: { q: addressOrPlace },
    });
  }

  /**
   * Generate an image from a text prompt.
   */
  public async generateImage(prompt: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'generate_image',
      query: prompt,
      body: { prompt, n: 1, size: '1024x1024' },
    });
  }

  /**
   * Fetch dictionary definitions and pronunciations.
   */
  public async getDictionaryDefinition(word: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      intent: 'dictionary_lookup',
      query: word,
    });
  }

  /**
   * Process generic natural language query via auto-detected API router.
   */
  public async executeQuery(query: string): Promise<APIRouteResponse> {
    return publicAPIRouter.routeRequest({
      query,
    });
  }

  /**
   * Get public API registry health and configuration summary.
   */
  public getRegistrySummary(): RegistrySummary {
    return publicAPIRegistry.getRegistrySummary();
  }
}

export const publicAPIService = PublicAPIService.getInstance();
