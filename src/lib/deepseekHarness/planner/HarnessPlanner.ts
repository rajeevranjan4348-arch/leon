/**
 * DeepSeek Harness - Task Planner & DAG Step Orchestrator
 * Analyzes complex objectives, decomposes into sequential or parallel steps, and manages plan evolution.
 * MIT License
 */

import { HarnessPlan, HarnessPlanStep, HarnessTool } from '../types';
import { harnessToolRegistry } from '../tools/HarnessToolRegistry';
import { harnessEventBus } from '../events/HarnessEventBus';

export class HarnessPlanner {
  private static instance: HarnessPlanner;

  private constructor() {}

  public static getInstance(): HarnessPlanner {
    if (!HarnessPlanner.instance) {
      HarnessPlanner.instance = new HarnessPlanner();
    }
    return HarnessPlanner.instance;
  }

  /**
   * Create a structured execution plan for an objective.
   */
  public async createPlan(objective: string, sessionId: string = 'default'): Promise<HarnessPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const availableTools = harnessToolRegistry.getAllTools();
    
    const steps = this.decomposeObjective(objective, availableTools);

    const plan: HarnessPlan = {
      id: planId,
      objective,
      steps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isComplete: false,
      totalSteps: steps.length,
      completedSteps: 0,
    };

    harnessEventBus.emit('agent.plan.created', {
      planId: plan.id,
      objective,
      stepCount: steps.length,
      steps: steps.map((s) => ({ id: s.id, title: s.title, tool: s.assignedTool })),
    }, { sessionId });

    return plan;
  }

  /**
   * Decomposes user goal into deterministic steps based on intent keywords and available tool registry.
   */
  private decomposeObjective(objective: string, availableTools: HarnessTool[]): HarnessPlanStep[] {
    const lower = objective.toLowerCase();
    const steps: HarnessPlanStep[] = [];
    const toolNames = new Set(availableTools.map((t) => t.name));

    // Check if goal involves open app / launch
    const isAppLaunch = lower.includes('open ') || lower.includes('launch ') || lower.includes('start app');
    // Check if goal involves search / current news / weather / facts
    const isSearch = lower.includes('search') || lower.includes('who is') || lower.includes('what is') || lower.includes('latest') || lower.includes('price') || lower.includes('weather');
    // Check if goal involves calculation
    const isCalculation = lower.includes('calculate') || lower.includes('math') || lower.includes('sqrt') || lower.includes('sum of') || /[\d+\-*/()]{4,}/.test(lower);
    // Check if goal involves research / multi-step investigation
    const isResearch = lower.includes('research') || lower.includes('investigate') || lower.includes('compare') || lower.includes('detailed report');

    let stepCounter = 1;

    if (isSearch && toolNames.has('web_search')) {
      const query = objective.replace(/^(please\s+)?(search\s+for|search|find|lookup)\s+/i, '').trim();
      steps.push({
        id: `step_${stepCounter}`,
        stepNumber: stepCounter++,
        title: 'Information Gathering & Web Search',
        description: `Execute web query for '${query.slice(0, 60)}' to retrieve grounded facts.`,
        assignedTool: 'web_search',
        inputArguments: { query: query || objective, numResults: 5 },
        expectedOutcome: 'Factual search data retrieved and verified.',
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
      });
    }

    if (isCalculation && toolNames.has('calculate_expression')) {
      const exprMatch = objective.match(/[\d+\-*/().%^ eEPIsqrtcossintan]{3,}/);
      const expr = exprMatch ? exprMatch[0].trim() : '2 + 2';
      steps.push({
        id: `step_${stepCounter}`,
        stepNumber: stepCounter++,
        title: 'Mathematical Computation',
        description: `Evaluate mathematical expression '${expr}'.`,
        assignedTool: 'calculate_expression',
        inputArguments: { expression: expr },
        expectedOutcome: 'Computed numerical result.',
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
      });
    }

    if (isAppLaunch && toolNames.has('open_app')) {
      const appNameMatch = objective.match(/(?:open|launch|start)\s+([a-zA-Z0-9_\s]+)/i);
      const appName = appNameMatch ? appNameMatch[1].trim() : 'browser';
      steps.push({
        id: `step_${stepCounter}`,
        stepNumber: stepCounter++,
        title: 'Application Intent Execution',
        description: `Launch requested target application '${appName}'.`,
        assignedTool: 'open_app',
        inputArguments: { appName },
        expectedOutcome: 'Target application opened.',
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
      });
    }

    // If multi-step or memory persistence requested
    if (isResearch && toolNames.has('scratchpad_memory')) {
      steps.push({
        id: `step_${stepCounter}`,
        stepNumber: stepCounter++,
        title: 'Synthesis & Memory Note Storing',
        description: 'Store structured findings and key takeaways into task scratchpad.',
        assignedTool: 'scratchpad_memory',
        inputArguments: { action: 'set', key: 'research_summary', value: objective },
        dependencies: steps.length > 0 ? [steps[steps.length - 1].id] : undefined,
        expectedOutcome: 'Key research points indexed.',
        status: 'pending',
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // Default step if no specific tool rule matched
    if (steps.length === 0) {
      steps.push({
        id: `step_${stepCounter}`,
        stepNumber: stepCounter++,
        title: 'Objective Direct Evaluation',
        description: 'Process and analyze the user objective using LLM knowledge & context.',
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
      });
    }

    return steps;
  }

  /**
   * Check if a plan has entered a repetitive loop of failed identical actions.
   */
  public detectPlanLoop(steps: HarnessPlanStep[]): boolean {
    const failedSteps = steps.filter((s) => s.status === 'failed');
    if (failedSteps.length >= 3) {
      // Check if same tool failed 3 times
      const toolFailures = failedSteps.map((s) => s.assignedTool).filter(Boolean);
      const counts: Record<string, number> = {};
      for (const t of toolFailures) {
        counts[t!] = (counts[t!] || 0) + 1;
        if (counts[t!] >= 3) return true;
      }
    }
    return false;
  }
}

export const harnessPlanner = HarnessPlanner.getInstance();
