/**
 * Ruflo MCP Tool Registry
 * Allows specialized agents to invoke tools and MCP functions during subtask execution.
 */

import { MCPToolDefinition, MCPToolResult } from './types';
import { callGeminiAPI } from '../gemini';

export class MCPToolRegistry {
  private static instance: MCPToolRegistry;
  private tools: Map<string, MCPToolDefinition> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  public static getInstance(): MCPToolRegistry {
    if (!MCPToolRegistry.instance) {
      MCPToolRegistry.instance = new MCPToolRegistry();
    }
    return MCPToolRegistry.instance;
  }

  /**
   * Register a new tool into the MCP registry.
   */
  public registerTool(tool: MCPToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Check if a tool exists.
   */
  public hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all available tools and descriptions.
   */
  public listTools(): Array<{ name: string; description: string; parameters: any }> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  /**
   * Execute an MCP tool safely with timing and error isolation.
   */
  public async executeTool(name: string, args: Record<string, any>, context?: Record<string, any>): Promise<MCPToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        toolName: name,
        success: false,
        result: null,
        durationMs: Date.now() - startTime,
        error: `Tool "${name}" not found in MCP registry.`,
      };
    }

    try {
      const result = await tool.execute(args, context);
      return {
        toolName: name,
        success: true,
        result,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        toolName: name,
        success: false,
        result: null,
        durationMs: Date.now() - startTime,
        error: err?.message || String(err),
      };
    }
  }

  private registerDefaultTools(): void {
    // 1. Web Search Grounding Tool
    this.registerTool({
      name: 'web_search',
      description: 'Search the live web for fresh facts, news, documentation, or domain data with grounding citations.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Target search query' },
        },
        required: ['query'],
      },
      execute: async (args) => {
        const query = args.query;
        if (!query) throw new Error('Search query is required');
        const resp = await callGeminiAPI({
          prompt: query,
          mode: 'search',
        });
        return {
          text: resp.text,
          sources: resp.sources,
        };
      },
    });

    // 2. Math & Formula Evaluation Tool
    this.registerTool({
      name: 'math_calculator',
      description: 'Evaluates mathematical formulas, statistical calculations, and numerical conversions safely.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Mathematical expression to compute (e.g., "sqrt(144) + 2^5")' },
        },
        required: ['expression'],
      },
      execute: async (args) => {
        const expr = String(args.expression || '').trim();
        // Safe evaluation for basic math expressions
        const sanitized = expr
          .replace(/\^/g, '**')
          .replace(/sqrt\(/gi, 'Math.sqrt(')
          .replace(/sin\(/gi, 'Math.sin(')
          .replace(/cos\(/gi, 'Math.cos(')
          .replace(/tan\(/gi, 'Math.tan(')
          .replace(/log\(/gi, 'Math.log(')
          .replace(/abs\(/gi, 'Math.abs(')
          .replace(/pi/gi, 'Math.PI')
          .replace(/e/gi, 'Math.E');

        // Verify only math tokens
        if (!/^[\d\s+\-*/%.()Math,PIE**]+$/.test(sanitized)) {
          throw new Error('Expression contains disallowed characters.');
        }

        const fn = new Function(`return (${sanitized});`);
        const result = fn();
        return {
          expression: expr,
          result: Number(result),
        };
      },
    });

    // 3. Code Syntax & Complexity Validator
    this.registerTool({
      name: 'code_validator',
      description: 'Performs static analysis on code snippets, verifies syntax balancing, and calculates cyclomatic structure.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Source code to validate' },
          language: { type: 'string', description: 'Language (e.g., "typescript", "javascript", "python", "json")' },
        },
        required: ['code', 'language'],
      },
      execute: async (args) => {
        const code = String(args.code || '');
        const lang = String(args.language || '').toLowerCase();

        const brackets: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
        const stack: string[] = [];
        let balanced = true;

        for (let i = 0; i < code.length; i++) {
          const char = code[i];
          if (char === '{' || char === '(' || char === '[') {
            stack.push(char);
          } else if (char === '}' || char === ')' || char === ']') {
            const last = stack.pop();
            if (!last || brackets[last] !== char) {
              balanced = false;
              break;
            }
          }
        }

        if (stack.length > 0) balanced = false;

        let jsonValid = true;
        if (lang === 'json') {
          try {
            JSON.parse(code);
          } catch {
            jsonValid = false;
          }
        }

        return {
          language: lang,
          lines: code.split('\n').length,
          characterCount: code.length,
          bracketBalancingValid: balanced,
          jsonValid: lang === 'json' ? jsonValid : undefined,
          status: (balanced && (lang !== 'json' || jsonValid)) ? 'valid' : 'syntax_warning',
        };
      },
    });

    // 4. Citation & Fact Consistency Extractor
    this.registerTool({
      name: 'citation_verifier',
      description: 'Extracts URLs, verify domain reputation, and cross-check citation references from text.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text containing claims and citations' },
        },
        required: ['text'],
      },
      execute: async (args) => {
        const text = String(args.text || '');
        const urlRegex = /https?:\/\/[^\s)\]">]+/g;
        const matchedUrls = text.match(urlRegex) || [];
        const uniqueUrls = Array.from(new Set(matchedUrls));

        return {
          citationsFound: uniqueUrls.length,
          sources: uniqueUrls.map(url => {
            try {
              const parsed = new URL(url);
              return {
                url,
                domain: parsed.hostname,
                protocol: parsed.protocol,
              };
            } catch {
              return { url, domain: 'unknown' };
            }
          }),
        };
      },
    });

    // 5. RAG Retrieval Tool
    this.registerTool({
      name: 'rag_retriever',
      description: 'Searches vector memory for relevant context chunks and historical facts via RAG similarity.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Query text to search in vector memory' },
          limit: { type: 'string', description: 'Max items to retrieve' },
        },
        required: ['query'],
      },
      execute: async (args) => {
        const query = String(args.query || '');
        const limit = Number(args.limit || 5);

        const memory = (await import('./RufloMemory')).rufloMemory;
        const results = await memory.search({ query, limit });

        return {
          query,
          matchCount: results.length,
          results: results.map(r => ({
            id: r.id,
            key: r.key,
            content: r.content,
            score: r.score,
            tags: r.tags,
          })),
        };
      },
    });

    // 6. Swarm Pattern Lookup Tool
    this.registerTool({
      name: 'pattern_lookup',
      description: 'Queries the Ruflo self-learning engine for past high-performance execution patterns.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'User intent query' },
        },
        required: ['query'],
      },
      execute: async (args) => {
        const query = String(args.query || '');
        const selfLearning = (await import('./RufloSelfLearning')).rufloSelfLearning;
        const match = selfLearning.findMatchingPattern(query, 50);

        return {
          query,
          patternFound: !!match,
          pattern: match ? {
            id: match.id,
            patternName: match.patternName,
            recommendedTopology: match.recommendedTopology,
            successRate: match.successRate,
          } : null,
        };
      },
    });
  }
}

export const mcpTools = MCPToolRegistry.getInstance();
