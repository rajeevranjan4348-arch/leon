import { MemoryItem, MemoryScope, ContextTreeNode, MemoryQueryResult, MemorySearchOptions } from './types';

const MEMORY_STORAGE_KEY = 'ai_app_unified_memory_v1';
const CONTEXT_TREE_KEY = 'ai_app_openviking_context_tree_v1';

export class UnifiedMemoryEngine {
  private static instance: UnifiedMemoryEngine;
  private memoryStore: Map<string, MemoryItem> = new Map();
  private contextNodes: Map<string, ContextTreeNode> = new Map();

  private constructor() {
    this.initializeDefaultContextTree();
    this.loadFromStorage();
  }

  public static getInstance(): UnifiedMemoryEngine {
    if (!UnifiedMemoryEngine.instance) {
      UnifiedMemoryEngine.instance = new UnifiedMemoryEngine();
    }
    return UnifiedMemoryEngine.instance;
  }

  private initializeDefaultContextTree(): void {
    const rootNode: ContextTreeNode = {
      id: 'root_context',
      name: 'Root Application Context',
      nodeType: 'root',
      level: 'L0_abstract',
      content: 'Global system knowledge root containing abstract goals, preferences, and session context.',
      childrenIds: ['user_profile_node', 'active_session_node', 'knowledge_base_node'],
      attributes: { createdBy: 'OpenVikingContextEngine' },
      updatedAt: new Date().toISOString(),
    };

    const userProfileNode: ContextTreeNode = {
      id: 'user_profile_node',
      parentId: 'root_context',
      name: 'User Profile & Preferences',
      nodeType: 'category',
      level: 'L1_overview',
      content: 'User background, explicit preferences, interaction style, and domain interests.',
      childrenIds: [],
      attributes: { category: 'preferences' },
      updatedAt: new Date().toISOString(),
    };

    const activeSessionNode: ContextTreeNode = {
      id: 'active_session_node',
      parentId: 'root_context',
      name: 'Active Task & Short-Term Memory',
      nodeType: 'category',
      level: 'L1_overview',
      content: 'Short-term execution state, current goal decomposition, and recent tool responses.',
      childrenIds: [],
      attributes: { category: 'short_term' },
      updatedAt: new Date().toISOString(),
    };

    const knowledgeBaseNode: ContextTreeNode = {
      id: 'knowledge_base_node',
      parentId: 'root_context',
      name: 'Persisted Knowledge & RAG Index',
      nodeType: 'category',
      level: 'L1_overview',
      content: 'Extracted facts, documents, code snippets, scientific research, and long-term knowledge.',
      childrenIds: [],
      attributes: { category: 'knowledge' },
      updatedAt: new Date().toISOString(),
    };

    [rootNode, userProfileNode, activeSessionNode, knowledgeBaseNode].forEach(node => {
      this.contextNodes.set(node.id, node);
    });
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawMem = localStorage.getItem(MEMORY_STORAGE_KEY);
        if (rawMem) {
          const parsed: MemoryItem[] = JSON.parse(rawMem);
          parsed.forEach(item => this.memoryStore.set(item.id, item));
        }
        const rawTree = localStorage.getItem(CONTEXT_TREE_KEY);
        if (rawTree) {
          const parsedTree: ContextTreeNode[] = JSON.parse(rawTree);
          parsedTree.forEach(node => this.contextNodes.set(node.id, node));
        }
      }
    } catch (e) {
      console.warn('[UnifiedMemoryEngine] Failed to load local storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(Array.from(this.memoryStore.values())));
        localStorage.setItem(CONTEXT_TREE_KEY, JSON.stringify(Array.from(this.contextNodes.values())));
      }
    } catch (e) {
      console.warn('[UnifiedMemoryEngine] Failed to persist memory storage:', e);
    }
  }

  /**
   * Save or update a memory item (AgentMemory pattern)
   */
  public storeMemory(params: {
    key: string;
    value: any;
    scope?: MemoryScope;
    category?: string;
    summary?: string;
    tags?: string[];
    importanceScore?: number;
    metadata?: Record<string, any>;
  }): MemoryItem {
    const now = new Date().toISOString();
    const id = `mem_${params.category || 'gen'}_${params.key.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const existing = this.memoryStore.get(id);

    const item: MemoryItem = {
      id,
      scope: params.scope || 'long_term',
      category: params.category || 'general',
      key: params.key,
      value: params.value,
      summary: params.summary || (typeof params.value === 'string' ? params.value.slice(0, 150) : JSON.stringify(params.value).slice(0, 150)),
      tags: params.tags || ['general'],
      importanceScore: params.importanceScore ?? 0.7,
      accessCount: (existing?.accessCount || 0) + 1,
      lastAccessedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      metadata: params.metadata || {},
    };

    this.memoryStore.set(id, item);
    this.saveToStorage();
    return item;
  }

  /**
   * Retrieve memory by key or search query with semantic relevance scoring
   */
  public queryMemory(query: string, options: MemorySearchOptions = {}): MemoryQueryResult {
    const start = Date.now();
    const lowerQuery = query.toLowerCase().trim();
    const terms = lowerQuery.split(/\s+/).filter(Boolean);

    const results: Array<{ item: MemoryItem; score: number }> = [];

    this.memoryStore.forEach(item => {
      if (options.scope && item.scope !== options.scope) return;
      if (options.category && item.category !== options.category) return;
      if (options.minImportanceScore && item.importanceScore < options.minImportanceScore) return;

      let score = 0;
      const searchableText = `${item.key} ${item.summary || ''} ${JSON.stringify(item.value)} ${item.tags.join(' ')}`.toLowerCase();

      if (!query || query === '*') {
        score = item.importanceScore;
      } else {
        terms.forEach(term => {
          if (item.key.toLowerCase().includes(term)) score += 0.4;
          if (item.tags.some(t => t.toLowerCase().includes(term))) score += 0.3;
          if (searchableText.includes(term)) score += 0.2;
        });
        score = score * (0.6 + item.importanceScore * 0.4);
      }

      if (score > 0) {
        results.push({ item, score });
      }
    });

    results.sort((a, b) => b.score - a.score);

    const limit = options.limit || 10;
    const sliced = results.slice(0, limit);

    // Update access metadata
    sliced.forEach(r => {
      r.item.accessCount += 1;
      r.item.lastAccessedAt = new Date().toISOString();
    });
    if (sliced.length > 0) this.saveToStorage();

    // Context tree node matching (OpenViking pattern)
    const matchedNodes = Array.from(this.contextNodes.values()).filter(node =>
      !query || query === '*' || node.name.toLowerCase().includes(lowerQuery) || node.content.toLowerCase().includes(lowerQuery)
    );

    return {
      items: sliced.map(s => s.item),
      contextNodes: matchedNodes,
      totalCount: results.length,
      relevanceScores: sliced.map(s => Math.min(1.0, parseFloat(s.score.toFixed(3)))),
      queryTimeMs: Date.now() - start,
    };
  }

  /**
   * Add a hierarchical context node (OpenViking pattern)
   */
  public addContextNode(params: {
    name: string;
    content: string;
    parentId?: string;
    nodeType?: ContextTreeNode['nodeType'];
    level?: ContextTreeNode['level'];
    attributes?: Record<string, any>;
  }): ContextTreeNode {
    const id = `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const node: ContextTreeNode = {
      id,
      parentId: params.parentId || 'root_context',
      name: params.name,
      nodeType: params.nodeType || 'fragment',
      level: params.level || 'L2_detail',
      content: params.content,
      childrenIds: [],
      attributes: params.attributes || {},
      updatedAt: new Date().toISOString(),
    };

    this.contextNodes.set(id, node);

    // Update parent's children array
    if (node.parentId && this.contextNodes.has(node.parentId)) {
      const parent = this.contextNodes.get(node.parentId)!;
      if (!parent.childrenIds.includes(id)) {
        parent.childrenIds.push(id);
        parent.updatedAt = new Date().toISOString();
      }
    }

    this.saveToStorage();
    return node;
  }

  /**
   * Compact / Decay low-importance memory items to keep storage lean
   */
  public compactMemory(): { removedCount: number; activeCount: number } {
    let removed = 0;
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    this.memoryStore.forEach((item, id) => {
      const ageMs = now - new Date(item.lastAccessedAt).getTime();
      if (item.importanceScore < 0.3 && ageMs > THIRTY_DAYS_MS && item.scope !== 'knowledge_rag') {
        this.memoryStore.delete(id);
        removed++;
      }
    });

    if (removed > 0) this.saveToStorage();
    return { removedCount: removed, activeCount: this.memoryStore.size };
  }

  /**
   * Universal store convenience method
   */
  public async store(params: { content: string; category?: string; tags?: string[]; key?: string }): Promise<string> {
    const key = params.key || `fact_${Date.now()}`;
    const item = this.storeMemory({
      key,
      value: params.content,
      category: params.category || 'general',
      summary: params.content.slice(0, 150),
      tags: params.tags || ['general'],
      importanceScore: 0.8,
    });
    return item.id;
  }

  /**
   * Universal recall convenience method
   */
  public async recall(query: string, options?: { limit?: number }): Promise<Array<{ content: string; category: string; score: number }>> {
    const res = this.queryMemory(query, { limit: options?.limit || 5 });
    return res.items.map((item, idx) => ({
      content: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
      category: item.category,
      score: res.relevanceScores[idx] ?? item.importanceScore,
    }));
  }

  /**
   * Get formatted context string ready for LLM System Prompt injection
   */
  public getPromptContext(maxTokensApprox = 1000): string {
    const topMemories = this.queryMemory('*', { limit: 8, minImportanceScore: 0.5 }).items;
    const contextList = topMemories.map(m => `• [${m.category.toUpperCase()}] ${m.key}: ${m.summary || JSON.stringify(m.value)}`).join('\n');

    return `=== UNIFIED MEMORY & CONTEXT (AgentMemory + OpenViking Engine) ===\n${contextList || 'No long-term memories registered yet.'}\n===================================================================`;
  }
}

export const unifiedMemoryEngine = UnifiedMemoryEngine.getInstance();
