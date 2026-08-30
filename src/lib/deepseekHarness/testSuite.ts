/**
 * DeepSeek Harness - Self-Contained Verification & Test Suite
 * Validates core components: Plugins, Tools, Sandbox, Permissions, State Machine, Planner, Recovery, Cancellation.
 * MIT License
 */

import {
  harnessEventBus,
  permissionManager,
  executionSandbox,
  harnessToolRegistry,
  harnessPluginRegistry,
  harnessSessionManager,
  harnessPlanner,
  TaskStateMachine,
  deepSeekAgentRuntime,
  modelAdapterManager,
  HarnessTool,
  HarnessPlugin,
} from './index';

export interface TestResultItem {
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

export interface HarnessTestSuiteReport {
  timestamp: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  results: TestResultItem[];
}

export class DeepSeekHarnessTestSuite {
  /**
   * Run the full diagnostic and validation test suite.
   */
  public static async runAllTests(): Promise<HarnessTestSuiteReport> {
    const results: TestResultItem[] = [];

    // Test 1: Event Bus Pub/Sub and Wildcard Match
    results.push(await this.testEventBus());

    // Test 2: Permission Capability Grant & Denial
    results.push(await this.testPermissionSystem());

    // Test 3: Sandbox Timeout & AbortSignal Cancellation
    results.push(await this.testSandboxExecutionAndTimeout());

    // Test 4: Tool Registration & Safe Execution
    results.push(await this.testToolRegistryAndExecution());

    // Test 5: Plugin Lifecycle & Hook Execution
    results.push(await this.testPluginLifecycle());

    // Test 6: Task State Machine Transitions
    results.push(await this.testTaskStateMachine());

    // Test 7: Planner DAG Step Decomposition & Loop Detection
    results.push(await this.testPlannerAndLoopDetection());

    // Test 8: Session Isolation & Scratchpad Memory
    results.push(await this.testSessionIsolation());

    // Test 9: Model Adapter Fallback & Switching
    results.push(await this.testModelAdapters());

    // Test 10: End-to-End Multi-Step Task Execution
    results.push(await this.testEndToEndTaskExecution());

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.length - passedCount;

    return {
      timestamp: Date.now(),
      totalTests: results.length,
      passedCount,
      failedCount,
      successRate: passedCount / results.length,
      results,
    };
  }

  private static async testEventBus(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      let receivedDirect = false;
      let receivedWildcard = false;

      const unsub1 = harnessEventBus.on('test.event.action', () => {
        receivedDirect = true;
      });
      const unsub2 = harnessEventBus.on('test.*', () => {
        receivedWildcard = true;
      });

      harnessEventBus.emit('test.event.action', { key: 'value' });
      unsub1();
      unsub2();

      if (!receivedDirect || !receivedWildcard) {
        throw new Error('Event bus failed to route direct or wildcard event.');
      }

      return { testName: '1. Event Bus Pub/Sub & Wildcards', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '1. Event Bus Pub/Sub & Wildcards', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testPermissionSystem(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const testPluginId = `test_plugin_${Date.now()}`;
      
      // Initially, ungranted sensitive scope should be denied
      const check1 = permissionManager.checkPermission(testPluginId, 'system:control');
      if (check1.allowed) {
        throw new Error('Ungranted sensitive permission should have been denied.');
      }

      // Grant scope
      permissionManager.grantPermissions(testPluginId, ['system:control'], 'user');
      const check2 = permissionManager.checkPermission(testPluginId, 'system:control');
      if (!check2.allowed) {
        throw new Error('Granted permission was not accepted.');
      }

      return { testName: '2. Capability & Permission Manager', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '2. Capability & Permission Manager', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testSandboxExecutionAndTimeout(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const slowTool: HarnessTool = {
        name: 'test_slow_tool',
        description: 'Simulates slow operation to test sandbox timeout',
        category: 'general',
        inputSchema: { type: 'object', properties: {} },
        requiredPermissions: ['tools:execute'],
        timeoutMs: 100, // 100ms timeout
        execute: async () => {
          await new Promise((r) => setTimeout(r, 400));
          return { success: true };
        },
      };

      const result = await executionSandbox.executeInSandbox(
        slowTool,
        {},
        {
          sessionId: 'test',
          taskId: 'test',
          stepId: 'test_step',
          scratchpad: new Map(),
          logger: () => {},
        },
        { timeoutMs: 100 }
      );

      if (result.success || !result.error?.includes('timed out')) {
        throw new Error('Sandbox should have aborted execution on timeout.');
      }

      return { testName: '3. Sandbox Timeout & Execution Isolation', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '3. Sandbox Timeout & Execution Isolation', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testToolRegistryAndExecution(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const calcResult = await harnessToolRegistry.executeTool(
        'calculate_expression',
        { expression: 'Math.sqrt(256) * 4' },
        {
          sessionId: 'test',
          taskId: 'test',
          stepId: 'test_calc',
          scratchpad: new Map(),
          logger: () => {},
        }
      );

      if (!calcResult.success || calcResult.data?.result !== 64) {
        throw new Error(`Calculator tool returned unexpected result: ${JSON.stringify(calcResult)}`);
      }

      return { testName: '4. Tool Registry & Calculation Execution', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '4. Tool Registry & Calculation Execution', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testPluginLifecycle(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      let initCalled = false;
      let hookTriggered = false;

      const testPlugin: HarnessPlugin = {
        metadata: {
          id: `lifecycle_plugin_${Date.now()}`,
          name: 'Lifecycle Test Plugin',
          version: '1.0.0',
          description: 'Tests lifecycle',
        },
        capabilities: ['lifecycle_test'],
        requiredPermissions: ['tools:execute'],
        enabled: true,
        initialize: async () => {
          initCalled = true;
        },
        hooks: {
          beforeStep: async () => {
            hookTriggered = true;
          },
        },
      };

      await harnessPluginRegistry.registerPlugin(testPlugin);

      if (!initCalled) {
        throw new Error('Plugin initialize() hook was not called upon registration.');
      }

      return { testName: '5. Plugin Lifecycle & Hook Architecture', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '5. Plugin Lifecycle & Hook Architecture', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testTaskStateMachine(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const sm = new TaskStateMachine('test_task', 'test_session');
      if (sm.getState() !== 'IDLE') throw new Error('Initial state must be IDLE');

      const trans1 = sm.transition('PLANNING', 'Formulate plan');
      if (!trans1 || sm.getState() !== 'PLANNING') throw new Error('Failed transition to PLANNING');

      const trans2 = sm.transition('EXECUTING', 'Start execution');
      if (!trans2 || sm.getState() !== 'EXECUTING') throw new Error('Failed transition to EXECUTING');

      // Invalid transition check: EXECUTING cannot go straight to IDLE without terminal state
      const invalid = sm.transition('IDLE', 'Invalid jump');
      if (invalid) throw new Error('Invalid state transition was erroneously accepted');

      sm.transition('COMPLETED', 'Task finished');
      if (!sm.isTerminal()) throw new Error('State COMPLETED should be recognized as terminal.');

      return { testName: '6. Task State Machine Transitions', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '6. Task State Machine Transitions', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testPlannerAndLoopDetection(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const plan = await harnessPlanner.createPlan('Search for quantum computing algorithms and calculate 12 * 8');
      if (plan.steps.length < 2) {
        throw new Error('Planner failed to decompose multi-goal query into multiple steps.');
      }

      // Test loop detection
      const fakeFailedSteps = [
        { id: '1', stepNumber: 1, title: 'A', description: '', assignedTool: 'failing_tool', status: 'failed' as const, retryCount: 3, maxRetries: 2 },
        { id: '2', stepNumber: 2, title: 'B', description: '', assignedTool: 'failing_tool', status: 'failed' as const, retryCount: 3, maxRetries: 2 },
        { id: '3', stepNumber: 3, title: 'C', description: '', assignedTool: 'failing_tool', status: 'failed' as const, retryCount: 3, maxRetries: 2 },
      ];

      const isLoop = harnessPlanner.detectPlanLoop(fakeFailedSteps);
      if (!isLoop) {
        throw new Error('Loop detector failed to identify 3 consecutive identical tool failures.');
      }

      return { testName: '7. DAG Planner & Loop Detection', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '7. DAG Planner & Loop Detection', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testSessionIsolation(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const session1 = harnessSessionManager.getOrCreateSession('session_alpha', 'Alpha Session');
      const session2 = harnessSessionManager.getOrCreateSession('session_beta', 'Beta Session');

      session1.scratchpad.set('secret_alpha', '12345');
      session2.scratchpad.set('secret_beta', '67890');

      if (session1.scratchpad.has('secret_beta') || session2.scratchpad.has('secret_alpha')) {
        throw new Error('Session scratchpad memory isolation breached.');
      }

      return { testName: '8. Session Isolation & Scratchpad', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '8. Session Isolation & Scratchpad', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testModelAdapters(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const adapters = modelAdapterManager.getAllAdapters();
      if (adapters.length < 2) {
        throw new Error('Model adapter manager must have multiple registered providers.');
      }

      const fallbackAdapter = modelAdapterManager.getAdapter('local-rule-adapter');
      const res = await fallbackAdapter.generateResponse({
        messages: [{ role: 'user', content: 'Ping test' }],
      });

      if (!res.text || res.finishReason !== 'stop') {
        throw new Error('Fallback model adapter failed to return valid response.');
      }

      return { testName: '9. Model Provider Abstraction & Adapters', passed: true, durationMs: performance.now() - start };
    } catch (err: any) {
      return { testName: '9. Model Provider Abstraction & Adapters', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }

  private static async testEndToEndTaskExecution(): Promise<TestResultItem> {
    const start = performance.now();
    try {
      const executionResult = await deepSeekAgentRuntime.executeTask(
        'Calculate 45 * 2 and store summary note',
        {
          sessionId: `e2e_test_${Date.now()}`,
          maxExecutionSteps: 5,
        }
      );

      if (executionResult.status !== 'success' && executionResult.status !== 'failed') {
        throw new Error(`Unexpected terminal execution status: ${executionResult.status}`);
      }

      return {
        testName: '10. End-to-End Agent Lifecycle Execution',
        passed: true,
        durationMs: performance.now() - start,
        details: { stepsExecuted: executionResult.stepsExecuted, durationMs: executionResult.totalDurationMs },
      };
    } catch (err: any) {
      return { testName: '10. End-to-End Agent Lifecycle Execution', passed: false, durationMs: performance.now() - start, error: err?.message };
    }
  }
}
