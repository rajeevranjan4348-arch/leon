export interface VoiceHistoryItem {
  id: string;
  text: string;
  timestamp: string;
  isVoice: boolean;
  role?: 'user' | 'assistant' | 'system';
  audioUrl?: string;
  duration?: number;
  voicePersona?: string;
  sessionId?: string;
  audioBlob?: Blob;
}

const VOICE_HISTORY_KEY = 'voice_history';
const DB_NAME = 'ScienceAppDB';
const DB_VERSION = 1;
const STORE_VOICE = 'voice_history';

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VOICE)) {
        db.createObjectStore(STORE_VOICE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVoiceEntry(entry: { id: string; timestamp: number | string; transcript: string; audioBlob?: Blob; role?: 'user' | 'assistant' }): Promise<void> {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_VOICE, 'readwrite');
      tx.objectStore(STORE_VOICE).put({
        id: entry.id,
        timestamp: typeof entry.timestamp === 'number' ? entry.timestamp : new Date(entry.timestamp).getTime(),
        transcript: entry.transcript,
        text: entry.transcript,
        role: entry.role || 'user',
        audioBlob: entry.audioBlob,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving voice entry to IndexedDB:', err);
  }
}

export async function getVoiceEntries(): Promise<Array<{ id: string; timestamp: number; transcript: string; audioBlob?: Blob; role?: 'user' | 'assistant' }>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VOICE, 'readonly');
      const req = tx.objectStore(STORE_VOICE).getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).map((item: any) => ({
          id: item.id,
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : new Date(item.timestamp).getTime(),
          transcript: item.transcript || item.text || '',
          audioBlob: item.audioBlob,
          role: item.role || 'user',
        })).sort((a: any, b: any) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error fetching IndexedDB voice entries:', err);
    return [];
  }
}

export function getVoiceHistory(): VoiceHistoryItem[] {
  try {
    const raw = localStorage.getItem(VOICE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          ...item,
          role: item.role || (item.text?.startsWith('AI: ') ? 'assistant' : 'user'),
          text: item.text?.replace(/^(AI:|User:)\s*/, '') || item.text || '',
        }));
      }
    }
    const oldRaw = localStorage.getItem('voice_chat_history');
    if (oldRaw) {
      const oldItems = JSON.parse(oldRaw);
      return oldItems.map((item: any) => ({
        id: item.id || `vh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: item.text?.replace(/^(AI:|User:)\s*/, '') || item.text || '',
        timestamp: item.timestamp || new Date().toISOString(),
        isVoice: true,
        role: item.role || (item.text?.startsWith('AI: ') ? 'assistant' : 'user'),
      }));
    }
    return [];
  } catch (e) {
    console.error('Error reading voice_history', e);
    return [];
  }
}

export function saveToVoiceHistory(input: string | Partial<VoiceHistoryItem>): VoiceHistoryItem[] {
  let rawText = typeof input === 'string' ? input.trim() : (input.text || '').trim();
  if (!rawText) return getVoiceHistory();

  let role: 'user' | 'assistant' | 'system' = typeof input === 'object' && input.role ? input.role : 'user';
  let cleanedText = rawText;

  if (typeof input === 'string') {
    if (rawText.startsWith('AI: ')) {
      role = 'assistant';
      cleanedText = rawText.replace(/^AI:\s*/, '').trim();
    } else if (rawText.startsWith('User: ')) {
      role = 'user';
      cleanedText = rawText.replace(/^User:\s*/, '').trim();
    }
  }

  try {
    const history = getVoiceHistory();
    // Prevent duplicate consecutive entries
    if (history.length > 0 && history[0].text.toLowerCase() === cleanedText.toLowerCase() && history[0].role === role) {
      return history;
    }

    const newItem: VoiceHistoryItem = {
      id: typeof input === 'object' && input.id ? input.id : `vh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: cleanedText,
      timestamp: typeof input === 'object' && input.timestamp ? input.timestamp : new Date().toISOString(),
      isVoice: true,
      role,
      audioUrl: typeof input === 'object' ? input.audioUrl : undefined,
      duration: typeof input === 'object' ? input.duration : undefined,
      voicePersona: typeof input === 'object' ? input.voicePersona : undefined,
      sessionId: typeof input === 'object' ? input.sessionId : undefined,
    };

    const updated = [newItem, ...history].slice(0, 300);
    localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(updated));
    localStorage.setItem('voice_chat_history', JSON.stringify(updated));

    // Also persist to IndexedDB
    saveVoiceEntry({
      id: newItem.id,
      timestamp: newItem.timestamp,
      transcript: newItem.text,
      role: newItem.role === 'assistant' ? 'assistant' : 'user',
      audioBlob: typeof input === 'object' && input.audioBlob ? input.audioBlob : undefined
    });

    syncVoiceToThreadHistory(role === 'assistant' ? `AI: ${cleanedText}` : cleanedText);

    window.dispatchEvent(new CustomEvent('voice_history_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Error saving to voice_history', e);
    return getVoiceHistory();
  }
}

function syncVoiceToThreadHistory(text: string) {
  try {
    const STORAGE_KEY_CONVERSATIONS = 'ai_conversations';
    const LEGACY_STORAGE_THREADS = 'perplexity_local_threads';
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    let conversations: any[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(conversations)) conversations = [];

    const nowIso = new Date().toISOString();

    if (text.startsWith('AI: ')) {
      const aiContent = text.replace(/^AI:\s*/, '').trim();
      if (!aiContent) return;

      const latestVoiceConv = conversations.find(c =>
        Array.isArray(c.tags) && c.tags.includes('voice-initiated')
      );

      if (latestVoiceConv) {
        if (!latestVoiceConv.messages) latestVoiceConv.messages = [];
        latestVoiceConv.messages.push({
          id: `msg_a_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          role: 'assistant',
          content: aiContent,
          createdAt: nowIso,
        });
        latestVoiceConv.updatedAt = nowIso;
        latestVoiceConv.preview = aiContent;
        latestVoiceConv.totalMessages = latestVoiceConv.messages.length;
      }
    } else {
      const userContent = text.trim();
      if (!userContent) return;

      const newConv = {
        id: `voice_thread_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: `🎙️ ${userContent}`,
        preview: userContent,
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [{
          id: `msg_u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          role: 'user',
          content: userContent,
          createdAt: nowIso,
        }],
        totalMessages: 1,
        tags: ['voice', 'voice-initiated'],
        isSearch: false,
        hasSearchContext: false,
      };

      conversations = [newConv, ...conversations];
    }

    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));

    const flatThreads = conversations.map(c => {
      const { messages, ...rest } = c;
      return { ...rest, totalMessages: messages?.length || c.totalMessages || 0 };
    });
    localStorage.setItem(LEGACY_STORAGE_THREADS, JSON.stringify(flatThreads));

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('conversations_updated'));
  } catch (e) {
    console.warn('Error syncing voice query to thread history:', e);
  }
}

export function deleteVoiceHistoryItem(id: string): VoiceHistoryItem[] {
  try {
    const history = getVoiceHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(updated));
    localStorage.setItem('voice_chat_history', JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('voice_history_updated', { detail: updated }));
    return updated;
  } catch (e) {
    console.error('Error deleting voice history item', e);
    return getVoiceHistory();
  }
}

export function clearVoiceHistory(): VoiceHistoryItem[] {
  try {
    localStorage.removeItem(VOICE_HISTORY_KEY);
    localStorage.removeItem('voice_chat_history');

    window.dispatchEvent(new CustomEvent('voice_history_updated', { detail: [] }));
    return [];
  } catch (e) {
    console.error('Error clearing voice history', e);
    return [];
  }
}
