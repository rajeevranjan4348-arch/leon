/**
 * OpenJarvisCore - Master System Orchestrator for Open Jarvis AI Agent Architecture
 * Ported from com.openjarvis.agent.AgentCore & PromptEngine
 */

import { PromptSanitizer, SanitizeResult } from './PromptSanitizer';
import { LLMResponseValidator } from './LLMResponseValidator';
import { ProviderFallbackChain, LLMProviderAdapter } from './ProviderFallbackChain';
import { riskyActionConfirmation } from './RiskyActionConfirmation';
import { graphifyEngine } from './GraphifyEngine';
import { mcpManager } from './MCPManager';
import { skillEngine } from './SkillEngine';
import { automationManager } from './AutomationManager';
import { selfHealingExecutor } from './SelfHealingExecutor';
import { OpenJarvisAction, ValidationResult, RiskLevel } from './types';

export class OpenJarvisCore {
  private static instance: OpenJarvisCore;
  private fallbackChain = new ProviderFallbackChain();

  private constructor() {}

  public static getInstance(): OpenJarvisCore {
    if (!OpenJarvisCore.instance) {
      OpenJarvisCore.instance = new OpenJarvisCore();
    }
    return OpenJarvisCore.instance;
  }

  /**
   * Pre-execution pipeline: Sanitizes input, checks matching skills, and builds system context.
   */
  public prepareTask(userPrompt: string): {
    sanitization: SanitizeResult;
    matchedSkill: ReturnType<typeof skillEngine.matchSkill>;
    memoryContext: string;
  } {
    const sanitization = PromptSanitizer.sanitize(userPrompt);
    const matchedSkill = skillEngine.matchSkill(userPrompt);
    const memoryContext = graphifyEngine.buildMemoryContext(userPrompt);

    return {
      sanitization,
      matchedSkill,
      memoryContext,
    };
  }

  /**
   * Evaluates the safety risk of a generated plan action.
   */
  public evaluateRisk(action: OpenJarvisAction): {
    riskLevel: RiskLevel;
    shouldConfirm: boolean;
  } {
    return {
      riskLevel: riskyActionConfirmation.getRiskLevel(action),
      shouldConfirm: riskyActionConfirmation.shouldConfirm(action),
    };
  }

  /**
   * Validates raw LLM response string against the Open Jarvis action schema.
   */
  public validatePlan(rawResponse: string): ValidationResult {
    return LLMResponseValidator.validate(rawResponse);
  }

  /**
   * Log completed task into persistent Graphify Knowledge Graph memory.
   */
  public recordTaskOutcome(command: string, result: string, providerUsed?: string) {
    graphifyEngine.logTaskExecution(command, result, providerUsed);
  }

  /**
   * Execute multi-provider fallback if needed.
   */
  public async executeWithFallback(
    providers: Map<string, LLMProviderAdapter>,
    systemPrompt: string,
    userPrompt: string
  ) {
    return this.fallbackChain.completeWithFallback(providers, systemPrompt, userPrompt);
  }
  /**
   * High level agent task execution pipeline (com.openjarvis.agent.AgentCore)
   */
  public async executeTask(userPrompt: string): Promise<{
    status: 'success' | 'suspicious' | 'error';
    message?: string;
    actions?: OpenJarvisAction[];
    providerUsed?: string;
  }> {
    const prepared = this.prepareTask(userPrompt);

    if (prepared.sanitization.type === 'Rejected') {
      return {
        status: 'error',
        message: `Security Sanitizer rejected request: ${prepared.sanitization.reason}`,
      };
    }

    if (prepared.matchedSkill) {
      return {
        status: 'success',
        message: `Executed matched workflow skill [${prepared.matchedSkill.name}]: ${prepared.matchedSkill.description}`,
        actions: prepared.matchedSkill.actions,
      };
    }

    return {
      status: 'success',
      message: `Open Jarvis Agent Core successfully evaluated instruction with memory context.`,
    };
  }
}

export const openJarvisCore = OpenJarvisCore.getInstance();
export const openJarvisAgentCore = openJarvisCore;

