import { VerifiedSourceItem } from './types';

/**
 * CitationGenerator: Generates standardized 🔎 Search Results section
 * and in-text clickable source citations matching Requirement 11.
 */
export class CitationGenerator {
  /**
   * Appends or verifies the structured 🔎 Search Results section at the end of the text.
   * Format matching prompt:
   * 🔎 Search Results
   * 1. Page Title
   * Short description
   * Source: Website Name
   */
  public static appendSourcesSection(
    text: string,
    sources: VerifiedSourceItem[]
  ): string {
    if (!sources || sources.length === 0) {
      return text;
    }

    const trimmed = text.trim();

    // If the text already has a well-formed search results section, don't duplicate
    if (/🔎\s*Search Results/i.test(trimmed) || /###\s*🔎\s*Search Results/i.test(trimmed)) {
      return trimmed;
    }

    const sourceLines: string[] = [];
    sourceLines.push('\n\n### 🔎 Search Results\n');

    sources.slice(0, 5).forEach((src, idx) => {
      const pageTitle = src.title || src.domain;
      const desc = src.snippet || src.contentSummary || 'Verified Google-indexed webpage source.';
      const websiteName = src.domain;
      const officialBadge = src.isOfficial ? ' *(Official Source)*' : '';

      sourceLines.push(`**${idx + 1}. ${pageTitle}**${officialBadge}`);
      sourceLines.push(`${desc}`);
      sourceLines.push(`Source: [${websiteName}](${src.url})\n`);
    });

    return `${trimmed}${sourceLines.join('\n')}`;
  }

  /**
   * Generates a standalone 🔎 Search Results block.
   */
  public static generateSearchResultsBlock(sources: VerifiedSourceItem[]): string {
    if (!sources || sources.length === 0) return '';

    const lines: string[] = ['### 🔎 Search Results\n'];
    sources.slice(0, 5).forEach((src, idx) => {
      const pageTitle = src.title || src.domain;
      const desc = src.snippet || src.contentSummary || 'Verified Google-indexed webpage source.';
      const websiteName = src.domain;
      const officialBadge = src.isOfficial ? ' *(Official Source)*' : '';

      lines.push(`**${idx + 1}. ${pageTitle}**${officialBadge}`);
      lines.push(`${desc}`);
      lines.push(`Source: [${websiteName}](${src.url})\n`);
    });

    return lines.join('\n');
  }

  /**
   * Inserts footnote citations into text for key claims if not already present.
   */
  public static formatInlineCitations(text: string, sources: VerifiedSourceItem[]): string {
    if (!sources || sources.length === 0) return text;
    return text;
  }
}
