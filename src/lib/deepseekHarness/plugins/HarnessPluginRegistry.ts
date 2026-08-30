/**
 * DeepSeek Harness - Plugin Architecture & Registry
 * Everything is a plugin: tools, lifecycle listeners, capabilities, and workflows.
 * MIT License
 */

import {
  HarnessPlugin,
  PluginContext,
  HarnessTool,
  PermissionScope,
  HarnessPlanStep,
  HarnessToolResult,
  ToolExecutionContext,
} from '../types';
import { harnessToolRegistry } from '../tools/HarnessToolRegistry';
import { permissionManager } from '../permissions/PermissionManager';
import { harnessEventBus } from '../events/HarnessEventBus';

export class HarnessPluginRegistry {
  private static instance: HarnessPluginRegistry;
  private plugins: Map<string, HarnessPlugin> = new Map();
  private pluginStates: Map<string, Map<string, any>> = new Map();

  private constructor() {
    this.registerBuiltInPlugins();
  }

  public static getInstance(): HarnessPluginRegistry {
    if (!HarnessPluginRegistry.instance) {
      HarnessPluginRegistry.instance = new HarnessPluginRegistry();
    }
    return HarnessPluginRegistry.instance;
  }

  /**
   * Register and initialize a plugin in the Harness system.
   */
  public async registerPlugin(plugin: HarnessPlugin): Promise<void> {
    const pluginId = plugin.metadata.id;

    // Grant required capabilities
    if (plugin.requiredPermissions && plugin.requiredPermissions.length > 0) {
      permissionManager.grantPermissions(pluginId, plugin.requiredPermissions, 'system');
    }

    this.plugins.set(pluginId, plugin);
    if (!this.pluginStates.has(pluginId)) {
      this.pluginStates.set(pluginId, new Map());
    }

    // Register plugin-declared tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        harnessToolRegistry.registerTool(tool);
      }
    }

    // Initialize plugin context
    const context: PluginContext = {
      pluginId,
      registerTool: (tool: HarnessTool) => harnessToolRegistry.registerTool(tool),
      unregisterTool: (toolName: string) => harnessToolRegistry.unregisterTool(toolName),
      getPluginState: <T = any>(key: string): T | undefined => {
        return this.pluginStates.get(pluginId)?.get(key);
      },
      setPluginState: <T = any>(key: string, value: T): void => {
        if (!this.pluginStates.has(pluginId)) {
          this.pluginStates.set(pluginId, new Map());
        }
        this.pluginStates.get(pluginId)!.set(key, value);
      },
      emitEvent: (type: string, payload: any) => {
        harnessEventBus.emit(`plugin.${pluginId}.${type}`, payload);
      },
      hasPermission: (scope: PermissionScope) => {
        return permissionManager.checkPermission(pluginId, scope).allowed;
      },
    };

    try {
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
      harnessEventBus.emit('plugin.loaded', {
        pluginId,
        name: plugin.metadata.name,
        capabilities: plugin.capabilities,
      });
    } catch (err: any) {
      console.error(`[HarnessPluginRegistry] Failed to initialize plugin '${pluginId}':`, err);
      harnessEventBus.emit('plugin.error', { pluginId, error: err?.message });
    }
  }

  /**
   * Enable or disable a plugin dynamically.
   */
  public setPluginEnabled(pluginId: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;
    plugin.enabled = enabled;

    // Enable / disable associated tools
    if (plugin.tools) {
      for (const tool of plugin.tools) {
        if (enabled) {
          harnessToolRegistry.registerTool(tool);
        } else {
          harnessToolRegistry.unregisterTool(tool.name);
        }
      }
    }

    harnessEventBus.emit(enabled ? 'plugin.enabled' : 'plugin.disabled', { pluginId });
    return true;
  }

  /**
   * Trigger lifecycle hooks across all active plugins.
   */
  public async executeBeforeStepHooks(step: HarnessPlanStep, context: ToolExecutionContext): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.hooks?.beforeStep) {
        try {
          await plugin.hooks.beforeStep(step, context);
        } catch (e) {
          console.warn(`[PluginHook] beforeStep error in ${plugin.metadata.id}:`, e);
        }
      }
    }
  }

  public async executeAfterStepHooks(
    step: HarnessPlanStep,
    result: HarnessToolResult,
    context: ToolExecutionContext
  ): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.enabled && plugin.hooks?.afterStep) {
        try {
          await plugin.hooks.afterStep(step, result, context);
        } catch (e) {
          console.warn(`[PluginHook] afterStep error in ${plugin.metadata.id}:`, e);
        }
      }
    }
  }

  public getPlugin(id: string): HarnessPlugin | undefined {
    return this.plugins.get(id);
  }

  public getAllPlugins(): HarnessPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Register standard built-in plugins.
   */
  private registerBuiltInPlugins(): void {
    // 1. Web Search & Information Retrieval Plugin
    this.registerPlugin({
      metadata: {
        id: 'web-search-plugin',
        name: 'Web Intelligence & Search Plugin',
        version: '1.0.0',
        description: 'Enables live online web searches, knowledge grounding, and citation discovery.',
      },
      capabilities: ['web_search', 'knowledge_grounding', 'live_facts'],
      requiredPermissions: ['network:search'],
      enabled: true,
      initialize: async () => {},
    });

    // 2. System Control & Device Automation Plugin
    this.registerPlugin({
      metadata: {
        id: 'system-control-plugin',
        name: 'System Controller & App Launcher',
        version: '1.0.0',
        description: 'Orchestrates device intents, application launch, and phone control.',
      },
      capabilities: ['app_launch', 'system_control', 'device_intent'],
      requiredPermissions: ['system:control', 'system:app_launch'],
      enabled: true,
      initialize: async () => {},
    });

    // 3. Scratchpad & Memory Synthesis Plugin
    this.registerPlugin({
      metadata: {
        id: 'memory-scratchpad-plugin',
        name: 'Agent Scratchpad & Memory Engine',
        version: '1.0.0',
        description: 'Provides persistent and task-isolated associative scratchpad storage.',
      },
      capabilities: ['scratchpad', 'task_memory', 'variable_state'],
      requiredPermissions: ['memory:read', 'memory:write'],
      enabled: true,
      initialize: async () => {},
    });

    // 4. Research & Multi-Step Reasoning Plugin
    this.registerPlugin({
      metadata: {
        id: 'deep-research-plugin',
        name: 'Multi-Step Research & Synthesis Plugin',
        version: '1.0.0',
        description: 'Decomposes complex scientific and academic questions into structured sub-investigations.',
      },
      capabilities: ['deep_research', 'multi_step_synthesis', 'hypothesis_testing'],
      requiredPermissions: ['network:search', 'memory:write'],
      enabled: true,
      initialize: async () => {},
    });
  }
}

export const harnessPluginRegistry = HarnessPluginRegistry.getInstance();
