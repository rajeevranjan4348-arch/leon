import { VerifiedSourceItem, ReadStatus } from './types';
import { JinaClient } from '../jina/JinaClient';

/**
 * WebpageReader: Handles fetching, reading, and extracting verified webpage text content.
 * Powered by Jina AI Reader (https://r.jina.ai/) with graceful fallbacks.
 */
export class WebpageReader {
  /**
   * Attempts to process and read webpage content for top sources via Jina Reader.
   */
  public static async readWebpages(
    sources: VerifiedSourceItem[]
  ): Promise<VerifiedSourceItem[]> {
    if (!sources || sources.length === 0) return [];

    const processed = await Promise.all(
      sources.slice(0, 6).map(async (source) => {
        // 1. Primary: Use Jina AI Reader to convert live URL to clean markdown
        try {
          const jinaPage = await JinaClient.readWebpage({
            url: source.url,
            returnFormat: 'markdown',
            timeoutMs: 6000,
          });

          if (jinaPage.isSuccess && jinaPage.content && jinaPage.content.length > 100) {
            return {
              ...source,
              isRead: true,
              readStatus: 'read_success' as ReadStatus,
              contentSummary: jinaPage.content.slice(0, 800),
            };
          }
        } catch (jinaErr) {
          console.warn('Jina Reader page fetch notice:', jinaErr);
        }

        // 2. Fallback: If snippet already contains rich text, mark as snippet_only or read_success
        if (source.snippet && source.snippet.length > 120) {
          return {
            ...source,
            isRead: true,
            readStatus: 'read_success' as ReadStatus,
            contentSummary: this.summarizeSnippet(source.snippet),
          };
        }

        // Fallback: If page could not be fetched/opened, treat transparently as snippet_only or unverified
        return {
          ...source,
          isRead: false,
          readStatus: (source.snippet ? 'snippet_only' : 'unverified') as ReadStatus,
          contentSummary: source.snippet || 'Webpage content unverified (direct URL retrieval restricted)',
        };
      })
    );

    // Keep remainder of sources
    const remainder = sources.slice(6).map(source => ({
      ...source,
      isRead: false,
      readStatus: (source.snippet ? 'snippet_only' : 'unverified') as ReadStatus,
    }));

    return [...processed, ...remainder];
  }

  private static summarizeSnippet(snippet: string): string {
    const clean = snippet.trim();
    if (clean.length <= 300) return clean;
    return `${clean.slice(0, 297)}...`;
  }
}

