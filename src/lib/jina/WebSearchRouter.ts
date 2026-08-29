import { WebSearchRouterDecision } from './types';

/**
 * WebSearchRouter: Intelligently routes user queries to the appropriate web search / reader strategy.
 */
export class WebSearchRouter {
  private static readonly URL_REGEX = /(https?:\/\/[^\s]+)/gi;

  private static readonly LIVE_KEYWORDS = [
    'latest', 'today', 'current', 'now', 'recent', 'recently',
    'live', 'real-time', 'realtime', 'news', 'price', 'weather',
    'score', 'update', 'version', 'release', 'released', 'current events',
    'search the web', 'look this up', 'google this', 'browse the web',
    'who is the current', 'what is the current', 'stock price',
    'inflation rate', '2026', 'this week', 'this month'
  ];

  private static readonly RESEARCH_KEYWORDS = [
    'compare', 'comparison', 'vs', 'versus', 'deep dive',
    'comprehensive', 'breakdown', 'pros and cons', 'overview of recent',
    'multi-source', 'state of the art', 'benchmarks', 'market analysis'
  ];

  private static readonly STATIC_CONVERSATIONAL_PATTERNS = [
    /^(hi|hello|hey|good morning|good evening|how are you|who are you)\b/i,
    /^(\d+\s*[\+\-\*\/]\s*\d+|what is \d+\s*[\+\-\*\/]\s*\d+)/i, // Math
    /^(define|what is the definition of|meaning of)\s+[a-z]+$/i, // Simple dictionary definitions
    /^(translate|say|how do you say)\s+.+\s+(in|to)\s+[a-z]+$/i, // Translations
    /^(remember that|my favorite|don't forget that|note that)\s+/i, // Memory directives
    /^(write a|generate a|create a)\s+(poem|story|function|regex|sql query|component|class)\b/i, // Pure generation
  ];

  /**
   * Evaluates query and determines routing decision.
   */
  public static route(query: string, conversationTopic?: string): WebSearchRouterDecision {
    const clean = (query || '').trim();
    if (!clean) {
      return {
        mode: 'none',
        reason: 'Empty query',
        isLiveRequired: false,
      };
    }

    // 1. Detect explicit URLs
    const detectedUrls = clean.match(this.URL_REGEX);
    if (detectedUrls && detectedUrls.length > 0) {
      return {
        mode: 'read_url',
        reason: 'Explicit URL detected in user prompt for reading/summarization',
        detectedUrls,
        isLiveRequired: true,
      };
    }

    const lower = clean.toLowerCase();

    // 2. Check for purely static conversational, math, translation, or personal memory prompts
    for (const pattern of this.STATIC_CONVERSATIONAL_PATTERNS) {
      if (pattern.test(clean) && !this.hasLiveKeyword(lower)) {
        return {
          mode: 'none',
          reason: 'Static/conversational or local memory prompt does not require live web access',
          isLiveRequired: false,
        };
      }
    }

    // 3. Check for explicit Web Search triggers or live keywords
    const isLive = this.hasLiveKeyword(lower);
    const isResearch = this.hasResearchKeyword(lower);

    if (isResearch && isLive) {
      const optimizedQueries = this.generateMultiQueries(clean);
      return {
        mode: 'deep_research',
        reason: 'Complex multi-source or comparative query requiring deep web research',
        optimizedQueries,
        isLiveRequired: true,
        targetTopic: conversationTopic,
      };
    }

    if (isLive || lower.includes('who is') || lower.includes('what is the') || lower.includes('tell me about')) {
      const optimizedQueries = [this.cleanSearchQuery(clean)];
      return {
        mode: 'single_search',
        reason: 'Query requests live, current, or factual information from web',
        optimizedQueries,
        isLiveRequired: isLive,
        targetTopic: conversationTopic,
      };
    }

    // Default to direct generation without web overhead
    return {
      mode: 'none',
      reason: 'General knowledge query handled by base model',
      isLiveRequired: false,
    };
  }

  private static hasLiveKeyword(text: string): boolean {
    return this.LIVE_KEYWORDS.some(kw => text.includes(kw));
  }

  private static hasResearchKeyword(text: string): boolean {
    return this.RESEARCH_KEYWORDS.some(kw => text.includes(kw));
  }

  private static cleanSearchQuery(query: string): string {
    return query
      .replace(/^(search the web for|look up|google|please search|find information on|find out)\s+/i, '')
      .replace(/\?+$/, '')
      .trim();
  }

  private static generateMultiQueries(query: string): string[] {
    const base = this.cleanSearchQuery(query);
    const queries = [base];

    if (base.toLowerCase().includes(' vs ') || base.toLowerCase().includes(' versus ')) {
      const parts = base.split(/\s+(?:vs|versus)\s+/i);
      if (parts.length === 2) {
        queries.push(`${parts[0].trim()} latest features documentation`);
        queries.push(`${parts[1].trim()} latest features documentation`);
      }
    } else {
      queries.push(`${base} official documentation 2026`);
      queries.push(`${base} latest updates and news`);
    }

    return Array.from(new Set(queries)).slice(0, 3);
  }
}
