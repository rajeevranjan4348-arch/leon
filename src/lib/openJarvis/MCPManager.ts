/**
 * MCPManager & MCPClient - Model Context Protocol Integration System
 * Ported from com.openjarvis.mcp.MCPClient & MCPManager
 */

import { MCPServerConfig, MCPToolDefinition } from './types';

export class MCPClient {
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  public async fetchTools(): Promise<MCPToolDefinition[]> {
    if (!this.config.enabled) return [];
    try {
      const response = await fetch(`${this.config.url}/tools`, {
        headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.tools || [];
    } catch {
      return [];
    }
  }

  public async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.config.enabled) {
      throw new Error(`MCP Server ${this.config.name} is disabled`);
    }

    const response = await fetch(`${this.config.url}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({ name: toolName, arguments: args }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`MCP Tool ${toolName} failed: ${errText}`);
    }

    return await response.json();
  }
}

export class MCPManager {
  private static instance: MCPManager;
  private servers = new Map<string, MCPServerConfig>();

  private constructor() {
    this.loadServers();
  }

  public static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  private loadServers() {
    try {
      const raw = localStorage.getItem('open_jarvis_mcp_servers');
      if (raw) {
        const list: MCPServerConfig[] = JSON.parse(raw);
        list.forEach((s) => this.servers.set(s.id, s));
      }
    } catch {
      // Storage fallback
    }
  }

  public registerServer(config: MCPServerConfig) {
    this.servers.set(config.id, config);
    localStorage.setItem('open_jarvis_mcp_servers', JSON.stringify(Array.from(this.servers.values())));
  }

  public getServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  public async getAllTools(): Promise<{ serverId: string; tool: MCPToolDefinition }[]> {
    const results: { serverId: string; tool: MCPToolDefinition }[] = [];
    for (const [id, config] of this.servers.entries()) {
      if (!config.enabled) continue;
      const client = new MCPClient(config);
      const tools = await client.fetchTools();
      tools.forEach((t) => results.push({ serverId: id, tool: t }));
    }
    return results;
  }
}

export const mcpManager = MCPManager.getInstance();
