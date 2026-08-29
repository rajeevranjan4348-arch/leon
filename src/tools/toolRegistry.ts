import { APP_CONTROLLER_TOOL_NAME, APP_CONTROLLER_TOOL_SCHEMA, executeAppControllerTool } from './appController';
import { OPEN_APP_TOOL_NAME, OPEN_APP_TOOL_SCHEMA, executeOpenAppTool } from './openApp';
import { MEMORY_TOOL_NAME, MEMORY_TOOL_SCHEMA, executeMemoryTool } from './memory';
import { AGENTS_CLI_TOOL_NAME, AGENTS_CLI_TOOL_SCHEMA, executeAgentsCliTool } from './agentsCli';
import { IMPORTED_SYSTEMS_TOOL_NAME, IMPORTED_SYSTEMS_TOOL_SCHEMA, executeImportedSystemsTool } from './importedTools';
import { ToolResult } from '@/controllers/appController';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any) => Promise<ToolResult>;
}

class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, ToolDefinition> = new Map();

  private constructor() {
    // Automatically register app_controller
    this.registerTool({
      name: APP_CONTROLLER_TOOL_NAME,
      description: APP_CONTROLLER_TOOL_SCHEMA.description,
      parameters: APP_CONTROLLER_TOOL_SCHEMA.parameters,
      handler: executeAppControllerTool,
    });

    // Automatically register open_app
    this.registerTool({
      name: OPEN_APP_TOOL_NAME,
      description: OPEN_APP_TOOL_SCHEMA.description,
      parameters: OPEN_APP_TOOL_SCHEMA.parameters,
      handler: executeOpenAppTool,
    });

    // Automatically register manage_memory
    this.registerTool({
      name: MEMORY_TOOL_NAME,
      description: MEMORY_TOOL_SCHEMA.description,
      parameters: MEMORY_TOOL_SCHEMA.parameters,
      handler: executeMemoryTool,
    });

    // Automatically register Google Agents CLI (ADLC Management)
    this.registerTool({
      name: AGENTS_CLI_TOOL_NAME,
      description: AGENTS_CLI_TOOL_SCHEMA.description,
      parameters: AGENTS_CLI_TOOL_SCHEMA.parameters,
      handler: executeAgentsCliTool,
    });

    // Automatically register Imported Systems (7 Repositories Engine)
    this.registerTool({
      name: IMPORTED_SYSTEMS_TOOL_NAME,
      description: IMPORTED_SYSTEMS_TOOL_SCHEMA.description,
      parameters: IMPORTED_SYSTEMS_TOOL_SCHEMA.parameters,
      handler: executeImportedSystemsTool,
    });
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getToolSchemas(): any[] {
    return this.getAllTools().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}

export const toolRegistry = ToolRegistry.getInstance();
