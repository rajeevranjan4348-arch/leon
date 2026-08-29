import { NewsArticleItem, VerifiedSourceItem } from './types';

/**
 * NewsSearchProvider: Provides specialized real-time news retrieval and formatting
 * for breaking, world, India, tech, AI, business, and sports queries.
 */
export class NewsSearchProvider {
  /**
   * Formats structured news articles into standardized, clean markdown.
   */
  public static formatNewsDigest(
    articles: NewsArticleItem[],
    topicTitle: string = 'Latest News'
  ): string {
    if (!articles || articles.length === 0) {
      return `### 📰 ${topicTitle}\n\n*No recent news articles were retrieved at this moment. Please verify connection or retry with a specific topic.*`;
    }

    const lines: string[] = [];
    lines.push(`### 📰 ${topicTitle}`);
    lines.push('');

    articles.forEach((art, idx) => {
      lines.push(`#### ${idx + 1}. ${art.headline}`);
      lines.push(`*${art.sourceName} · ${art.publishedTime || 'Recently published'}*`);
      lines.push('');
      lines.push(art.summary);
      lines.push('');
      if (art.sourceUrl) {
        lines.push(`[Read full article on ${art.sourceName}](${art.sourceUrl})`);
      }
      lines.push('');
      if (idx < articles.length - 1) {
        lines.push('---');
        lines.push('');
      }
    });

    return lines.join('\n');
  }

  /**
   * Parse grounding chunks into structured NewsArticleItem objects.
   */
  public static parseNewsFromGrounding(groundingMetadata: any, defaultCategory = 'General'): NewsArticleItem[] {
    const articles: NewsArticleItem[] = [];
    const chunks = groundingMetadata?.groundingChunks || [];

    if (Array.isArray(chunks)) {
      chunks.forEach((chunk: any, i: number) => {
        if (chunk.web?.uri && chunk.web?.title) {
          let sourceName = 'News Source';
          try {
            sourceName = new URL(chunk.web.uri).hostname.replace(/^www\./, '');
          } catch {}

          articles.push({
            id: `news_${Date.now()}_${i}`,
            headline: chunk.web.title,
            sourceName: sourceName.toUpperCase(),
            sourceUrl: chunk.web.uri,
            publishedTime: 'Live Web Grounded',
            summary: `Verified reporting sourced from ${sourceName}.`,
            category: defaultCategory,
          });
        }
      });
    }

    return articles;
  }
}
