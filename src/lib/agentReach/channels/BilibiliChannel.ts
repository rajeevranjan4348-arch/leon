/**
 * Agent-Reach BilibiliChannel
 * Retrieves Bilibili video metadata, descriptions, uploader info, and search with fallback.
 * MIT License
 */

import { AgentReachResult, BilibiliVideoDetails } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class BilibiliChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Parse Bilibili BV ID from URL or raw ID.
   */
  public static extractBvId(urlOrId: string): string | null {
    if (!urlOrId) return null;
    const clean = urlOrId.trim();

    // Match raw BV ID: BV1xx411c7mD
    const rawMatch = clean.match(/^(BV[a-zA-Z0-9]{10})$/i);
    if (rawMatch) return rawMatch[1];

    // Match URL: https://www.bilibili.com/video/BV1xx411c7mD
    const urlMatch = clean.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]{10})/i);
    if (urlMatch) return urlMatch[1];

    return null;
  }

  /**
   * Fetch video details and stats for a Bilibili video.
   */
  public async getVideoDetails(bvidOrUrl: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const bvid = BilibiliChannel.extractBvId(bvidOrUrl);

    if (!bvid) {
      return this.searchBilibili(bvidOrUrl);
    }

    const videoUrl = `https://www.bilibili.com/video/${bvid}`;
    const errors: string[] = [];

    // Tier 1: Bilibili Web API
    try {
      const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
      const resp = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (AgentReach/1.0)',
          'Referer': 'https://www.bilibili.com',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(BilibiliChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.code === 0 && json.data) {
          const d = json.data;
          const author = d.owner?.name || 'Bilibili Uploader';
          const title = d.title || 'Bilibili Video';
          const playCount = d.stat?.view || 0;
          const danmakuCount = d.stat?.danmaku || 0;
          const commentCount = d.stat?.reply || 0;
          const description = d.desc || '';

          const content = `### Bilibili Video: [${title}](${videoUrl})\n` +
            `**Uploader (UP主)**: ${author}\n` +
            `**BV ID**: \`${bvid}\` | **AID**: \`${d.aid}\`\n` +
            `**Stats**: 👁️ ${playCount.toLocaleString()} views | 💬 ${commentCount} comments | 📺 ${danmakuCount} danmaku\n` +
            `**URL**: ${videoUrl}\n\n` +
            `#### Description:\n${description || 'No description'}\n`;

          const sanitized = ContentSanitizer.sanitize(content);
          return {
            source: 'AgentReach:BilibiliAPI',
            platform: 'bilibili',
            url: videoUrl,
            title: `[Bilibili] ${title}`,
            content: sanitized.sanitizedContent,
            author,
            publishedAt: d.pubdate ? new Date(d.pubdate * 1000).toISOString() : new Date().toISOString(),
            metadata: {
              bvid,
              playCount,
              danmakuCount,
              latencyMs: Date.now() - startTime,
            },
            retrievedAt: new Date().toISOString(),
            confidence: 0.96,
          };
        }
      }
    } catch (err: any) {
      errors.push(`Bilibili API error: ${err?.message || String(err)}`);
    }

    // Tier 2: Jina Reader Proxy fallback
    try {
      const jinaResp = await fetch(`https://r.jina.ai/${videoUrl}`, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(BilibiliChannel.TIMEOUT_MS),
      });
      if (jinaResp.ok) {
        const text = await jinaResp.text();
        return {
          source: 'AgentReach:BilibiliProxy',
          platform: 'bilibili',
          url: videoUrl,
          title: `[Bilibili] Video (${bvid})`,
          content: ContentSanitizer.sanitize(text).sanitizedContent,
          retrievedAt: new Date().toISOString(),
          confidence: 0.85,
          metadata: { bvid, latencyMs: Date.now() - startTime },
          errors: errors.length > 0 ? errors : undefined,
        };
      }
    } catch (err: any) {
      errors.push(`Bilibili proxy error: ${err?.message || String(err)}`);
    }

    return {
      source: 'AgentReach:Bilibili',
      platform: 'bilibili',
      url: videoUrl,
      title: 'Bilibili Content Retrieval Failed',
      content: `Failed to retrieve Bilibili video details for '${videoUrl}'.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0,
      errors,
    };
  }

  /**
   * Search Bilibili for videos.
   */
  public async searchBilibili(query: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const searchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`;

    return {
      source: 'AgentReach:BilibiliSearch',
      platform: 'bilibili',
      url: searchUrl,
      title: `Bilibili Search: ${query}`,
      content: `Searched Bilibili for: "${query}". See videos at ${searchUrl}`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.6,
      metadata: { query, latencyMs: Date.now() - startTime },
    };
  }
}

export const bilibiliChannel = new BilibiliChannel();
