import { LettaToolDefinition, LettaExecutionContext } from './types';
import { LettaStore } from './LettaStore';
import { solveMathOrLogicQuery } from '../memory/PipelineManager';
import { getCityAndWeatherContext } from '../weatherService';
import { JinaClient } from '../jina/JinaClient';
import { JinaResearchEngine } from '../jina/JinaResearchEngine';

export const LETTA_CORE_TOOLS: Record<string, LettaToolDefinition> = {
  core_memory_append: {
    name: 'core_memory_append',
    description: 'Append critical information or preferences to a Core Memory block ("human", "persona", or custom block).',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the core memory block to append to (e.g., "human" for user profile, "persona" for agent personality, "project_context").',
          enum: ['human', 'persona', 'project_context', 'task_state'],
        },
        content: {
          type: 'string',
          description: 'The key fact, preference, rule, or requirement to append to the core memory block.',
        },
      },
      required: ['name', 'content'],
    },
    handler: async (args: { name: string; content: string }, context: LettaExecutionContext) => {
      const result = LettaStore.appendCoreMemory(context.agentId, args.name, args.content);
      return {
        success: result.success,
        blockName: args.name,
        message: result.message,
      };
    },
  },

  core_memory_replace: {
    name: 'core_memory_replace',
    description: 'Replace or update an existing fact or preference in a Core Memory block with new information.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the core memory block ("human", "persona", "project_context").',
          enum: ['human', 'persona', 'project_context', 'task_state'],
        },
        old_content: {
          type: 'string',
          description: 'The existing string or sentence to be replaced in the block.',
        },
        new_content: {
          type: 'string',
          description: 'The new replacement string or updated fact.',
        },
      },
      required: ['name', 'old_content', 'new_content'],
    },
    handler: async (args: { name: string; old_content: string; new_content: string }, context: LettaExecutionContext) => {
      const result = LettaStore.replaceCoreMemory(context.agentId, args.name, args.old_content, args.new_content);
      return {
        success: result.success,
        blockName: args.name,
        message: result.message,
      };
    },
  },

  archival_memory_insert: {
    name: 'archival_memory_insert',
    description: 'Insert a long-term knowledge passage or document chunk into Archival Memory for permanent indexed recall.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The detailed factual passage, note, summary, or code snippet to store in archival memory.',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated keywords or tags for indexing (e.g., "react, typescript, architecture").',
        },
      },
      required: ['content'],
    },
    handler: async (args: { content: string; tags?: string }, context: LettaExecutionContext) => {
      const tagList = args.tags ? args.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const passage = LettaStore.insertArchivalPassage(context.agentId, args.content, tagList, {
        conversationId: context.conversationId,
        importance: 4,
      });
      return {
        success: true,
        passageId: passage.id,
        message: 'Passage saved to archival memory.',
      };
    },
  },

  archival_memory_search: {
    name: 'archival_memory_search',
    description: 'Search long-term Archival Memory passages using semantic and keyword matching.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or concept to look up in archival memory.',
        },
        limit: {
          type: 'string',
          description: 'Maximum number of passages to return (default 5).',
        },
      },
      required: ['query'],
    },
    handler: async (args: { query: string; limit?: string }, context: LettaExecutionContext) => {
      const limitNum = parseInt(args.limit || '5', 10) || 5;
      const results = LettaStore.searchArchivalPassages(context.agentId, args.query, limitNum);
      return {
        success: true,
        count: results.length,
        results: results.map(r => ({
          id: r.passage.id,
          content: r.passage.content,
          tags: r.passage.tags,
          score: r.score,
          matchType: r.matchType,
          createdAt: r.passage.createdAt,
        })),
      };
    },
  },

  conversation_search: {
    name: 'conversation_search',
    description: 'Search past conversation messages in Recall Memory to recall what was discussed earlier.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search term or phrase from previous conversations.',
        },
        limit: {
          type: 'string',
          description: 'Maximum number of messages to retrieve (default 5).',
        },
      },
      required: ['query'],
    },
    handler: async (args: { query: string; limit?: string }, context: LettaExecutionContext) => {
      const limitNum = parseInt(args.limit || '5', 10) || 5;
      const events = LettaStore.searchRecallMemory(context.agentId, args.query, limitNum);
      return {
        success: true,
        count: events.length,
        events: events.map(e => ({
          role: e.role,
          content: e.content,
          timestamp: e.timestamp,
          conversationId: e.conversationId,
        })),
      };
    },
  },

  web_search: {
    name: 'web_search',
    description: 'Search the live web for up-to-date facts, news, documentation, official websites, prices, people, or events.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web.',
        },
      },
      required: ['query'],
    },
    handler: async (args: { query: string }, context: LettaExecutionContext) => {
      try {
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query }),
        });
        if (searchRes.ok) {
          const data = await searchRes.json();
          return {
            success: true,
            query: args.query,
            summary: data.summary || data.results || '',
            sources: data.sources || [],
          };
        }
      } catch (err: any) {
        console.warn('Letta web_search tool network error, falling back:', err);
      }
      return {
        success: false,
        query: args.query,
        error: 'Web search temporarily unavailable.',
      };
    },
  },

  file_read: {
    name: 'file_read',
    description: 'Read or inspect the contents of an uploaded document or file by its name.',
    parameters: {
      type: 'object',
      properties: {
        file_name: {
          type: 'string',
          description: 'The name of the file or document to read (e.g., "report.pdf", "data.csv").',
        },
      },
      required: ['file_name'],
    },
    handler: async (args: { file_name: string }, context: LettaExecutionContext) => {
      const allPassages = LettaStore.getAllArchivalPassages(context.agentId);
      const cleanFileName = args.file_name.toLowerCase().trim();
      const filePassages = allPassages.filter(p => 
        (p.metadata?.fileName && p.metadata.fileName.toLowerCase().includes(cleanFileName)) ||
        p.tags.some(t => t.toLowerCase().includes(cleanFileName)) ||
        p.content.toLowerCase().includes(`[file: ${cleanFileName}`)
      );

      if (filePassages.length > 0) {
        // Sort by chunk index if present
        filePassages.sort((a, b) => (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0));
        const combined = filePassages.map(p => p.content).join('\n\n');
        return {
          success: true,
          fileName: args.file_name,
          chunksCount: filePassages.length,
          content: combined,
        };
      }

      return {
        success: false,
        fileName: args.file_name,
        error: `File "${args.file_name}" not found in indexed memory.`,
      };
    },
  },

  file_search: {
    name: 'file_search',
    description: 'Search across all indexed uploaded files and documents for specific keywords or concepts.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up within document passages.',
        },
        limit: {
          type: 'string',
          description: 'Maximum number of document passages to return (default 5).',
        },
      },
      required: ['query'],
    },
    handler: async (args: { query: string; limit?: string }, context: LettaExecutionContext) => {
      const limitNum = parseInt(args.limit || '5', 10) || 5;
      const allPassages = LettaStore.searchArchivalPassages(context.agentId, args.query, limitNum, ['document']);
      const results = allPassages.length > 0 
        ? allPassages 
        : LettaStore.searchArchivalPassages(context.agentId, args.query, limitNum);

      return {
        success: true,
        count: results.length,
        results: results.map(r => ({
          id: r.passage.id,
          fileName: r.passage.metadata?.fileName || 'document',
          content: r.passage.content,
          score: r.score,
        })),
      };
    },
  },

  calculator_eval: {
    name: 'calculator_eval',
    description: 'Evaluate complex mathematical, logical, radical, or unit conversion expressions with step-by-step proofs.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical or logical expression to solve.',
        },
      },
      required: ['expression'],
    },
    handler: async (args: { expression: string }) => {
      const result = solveMathOrLogicQuery(args.expression);
      return {
        success: Boolean(result),
        solution: result || 'Unable to solve expression directly.',
      };
    },
  },

  weather_lookup: {
    name: 'weather_lookup',
    description: 'Look up live weather, forecast, and temperature context for a city or region.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City, state, or country name.',
        },
      },
      required: ['location'],
    },
    handler: async (args: { location: string }) => {
      const weatherText = await getCityAndWeatherContext(args.location).catch(() => '');
      return {
        success: Boolean(weatherText),
        data: weatherText || `Weather data for ${args.location} currently unavailable.`,
      };
    },
  },
};

/**
 * Execute a Letta Tool by name.
 */
export async function executeLettaTool(
  toolName: string,
  args: any,
  context: LettaExecutionContext
): Promise<any> {
  const tool = LETTA_CORE_TOOLS[toolName];
  if (!tool) {
    throw new Error(`Tool "${toolName}" is not a recognized Letta tool.`);
  }

  if (context.onStatusUpdate) {
    context.onStatusUpdate({
      stage: 'using_tool',
      message: `Using tool: ${toolName}...`,
      activeTool: toolName,
    });
  }

  try {
    const result = await tool.handler(args, context);
    return result;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed executing tool ${toolName}`,
    };
  }
}
