import { FreeDevSearchQuery, FreeDevRecommendation, FreeDevServiceItem, FreeDevCategory } from './types';
import { freeDevRegistry, FreeDevRegistry } from './FreeDevRegistry';

/**
 * FreeDevDiscoveryService
 * Search, comparison, and stack-based recommendations for free-tier developer services.
 */
export class FreeDevDiscoveryService {
  private static instance: FreeDevDiscoveryService;
  private registry: FreeDevRegistry;

  private constructor() {
    this.registry = freeDevRegistry;
  }

  public static getInstance(): FreeDevDiscoveryService {
    if (!FreeDevDiscoveryService.instance) {
      FreeDevDiscoveryService.instance = new FreeDevDiscoveryService();
    }
    return FreeDevDiscoveryService.instance;
  }

  /**
   * Search free developer tiers by criteria.
   */
  public search(query: FreeDevSearchQuery): FreeDevServiceItem[] {
    const all = this.registry.getAllServices();
    const keyword = (query.keyword || '').trim().toLowerCase();
    const tags = (query.tags || []).map(t => t.toLowerCase());

    return all.filter(item => {
      if (query.category && item.category !== query.category) {
        return false;
      }
      if (query.noCreditCardOnly && item.requiresCreditCard) {
        return false;
      }
      if (tags.length > 0 && !item.tags.some(t => tags.includes(t.toLowerCase()))) {
        return false;
      }
      if (keyword) {
        const matchesName = item.name.toLowerCase().includes(keyword);
        const matchesDesc = item.description.toLowerCase().includes(keyword);
        const matchesTier = item.freeTierDetails.toLowerCase().includes(keyword);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(keyword));
        if (!matchesName && !matchesDesc && !matchesTier && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Generates tailored architectural recommendations for a specific project stack or requirement.
   */
  public recommendForRequirement(requirement: string): FreeDevRecommendation[] {
    const reqLower = requirement.toLowerCase();
    const all = this.registry.getAllServices();
    const recommendations: FreeDevRecommendation[] = [];

    const scored = all.map(service => {
      let score = 0;
      let reason = '';

      if (reqLower.includes('auth') || reqLower.includes('login') || reqLower.includes('user')) {
        if (service.category === 'auth-identity' || service.tags.includes('auth')) {
          score += 40;
          reason = `Best suited for authenticating users: ${service.freeTierDetails}`;
        }
      }

      if (reqLower.includes('database') || reqLower.includes('sql') || reqLower.includes('postgres') || reqLower.includes('store')) {
        if (service.category === 'databases-backends') {
          score += 40;
          reason = `Generous free database tier: ${service.freeTierDetails}`;
        }
      }

      if (reqLower.includes('host') || reqLower.includes('deploy') || reqLower.includes('frontend') || reqLower.includes('backend')) {
        if (service.category === 'hosting-paas') {
          score += 40;
          reason = `Reliable cloud deployment tier: ${service.freeTierDetails}`;
        }
      }

      if (reqLower.includes('ai') || reqLower.includes('llm') || reqLower.includes('agent') || reqLower.includes('gemini')) {
        if (service.category === 'ai-machine-learning') {
          score += 50;
          reason = `Fast inference and AI generation: ${service.freeTierDetails}`;
        }
      }

      // Check recommendation tags
      service.recommendedFor.forEach(rec => {
        if (reqLower.includes(rec.toLowerCase())) {
          score += 25;
          if (!reason) reason = `Directly recommended for ${rec}: ${service.freeTierDetails}`;
        }
      });

      return { service, score, reason };
    });

    const topMatches = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    topMatches.forEach(match => {
      const alternatives = all
        .filter(s => s.category === match.service.category && s.id !== match.service.id)
        .map(s => s.name);

      recommendations.push({
        service: match.service,
        matchScore: match.score,
        reason: match.reason || `Matches developer criteria for ${match.service.name}`,
        alternativeOptions: alternatives,
      });
    });

    return recommendations;
  }
}

export const freeDevDiscoveryService = FreeDevDiscoveryService.getInstance();
