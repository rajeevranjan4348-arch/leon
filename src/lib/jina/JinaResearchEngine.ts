import { JinaClient } from './JinaClient';
import { WebSearchRouter } from './WebSearchRouter';
import {
  JinaResearchProgress,
  JinaResearchResult,
  JinaSearchResultItem
} from './types';

/**
 * JinaResearchEngine: Orchestrates multi-step web search and full-page reading via Jina AI.
 */
export class JinaResearchEngine {
  /**
   * Execute full research workflow.
   */
  public static async execute(
    query: string,
    options?: {
      onProgress?: (progress: JinaResearchProgress) => void;
      signal?: AbortSignal;
      maxPagesToRead?: number;
    }
  ): Promise<JinaResearchResult> {
    const startTime = Date.now();
    const onProgress = options?.onProgress;
    const maxPages = options?.maxPagesToRead || 3;

    // 1. Query Analysis & Routing
    onProgress?.({
      stage: 'analyzing',
      message: 'Analyzing search intent & routing query...',
      progressPercent: 10,
    });

    const decision = WebSearchRouter.route(query);

    // Case A: Explicit URL Reading
    if (decision.mode === 'read_url' && decision.detectedUrls && decision.detectedUrls.length > 0) {
      onProgress?.({
        stage: 'reading_sources',
        message: `Reading webpage content via Jina Reader... (${decision.detectedUrls.length} URLs)`,
        progressPercent: 40,
      });

      const pages = await Promise.all(
        decision.detectedUrls.slice(0, 3).map(url =>
          JinaClient.readWebpage({
            url,
            returnFormat: 'markdown',
            timeoutMs: 12000,
            signal: options?.signal,
          })
        )
      );

      const validPages = pages.filter(p => p.isSuccess && p.content);
      const sources: JinaSearchResultItem[] = validPages.map((p, idx) => ({
        id: `url_src_${idx}`,
        title: p.title,
        url: p.url,
        domain: p.domain,
        snippet: p.content.slice(0, 300),
        content: p.content,
        publishedDate: p.publishedTime,
        retrievedAt: p.retrievedAt,
        sourceType: 'general_web',
        relevanceScore: 95,
        isRead: true,
      }));

      const pageSummaries = validPages.map(p => `### [${p.title}](${p.url})\n\n${p.content.slice(0, 3500)}`).join('\n\n---\n\n');
      const citations = validPages.map(p => `[${p.title || p.domain}](${p.url})`);

      onProgress?.({
        stage: 'completed',
        message: 'Webpage reading completed',
        sourcesCount: sources.length,
        sources,
        progressPercent: 100,
      });

      return {
        query,
        answer: pageSummaries || 'Unable to retrieve webpage content from the provided URL.',
        sources,
        citations,
        durationMs: Date.now() - startTime,
        isSuccessful: validPages.length > 0,
        routerDecision: decision,
      };
    }

    // Case B: Single-Search or Deep Research
    const searchQueries = decision.optimizedQueries && decision.optimizedQueries.length > 0
      ? decision.optimizedQueries
      : [query];

    onProgress?.({
      stage: 'searching',
      message: `Searching live web via Jina AI Search... (${searchQueries.length} query variations)`,
      queries: searchQueries,
      progressPercent: 30,
    });

    const searchResultsMap = new Map<string, JinaSearchResultItem>();

    for (const q of searchQueries) {
      const results = await JinaClient.searchWeb({
        query: q,
        maxResults: 6,
        freshnessRequired: decision.isLiveRequired,
        signal: options?.signal,
      });

      for (const item of results) {
        if (!searchResultsMap.has(item.url)) {
          searchResultsMap.set(item.url, item);
        }
      }
    }

    const allSources = Array.from(searchResultsMap.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (allSources.length === 0) {
      onProgress?.({
        stage: 'failed',
        message: 'No web search results found',
        progressPercent: 100,
      });

      return {
        query,
        answer: 'No live web results were found for this query.',
        sources: [],
        citations: [],
        durationMs: Date.now() - startTime,
        isSuccessful: false,
        routerDecision: decision,
      };
    }

    // Step 3: Deep read top sources via Jina Reader
    onProgress?.({
      stage: 'reading_sources',
      message: `Reading full content of top authoritative sources (${Math.min(maxPages, allSources.length)} pages)...`,
      sourcesCount: allSources.length,
      sources: allSources,
      progressPercent: 65,
    });

    const topToRead = allSources.slice(0, maxPages);
    await Promise.all(
      topToRead.map(async (source) => {
        if (!source.isRead) {
          const page = await JinaClient.readWebpage({
            url: source.url,
            returnFormat: 'markdown',
            timeoutMs: 8000,
            signal: options?.signal,
          });
          if (page.isSuccess && page.content) {
            source.content = page.content;
            source.isRead = true;
            if (!source.title || source.title.startsWith('Source ')) {
              source.title = page.title;
            }
          }
        }
      })
    );

    // Step 4: Synthesize summary & citations
    onProgress?.({
      stage: 'synthesizing',
      message: 'Synthesizing verified web research with citations...',
      sourcesCount: allSources.length,
      sources: allSources,
      progressPercent: 90,
    });

    const citations = allSources.map(s => `[${s.title}](${s.url})`);

    onProgress?.({
      stage: 'completed',
      message: 'Research complete',
      sourcesCount: allSources.length,
      sources: allSources,
      progressPercent: 100,
    });

    return {
      query,
      answer: allSources.map(s => `**${s.title}** ([${s.domain}](${s.url}))\n${s.snippet}`).join('\n\n'),
      sources: allSources,
      citations,
      durationMs: Date.now() - startTime,
      isSuccessful: true,
      routerDecision: decision,
    };
  }
}
