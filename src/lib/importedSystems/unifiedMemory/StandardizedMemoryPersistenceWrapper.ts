/**
 * Standardized Memory Persistence Wrapper
 * Consolidates short-term conversation storage and long-term agent memory into a single structured schema.
 * Provides compatible data retrieval and synchronization across Ruflo (AgentDB) and Letta components.
 */

import {
  StandardizedMemoryRecord,
  StandardizedQueryOptions,
  StandardizedQueryResult,
  MemoryKind,
  MemorySourceComponent
} from './types';
import { LettaStore } from '../../letta/LettaStore';
import { rufloMemory } from '../../ruflo/RufloMemory';
import { RufloMemoryItem } from '../../ruflo/types';
import { unifiedMemoryEngine } from './UnifiedMemoryEngine';

const STORAGE_KEY = 'standardized_memory_persistence_v1';

export class StandardizedMemoryPersistenceWrapper {
  private static instance: StandardizedMemoryPersistenceWrapper;
  private records: Map<string, StandardizedMemoryRecord> = new Map();
  private isInitialized = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): StandardizedMemoryPersistenceWrapper {
    if (!StandardizedMemoryPersistenceWrapper.instance) {
      StandardizedMemoryPersistenceWrapper.instance = new StandardizedMemoryPersistenceWrapper();
    }
    return StandardizedMemoryPersistenceWrapper.instance;
  }

  private init(): void {
    if (this.isInitialized) return;
    this.loadFromStorage();
    this.syncFromComponents();
    this.isInitialized = true;
  }

  /**
   * Load stored records from local storage.
   */
  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: StandardizedMemoryRecord[] = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(record => this.records.set(record.id, record));
          }
        }
      }
    } catch (e) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Load error:', e);
    }
  }

  /**
   * Persist active memory map to local storage.
   */
  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const list = Array.from(this.records.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Save error:', e);
    }
  }

  /**
   * Synchronize existing data from LettaStore, RufloMemory, and UnifiedMemoryEngine into standardized schema.
   */
  public syncFromComponents(): void {
    const now = new Date().toISOString();

    // 1. Sync from Letta (Recall Events = Short-Term Conversation, Core Memory & Archival = Long-Term)
    try {
      const activeAgentId = LettaStore.getActiveAgentId();
      const agent = LettaStore.getOrCreateAgent(activeAgentId);

      // Core memory blocks
      if (agent?.coreMemory) {
        Object.entries(agent.coreMemory).forEach(([blockName, blockContent]) => {
          if (!blockContent) return;
          const id = `smem_letta_core_${activeAgentId}_${blockName}`;
          if (!this.records.has(id)) {
            this.records.set(id, {
              id,
              kind: 'core_block',
              agentId: activeAgentId,
              sourceComponent: 'letta',
              key: `letta_core_${blockName}`,
              content: String(blockContent),
              category: 'core_memory',
              tags: ['letta', 'core_memory', blockName],
              importanceScore: 0.9,
              accessCount: 1,
              lastAccessedAt: now,
              createdAt: agent.createdAt || now,
              updatedAt: agent.updatedAt || now,
              metadata: { blockName },
            });
          }
        });
      }

      // Archival passages
      const passages = LettaStore.getAllArchivalPassages(activeAgentId);
      passages.forEach(p => {
        const id = `smem_letta_arch_${p.id}`;
        if (!this.records.has(id)) {
          this.records.set(id, {
            id,
            kind: 'archival_knowledge',
            agentId: p.agentId || activeAgentId,
            sourceComponent: 'letta',
            key: `archival_${p.id}`,
            content: p.content,
            category: 'archival',
            tags: ['letta', 'archival', ...(p.tags || [])],
            importanceScore: (p.metadata?.importance || 3) / 5,
            accessCount: p.accessCount || 1,
            lastAccessedAt: p.lastAccessedAt || now,
            createdAt: p.createdAt || now,
            updatedAt: p.lastAccessedAt || now,
            metadata: p.metadata || {},
          });
        }
      });

      // Recall events (Short-term conversation)
      const recallEvents = LettaStore.getAllRecallEvents(activeAgentId);
      recallEvents.forEach(e => {
        const id = `smem_letta_recall_${e.id}`;
        if (!this.records.has(id)) {
          this.records.set(id, {
            id,
            kind: 'short_term_conversation',
            agentId: e.agentId || activeAgentId,
            conversationId: e.conversationId,
            sourceComponent: 'letta',
            key: `dialogue_${e.role}_${e.id}`,
            content: e.content,
            category: 'conversation',
            tags: ['letta', 'recall', e.role],
            importanceScore: e.role === 'user' ? 0.75 : 0.65,
            accessCount: 1,
            lastAccessedAt: e.timestamp || now,
            createdAt: e.timestamp || now,
            updatedAt: e.timestamp || now,
            metadata: { role: e.role, toolCalls: e.toolCalls },
          });
        }
      });
    } catch (err) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Letta sync warning:', err);
    }

    // 2. Sync from Ruflo Memory (AgentDB)
    try {
      const rufloItems = rufloMemory.listAll();
      rufloItems.forEach(item => {
        const id = `smem_ruflo_${item.id}`;
        if (!this.records.has(id)) {
          let kind: MemoryKind = 'long_term_agent_memory';
          if (item.type === 'rag-document') {
            kind = 'archival_knowledge';
          } else if (item.type === 'event' || item.type === 'task-result') {
            kind = 'short_term_conversation';
          }

          this.records.set(id, {
            id,
            kind,
            agentId: item.agentId || 'default_agent',
            sourceComponent: 'ruflo',
            key: item.key,
            content: item.content,
            category: item.type || 'ruflo_memory',
            tags: ['ruflo', ...(item.tags || [])],
            embedding: item.embedding,
            importanceScore: 0.8,
            accessCount: 1,
            lastAccessedAt: new Date(item.timestamp).toISOString(),
            createdAt: new Date(item.timestamp).toISOString(),
            updatedAt: new Date(item.timestamp).toISOString(),
            metadata: item.metadata || {},
          });
        }
      });
    } catch (err) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Ruflo sync warning:', err);
    }

    this.persistToStorage();
  }

  /**
   * Save or update a standardized memory record across all underlying engines.
   */
  public saveRecord(
    params: Omit<StandardizedMemoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'> & {
      id?: string;
    }
  ): StandardizedMemoryRecord {
    const now = new Date().toISOString();
    const id = params.id || `smem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const existing = this.records.get(id);

    const record: StandardizedMemoryRecord = {
      id,
      kind: params.kind,
      agentId: params.agentId || LettaStore.getActiveAgentId(),
      conversationId: params.conversationId,
      sourceComponent: params.sourceComponent || 'system',
      key: params.key,
      content: params.content,
      value: params.value,
      category: params.category || 'general',
      tags: params.tags || ['standardized'],
      embedding: params.embedding || rufloMemory.generateVectorEmbedding(params.content),
      importanceScore: params.importanceScore ?? 0.7,
      accessCount: (existing?.accessCount || 0) + 1,
      lastAccessedAt: now,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      metadata: params.metadata || {},
    };

    this.records.set(id, record);
    this.persistToStorage();

    // Cross-sync writing to Letta component
    try {
      if (record.kind === 'short_term_conversation') {
        LettaStore.recordRecallEvent({
          agentId: record.agentId,
          role: (record.metadata?.role as any) || 'user',
          content: record.content,
          conversationId: record.conversationId || 'default_session',
        });
      } else if (record.kind === 'archival_knowledge') {
        LettaStore.insertArchivalPassage(
          record.agentId,
          record.content,
          record.tags,
          {
            source: record.key,
            importance: Math.round(record.importanceScore * 5),
            conversationId: record.conversationId,
          }
        );
      } else if (record.kind === 'core_block' && record.metadata?.blockName) {
        LettaStore.updateCoreMemory(record.agentId, record.metadata.blockName, record.content);
      }
    } catch (e) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Letta write sync warning:', e);
    }

    // Cross-sync writing to Ruflo component
    try {
      const rufloType: RufloMemoryItem['type'] = 
        record.kind === 'archival_knowledge' ? 'rag-document' : 
        record.kind === 'short_term_conversation' ? 'event' : 'fact';

      rufloMemory.store({
        agentId: record.agentId,
        key: record.key,
        content: record.content,
        type: rufloType,
        tags: record.tags,
        embedding: record.embedding,
        metadata: { ...record.metadata, standardizedId: id },
      });
    } catch (e) {
      console.warn('[StandardizedMemoryPersistenceWrapper] Ruflo write sync warning:', e);
    }

    // Cross-sync writing to UnifiedMemoryEngine
    try {
      unifiedMemoryEngine.storeMemory({
        key: record.key,
        value: record.value || record.content,
        category: record.category,
        summary: record.content.slice(0, 150),
        tags: record.tags,
        importanceScore: record.importanceScore,
        metadata: { standardizedId: id },
      });
    } catch (e) {
      console.warn('[StandardizedMemoryPersistenceWrapper] UnifiedMemoryEngine write sync warning:', e);
    }

    return record;
  }

  /**
   * Standardized recording helper for short-term conversation turns.
   */
  public recordShortTermTurn(params: {
    agentId?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    conversationId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): StandardizedMemoryRecord {
    const agentId = params.agentId || LettaStore.getActiveAgentId();
    return this.saveRecord({
      kind: 'short_term_conversation',
      agentId,
      conversationId: params.conversationId,
      sourceComponent: 'system',
      key: `dialogue_${params.role}_${Date.now()}`,
      content: params.content,
      category: 'conversation',
      tags: ['dialogue', params.role, ...(params.tags || [])],
      importanceScore: params.role === 'user' ? 0.8 : 0.7,
      metadata: { role: params.role, ...(params.metadata || {}) },
    });
  }

  /**
   * Standardized recording helper for long-term agent memory and user facts.
   */
  public recordLongTermFact(params: {
    agentId?: string;
    key: string;
    content: string;
    category?: string;
    tags?: string[];
    importanceScore?: number;
    metadata?: Record<string, any>;
  }): StandardizedMemoryRecord {
    const agentId = params.agentId || LettaStore.getActiveAgentId();
    return this.saveRecord({
      kind: 'long_term_agent_memory',
      agentId,
      sourceComponent: 'system',
      key: params.key,
      content: params.content,
      category: params.category || 'user_fact',
      tags: ['long_term', ...(params.tags || [])],
      importanceScore: params.importanceScore ?? 0.85,
      metadata: params.metadata || {},
    });
  }

  /**
   * Standardized query interface consolidating search across storage map, Ruflo, and Letta.
   */
  public query(options: StandardizedQueryOptions = {}): StandardizedQueryResult {
    const startTime = Date.now();
    const limit = options.limit || 10;
    const queryStr = (options.query || '').toLowerCase().trim();
    const queryTokens = queryStr.split(/\s+/).filter(t => t.length > 2);
    const queryVec = queryStr ? rufloMemory.generateVectorEmbedding(queryStr) : null;

    const sourcesSummary: Record<MemorySourceComponent, number> = {
      ruflo: 0,
      letta: 0,
      openviking: 0,
      agentmemory: 0,
      system: 0,
    };

    const scoredRecords: Array<{ record: StandardizedMemoryRecord; score: number }> = [];

    this.records.forEach(record => {
      // Kind filter
      if (options.kind && record.kind !== options.kind) return;
      // AgentId filter
      if (options.agentId && record.agentId !== options.agentId) return;
      // ConversationId filter
      if (options.conversationId && record.conversationId !== options.conversationId) return;
      // Category filter
      if (options.category && record.category !== options.category) return;
      // Importance score filter
      if (options.minImportanceScore && record.importanceScore < options.minImportanceScore) return;
      // Tags filter
      if (options.tags && options.tags.length > 0) {
        const hasTag = options.tags.some(t => record.tags.includes(t));
        if (!hasTag) return;
      }

      let score = record.importanceScore * 0.3;

      if (!queryStr || queryStr === '*') {
        score += 0.7;
      } else {
        const lowerContent = record.content.toLowerCase();
        const lowerKey = record.key.toLowerCase();

        // Substring match
        if (lowerContent.includes(queryStr) || lowerKey.includes(queryStr)) {
          score += 1.2;
        }

        // Token match
        let tokenMatches = 0;
        queryTokens.forEach(t => {
          if (lowerContent.includes(t) || lowerKey.includes(t)) {
            tokenMatches += 1;
          }
        });
        if (queryTokens.length > 0) {
          score += (tokenMatches / queryTokens.length) * 0.8;
        }

        // Vector similarity match
        if (queryVec && record.embedding) {
          const sim = rufloMemory.calculateCosineSimilarity(queryVec, record.embedding);
          score += sim * 1.5;
        }
      }

      if (score > 0.1) {
        sourcesSummary[record.sourceComponent] = (sourcesSummary[record.sourceComponent] || 0) + 1;
        scoredRecords.push({
          record: {
            ...record,
            accessCount: record.accessCount + 1,
            lastAccessedAt: new Date().toISOString(),
          },
          score: Math.min(1.0, parseFloat(score.toFixed(3))),
        });
      }
    });

    scoredRecords.sort((a, b) => b.score - a.score);
    const sliced = scoredRecords.slice(0, limit);

    // Update internal record access stats
    sliced.forEach(item => {
      this.records.set(item.record.id, item.record);
    });
    if (sliced.length > 0) {
      this.persistToStorage();
    }

    return {
      records: sliced.map(s => s.record),
      totalCount: scoredRecords.length,
      searchTimeMs: Date.now() - startTime,
      relevanceScores: sliced.map(s => s.score),
      sourcesSummary,
    };
  }

  /**
   * Retrieves structured context payload containing consolidated short-term & long-term memory for prompt construction.
   */
  public getConsolidatedPromptContext(agentId?: string, query?: string): string {
    const targetAgentId = agentId || LettaStore.getActiveAgentId();
    const searchRes = this.query({
      agentId: targetAgentId,
      query: query || '*',
      limit: 12,
    });

    const shortTerm = searchRes.records.filter(r => r.kind === 'short_term_conversation');
    const longTerm = searchRes.records.filter(r => r.kind === 'long_term_agent_memory' || r.kind === 'core_block');
    const archival = searchRes.records.filter(r => r.kind === 'archival_knowledge');

    let output = '=== STANDARDIZED CONSOLIDATED MEMORY (Ruflo + Letta + OpenViking) ===\n';

    if (longTerm.length > 0) {
      output += '\n[LONG-TERM AGENT & CORE MEMORY]:\n';
      longTerm.forEach(m => {
        output += `• ${m.key}: ${m.content}\n`;
      });
    }

    if (archival.length > 0) {
      output += '\n[RETRIEVED ARCHIVAL KNOWLEDGE & RAG]:\n';
      archival.forEach(a => {
        output += `• ${a.key}: ${a.content.slice(0, 200)}...\n`;
      });
    }

    if (shortTerm.length > 0) {
      output += '\n[SHORT-TERM RECENT CONVERSATION CONTEXT]:\n';
      shortTerm.slice(-5).forEach(s => {
        output += `• ${s.key}: ${s.content.slice(0, 150)}\n`;
      });
    }

    output += '=====================================================================';
    return output;
  }

  /**
   * Export standardized memory database backup.
   */
  public exportBackup(): string {
    return JSON.stringify(Array.from(this.records.values()), null, 2);
  }

  /**
   * Import standardized memory database backup.
   */
  public importBackup(jsonString: string): number {
    try {
      const parsed: StandardizedMemoryRecord[] = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) return 0;

      let count = 0;
      parsed.forEach(record => {
        if (record.id && record.content && record.kind) {
          this.records.set(record.id, record);
          count++;
        }
      });

      this.persistToStorage();
      return count;
    } catch (e) {
      console.error('[StandardizedMemoryPersistenceWrapper] Backup import failed:', e);
      return 0;
    }
  }

  /**
   * Clear memories for specific agent or globally.
   */
  public clearAll(agentId?: string): void {
    if (agentId) {
      Array.from(this.records.keys()).forEach(id => {
        const r = this.records.get(id);
        if (r && r.agentId === agentId) {
          this.records.delete(id);
        }
      });
    } else {
      this.records.clear();
    }
    this.persistToStorage();
  }
}

export const standardizedMemoryWrapper = StandardizedMemoryPersistenceWrapper.getInstance();
export const MemoryPersistenceService = StandardizedMemoryPersistenceWrapper;
export const memoryPersistenceService = standardizedMemoryWrapper;
