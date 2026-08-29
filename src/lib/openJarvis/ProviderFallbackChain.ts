/**
 * ProviderFallbackChain & JarvisErrorTranslator
 * Ported from com.openjarvis.agent.ProviderFallbackChain
 */

export interface LLMProviderAdapter {
  name: string;
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class JarvisErrorTranslator {
  public static translate(error: any, providerName?: string): string {
    const msg = error?.message || String(error);

    if (msg.includes('401')) {
      return `API key rejected by ${providerName || 'provider'}. Please verify key configuration.`;
    }
    if (msg.includes('429')) {
      return `Rate limited by ${providerName || 'provider'}. Attempting fallback provider...`;
    }
    if (msg.includes('503')) {
      return `${providerName || 'Provider'} service is unavailable (503). Switching provider...`;
    }
    if (msg.toLowerCase().includes('timeout')) {
      return `Request timed out after 30s. Checking connection status...`;
    }
    if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
      return `Network error encountered. Check connectivity or switch to local engine.`;
    }
    return `System error: ${msg.slice(0, 120)}`;
  }
}

export class ProviderFallbackChain {
  private cooldownMap = new Map<string, number>();
  private notificationMessage: string | null = null;
  private fallbackOrder: string[] = ['Groq', 'Google Gemini', 'OpenRouter', 'Anthropic Claude', 'OpenAI'];

  constructor(customFallbackOrder?: string[]) {
    if (customFallbackOrder && customFallbackOrder.length > 0) {
      this.fallbackOrder = customFallbackOrder;
    }
  }

  public setFallbackOrder(order: string[]) {
    this.fallbackOrder = order;
  }

  public getFallbackOrder(): string[] {
    return [...this.fallbackOrder];
  }

  public getNotification(): string | null {
    return this.notificationMessage;
  }

  public isInCooldown(providerName: string): boolean {
    const cooldownUntil = this.cooldownMap.get(providerName);
    if (!cooldownUntil) return false;
    if (Date.now() > cooldownUntil) {
      this.cooldownMap.delete(providerName);
      return false;
    }
    return true;
  }

  public async completeWithFallback(
    providers: Map<string, LLMProviderAdapter>,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ success: boolean; result?: string; error?: string; providerUsed?: string }> {
    this.notificationMessage = null;

    for (const name of this.fallbackOrder) {
      const provider = providers.get(name);
      if (!provider) continue;

      if (this.isInCooldown(name)) {
        continue;
      }

      try {
        const response = await provider.complete(systemPrompt, userPrompt);
        return { success: true, result: response, providerUsed: name };
      } catch (err: any) {
        const errorMsg = err?.message || String(err);

        if (errorMsg.includes('429')) {
          this.cooldownMap.set(name, Date.now() + 60_000); // 60s cooldown
          this.notificationMessage = `Rate limited by ${name}, trying next provider...`;
        } else if (errorMsg.includes('401')) {
          this.cooldownMap.set(name, Date.now() + 3600_000); // 1hr cooldown
          this.notificationMessage = `Auth failed for ${name}, trying next provider...`;
        }

        console.warn(`ProviderFallbackChain: ${name} failed: ${errorMsg}`);
      }
    }

    return {
      success: false,
      error: 'All configured LLM providers failed or are currently in rate-limit cooldown.',
    };
  }
}
