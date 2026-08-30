/**
 * Agent-Reach Tools Definitions & Handlers
 * Exposes Agent-Reach capabilities (Search, URL Reader, YouTube, GitHub, Reddit, Twitter, RSS, Doctor)
 * as tools registered in the ToolRegistry and dispatched through ToolDispatcher.
 * MIT License
 */

import { ToolResult } from '@/controllers/appController';
import {
  agentReachEngine,
  AgentReachDoctor,
  AgentReachPlatform,
} from '@/lib/agentReach';

export const AGENT_REACH_SEARCH_TOOL_NAME = 'agent_reach_search';
export const AGENT_REACH_SEARCH_TOOL_SCHEMA = {
  name: AGENT_REACH_SEARCH_TOOL_NAME,
  description: 'Search the live web for real-time information, news, current events, recent tech updates, and fresh facts.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or topic to look up on the live web.',
      },
      freshness: {
        type: 'boolean',
        description: 'Whether fresh/latest real-time information is explicitly required (defaults to true).',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of top results to return (default: 6).',
      },
    },
    required: ['query'],
  },
};

export const AGENT_REACH_READ_URL_TOOL_NAME = 'agent_reach_read_url';
export const AGENT_REACH_READ_URL_TOOL_SCHEMA = {
  name: AGENT_REACH_READ_URL_TOOL_NAME,
  description: 'Read and extract full clean content, markdown, and metadata from any public webpage, URL, article, or documentation link.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The full URL of the webpage or document to read (e.g. https://example.com/article).',
      },
    },
    required: ['url'],
  },
};

export const AGENT_REACH_YOUTUBE_TOOL_NAME = 'agent_reach_youtube';
export const AGENT_REACH_YOUTUBE_TOOL_SCHEMA = {
  name: AGENT_REACH_YOUTUBE_TOOL_NAME,
  description: 'Retrieve YouTube video metadata, descriptions, transcript/captions, or search YouTube videos.',
  parameters: {
    type: 'object',
    properties: {
      videoUrlOrQuery: {
        type: 'string',
        description: 'A YouTube video URL, video ID, or search query to look up on YouTube.',
      },
    },
    required: ['videoUrlOrQuery'],
  },
};

export const AGENT_REACH_GITHUB_TOOL_NAME = 'agent_reach_github';
export const AGENT_REACH_GITHUB_TOOL_SCHEMA = {
  name: AGENT_REACH_GITHUB_TOOL_NAME,
  description: 'Inspect public GitHub repositories, read README.md, file structures, releases, stars, forks, and search repos.',
  parameters: {
    type: 'object',
    properties: {
      repoOrQuery: {
        type: 'string',
        description: 'GitHub repository slug (owner/repo), GitHub URL, or repository search query.',
      },
    },
    required: ['repoOrQuery'],
  },
};

export const AGENT_REACH_SOCIAL_TOOL_NAME = 'agent_reach_social';
export const AGENT_REACH_SOCIAL_TOOL_SCHEMA = {
  name: AGENT_REACH_SOCIAL_TOOL_NAME,
  description: 'Access Reddit discussions, X/Twitter posts, RSS/Atom feeds, Bilibili videos, or V2EX topics.',
  parameters: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['reddit', 'twitter', 'rss', 'bilibili', 'v2ex'],
        description: 'Target platform to access.',
      },
      target: {
        type: 'string',
        description: 'The URL, thread ID, tweet ID, feed URL, or search query for the specified platform.',
      },
      subreddit: {
        type: 'string',
        description: 'Optional subreddit name for Reddit queries (e.g. "technology").',
      },
    },
    required: ['platform', 'target'],
  },
};

export const AGENT_REACH_DIAGNOSTICS_TOOL_NAME = 'agent_reach_diagnostics';
export const AGENT_REACH_DIAGNOSTICS_TOOL_SCHEMA = {
  name: AGENT_REACH_DIAGNOSTICS_TOOL_NAME,
  description: 'Run Agent-Reach Doctor diagnostics to inspect health, availability, latency, and credentials across all channels.',
  parameters: {
    type: 'object',
    properties: {},
  },
};

export async function executeAgentReachSearch(args: { query: string; freshness?: boolean; limit?: number }): Promise<ToolResult> {
  try {
    const result = await agentReachEngine.search(args.query, {
      freshness: args.freshness ?? true,
      limit: args.limit ?? 6,
    });
    return {
      success: true,
      action: AGENT_REACH_SEARCH_TOOL_NAME,
      message: `Found live search results for "${args.query}" (Source: ${result.source})`,
      value: result,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_SEARCH_TOOL_NAME,
      error: err?.message || String(err),
      message: `Web search failed for "${args.query}".`,
    };
  }
}

export async function executeAgentReachReadUrl(args: { url: string }): Promise<ToolResult> {
  try {
    const result = await agentReachEngine.readUrl(args.url);
    return {
      success: result.confidence > 0,
      action: AGENT_REACH_READ_URL_TOOL_NAME,
      message: `Read webpage from ${args.url} (Confidence: ${Math.round(result.confidence * 100)}%)`,
      value: result,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_READ_URL_TOOL_NAME,
      error: err?.message || String(err),
      message: `Failed to read webpage ${args.url}.`,
    };
  }
}

export async function executeAgentReachYouTube(args: { videoUrlOrQuery: string }): Promise<ToolResult> {
  try {
    const result = await agentReachEngine.getYouTube(args.videoUrlOrQuery);
    return {
      success: true,
      action: AGENT_REACH_YOUTUBE_TOOL_NAME,
      message: `Retrieved YouTube information for "${args.videoUrlOrQuery}"`,
      value: result,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_YOUTUBE_TOOL_NAME,
      error: err?.message || String(err),
      message: `Failed to retrieve YouTube details for "${args.videoUrlOrQuery}".`,
    };
  }
}

export async function executeAgentReachGitHub(args: { repoOrQuery: string }): Promise<ToolResult> {
  try {
    const result = await agentReachEngine.getGitHub(args.repoOrQuery);
    return {
      success: true,
      action: AGENT_REACH_GITHUB_TOOL_NAME,
      message: `Retrieved GitHub repository details for "${args.repoOrQuery}"`,
      value: result,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_GITHUB_TOOL_NAME,
      error: err?.message || String(err),
      message: `Failed to retrieve GitHub information for "${args.repoOrQuery}".`,
    };
  }
}

export async function executeAgentReachSocial(args: {
  platform: 'reddit' | 'twitter' | 'rss' | 'bilibili' | 'v2ex';
  target: string;
  subreddit?: string;
}): Promise<ToolResult> {
  try {
    let result;
    switch (args.platform) {
      case 'reddit':
        result = await agentReachEngine.getReddit(args.target, args.subreddit);
        break;
      case 'twitter':
        result = await agentReachEngine.getTwitter(args.target);
        break;
      case 'rss':
        result = await agentReachEngine.getRSS(args.target);
        break;
      case 'bilibili':
        result = await agentReachEngine.getBilibili(args.target);
        break;
      case 'v2ex':
        result = await agentReachEngine.getV2EX(args.target);
        break;
      default:
        throw new Error(`Unsupported social platform: ${(args as any).platform}`);
    }

    return {
      success: true,
      action: AGENT_REACH_SOCIAL_TOOL_NAME,
      message: `Retrieved ${args.platform.toUpperCase()} content for "${args.target}"`,
      value: result,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_SOCIAL_TOOL_NAME,
      error: err?.message || String(err),
      message: `Failed to retrieve ${args.platform} content for "${args.target}".`,
    };
  }
}

export async function executeAgentReachDiagnostics(): Promise<ToolResult> {
  try {
    const report = await AgentReachDoctor.runDoctor();
    return {
      success: true,
      action: AGENT_REACH_DIAGNOSTICS_TOOL_NAME,
      message: `Agent-Reach Doctor Status: ${report.overallStatus.toUpperCase()} (${report.channels.length} channels checked)`,
      value: report,
    };
  } catch (err: any) {
    return {
      success: false,
      action: AGENT_REACH_DIAGNOSTICS_TOOL_NAME,
      error: err?.message || String(err),
      message: 'Agent-Reach Doctor diagnostics failed.',
    };
  }
}
