/**
 * Ruflo Persistent Memory & AgentDB Store
 * Provides persistent memory indexing, semantic recall, and cross-session knowledge storage.
 */

import { RufloMemoryItem, RAGChunk } from './types';

const STORAGE_KEY = 'ruflo_agentdb_memories_v1';

export class RufloMemory {
  private static instance: RufloMemory;
  private memories: Map<string, RufloMemoryItem> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RufloMemory {
    if (!RufloMemory.instance) {
      RufloMemory.instance = new RufloMemory();
    }
    return RufloMemory.instance;
  }

  /**
   * Generates a lightweight normalized term-frequency feature vector for RAG similarity.
   */
  public generateVectorEmbedding(text: string): number[] {
    const tokens = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    const vocab = ['code', 'data', 'agent', 'task', 'security', 'research', 'math', 'logic', 'system', 'user', 'query', 'result', 'tool', 'workflow', 'plan', 'api', 'react', 'typescript', 'swarm', 'ruflo'];
    const vec = new Array(vocab.length).fill(0);

    for (const token of tokens) {
      const idx = vocab.indexOf(token);
      if (idx !== -1) {
        vec[idx] += 1;
      }
    }

    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vec.map(v => v / magnitude) : vec;
  }

  /**
   * Calculate Cosine Similarity between two vectors.
   */
  public calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  /**
   * Store a memory item into AgentDB with automatic vector embedding generation.
   */
  public async store(item: Omit<RufloMemoryItem, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<RufloMemoryItem> {
    this.ensureLoaded();

    const content = item.content;
    const embedding = item.embedding || this.generateVectorEmbedding(content);

    const fullItem: RufloMemoryItem = {
      id: item.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: item.timestamp || Date.now(),
      agentId: item.agentId,
      key: item.key,
      content,
      type: item.type,
      tags: item.tags || [],
      embedding,
      metadata: item.metadata || {},
    };

    this.memories.set(fullItem.id, fullItem);
    this.persistToStorage();
    return fullItem;
  }

  /**
   * Chunk a document and index as RAG memories.
   */
  public async indexRAGDocument(docId: string, title: string, text: string, tags: string[] = []): Promise<RAGChunk[]> {
    const chunkSize = 500;
    const chunks: RAGChunk[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIdx = 0;

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length > chunkSize && currentChunk.length > 0) {
        const chunkId = `rag_${docId}_${chunkIdx++}`;
        const embedding = this.generateVectorEmbedding(currentChunk);

        await this.store({
          id: chunkId,
          agentId: 'memory-specialist',
          key: `rag_${docId}_chunk_${chunkIdx}`,
          content: currentChunk,
          type: 'rag-document',
          tags: ['rag', docId, ...tags],
          embedding,
          metadata: { docId, title, chunkIdx },
        });

        chunks.push({
          id: chunkId,
          docId,
          content: currentChunk,
          embedding,
          tokens: currentChunk.split(/\s+/).length,
          metadata: { docId, title, chunkIdx },
        });

        currentChunk = para;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
      }
    }

    if (currentChunk.trim().length > 0) {
      const chunkId = `rag_${docId}_${chunkIdx++}`;
      const embedding = this.generateVectorEmbedding(currentChunk);

      await this.store({
        id: chunkId,
        agentId: 'memory-specialist',
        key: `rag_${docId}_chunk_${chunkIdx}`,
        content: currentChunk,
        type: 'rag-document',
        tags: ['rag', docId, ...tags],
        embedding,
        metadata: { docId, title, chunkIdx },
      });

      chunks.push({
        id: chunkId,
        docId,
        content: currentChunk,
        embedding,
        tokens: currentChunk.split(/\s+/).length,
        metadata: { docId, title, chunkIdx },
      });
    }

    return chunks;
  }

  /**
   * Search memories by semantic query, vector cosine similarity, tags, and type with relevance ranking.
   */
  public async search(options: {
    query?: string;
    tags?: string[];
    type?: RufloMemoryItem['type'];
    agentId?: string;
    limit?: number;
  }): Promise<Array<RufloMemoryItem & { score: number }>> {
    this.ensureLoaded();
    const { query, tags, type, agentId, limit = 10 } = options;

    const queryTerms = (query || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2);

    const queryVec = query ? this.generateVectorEmbedding(query) : null;
    const results: Array<RufloMemoryItem & { score: number }> = [];

    for (const mem of this.memories.values()) {
      if (type && mem.type !== type) continue;
      if (agentId && mem.agentId !== agentId) continue;

      let score = 0;

      // Tag matching
      if (tags && tags.length > 0) {
        const matchedTags = tags.filter(t => mem.tags.includes(t));
        score += matchedTags.length * 2.0;
        if (matchedTags.length === 0 && tags.length > 0 && !query) {
          continue;
        }
      }

      // Keyword / semantic token scoring
      if (queryTerms.length > 0) {
        const lowerContent = mem.content.toLowerCase();
        const lowerKey = mem.key.toLowerCase();

        let termMatches = 0;
        for (const term of queryTerms) {
          if (lowerKey.includes(term)) {
            termMatches += 3;
          }
          if (lowerContent.includes(term)) {
            termMatches += 1;
          }
        }

        score += termMatches;
      }

      // Vector cosine similarity score
      if (queryVec && mem.embedding) {
        const similarity = this.calculateCosineSimilarity(queryVec, mem.embedding);
        score += similarity * 5.0;
      }

      if (score === 0 && (!tags || tags.length === 0) && !query) {
        score = 1;
      }

      if (score > 0) {
        // Recency boost (up to +0.5 for items within last 24 hours)
        const ageHours = (Date.now() - mem.timestamp) / (1000 * 60 * 60);
        if (ageHours < 24) {
          score += Math.max(0, 0.5 - ageHours / 48);
        }

        results.push({
          ...mem,
          score,
        });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Delete a memory item.
   */
  public async delete(id: string): Promise<boolean> {
    this.ensureLoaded();
    const deleted = this.memories.delete(id);
    if (deleted) {
      this.persistToStorage();
    }
    return deleted;
  }

  /**
   * List all stored memories.
   */
  public listAll(): RufloMemoryItem[] {
    this.ensureLoaded();
    return Array.from(this.memories.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all memories.
   */
  public clear(): void {
    this.memories.clear();
    this.persistToStorage();
  }

  private ensureLoaded(): void {
    if (!this.isLoaded) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items: RufloMemoryItem[] = JSON.parse(raw);
        this.memories = new Map(items.map(i => [i.id, i]));
      }
    } catch (e) {
      console.warn('RufloMemory failed to load from localStorage:', e);
    } finally {
      this.isLoaded = true;
    }
  }

  private persistToStorage(): void {
    try {
      const items = Array.from(this.memories.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('RufloMemory failed to persist to localStorage:', e);
    }
  }
}

export const rufloMemory = RufloMemory.getInstance();
