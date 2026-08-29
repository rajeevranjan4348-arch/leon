import { CrawledPage } from './types';

/**
 * ScraplingExtractor
 * HTML content extraction, link discovery, canonical URL normalization,
 * and text extraction engine.
 */
export class ScraplingExtractor {
  /**
   * Normalizes a candidate link URL relative to the base URL and eliminates query hashes.
   */
  public static normalizeUrl(rawUrl: string, baseUrl: string): string | null {
    try {
      if (!rawUrl || rawUrl.startsWith('javascript:') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:') || rawUrl.startsWith('#')) {
        return null;
      }

      const parsed = new URL(rawUrl, baseUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      // Remove hash
      parsed.hash = '';

      // Normalize trailing slash for root paths
      if (parsed.pathname === '') {
        parsed.pathname = '/';
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Parses raw HTML into a structured CrawledPage document with extracted text and links.
   */
  public static parseHtml(html: string, pageUrl: string, depth: number, status: number = 200): CrawledPage {
    const internalLinksSet = new Set<string>();
    const externalLinksSet = new Set<string>();
    const headings: Array<{ level: number; text: string }> = [];

    let currentDomain = '';
    try {
      currentDomain = new URL(pageUrl).hostname.toLowerCase();
    } catch {
      // fallback
    }

    // 1. Extract Title
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = this.cleanHtmlEntities(titleMatch[1].trim());
    }
    if (!title) {
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = this.cleanHtmlEntities(ogTitleMatch[1].trim());
      }
    }
    if (!title) {
      title = pageUrl;
    }

    // 2. Extract Description
    let description = '';
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
      description = this.cleanHtmlEntities(descMatch[1].trim());
    }

    // 3. Extract Canonical URL
    let canonicalUrl: string | undefined;
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    if (canonicalMatch && canonicalMatch[1]) {
      const norm = this.normalizeUrl(canonicalMatch[1], pageUrl);
      if (norm) canonicalUrl = norm;
    }

    // 4. Extract Headings (h1 - h4)
    const headingRegex = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null) {
      const level = parseInt(hMatch[1].substring(1), 10);
      const rawText = this.stripTags(hMatch[2]).trim();
      if (rawText.length > 0) {
        headings.push({ level, text: rawText });
      }
    }

    // 5. Extract Hyperlinks (href)
    const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let lMatch;
    while ((lMatch = linkRegex.exec(html)) !== null) {
      const rawHref = lMatch[1];
      const normalized = this.normalizeUrl(rawHref, pageUrl);
      if (normalized) {
        try {
          const linkDomain = new URL(normalized).hostname.toLowerCase();
          if (linkDomain === currentDomain || linkDomain.endsWith(`.${currentDomain}`)) {
            internalLinksSet.add(normalized);
          } else {
            externalLinksSet.add(normalized);
          }
        } catch {
          // ignore malformed
        }
      }
    }

    // 6. Extract Main Readable Body Text
    // Strip scripts, styles, noscript, svg, header, nav, footer tags
    let cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

    const plainText = this.cleanWhitespace(this.stripTags(cleanHtml));
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    // Convert headings and paragraphs to basic markdown representation
    const markdown = this.convertToMarkdown(cleanHtml);

    return {
      url: pageUrl,
      canonicalUrl,
      title,
      description,
      text: plainText,
      markdown,
      depth,
      internalLinks: Array.from(internalLinksSet),
      externalLinks: Array.from(externalLinksSet),
      headings,
      wordCount,
      fetchedAt: new Date().toISOString(),
      status,
    };
  }

  /**
   * Strips HTML tags cleanly.
   */
  public static stripTags(htmlStr: string): string {
    return htmlStr.replace(/<[^>]*>/g, ' ');
  }

  /**
   * Decodes basic HTML entities.
   */
  public static cleanHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"');
  }

  /**
   * Normalizes duplicate spaces and newlines.
   */
  public static cleanWhitespace(text: string): string {
    return this.cleanHtmlEntities(text)
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Converts clean HTML into structured markdown representation.
   */
  private static convertToMarkdown(htmlStr: string): string {
    let md = htmlStr;

    // Headers
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

    // Paragraphs and breaks
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
    md = md.replace(/<br\s*[\/]?>/gi, '\n');

    // Lists
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '\n$1\n');
    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '\n$1\n');

    // Code blocks
    md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n');
    md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

    // Strip remaining tags
    md = this.stripTags(md);
    return this.cleanWhitespace(md);
  }
}
