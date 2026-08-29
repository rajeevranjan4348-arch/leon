/**
 * System Types for Open Jarvis Agent Architecture
 * Ported from com.openjarvis.* (System logic only)
 */

export interface OpenJarvisAction {
  action: string;
  packageName?: string;
  label?: string;
  text?: string;
  value?: string;
  hint?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  x?: number;
  y?: number;
  distance?: 'short' | 'medium' | 'long';
  timeoutMs?: number;
  message?: string;
  prompt?: string;
  outputKey?: string;
}

export interface ValidationResult {
  isValid: boolean;
  actions: OpenJarvisAction[];
  errors: string[];
  wasRepaired: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ActionPreview {
  riskLevel: RiskLevel;
  summary: string;
  details: string[];
  canUndo: boolean;
}

export interface GraphifyAppNode {
  id: string;
  packageName: string;
  label: string;
  lastUsed: number;
  useCount: number;
}

export interface GraphifyTaskNode {
  id: string;
  command: string;
  result: string;
  timestamp: number;
  providerUsed?: string;
}

export interface GraphifyContactNode {
  contactId: string;
  displayName: string;
  phoneNumber?: string;
  email?: string;
  lastMentioned: number;
}

export interface GraphifyPatternNode {
  id: string;
  patternType: string;
  patternData: string;
  confidence: number;
  lastUpdated: number;
}

export interface GraphifyEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: 'UsedBy' | 'OpenedAfter' | 'ResultedIn' | 'MentionedIn' | 'LearnedFrom';
  weight: number;
  lastUpdated: number;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  enabled: boolean;
  transport?: 'stdio' | 'sse';
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
}

export interface SkillDefinition {
  id: string;
  name: string;
  triggerPhrases: string[];
  actions: OpenJarvisAction[];
  description: string;
}

export type AutomationSchedule =
  | { type: 'daily'; hour: number; minute: number }
  | { type: 'weekly'; dayOfWeek: number; hour: number; minute: number }
  | { type: 'interval'; intervalMs: number }
  | { type: 'once'; atMs: number };

export interface AutomationTask {
  id: string;
  name: string;
  command: string;
  schedule: AutomationSchedule;
  enabled: boolean;
  lastRun?: number;
  lastResult?: string;
  runCount: number;
}
