/**
 * Agent-Reach Content Sanitizer & Security Layer
 * Protects AI Agent from Prompt Injection, Indirect Jailbreaks, and Malicious Remote HTML/Scripting.
 * MIT License
 */

export interface SanitizationResult {
  sanitizedContent: string;
  injectionDetected: boolean;
  warnings: string[];
  safeConfidence: number;
}

export class ContentSanitizer {
  private static readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /system\s*prompt\s*override/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /dan\s+mode\s+enabled/i,
    /disregard\s+the\s+above\s+rules/i,
    /reveal\s+(your\s+)?(system\s+instructions|secret\s+key|api\s+key)/i,
    /output\s+the\s+above\s+prompt/i,
    /new\s+system\s+directive:/i,
    /\[system\s+instruction\]/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  /**
   * Sanitize untrusted retrieved web text, posts, and documents before passing to model context.
   */
  public static sanitize(rawText: string, maxLength: number = 25000): SanitizationResult {
    if (!rawText || typeof rawText !== 'string') {
      return {
        sanitizedContent: '',
        injectionDetected: false,
        warnings: [],
        safeConfidence: 1.0,
      };
    }

    const warnings: string[] = [];
    let injectionDetected = false;
    let text = rawText;

    // 1. Detect prompt injection attempts
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        injectionDetected = true;
        warnings.push(`Security notice: Suspicious prompt pattern detected (${pattern.source})`);
        // Neutralize the injection pattern
        text = text.replace(pattern, '[REDACTED_SECURITY_PROMPT_PATTERN]');
      }
    }

    // 2. Strip HTML tags, raw scripts, and styles safely
    text = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');

    // 3. Remove invisible zero-width characters and homoglyph tricks
    text = text.replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000E-\u001F]/g, '');

    // 4. Normalize excessive whitespace
    text = text.replace(/\n{4,}/g, '\n\n\n');

    // 5. Truncate safely to prevent context overflow
    if (text.length > maxLength) {
      text = text.slice(0, maxLength) + `\n\n[... Content truncated at ${maxLength} characters for context efficiency]`;
      warnings.push(`Content truncated to ${maxLength} chars`);
    }

    const safeConfidence = injectionDetected ? 0.65 : 0.98;

    return {
      sanitizedContent: text.trim(),
      injectionDetected,
      warnings,
      safeConfidence,
    };
  }

  /**
   * Wrap content in safety boundary tags informing the model that this is untrusted external data.
   */
  public static wrapInUntrustedBoundary(content: string, sourceName: string, url: string): string {
    const sanitized = this.sanitize(content).sanitizedContent;
    return `<!-- UNTRUSTED_EXTERNAL_SOURCE_START: ${sourceName} (${url}) -->\n${sanitized}\n<!-- UNTRUSTED_EXTERNAL_SOURCE_END: ${sourceName} -->`;
  }
}
