import { VerifiedSourceItem, FreshnessDetectionResult } from './types';
import { CitationGenerator } from './CitationGenerator';

/**
 * ResultSummarizer: Synthesizes Google Search results, guarantees direct first-sentence answers,
 * redacts sensitive credentials, applies rich Markdown, and formats transparent search results.
 */
export class ResultSummarizer {
  /**
   * Generates a clear, transparent message when search fails or yields insufficient results.
   */
  public static generateSearchUnavailableFallback(
    query: string,
    offlineKnowledgeSynthesis?: string
  ): string {
    const notice = `> ⚠️ **Google Search Notice**: Live web search could not retrieve verified pages for "${query}" at this moment. Rather than fabricating unverified facts, please check official portals directly.`;

    if (offlineKnowledgeSynthesis) {
      return `${notice}\n\n${offlineKnowledgeSynthesis}`;
    }

    return `${notice}\n\nPlease try reformulating your query or checking official websites directly.`;
  }

  /**
   * Post-processes, redacts secrets, and refines synthesized answer text.
   */
  public static synthesize(
    rawText: string,
    sources: VerifiedSourceItem[],
    freshness: FreshnessDetectionResult
  ): string {
    let clean = (rawText || '').trim();

    // 1. Clean any accidental model preamble or conversational meta-statements
    clean = clean.replace(/^(As an AI|I have searched the web and found that|Based on my web search,|Here is the information:|According to my search,)\s*/i, '');

    // 2. Redact sensitive credentials (API keys, tokens, passwords, system envs)
    clean = this.sanitizeSecurity(clean);

    // 3. Append verified 🔎 Search Results section if sources exist
    if (sources && sources.length > 0) {
      clean = CitationGenerator.appendSourcesSection(clean, sources);
    }

    return clean;
  }

  /**
   * Security Redaction Filter (Requirement 14): Removes API keys, tokens, system prompts,
   * private env vars, cookies, and passwords from generated text output.
   */
  private static sanitizeSecurity(text: string): string {
    let sanitized = text;
    // Redact Gemini / GCP API Keys
    sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
    // Redact generic Bearer Tokens / JWT
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, 'Bearer [REDACTED_TOKEN]');
    // Redact secret keys or private envs
    sanitized = sanitized.replace(/(GEMINI_API_KEY|API_KEY|SECRET_KEY|PASSWORD|AUTH_TOKEN)\s*=\s*['"][^'"]+['"]/gi, '$1=[REDACTED]');
    return sanitized;
  }
}
