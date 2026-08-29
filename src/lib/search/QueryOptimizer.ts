import { FreshnessDetectionResult } from './types';

/**
 * QueryOptimizer: Google Query Intelligence module that automatically reformulates
 * weak queries into targeted Google search syntax with site filters, official domain focus,
 * freshness anchors, and multi-query decomposition.
 */
export class QueryOptimizer {
  /**
   * Generates 1 to 4 focused search queries for a given user prompt.
   */
  public static generateQueries(
    userQuery: string,
    freshness: FreshnessDetectionResult,
    conversationTopic?: string
  ): string[] {
    const raw = (userQuery || '').trim();
    const lower = raw.toLowerCase();
    const clean = raw
      .replace(/^(please\s+)?(can\s+you\s+)?(tell\s+me\s+)?(what\s+is\s+)?(search\s+for\s+)?(find\s+)?/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    const currentYear = 2026;
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const queries: string[] = [];

    // 1. Direct Pattern Rule Reformulations (Exact Prompt Requirements)
    if (/^latest\s+iphone$/i.test(clean) || /\blatest iphone\b/i.test(clean)) {
      queries.push(`latest iPhone official Apple ${currentYear}`);
      queries.push(`site:apple.com iPhone latest ${currentYear}`);
      queries.push(`latest iPhone specifications price ${currentYear}`);
      return queries;
    }

    if (/^best\s+laptop\s+under\s+25000$/i.test(clean) || /\bbest laptop under 25000\b/i.test(clean)) {
      queries.push(`best laptop under ₹25000 India ${currentYear}`);
      queries.push(`best budget laptop under 25000 INR ${currentYear} reviews`);
      return queries;
    }

    if (/^(who is the|current)\s+pm of india$/i.test(clean) || /\bpm of india\b/i.test(clean)) {
      queries.push(`current Prime Minister of India official`);
      queries.push(`Prime Minister of India official pmindia.gov.in`);
      return queries;
    }

    if (/^latest\s+ai\s+news$/i.test(clean) || /\blatest ai news\b/i.test(clean)) {
      queries.push(`latest AI news ${currentYear}`);
      queries.push(`artificial intelligence news headlines ${currentYear}`);
      return queries;
    }

    // 2. Official Website & Government Query Mode
    if (freshness.category === 'official_government' || lower.includes('government') || lower.includes('scheme') || lower.includes('passport') || lower.includes('visa')) {
      queries.push(`${clean} official website gov`);
      queries.push(`${clean} official portal`);
      return Array.from(new Set(queries));
    }

    if (freshness.category === 'technical_docs' || lower.includes('docs') || lower.includes('api') || lower.includes('sdk')) {
      queries.push(`${clean} official documentation`);
      queries.push(`${clean} API reference guide`);
      return Array.from(new Set(queries));
    }

    // 3. Role or Office Query
    if (freshness.isRoleQuery) {
      queries.push(`current ${clean} official`);
      queries.push(`${clean} ${currentYear}`);
      return Array.from(new Set(queries));
    }

    // 4. News Query
    if (freshness.isNewsQuery) {
      if (freshness.freshnessLevel === 'breaking') {
        queries.push(`${clean} breaking news today`);
        queries.push(`${clean} live updates ${currentMonth} ${currentYear}`);
      } else {
        queries.push(`${clean} latest news ${currentYear}`);
        queries.push(`${clean} ${currentMonth} ${currentYear} headlines`);
      }
      return Array.from(new Set(queries)).slice(0, 3);
    }

    // 5. Product Research Query
    if (freshness.category === 'product_research') {
      queries.push(`${clean} ${currentYear}`);
      queries.push(`${clean} official specs price`);
      return Array.from(new Set(queries));
    }

    // 6. Price / Market Query
    if (freshness.category === 'live_price_or_market') {
      queries.push(`${clean} live price today`);
      queries.push(`${clean} real-time quote market ${currentYear}`);
      return Array.from(new Set(queries));
    }

    // 7. Multi-Search Mode for Deep Research & Complex Queries
    if (freshness.category === 'deep_research' || clean.split(' ').length > 7) {
      queries.push(`${clean} overview`);
      queries.push(`${clean} latest ${currentYear}`);
      queries.push(`${clean} official documentation`);
      queries.push(`${clean} problems reviews`);
      return queries;
    }

    // 8. Follow-up pronoun context
    if (conversationTopic && (clean.length < 18 || /\b(that|it|this|them|after that)\b/i.test(clean))) {
      queries.push(`${conversationTopic} ${clean}`);
      queries.push(`${conversationTopic} latest updates ${currentYear}`);
      return Array.from(new Set(queries));
    }

    // Default targeted query
    queries.push(`${clean}`);
    if (freshness.freshnessLevel === 'today' || freshness.freshnessLevel === 'this_week' || !lower.includes('2026')) {
      queries.push(`${clean} ${currentYear}`);
    }

    return Array.from(new Set(queries)).slice(0, 3);
  }
}
