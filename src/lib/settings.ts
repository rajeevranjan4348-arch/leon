const STORAGE_KEYS = {
  OPENAI_API_KEY: 'perplexity_openai_api_key',
  GEMINI_API_KEY: 'perplexity_gemini_api_key',
  MINIMAX_API_KEY: 'perplexity_minimax_api_key',
  BFL_API_KEY: 'perplexity_bfl_api_key',
  QWEN_API_KEY: 'perplexity_qwen_api_key',
  CODE_API_KEY: 'perplexity_code_api_key',
  VOICE_API_KEY: 'perplexity_voice_api_key',
  NVIDIA_CHAT_API_KEY: 'perplexity_nvidia_chat_api_key',
  PARALLEL_SEARCH_API_KEY: 'perplexity_parallel_search_api_key',
  JINA_API_KEY: 'perplexity_jina_api_key',
};

const DEFAULT_OPENAI_KEY = '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';
const DEFAULT_GEMINI_KEY = 'AQ.Ab8RN6IN1LZ6neCQLPU563UF-1nq8W3iJgB8WczH3ahzNj8E4A';
const DEFAULT_MINIMAX_KEY = 'sk-api-UJwKoymob0AUQ39_TeUrlqNZzioRF378y7nrTJgZy5J2om0gLkOCCC0AO4CKh2lGhD27MiWtLd9UTdokWXFQBqDimW3jSTarqVjK2l-pGes9ix1EYdYKeDI';
const DEFAULT_BFL_KEY = 'bfl_dFWKvi1QFPOdxjydfIh7gSQV78o4gSaB';
const DEFAULT_CODE_KEY = 'sk-ca5723f341654764b09775334b403802';
const DEFAULT_NVIDIA_CHAT_KEY = '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';
const DEFAULT_VOICE_KEY = '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';
const DEFAULT_PARALLEL_SEARCH_KEY = 'y3KcFw9ez8zdIOp3cTZzcffCVAFmapfEZb98bPoj';
const DEFAULT_JINA_KEY = 'sk-1pljrv7vmdwuuk1l0yqudsj2knrozv8a';

export interface KeySource {
  key: string;
  source: 'custom' | 'env' | 'default' | 'none';
}

/**
 * Get active NVIDIA Chat API key with source metadata.
 */
export function getNvidiaChatKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.NVIDIA_CHAT_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom NVIDIA Chat key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.NVIDIA_CHAT_API_KEY ||
    (globalThis as any).process?.env?.NVIDIA_API_KEY ||
    (globalThis as any).process?.env?.NVAPI_CHAT_KEY
  );
  const envKey = (import.meta as any).env?.VITE_NVIDIA_CHAT_API_KEY || (import.meta as any).env?.VITE_NVIDIA_API_KEY || (import.meta as any).env?.NVIDIA_CHAT_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_NVIDIA_CHAT_KEY && DEFAULT_NVIDIA_CHAT_KEY.trim()) {
    return { key: DEFAULT_NVIDIA_CHAT_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Voice (NVIDIA Voice Chat, Voice Gen & Voice Understanding) API key with source metadata.
 */
export function getVoiceKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.VOICE_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Voice key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.NVIDIA_VOICE_API_KEY ||
    (globalThis as any).process?.env?.NVAPI_VOICE_KEY ||
    (globalThis as any).process?.env?.VOICE_API_KEY
  );
  const envKey = (import.meta as any).env?.VITE_NVIDIA_VOICE_API_KEY || (import.meta as any).env?.VITE_VOICE_API_KEY || (import.meta as any).env?.NVIDIA_VOICE_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_VOICE_KEY && DEFAULT_VOICE_KEY.trim()) {
    return { key: DEFAULT_VOICE_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Code Generation API key with source metadata.
 */
export function getCodeKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.CODE_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Code key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.CODE_API_KEY ||
    (globalThis as any).process?.env?.DEEPSEEK_API_KEY
  );
  const envKey = (import.meta as any).env?.VITE_CODE_API_KEY || (import.meta as any).env?.CODE_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_CODE_KEY && DEFAULT_CODE_KEY.trim()) {
    return { key: DEFAULT_CODE_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Qwen (Alibaba DashScope / Tongyi Wanx) API key with source metadata.
 */
export function getQwenKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.QWEN_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Qwen key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.QWEN_API_KEY ||
    (globalThis as any).process?.env?.DASHSCOPE_API_KEY
  );
  const envKey = (import.meta as any).env?.VITE_QWEN_API_KEY || (import.meta as any).env?.QWEN_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Black Forest Labs (BFL Flux) API key with source metadata.
 */
export function getBFLKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.BFL_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom BFL key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.BFL_API_KEY;
  const envKey = (import.meta as any).env?.VITE_BFL_API_KEY || (import.meta as any).env?.BFL_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_BFL_KEY && DEFAULT_BFL_KEY.trim()) {
    return { key: DEFAULT_BFL_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active MiniMax API key with source metadata.
 */
export function getMiniMaxKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.MINIMAX_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom MiniMax key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.MINIMAX_API_KEY;
  const envKey = (import.meta as any).env?.VITE_MINIMAX_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_MINIMAX_KEY && DEFAULT_MINIMAX_KEY.trim()) {
    return { key: DEFAULT_MINIMAX_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active OpenAI API key with source metadata.
 * Resolution order:
 * 1. User custom key saved in localStorage
 * 2. VITE_OPENAI_API_KEY or OPENAI_API_KEY environment variables
 * 3. Default fallback key
 */
export function getOpenAIKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom OpenAI key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.OPENAI_API_KEY;
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_OPENAI_KEY && DEFAULT_OPENAI_KEY.trim()) {
    return { key: DEFAULT_OPENAI_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Gemini API key with source metadata.
 */
export function getGeminiKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Gemini key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.GEMINI_API_KEY;
  const envKey = (import.meta as any).env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_GEMINI_KEY && DEFAULT_GEMINI_KEY.trim()) {
    return { key: DEFAULT_GEMINI_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Parallel Search API key with source metadata.
 */
export function getParallelSearchKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.PARALLEL_SEARCH_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Parallel Search key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.PARALLEL_SEARCH_API_KEY ||
    (globalThis as any).process?.env?.VITE_PARALLEL_SEARCH_API_KEY
  );
  const envKey = (import.meta as any).env?.VITE_PARALLEL_SEARCH_API_KEY || (import.meta as any).env?.PARALLEL_SEARCH_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_PARALLEL_SEARCH_KEY && DEFAULT_PARALLEL_SEARCH_KEY.trim()) {
    return { key: DEFAULT_PARALLEL_SEARCH_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Get active Jina AI Search/Reader API key with source metadata.
 */
export function getJinaKeyInfo(): KeySource {
  try {
    const customKey = localStorage.getItem(STORAGE_KEYS.JINA_API_KEY)?.trim();
    if (customKey) {
      return { key: customKey, source: 'custom' };
    }
  } catch (e) {
    console.warn('Failed to read custom Jina key from localStorage:', e);
  }

  const processEnvKey = typeof globalThis !== 'undefined' && (
    (globalThis as any).process?.env?.JINA_API_KEY ||
    (globalThis as any).process?.env?.VITE_JINA_API_KEY
  );
  const envKey = (import.meta as any).env?.VITE_JINA_API_KEY || (import.meta as any).env?.JINA_API_KEY || processEnvKey;

  if (envKey && envKey.trim()) {
    return { key: envKey.trim(), source: 'env' };
  }

  if (DEFAULT_JINA_KEY && DEFAULT_JINA_KEY.trim()) {
    return { key: DEFAULT_JINA_KEY.trim(), source: 'default' };
  }

  return { key: '', source: 'none' };
}

/**
 * Save user custom API keys to localStorage.
 */
export function saveCustomKeys(keys: { openaiKey?: string; geminiKey?: string; minimaxKey?: string; bflKey?: string; qwenKey?: string; codeKey?: string; voiceKey?: string; nvidiaChatKey?: string; parallelSearchKey?: string; jinaKey?: string }): void {
  try {
    if (keys.openaiKey !== undefined) {
      if (keys.openaiKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, keys.openaiKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
      }
    }

    if (keys.geminiKey !== undefined) {
      if (keys.geminiKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, keys.geminiKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
      }
    }

    if (keys.minimaxKey !== undefined) {
      if (keys.minimaxKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.MINIMAX_API_KEY, keys.minimaxKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.MINIMAX_API_KEY);
      }
    }

    if (keys.bflKey !== undefined) {
      if (keys.bflKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.BFL_API_KEY, keys.bflKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.BFL_API_KEY);
      }
    }

    if (keys.qwenKey !== undefined) {
      if (keys.qwenKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.QWEN_API_KEY, keys.qwenKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.QWEN_API_KEY);
      }
    }

    if (keys.codeKey !== undefined) {
      if (keys.codeKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.CODE_API_KEY, keys.codeKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.CODE_API_KEY);
      }
    }

    if (keys.voiceKey !== undefined) {
      if (keys.voiceKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.VOICE_API_KEY, keys.voiceKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.VOICE_API_KEY);
      }
    }

    if (keys.nvidiaChatKey !== undefined) {
      if (keys.nvidiaChatKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.NVIDIA_CHAT_API_KEY, keys.nvidiaChatKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.NVIDIA_CHAT_API_KEY);
      }
    }

    if (keys.parallelSearchKey !== undefined) {
      if (keys.parallelSearchKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.PARALLEL_SEARCH_API_KEY, keys.parallelSearchKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.PARALLEL_SEARCH_API_KEY);
      }
    }

    if (keys.jinaKey !== undefined) {
      if (keys.jinaKey.trim()) {
        localStorage.setItem(STORAGE_KEYS.JINA_API_KEY, keys.jinaKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEYS.JINA_API_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to save API keys to localStorage:', e);
  }
}

/**
 * Clear custom saved keys from localStorage.
 */
export function clearCustomKeys(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OPENAI_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.MINIMAX_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.BFL_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.QWEN_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.CODE_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.VOICE_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.NVIDIA_CHAT_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.PARALLEL_SEARCH_API_KEY);
    localStorage.removeItem(STORAGE_KEYS.JINA_API_KEY);
  } catch (e) {
    console.error('Failed to clear API keys from localStorage:', e);
  }
}
