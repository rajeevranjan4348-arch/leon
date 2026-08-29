import {
  FreshnessDetectionResult,
  SearchExecutionResult,
  SearchProgressEvent,
  VerifiedSourceItem
} from './types';
import { FreshnessDetector } from './FreshnessDetector';
import { QueryOptimizer } from './QueryOptimizer';
import { SourceExtractor } from './SourceExtractor';
import { SourceVerifier } from './SourceVerifier';
import { WebpageReader } from './WebpageReader';
import { ResultSummarizer } from './ResultSummarizer';
import { ParallelSearchProvider } from './ParallelSearchProvider';
import { callGeminiAPI, streamGeminiAPI } from '../gemini';

export interface SearchOrchestratorOptions {
  conversationId?: string;
  conversationTopic?: string;
  onProgress?: (event: SearchProgressEvent) => void;
  onChunk?: (delta: string, accumulated: string) => void;
  signal?: AbortSignal;
  isDeepSearch?: boolean;
}

/**
 * SearchEngineOrchestrator: Coordinates the full Google-First real-time web search engine.
 * Implements the strict pipeline: USER QUERY -> GOOGLE SEARCH -> WEBPAGE RETRIEVAL -> SOURCE VERIFICATION -> ANSWER.
 */
export class SearchEngineOrchestrator {
  /**
   * Executes the end-to-end Google Web Search pipeline.
   */
  public static async execute(
    userQuery: string,
    options?: SearchOrchestratorOptions
  ): Promise<SearchExecutionResult> {
    const startTime = Date.now();
    const onProgress = options?.onProgress;
    const onChunk = options?.onChunk;

    // 1. Detect Intent & Freshness (Requirement 2 & 12)
    onProgress?.({
      stage: 'detecting_intent',
      message: 'Analyzing query intent and freshness requirements...',
      isDeepSearch: options?.isDeepSearch,
    });

    const freshness = FreshnessDetector.analyze(userQuery, options?.conversationTopic);

    // 2. Google Query Intelligence (Requirement 3: Weak query reformulation)
    onProgress?.({
      stage: 'generating_queries',
      message: 'Reformulating query using Google Query Intelligence...',
      subMessage: 'Applying site filters, official domain priorities, and freshness anchors',
      isDeepSearch: options?.isDeepSearch,
    });

    const searchQueries = QueryOptimizer.generateQueries(
      userQuery,
      freshness,
      options?.conversationTopic
    );

    // 3. Search Google via Gemini Google Search Grounding (Requirement 1 & 6)
    onProgress?.({
      stage: 'searching_web',
      message: '🔎 Searching Google...',
      subMessage: `↳ Executing Google Search queries: ${searchQueries.slice(0, 2).join(', ')}`,
      queries: searchQueries,
      isDeepSearch: options?.isDeepSearch,
    });

    const currentDateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // System prompt enforcing Google-First Search rules & output structure
    let systemInstruction = `You are a Google-First Web Search Engine AI Assistant.
Current Year: 2026. Today's Date: ${currentDateStr}.

STRICT OPERATIONAL PIPELINE:
USER QUERY → GOOGLE SEARCH → WEBPAGE RETRIEVAL → SOURCE VERIFICATION → CONCISE ANSWER WITH CITATIONS

RULES:
1. DIRECT FIRST-SENTENCE VERDICT: Always give the direct factual answer or core summary in the very first sentence.
2. SOURCE VERIFICATION & OFFICIAL PRIORITY: Ground all facts strictly in Google web search results. Prioritize official government (.gov, pmindia.gov.in), official company websites (apple.com, google.com), official documentation, academic research, and reputable news.
3. WEBPAGE CITATIONS: Cite sources using markdown clickable links [Website Name](URL).
4. NO FABRICATION: Never invent search results, URLs, prices, release dates, or role holders. If information cannot be verified, state it clearly.
5. FORMATTING REQUIREMENT: When presenting retrieved web results, include the structured 🔎 Search Results summary at the end.`;

    if (freshness.isOfficialRequested) {
      systemInstruction += `\n\nOFFICIAL WEBSITE MODE ACTIVE: Perform search prioritizing official websites, official documentation, or official government portals.`;
    }

    if (freshness.isRoleQuery) {
      systemInstruction += `\n\nROLE/OFFICE QUERY RULE: State directly who currently holds this position in 2026: "[PERSON] is the current [ROLE] of [ORGANIZATION/COUNTRY]."`;
    }

    let rawText = '';
    let extractedSources: VerifiedSourceItem[] = [];
    let isLiveSearchExecuted = false;
    let errorNotice: string | undefined;

    // Execute multi-query search if parallel search provider configured
    if (ParallelSearchProvider.isConfigured() && searchQueries.length > 1) {
      try {
        const parallelResults = await ParallelSearchProvider.searchParallel(searchQueries.slice(0, 3));
        for (const res of parallelResults) {
          if (res.results && res.results.length > 0) {
            extractedSources.push(...res.results);
          }
        }
      } catch (e) {
        console.warn('Parallel search notice:', e);
      }
    }

    try {
      onProgress?.({
        stage: 'retrieving_sources',
        message: '↳ Retrieving Google-indexed webpages...',
        subMessage: 'Collecting official websites and authoritative articles',
        queries: searchQueries,
        isDeepSearch: options?.isDeepSearch,
      });

      const effectivePrompt = searchQueries.length > 0
        ? `Perform Google web search for: ${searchQueries[0]}\nOriginal user request: ${userQuery}`
        : userQuery;

      if (onChunk) {
        const streamRes = await streamGeminiAPI(
          {
            prompt: effectivePrompt,
            mode: options?.isDeepSearch ? 'research' : 'search',
            grounding: 'search',
            tools: ['googleSearch'],
            systemInstruction,
          },
          (delta, accumulated) => {
            onChunk(delta, accumulated);
          },
          (sources) => {
            if (sources && sources.length > 0) {
              const mapped: VerifiedSourceItem[] = sources.map((s, i) => ({
                id: `src_${Date.now()}_${i}`,
                title: s.title,
                url: s.url,
                domain: SourceExtractor.extractDomain(s.url),
                authoritativeScore: 85,
                sourceTier: 'reputable_news',
                isOfficial: false,
                type: 'web',
              }));
              extractedSources = SourceVerifier.verifyAndRank(mapped);
            }
          },
          (metadata) => {
            if (metadata) {
              const fromGrounding = SourceExtractor.extractFromGrounding(metadata);
              if (fromGrounding.length > 0) {
                extractedSources = SourceVerifier.verifyAndRank(fromGrounding);
              }
            }
          }
        );

        rawText = streamRes.text || '';
        isLiveSearchExecuted = streamRes.success;
      } else {
        const res = await callGeminiAPI({
          prompt: effectivePrompt,
          mode: options?.isDeepSearch ? 'research' : 'search',
          grounding: 'search',
          tools: ['googleSearch'],
          systemInstruction,
        });

        rawText = res.text || '';
        isLiveSearchExecuted = res.success;

        if (res.groundingMetadata) {
          const fromGrounding = SourceExtractor.extractFromGrounding(res.groundingMetadata);
          extractedSources = SourceVerifier.verifyAndRank(fromGrounding);
        } else if (res.sources && res.sources.length > 0) {
          const mapped: VerifiedSourceItem[] = res.sources.map((s, i) => ({
            id: `src_${Date.now()}_${i}`,
            title: s.title,
            url: s.url,
            domain: SourceExtractor.extractDomain(s.url),
            authoritativeScore: 85,
            sourceTier: 'reputable_news',
            isOfficial: false,
            type: 'web',
          }));
          extractedSources = SourceVerifier.verifyAndRank(mapped);
        }
      }

      // 4. Webpage Reading & Content Extraction (Requirement 8)
      onProgress?.({
        stage: 'reading_webpages',
        message: '↳ Reading webpage content & verifying claims...',
        subMessage: 'Opening retrieved pages and cross-checking facts across sources',
        sourcesFound: extractedSources.length,
        isDeepSearch: options?.isDeepSearch,
      });

      extractedSources = await WebpageReader.readWebpages(extractedSources);

      // 5. Source Verification & 7-Tier Ranking (Requirement 4 & 5)
      onProgress?.({
        stage: 'verifying_sources',
        message: `✓ Sources verified (${extractedSources.length} sources)`,
        subMessage: 'Filtered low-quality links & prioritized official domains',
        sourcesFound: extractedSources.length,
        isDeepSearch: options?.isDeepSearch,
      });
      
      extractedSources = SourceVerifier.verifyAndRank(extractedSources);

    } catch (err: any) {
      console.warn('SearchEngineOrchestrator search execution error:', err);
      isLiveSearchExecuted = false;
      errorNotice = err?.message || 'Google search execution failed';
      rawText = ResultSummarizer.generateSearchUnavailableFallback(userQuery);
    }

    // 6. Synthesize Answer with 🔎 Search Results (Requirement 9 & 11)
    onProgress?.({
      stage: 'synthesizing_answer',
      message: 'Synthesizing verified response...',
      subMessage: 'Formatting direct answer and building clickable source citations',
      isDeepSearch: options?.isDeepSearch,
    });

    const finalText = ResultSummarizer.synthesize(rawText, extractedSources, freshness);

    onProgress?.({
      stage: 'done',
      message: 'Search Complete',
      sourcesFound: extractedSources.length,
      isDeepSearch: options?.isDeepSearch,
    });

    return {
      text: finalText,
      sources: extractedSources,
      freshness,
      isLiveSearchExecuted,
      searchDurationMs: Date.now() - startTime,
      errorNotice,
    };
  }
}

