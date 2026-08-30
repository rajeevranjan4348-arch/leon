/**
 * DeepSeek Harness - Task State Machine
 * Enforces explicit lifecycle transitions and prevents uncontrolled agent loops.
 * MIT License
 */

import { TaskState, StateTransitionEvent } from '../types';
import { harnessEventBus } from '../events/HarnessEventBus';

export class TaskStateMachine {
  private currentState: TaskState = 'IDLE';
  private transitions: StateTransitionEvent[] = [];
  private readonly taskId: string;
  private readonly sessionId: string;

  // Allowed state transitions map
  private readonly ALLOWED_TRANSITIONS: Record<TaskState, TaskState[]> = {
    IDLE: ['PLANNING', 'EXECUTING', 'CANCELLED'],
    PLANNING: ['EXECUTING', 'WAITING_FOR_TOOL', 'FAILED', 'CANCELLED'],
    EXECUTING: ['WAITING_FOR_TOOL', 'OBSERVING', 'VALIDATING', 'RECOVERING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    WAITING_FOR_TOOL: ['OBSERVING', 'VALIDATING', 'RECOVERING', 'FAILED', 'CANCELLED'],
    OBSERVING: ['VALIDATING', 'EXECUTING', 'RECOVERING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    VALIDATING: ['EXECUTING', 'RECOVERING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    RECOVERING: ['EXECUTING', 'PLANNING', 'FAILED', 'CANCELLED'],
    COMPLETED: ['IDLE', 'PLANNING'],
    FAILED: ['IDLE', 'PLANNING', 'RECOVERING'],
    CANCELLED: ['IDLE', 'PLANNING'],
  };

  constructor(taskId: string, sessionId: string = 'default') {
    this.taskId = taskId;
    this.sessionId = sessionId;
  }

  public getState(): TaskState {
    return this.currentState;
  }

  /**
   * Transition to a new state if allowed by state machine topology.
   */
  public transition(to: TaskState, reason?: string, metadata?: Record<string, any>): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[this.currentState] || [];
    if (!allowed.includes(to)) {
      console.warn(
        `[TaskStateMachine] Invalid state transition from ${this.currentState} to ${to} for task ${this.taskId}`
      );
      return false;
    }

    const event: StateTransitionEvent = {
      from: this.currentState,
      to,
      timestamp: Date.now(),
      reason,
      metadata,
    };

    this.currentState = to;
    this.transitions.push(event);

    harnessEventBus.emit(
      'task.state_changed',
      {
        taskId: this.taskId,
        from: event.from,
        to: event.to,
        reason,
      },
      { sessionId: this.sessionId, taskId: this.taskId }
    );

    return true;
  }

  public isTerminal(): boolean {
    return (
      this.currentState === 'COMPLETED' ||
      this.currentState === 'FAILED' ||
      this.currentState === 'CANCELLED'
    );
  }

  public getHistory(): StateTransitionEvent[] {
    return [...this.transitions];
  }
}
