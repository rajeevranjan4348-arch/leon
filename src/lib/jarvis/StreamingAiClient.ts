/**
 * Streaming AI Client ported from JarvisLauncher (com.jarvis.launcher.ai.engine.StreamingAiClient)
 * Handles Server-Sent Events (SSE) streaming tokens for OpenAI & Gemini cloud models.
 */

import { CloudProvider, StreamChunk } from './types';
import { keystoreManager } from './KeystoreManager';

export class StreamingAiClient {
  private static instance: StreamingAiClient;

  private constructor() {}

  public static getInstance(): StreamingAiClient {
    if (!StreamingAiClient.instance) {
      StreamingAiClient.instance = new StreamingAiClient();
    }
    return StreamingAiClient.instance;
  }

  /**
   * Stream completion response from OpenAI or Gemini
   */
  public async *streamChat(
    provider: CloudProvider,
    prompt: string,
    history: Array<{ text: string; isUser: boolean }> = []
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const apiKey = await keystoreManager.getSecureKey(provider.toLowerCase());

      if (provider === 'OPENAI') {
        yield* this.streamOpenAI(prompt, history, apiKey);
      } else {
        yield* this.streamGemini(prompt, history, apiKey);
      }
    } catch (e: any) {
      yield { type: 'error', message: e?.message || 'Streaming failed' };
    }
  }

  private async *streamOpenAI(
    prompt: string,
    history: Array<{ text: string; isUser: boolean }>,
    apiKey: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const messages = [
      { role: 'system', content: 'You are JARVIS, a helpful AI system assistant.' },
      ...history.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: prompt },
    ];

    if (!apiKey) {
      yield { type: 'token', text: `[Jarvis Local Mode] Processing: "${prompt}"...` };
      yield { type: 'done' };
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          stream: true,
          temperature: 0.7,
        }),
      });

      if (!response.ok || !response.body) {
        yield { type: 'error', message: `OpenAI streaming HTTP ${response.status}` };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              yield { type: 'done' };
              return;
            }
            try {
              const json = JSON.parse(dataStr);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                yield { type: 'token', text: delta };
              }
            } catch {
              // Ignore line parse error
            }
          }
        }
      }
      yield { type: 'done' };
    } catch (e: any) {
      yield { type: 'error', message: e?.message || 'Network stream error' };
    }
  }

  private async *streamGemini(
    prompt: string,
    history: Array<{ text: string; isUser: boolean }>,
    apiKey: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const contents = [
      ...history.slice(-10).map(m => ({
        role: m.isUser ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: prompt }] },
    ];

    if (!apiKey) {
      yield { type: 'token', text: `[Jarvis Gemini Engine] Standard response for: "${prompt}"` };
      yield { type: 'done' };
      return;
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!response.ok || !response.body) {
        yield { type: 'error', message: `Gemini streaming HTTP ${response.status}` };
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            try {
              const json = JSON.parse(dataStr);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { type: 'token', text };
              }
            } catch {
              // Ignore line parse error
            }
          }
        }
      }
      yield { type: 'done' };
    } catch (e: any) {
      yield { type: 'error', message: e?.message || 'Network stream error' };
    }
  }
}

export const streamingAiClient = StreamingAiClient.getInstance();
