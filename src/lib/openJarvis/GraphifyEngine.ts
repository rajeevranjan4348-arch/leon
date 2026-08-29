/**
 * GraphifyEngine - Open Jarvis Persistent Knowledge Graph Memory System
 * Ported from com.openjarvis.graphify.* (GraphifyDB, GraphifyRepository, AnalysisEngine)
 */

import {
  GraphifyAppNode,
  GraphifyContactNode,
  GraphifyEdge,
  GraphifyPatternNode,
  GraphifyTaskNode,
} from './types';

export class GraphifyEngine {
  private static instance: GraphifyEngine;
  private appNodes = new Map<string, GraphifyAppNode>();
  private taskNodes: GraphifyTaskNode[] = [];
  private contactNodes = new Map<string, GraphifyContactNode>();
  private patternNodes: GraphifyPatternNode[] = [];
  private edges: GraphifyEdge[] = [];

  private STORAGE_KEY = 'open_jarvis_graphify_db';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): GraphifyEngine {
    if (!GraphifyEngine.instance) {
      GraphifyEngine.instance = new GraphifyEngine();
    }
    return GraphifyEngine.instance;
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.appNodes) {
          data.appNodes.forEach((node: GraphifyAppNode) => this.appNodes.set(node.packageName, node));
        }
        if (data.taskNodes) this.taskNodes = data.taskNodes;
        if (data.contactNodes) {
          data.contactNodes.forEach((node: GraphifyContactNode) =>
            this.contactNodes.set(node.contactId, node)
          );
        }
        if (data.patternNodes) this.patternNodes = data.patternNodes;
        if (data.edges) this.edges = data.edges;
      }
    } catch {
      // Storage fallback
    }
  }

  private saveToStorage() {
    try {
      const data = {
        appNodes: Array.from(this.appNodes.values()),
        taskNodes: this.taskNodes.slice(-200), // Keep last 200 tasks
        contactNodes: Array.from(this.contactNodes.values()),
        patternNodes: this.patternNodes,
        edges: this.edges.slice(-500),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage error ignored
    }
  }

  public logAppUsage(packageName: string, label: string): GraphifyAppNode {
    const existing = this.appNodes.get(packageName);
    const updated: GraphifyAppNode = {
      id: existing ? existing.id : `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      packageName,
      label,
      lastUsed: Date.now(),
      useCount: (existing?.useCount || 0) + 1,
    };
    this.appNodes.set(packageName, updated);
    this.saveToStorage();
    return updated;
  }

  public logTaskExecution(command: string, result: string, providerUsed?: string): GraphifyTaskNode {
    const taskNode: GraphifyTaskNode = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      command,
      result,
      timestamp: Date.now(),
      providerUsed,
    };
    this.taskNodes.push(taskNode);
    this.saveToStorage();
    return taskNode;
  }

  public getRecentApps(limit = 5): GraphifyAppNode[] {
    return Array.from(this.appNodes.values())
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }

  public getMostUsedApps(limit = 5): GraphifyAppNode[] {
    return Array.from(this.appNodes.values())
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
  }

  public findSimilarPastTasks(query: string, limit = 3): GraphifyTaskNode[] {
    const q = query.toLowerCase();
    return this.taskNodes
      .filter((t) => t.command.toLowerCase().includes(q))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public addEdge(
    sourceId: string,
    targetId: string,
    edgeType: GraphifyEdge['edgeType'],
    weight = 1.0
  ): GraphifyEdge {
    const existingIndex = this.edges.findIndex(
      (e) => e.sourceNodeId === sourceId && e.targetNodeId === targetId && e.edgeType === edgeType
    );

    if (existingIndex !== -1) {
      this.edges[existingIndex].weight += weight;
      this.edges[existingIndex].lastUpdated = Date.now();
      this.saveToStorage();
      return this.edges[existingIndex];
    }

    const newEdge: GraphifyEdge = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      edgeType,
      weight,
      lastUpdated: Date.now(),
    };
    this.edges.push(newEdge);
    this.saveToStorage();
    return newEdge;
  }

  /**
   * Generates graphify context string to inject into LLM prompts
   */
  public buildMemoryContext(queryPrompt: string): string {
    const recentApps = this.getRecentApps(5);
    const similarTasks = this.findSimilarPastTasks(queryPrompt, 3);

    const appLines = recentApps.length
      ? recentApps.map((a) => `- ${a.label} (${a.packageName}, used ${a.useCount}x)`).join('\n')
      : 'None recorded';

    const taskLines = similarTasks.length
      ? similarTasks.map((t) => `- "${t.command}" -> Result: ${t.result}`).join('\n')
      : 'No previous matching execution';

    return `GRAPHIFY KNOWLEDGE GRAPH CONTEXT:
[Recent App Usage Nodes]
${appLines}

[Relevant Historical Task Nodes]
${taskLines}`;
  }
}

export const graphifyEngine = GraphifyEngine.getInstance();
