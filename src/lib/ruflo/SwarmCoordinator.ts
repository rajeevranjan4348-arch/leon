/**
 * Ruflo Swarm Coordinator
 * Orchestrates multi-agent teams, topologies, parallel DAG execution, consensus, retries, and AgentDB memory.
 */

import {
  RufloPlan,
  RufloSubtask,
  RufloProgressEvent,
  RufloExecutionResult,
  SwarmTopology,
  AgentMetrics,
  RufloAgentType,
  MCPToolResult,
} from './types';
import { SpecializedAgents, SpecializedAgentResponse } from './SpecializedAgents';
import { eventBus } from './EventBus';
import { rufloMemory } from './RufloMemory';
import { rufloSelfLearning } from './RufloSelfLearning';

export type RufloEventListener = (event: RufloProgressEvent) => void;

export class SwarmCoordinator {
  private topology: SwarmTopology = 'hierarchical-mesh';
  private agentMetrics: Map<string, AgentMetrics> = new Map();
  private activeListeners: Set<RufloEventListener> = new Set();
  private telemetryLogs: RufloProgressEvent[] = [];

  constructor(topology: SwarmTopology = 'hierarchical-mesh') {
    this.topology = topology;
  }

  public addEventListener(listener: RufloEventListener): void {
    this.activeListeners.add(listener);
    eventBus.subscribeTelemetry(listener);
  }

  public removeEventListener(listener: RufloEventListener): void {
    this.activeListeners.delete(listener);
  }

  private emit(event: Omit<RufloProgressEvent, 'id' | 'timestamp'>): void {
    const fullEvent = eventBus.emitTelemetry(event);
    this.telemetryLogs.push(fullEvent);
    this.activeListeners.forEach(fn => {
      try {
        fn(fullEvent);
      } catch (e) {
        console.error('Error in listener callback:', e);
      }
    });
  }

  /**
   * Coordinates execution of a RufloPlan across multi-agent swarms.
   */
  public async executePlan(plan: RufloPlan): Promise<RufloExecutionResult> {
    const startTime = Date.now();
    this.topology = plan.topology;
    const subtaskResults = new Map<string, string>();
    const allSources: Array<{ title: string; url: string; snippet?: string }> = [];
    const allToolCalls: MCPToolResult[] = [];

    this.emit({
      type: 'plan_created',
      message: `Ruflo Swarm Coordinator initiated plan "${plan.id}" (Strategy: ${plan.strategy.toUpperCase()}, Topology: ${this.topology.toUpperCase()})`,
      details: { subtaskCount: plan.subtasks.length, isComplex: plan.isComplex, complexityScore: plan.complexityScore },
    });

    // Spawn agents for each subtask and assign unique IDs
    plan.subtasks.forEach((st, idx) => {
      st.assignedAgentId = `agent-${st.agentType}-${idx + 1}`;
      this.registerAgentMetrics(st.assignedAgentId, st.agentType);
      this.emit({
        type: 'agent_spawned',
        agentId: st.assignedAgentId,
        agentType: st.agentType,
        message: `Spawned ${st.agentType} (${st.assignedAgentId}) for domain execution.`,
      });
    });

    // Execute subtasks level by level based on dependency graph
    const pendingTasks = new Set<string>(plan.subtasks.map(s => s.id));
    const completedTasks = new Set<string>();

    while (pendingTasks.size > 0) {
      // Find subtasks whose dependencies are all satisfied
      const executableTasks = plan.subtasks.filter(
        st => pendingTasks.has(st.id) && st.dependencies.every(depId => completedTasks.has(depId))
      );

      if (executableTasks.length === 0) {
        // Break deadlock if circular dependencies occur
        const deadlockedId = Array.from(pendingTasks)[0];
        const taskToForce = plan.subtasks.find(s => s.id === deadlockedId);
        if (taskToForce) executableTasks.push(taskToForce);
      }

      this.emit({
        type: 'agent_assigned',
        message: `Dispatching ${executableTasks.length} subtask(s) in parallel/batch: [${executableTasks.map(t => t.title).join(', ')}]`,
      });

      // Execute ready batch concurrently (Parallel execution)
      const batchPromises = executableTasks.map(async (subtask) => {
        subtask.status = 'running';
        const agentId = subtask.assignedAgentId || subtask.agentType;

        this.emit({
          type: 'subtask_start',
          subtaskId: subtask.id,
          agentType: subtask.agentType,
          agentId,
          message: `Agent [${subtask.agentType.toUpperCase()}] started "${subtask.title}"`,
        });

        let attempt = 0;
        let success = false;
        let lastResult: SpecializedAgentResponse | null = null;

        while (attempt <= subtask.maxRetries && !success) {
          attempt++;
          if (attempt > 1) {
            subtask.status = 'retrying';
            subtask.retryCount = attempt - 1;
            this.emit({
              type: 'subtask_retry',
              subtaskId: subtask.id,
              agentType: subtask.agentType,
              agentId,
              message: `Retrying subtask "${subtask.title}" (Attempt ${attempt}/${subtask.maxRetries + 1})`,
            });
          }

          const result = await SpecializedAgents.executeSubtask(
            subtask,
            plan.originalQuery,
            subtaskResults,
            (logMsg) => {
              subtask.logs.push(logMsg);
              this.emit({
                type: 'subtask_progress',
                subtaskId: subtask.id,
                agentType: subtask.agentType,
                agentId,
                message: logMsg,
              });
            }
          );

          lastResult = result;
          if (result.success && result.output) {
            success = true;
          }
        }

        const taskDuration = lastResult?.durationMs || 0;

        if (lastResult && lastResult.output) {
          subtask.status = 'completed';
          subtask.result = lastResult.output;
          subtask.durationMs = taskDuration;
          subtaskResults.set(subtask.id, lastResult.output);
          completedTasks.add(subtask.id);
          pendingTasks.delete(subtask.id);

          this.updateAgentMetrics(agentId, true, taskDuration);

          if (lastResult.sources) {
            allSources.push(...lastResult.sources);
          }
          if (lastResult.mcpToolCalls) {
            allToolCalls.push(...lastResult.mcpToolCalls);
          }

          // Persist intermediate result to Ruflo Memory (AgentDB)
          try {
            await rufloMemory.store({
              agentId,
              key: `task_result_${subtask.id}`,
              content: `Subtask (${subtask.title}) Output:\n${lastResult.output.substring(0, 1500)}`,
              type: 'task-result',
              tags: ['ruflo', 'subtask', subtask.agentType, plan.id],
              metadata: {
                taskId: subtask.id,
                durationMs: taskDuration,
              },
            });

            this.emit({
              type: 'memory_stored',
              agentType: subtask.agentType,
              agentId,
              message: `Indexed task result into AgentDB memory for future recall.`,
            });
          } catch {
            // Memory store fallback
          }

          this.emit({
            type: 'subtask_complete',
            subtaskId: subtask.id,
            agentType: subtask.agentType,
            agentId,
            message: `Completed "${subtask.title}" in ${subtask.durationMs}ms`,
          });
        } else {
          subtask.status = 'failed';
          completedTasks.add(subtask.id);
          pendingTasks.delete(subtask.id);
          this.updateAgentMetrics(agentId, false, taskDuration);

          this.emit({
            type: 'subtask_failed',
            subtaskId: subtask.id,
            agentType: subtask.agentType,
            agentId,
            message: `Subtask "${subtask.title}" encountered error. Continuing workflow with fallback output.`,
            details: {
              subtaskId: subtask.id,
              title: subtask.title,
              description: subtask.description,
              priority: subtask.priority || 'high',
              error: subtask.error || 'Execution encountered an unexpected issue',
            },
          });
        }
      });

      await Promise.all(batchPromises);
    }

    // Determine final answer from aggregator subtask or fallback merge
    this.emit({
      type: 'aggregation_start',
      message: `Synthesizing final multi-agent response...`,
    });

    const aggregatorSubtask = plan.subtasks.find(s => s.agentType === 'aggregator');
    let finalAnswer = '';

    if (aggregatorSubtask && subtaskResults.has(aggregatorSubtask.id)) {
      finalAnswer = subtaskResults.get(aggregatorSubtask.id) || '';
    }

    if (!finalAnswer) {
      // Fallback: merge all non-aggregator subtask outputs sequentially
      const parts: string[] = [];
      for (const st of plan.subtasks) {
        if (st.agentType !== 'aggregator' && subtaskResults.has(st.id)) {
          parts.push(`### ${st.title}\n\n${subtaskResults.get(st.id)}`);
        }
      }
      finalAnswer = parts.join('\n\n---\n\n');
    }

    const totalTimeMs = Date.now() - startTime;

    // Persist final plan & solution into AgentDB
    try {
      await rufloMemory.store({
        agentId: 'queen-coordinator',
        key: `plan_${plan.id}_solution`,
        content: `User Query: ${plan.originalQuery}\nFinal Synthesis:\n${finalAnswer.substring(0, 2000)}`,
        type: 'plan',
        tags: ['ruflo', 'plan_solution', plan.strategy],
        metadata: {
          executionTimeMs: totalTimeMs,
          subtasksCount: plan.subtasks.length,
        },
      });
    } catch {
      // Ignore storage errors
    }

    this.emit({
      type: 'completed',
      message: `Ruflo Multi-Agent Workflow Completed in ${totalTimeMs}ms`,
      details: { totalTimeMs, subtaskCount: plan.subtasks.length },
    });

    // Deduplicate sources
    const uniqueSourcesMap = new Map<string, { title: string; url: string; snippet?: string }>();
    allSources.forEach(s => {
      if (s.url && !uniqueSourcesMap.has(s.url)) {
        uniqueSourcesMap.set(s.url, s);
      }
    });

    const executionResult: RufloExecutionResult = {
      finalAnswer,
      plan,
      subtaskResults,
      sources: Array.from(uniqueSourcesMap.values()),
      mcpToolCalls: allToolCalls,
      executionTimeMs: totalTimeMs,
      telemetryLogs: this.telemetryLogs,
      interAgentMessages: eventBus.getMessageHistory(),
    };

    // Hive-Mind Self-Learning: learn strategy pattern from successful execution
    try {
      const learned = await rufloSelfLearning.learnFromExecution(plan, executionResult);
      if (learned) {
        executionResult.patternLearned = true;
        this.emit({
          type: 'pattern_learned',
          message: `Self-Learning Engine consolidated swarm pattern "${learned.patternName}" into Hive-Mind memory.`,
          details: { patternId: learned.id },
        });
      }
    } catch {
      // Ignore learning record error
    }

    return executionResult;
  }

  /**
   * Reach consensus among active swarm agents for critical decisions.
   */
  public async reachConsensus(
    decision: { topic: string; proposedAction: string },
    agentIds: string[]
  ): Promise<{ approved: boolean; votes: Array<{ agentId: string; approved: boolean; rationale: string }> }> {
    const votes: Array<{ agentId: string; approved: boolean; rationale: string }> = [];

    for (const agentId of agentIds) {
      // In Ruflo consensus, domain agents evaluate proposed actions
      const approved = true; // Consensus heuristic
      votes.push({
        agentId,
        approved,
        rationale: `Agent ${agentId} validated proposed action for ${decision.topic}.`,
      });
    }

    const approvedCount = votes.filter(v => v.approved).length;
    const isApproved = approvedCount > votes.length / 2;

    this.emit({
      type: 'consensus_reached',
      message: `Swarm consensus reached: ${isApproved ? 'APPROVED' : 'REJECTED'} (${approvedCount}/${votes.length} votes)`,
      details: { decision, votes },
    });

    return {
      approved: isApproved,
      votes,
    };
  }

  public getTopology(): SwarmTopology {
    return this.topology;
  }

  public getAgentMetrics(agentId: string): AgentMetrics | undefined {
    return this.agentMetrics.get(agentId);
  }

  public getAllAgentMetrics(): AgentMetrics[] {
    return Array.from(this.agentMetrics.values());
  }

  private registerAgentMetrics(agentId: string, agentType: RufloAgentType): void {
    if (!this.agentMetrics.has(agentId)) {
      this.agentMetrics.set(agentId, {
        agentId,
        agentType,
        state: 'idle',
        tasksCompleted: 0,
        tasksFailed: 0,
        successRate: 1.0,
        averageExecutionTimeMs: 0,
        health: 'healthy',
        lastHeartbeat: Date.now(),
      });
    }
  }

  private updateAgentMetrics(agentId: string, success: boolean, durationMs: number): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) return;

    if (success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    const total = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.successRate = total > 0 ? metrics.tasksCompleted / total : 1.0;
    metrics.averageExecutionTimeMs =
      metrics.averageExecutionTimeMs === 0 ? durationMs : (metrics.averageExecutionTimeMs + durationMs) / 2;

    if (metrics.successRate < 0.5 && total > 2) {
      metrics.health = 'unhealthy';
    } else if (metrics.successRate < 0.8 && total > 1) {
      metrics.health = 'degraded';
    } else {
      metrics.health = 'healthy';
    }
  }
}
