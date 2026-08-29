import { useState, useEffect, useCallback } from 'react';
import {
  memoryPersistenceService,
  StandardizedMemoryRecord,
  StandardizedQueryOptions,
  StandardizedQueryResult
} from '../lib/importedSystems/unifiedMemory';

export interface UseUnifiedMemoryOptions {
  agentId?: string;
  conversationId?: string;
  autoSyncOnMount?: boolean;
}

/**
 * Custom React hook `useUnifiedMemory`
 * Abstracts interaction with MemoryPersistenceService (StandardizedMemoryPersistenceWrapper),
 * allowing both Rufus and Letta agents to query and update state through a single source of truth
 * without direct repository-specific dependency injection.
 */
export function useUnifiedMemory(options: UseUnifiedMemoryOptions = {}) {
  const [activeAgentId, setActiveAgentId] = useState<string>(options.agentId || 'default_agent');
  const [records, setRecords] = useState<StandardizedMemoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Refresh memories from standardized persistence service
  const refreshMemories = useCallback(
    (queryOpts?: StandardizedQueryOptions): StandardizedQueryResult => {
      setIsLoading(true);
      try {
        const res = memoryPersistenceService.query({
          agentId: activeAgentId,
          conversationId: options.conversationId,
          ...queryOpts,
        });
        setRecords(res.records);
        return res;
      } finally {
        setIsLoading(false);
      }
    },
    [activeAgentId, options.conversationId]
  );

  useEffect(() => {
    if (options.autoSyncOnMount !== false) {
      memoryPersistenceService.syncFromComponents();
    }
    refreshMemories();
  }, [refreshMemories, options.autoSyncOnMount]);

  // Record a short-term dialogue turn
  const recordTurn = useCallback(
    (
      role: 'user' | 'assistant' | 'system',
      content: string,
      conversationId?: string,
      metadata?: Record<string, any>
    ) => {
      const rec = memoryPersistenceService.recordShortTermTurn({
        agentId: activeAgentId,
        role,
        content,
        conversationId: conversationId || options.conversationId,
        metadata,
      });
      refreshMemories();
      return rec;
    },
    [activeAgentId, options.conversationId, refreshMemories]
  );

  // Record a long-term agent fact or core memory block
  const recordFact = useCallback(
    (
      key: string,
      content: string,
      category?: string,
      tags?: string[],
      importanceScore?: number,
      metadata?: Record<string, any>
    ) => {
      const rec = memoryPersistenceService.recordLongTermFact({
        agentId: activeAgentId,
        key,
        content,
        category,
        tags,
        importanceScore,
        metadata,
      });
      refreshMemories();
      return rec;
    },
    [activeAgentId, refreshMemories]
  );

  // Generic record save / update across engines
  const saveRecord = useCallback(
    (
      params: Omit<StandardizedMemoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'> & {
        id?: string;
      }
    ) => {
      const rec = memoryPersistenceService.saveRecord({
        ...params,
        agentId: params.agentId || activeAgentId,
        conversationId: params.conversationId || options.conversationId,
      });
      refreshMemories();
      return rec;
    },
    [activeAgentId, options.conversationId, refreshMemories]
  );

  // Query state directly
  const queryMemories = useCallback(
    (queryOptions?: StandardizedQueryOptions): StandardizedQueryResult => {
      return memoryPersistenceService.query({
        agentId: activeAgentId,
        conversationId: options.conversationId,
        ...queryOptions,
      });
    },
    [activeAgentId, options.conversationId]
  );

  // Get formatted prompt context block
  const getConsolidatedContext = useCallback(
    (query?: string) => {
      return memoryPersistenceService.getConsolidatedPromptContext(activeAgentId, query);
    },
    [activeAgentId]
  );

  // Clear memory store for active agent or target agent
  const clearMemories = useCallback(
    (targetAgentId?: string) => {
      memoryPersistenceService.clearAll(targetAgentId || activeAgentId);
      refreshMemories();
    },
    [activeAgentId, refreshMemories]
  );

  // Trigger manual component sync
  const syncFromComponents = useCallback(() => {
    memoryPersistenceService.syncFromComponents();
    refreshMemories();
  }, [refreshMemories]);

  return {
    records,
    isLoading,
    activeAgentId,
    setActiveAgentId,
    refreshMemories,
    queryMemories,
    recordTurn,
    recordFact,
    saveRecord,
    getConsolidatedContext,
    clearMemories,
    syncFromComponents,
  };
}
