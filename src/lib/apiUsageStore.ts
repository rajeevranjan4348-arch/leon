export interface ApiUsageRecord {
  id: string;
  timestamp: number; // Date.now()
  provider: 'gemini' | 'nvidia' | 'minimax' | 'openai' | 'other';
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number; // in USD
  latencyMs: number;
  status: 'success' | 'error' | 'rate_limited';
}

export interface ProviderUsageSummary {
  provider: string;
  displayName: string;
  tokens: number;
  requests: number;
  cost: number;
  avgLatency: number;
  color: string;
}

export interface DailyUsageData {
  date: string; // e.g., 'Aug 21'
  fullDate: string; // '2026-08-21'
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  geminiTokens: number;
  nvidiaTokens: number;
  minimaxTokens: number;
  openaiTokens: number;
  requests: number;
  cost: number;
}

const STORAGE_KEY = 'rishi_api_usage_records_v1';

// Estimated cost rates per 1k tokens
const COST_RATES: Record<string, { prompt: number; completion: number }> = {
  gemini: { prompt: 0.0001, completion: 0.0004 },
  nvidia: { prompt: 0.00015, completion: 0.0006 },
  minimax: { prompt: 0.0002, completion: 0.0008 },
  openai: { prompt: 0.0015, completion: 0.002 },
  other: { prompt: 0.0001, completion: 0.0003 },
};

// Seed realistic sample data spanning the past 7 days if no records exist
function generateSampleRecords(): ApiUsageRecord[] {
  const records: ApiUsageRecord[] = [];
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const modelsByProvider = {
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
    nvidia: ['meta/llama-3.3-70b-instruct', 'nvidia/llama-3.1-nemotron-70b', 'mistralai/mixtral-8x22b-instruct'],
    minimax: ['minimax-m2.5', 'minimax-text-01', 'minimax-speech-01'],
    openai: ['gpt-4o', 'gpt-4o-mini'],
  };

  const providers: ('gemini' | 'nvidia' | 'minimax' | 'openai')[] = ['gemini', 'nvidia', 'minimax', 'openai'];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayTimestamp = now - dayOffset * DAY_MS;
    // Generate 8-15 calls per day
    const callsCount = Math.floor(Math.random() * 8) + 10;

    for (let c = 0; c < callsCount; c++) {
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const models = modelsByProvider[provider];
      const model = models[Math.floor(Math.random() * models.length)];

      const promptTokens = Math.floor(Math.random() * 1200) + 150;
      const completionTokens = Math.floor(Math.random() * 2500) + 300;
      const totalTokens = promptTokens + completionTokens;

      const rate = COST_RATES[provider] || COST_RATES.other;
      const estimatedCost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;
      const latencyMs = Math.floor(Math.random() * 350) + 80;

      // Random hour during that day
      const callTime = dayTimestamp - Math.floor(Math.random() * 20 * 3600 * 1000);

      records.push({
        id: `rec_${callTime}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: callTime,
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: Number(estimatedCost.toFixed(6)),
        latencyMs,
        status: Math.random() > 0.05 ? 'success' : 'error',
      });
    }
  }

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

// In-memory store
let memoryRecords: ApiUsageRecord[] | null = null;
const listeners = new Set<() => void>();

export function getStoredApiUsage(): ApiUsageRecord[] {
  if (memoryRecords !== null) {
    return memoryRecords;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryRecords = parsed;
        return memoryRecords!;
      }
    }
  } catch (e) {
    console.warn('Failed to parse API usage records from localStorage:', e);
  }

  // Seed sample data
  memoryRecords = generateSampleRecords();
  saveApiUsageToStorage(memoryRecords);
  return memoryRecords;
}

function saveApiUsageToStorage(records: ApiUsageRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save API usage to localStorage:', e);
  }
}

export function recordApiUsage(
  provider: 'gemini' | 'nvidia' | 'minimax' | 'openai' | 'other',
  model: string,
  promptTokens: number,
  completionTokens: number,
  latencyMs: number = 150,
  status: 'success' | 'error' | 'rate_limited' = 'success'
): ApiUsageRecord {
  const current = getStoredApiUsage();
  const rate = COST_RATES[provider] || COST_RATES.other;
  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = Number(
    ((promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion).toFixed(6)
  );

  const newRecord: ApiUsageRecord = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    provider,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCost,
    latencyMs,
    status,
  };

  memoryRecords = [newRecord, ...current].slice(0, 1000); // Keep max 1000 records
  saveApiUsageToStorage(memoryRecords);
  notifyListeners();
  return newRecord;
}

export function clearApiUsageHistory() {
  memoryRecords = [];
  saveApiUsageToStorage([]);
  notifyListeners();
}

export function resetApiUsageToSample() {
  memoryRecords = generateSampleRecords();
  saveApiUsageToStorage(memoryRecords);
  notifyListeners();
}

export function subscribeApiUsage(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export function getDailyUsageData(daysRange: number = 7): DailyUsageData[] {
  const records = getStoredApiUsage();
  const now = new Date();
  const result: Record<string, DailyUsageData> = {};

  // Build key array for last `daysRange` days
  for (let i = daysRange - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const fullDate = d.toISOString().split('T')[0];
    const monthShort = d.toLocaleString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    const dateLabel = `${monthShort} ${dayNum}`;

    result[fullDate] = {
      date: dateLabel,
      fullDate,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      geminiTokens: 0,
      nvidiaTokens: 0,
      minimaxTokens: 0,
      openaiTokens: 0,
      requests: 0,
      cost: 0,
    };
  }

  const cutoff = Date.now() - daysRange * 24 * 60 * 60 * 1000;

  records.forEach((rec) => {
    if (rec.timestamp >= cutoff) {
      const recDate = new Date(rec.timestamp).toISOString().split('T')[0];
      if (result[recDate]) {
        result[recDate].promptTokens += rec.promptTokens;
        result[recDate].completionTokens += rec.completionTokens;
        result[recDate].totalTokens += rec.totalTokens;
        result[recDate].requests += 1;
        result[recDate].cost = Number((result[recDate].cost + rec.estimatedCost).toFixed(4));

        if (rec.provider === 'gemini') result[recDate].geminiTokens += rec.totalTokens;
        else if (rec.provider === 'nvidia') result[recDate].nvidiaTokens += rec.totalTokens;
        else if (rec.provider === 'minimax') result[recDate].minimaxTokens += rec.totalTokens;
        else if (rec.provider === 'openai') result[recDate].openaiTokens += rec.totalTokens;
      }
    }
  });

  return Object.values(result);
}

export function getProviderSummary(): ProviderUsageSummary[] {
  const records = getStoredApiUsage();
  const stats: Record<string, { tokens: number; requests: number; cost: number; totalLatency: number }> = {
    gemini: { tokens: 0, requests: 0, cost: 0, totalLatency: 0 },
    nvidia: { tokens: 0, requests: 0, cost: 0, totalLatency: 0 },
    minimax: { tokens: 0, requests: 0, cost: 0, totalLatency: 0 },
    openai: { tokens: 0, requests: 0, cost: 0, totalLatency: 0 },
  };

  records.forEach((rec) => {
    const key = stats[rec.provider] ? rec.provider : 'gemini';
    stats[key].tokens += rec.totalTokens;
    stats[key].requests += 1;
    stats[key].cost += rec.estimatedCost;
    stats[key].totalLatency += rec.latencyMs;
  });

  const providerMeta: Record<string, { displayName: string; color: string }> = {
    gemini: { displayName: 'Google Gemini', color: '#3b82f6' }, // Blue
    nvidia: { displayName: 'NVIDIA NIM', color: '#10b981' }, // Green
    minimax: { displayName: 'MiniMax AI', color: '#a855f7' }, // Purple
    openai: { displayName: 'OpenAI', color: '#f59e0b' }, // Amber
  };

  return Object.keys(stats).map((key) => {
    const item = stats[key];
    const meta = providerMeta[key] || { displayName: key, color: '#6b7280' };
    return {
      provider: key,
      displayName: meta.displayName,
      tokens: item.tokens,
      requests: item.requests,
      cost: Number(item.cost.toFixed(4)),
      avgLatency: item.requests > 0 ? Math.round(item.totalLatency / item.requests) : 0,
      color: meta.color,
    };
  });
}
