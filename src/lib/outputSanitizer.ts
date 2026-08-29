/**
 * Output Sanitization Engine
 *
 * Ensures system internals, tool calls, raw JSON, card tags, package-resolution logs,
 * and Android intent logs NEVER enter visible assistant chat text or stored chat history.
 */

export interface SanitizedContent {
  cleanText: string;
  hasInternalDataRemoved: boolean;
}

/**
 * Strips internal system markers, raw intents, debug logs, and tool execution traces
 * from user-facing assistant text.
 */
export function sanitizeAssistantText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;

  // 1. Remove Card Marker Tags (These are rendered via React Card Components, not raw text)
  sanitized = sanitized.replace(/\[\[APP_LAUNCHER_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[APP_LAUNCH_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[APP_ACTION_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[COMM_ACTION_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[WHATSAPP_ACTION_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[SUPPORT_BOOKING_CARD:[^\]]+\]\]/gi, '');
  sanitized = sanitized.replace(/\[\[SUPPORT_TROUBLESHOOT_CARD:[^\]]+\]\]/gi, '');

  // 2. Remove Android Intent Strings & Technical Package Resolution Logs
  sanitized = sanitized.replace(/Dispatched Android intent for [^\n\.]+(\.)?/gi, '');
  sanitized = sanitized.replace(/Android Native Intent\s*\(`[^`]+`\)/gi, '');
  sanitized = sanitized.replace(/- \*\*Package ID:\*\*\s*`[^`]+`/gi, '');
  sanitized = sanitized.replace(/- \*\*Execution Target:\*\*\s*[^\n]+/gi, '');
  sanitized = sanitized.replace(/- \*\*Execution Mode:\*\*\s*[^\n]+/gi, '');
  sanitized = sanitized.replace(/- \*\*Launch Status:\*\*\s*[^\n]+/gi, '');
  sanitized = sanitized.replace(/- \*\*Status:\*\*\s*[^\n]+/gi, '');
  sanitized = sanitized.replace(/intent:\/\/[^\s#]+#Intent;[^;\n]+;end/gi, '');

  // 3. Remove Raw JSON Tool Call Blocks & Function Call Tokens
  sanitized = sanitized.replace(/\{\s*"name"\s*:\s*"[a-zA-Z0-9_]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/g, '');
  sanitized = sanitized.replace(/\[(?:tool_call|function_call|function_result|debug_log|internal_metadata):[\s\S]*?\]/gi, '');

  // 4. Clean up redundant Markdown bullets or empty headers left behind
  sanitized = sanitized.replace(/^###\s*(?:App Opening Executed|App Operating Executed|App Launcher Triggered|In-App Deep Search Executed):?\s*[^\n]*\n+/gmi, '');

  // 5. Trim leading/trailing blank lines and collapse triple newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();

  return sanitized;
}

/**
 * Extract clean display text and flag if internal markers were present.
 */
export function processAssistantOutput(text: string): SanitizedContent {
  const cleanText = sanitizeAssistantText(text);
  const hasInternalDataRemoved = cleanText.length !== (text || '').length;

  return {
    cleanText,
    hasInternalDataRemoved,
  };
}
