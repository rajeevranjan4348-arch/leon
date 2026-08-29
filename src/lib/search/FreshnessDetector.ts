import { FreshnessDetectionResult, FreshnessLevel, SearchIntentCategory } from './types';

/**
 * FreshnessDetector: Analyzes user questions to determine if real-time web search
 * is required and what degree of freshness is appropriate.
 */
export class FreshnessDetector {
  /**
   * Detect whether a query requires live web search, its freshness tier, and category.
   */
  public static analyze(query: string, historySummary?: string): FreshnessDetectionResult {
    const text = (query || '').trim();
    const lower = text.toLowerCase();

    if (!text) {
      return {
        needsSearch: false,
        freshnessLevel: 'stable',
        category: 'casual_or_stable',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested: false,
        reason: 'Empty query',
        suggestedQueries: [],
      };
    }

    // Check if official website / source is explicitly requested
    const isOfficialRequested = /\b(official|website|portal|gov|docs|documentation|press release|announcement|apple|google|microsoft|amazon|samsung|tesla|nvidia|meta|openai|github)\b/i.test(lower);

    // 1. Explicit search commands
    if (/^(search|lookup|look up|google|find on web|find online)\s+/i.test(lower) || /\b(search the web|search google|on the web)\b/i.test(lower)) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'informational',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Explicit search directive requested by user',
        suggestedQueries: [text.replace(/^(search|lookup|look up|google|find on web|find online)\s+/i, '').trim()],
      };
    }

    // 2. Breaking News & Today's News
    const breakingKeywords = [
      'breaking news', 'breaking update', 'just in', 'happening right now', 'live updates', 'what happened today',
      'today news', "today's news", 'what happened in', 'developing story'
    ];
    if (breakingKeywords.some(kw => lower.includes(kw))) {
      return {
        needsSearch: true,
        freshnessLevel: 'breaking',
        category: 'news',
        isNewsQuery: true,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Breaking / same-day real-time news query',
        suggestedQueries: [this.extractTopicForNews(text, 'today')],
      };
    }

    // 3. General News & Trending Topics (News mode)
    const newsKeywords = [
      'latest news', 'top news', 'world news', 'india news', 'technology news', 'tech news',
      'ai news', 'artificial intelligence news', 'sports news', 'business news', 'market news',
      'entertainment news', 'science news', "what's trending", 'trending today', 'trending news',
      'recent headlines', 'daily brief', 'top stories'
    ];
    if (newsKeywords.some(kw => lower.includes(kw)) || /news\s+(about|on|regarding)\s+/i.test(lower) || /\b(latest news on|news today for)\b/i.test(lower)) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'news',
        isNewsQuery: true,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'News query requiring real-time articles & timestamps',
        suggestedQueries: [this.extractTopicForNews(text, 'latest')],
      };
    }

    // 4. Role & Office Holders (e.g. Prime Minister, President, CEO, Chief Minister)
    const rolePatterns = [
      /who\s+(is|was|currently\s+is)\s+(the\s+)?(current\s+)?(prime\s+minister|president|ceo|chief\s+minister|governor|chancellor|head|founder|director|leader|chairman|secretary|minister|mayor|captain|coach)\s+(of|in|for)\b/i,
      /who\s+holds\s+the\s+office\s+of\b/i,
      /who\s+is\s+in\s+charge\s+of\b/i,
      /^who\s+is\s+the\s+(current\s+)?[a-z\s]+(of|at|for)\b/i,
      /^who\s+is\s+current\s+/i,
      /^who\s+is\s+ceo\s+of\b/i,
      /^who\s+is\s+prime\s+minister\s+of\b/i,
      /^who\s+is\s+president\s+of\b/i,
      /^who\s+won\s+(the\s+)?(election|cup|match|tournament|game|championship|super bowl|ipl|world cup)\b/i,
    ];
    if (rolePatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'recent',
        category: 'role_or_office',
        isNewsQuery: false,
        isRoleQuery: true,
        isOfficialRequested: true,
        reason: 'Time-sensitive office-holder or leadership query',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 5. Product Research & Laptop/Phone Specs
    const productResearchPatterns = [
      /\b(best|top|cheap|budget|comparison|vs|review|specs|specification|price of|buy|under \d+)\b/i,
      /\b(latest iphone|best laptop|best phone|best camera|best tv)\b/i,
    ];
    if (productResearchPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'product_research',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Product research, comparison or specs lookup',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 6. Technical Documentation & APIs
    const techDocPatterns = [
      /\b(docs|documentation|api reference|sdk|npm|pypi|github repo|how to install|version release notes)\b/i,
      /\b(react|vite|typescript|python|golang|rust|flutter|swift|android|ios)\s+(docs|documentation|api|sdk)\b/i,
    ];
    if (techDocPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'this_week',
        category: 'technical_docs',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested: true,
        reason: 'Official technical documentation or SDK reference lookup',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 7. Official Government Information
    const govPatterns = [
      /\b(government|gov\.in|scheme|passport|visa|tax|pan card|aadhar|driving license|policy|ministry|official portal)\b/i,
    ];
    if (govPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'this_week',
        category: 'official_government',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested: true,
        reason: 'Official government service or policy query',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 8. Live Prices, Stocks, Crypto, Financial Markets
    const pricePatterns = [
      /\b(current|latest|live|today's)?\s*(price|stock price|share price|exchange rate|market cap)\s+of\b/i,
      /\bhow much is (bitcoin|ethereum|gold|silver|dollar|euro|inr|solana|nvidia|apple|tesla|google)\b/i,
      /\b(btc|eth|nvda|aapl|tsla|googl|msft)\s+(price|stock|quote)\b/i,
      /\bprice of\s+[a-z0-9\s]+(today|right now|currently)?\b/i,
    ];
    if (pricePatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'live_price_or_market',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Live market or asset price lookup',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 9. Live Weather & Environmental
    const weatherPatterns = [
      /\b(current|today's|live)?\s*(weather|temperature|forecast|rain|air quality|aqi)\s+(in|at|for)\b/i,
      /\bhow is the weather in\b/i,
      /\bwill it rain in\b/i,
      /\btemperature in\s+[a-z\s]+(today|now)?\b/i,
    ];
    if (weatherPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'weather',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Live weather & atmospheric conditions',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 10. Sports Results & Live Scores
    const sportsPatterns = [
      /\b(live score|match score|match result|tournament standings|who won the match|sports results)\b/i,
      /\b(ipl|premier league|nba|nfl|champions league|cricket|f1|formula 1)\s+(score|match|results|standings|schedule)\b/i,
    ];
    if (sportsPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'sports_or_events',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Live sports scores & tournament results',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 11. Freshness Modifiers: "latest", "today", "current", "now", "recently", "this week", "this month", "2026"
    const freshnessKeywords = [
      'latest', 'today', 'current', 'now', 'recently', 'this week', 'this month', '2026', 'right now', 'updated'
    ];
    if (freshnessKeywords.some(kw => lower.includes(kw))) {
      return {
        needsSearch: true,
        freshnessLevel: 'today',
        category: 'current_events',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Time-anchored freshness indicator requiring fresh web search',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 12. Deep Search / Exhaustive Research Patterns
    const deepResearchPatterns = [
      /\b(deep\s*(search|research|dive|analysis|investigation))\b/i,
      /\b(comprehensive\s+(report|analysis|review|comparison))\b/i,
      /\b(in-depth\s+(analysis|report|study|explanation))\b/i,
      /\b(systematic\s+review|exhaustive\s+research)\b/i,
    ];
    if (deepResearchPatterns.some(p => p.test(lower))) {
      return {
        needsSearch: true,
        freshnessLevel: 'this_week',
        category: 'deep_research',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested,
        reason: 'Deep research multi-source inquiry',
        suggestedQueries: [this.cleanQueryForSearch(text)],
      };
    }

    // 13. Casual Conversation & Stable Math/Code/Definitions
    const casualGreetings = [
      'hi', 'hello', 'hey', 'good morning', 'good evening', 'good night', 'how are you',
      'thanks', 'thank you', 'who are you', 'what can you do', 'tell me a joke'
    ];
    if (casualGreetings.includes(lower) || /^(write a function|explain how|calculate|what is the definition of|translate)\b/i.test(lower)) {
      return {
        needsSearch: false,
        freshnessLevel: 'stable',
        category: 'casual_or_stable',
        isNewsQuery: false,
        isRoleQuery: false,
        isOfficialRequested: false,
        reason: 'Stable knowledge or conversational interaction',
        suggestedQueries: [],
      };
    }

    // Default: Return informational search requirement if named entities or external references are present
    return {
      needsSearch: false,
      freshnessLevel: 'stable',
      category: 'casual_or_stable',
      isNewsQuery: false,
      isRoleQuery: false,
      isOfficialRequested: false,
      reason: 'General knowledge query',
      suggestedQueries: [],
    };
  }

  private static extractTopicForNews(text: string, type: 'today' | 'latest'): string {
    const cleaned = text
      .replace(/^(what is|what's|tell me|give me|show me|find|get)\s+/i, '')
      .replace(/\b(latest|breaking|today's|today|recent|current)\s+news\b/i, '')
      .replace(/\b(news|updates|headlines)\s+(on|about|for|regarding)\b/i, '')
      .replace(/^(news about|news on)\s+/i, '')
      .trim();

    if (cleaned.length > 2) {
      return `${cleaned} latest news`;
    }
    return type === 'today' ? 'breaking news today' : 'latest news headlines';
  }

  private static cleanQueryForSearch(text: string): string {
    return text
      .replace(/^(please\s+)?(can\s+you\s+)?(tell\s+me\s+)?(search\s+for\s+)?/i, '')
      .trim();
  }
}
