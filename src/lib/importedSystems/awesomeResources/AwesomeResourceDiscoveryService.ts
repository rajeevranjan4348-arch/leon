import { AwesomeSearchQuery, AwesomeSearchResult, AwesomeResourceItem, AwesomeCategory } from './types';
import { awesomeResourceRegistry, AwesomeResourceRegistry } from './AwesomeResourceRegistry';

/**
 * AwesomeResourceDiscoveryService
 * Search, categorized developer-resource lookup, repository/tool discovery,
 * and structured metadata extraction.
 */
export class AwesomeResourceDiscoveryService {
  private static instance: AwesomeResourceDiscoveryService;
  private registry: AwesomeResourceRegistry;

  private constructor() {
    this.registry = awesomeResourceRegistry;
  }

  public static getInstance(): AwesomeResourceDiscoveryService {
    if (!AwesomeResourceDiscoveryService.instance) {
      AwesomeResourceDiscoveryService.instance = new AwesomeResourceDiscoveryService();
    }
    return AwesomeResourceDiscoveryService.instance;
  }

  /**
   * Search curated developer resources by keyword, category, tags, and language.
   */
  public search(query: AwesomeSearchQuery): AwesomeSearchResult {
    const all = this.registry.getAllResources();
    const limit = query.limit || 10;
    const keyword = (query.keyword || '').trim().toLowerCase();
    const tags = (query.tags || []).map(t => t.toLowerCase());

    const matchedTopics = new Set<string>();
    const suggestedTags = new Set<string>();

    const scored = all.map(resource => {
      let score = 0;

      // Category filter
      if (query.category && resource.category === query.category) {
        score += 30;
      }

      // Keyword matching
      if (keyword) {
        if (resource.name.toLowerCase().includes(keyword)) score += 40;
        if (resource.description.toLowerCase().includes(keyword)) score += 25;
        if (resource.tags.some(t => t.toLowerCase().includes(keyword))) score += 35;
        if (resource.subcategory?.toLowerCase().includes(keyword)) score += 20;
      }

      // Tag matching
      if (tags.length > 0) {
        const matchesTag = resource.tags.some(t => tags.includes(t.toLowerCase()));
        if (matchesTag) score += 30;
      }

      // Language filter
      if (query.language && resource.language?.toLowerCase().includes(query.language.toLowerCase())) {
        score += 15;
      }

      return { resource, score };
    });

    const filtered = scored
      .filter(item => (keyword || tags.length > 0 || query.category ? item.score > 0 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => {
        if (item.resource.subcategory) matchedTopics.add(item.resource.subcategory);
        item.resource.tags.forEach(t => suggestedTags.add(t));
        return item.resource;
      });

    return {
      query: query.keyword || query.category || 'all',
      totalMatches: filtered.length,
      resources: filtered,
      matchedTopics: Array.from(matchedTopics),
      suggestedTags: Array.from(suggestedTags).slice(0, 10),
    };
  }

  /**
   * Discover resources for a specific developer task or technology stack.
   */
  public discoverForStack(techStack: string[]): AwesomeResourceItem[] {
    const results: AwesomeResourceItem[] = [];
    const seen = new Set<string>();

    for (const tech of techStack) {
      const searchRes = this.search({ keyword: tech, limit: 3 });
      for (const item of searchRes.resources) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          results.push(item);
        }
      }
    }

    return results;
  }

  /**
   * Retrieve structured metadata for a categorized directory overview.
   */
  public getCatalogSummary() {
    const all = this.registry.getAllResources();
    const categories: Record<string, number> = {};

    all.forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });

    return {
      totalCuratedResources: all.length,
      categories,
    };
  }
}

export const awesomeResourceDiscoveryService = AwesomeResourceDiscoveryService.getInstance();
