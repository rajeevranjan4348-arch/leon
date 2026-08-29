/**
 * LLMResponseValidator - Open Jarvis Action Plan Validator & Repair Engine
 * Ported from com.openjarvis.agent.LLMResponseValidator
 */

import { OpenJarvisAction, ValidationResult } from './types';

export class LLMResponseValidator {
  private static knownActions = new Set([
    'open_app',
    'tap',
    'tap_coords',
    'long_press',
    'type',
    'clear_type',
    'swipe',
    'scroll',
    'press_back',
    'press_home',
    'press_recents',
    'wait_for',
    'screenshot',
    'read_screen',
    'ai_prompt',
    'mcp_call',
    'reply_notification',
    'read_clipboard',
    'write_clipboard',
    'highlight_element',
    'error',
  ]);

  public static validate(rawResponse: string): ValidationResult {
    const errors: string[] = [];

    let clean = rawResponse
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    if (!clean.startsWith('[') && !clean.startsWith('{')) {
      errors.push('Response is not valid JSON');
      return { isValid: false, actions: [], errors, wasRepaired: false };
    }

    let parsed: any[];
    try {
      if (clean.startsWith('{')) {
        parsed = [JSON.parse(clean)];
      } else {
        parsed = JSON.parse(clean);
      }
    } catch (e: any) {
      errors.push(`Invalid JSON format: ${e.message}`);
      return { isValid: false, actions: [], errors, wasRepaired: false };
    }

    if (!Array.isArray(parsed)) {
      errors.push('Response did not parse into an array of actions');
      return { isValid: false, actions: [], errors, wasRepaired: false };
    }

    const actions: OpenJarvisAction[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') {
        errors.push(`Item ${i} is not a valid JSON object`);
        continue;
      }

      const actionType = item.action || '';
      if (!actionType) {
        errors.push(`Item ${i} missing 'action' field`);
        continue;
      }

      if (!this.knownActions.has(actionType)) {
        errors.push(`Unknown action type: ${actionType} — skipping`);
        continue;
      }

      actions.push({
        action: item.action,
        packageName: item.package || item.packageName || undefined,
        label: item.label || undefined,
        text: item.text || undefined,
        value: item.value || undefined,
        hint: item.hint || undefined,
        direction: item.direction || undefined,
        x: typeof item.x === 'number' ? item.x : undefined,
        y: typeof item.y === 'number' ? item.y : undefined,
        distance: item.distance || undefined,
        timeoutMs: typeof item.timeout_ms === 'number' ? item.timeout_ms : 3000,
        message: item.message || undefined,
        prompt: item.prompt || undefined,
        outputKey: item.outputKey || undefined,
      });
    }

    if (actions.length > 50) {
      errors.push(`Suspiciously long action plan (${actions.length} steps) — capped at 50`);
      return {
        isValid: true,
        actions: actions.slice(0, 50),
        errors,
        wasRepaired: true,
      };
    }

    return {
      isValid: actions.length > 0,
      actions,
      errors,
      wasRepaired: errors.length > 0 && actions.length > 0,
    };
  }
}
