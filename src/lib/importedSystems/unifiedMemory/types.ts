export type MemoryScope = 'short_term' | 'conversation' | 'long_term' | 'knowledge_rag';

export type ContextNodeType = 'root' | 'category' | 'document' | 'fragment' | 'entity';

export type MemoryKind = 
  | 'short_term_conversation'
  | 'long_term_agent_memory'
  | 'archival_knowledge'
  | 'core_block';

export type MemorySourceComponent = 'ruflo' | 'letta' | 'openviking' | 'agentmemory' | 'system';

export interface MemoryItem {
  id: string;
  scope: MemoryScope;
  category: string;
  key: string;
  value: any;
  summary?: string;
  tags: string[];
  embedding?: number[];
  importanceScore: number; // 0.0 to 1.0
  accessCount: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ContextTreeNode {
  id: string;
  parentId?: string;
  name: string;
  nodeType: ContextNodeType;
  level: 'L0_abstract' | 'L1_overview' | 'L2_detail';
  content: string;
  childrenIds: string[];
  attributes: Record<string, any>;
  updatedAt: string;
}

export interface MemoryQueryResult {
  items: MemoryItem[];
  contextNodes: ContextTreeNode[];
  totalCount: number;
  relevanceScores: number[];
  queryTimeMs: number;
}

export interface MemorySearchOptions {
  scope?: MemoryScope;
  category?: string;
  limit?: number;
  minImportanceScore?: number;
  tags?: string[];
}

export interface StandardizedMemoryRecord {
  id: string;
  kind: MemoryKind;
  agentId: string;
  conversationId?: string;
  sourceComponent: MemorySourceComponent;
  key: string;
  content: string;
  value?: any;
  category: string;
  tags: string[];
  embedding?: number[];
  importanceScore: number;
  accessCount: number;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface StandardizedQueryOptions {
  query?: string;
  kind?: MemoryKind;
  agentId?: string;
  conversationId?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  minImportanceScore?: number;
  includeComponents?: MemorySourceComponent[];
}

export interface StandardizedQueryResult {
  records: StandardizedMemoryRecord[];
  totalCount: number;
  searchTimeMs: number;
  relevanceScores: number[];
  sourcesSummary: Record<MemorySourceComponent, number>;
}
