import { memoryService } from '@/lib/memory';
import { ToolResult } from '@/controllers/appController';

export const MEMORY_TOOL_NAME = "manage_memory";

export const MEMORY_TOOL_SCHEMA = {
  name: MEMORY_TOOL_NAME,
  description: "Manage persistent AI long-term user memory and preferences (e.g., 'Forget my name', 'What do you remember about me?', 'Remember my preference').",
  parameters: {
    type: "OBJECT",
    properties: {
      action: {
        type: "STRING",
        description: "The memory action to perform: 'list', 'remember', 'forget', 'clear', or 'search'.",
        enum: ["list", "remember", "forget", "clear", "search"],
      },
      query: {
        type: "STRING",
        description: "The memory query or command string (e.g., 'Forget my name', 'What do you remember?', 'My name is Rajeev').",
      },
      key: {
        type: "STRING",
        description: "Optional key or topic to remember or forget (e.g. 'preferred_name', 'tech_stack').",
      },
      value: {
        type: "STRING",
        description: "Optional value or preference content to remember.",
      },
    },
    required: ["action"],
  },
};

export async function executeMemoryTool(args: { action?: string; query?: string; key?: string; value?: string; command?: string }): Promise<ToolResult> {
  const queryStr = args.query || args.command || args.value || args.key || '';
  const action = (args.action || 'list').toLowerCase();

  if (queryStr && (!args.action || args.action === 'list')) {
    const explicit = memoryService.handleCommand(queryStr);
    if (explicit.isExplicitCommand && explicit.response) {
      return {
        success: true,
        action: 'manage_memory',
        message: explicit.response,
        value: explicit,
      };
    }
  }

  switch (action) {
    case 'list':
    case 'what_do_you_remember': {
      const memories = memoryService.search('');
      if (memories.length === 0) {
        return {
          success: true,
          action: 'manage_memory',
          message: "I don't have any saved memories about you yet.",
          value: [],
        };
      }
      const formatted = memories.map(m => `- ${m.key.replace(/_/g, ' ')}: ${m.value}`).join('\n');
      return {
        success: true,
        action: 'manage_memory',
        message: `### Stored Memories\n${formatted}`,
        value: memories,
      };
    }
    case 'forget':
    case 'delete': {
      const target = args.key || queryStr || 'all';
      if (target.toLowerCase().includes('name')) {
        memoryService.delete('preferred_name');
        memoryService.delete('name');
        return {
          success: true,
          action: 'manage_memory',
          message: "I have forgotten your preferred name.",
        };
      }
      const deleted = memoryService.delete(target);
      return {
        success: deleted,
        action: 'manage_memory',
        message: deleted ? `Successfully deleted memory for '${target}'.` : `No memory found matching '${target}'.`,
      };
    }
    case 'remember':
    case 'create':
    case 'save': {
      if (!args.key && !args.value && queryStr) {
        const explicit = memoryService.handleCommand(`Remember ${queryStr}`);
        return {
          success: true,
          action: 'manage_memory',
          message: explicit.response || `Saved memory: ${queryStr}`,
        };
      }
      const created = memoryService.create({
        key: args.key || 'user_preference',
        value: args.value || queryStr,
        fact: `${args.key || 'Preference'}: ${args.value || queryStr}`,
        category: 'preference',
      });
      return {
        success: true,
        action: 'manage_memory',
        message: `Successfully saved preference: ${created.key} = ${created.value}`,
        value: created,
      };
    }
    case 'clear': {
      memoryService.clear();
      return {
        success: true,
        action: 'manage_memory',
        message: "All stored user memories have been cleared.",
      };
    }
    case 'search': {
      const results = memoryService.search(queryStr);
      return {
        success: true,
        action: 'manage_memory',
        message: `Found ${results.length} memory entries matching '${queryStr}'.`,
        value: results,
      };
    }
    default: {
      return {
        success: false,
        action: 'manage_memory',
        error: `Unsupported memory action '${action}'`,
      };
    }
  }
}
