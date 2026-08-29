/**
 * PrivacyAlign Engine
 * 
 * Implements ServiceNow PrivacyAlign (https://github.com/ServiceNow/PrivacyAlign)
 * privacy evaluation, personal-information detection (PII), data-minimization,
 * and privacy-leakage prevention rules across:
 * - External Tool Arguments & API Payloads
 * - Agent Memory Storage (Letta, OpenViking, Ruflo, Agent Memory)
 * - Browser Agent & Android Control Actions
 * - Output Sanitization & User Communications
 */

export interface PIIEntity {
  type: 'SSN' | 'CREDIT_CARD' | 'API_KEY' | 'BEARER_TOKEN' | 'PASSWORD' | 'EMAIL' | 'PHONE' | 'COORDINATES' | 'PASSPORT';
  value: string;
  index: number;
  length: number;
}

export interface PrivacyEvaluationResult {
  isSafe: boolean;
  containsPII: boolean;
  detectedEntities: PIIEntity[];
  sanitizedText: string;
  minimizationApplied: boolean;
  riskScore: number; // 0.0 (perfectly safe) to 1.0 (critical leak risk)
  recommendation: 'PASS' | 'REDACT' | 'BLOCK';
}

export class PrivacyAlignEngine {
  private static instance: PrivacyAlignEngine;

  private constructor() {}

  public static getInstance(): PrivacyAlignEngine {
    if (!PrivacyAlignEngine.instance) {
      PrivacyAlignEngine.instance = new PrivacyAlignEngine();
    }
    return PrivacyAlignEngine.instance;
  }

  /**
   * PII & Secret Regex Patterns
   */
  private patterns = {
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    API_KEY: /\b(?:AIzaSy[A-Za-z0-9_-]{33}|sk-[A-Za-z0-9]{32,48}|ghp_[A-Za-z0-9]{36}|key-[0-9a-zA-Z]{32})\b/g,
    BEARER_TOKEN: /\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*\b/gi,
    PASSWORD: /\b(?:password|passwd|pwd|secret_key|client_secret)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/gi,
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    PHONE: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    COORDINATES: /\b[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)\b/g,
    PASSPORT: /\b[A-PR-WY][0-9]{7,8}\b/g,
  };

  /**
   * Evaluates text for personal information leakage and applies redactions.
   */
  public evaluateAndSanitize(text: string, context: 'tool_arg' | 'memory' | 'output' | 'browser' | 'android' = 'output'): PrivacyEvaluationResult {
    if (!text || typeof text !== 'string') {
      return {
        isSafe: true,
        containsPII: false,
        detectedEntities: [],
        sanitizedText: '',
        minimizationApplied: false,
        riskScore: 0,
        recommendation: 'PASS',
      };
    }

    const detectedEntities: PIIEntity[] = [];
    let sanitizedText = text;
    let riskScore = 0;

    // 1. Detect SSN
    sanitizedText = sanitizedText.replace(this.patterns.SSN, (match, offset) => {
      detectedEntities.push({ type: 'SSN', value: match, index: offset, length: match.length });
      riskScore += 0.9;
      return '<REDACTED_SSN>';
    });

    // 2. Detect Credit Card
    sanitizedText = sanitizedText.replace(this.patterns.CREDIT_CARD, (match, offset) => {
      detectedEntities.push({ type: 'CREDIT_CARD', value: match, index: offset, length: match.length });
      riskScore += 0.9;
      return '<REDACTED_CARD>';
    });

    // 3. Detect API Keys & Secrets
    sanitizedText = sanitizedText.replace(this.patterns.API_KEY, (match, offset) => {
      detectedEntities.push({ type: 'API_KEY', value: match, index: offset, length: match.length });
      riskScore += 1.0;
      return '<REDACTED_API_KEY>';
    });

    // 4. Detect Bearer Tokens
    sanitizedText = sanitizedText.replace(this.patterns.BEARER_TOKEN, (match, offset) => {
      detectedEntities.push({ type: 'BEARER_TOKEN', value: match, index: offset, length: match.length });
      riskScore += 1.0;
      return 'Bearer <REDACTED_AUTH_TOKEN>';
    });

    // 5. Detect Passwords
    sanitizedText = sanitizedText.replace(this.patterns.PASSWORD, (match, p1, offset) => {
      detectedEntities.push({ type: 'PASSWORD', value: match, index: offset, length: match.length });
      riskScore += 0.95;
      return match.replace(p1, '<REDACTED_PASSWORD>');
    });

    // 6. Detect Coordinates (if context is external tool or browser)
    if (context === 'browser' || context === 'tool_arg') {
      sanitizedText = sanitizedText.replace(this.patterns.COORDINATES, (match, offset) => {
        detectedEntities.push({ type: 'COORDINATES', value: match, index: offset, length: match.length });
        riskScore += 0.4;
        return '<MINIMIZED_LOCATION>';
      });
    }

    const containsPII = detectedEntities.length > 0;
    const normalizedRisk = Math.min(1.0, riskScore);

    let recommendation: 'PASS' | 'REDACT' | 'BLOCK' = 'PASS';
    if (normalizedRisk >= 0.85 && (context === 'browser' || context === 'tool_arg')) {
      recommendation = 'BLOCK';
    } else if (containsPII) {
      recommendation = 'REDACT';
    }

    return {
      isSafe: !containsPII || recommendation !== 'BLOCK',
      containsPII,
      detectedEntities,
      sanitizedText,
      minimizationApplied: containsPII,
      riskScore: normalizedRisk,
      recommendation,
    };
  }

  /**
   * Applies data minimization to generic object payloads before sending to tools or APIs.
   */
  public minimizePayload<T extends Record<string, any>>(payload: T): T {
    if (!payload || typeof payload !== 'object') return payload;

    const copy = JSON.parse(JSON.stringify(payload));

    const sanitizeObject = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
          const evalRes = this.evaluateAndSanitize(val, 'tool_arg');
          if (evalRes.containsPII) {
            obj[key] = evalRes.sanitizedText;
          }
        } else if (typeof val === 'object' && val !== null) {
          sanitizeObject(val);
        }
      }
    };

    sanitizeObject(copy);
    return copy;
  }
}

export const privacyAlignEngine = PrivacyAlignEngine.getInstance();
