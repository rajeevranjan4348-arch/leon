import { useState, useEffect, useCallback } from 'react';
import { documentRagSyncEngine, DocumentRagSyncEngine } from '@/lib/rag/DocumentRagSyncEngine';
import { SyncedDocumentMetadata, RagSyncStats, RagSyncConfiguration, RagSearchResult } from '@/lib/rag/types';

export function useDocumentRagSync() {
  const [documents, setDocuments] = useState<SyncedDocumentMetadata[]>(() => documentRagSyncEngine.getAllDocuments());
  const [stats, setStats] = useState<RagSyncStats>(() => documentRagSyncEngine.getStats());
  const [config, setConfig] = useState<RagSyncConfiguration>(() => documentRagSyncEngine.getConfig());
  const [isSyncing, setIsSyncing] = useState<boolean>(stats.isSyncing);

  const refreshState = useCallback(() => {
    setDocuments(documentRagSyncEngine.getAllDocuments());
    const newStats = documentRagSyncEngine.getStats();
    setStats(newStats);
    setConfig(documentRagSyncEngine.getConfig());
    setIsSyncing(newStats.isSyncing);
  }, []);

  useEffect(() => {
    refreshState();

    const handleUpdate = () => {
      refreshState();
    };

    window.addEventListener('document_rag_sync_updated', handleUpdate);
    window.addEventListener('shared_media_updated', handleUpdate);

    return () => {
      window.removeEventListener('document_rag_sync_updated', handleUpdate);
      window.removeEventListener('shared_media_updated', handleUpdate);
    };
  }, [refreshState]);

  const toggleDocumentSync = useCallback((documentId: string, selected?: boolean) => {
    documentRagSyncEngine.toggleDocumentSync(documentId, selected);
    refreshState();
  }, [refreshState]);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    const updatedStats = await documentRagSyncEngine.performBackgroundSync();
    setStats(updatedStats);
    setDocuments(documentRagSyncEngine.getAllDocuments());
    setIsSyncing(false);
    return updatedStats;
  }, []);

  const updateConfig = useCallback((patch: Partial<RagSyncConfiguration>) => {
    documentRagSyncEngine.updateConfig(patch);
    refreshState();
  }, [refreshState]);

  const addDocument = useCallback((params: {
    name: string;
    content: string;
    type?: string;
    size?: string;
    tags?: string[];
  }) => {
    const created = documentRagSyncEngine.addDocument(params);
    refreshState();
    return created;
  }, [refreshState]);

  const removeDocument = useCallback((documentId: string) => {
    documentRagSyncEngine.removeDocument(documentId);
    refreshState();
  }, [refreshState]);

  const searchDocs = useCallback((query: string, limit = 5): RagSearchResult[] => {
    return documentRagSyncEngine.searchIndexedDocuments(query, limit);
  }, []);

  return {
    documents,
    stats,
    config,
    isSyncing,
    toggleDocumentSync,
    syncNow,
    updateConfig,
    addDocument,
    removeDocument,
    searchDocs,
    refreshState,
  };
}
