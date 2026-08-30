/**
 * Agent-Reach Capability Layer - Public Entry Point
 * Direct, Zero-Cost Internet Access for AI Agents.
 * Inspired by Panniantong/Agent-Reach (MIT License)
 */

export * from './types';
export * from './security/ContentSanitizer';
export * from './channels/WebChannel';
export * from './channels/YouTubeChannel';
export * from './channels/GitHubChannel';
export * from './channels/RedditChannel';
export * from './channels/TwitterChannel';
export * from './channels/RSSChannel';
export * from './channels/BilibiliChannel';
export * from './channels/V2EXChannel';
export * from './channels/SearchChannel';
export * from './router/AgentReachRouter';
export * from './diagnostics/AgentReachDoctor';
export * from './AgentReachEngine';

import { agentReachEngine } from './AgentReachEngine';
import { agentReachRouter } from './router/AgentReachRouter';
import { AgentReachResult } from './types';

/**
 * Convenient helper to execute Agent-Reach smart routing on any user query or URL.
 */
export async function executeAgentReach(input: string): Promise<AgentReachResult> {
  return agentReachRouter.routeAndExecute(input);
}
