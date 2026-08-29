/**
 * PromptSanitizer - Open Jarvis System Security Engine
 * Ported from com.openjarvis.agent.PromptSanitizer
 */

export type SanitizeResult =
  | { type: 'Clean'; text: string }
  | { type: 'Suspicious'; sanitized: string; warning: string }
  | { type: 'Rejected'; reason: string };

export class PromptSanitizer {
  private static injectionPatterns: RegExp[] = [
    /ignore (all |previous |above )?instructions/i,
    /you are now/i,
    /new instructions/i,
    /system prompt/i,
    /disregard/i,
    /pretend you/i,
    /act as/i,
    /jailbreak/i,
    /DAN mode/i,
  ];

  private static MAX_COMMAND_LENGTH = 2000;

  public static sanitize(input: string): SanitizeResult {
    const trimmed = input.trim();

    if (!trimmed) {
      return { type: 'Rejected', reason: 'Command cannot be empty' };
    }

    if (trimmed.length > this.MAX_COMMAND_LENGTH) {
      return {
        type: 'Rejected',
        reason: `Command too long. Max ${this.MAX_COMMAND_LENGTH} characters.`,
      };
    }

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(trimmed)) {
        return {
          type: 'Suspicious',
          sanitized: trimmed,
          warning: 'Unusual instruction pattern detected',
        };
      }
    }

    // Strip non-printable ASCII control characters
    const clean = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    return { type: 'Clean', text: clean };
  }
}
