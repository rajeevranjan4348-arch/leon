import {
  AgentContext,
  AgentResult,
  AgencyExecutionSummary,
  RoutingDecision,
  TaskDecompositionPlan
} from './types';
import { agencyAgentRegistry } from './AgencyAgentRegistry';
import { AgencyAgentRouter } from './AgencyAgentRouter';
import { AgencyTaskDecomposer } from './AgencyTaskDecomposer';
import { AgencyVerificationEngine } from './AgencyVerificationEngine';
import { AgencyErrorRecovery } from './AgencyErrorRecovery';
import { callGeminiAPI } from '../../gemini';

export interface AgencyExecuteOptions {
  conversationTopic?: string;
  memoryContext?: string;
  requirements?: string[];
  constraints?: string[];
  tools?: string[];
  onLog?: (msg: string) => void;
  onProgress?: (progress: { stage: string; currentAgent?: string; percent: number }) => void;
}

/**
 * AgencyOrchestrator
 * Master coordinator for the Agency Agents architecture.
 * Translates incoming queries into internal specialist assignments, multi-agent collaboration,
 * safety verification, and unified final answer delivery.
 */
export class AgencyOrchestrator {
  private static instance: AgencyOrchestrator;

  public static getInstance(): AgencyOrchestrator {
    if (!AgencyOrchestrator.instance) {
      AgencyOrchestrator.instance = new AgencyOrchestrator();
    }
    return AgencyOrchestrator.instance;
  }

  /**
   * Executes a user request through the Agency Agents specialist architecture.
   */
  public async execute(
    userQuery: string,
    options?: AgencyExecuteOptions
  ): Promise<AgencyExecutionSummary> {
    const startTime = Date.now();
    const cleanQuery = (userQuery || '').trim();
    const onLog = options?.onLog;
    const onProgress = options?.onProgress;

    // 1. Route Query to Domain Specialists
    onProgress?.({ stage: 'Routing query to internal specialist...', percent: 10 });
    const route: RoutingDecision = AgencyAgentRouter.route(cleanQuery, options?.conversationTopic);
    const primaryAgent = agencyAgentRegistry.getSpecialist(route.primaryAgentId);

    if (onLog) {
      onLog(`[AgencyRouter] Assigned primary specialist "${primaryAgent?.name || route.primaryAgentId}" (${route.division}) - ${route.reasoning}`);
    }

    // 2. Task Decomposition
    onProgress?.({ stage: 'Decomposing task into specialist subtasks...', percent: 25 });
    const plan: TaskDecompositionPlan = AgencyTaskDecomposer.plan(cleanQuery, route);

    const executedResults: AgentResult[] = [];
    const priorContextResults: unknown[] = [];
    const allCollectedSources: Array<{ title: string; url: string }> = [];

    // 3. Multi-Agent Execution Pipeline
    const totalSubtasks = plan.subtasks.length;
    for (let i = 0; i < totalSubtasks; i++) {
      const subtask = plan.subtasks[i];
      const agent = agencyAgentRegistry.getSpecialist(subtask.assignedAgentId) || primaryAgent!;

      onProgress?.({
        stage: `Executing ${agent.name}...`,
        currentAgent: agent.name,
        percent: 30 + Math.round(((i + 1) / totalSubtasks) * 50),
      });

      if (onLog) {
        onLog(`[AgencyPipeline] (${i + 1}/${totalSubtasks}) Running ${agent.name} on "${subtask.title}"`);
      }

      const taskContext: AgentContext = {
        task: subtask.description,
        userQuery: cleanQuery,
        intent: plan.intent,
        requirements: options?.requirements || [],
        constraints: options?.constraints || [],
        memoryContext: options?.memoryContext,
        previousResults: [...priorContextResults],
        tools: options?.tools || route.suggestedTools,
        conversationTopic: options?.conversationTopic,
      };

      const result = await AgencyErrorRecovery.executeWithRecovery(agent, taskContext, onLog);
      executedResults.push(result);
      priorContextResults.push({
        agentId: agent.id,
        agentName: agent.name,
        specialty: agent.specialty,
        output: result.output,
      });

      if (result.sources && result.sources.length > 0) {
        result.sources.forEach(s => allCollectedSources.push({ title: s.title, url: s.url }));
      }
    }

    // 4. Verification & Security Audit
    onProgress?.({ stage: 'Auditing outputs and security guardrails...', percent: 85 });
    const baseContext: AgentContext = {
      task: cleanQuery,
      userQuery: cleanQuery,
      intent: plan.intent,
      requirements: options?.requirements || [],
      constraints: options?.constraints || [],
      memoryContext: options?.memoryContext,
    };

    const verificationReport = AgencyVerificationEngine.verify(baseContext, executedResults);

    if (onLog) {
      onLog(`[AgencyVerifier] Score: ${verificationReport.overallScore}/100, Approved: ${verificationReport.isApproved}`);
    }

    // 5. Final Response Synthesis
    onProgress?.({ stage: 'Synthesizing unified response...', percent: 95 });
    let finalAnswer = '';

    if (executedResults.length === 1) {
      finalAnswer = typeof executedResults[0].output === 'string'
        ? executedResults[0].output
        : JSON.stringify(executedResults[0].output, null, 2);
    } else {
      finalAnswer = await this.synthesizeMultiAgentResults(cleanQuery, executedResults);
    }

    finalAnswer = AgencyVerificationEngine.sanitizeFinalText(finalAnswer);

    onProgress?.({ stage: 'Completed', percent: 100 });

    return {
      query: cleanQuery,
      primaryAgent: primaryAgent?.name || route.primaryAgentId,
      collaboratingAgents: plan.subtasks.map(st => st.assignedAgentId),
      plan,
      finalAnswer,
      verificationReport,
      durationMs: Date.now() - startTime,
      isSuccessful: executedResults.some(r => r.success),
      sources: allCollectedSources.length > 0 ? allCollectedSources : undefined,
    };
  }

  /**
   * Synthesizes multiple specialist outputs into a single, cohesive, polished response.
   */
  private async synthesizeMultiAgentResults(
    originalQuery: string,
    results: AgentResult[]
  ): Promise<string> {
    const rawArtifacts = results.map((r, i) => {
      const outputText = typeof r.output === 'string' ? r.output : JSON.stringify(r.output, null, 2);
      return `### SPECIALIST PHASE ${i + 1}: ${r.agentName || 'Specialist'} (${r.specialty || ''})\n${outputText}`;
    }).join('\n\n---\n\n');

    try {
      const resp = await callGeminiAPI({
        prompt: `User Primary Goal: "${originalQuery}"\n\nBelow are findings generated by internal specialist agents:\n\n${rawArtifacts}\n\nPlease synthesize all findings into ONE cohesive, seamless, production-ready final response for the user. Do not explain the internal multi-agent steps; deliver the definitive unified answer directly with clear headings, complete code blocks, and structured analysis.`,
        systemInstruction: `You are the Master Synthesizer. Merge multiple specialist findings into one unified, elegant, and definitive response. Never mention internal agent mechanics.`,
        temperature: 0.2,
      });

      if (resp.success && resp.text && resp.text.trim().length > 30) {
        return resp.text.trim();
      }
    } catch (e) {
      console.warn('[AgencyOrchestrator] Synthesis fallback:', e);
    }

    // Fallback: Combine outputs cleanly
    return results.map(r => typeof r.output === 'string' ? r.output : JSON.stringify(r.output)).join('\n\n');
  }
}

export const agencyOrchestrator = AgencyOrchestrator.getInstance();
