import { getAccessToken } from '../firebase';

export interface KeepNoteItem {
  text: string;
  isChecked?: boolean;
}

export interface KeepNote {
  id?: string;
  title: string;
  body?: string;
  listItems?: KeepNoteItem[];
  createTime?: string;
  updateTime?: string;
  color?: string;
}

/**
 * Fetch notes from Google Keep (or cloud notes storage)
 */
export async function getKeepNotes(): Promise<KeepNote[]> {
  const token = getAccessToken();
  const localNotes: KeepNote[] = JSON.parse(localStorage.getItem('rishi_google_keep_notes') || '[]');

  if (!token) {
    return localNotes;
  }

  try {
    const res = await fetch('https://keep.googleapis.com/v1/notes', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const apiNotes: KeepNote[] = (data.notes || []).map((n: any) => ({
        id: n.name,
        title: n.title || 'Untitled Note',
        body: n.body?.text?.text || '',
        listItems: n.body?.list?.listItems?.map((item: any) => ({
          text: item.text?.text || '',
          isChecked: item.checked || false,
        })),
        createTime: n.createTime,
        updateTime: n.updateTime,
      }));

      // Combine API notes with local drafts
      const existingIds = new Set(apiNotes.map(n => n.id));
      const combined = [...apiNotes, ...localNotes.filter(n => !existingIds.has(n.id))];
      return combined;
    }
  } catch (error: any) {
    console.warn('Google Keep API call:', error?.message);
  }

  return localNotes;
}

/**
 * Create a new note in Google Keep
 */
export async function createKeepNote(note: { title: string; text: string }): Promise<any> {
  const token = getAccessToken();

  const payload = {
    title: note.title,
    body: {
      text: {
        text: note.text,
      },
    },
  };

  // 1. If OAuth token is available, attempt the Google Keep API call
  if (token) {
    try {
      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Keep direct API sync failed, saving locally:', e);
    }
  }

  // 2. Persist locally to Keep notes storage
  try {
    const existing = JSON.parse(localStorage.getItem('rishi_google_keep_notes') || '[]');
    const newNote: KeepNote = {
      id: `local_keep_${Date.now()}`,
      title: note.title,
      body: note.text,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    };
    existing.unshift(newNote);
    localStorage.setItem('rishi_google_keep_notes', JSON.stringify(existing.slice(0, 50)));
    return newNote;
  } catch (err) {
    console.error('Failed to save keep note to local storage:', err);
    throw new Error('Failed to save note');
  }
}
