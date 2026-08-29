import { NormalizedInput } from './types';

export class InputNormalizer {
  /**
   * Cleans and normalizes raw input strings.
   * Strips zero-width characters, excessive whitespace, normalizes smart quotes/dashes,
   * but strictly preserves code syntax and case sensitivity where appropriate.
   */
  public static normalize(rawInput: string): NormalizedInput {
    if (!rawInput) {
      return { raw: '', cleaned: '', normalized: '', wordCount: 0 };
    }

    const raw = String(rawInput);

    // 1. Remove zero-width characters and invisible control characters (except tabs and newlines)
    let cleaned = raw
      .replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // 2. Normalize smart quotes, dashes, and unicode apostrophes
    cleaned = cleaned
      .replace(/[\u2018\u2019\u201A\u201B\u02BC\u02B9]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014\u2015]/g, '-')
      .replace(/\u2026/g, '...');

    // 3. Trim edge whitespaces and collapse multi-spaces except within code blocks
    let normalized = cleaned;
    if (!normalized.includes('```')) {
      normalized = normalized
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
    } else {
      normalized = normalized.trim();
    }

    // 4. Calculate word count
    const words = normalized ? normalized.split(/\s+/).filter(Boolean) : [];

    return {
      raw,
      cleaned,
      normalized,
      wordCount: words.length,
    };
  }
}
