/**
 * OpenJarvisAgentCore - System AI Agent Core Orchestrator
 * Ported from com.openjarvis.agent.AgentCore
 */

import { PromptSanitizer } from './PromptSanitizer';
import { LLMResponseValidator } from './LLMResponseValidator';
import { ProviderFallbackChain, LLMProviderAdapter } from './ProviderFallbackChain';
import { riskyActionConfirmation } from './RiskyActionConfirmation';
import { graphifyEngine } from './GraphifyEngine';
import { skillEngine } from './SkillEngine';
import { selfHealingExecutor } from './SelfHealingExecutor';
import { OpenJarvisAction, ValidationResult } from './types';

export interface AgentExecutionState {
  status: 'idle' | 'sanitizing' | 'analyzing' | 'validating' | 'executing' | 'healing' | 'completed' | 'error';
  message?: string;
  actions?: OpenJarvisAction[];
  validation?: ValidationResult;
  providerUsed?: string;
}

export class OpenJarvisAgentCore {
  private static instance: OpenJarvisAgentCore;
  private fallbackChain = new ProviderFallbackChain();
  private providersMap = new Map<string, LLMProviderAdapter>();

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): OpenJarvisAgentCore {
    if (!OpenJarvisAgentCore.instance) {
      OpenJarvisAgentCore.instance = new OpenJarvisAgentCore();
    }
    return OpenJarvisAgentCore.instance;
  }

  public registerProvider(name: string, adapter: LLMProviderAdapter) {
    this.providersMap.set(name, adapter);
  }

  private registerDefaultProviders() {
    // Default fallback adapter using local environment
    this.registerProvider('DefaultEngine', {
      name: 'DefaultEngine',
      async complete(systemPrompt, userPrompt) {
        // Simple default JSON responder if no remote LLM configured
        return JSON.stringify([
          { action: 'read_screen' },
          { action: 'ai_prompt', prompt: userPrompt },
        ]);
      },
    });
  }

  /**
   * Main pipeline execution handling command analysis, security, context injection, validation & healing
   */
  public async executeTask(
    command: string,
    onStateChange?: (state: AgentExecutionState) => void
  ): Promise<AgentExecutionState> {
    const notify = (st: AgentExecutionState) => onStateChange?.(st);

    // 1. Prompt Sanitization & Injection Defense
    notify({ status: 'sanitizing', message: 'Sanitizing input command...' });
    const sanitizeResult = PromptSanitizer.sanitize(command);

    if (sanitizeResult.type === 'Rejected') {
      const errState: AgentExecutionState = {
        status: 'error',
        message: `Command rejected by security filter: ${sanitizeResult.reason}`,
      };
      notify(errState);
      return errState;
    }

    const cleanCommand =
      sanitizeResult.type === 'Suspicious' ? sanitizeResult.sanitized : sanitizeResult.text;

    // 2. Skill Engine Check
    const matchedSkill = skillEngine.matchSkill(cleanCommand);
    if (matchedSkill) {
      graphifyEngine.logTaskExecution(cleanCommand, 'Skill Execution', 'SkillEngine');
      const skillState: AgentExecutionState = {
        status: 'completed',
        message: `Executing skill: ${matchedSkill.name}`,
        actions: matchedSkill.actions,
        providerUsed: 'SkillEngine',
      };
      notify(skillState);
      return skillState;
    }

    // 3. Graphify Memory Context Enrichment
    notify({ status: 'analyzing', message: 'Retrieving graphify memory context...' });
    const memoryContext = graphifyEngine.buildMemoryContext(cleanCommand);

    // 4. Build Agent System Prompt
    const systemPrompt = `You are Open Jarvis system agent.
${memoryContext}

User command: "${cleanCommand}"

Respond ONLY with a valid JSON array of Action objects. No markdown fences.
Actions allowed: open_app, tap, type, swipe, scroll, wait_for, screenshot, read_screen, ai_prompt, error.`;

    // 5. LLM Provider Execution with Fallback Chain
    notify({ status: 'analyzing', message: 'Evaluating with multi-provider fallback chain...' });
    const fallbackRes = await this.fallbackChain.completeWithFallback(
      this.providersMap,
      systemPrompt,
      cleanCommand
    );

    if (!fallbackRes.success || !fallbackRes.result) {
      const errState: AgentExecutionState = {
        status: 'error',
        message: fallbackRes.error || 'All AI providers failed.',
      };
      notify(errState);
      return errState;
    }

    // 6. Response Validation & Repair
    notify({ status: 'validating', message: 'Validating and repairing LLM response...' });
    const validation = LLMResponseValidator.validate(fallbackRes.result);

    if (!validation.isValid) {
      const errState: AgentExecutionState = {
        status: 'error',
        message: `Response validation failed: ${validation.errors.join(', ')}`,
        validation,
      };
      notify(errState);
      return errState;
    }

    // 7. Risky Action Safety Check
    const riskyAction = validation.actions.find((a) => riskyActionConfirmation.shouldConfirm(a));
    if (riskyAction) {
      const preview = riskyActionConfirmation.buildPreview(riskyAction);
      console.warn(`Risky action detected (${preview.riskLevel}): ${preview.summary}`);
    }

    // 8. Log Execution into Graphify Memory
    graphifyEngine.logTaskExecution(cleanCommand, 'Success', fallbackRes.providerUsed);

    const successState: AgentExecutionState = {
      status: 'completed',
      message: `Task plan generated successfully via ${fallbackRes.providerUsed}.`,
      actions: validation.actions,
      validation,
      providerUsed: fallbackRes.providerUsed,
    };
    notify(successState);
    return successState;
  }
}

export const openJarvisAgentCore = OpenJarvisAgentCore.getInstance();
