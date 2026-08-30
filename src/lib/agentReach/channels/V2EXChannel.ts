/**
 * Agent-Reach V2EXChannel
 * Reads V2EX discussion topics, node posts, and latest community threads with fallback.
 * MIT License
 */

import { AgentReachResult, V2EXTopicDetails } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class V2EXChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Parse topic ID or node from V2EX URL.
   */
  public static parseV2exUrl(url: string): { topicId?: number; nodeName?: string } | null {
    if (!url) return null;
    const clean = url.trim();

    // Match topic: https://v2ex.com/t/123456 or https://www.v2ex.com/t/123456
    const topicMatch = clean.match(/v2ex\.com\/t\/([0-9]+)/i);
    if (topicMatch) {
      return { topicId: parseInt(topicMatch[1], 10) };
    }

    // Match node: https://v2ex.com/go/python
    const nodeMatch = clean.match(/v2ex\.com\/go\/([a-zA-Z0-9_]+)/i);
    if (nodeMatch) {
      return { nodeName: nodeMatch[1] };
    }

    if (/^[0-9]+$/.test(clean)) {
      return { topicId: parseInt(clean, 10) };
    }

    return null;
  }

  /**
   * Read topic or node discussions on V2EX.
   */
  public async getTopicOrNode(urlOrId: string): Promise<AgentReachResult> {
    const startTime = Date.now();
    const parsed = V2EXChannel.parseV2exUrl(urlOrId);
    const errors: string[] = [];

    // Case 1: Specific Topic ID
    if (parsed?.topicId) {
      const topicId = parsed.topicId;
      const topicUrl = `https://www.v2ex.com/t/${topicId}`;

      try {
        const apiUrl = `https://www.v2ex.com/api/topics/show.json?id=${topicId}`;
        const resp = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgentReach-V2EX/1.0',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(V2EXChannel.TIMEOUT_MS),
        });

        if (resp.ok) {
          const topics = await resp.json();
          if (Array.isArray(topics) && topics.length > 0) {
            const t = topics[0];
            const author = t.member?.username || 'v2ex_user';
            const nodeTitle = t.node?.title || t.node?.name || 'general';

            let content = `### V2EX Topic: [${t.title}](${topicUrl})\n` +
              `**Node**: \`${nodeTitle}\` | **Author**: @${author} | **Replies**: 💬 ${t.replies}\n` +
              `**Created**: ${new Date(t.created * 1000).toLocaleString()}\n\n` +
              `#### Content:\n${t.content || '(No additional text)'}\n`;

            const sanitized = ContentSanitizer.sanitize(content);
            return {
              source: 'AgentReach:V2EXAPI',
              platform: 'v2ex',
              url: topicUrl,
              title: `[V2EX] ${t.title}`,
              content: sanitized.sanitizedContent,
              author,
              publishedAt: new Date(t.created * 1000).toISOString(),
              metadata: {
                topicId,
                nodeTitle,
                repliesCount: t.replies,
                latencyMs: Date.now() - startTime,
              },
              retrievedAt: new Date().toISOString(),
              confidence: 0.95,
            };
          }
        }
      } catch (err: any) {
        errors.push(`V2EX API error: ${err?.message || String(err)}`);
      }

      // Fallback via Jina Reader
      try {
        const jinaResp = await fetch(`https://r.jina.ai/${topicUrl}`, {
          headers: { 'Accept': 'text/plain' },
          signal: AbortSignal.timeout(V2EXChannel.TIMEOUT_MS),
        });
        if (jinaResp.ok) {
          const text = await jinaResp.text();
          return {
            source: 'AgentReach:V2EXProxy',
            platform: 'v2ex',
            url: topicUrl,
            title: `[V2EX] Topic #${topicId}`,
            content: ContentSanitizer.sanitize(text).sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.85,
            metadata: { topicId, latencyMs: Date.now() - startTime },
            errors: errors.length > 0 ? errors : undefined,
          };
        }
      } catch {
        // Ignored
      }
    }

    // Case 2: Latest topics
    try {
      const latestApi = `https://www.v2ex.com/api/topics/latest.json`;
      const resp = await fetch(latestApi, {
        headers: {
          'User-Agent': 'AgentReach-V2EX/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(V2EXChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const topics = await resp.json();
        if (Array.isArray(topics) && topics.length > 0) {
          let content = `### V2EX Latest Community Topics:\n\n`;
          topics.slice(0, 8).forEach((t: any, idx: number) => {
            content += `${idx + 1}. **[${t.title}](https://www.v2ex.com/t/${t.id})**\n` +
              `   - Node: \`${t.node?.title || 'general'}\` | Author: @${t.member?.username} | Replies: 💬 ${t.replies}\n\n`;
          });

          return {
            source: 'AgentReach:V2EXLatest',
            platform: 'v2ex',
            url: 'https://www.v2ex.com',
            title: 'V2EX Latest Topics',
            content: ContentSanitizer.sanitize(content).sanitizedContent,
            retrievedAt: new Date().toISOString(),
            confidence: 0.92,
            metadata: { count: topics.length, latencyMs: Date.now() - startTime },
          };
        }
      }
    } catch (err: any) {
      errors.push(`V2EX latest error: ${err?.message || String(err)}`);
    }

    return {
      source: 'AgentReach:V2EX',
      platform: 'v2ex',
      url: 'https://www.v2ex.com',
      title: 'V2EX Discussions',
      content: `Discussions and topics from V2EX community: https://www.v2ex.com`,
      retrievedAt: new Date().toISOString(),
      confidence: 0.5,
      errors,
    };
  }
}

export const v2exChannel = new V2EXChannel();
