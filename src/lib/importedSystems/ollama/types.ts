/**
 * Ollama Local Model Provider Architecture
 * Reference: https://github.com/ollama/ollama (MIT)
 * 
 * Defines schemas for local model discovery, configuration, inference,
 * streaming, health checks, and cloud failover.
 */

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 encoded images for vision models (llava, etc.)
}

export interface OllamaInferenceOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_ctx?: number;
  repeat_penalty?: number;
  seed?: number;
  system?: string;
  format?: 'json';
  stream?: boolean;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  options?: OllamaInferenceOptions;
  stream?: boolean;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaInferenceOptions;
  stream?: boolean;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaServerStatus {
  isAvailable: boolean;
  endpoint: string;
  models: OllamaModelInfo[];
  defaultModel?: string;
  latencyMs?: number;
  error?: string;
}
