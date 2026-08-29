export type Role = 'user' | 'assistant' | 'system';

export type IntentCategory = 
  | 'casual_conversation'
  | 'follow_up_question'
  | 'normal_chat'
  | 'coding'
  | 'debugging'
  | 'research'
  | 'web_search_required'
  | 'role_lookup'
  | 'file_analysis'
  | 'task_execution'
  | 'creative_writing'
  | 'memory_command';

export type MemoryCategory = 
  | 'personal'
  | 'preference'
  | 'project'
  | 'instruction'
  | 'workflow'
  | 'fact'
  | 'decision'
  | 'task'
  | 'code'
  | 'general';

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
  size?: number;
}

export interface MessageToolCall {
  id: string;
  name: string;
  args?: any;
  result?: any;
  timestamp: string;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  timestamp: string;
  parts?: any[];
  attachments?: MessageAttachment[];
  toolCalls?: MessageToolCall[];
  metadata?: {
    intent?: IntentCategory;
    thinkingTimeMs?: number;
    tokensUsed?: number;
    searchMode?: 'chat' | 'search' | 'research';
    autoDeepResearch?: boolean;
    topicName?: string;
  };
}

export interface MemoryRecord {
  id: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  fact: string; // Human readable summary/representation
  importance: number; // 0 to 100
  confidence: number; // 0 to 100 or 0 to 1
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  accessCount: number;
  conversationId?: string;
  projectId?: string;
  tags?: string[];
  isDeleted?: boolean;
}

// Backward compatibility interface alias
export interface LongTermMemory {
  id: string;
  userId?: string;
  key?: string;
  value?: string;
  conversationId?: string;
  fact: string;
  category: MemoryCategory;
  importance: number;
  confidence: number;
  createdAt: string;
  updatedAt?: string;
  lastAccessedAt: string;
  accessCount: number;
  tags?: string[];
  projectId?: string;
  isDeleted?: boolean;
}

export interface MemoryRetrievalScore {
  memory: MemoryRecord;
  score: number;
  semanticSimilarity: number;
  recencyScore: number;
  importanceScore: number;
  taskRelevanceScore: number;
  projectMatchScore?: number;
}

export interface ExtractionResult {
  shouldRemember: boolean;
  category: MemoryCategory;
  key: string;
  value: string;
  fact?: string;
  importance: number;
  confidence: number;
  action?: 'create' | 'update' | 'delete' | 'none';
}

export interface ExplicitCommandResult {
  isExplicitCommand: boolean;
  commandType?: 'remember' | 'forget' | 'list' | 'clear';
  response?: string;
  memoryCreatedOrUpdated?: MemoryRecord;
  memoriesDeleted?: string[];
}

export interface ConversationSummary {
  conversationId: string;
  userId?: string;
  title?: string;
  summaryText: string;
  keyFacts: string[];
  unresolvedQuestions: string[];
  userRequirements: string[];
  decisions: string[];
  currentTask?: string;
  createdAt?: string;
  lastUpdated: string;
}

export interface ConversationState {
  conversationId: string;
  title: string;
  summary?: ConversationSummary;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isArchived?: boolean;
  tags?: string[];
  messageCount: number;
  lastIntent?: IntentCategory;
}

export type ThinkingStage = 
  | 'idle'
  | 'understanding'
  | 'checking_memory'
  | 'planning'
  | 'searching'
  | 'generating'
  | 'finalizing';

export interface ThinkingState {
  stage: ThinkingStage;
  stageMessage: string;
  intent?: IntentCategory;
  planSteps?: string[];
  memoriesRetrieved?: number;
  searchQueries?: string[];
  startTime: number;
}

