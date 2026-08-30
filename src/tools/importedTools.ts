import { ToolResult } from '@/controllers/appController';
import { importedSystemsFacade } from '@/lib/importedSystems';

export const IMPORTED_SYSTEMS_TOOL_NAME = 'imported_systems_tool';

export const IMPORTED_SYSTEMS_TOOL_SCHEMA = {
  description:
    'Execute operations on imported functional systems (Unified Memory & Context, Browser Use Agent, Anthropic Cybersecurity Skills, Scientific Research Engine, Diagram Design Engine, Awesome Harness Engineering).',
  parameters: {
    type: 'object',
    properties: {
      subsystem: {
        type: 'string',
        enum: ['deepseek_harness', 'memory', 'browser', 'cybersecurity', 'scientific', 'diagram', 'harness', 'summary'],
        description: 'The imported functional subsystem to execute.',
      },
      action: {
        type: 'string',
        description: 'Specific subsystem command (e.g. store, query, audit, task, workflow, generate, eval).',
      },
      params: {
        type: 'object',
        description: 'Subsystem action parameters object.',
      },
    },
    required: ['subsystem'],
  },
};

export async function executeImportedSystemsTool(args: {
  subsystem: 'deepseek_harness' | 'memory' | 'browser' | 'cybersecurity' | 'scientific' | 'diagram' | 'harness' | 'summary';
  action?: string;
  params?: Record<string, any>;
}): Promise<ToolResult> {
  try {
    const subsystem = args.subsystem;
    const action = args.action || 'default';
    const params = args.params || {};

    switch (subsystem) {
      case 'deepseek_harness': {
        const objective = params.objective || params.prompt || params.goal || 'Execute multi-step task';
        const res = await importedSystemsFacade.executeWithDeepSeekHarness(objective, {
          sessionId: params.sessionId,
          maxExecutionSteps: params.maxSteps || 10,
        });
        return {
          success: res.status === 'success',
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_deepseek_harness`,
          value: res,
          message: `DeepSeek Harness completed task with ${res.stepsExecuted} steps executed (${res.totalDurationMs}ms). Final Status: ${res.status.toUpperCase()}.`,
        };
      }
      case 'summary': {
        const summary = importedSystemsFacade.getSystemSummary();
        return {
          success: true,
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_summary`,
          value: summary,
          message: 'Retrieved integrated system capabilities summary.',
        };
      }

      case 'memory': {
        if (action === 'store') {
          const res = importedSystemsFacade.memory.storeMemory({
            key: params.key || 'context_fact',
            value: params.value,
            category: params.category,
            scope: params.scope,
            importanceScore: params.importanceScore,
          });
          return {
            success: true,
            action: `${IMPORTED_SYSTEMS_TOOL_NAME}_memory_store`,
            value: res,
            message: `Stored memory key '${res.key}' in Unified Memory Engine.`,
          };
        } else {
          const res = importedSystemsFacade.memory.queryMemory(params.query || '*', {
            scope: params.scope,
            category: params.category,
            limit: params.limit,
          });
          return {
            success: true,
            action: `${IMPORTED_SYSTEMS_TOOL_NAME}_memory_query`,
            value: res,
            message: `Queried memory engine, found ${res.totalCount} items in ${res.queryTimeMs}ms.`,
          };
        }
      }

      case 'browser': {
        const res = await importedSystemsFacade.browser.executeTask({
          targetGoal: params.goal || 'Navigate and extract page content',
          startUrl: params.url,
          maxSteps: params.maxSteps || 5,
        });
        return {
          success: res.status === 'completed',
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_browser_task`,
          value: res,
          message: `Executed Browser Use task '${res.targetGoal}' (${res.steps.length} steps completed).`,
        };
      }

      case 'cybersecurity': {
        const res = importedSystemsFacade.cybersecurity.auditCodeOrArchitecture({
          targetName: params.targetName || 'Application Code',
          codeSnippetOrDescription: params.code || params.description || '',
        });
        return {
          success: true,
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_cybersecurity_audit`,
          value: res,
          message: `Completed Cybersecurity audit for '${res.targetName}'. Risk Rating: ${res.overallRiskRating.toUpperCase()}. Found ${res.vulnerabilitiesFound.length} items.`,
        };
      }

      case 'scientific': {
        const res = importedSystemsFacade.scientific.executeResearchWorkflow({
          topic: params.topic || 'AI Agent Context Retrieval Optimization',
          domain: params.domain,
          depthLevel: params.depthLevel,
        });
        return {
          success: true,
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_scientific_workflow`,
          value: res,
          message: `Executed Scientific Research Workflow for '${res.researchTopic}'. Generated ${res.hypotheses.length} hypothesis and analyzed ${res.relevantLiterature.length} references.`,
        };
      }

      case 'diagram': {
        const res = importedSystemsFacade.diagram.generateDiagram(params.description || 'System Architecture', {
          type: params.type || 'mermaid_architecture',
          title: params.title,
          direction: params.direction,
        });
        return {
          success: res.isValidSyntax,
          action: `${IMPORTED_SYSTEMS_TOOL_NAME}_diagram_generate`,
          value: res,
          message: `Generated diagram '${res.title}' (${res.type}). Code sanitized & validated.`,
        };
      }

      case 'harness': {
        if (action === 'eval') {
          const res = importedSystemsFacade.harness.runEvaluationSuite(params.suiteName || 'Standard Agent Benchmark');
          return {
            success: true,
            action: `${IMPORTED_SYSTEMS_TOOL_NAME}_harness_eval`,
            value: res,
            message: `Ran Harness Evaluation suite '${res.testSuiteName}'. Accuracy: ${(res.accuracyRate * 100).toFixed(1)}%.`,
          };
        } else {
          const metrics = importedSystemsFacade.harness.getHealthMetrics();
          return {
            success: true,
            action: `${IMPORTED_SYSTEMS_TOOL_NAME}_harness_health`,
            value: metrics,
            message: `Harness Circuit Breaker: ${metrics.circuitBreakerState}. Reliability score: ${(metrics.reliabilityScore * 100).toFixed(1)}%.`,
          };
        }
      }

      default:
        return {
          success: false,
          action: IMPORTED_SYSTEMS_TOOL_NAME,
          error: `Unknown subsystem '${subsystem}'. Allowed: memory, browser, cybersecurity, scientific, diagram, harness, summary.`,
        };
    }
  } catch (err: any) {
    return {
      success: false,
      action: IMPORTED_SYSTEMS_TOOL_NAME,
      error: err?.message || 'Error executing imported systems tool',
    };
  }
}
