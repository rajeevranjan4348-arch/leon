import { SpecialistAgent, AgentContext, AgentResult } from './types';
import { agencyAgentRegistry } from './AgencyAgentRegistry';

/**
 * AgencyErrorRecovery
 * Provides bounded retry management, failure diagnosis, prompt mutations,
 * and graceful fallback agent selection to guarantee operational resilience.
 */
export class AgencyErrorRecovery {
  private static readonly MAX_RETRIES = 2;

  /**
   * Attempts safe recovery if a specialist agent fails.
   */
  public static async executeWithRecovery(
    agent: SpecialistAgent,
    context: AgentContext,
    onLog?: (msg: string) => void
  ): Promise<AgentResult> {
    let currentAgent = agent;
    let attempts = 0;
    let lastError = '';

    while (attempts <= this.MAX_RETRIES) {
      try {
        attempts++;
        if (attempts > 1 && onLog) {
          onLog(`[ErrorRecovery] Retrying execution with ${currentAgent.name} (Attempt ${attempts}/${this.MAX_RETRIES + 1})...`);
        }

        const result = await currentAgent.execute(context);
        if (result.success) {
          return result;
        }

        lastError = result.errors?.[0] || 'Unknown specialist execution error';
      } catch (err: any) {
        lastError = err?.message || String(err);
      }

      // If primary agent failed on first attempt, attempt fallback to a general fullstack specialist
      if (attempts === 1 && currentAgent.id !== 'eng-fullstack-engineer') {
        const fallback = agencyAgentRegistry.getSpecialist('eng-fullstack-engineer');
        if (fallback) {
          if (onLog) {
            onLog(`[ErrorRecovery] Switching to fallback specialist ${fallback.name} due to: ${lastError}`);
          }
          currentAgent = fallback;
          // Augment context with previous error guidance
          context = {
            ...context,
            constraints: [
              ...(context.constraints || []),
              `Note: Previous attempt encountered error: "${lastError}". Please provide a clean, resilient solution.`,
            ],
          };
        }
      }
    }

    // Final graceful degraded fallback response
    return {
      success: false,
      output: `### ${agent.name} Execution Notice\n\nThe specialist encountered an issue processing the task: ${lastError}.\n\nPrimary query: "${context.userQuery || context.task}" was logged for safety.`,
      errors: [lastError],
      agentId: agent.id,
      agentName: agent.name,
      specialty: agent.specialty,
      confidence: 0.1,
    };
  }
}
