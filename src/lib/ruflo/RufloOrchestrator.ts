/**
 * Ruflo AI Orchestrator
 * Implements the complete Ruflo Multi-Agent pipeline:
 * User → AI Orchestrator → Task Analyzer → Planner → Agent Router → Specialized Agents → Tools/MCP → Result Aggregator → Memory → Final Response
 */

import { TaskDecomposer } from './TaskDecomposer';
import { SwarmCoordinator, RufloEventListener } from './SwarmCoordinator';
import { RufloExecutionResult, RufloPlan, RufloProgressEvent } from './types';
import { callGeminiAPI } from '../gemini';
import { rufloMemory } from './RufloMemory';
import { eventBus } from './EventBus';

export interface RufloOrchestrationOptions {
  query: string;
  searchMode?: 'auto' | 'research' | 'deep' | 'chat' | 'search';
  forceMultiAgent?: boolean;
  onProgress?: RufloEventListener;
}

export class RufloOrchestrator {
  private coordinator: SwarmCoordinator;

  constructor() {
    this.coordinator = new SwarmCoordinator();
  }

  /**
   * Main pipeline entry point:
   * 1. If simple question -> Normal fast AI path.
   * 2. If complex task -> Full Ruflo Multi-Agent Swarm execution.
   */
  public async processQuery(options: RufloOrchestrationOptions): Promise<RufloExecutionResult> {
    const { query, searchMode = 'auto', forceMultiAgent = false, onProgress } = options;

    if (onProgress) {
      this.coordinator.addEventListener(onProgress);
    }

    try {
      // 1. Task Analyzer & Planner (TaskDecomposer)
      const plan: RufloPlan = TaskDecomposer.decomposeTask(query, searchMode);

      if (forceMultiAgent) {
        plan.isComplex = true;
      }

      // Fast Path for Simple Questions (Normal AI Path)
      if (!plan.isComplex) {
        const startTime = Date.now();
        if (onProgress) {
          onProgress({
            id: `evt_simple_${Date.now()}`,
            timestamp: Date.now(),
            type: 'plan_created',
            message: 'Direct single-agent path selected for straightforward inquiry.',
          });
        }

        const resp = await callGeminiAPI({
          prompt: query,
          mode: searchMode === 'research' ? 'search' : 'chat',
        });

        const execTime = Date.now() - startTime;
        const subtaskResults = new Map<string, string>();
        subtaskResults.set('subtask_direct', resp.text);

        // Store into RufloMemory
        try {
          await rufloMemory.store({
            agentId: 'direct-agent',
            key: `direct_query_${Date.now()}`,
            content: `User: ${query}\nAI: ${resp.text.substring(0, 1000)}`,
            type: 'fact',
            tags: ['ruflo', 'simple-path'],
          });
        } catch {
          // Ignore memory fallback
        }

        const event: RufloProgressEvent = {
          id: `evt_done_${Date.now()}`,
          timestamp: Date.now(),
          type: 'completed',
          message: `Direct answer generated in ${execTime}ms`,
        };

        if (onProgress) {
          onProgress(event);
        }

        return {
          finalAnswer: resp.text,
          plan,
          subtaskResults,
          sources: resp.sources,
          executionTimeMs: execTime,
          telemetryLogs: [event],
          interAgentMessages: [],
        };
      }

      // 2. Full Ruflo Multi-Agent Execution Path:
      // Planner → Agent Router → Specialized Agents → Tools/MCP → Result Aggregator → Memory → Final Response
      const result = await this.coordinator.executePlan(plan);
      return result;
    } finally {
      if (onProgress) {
        this.coordinator.removeEventListener(onProgress);
      }
    }
  }

  public getCoordinator(): SwarmCoordinator {
    return this.coordinator;
  }
}

export const rufloOrchestrator = new RufloOrchestrator();
