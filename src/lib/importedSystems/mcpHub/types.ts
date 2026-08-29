/**
 * Model Context Protocol (MCP) Tool Hub Architecture
 * Reference: https://github.com/punkpeye/awesome-mcp-servers (MIT)
 * 
 * Defines schemas for MCP servers, tools, JSON Schema parameter validation,
 * sandboxed execution pipeline, authorization checks, and sanitized results.
 */

export interface MCPToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

export interface MCPToolDefinition {
  name: string;
  serverId: string;
  serverName: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, MCPToolParameter>;
    required?: string[];
  };
  requiresPermission?: boolean;
  permissionCategory?: 'read' | 'write' | 'network' | 'system' | 'sensitive';
  timeoutMs?: number;
}

export interface MCPServerInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  status: 'connected' | 'disconnected' | 'error';
  transport: 'in-process' | 'sse' | 'stdio' | 'http';
  tools: MCPToolDefinition[];
}

export interface MCPToolCallRequest {
  toolName: string;
  arguments: Record<string, any>;
  callId?: string;
  userId?: string;
  approvedByUser?: boolean;
}

export interface MCPToolCallResult {
  callId: string;
  toolName: string;
  success: boolean;
  content: Array<{
    type: 'text' | 'image' | 'resource' | 'json';
    text?: string;
    data?: any;
    mimeType?: string;
  }>;
  executionTimeMs: number;
  error?: string;
  sanitized: boolean;
}
