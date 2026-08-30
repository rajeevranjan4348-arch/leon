/**
 * Agent-Reach RSSChannel
 * Reads RSS 2.0, Atom 1.0, and JSON feeds, normalizing articles into clean structured updates.
 * MIT License
 */

import { AgentReachResult, RSSFeedItem } from '../types';
import { ContentSanitizer } from '../security/ContentSanitizer';

export class RSSChannel {
  private static readonly TIMEOUT_MS = 12000;

  /**
   * Read and parse an RSS or Atom feed URL.
   */
  public async readFeed(feedUrl: string, limit: number = 10): Promise<AgentReachResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    let url = feedUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try {
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgentReach-RSS/1.0',
        },
        signal: AbortSignal.timeout(RSSChannel.TIMEOUT_MS),
      });

      if (resp.ok) {
        const rawBody = await resp.text();

        // 1. Try parsing JSON Feed
        if (rawBody.trim().startsWith('{')) {
          try {
            const jsonFeed = JSON.parse(rawBody);
            const feedTitle = jsonFeed.title || 'RSS Feed';
            const items: RSSFeedItem[] = (jsonFeed.items || []).slice(0, limit).map((it: any) => ({
              title: it.title || 'Untitled',
              link: it.url || it.external_url || url,
              pubDate: it.date_published,
              author: it.author?.name,
              summary: it.summary || it.content_text || '',
            }));

            return this.formatFeedResult(feedTitle, url, items, startTime);
          } catch {
            // Not JSON, continue to XML
          }
        }

        // 2. Parse XML (RSS 2.0 or Atom)
        const items = this.parseXmlFeed(rawBody, limit);
        let feedTitle = 'RSS Feed';
        const titleMatch = rawBody.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          feedTitle = titleMatch[1].trim().replace(/<[^>]+>/g, '');
        }

        if (items.length > 0) {
          return this.formatFeedResult(feedTitle, url, items, startTime);
        } else {
          // If no direct XML items matched, try Jina fallback
          errors.push('No standard RSS/Atom items found in XML payload.');
        }
      } else {
        errors.push(`HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      errors.push(`RSS fetch error: ${err?.message || String(err)}`);
    }

    // Fallback via Jina Reader
    try {
      const jinaResp = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(RSSChannel.TIMEOUT_MS),
      });
      if (jinaResp.ok) {
        const text = await jinaResp.text();
        return {
          source: 'AgentReach:RSSReader',
          platform: 'rss',
          url,
          title: `RSS Feed: ${url}`,
          content: ContentSanitizer.sanitize(text).sanitizedContent,
          retrievedAt: new Date().toISOString(),
          confidence: 0.82,
          metadata: { latencyMs: Date.now() - startTime },
          errors: errors.length > 0 ? errors : undefined,
        };
      }
    } catch (err: any) {
      errors.push(`Jina RSS fallback error: ${err?.message || String(err)}`);
    }

    return {
      source: 'AgentReach:RSS',
      platform: 'rss',
      url,
      title: 'RSS Feed Retrieval Failed',
      content: `Failed to parse RSS/Atom feed from '${url}'.`,
      retrievedAt: new Date().toISOString(),
      confidence: 0,
      errors,
    };
  }

  /**
   * Helper to parse XML strings containing RSS or Atom items.
   */
  private parseXmlFeed(xml: string, limit: number): RSSFeedItem[] {
    const items: RSSFeedItem[] = [];

    // Match RSS <item>...</item>
    const rssItemMatches = xml.matchAll(/<item[\s\S]*?<\/item>/gi);
    for (const match of rssItemMatches) {
      if (items.length >= limit) break;
      const itemXml = match[0];

      const title = this.extractXmlTag(itemXml, 'title') || 'Untitled';
      const link = this.extractXmlTag(itemXml, 'link') || '';
      const pubDate = this.extractXmlTag(itemXml, 'pubDate') || this.extractXmlTag(itemXml, 'dc:date') || '';
      const author = this.extractXmlTag(itemXml, 'author') || this.extractXmlTag(itemXml, 'dc:creator') || '';
      const description = this.extractXmlTag(itemXml, 'description') || this.extractXmlTag(itemXml, 'content:encoded') || '';

      items.push({
        title: this.cleanXmlText(title),
        link: this.cleanXmlText(link),
        pubDate: this.cleanXmlText(pubDate),
        author: this.cleanXmlText(author),
        summary: this.cleanXmlText(description),
      });
    }

    // If no RSS items, match Atom <entry>...</entry>
    if (items.length === 0) {
      const atomEntryMatches = xml.matchAll(/<entry[\s\S]*?<\/entry>/gi);
      for (const match of atomEntryMatches) {
        if (items.length >= limit) break;
        const entryXml = match[0];

        const title = this.extractXmlTag(entryXml, 'title') || 'Untitled';
        let link = '';
        const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
        if (linkMatch) {
          link = linkMatch[1];
        } else {
          link = this.extractXmlTag(entryXml, 'link') || '';
        }
        const pubDate = this.extractXmlTag(entryXml, 'published') || this.extractXmlTag(entryXml, 'updated') || '';
        const author = this.extractXmlTag(entryXml, 'name') || '';
        const summary = this.extractXmlTag(entryXml, 'summary') || this.extractXmlTag(entryXml, 'content') || '';

        items.push({
          title: this.cleanXmlText(title),
          link: this.cleanXmlText(link),
          pubDate: this.cleanXmlText(pubDate),
          author: this.cleanXmlText(author),
          summary: this.cleanXmlText(summary),
        });
      }
    }

    return items;
  }

  private extractXmlTag(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match && match[1] ? match[1].trim() : '';
  }

  private cleanXmlText(text: string): string {
    return text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatFeedResult(
    feedTitle: string,
    feedUrl: string,
    items: RSSFeedItem[],
    startTime: number
  ): AgentReachResult {
    let content = `### RSS Feed: ${feedTitle}\n` +
      `**Feed URL**: ${feedUrl}\n` +
      `**Total Articles Retrieved**: ${items.length}\n\n` +
      `---\n\n`;

    items.forEach((it, idx) => {
      content += `#### ${idx + 1}. [${it.title}](${it.link})\n` +
        (it.pubDate ? `**Published**: ${it.pubDate} ` : '') +
        (it.author ? `| **Author**: ${it.author}` : '') + '\n' +
        (it.summary ? `> ${it.summary.slice(0, 300)}...\n\n` : '\n');
    });

    const sanitized = ContentSanitizer.sanitize(content);
    return {
      source: 'AgentReach:RSSParser',
      platform: 'rss',
      url: feedUrl,
      title: `[RSS] ${feedTitle}`,
      content: sanitized.sanitizedContent,
      retrievedAt: new Date().toISOString(),
      confidence: 0.95,
      metadata: {
        itemCount: items.length,
        latencyMs: Date.now() - startTime,
      },
    };
  }
}

export const rssChannel = new RSSChannel();
