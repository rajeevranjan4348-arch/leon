import { MemoryRecord, LongTermMemory, MemoryCategory, ExtractionResult, ExplicitCommandResult } from './types';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreDb } from '../firebase';
import { LettaStore } from '../letta/LettaStore';

const LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES = 'perplexity_long_term_memories';
const DEFAULT_USER_ID = 'default_user';

/**
 * Sanitizes input text to prevent storing sensitive information (passwords, API keys, tokens, credit cards)
 */
export function sanitizeData(text: string): { isSafe: boolean; sanitized: string } {
  if (!text) return { isSafe: true, sanitized: '' };

  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI key
    /AIzaSy[a-zA-Z0-9_-]{33}/g, // Gemini key
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub token
    /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, // Bearer token
    /-----BEGIN\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+PRIVATE\s+KEY-----/gi,
    /\b(?:password|passwd|secret|api_key|access_token)\s*[:=]\s*["']?[^\s"']+["']?/gi,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit Card Number
  ];

  let sanitized = text;
  let isSafe = true;

  for (const pattern of sensitivePatterns) {
    if (pattern.test(sanitized)) {
      isSafe = false;
      sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE_DATA]');
    }
  }

  return { isSafe, sanitized };
}

export class MemoryManager {
  /**
   * Get all stored long-term memories for a user.
   */
  public static getAllMemories(userId: string = DEFAULT_USER_ID): MemoryRecord[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES}_${userId}`) || 
                  localStorage.getItem(LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      
      return parsed
        .filter(m => !m.isDeleted)
        .map(m => ({
          id: m.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: m.userId || userId,
          category: m.category || 'fact',
          key: m.key || (m.fact ? m.fact.slice(0, 30) : 'general_fact'),
          value: m.value || m.fact || '',
          fact: m.fact || m.value || '',
          importance: typeof m.importance === 'number' ? (m.importance > 5 ? m.importance : m.importance * 20) : 60,
          confidence: typeof m.confidence === 'number' ? m.confidence : 0.9,
          createdAt: m.createdAt || new Date().toISOString(),
          updatedAt: m.updatedAt || m.createdAt || new Date().toISOString(),
          lastAccessedAt: m.lastAccessedAt || new Date().toISOString(),
          accessCount: m.accessCount || 1,
          conversationId: m.conversationId,
          projectId: m.projectId,
          tags: m.tags || [],
          isDeleted: false,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Save long-term memories list to LocalStorage and trigger Firestore async sync.
   */
  public static saveAllMemories(memories: MemoryRecord[], userId: string = DEFAULT_USER_ID): void {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES}_${userId}`, JSON.stringify(memories));
      localStorage.setItem(LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES, JSON.stringify(memories));
      
      // Async sync to Firestore
      this.syncToFirestore(memories, userId).catch(err => {
        console.warn('MemoryManager: Firestore background sync notice:', err);
      });
    } catch (err) {
      console.warn('MemoryManager: Failed to save memories locally', err);
    }
  }

  /**
   * Async Firestore Sync helper
   */
  private static async syncToFirestore(memories: MemoryRecord[], userId: string): Promise<void> {
    if (!firestoreDb) return;
    try {
      for (const mem of memories) {
        const memRef = doc(firestoreDb, 'users', userId, 'memories', mem.id);
        await setDoc(memRef, mem, { merge: true });
      }
    } catch (e) {
      // Ignore offline Firestore warnings
    }
  }

  /**
   * Get single memory by key or ID
   */
  public static getMemory(keyOrId: string, userId: string = DEFAULT_USER_ID): MemoryRecord | null {
    const all = this.getAllMemories(userId);
    const normalized = keyOrId.toLowerCase().trim();
    return all.find(m => m.id === keyOrId || m.key.toLowerCase().trim() === normalized) || null;
  }

  /**
   * Backward-compatible addMemory alias
   */
  public static addMemory(
    fact: string,
    category: MemoryCategory = 'fact',
    importance = 70,
    conversationId?: string,
    tags: string[] = []
  ): MemoryRecord {
    return this.createMemory({
      key: fact.slice(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '_'),
      fact,
      value: fact,
      category,
      importance,
      conversationId,
      tags,
    });
  }

  /**
   * Create or update a long-term memory entry with deduplication and key normalization.
   */
  public static createMemory(
    recordData: Partial<MemoryRecord>,
    userId: string = DEFAULT_USER_ID
  ): MemoryRecord {
    const memories = this.getAllMemories(userId);
    const key = (recordData.key || 'general_fact').trim().toLowerCase().replace(/\s+/g, '_');
    const value = (recordData.value || recordData.fact || '').trim();
    const fact = recordData.fact || `User ${key.replace(/_/g, ' ')}: ${value}`;
    const category = recordData.category || 'fact';
    const importance = recordData.importance !== undefined ? recordData.importance : 70;
    const confidence = recordData.confidence !== undefined ? recordData.confidence : 0.9;

    const { isSafe, sanitized } = sanitizeData(value);
    if (!isSafe) {
      console.warn('MemoryManager: Suppressed sensitive data memory creation.');
    }

    const sanitizedValue = sanitized;
    const sanitizedFact = sanitizeData(fact).sanitized;

    const now = new Date().toISOString();

    // Check if key already exists (Deduplication / Key Update)
    const existingIndex = memories.findIndex(m => m.key.toLowerCase().trim() === key || m.id === recordData.id);

    if (existingIndex >= 0) {
      const existing = memories[existingIndex];
      const updatedRecord: MemoryRecord = {
        ...existing,
        value: sanitizedValue,
        fact: sanitizedFact,
        category: category || existing.category,
        importance: Math.max(existing.importance, importance),
        confidence: Math.max(existing.confidence, confidence),
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: (existing.accessCount || 0) + 1,
        projectId: recordData.projectId || existing.projectId,
        conversationId: recordData.conversationId || existing.conversationId,
        tags: Array.from(new Set([...(existing.tags || []), ...(recordData.tags || [])])),
        isDeleted: false,
      };

      memories[existingIndex] = updatedRecord;
      this.saveAllMemories(memories, userId);

      // Also update Letta core memory human block if personal or preference
      if (key === 'preferred_name' || key === 'name') {
        LettaStore.updateCoreMemory('default_letta_agent', 'human', `User preferred name: ${sanitizedValue}`);
      }

      return updatedRecord;
    }

    const newMemory: MemoryRecord = {
      id: recordData.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      category,
      key,
      value: sanitizedValue,
      fact: sanitizedFact,
      importance,
      confidence,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      conversationId: recordData.conversationId,
      projectId: recordData.projectId,
      tags: recordData.tags || [],
      isDeleted: false,
    };

    const updatedList = [newMemory, ...memories];
    this.saveAllMemories(updatedList, userId);

    if (key === 'preferred_name' || key === 'name') {
      LettaStore.updateCoreMemory('default_letta_agent', 'human', `User preferred name: ${sanitizedValue}`);
    }

    return newMemory;
  }

  /**
   * Update memory by key or ID
   */
  public static updateMemory(
    keyOrId: string,
    updates: Partial<MemoryRecord>,
    userId: string = DEFAULT_USER_ID
  ): MemoryRecord | null {
    const existing = this.getMemory(keyOrId, userId);
    if (!existing) return null;
    return this.createMemory({ ...existing, ...updates, id: existing.id, key: existing.key }, userId);
  }

  /**
   * Search stored memories
   */
  public static searchMemories(
    queryText: string,
    options?: { category?: MemoryCategory; projectId?: string; limit?: number; userId?: string }
  ): MemoryRecord[] {
    const uid = options?.userId || DEFAULT_USER_ID;
    const all = this.getAllMemories(uid);
    if (!queryText || !queryText.trim()) {
      let filtered = all;
      if (options?.category) filtered = filtered.filter(m => m.category === options.category);
      if (options?.projectId) filtered = filtered.filter(m => m.projectId === options.projectId);
      return filtered.slice(0, options?.limit || 20);
    }

    const cleanTokens = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const scored = all.map(m => {
      const text = `${m.key} ${m.value} ${m.fact} ${m.category} ${(m.tags || []).join(' ')}`.toLowerCase();
      let matches = 0;
      cleanTokens.forEach(t => {
        if (text.includes(t)) matches++;
      });
      return { memory: m, score: matches / (cleanTokens.length || 1) };
    });

    return scored
      .filter(s => s.score > 0 || cleanTokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, options?.limit || 10)
      .map(s => s.memory);
  }

  /**
   * Delete a memory by key or ID
   */
  public static deleteMemory(keyOrId: string, userId: string = DEFAULT_USER_ID): boolean {
    const memories = this.getAllMemories(userId);
    const normalized = keyOrId.toLowerCase().trim();
    const filtered = memories.filter(
      m => m.id !== keyOrId && m.key.toLowerCase().trim() !== normalized
    );

    if (filtered.length !== memories.length) {
      this.saveAllMemories(filtered, userId);
      if (firestoreDb) {
        deleteDoc(doc(firestoreDb, 'users', userId, 'memories', keyOrId)).catch(() => {});
      }
      return true;
    }
    return false;
  }

  /**
   * Clear memories
   */
  public static clearMemories(userId: string = DEFAULT_USER_ID, conversationId?: string): void {
    if (!conversationId) {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES}_${userId}`);
      localStorage.removeItem(LOCAL_STORAGE_KEY_LONG_TERM_MEMORIES);
    } else {
      const memories = this.getAllMemories(userId);
      const filtered = memories.filter(m => m.conversationId !== conversationId);
      this.saveAllMemories(filtered, userId);
    }
  }

  /**
   * Handles explicit natural language memory commands
   * e.g., "What do you remember about me?", "Forget my preferred name", "Call me Rajeev"
   */
  public static handleExplicitMemoryCommand(
    userText: string,
    conversationId?: string,
    projectId?: string,
    userId: string = DEFAULT_USER_ID
  ): ExplicitCommandResult {
    const text = userText.trim();
    const lower = text.toLowerCase();

    // 1. "What do you remember about me?" / "Show my memories" / "List my memories"
    if (
      /\b(what do you remember|show my memories|list my memories|what memories do you have|what do you know about me)\b/i.test(lower)
    ) {
      const memories = this.getAllMemories(userId);
      if (memories.length === 0) {
        return {
          isExplicitCommand: true,
          commandType: 'list',
          response: "I don't have any saved memories about you yet. You can tell me things like \"Call me Rajeev\" or \"Remember that I prefer TypeScript\"!",
        };
      }

      const formattedList = memories
        .map(m => `- **${m.key.replace(/_/g, ' ').toUpperCase()}**: ${m.value} (${m.category})`)
        .join('\n');

      return {
        isExplicitCommand: true,
        commandType: 'list',
        response: `### 🧠 Stored Memories\n\nHere is what I remember about you:\n\n${formattedList}`,
      };
    }

    // 2. "Forget my preferred name" / "Forget my name"
    if (/\b(forget my (preferred )?name|forget who i am|delete my name)\b/i.test(lower)) {
      this.deleteMemory('preferred_name', userId);
      this.deleteMemory('name', userId);
      return {
        isExplicitCommand: true,
        commandType: 'forget',
        response: "I have forgotten your preferred name.",
        memoriesDeleted: ['preferred_name', 'name'],
      };
    }

    // 3. "Delete all my memories" / "Clear all memories" / "Forget everything"
    if (/\b(delete all my memories|clear all memories|forget everything|reset my memories)\b/i.test(lower)) {
      this.clearMemories(userId);
      return {
        isExplicitCommand: true,
        commandType: 'clear',
        response: "All stored memories have been cleared.",
      };
    }

    // 4. "Call me <Name>" / "My name is <Name>" / "From now on call me <Name>"
    const nameMatch = text.match(/\b(?:call me|my name is|from now on call me|i am|i'm)\s+([a-zA-Z0-9_\-\s]{2,30})\b/i);
    if (nameMatch && !lower.includes('weather') && !lower.includes('what is')) {
      const name = nameMatch[1].replace(/[.?!,]+$/, '').trim();
      if (name && name.length >= 2 && !['a', 'an', 'the', 'trying', 'building', 'working', 'asking', 'here'].includes(name.toLowerCase())) {
        const mem = this.createMemory(
          {
            key: 'preferred_name',
            value: name,
            fact: `User prefers to be called ${name}.`,
            category: 'personal',
            importance: 100,
            confidence: 1.0,
            conversationId,
            projectId,
          },
          userId
        );

        return {
          isExplicitCommand: true,
          commandType: 'remember',
          response: `Got it! I've updated my memory. I will call you **${name}**.`,
          memoryCreatedOrUpdated: mem,
        };
      }
    }

    // 5. "Forget that I <fact>" / "Forget <key>"
    const forgetMatch = text.match(/\b(?:forget that|forget|delete memory)\s+([^\.\,\!\?]+)/i);
    if (forgetMatch && (lower.startsWith('forget') || lower.startsWith('delete'))) {
      const target = forgetMatch[1].trim();
      const all = this.getAllMemories(userId);
      const matched = all.filter(
        m => m.key.toLowerCase().includes(target.toLowerCase()) || m.value.toLowerCase().includes(target.toLowerCase()) || m.fact.toLowerCase().includes(target.toLowerCase())
      );

      if (matched.length > 0) {
        const deletedKeys: string[] = [];
        matched.forEach(m => {
          this.deleteMemory(m.id, userId);
          deletedKeys.push(m.key);
        });
        return {
          isExplicitCommand: true,
          commandType: 'forget',
          response: `I have removed that from my memory (${deletedKeys.join(', ')}).`,
          memoriesDeleted: deletedKeys,
        };
      }
    }

    // 6. "Remember that <fact>" / "Don't forget that <fact>" / "Save this: <fact>"
    const rememberMatch = text.match(/\b(?:remember that|don't forget that|save this|keep in mind that|remember)\s+(.+)/i);
    if (rememberMatch && (lower.startsWith('remember') || lower.startsWith('don\'t forget') || lower.startsWith('save this'))) {
      const factContent = rememberMatch[1].trim();
      if (factContent.length > 3) {
        const key = factContent.slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const mem = this.createMemory(
          {
            key,
            value: factContent,
            fact: `User instruction: ${factContent}`,
            category: 'preference',
            importance: 90,
            confidence: 1.0,
            conversationId,
            projectId,
          },
          userId
        );

        return {
          isExplicitCommand: true,
          commandType: 'remember',
          response: `Got it! I will remember that: **${factContent}**.`,
          memoryCreatedOrUpdated: mem,
        };
      }
    }

    return { isExplicitCommand: false };
  }

  /**
   * Automatic Memory Extraction Engine
   */
  public static extractAndSaveMemories(
    userText: string,
    assistantText: string,
    conversationId?: string,
    projectId?: string,
    userId: string = DEFAULT_USER_ID
  ): MemoryRecord[] {
    const text = userText.trim();
    if (!text || text.length < 4) return [];

    const lower = text.toLowerCase();

    // Ignore transient data (weather, calculations, time, status checks)
    if (
      /\b(weather|time|today|temperature|forecast|calculate|what is 2\+2|hello|hi|hey|how are you|test)\b/i.test(lower) &&
      !lower.includes('call me') && !lower.includes('remember') && !lower.includes('my name')
    ) {
      return [];
    }

    const extractedRecords: MemoryRecord[] = [];

    // Personal & Preferences extraction
    if (/\b(call me|my name is|i prefer|i use|my framework is|my tech stack is|i work with)\b/i.test(lower)) {
      if (lower.includes('call me') || lower.includes('my name is')) {
        const match = text.match(/\b(?:call me|my name is)\s+([a-zA-Z0-9_\-\s]{2,30})\b/i);
        if (match) {
          const val = match[1].replace(/[.?!,]+$/, '').trim();
          if (val) {
            const mem = this.createMemory({
              key: 'preferred_name',
              value: val,
              fact: `User prefers to be called ${val}.`,
              category: 'personal',
              importance: 100,
              confidence: 1.0,
              conversationId,
              projectId,
            }, userId);
            extractedRecords.push(mem);
          }
        }
      }

      if (lower.includes('i prefer') || lower.includes('i use') || lower.includes('tech stack')) {
        const match = text.match(/\b(?:i prefer|i use|tech stack is|my stack is)\s+([^\.\,\!\?]+)/i);
        if (match) {
          const val = match[1].trim();
          if (val) {
            const key = val.toLowerCase().includes('react') ? 'frontend_framework' : 
                        val.toLowerCase().includes('typescript') ? 'programming_language' : 
                        val.slice(0, 20).replace(/\s+/g, '_').toLowerCase();
            const mem = this.createMemory({
              key,
              value: val,
              fact: `User prefers ${val}.`,
              category: 'preference',
              importance: 80,
              confidence: 0.9,
              conversationId,
              projectId,
            }, userId);
            extractedRecords.push(mem);
          }
        }
      }
    }

    return extractedRecords;
  }

  /**
   * Export all memories as JSON string
   */
  public static exportMemories(userId: string = DEFAULT_USER_ID): string {
    const memories = this.getAllMemories(userId);
    return JSON.stringify({
      userId,
      version: '2.0',
      exportedAt: new Date().toISOString(),
      memories,
    }, null, 2);
  }

  /**
   * Import memories from JSON string
   */
  public static importMemories(jsonString: string, userId: string = DEFAULT_USER_ID): number {
    try {
      const parsed = JSON.parse(jsonString);
      const items: any[] = Array.isArray(parsed) ? parsed : (parsed.memories || []);
      let count = 0;

      items.forEach(item => {
        if (item && (item.key || item.fact || item.value)) {
          this.createMemory(item, userId);
          count++;
        }
      });

      return count;
    } catch (e) {
      console.warn('MemoryManager: Import failed', e);
      return 0;
    }
  }
}

// Global memory API object
export const memory = {
  search: (query: string, options?: any) => MemoryManager.searchMemories(query, options),
  get: (keyOrId: string, userId?: string) => MemoryManager.getMemory(keyOrId, userId),
  create: (data: Partial<MemoryRecord>, userId?: string) => MemoryManager.createMemory(data, userId),
  update: (keyOrId: string, updates: Partial<MemoryRecord>, userId?: string) => MemoryManager.updateMemory(keyOrId, updates, userId),
  delete: (keyOrId: string, userId?: string) => MemoryManager.deleteMemory(keyOrId, userId),
  clear: (userId?: string, conversationId?: string) => MemoryManager.clearMemories(userId, conversationId),
  extract: (userText: string, assistantText?: string, conversationId?: string, projectId?: string, userId?: string) => 
    MemoryManager.extractAndSaveMemories(userText, assistantText || '', conversationId, projectId, userId),
  summarize: (conversationId: string) => {
    const { ConversationSummarizer } = require('./ConversationSummarizer');
    const { MessageStore } = require('./MessageStore');
    return ConversationSummarizer.summarizeConversation(conversationId, MessageStore.getConversationMessages(conversationId));
  },
  export: (userId?: string) => MemoryManager.exportMemories(userId),
  import: (json: string, userId?: string) => MemoryManager.importMemories(json, userId),
  handleCommand: (userText: string, conversationId?: string, projectId?: string, userId?: string) =>
    MemoryManager.handleExplicitMemoryCommand(userText, conversationId, projectId, userId),
};
