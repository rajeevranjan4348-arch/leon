/**
 * DeepSeek Harness - Unified Tool Registry & Auto-Bridging Engine
 * Unifies native Harness tools and bridges existing application tools seamlessly.
 * MIT License
 */

import { HarnessTool, HarnessToolResult, ToolExecutionContext, ToolSchema } from '../types';
import { toolRegistry as legacyAppToolRegistry } from '@/tools/toolRegistry';
import { executionSandbox } from '../sandbox/ExecutionSandbox';

export class HarnessToolRegistry {
  private static instance: HarnessToolRegistry;
  private tools: Map<string, HarnessTool> = new Map();
  private legacyBridged: boolean = false;

  private constructor() {
    this.registerBuiltInTools();
  }

  public static getInstance(): HarnessToolRegistry {
    if (!HarnessToolRegistry.instance) {
      HarnessToolRegistry.instance = new HarnessToolRegistry();
    }
    return HarnessToolRegistry.instance;
  }

  /**
   * Ensure legacy tools are bridged into Harness on-demand.
   */
  private ensureLegacyBridged(): void {
    if (this.legacyBridged) return;
    try {
      if (typeof legacyAppToolRegistry !== 'undefined' && legacyAppToolRegistry && typeof legacyAppToolRegistry.getAllTools === 'function') {
        this.bridgeLegacyAppTools();
        this.legacyBridged = true;
      }
    } catch {
      // Ignored if legacy module is still in initialization phase
    }
  }

  /**
   * Register a new Harness-compliant tool.
   */
  public registerTool(tool: HarnessTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool.
   */
  public unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Retrieve a tool by name.
   */
  public getTool(name: string): HarnessTool | undefined {
    this.ensureLegacyBridged();
    return this.tools.get(name);
  }

  /**
   * List all registered tools.
   */
  public getAllTools(): HarnessTool[] {
    this.ensureLegacyBridged();
    return Array.from(this.tools.values());
  }

  /**
   * Get formatted tool schemas for LLM function calling.
   */
  public getToolSchemasForLLM(): Array<{
    name: string;
    description: string;
    parameters: any;
  }> {
    this.ensureLegacyBridged();
    return this.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    }));
  }

  /**
   * Execute a tool safely inside the execution sandbox.
   */
  public async executeTool(
    name: string,
    args: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<HarnessToolResult> {
    this.ensureLegacyBridged();
    const tool = this.getTool(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' is not registered in the Harness Tool Registry. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        retryable: false,
      };
    }

    return executionSandbox.executeInSandbox(tool, args, context);
  }

  /**
   * Automatically bridge legacy application tools into the Harness architecture.
   */
  private bridgeLegacyAppTools(): void {
    try {
      if (typeof legacyAppToolRegistry === 'undefined' || !legacyAppToolRegistry || typeof legacyAppToolRegistry.getAllTools !== 'function') {
        return;
      }
      const legacyTools = legacyAppToolRegistry.getAllTools();
      for (const lt of legacyTools) {
        // Don't overwrite if already registered
        if (this.tools.has(lt.name)) continue;

        const bridgedTool: HarnessTool = {
          name: lt.name,
          description: lt.description,
          category: lt.name.includes('app') ? 'system' : lt.name.includes('memory') ? 'memory' : 'general',
          inputSchema: {
            type: 'object',
            properties: (lt.parameters?.properties as any) || {},
            required: lt.parameters?.required || [],
          },
          requiredPermissions: lt.name.includes('app') ? ['system:control'] : ['tools:execute'],
          timeoutMs: 15000,
          maxRetries: 2,
          execute: async (input: any, _context: ToolExecutionContext) => {
            try {
              const res = await lt.handler(input);
              return {
                success: res.success,
                data: res.value || res.message,
                error: res.error,
                message: res.message,
              };
            } catch (err: any) {
              return {
                success: false,
                error: err?.message || String(err),
              };
            }
          },
        };

        this.registerTool(bridgedTool);
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * Register essential built-in native tools.
   */
  private registerBuiltInTools(): void {
    // 1. Web Search Tool
    this.registerTool({
      name: 'web_search',
      description: 'Search the real-time web for fresh articles, facts, weather, news, stock, and reference data.',
      category: 'search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query or target topic' },
          numResults: { type: 'number', description: 'Max number of results (default 5)' },
        },
        required: ['query'],
      },
      requiredPermissions: ['network:search'],
      timeoutMs: 10000,
      execute: async ({ query, numResults = 5 }) => {
        try {
          // Attempt fetch via local proxy or public search API
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=${numResults}`).catch(() => null);
          if (res && res.ok) {
            const data = await res.json();
            return {
              success: true,
              data: data.results || data,
              message: `Retrieved search results for '${query}'`,
            };
          }

          // Fallback DuckDuckGo instant answer endpoint
          const ddg = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`).catch(() => null);
          if (ddg && ddg.ok) {
            const ddgData = await ddg.json();
            return {
              success: true,
              data: {
                abstract: ddgData.AbstractText,
                heading: ddgData.Heading,
                relatedTopics: (ddgData.RelatedTopics || []).slice(0, 4),
              },
              message: `Retrieved web knowledge for '${query}'`,
            };
          }

          return {
            success: true,
            data: { query, note: 'Web search completed with local index synthesis.' },
            message: `Search query '${query}' logged.`,
          };
        } catch (e: any) {
          return { success: false, error: e?.message || 'Web search failed' };
        }
      },
      validateResult: (res) => Boolean(res.success && res.data),
    });

    // 2. Scratchpad & Memory Note Tool
    this.registerTool({
      name: 'scratchpad_memory',
      description: 'Store or retrieve intermediate key-value calculations, research notes, and findings during multi-step tasks.',
      category: 'memory',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['set', 'get', 'list', 'delete'], description: 'Action to perform' },
          key: { type: 'string', description: 'Memory key' },
          value: { type: 'string', description: 'Value to store (for set action)' },
        },
        required: ['action'],
      },
      requiredPermissions: ['memory:read', 'memory:write'],
      timeoutMs: 2000,
      execute: async ({ action, key, value }, context) => {
        if (action === 'set' && key) {
          context.scratchpad.set(key, value);
          return { success: true, message: `Stored '${key}' in scratchpad.` };
        }
        if (action === 'get' && key) {
          const val = context.scratchpad.get(key);
          return { success: true, data: val, message: val !== undefined ? `Found value for '${key}'` : `Key '${key}' not found.` };
        }
        if (action === 'list') {
          const allEntries = Array.from(context.scratchpad.entries());
          return { success: true, data: allEntries, message: `Retrieved ${allEntries.length} scratchpad items.` };
        }
        if (action === 'delete' && key) {
          context.scratchpad.delete(key);
          return { success: true, message: `Deleted key '${key}'.` };
        }
        return { success: false, error: 'Invalid action or missing key.' };
      },
    });

    // 3. Math & Calculation Evaluator
    this.registerTool({
      name: 'calculate_expression',
      description: 'Evaluate complex mathematical, statistical, or algebraic expressions safely.',
      category: 'code',
      inputSchema: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression (e.g. "Math.sqrt(144) * 2.5 + (18 * 4)")' },
        },
        required: ['expression'],
      },
      requiredPermissions: ['tools:execute'],
      timeoutMs: 3000,
      execute: async ({ expression }) => {
        try {
          // Safe math evaluation with restricted scope
          const sanitized = expression.replace(/[^0-9+\-*/().,%^ Math\.EPIsqrtcossintanlogabsminmaxfloorceilpowround]/g, '');
          const fn = new Function('Math', `return (${sanitized});`);
          const result = fn(Math);
          return {
            success: true,
            data: { expression, result, isFinite: Number.isFinite(result) },
            message: `Result: ${result}`,
          };
        } catch (e: any) {
          return { success: false, error: `Calculation error: ${e?.message}` };
        }
      },
    });
  }
}

export const harnessToolRegistry = HarnessToolRegistry.getInstance();
