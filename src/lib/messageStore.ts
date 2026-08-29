export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ title: string; url: string; snippet: string }>;
  images?: string[];
  timestamp: number;
}

let messages: Message[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    content: 'Welcome to the Science Research Engine. Ask complex scientific questions, explore grounded citations, view visual models, or initiate a live multimodal voice session.',
    timestamp: Date.now(),
    citations: [
      { title: 'Nature Scientific Reports', url: 'https://nature.com', snippet: 'Peer-reviewed open access scientific discoveries and methodology.' }
    ]
  }
];

const listeners = new Set<() => void>();

export const MessageStore = {
  getSnapshot: () => messages,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    };
    messages = [...messages, newMessage];
    listeners.forEach((l) => l());
    return newMessage;
  },
  setMessages: (newMsgs: Message[]) => {
    messages = newMsgs;
    listeners.forEach((l) => l());
  },
  clear: () => {
    messages = [];
    listeners.forEach((l) => l());
  }
};
