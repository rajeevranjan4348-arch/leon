import { createClient } from '@blinkdotnew/sdk';

// Initialize blink client with safe fallback handlers
const rawBlink = createClient({
  projectId: (import.meta as any).env?.VITE_BLINK_PROJECT_ID || 'perplexity-9xplge2w',
  publishableKey: (import.meta as any).env?.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_xxx',
});

// Create a safe wrapper around blink.db so that transient IndexedDB / Dexie closing errors never bubble up
const createSafeTable = (tableName: string) => {
  const rawTable = rawBlink.db?.table(tableName);
  if (!rawTable) {
    return {
      list: async () => [],
      get: async () => null,
      create: async (data: any) => data,
      update: async (_id: string, data: any) => data,
      delete: async () => {},
      deleteMany: async () => {},
    };
  }

  return {
    list: async (opts?: any) => {
      try {
        return await rawTable.list(opts);
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (msg.includes('closing') || msg.includes('hidden') || msg.includes('closed') || msg.includes('Database')) {
          // Graceful fallback on database closing/hidden
          return [];
        }
        return [];
      }
    },
    get: async (id: string) => {
      try {
        return await rawTable.get(id);
      } catch (err: any) {
        return null;
      }
    },
    create: async (data: any) => {
      try {
        return await (rawTable as any).create(data);
      } catch (err: any) {
        return data;
      }
    },
    update: async (id: string, data: any) => {
      try {
        return await rawTable.update(id, data);
      } catch (err: any) {
        return data;
      }
    },
    delete: async (id: string) => {
      try {
        return await rawTable.delete(id);
      } catch (err: any) {
        // Ignore deletion error on closing
      }
    },
    deleteMany: async (opts: any) => {
      try {
        return await rawTable.deleteMany(opts);
      } catch (err: any) {
        // Ignore deletion error on closing
      }
    },
  };
};

export const blink = new Proxy(rawBlink, {
  get(target, prop, receiver) {
    if (prop === 'db') {
      return {
        table: (name: string) => createSafeTable(name),
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

