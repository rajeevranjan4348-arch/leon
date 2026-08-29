/**
 * Central Memory Service & AI Context Builder Entry Point
 * 
 * Provides persistent memory operations (create, update, search, extract) using local database and Firestore,
 * as well as context ranking and prompt injection via buildAIContext.
 */

import { MemoryManager, memory as memoryApi } from './memory/MemoryManager';
import { ContextBuilder, ContextPayload } from './memory/ContextBuilder';
import { MemoryRetriever } from './memory/MemoryRetriever';
import { ConversationSummarizer } from './memory/ConversationSummarizer';
import { MessageStore } from './memory/MessageStore';
import { MemoryRecord, LongTermMemory, MemoryCategory, StoredMessage, ConversationSummary, ExplicitCommandResult } from './memory/types';

export interface MemoryService {
  create(recordData: Partial<MemoryRecord>, userId?: string): MemoryRecord;
  update(keyOrId: string, updates: Partial<MemoryRecord>, userId?: string): MemoryRecord | null;
  search(queryText: string, options?: { category?: MemoryCategory; projectId?: string; limit?: number; userId?: string }): MemoryRecord[];
  extract(userText: string, assistantText?: string, conversationId?: string, projectId?: string, userId?: string): MemoryRecord[];
  get(keyOrId: string, userId?: string): MemoryRecord | null;
  delete(keyOrId: string, userId?: string): boolean;
  clear(userId?: string, conversationId?: string): void;
  handleCommand(userText: string, conversationId?: string, projectId?: string, userId?: string): ExplicitCommandResult;
  export(userId?: string): string;
  import(jsonString: string, userId?: string): number;
}

/**
 * Persistent Memory Service instance for managing long-term user preferences and facts.
 */
export const memoryService: MemoryService = {
  create: (recordData, userId) => MemoryManager.createMemory(recordData, userId),
  update: (keyOrId, updates, userId) => MemoryManager.updateMemory(keyOrId, updates, userId),
  search: (queryText, options) => MemoryManager.searchMemories(queryText, options),
  extract: (userText, assistantText, conversationId, projectId, userId) => 
    MemoryManager.extractAndSaveMemories(userText, assistantText || '', conversationId, projectId, userId),
  get: (keyOrId, userId) => MemoryManager.getMemory(keyOrId, userId),
  delete: (keyOrId, userId) => MemoryManager.deleteMemory(keyOrId, userId),
  clear: (userId, conversationId) => MemoryManager.clearMemories(userId, conversationId),
  handleCommand: (userText, conversationId, projectId, userId) =>
    MemoryManager.handleExplicitMemoryCommand(userText, conversationId, projectId, userId),
  export: (userId) => MemoryManager.exportMemories(userId),
  import: (jsonString, userId) => MemoryManager.importMemories(jsonString, userId),
};

export const memory = memoryService;

/**
 * Ranks and injects relevant persistent memories, project data, and conversation summaries into the AI prompt pipeline.
 */
export function buildAIContext(
  conversationId: string,
  userMessage: string,
  recentMessages: StoredMessage[] = [],
  baseSystemPrompt: string = 'You are an intelligent AI assistant with long-term memory and research capabilities.',
  projectId?: string,
  userId?: string
): ContextPayload {
  return ContextBuilder.buildContext(conversationId, userMessage, recentMessages, baseSystemPrompt);
}

export {
  MemoryManager,
  ContextBuilder,
  MemoryRetriever,
  ConversationSummarizer,
  MessageStore,
};

export type {
  MemoryRecord,
  LongTermMemory,
  MemoryCategory,
  StoredMessage,
  ConversationSummary,
  ContextPayload,
  ExplicitCommandResult,
};

export default memoryService;
