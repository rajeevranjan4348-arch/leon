import {
  OllamaModelInfo,
  OllamaChatMessage,
  OllamaInferenceOptions,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaServerStatus,
} from './types';
import { callGeminiAPI } from '../../gemini';

/**
 * OllamaClientService
 * Local model provider client supporting model discovery, inference, streaming,
 * and automatic cloud failover.
 */
export class OllamaClientService {
  private static instance: OllamaClientService;
  private endpoint: string = 'http://127.0.0.1:11434';
  private defaultModel: string = 'llama3.2';
  private cachedModels: OllamaModelInfo[] = [];
  private lastHealthCheck: number = 0;
  private isServerOnline: boolean = false;

  private constructor() {
    this.initEndpoint();
  }

  public static getInstance(): OllamaClientService {
    if (!OllamaClientService.instance) {
      OllamaClientService.instance = new OllamaClientService();
    }
    return OllamaClientService.instance;
  }

  private initEndpoint(): void {
    const envEndpoint =
      (import.meta as any).env?.VITE_OLLAMA_HOST ||
      (import.meta as any).env?.OLLAMA_HOST ||
      (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.OLLAMA_HOST);
    if (envEndpoint) {
      this.endpoint = envEndpoint.replace(/\/+$/, '');
    }
  }

  public setEndpoint(url: string): void {
    this.endpoint = url.replace(/\/+$/, '');
    this.checkHealth();
  }

  public setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * Health check and local model discovery.
   */
  public async checkHealth(): Promise<OllamaServerStatus> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      this.cachedModels = data.models || [];
      this.isServerOnline = true;
      this.lastHealthCheck = Date.now();

      return {
        isAvailable: true,
        endpoint: this.endpoint,
        models: this.cachedModels,
        defaultModel: this.cachedModels[0]?.name || this.defaultModel,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.isServerOnline = false;
      return {
        isAvailable: false,
        endpoint: this.endpoint,
        models: [],
        error: err?.message || 'Local Ollama daemon not reachable',
      };
    }
  }

  /**
   * List available local models.
   */
  public async listModels(): Promise<OllamaModelInfo[]> {
    if (Date.now() - this.lastHealthCheck < 30000 && this.cachedModels.length > 0) {
      return this.cachedModels;
    }
    const status = await this.checkHealth();
    return status.models;
  }

  /**
   * Chat completion with local Ollama model, or fallback to Gemini if Ollama is unreachable.
   */
  public async chat(
    messages: OllamaChatMessage[],
    options: OllamaInferenceOptions = {},
    onChunk?: (chunkText: string) => void
  ): Promise<{ text: string; provider: 'ollama' | 'cloud_fallback'; model: string }> {
    const targetModel = options.model || this.defaultModel;

    // Check if Ollama is online
    if (this.isServerOnline || (await this.checkHealth()).isAvailable) {
      try {
        const payload: OllamaChatRequest = {
          model: targetModel,
          messages,
          stream: !!onChunk,
          options: {
            temperature: options.temperature ?? 0.7,
            top_p: options.top_p ?? 0.9,
            num_ctx: options.num_ctx ?? 4096,
            repeat_penalty: options.repeat_penalty ?? 1.1,
            format: options.format,
          },
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${this.endpoint}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Ollama error HTTP ${response.status}`);
        }

        // Streaming handling
        if (onChunk && response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n').filter(l => l.trim().length > 0);

            for (const line of lines) {
              try {
                const parsed: OllamaChatResponse = JSON.parse(line);
                if (parsed.message?.content) {
                  fullText += parsed.message.content;
                  onChunk(parsed.message.content);
                }
              } catch {
                // Ignore incomplete JSON stream chunk
              }
            }
          }

          return { text: fullText, provider: 'ollama', model: targetModel };
        }

        // Non-streaming handling
        const data: OllamaChatResponse = await response.json();
        return {
          text: data.message?.content || '',
          provider: 'ollama',
          model: targetModel,
        };
      } catch (ollamaErr) {
        console.warn('[OllamaClient] Local inference failed, initiating Cloud Fallback:', ollamaErr);
      }
    }

    // Cloud Fallback via Gemini API
    const userPrompt = messages
      .map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`)
      .join('\n\n');

    const cloudResponse = await callGeminiAPI({
      prompt: userPrompt,
      systemInstruction: options.system || 'You are a helpful, intelligent AI assistant.',
      temperature: options.temperature ?? 0.7,
    });

    const replyText = cloudResponse.text || '';

    if (onChunk) {
      onChunk(replyText);
    }

    return {
      text: replyText,
      provider: 'cloud_fallback',
      model: 'gemini-2.5-flash',
    };
  }
}

export const ollamaClientService = OllamaClientService.getInstance();
