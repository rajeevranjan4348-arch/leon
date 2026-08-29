export type RagDocSyncStatus = 'idle' | 'pending' | 'syncing' | 'indexed' | 'error';

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  content: string;
  wordCount: number;
  tokensApprox: number;
  embedding?: number[];
  keywords: string[];
  createdAt: string;
}

export interface SyncedDocumentMetadata {
  id: string;
  name: string;
  type: string;
  size?: string;
  source: 'user_uploaded' | 'ai_generated' | 'local_library' | 'system';
  url?: string;
  contentSnippet?: string;
  fullContent?: string;
  status: RagDocSyncStatus;
  selectedForSync: boolean;
  chunkCount: number;
  totalTokensApprox: number;
  lastSyncedAt?: string;
  checksum?: string;
  errorMessage?: string;
  retryCount?: number;
  tags?: string[];
}

export interface RagSyncConfiguration {
  enabled: boolean;
  autoSyncLibraryDocs: boolean;
  syncIntervalMinutes: number; // e.g. 5, 15, 30, 60
  maxChunksPerDoc: number;
  chunkSizeChars: number; // e.g. 800
  chunkOverlapChars: number; // e.g. 100
  lastGlobalSyncTimestamp?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
}

export interface RagSearchResult {
  chunk: DocumentChunk;
  documentName: string;
  documentId: string;
  relevanceScore: number;
  matchedKeywords: string[];
  excerpt: string;
}

export interface RagSyncStats {
  totalDocsInLibrary: number;
  selectedDocsCount: number;
  indexedDocsCount: number;
  totalChunksCount: number;
  lastSyncDurationMs: number;
  nextScheduledSyncAt?: string;
  isSyncing: boolean;
}
