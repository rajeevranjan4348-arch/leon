import { VerifiedSourceItem, SourceTier } from './types';

/**
 * SourceExtractor: Extracts, standardizes, and deduplicates source entries
 * from Gemini Grounding chunks, Search results, and API responses.
 */
export class SourceExtractor {
  public static extractFromGrounding(groundingMetadata: any): VerifiedSourceItem[] {
    const items: VerifiedSourceItem[] = [];
    const seenUrls = new Set<string>();

    const chunks = groundingMetadata?.groundingChunks || [];
    if (Array.isArray(chunks)) {
      chunks.forEach((chunk: any, index: number) => {
        if (chunk.web?.uri) {
          const rawUrl = chunk.web.uri;
          if (seenUrls.has(rawUrl)) return;
          seenUrls.add(rawUrl);

          const title = chunk.web.title || `Source ${index + 1}`;
          const domain = this.extractDomain(rawUrl);

          items.push({
            id: `src_${Date.now()}_${index}`,
            title,
            url: rawUrl,
            domain,
            authoritativeScore: this.estimateInitialScore(domain),
            sourceTier: this.estimateTier(domain),
            isOfficial: this.isOfficialDomain(domain),
            type: 'web',
          });
        }
      });
    }

    return items;
  }

  public static extractDomain(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace(/^www\./, '');
    } catch {
      return 'web';
    }
  }

  private static estimateInitialScore(domain: string): number {
    const d = domain.toLowerCase();
    if (d.endsWith('.gov') || d.endsWith('.nic.in') || d.endsWith('.gov.in') || d.endsWith('.gov.uk')) return 98;
    if (d.endsWith('.edu') || d.endsWith('.ac.in') || d.endsWith('.ac.uk')) return 95;
    if (['reuters.com', 'apnews.com', 'bloomberg.com', 'bbc.com', 'nytimes.com', 'nature.com', 'science.org'].some(n => d.includes(n))) return 92;
    if (['thehindu.com', 'indianexpress.com', 'ndtv.com', 'theverge.com', 'techcrunch.com', 'arstechnica.com', 'wikipedia.org'].some(n => d.includes(n))) return 88;
    return 70;
  }

  private static estimateTier(domain: string): SourceTier {
    const d = domain.toLowerCase();
    if (d.endsWith('.gov') || d.endsWith('.nic.in') || d.endsWith('.gov.in') || d.endsWith('.gov.uk')) return 'official_government';
    if (d.includes('apple.com') || d.includes('google.com') || d.includes('microsoft.com') || d.includes('openai.com')) return 'official_company';
    if (d.includes('docs.') || d.includes('developer.')) return 'official_docs';
    if (d.endsWith('.edu') || d.endsWith('.ac.in')) return 'academic';
    if (['reuters.com', 'apnews.com', 'bloomberg.com', 'bbc.com', 'nytimes.com', 'thehindu.com', 'indianexpress.com'].some(n => d.includes(n))) return 'reputable_news';
    if (['theverge.com', 'techcrunch.com', 'arstechnica.com', 'wired.com'].some(n => d.includes(n))) return 'tech_publication';
    return 'general';
  }

  private static isOfficialDomain(domain: string): boolean {
    const d = domain.toLowerCase();
    return d.endsWith('.gov') || d.endsWith('.nic.in') || d.endsWith('.gov.in') || d.endsWith('.gov.uk') || d.includes('pmindia.gov.in') || d.includes('whitehouse.gov');
  }
}
