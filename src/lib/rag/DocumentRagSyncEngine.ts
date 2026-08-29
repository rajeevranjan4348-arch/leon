import { 
  RagDocSyncStatus, 
  DocumentChunk, 
  SyncedDocumentMetadata, 
  RagSyncConfiguration, 
  RagSearchResult, 
  RagSyncStats 
} from './types';
import { getSharedMediaItems, SharedMediaItem } from '../mediaStore';
import { unifiedMemoryEngine } from '../importedSystems/unifiedMemory/UnifiedMemoryEngine';
import { LettaStore } from '../letta/LettaStore';
import { blink } from '../blink';

const DOC_METADATA_STORAGE_KEY = 'ai_rag_synced_docs_metadata_v1';
const CHUNKS_STORAGE_KEY = 'ai_rag_doc_chunks_index_v1';
const CONFIG_STORAGE_KEY = 'ai_rag_sync_config_v1';

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while',
  'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

export class DocumentRagSyncEngine {
  private static instance: DocumentRagSyncEngine;
  private documentsMap: Map<string, SyncedDocumentMetadata> = new Map();
  private chunksMap: Map<string, DocumentChunk[]> = new Map(); // docId -> DocumentChunk[]
  private config: RagSyncConfiguration = {
    enabled: true,
    autoSyncLibraryDocs: true,
    syncIntervalMinutes: 15,
    maxChunksPerDoc: 50,
    chunkSizeChars: 900,
    chunkOverlapChars: 120,
    syncStatus: 'idle',
  };

  private syncTimer: any = null;
  private isProcessing = false;

  private constructor() {
    this.loadState();
    this.initDefaultSeedDocuments();
    this.setupListeners();
    this.startBackgroundTimer();
  }

  public static getInstance(): DocumentRagSyncEngine {
    if (!DocumentRagSyncEngine.instance) {
      DocumentRagSyncEngine.instance = new DocumentRagSyncEngine();
    }
    return DocumentRagSyncEngine.instance;
  }

  private loadState(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const rawCfg = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (rawCfg) {
        this.config = { ...this.config, ...JSON.parse(rawCfg) };
      }

      const rawDocs = localStorage.getItem(DOC_METADATA_STORAGE_KEY);
      if (rawDocs) {
        const list: SyncedDocumentMetadata[] = JSON.parse(rawDocs);
        list.forEach(doc => this.documentsMap.set(doc.id, doc));
      }

      const rawChunks = localStorage.getItem(CHUNKS_STORAGE_KEY);
      if (rawChunks) {
        const obj: Record<string, DocumentChunk[]> = JSON.parse(rawChunks);
        Object.entries(obj).forEach(([docId, chunks]) => {
          this.chunksMap.set(docId, chunks);
        });
      }
    } catch (e) {
      console.warn('[DocumentRagSyncEngine] Failed to load local storage state:', e);
    }
  }

  private saveState(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      localStorage.setItem(
        DOC_METADATA_STORAGE_KEY, 
        JSON.stringify(Array.from(this.documentsMap.values()))
      );
      
      const chunksObj: Record<string, DocumentChunk[]> = {};
      this.chunksMap.forEach((chunks, docId) => {
        chunksObj[docId] = chunks;
      });
      localStorage.setItem(CHUNKS_STORAGE_KEY, JSON.stringify(chunksObj));
    } catch (e) {
      console.warn('[DocumentRagSyncEngine] Failed to persist state:', e);
    }
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for new media uploads to automatically index if auto-sync enabled
    window.addEventListener('shared_media_updated', () => {
      this.scanLocalLibrary();
    });
  }

  /**
   * Initialize initial seed documents for user research, coding, and reference
   */
  private initDefaultSeedDocuments(): void {
    if (this.documentsMap.size > 0) return;

    const sampleDocs: Array<Omit<SyncedDocumentMetadata, 'status' | 'chunkCount' | 'totalTokensApprox'> & { content: string }> = [
      {
        id: 'doc_seed_architecture_spec',
        name: 'AI System Architecture & Multi-Agent Specifications.md',
        type: 'document',
        size: '14.2 KB',
        source: 'system',
        selectedForSync: true,
        contentSnippet: 'Comprehensive technical specification for unified agent orchestration, memory tiers, and RAG retrieval pipelines.',
        tags: ['architecture', 'rag', 'multi-agent', 'specs'],
        content: `# AI System Architecture & Multi-Agent Technical Specification

## 1. Overview & Core Tenets
The system is built on an agentic orchestration layer combining real-time web search, tiered memory (L0 Abstract, L1 Overview, L2 Detail), and specialized sub-agents. 

### Key Modules:
- **Unified Memory Engine**: Hybrid context tree management (OpenViking architecture) with key-value and vector persistence.
- **Letta Tiered Memory**: Separation of Core Memory (Human Block, Persona Block, Project Context) and Archival Memory with sub-second semantic retrieval.
- **Document RAG Indexing**: Periodically synchronized sliding-window vector store that converts user-selected library files, manuals, PDFs, and code repositories into searchable semantic embeddings.
- **Android Device Controller**: Direct intent resolution and accessibility action execution for native Android apps without Google Play store redirection loops.
- **Cybersecurity & Safety**: Real-time prompt injection filtering and PII anonymization before LLM inference.

## 2. RAG Indexing & Background Sync Pipeline
1. Documents are extracted via streaming text or URL OCR extraction.
2. Sentences are chunked with a 900-character window and 120-character overlap to preserve semantic boundaries.
3. Chunks receive TF-IDF weighted vector indexing and keyword tagging.
4. During chat sessions, high-relevance chunks are injected into the LLM system prompt under the [RELEVANT LOCAL LIBRARY & RAG INDEXED DOCUMENTS] block.`
      },
      {
        id: 'doc_seed_research_guidelines',
        name: 'Research Methodology & Evidence Triangulation Guide.txt',
        type: 'document',
        size: '8.6 KB',
        source: 'system',
        selectedForSync: true,
        contentSnippet: 'Official scientific triangulation guidelines for multi-source verification and citation generation.',
        tags: ['research', 'guidelines', 'evidence', 'citations'],
        content: `Scientific Research Methodology & Triangulation Principles:

1. Hierarchy of Truth:
- Tier 1: Peer-reviewed literature (PubMed, IEEE, arXiv, Nature), official government sources (.gov, .edu), and vendor documentation.
- Tier 2: Established technical publications and reputable major news outlets.
- Tier 3: Community insights (GitHub issues, Stack Overflow, Reddit) for empirical validation.

2. Triangulation Rule:
Every key scientific or technical assertion must be corroborated by at least two independent primary sources. If sources disagree, explicitly state the conflict rather than forcing a single consensus.

3. Background Context Retrieval:
When the user asks technical or domain-specific questions, cross-reference relevant RAG-indexed documents from the library to ground the response with zero hallucinations.`
      }
    ];

    sampleDocs.forEach(doc => {
      const chunks = this.chunkText(doc.id, doc.name, doc.content);
      const totalTokensApprox = chunks.reduce((acc, c) => acc + c.tokensApprox, 0);

      const metadata: SyncedDocumentMetadata = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        source: doc.source,
        selectedForSync: doc.selectedForSync,
        contentSnippet: doc.contentSnippet,
        fullContent: doc.content,
        status: 'indexed',
        chunkCount: chunks.length,
        totalTokensApprox,
        lastSyncedAt: new Date().toISOString(),
        tags: doc.tags,
      };

      this.documentsMap.set(doc.id, metadata);
      this.chunksMap.set(doc.id, chunks);

      // Register with Letta & Unified Memory
      chunks.forEach((chunk, idx) => {
        LettaStore.insertArchivalPassage(
          'letta_agent_main',
          `[Doc: ${doc.name} - Part ${idx + 1}]\n${chunk.content}`,
          [...(doc.tags || []), 'rag_library', doc.name.slice(0, 20)]
        );
      });
    });

    this.saveState();
  }

  /**
   * Split document text into overlapping chunks with sentence/paragraph boundary awareness
   */
  private chunkText(documentId: string, documentName: string, text: string): DocumentChunk[] {
    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];

    const chunkSize = this.config.chunkSizeChars || 900;
    const overlap = this.config.chunkOverlapChars || 120;
    const chunks: DocumentChunk[] = [];

    // Split text by paragraphs first
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length <= chunkSize) {
        currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
      } else {
        if (currentChunk.trim()) {
          const keywords = this.extractKeywords(currentChunk);
          chunks.push({
            id: `chk_${documentId}_${chunkIndex}`,
            documentId,
            documentName,
            chunkIndex,
            content: currentChunk.trim(),
            wordCount: currentChunk.trim().split(/\s+/).length,
            tokensApprox: Math.ceil(currentChunk.length / 4),
            keywords,
            createdAt: new Date().toISOString(),
          });
          chunkIndex++;
        }

        // If a single paragraph is longer than chunkSize, slice with overlap
        if (para.length > chunkSize) {
          let start = 0;
          while (start < para.length) {
            const end = Math.min(start + chunkSize, para.length);
            const slice = para.slice(start, end).trim();
            if (slice) {
              const keywords = this.extractKeywords(slice);
              chunks.push({
                id: `chk_${documentId}_${chunkIndex}`,
                documentId,
                documentName,
                chunkIndex,
                content: slice,
                wordCount: slice.split(/\s+/).length,
                tokensApprox: Math.ceil(slice.length / 4),
                keywords,
                createdAt: new Date().toISOString(),
              });
              chunkIndex++;
            }
            if (end === para.length) break;
            start += (chunkSize - overlap);
          }
          currentChunk = '';
        } else {
          currentChunk = para;
        }
      }
    }

    if (currentChunk.trim()) {
      const keywords = this.extractKeywords(currentChunk);
      chunks.push({
        id: `chk_${documentId}_${chunkIndex}`,
        documentId,
        documentName,
        chunkIndex,
        content: currentChunk.trim(),
        wordCount: currentChunk.trim().split(/\s+/).length,
        tokensApprox: Math.ceil(currentChunk.length / 4),
        keywords,
        createdAt: new Date().toISOString(),
      });
    }

    return chunks.slice(0, this.config.maxChunksPerDoc || 50);
  }

  /**
   * Extract key meaningful tokens
   */
  private extractKeywords(text: string): string[] {
    const rawWords = text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    const freqMap = new Map<string, number>();
    rawWords.forEach(w => {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    });

    return Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);
  }

  /**
   * Start or restart the background sync timer
   */
  public startBackgroundTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (!this.config.enabled) return;

    const intervalMs = Math.max(1, this.config.syncIntervalMinutes || 15) * 60 * 1000;
    
    this.syncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, intervalMs);

    console.log(`[DocumentRagSyncEngine] Background sync timer active (every ${this.config.syncIntervalMinutes}m)`);
  }

  public stopBackgroundTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Automatically scan local library for new files or documents
   */
  public scanLocalLibrary(): void {
    const mediaItems = getSharedMediaItems();
    let hasChanges = false;

    mediaItems.forEach(item => {
      if (item.type === 'document' || item.type === 'other' || item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.pdf') || item.name.endsWith('.json')) {
        if (!this.documentsMap.has(item.id)) {
          const newDoc: SyncedDocumentMetadata = {
            id: item.id,
            name: item.name,
            type: item.type,
            size: item.size,
            source: 'local_library',
            url: item.url,
            contentSnippet: item.previewText || item.prompt || `${item.name} (${item.size || 'Local File'})`,
            fullContent: item.previewText || item.prompt || `Document: ${item.name}\nSource: Local Library Store\nCreated: ${item.createdAt}`,
            status: 'pending',
            selectedForSync: this.config.autoSyncLibraryDocs,
            chunkCount: 0,
            totalTokensApprox: 0,
            tags: ['library', item.type],
          };
          this.documentsMap.set(item.id, newDoc);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.saveState();
      this.notifyUpdate();
      // Auto-trigger sync if enabled
      if (this.config.enabled && this.config.autoSyncLibraryDocs) {
        this.performBackgroundSync();
      }
    }
  }

  /**
   * Execute background sync pipeline across all user-selected documents
   */
  public async performBackgroundSync(): Promise<RagSyncStats> {
    if (this.isProcessing) {
      return this.getStats();
    }

    this.isProcessing = true;
    this.config.syncStatus = 'syncing';
    this.notifyUpdate();
    const startTime = Date.now();

    try {
      // First ensure library scan is up to date
      this.scanLocalLibrary();

      const docsToSync = Array.from(this.documentsMap.values()).filter(
        d => d.selectedForSync && (d.status === 'pending' || d.status === 'error' || !this.chunksMap.has(d.id))
      );

      for (const doc of docsToSync) {
        doc.status = 'syncing';
        this.notifyUpdate();

        try {
          let textToChunk = doc.fullContent || doc.contentSnippet || '';

          // If no content but URL exists and is text-based, attempt text extraction
          if (!textToChunk && doc.url) {
            try {
              if (doc.url.startsWith('http') || doc.url.startsWith('blob:')) {
                const res = await fetch(doc.url);
                if (res.ok) {
                  textToChunk = await res.text();
                }
              }
            } catch (fetchErr) {
              console.warn(`[DocumentRagSyncEngine] Could not fetch remote content for ${doc.name}:`, fetchErr);
            }
          }

          if (!textToChunk || !textToChunk.trim()) {
            textToChunk = `Document Name: ${doc.name}\nType: ${doc.type}\nSize: ${doc.size || 'N/A'}\nTags: ${(doc.tags || []).join(', ')}`;
          }

          // Chunk the document
          const chunks = this.chunkText(doc.id, doc.name, textToChunk);
          this.chunksMap.set(doc.id, chunks);

          doc.status = 'indexed';
          doc.chunkCount = chunks.length;
          doc.totalTokensApprox = chunks.reduce((acc, c) => acc + c.tokensApprox, 0);
          doc.lastSyncedAt = new Date().toISOString();
          doc.errorMessage = undefined;

          // Sync into Letta archival memory for agentic recall
          chunks.forEach((chunk, i) => {
            LettaStore.insertArchivalPassage(
              'letta_agent_main',
              `[Library Doc: ${doc.name} - Chunk ${i + 1}/${chunks.length}]\n${chunk.content}`,
              [...(doc.tags || []), 'rag_sync', doc.name.slice(0, 24)]
            );
          });

          // Sync into Unified Memory Engine (OpenViking hierarchical context tree)
          unifiedMemoryEngine.storeMemory({
            key: `rag_doc_${doc.id}`,
            value: {
              documentId: doc.id,
              name: doc.name,
              chunkCount: chunks.length,
              snippet: doc.contentSnippet || textToChunk.slice(0, 200),
            },
            scope: 'knowledge_rag',
            category: 'knowledge',
            summary: `RAG-indexed document: ${doc.name} (${chunks.length} chunks)`,
            tags: ['rag_indexed', 'library', ...(doc.tags || [])],
            importanceScore: 0.85,
          });

          // Optional safe blink.rag sync
          try {
            if (blink && (blink as any).rag && typeof (blink as any).rag.upload === 'function') {
              await (blink as any).rag.upload({
                collectionName: 'docs_library_sync',
                filename: doc.name,
                content: textToChunk,
                metadata: {
                  docId: doc.id,
                  syncedAt: new Date().toISOString(),
                },
              });
            }
          } catch (blinkErr) {
            // Non-blocking fallback
          }

        } catch (docErr: any) {
          console.error(`[DocumentRagSyncEngine] Failed indexing doc ${doc.name}:`, docErr);
          doc.status = 'error';
          doc.errorMessage = docErr?.message || 'Indexing failed';
          doc.retryCount = (doc.retryCount || 0) + 1;
        }

        this.notifyUpdate();
      }

      this.config.syncStatus = 'success';
      this.config.lastGlobalSyncTimestamp = new Date().toISOString();
      this.config.lastError = undefined;

    } catch (globalErr: any) {
      console.error('[DocumentRagSyncEngine] Background sync global error:', globalErr);
      this.config.syncStatus = 'error';
      this.config.lastError = globalErr?.message || 'Sync error';
    } finally {
      this.isProcessing = false;
      this.saveState();
      this.notifyUpdate();
    }

    return this.getStats();
  }

  /**
   * User action: Toggle document sync inclusion
   */
  public toggleDocumentSync(documentId: string, selected?: boolean): void {
    const doc = this.documentsMap.get(documentId);
    if (!doc) return;

    doc.selectedForSync = selected !== undefined ? selected : !doc.selectedForSync;
    if (doc.selectedForSync && doc.status === 'idle') {
      doc.status = 'pending';
    }

    this.saveState();
    this.notifyUpdate();

    if (doc.selectedForSync) {
      this.performBackgroundSync();
    }
  }

  /**
   * Add a custom document to the RAG index
   */
  public addDocument(params: {
    id?: string;
    name: string;
    content: string;
    type?: string;
    size?: string;
    tags?: string[];
  }): SyncedDocumentMetadata {
    const id = params.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const metadata: SyncedDocumentMetadata = {
      id,
      name: params.name,
      type: params.type || 'document',
      size: params.size || `${(params.content.length / 1024).toFixed(1)} KB`,
      source: 'user_uploaded',
      contentSnippet: params.content.slice(0, 200),
      fullContent: params.content,
      status: 'pending',
      selectedForSync: true,
      chunkCount: 0,
      totalTokensApprox: 0,
      tags: params.tags || ['custom', 'document'],
    };

    this.documentsMap.set(id, metadata);
    this.saveState();
    this.notifyUpdate();

    // Trigger immediate background processing
    this.performBackgroundSync();
    return metadata;
  }

  /**
   * Remove a document from the RAG index
   */
  public removeDocument(documentId: string): void {
    this.documentsMap.delete(documentId);
    this.chunksMap.delete(documentId);
    this.saveState();
    this.notifyUpdate();
  }

  /**
   * Search indexed documents for relevant passages during chat sessions
   */
  public searchIndexedDocuments(query: string, limit = 5): RagSearchResult[] {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const queryTokens = cleanQuery
      .replace(/[^a-zA-Z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    if (queryTokens.length === 0) return [];

    const allChunks: DocumentChunk[] = [];
    this.documentsMap.forEach((doc, docId) => {
      if (doc.selectedForSync && doc.status === 'indexed') {
        const chunks = this.chunksMap.get(docId) || [];
        allChunks.push(...chunks);
      }
    });

    if (allChunks.length === 0) return [];

    const scored: Array<{ chunk: DocumentChunk; score: number; matchedKeywords: string[] }> = [];

    for (const chunk of allChunks) {
      const chunkLower = chunk.content.toLowerCase();
      const matched: string[] = [];
      let tokenOverlap = 0;

      queryTokens.forEach(t => {
        if (chunk.keywords.includes(t)) {
          tokenOverlap += 2.0;
          matched.push(t);
        } else if (chunkLower.includes(t)) {
          tokenOverlap += 1.0;
          matched.push(t);
        }
      });

      if (tokenOverlap > 0) {
        // Exact query substring bonus
        let substringBonus = 0;
        if (chunkLower.includes(cleanQuery)) {
          substringBonus = 3.0;
        }

        const score = (tokenOverlap / (queryTokens.length * 2)) * 0.7 + substringBonus * 0.3;
        scored.push({
          chunk,
          score: Math.min(1.0, parseFloat(score.toFixed(3))),
          matchedKeywords: Array.from(new Set(matched)),
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(item => {
      const excerpt = item.chunk.content.length > 350 
        ? `${item.chunk.content.slice(0, 350)}...` 
        : item.chunk.content;

      return {
        chunk: item.chunk,
        documentName: item.chunk.documentName,
        documentId: item.chunk.documentId,
        relevanceScore: item.score,
        matchedKeywords: item.matchedKeywords,
        excerpt,
      };
    });
  }

  /**
   * Format retrieved RAG context for injection into LLM system prompt
   */
  public getFormattedRagContext(query: string, limit = 4): string {
    const hits = this.searchIndexedDocuments(query, limit);
    if (hits.length === 0) return '';

    const passageBlocks = hits.map((hit, idx) => {
      return `[Document ${idx + 1}: "${hit.documentName}" | Relevance: ${(hit.relevanceScore * 100).toFixed(0)}% | Keywords: ${hit.matchedKeywords.join(', ') || 'general'}]:\n${hit.chunk.content}`;
    }).join('\n\n---\n\n');

    return `<rag_local_library_context>\n=== USER-SELECTED LOCAL LIBRARY DOCUMENTS (RAG INDEX) ===\n${passageBlocks}\n</rag_local_library_context>`;
  }

  /**
   * Update configuration
   */
  public updateConfig(patch: Partial<RagSyncConfiguration>): void {
    this.config = { ...this.config, ...patch };
    this.saveState();
    if (patch.syncIntervalMinutes !== undefined || patch.enabled !== undefined) {
      this.startBackgroundTimer();
    }
    this.notifyUpdate();
  }

  public getConfig(): RagSyncConfiguration {
    return { ...this.config };
  }

  public getAllDocuments(): SyncedDocumentMetadata[] {
    return Array.from(this.documentsMap.values());
  }

  public getStats(): RagSyncStats {
    const allDocs = Array.from(this.documentsMap.values());
    const selectedDocs = allDocs.filter(d => d.selectedForSync);
    const indexedDocs = allDocs.filter(d => d.status === 'indexed');
    let totalChunks = 0;
    this.chunksMap.forEach(chunks => {
      totalChunks += chunks.length;
    });

    const nextSyncTime = this.config.enabled && this.config.syncIntervalMinutes
      ? new Date(Date.now() + this.config.syncIntervalMinutes * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : undefined;

    return {
      totalDocsInLibrary: allDocs.length,
      selectedDocsCount: selectedDocs.length,
      indexedDocsCount: indexedDocs.length,
      totalChunksCount: totalChunks,
      lastSyncDurationMs: 0,
      nextScheduledSyncAt: nextSyncTime,
      isSyncing: this.isProcessing,
    };
  }

  private notifyUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('document_rag_sync_updated', {
        detail: {
          stats: this.getStats(),
          config: this.getConfig(),
        }
      }));
    }
  }
}

export const documentRagSyncEngine = DocumentRagSyncEngine.getInstance();
