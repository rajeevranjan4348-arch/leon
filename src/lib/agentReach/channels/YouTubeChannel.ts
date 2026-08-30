/**
 * Agent-Reach YouTubeChannel
 * Retrieves YouTube video metadata, search results, and transcript/captions with fallback.
 * MIT License
 */

import { AgentReachResult, YouTubeVideoMetadata } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class YouTubeChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Extract video ID from various YouTube URL formats.
   */
  public static extractVideoId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();

    // Raw 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return clean;
    }

    // https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }

    return null;
  }

  /**
   * Fetch video details and transcript for a YouTube video URL or ID.
   */
  public async getVideoDetails(videoUrlOrId: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const videoId = YouTubeChannel.extractVideoId(videoUrlOrId);

    if (!videoId) {
      // If it's a search term rather than a specific video URL, perform YouTube search
      return this.searchVideos(videoUrlOrId);
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const errors: string[] = [];

    let title = `YouTube Video (${videoId})`;
    let author = 'YouTube Creator';
    let description = '';
    let transcriptText = '';
    const transcriptSnippets: Array<{ text: string; start: number; duration: number }> = [];

    // Tier 1: YouTube oEmbed API for verified title & author
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      const resp = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(YouTubeChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
      }
    } catch (err: any) {
      errors.push(`oEmbed error: ${err?.message || String(err)}`);
    }

    // Tier 2: Fetch transcript / video page text via Jina / YouTube subtitle proxy
    try {
      const transcriptUrl = `https://r.jina.ai/${videoUrl}`;
      const resp = await fetch(transcriptUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(YouTubeChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const pageText = await resp.text();
        if (pageText && pageText.length > 100) {
          transcriptText = pageText;
        }
      }
    } catch (err: any) {
      errors.push(`Transcript scrape error: ${err?.message || String(err)}`);
    }

    // Build structured output
    const metadata: YouTubeVideoMetadata = {
      videoId,
      title,
      description,
      channelTitle: author,
      publishedAt: new Date().toISOString(),
      transcriptAvailable: transcriptText.length > 0,
      transcriptSnippets: transcriptSnippets.length > 0 ? transcriptSnippets : undefined,
    };

    let content = `### Video: ${title}\n` +
      `**Channel**: ${author}\n` +
      `**URL**: ${videoUrl}\n` +
      `**Video ID**: \`${videoId}\`\n\n`;

    if (transcriptText) {
      const sanitized = ContentSanitizer.sanitize(transcriptText, 20000);
      content += `#### Video Transcript & Details:\n\n${sanitized.sanitizedContent}`;
    } else {
      content += `*(Automated subtitles/transcript were not immediately accessible or require authentication)*`;
    }

    return {
      source: 'AgentReach:YouTube',
      platform: 'youtube',
      url: videoUrl,
      title: `[YouTube] ${title}`,
      content,
      author,
      publishedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        latencyMs: Date.now() - startTime,
      },
      retrievedAt: new Date().toISOString(),
      confidence: transcriptText ? 0.95 : 0.75,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Search YouTube for videos matching a topic or query.
   */
  public async searchVideos(query: string, limit: number = 5): Promise<AgentReachResult> {
    const startTime = Date.now();
    const searchUrl = `https://r.jina.ai/https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    try {
      const resp = await fetch(searchUrl, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(YouTubeChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const text = await resp.text();
        const sanitized = ContentSanitizer.sanitize(text, 15000);
        return {
          source: 'AgentReach:YouTubeSearch',
          platform: 'youtube',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          title: `YouTube Search: ${query}`,
          content: sanitized.sanitizedContent,
          retrievedAt: new Date().toISOString(),
          confidence: 0.88,
          metadata: {
            query,
            latencyMs: Date.now() - startTime,
          },
        };
      }
    } catch (err: any) {
      // Fallback
    }

    return {
      source: 'AgentReach:YouTube',
      platform: 'youtube',
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      title: `YouTube Search: ${query}`,
      content: `Searched YouTube for "${query}". Please check the direct YouTube search link or provide a specific video URL.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.5,
      errors: ['Direct YouTube search API not available; returned fallback search query link.'],
    };
  }
}

export const youtubeChannel = new YouTubeChannel();
