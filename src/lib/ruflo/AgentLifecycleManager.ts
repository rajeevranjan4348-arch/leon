/**
 * Ruflo Agent Lifecycle Manager
 * Oversees state machine transitions, health telemetry, heartbeats, and lifecycle events for all agents in the swarm.
 * Inspired by Ruflo (https://github.com/ruvnet/ruflo)
 */

import { AgentMetrics, AgentLifecycleState, RufloAgentType } from './types';
import { eventBus } from './EventBus';

export class AgentLifecycleManager {
  private static instance: AgentLifecycleManager;
  private metrics: Map<string, AgentMetrics> = new Map();

  public static getInstance(): AgentLifecycleManager {
    if (!AgentLifecycleManager.instance) {
      AgentLifecycleManager.instance = new AgentLifecycleManager();
    }
    return AgentLifecycleManager.instance;
  }

  /**
   * Spawn and initialize a new agent instance in the swarm.
   */
  public spawnAgent(agentId: string, agentType: RufloAgentType): AgentMetrics {
    const existing = this.metrics.get(agentId);
    if (existing) return existing;

    const initialMetrics: AgentMetrics = {
      agentId,
      agentType,
      state: 'idle',
      tasksCompleted: 0,
      tasksFailed: 0,
      successRate: 1.0,
      averageExecutionTimeMs: 0,
      health: 'healthy',
      lastHeartbeat: Date.now(),
    };

    this.metrics.set(agentId, initialMetrics);

    eventBus.emitTelemetry({
      type: 'agent_spawned',
      agentId,
      agentType,
      message: `Initialized agent ${agentId} (${agentType}) in IDLE state`,
    });

    return initialMetrics;
  }

  /**
   * Transition agent state through its lifecycle.
   */
  public transitionState(agentId: string, newState: AgentLifecycleState, details?: any): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    const prevState = metrics.state;
    metrics.state = newState;
    metrics.lastHeartbeat = Date.now();

    eventBus.emitTelemetry({
      type: 'agent_state_change',
      agentId,
      agentType: metrics.agentType,
      message: `Agent ${agentId} transitioned: ${prevState.toUpperCase()} ➔ ${newState.toUpperCase()}`,
      details: { prevState, newState, ...details },
    });
  }

  /**
   * Update metrics after subtask completion or failure.
   */
  public recordTaskOutcome(agentId: string, success: boolean, durationMs: number): void {
    const metrics = this.metrics.get(agentId);
    if (!metrics) return;

    metrics.lastHeartbeat = Date.now();
    if (success) {
      metrics.tasksCompleted++;
    } else {
      metrics.tasksFailed++;
    }

    const total = metrics.tasksCompleted + metrics.tasksFailed;
    metrics.successRate = total > 0 ? metrics.tasksCompleted / total : 1.0;
    metrics.averageExecutionTimeMs =
      metrics.averageExecutionTimeMs === 0 ? durationMs : Math.round((metrics.averageExecutionTimeMs + durationMs) / 2);

    if (metrics.successRate < 0.5 && total >= 2) {
      metrics.health = 'unhealthy';
    } else if (metrics.successRate < 0.8 && total >= 1) {
      metrics.health = 'degraded';
    } else {
      metrics.health = 'healthy';
    }
  }

  /**
   * Terminate an agent and clean up resources.
   */
  public terminateAgent(agentId: string): void {
    const metrics = this.metrics.get(agentId);
    if (metrics) {
      metrics.state = 'terminated';
      eventBus.emitTelemetry({
        type: 'agent_state_change',
        agentId,
        agentType: metrics.agentType,
        message: `Terminated agent ${agentId}`,
      });
    }
  }

  /**
   * Get metrics for a specific agent.
   */
  public getMetrics(agentId: string): AgentMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get all registered agent metrics in swarm.
   */
  public getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Reset all agent metrics.
   */
  public reset(): void {
    this.metrics.clear();
  }
}

export const agentLifecycleManager = AgentLifecycleManager.getInstance();
