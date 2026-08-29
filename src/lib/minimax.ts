import {
  MiniMaxService,
  MiniMaxChatOptions,
  MiniMaxResponseResult,
  MiniMaxModel,
  ReasoningEffort,
  callMiniMax,
  streamMiniMax,
} from './services/miniMaxService';
import {
  MiniMaxH3Service,
  H3_SKILL_PRESETS,
  formatH3Prompt,
  type MiniMaxH3Mode,
  type MiniMaxH3Resolution,
  type MiniMaxH3Ratio,
  type MiniMaxH3Duration,
  type MiniMaxH3PromptStructure,
  type MiniMaxH3MediaInput,
  type CreateH3VideoRequest,
  type H3TaskStatus,
  type H3SkillPreset,
} from './services/miniMaxH3Service';

export type {
  MiniMaxChatOptions,
  MiniMaxResponseResult,
  MiniMaxModel,
  ReasoningEffort,
  MiniMaxH3Mode,
  MiniMaxH3Resolution,
  MiniMaxH3Ratio,
  MiniMaxH3Duration,
  MiniMaxH3PromptStructure,
  MiniMaxH3MediaInput,
  CreateH3VideoRequest,
  H3TaskStatus,
  H3SkillPreset,
};

export {
  MiniMaxH3Service,
  H3_SKILL_PRESETS,
  formatH3Prompt,
};

export interface MiniMaxRequestOptions {
  prompt: string;
  history?: Array<{ role: 'user' | 'assistant' | 'system' | 'developer' | 'tool'; content: string }>;
  systemPrompt?: string;
  model?: MiniMaxModel;
  reasoningEffort?: ReasoningEffort;
  stream?: boolean;
}

export interface MiniMaxResponse {
  text: string;
  reasoningText?: string;
  success: boolean;
  error?: string;
}

/**
 * Call MiniMax OpenAI Responses API compatible endpoint (/v1/responses).
 * Generates model replies with optional reasoning support.
 */
export async function callMiniMaxAPI(options: MiniMaxRequestOptions): Promise<MiniMaxResponse> {
  const res = await MiniMaxService.createResponse({
    prompt: options.prompt,
    history: options.history,
    systemPrompt: options.systemPrompt,
    model: options.model || 'MiniMax-M3',
    reasoningEffort: options.reasoningEffort,
  });

  return {
    text: res.text,
    reasoningText: res.reasoningText,
    success: res.success,
    error: res.error,
  };
}

/**
 * Stream MiniMax OpenAI Responses API compatible endpoint (/v1/responses).
 */
export async function streamMiniMaxAPI(
  options: MiniMaxRequestOptions,
  onChunk: (delta: string, accumulated: string) => void,
  onReasoning?: (delta: string, accumulated: string) => void
): Promise<MiniMaxResponse> {
  const res = await MiniMaxService.streamResponse(
    {
      prompt: options.prompt,
      history: options.history,
      systemPrompt: options.systemPrompt,
      model: options.model || 'MiniMax-M3',
      reasoningEffort: options.reasoningEffort,
    },
    onChunk,
    onReasoning
  );

  return {
    text: res.text,
    reasoningText: res.reasoningText,
    success: res.success,
    error: res.error,
  };
}

export { MiniMaxService, callMiniMax, streamMiniMax };
