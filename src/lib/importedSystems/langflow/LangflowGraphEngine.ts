import {
  LangflowGraph,
  LangflowNode,
  LangflowExecutionContext,
  LangflowWorkflowResult,
  LangflowNodeType,
} from './types';
import { callGeminiAPI } from '../../gemini';
import { SearchEngineOrchestrator } from '../../search/SearchEngineOrchestrator';
import { unifiedMemoryEngine } from '../unifiedMemory/UnifiedMemoryEngine';

/**
 * LangflowGraphEngine
 * Node execution architecture and DAG workflow engine based on langflow-ai/langflow.
 */
export class LangflowGraphEngine {
  private static instance: LangflowGraphEngine;
  private prebuiltWorkflows = new Map<string, LangflowGraph>();

  private constructor() {
    this.registerPrebuiltWorkflows();
  }

  public static getInstance(): LangflowGraphEngine {
    if (!LangflowGraphEngine.instance) {
      LangflowGraphEngine.instance = new LangflowGraphEngine();
    }
    return LangflowGraphEngine.instance;
  }

  /**
   * Topological sorting for DAG execution order.
   */
  private sortNodesTopologically(graph: LangflowGraph): LangflowNode[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    graph.nodes.forEach(n => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    graph.edges.forEach(e => {
      inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) || 0) + 1);
      adj.get(e.sourceNodeId)?.push(e.targetNodeId);
    });

    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const orderedIds: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      orderedIds.push(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        inDegree.set(v, (inDegree.get(v) || 1) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (orderedIds.length < graph.nodes.length) {
      // Fallback in case of cycle
      return graph.nodes;
    }

    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    return orderedIds.map(id => nodeMap.get(id)!);
  }

  /**
   * Resolves inputs for a node by pulling outputs from predecessor nodes via connected edges.
   */
  private resolveNodeInputs(
    node: LangflowNode,
    graph: LangflowGraph,
    context: LangflowExecutionContext
  ): Record<string, any> {
    const resolved: Record<string, any> = { ...node.inputs };

    const incomingEdges = graph.edges.filter(e => e.targetNodeId === node.id);
    for (const edge of incomingEdges) {
      const sourceOutput = context.nodeOutputs[edge.sourceNodeId];
      if (sourceOutput !== undefined) {
        if (typeof sourceOutput === 'object' && sourceOutput !== null && edge.sourceHandle in sourceOutput) {
          resolved[edge.targetHandle] = sourceOutput[edge.sourceHandle];
        } else {
          resolved[edge.targetHandle] = sourceOutput;
        }
      }
    }

    return resolved;
  }

  /**
   * Executes a single node by its type.
   */
  private async executeNode(
    node: LangflowNode,
    resolvedInputs: Record<string, any>,
    context: LangflowExecutionContext
  ): Promise<any> {
    switch (node.type) {
      case 'prompt': {
        const template = node.config?.template || resolvedInputs.template || '{input}';
        let populated = template;
        for (const [key, val] of Object.entries(resolvedInputs)) {
          populated = populated.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
        }
        return { promptText: populated };
      }

      case 'model': {
        const prompt = resolvedInputs.prompt || resolvedInputs.promptText || resolvedInputs.input || '';
        const systemInstruction = node.config?.systemInstruction || resolvedInputs.systemInstruction;
        const temperature = node.config?.temperature ?? 0.7;

        const geminiRes = await callGeminiAPI({
          prompt: String(prompt),
          systemInstruction,
          temperature,
        });
        const responseText = geminiRes.text || '';
        return { response: responseText, text: responseText };
      }

      case 'retrieval':
      case 'tool': {
        const query = resolvedInputs.query || resolvedInputs.input || '';
        if (node.config?.toolType === 'web_search') {
          const searchRes = await SearchEngineOrchestrator.execute(String(query));
          const snippets = searchRes.sources.map(r => `[${r.title}](${r.url})\n${r.snippet}`).join('\n\n');
          return { searchResults: snippets, rawResults: searchRes.sources };
        } else if (node.config?.toolType === 'memory_lookup') {
          const memories = await unifiedMemoryEngine.recall(String(query), { limit: 3 });
          return { memories: memories.map(m => m.content).join('\n') };
        }
        return { result: `Tool executed with input: ${query}` };
      }

      case 'memory': {
        const action = node.config?.action || 'recall';
        const key = resolvedInputs.key || 'context';
        if (action === 'store' && resolvedInputs.value) {
          await unifiedMemoryEngine.store({
            content: String(resolvedInputs.value),
            category: 'working',
            tags: ['langflow', key],
          });
          return { stored: true };
        }
        const recalled = await unifiedMemoryEngine.recall(key, { limit: 2 });
        return { memoryContext: recalled.map(r => r.content).join('\n') };
      }

      case 'document_processor': {
        const rawText = resolvedInputs.text || resolvedInputs.document || '';
        const chunkSize = node.config?.chunkSize || 500;
        const words = String(rawText).split(/\s+/);
        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += chunkSize) {
          chunks.push(words.slice(i, i + chunkSize).join(' '));
        }
        return { chunks, chunkCount: chunks.length };
      }

      case 'router': {
        const inputVal = String(resolvedInputs.input || '').toLowerCase();
        const routes = node.config?.routes || {};
        let matchedRoute = 'default';
        for (const [routeKey, pattern] of Object.entries(routes)) {
          if (new RegExp(String(pattern), 'i').test(inputVal)) {
            matchedRoute = routeKey;
            break;
          }
        }
        return { selectedRoute: matchedRoute };
      }

      case 'output': {
        return resolvedInputs.input || resolvedInputs.response || resolvedInputs;
      }

      default:
        return resolvedInputs;
    }
  }

  /**
   * Execute a full Langflow Graph pipeline DAG.
   */
  public async executeGraph(
    graph: LangflowGraph,
    initialInputs: Record<string, any> = {}
  ): Promise<LangflowWorkflowResult> {
    const startTime = Date.now();
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const context: LangflowExecutionContext = {
      graphId: graph.id,
      executionId,
      initialInputs,
      nodeOutputs: { ...initialInputs },
      logs: [],
      startTime,
      status: 'running',
    };

    const orderedNodes = this.sortNodesTopologically(graph);
    let finalOutput: any = null;

    try {
      for (const node of orderedNodes) {
        const nodeStartTime = Date.now();
        const resolvedInputs = this.resolveNodeInputs(node, graph, context);

        try {
          const output = await this.executeNode(node, resolvedInputs, context);
          context.nodeOutputs[node.id] = output;
          finalOutput = output;

          context.logs.push({
            timestamp: new Date().toISOString(),
            nodeId: node.id,
            nodeType: node.type,
            status: 'success',
            output,
            durationMs: Date.now() - nodeStartTime,
          });
        } catch (nodeErr: any) {
          context.logs.push({
            timestamp: new Date().toISOString(),
            nodeId: node.id,
            nodeType: node.type,
            status: 'failed',
            error: nodeErr?.message || 'Node execution failed',
            durationMs: Date.now() - nodeStartTime,
          });
          throw nodeErr;
        }
      }

      context.status = 'completed';
      context.endTime = Date.now();

      return {
        graphId: graph.id,
        executionId,
        success: true,
        finalOutput,
        context,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      context.status = 'failed';
      context.endTime = Date.now();

      return {
        graphId: graph.id,
        executionId,
        success: false,
        finalOutput: null,
        context,
        executionTimeMs: Date.now() - startTime,
        error: err?.message || 'Workflow execution error',
      };
    }
  }

  /**
   * Prebuilt templates for common AI workflows.
   */
  private registerPrebuiltWorkflows(): void {
    // 1. RAG Web Search & Synthesis Workflow
    const ragSearchWorkflow: LangflowGraph = {
      id: 'rag-web-synthesis',
      name: 'RAG Web Synthesis Pipeline',
      description: 'Searches real-time web sources, parses snippets, and synthesizes grounded answers with citations.',
      nodes: [
        {
          id: 'search-node',
          type: 'tool',
          name: 'Live Web Search',
          inputs: {},
          outputs: { searchResults: 'string' },
          config: { toolType: 'web_search' },
        },
        {
          id: 'prompt-node',
          type: 'prompt',
          name: 'Grounded Synthesis Prompt',
          inputs: {},
          outputs: { promptText: 'string' },
          config: {
            template: 'User Query: {query}\n\nLive Search Information:\n{searchResults}\n\nPlease provide a clear, accurate, factually grounded answer citing sources directly.',
          },
        },
        {
          id: 'model-node',
          type: 'model',
          name: 'Gemini Synthesizer',
          inputs: {},
          outputs: { response: 'string' },
          config: { temperature: 0.3 },
        },
        {
          id: 'output-node',
          type: 'output',
          name: 'Final Response',
          inputs: {},
          outputs: {},
        },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'search-node', sourceHandle: 'searchResults', targetNodeId: 'prompt-node', targetHandle: 'searchResults' },
        { id: 'e2', sourceNodeId: 'prompt-node', sourceHandle: 'promptText', targetNodeId: 'model-node', targetHandle: 'prompt' },
        { id: 'e3', sourceNodeId: 'model-node', sourceHandle: 'response', targetNodeId: 'output-node', targetHandle: 'input' },
      ],
    };

    this.prebuiltWorkflows.set(ragSearchWorkflow.id, ragSearchWorkflow);
  }

  public getWorkflow(id: string): LangflowGraph | undefined {
    return this.prebuiltWorkflows.get(id);
  }

  public listWorkflows(): LangflowGraph[] {
    return Array.from(this.prebuiltWorkflows.values());
  }
}

export const langflowGraphEngine = LangflowGraphEngine.getInstance();
