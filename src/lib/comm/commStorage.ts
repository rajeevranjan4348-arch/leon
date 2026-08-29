import { CommConversation, CommMessage, CommUser, CallHistoryItem } from '@/types/comm';

const STORAGE_KEYS = {
  CURRENT_USER: 'rishi_comm_current_user',
  CONVERSATIONS: 'rishi_comm_conversations',
  MESSAGES: 'rishi_comm_messages',
  CONTACTS: 'rishi_comm_contacts',
  CALL_HISTORY: 'rishi_comm_call_history',
  SETTINGS: 'rishi_comm_settings',
};

// Default AI Contact and Initial Demo Contacts
export const DEFAULT_AI_USER: CommUser = {
  id: 'rishi-ai',
  name: 'Rishi AI Assistant',
  email: 'ai@rishi.app',
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
  statusMessage: 'Always here to chat, call, or analyze camera view in real time 🤖',
  isOnline: true,
  lastSeen: Date.now(),
  isAI: true,
  role: 'AI System',
};

export const INITIAL_CONTACTS: CommUser[] = [
  DEFAULT_AI_USER,
  {
    id: 'user-priya',
    name: 'Priya Sharma',
    email: 'priya.s@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    statusMessage: 'Working on product design 🎨',
    isOnline: true,
    lastSeen: Date.now(),
    role: 'UI Designer',
  },
  {
    id: 'user-alex',
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    statusMessage: 'Available for video syncing',
    isOnline: true,
    lastSeen: Date.now() - 1000 * 60 * 12,
    role: 'Tech Lead',
  },
  {
    id: 'user-sarah',
    name: 'Sarah Connor',
    email: 'sarah.c@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    statusMessage: 'In a meeting until 4 PM',
    isOnline: false,
    lastSeen: Date.now() - 1000 * 60 * 120,
    role: 'Product Manager',
  },
];

export function getStoredCurrentUser(): CommUser {
  if (typeof window === 'undefined') {
    return {
      id: 'my-user-id',
      name: 'You (Rajeev)',
      email: 'rajeev@example.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      statusMessage: 'Online & ready to connect',
      isOnline: true,
      lastSeen: Date.now(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load current user:', e);
  }

  const defaultUser: CommUser = {
    id: 'my-user-id',
    name: 'Rajeev',
    email: 'rajeev7678672366@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    statusMessage: 'Using Rishi Real-Time AI Hub 🚀',
    isOnline: true,
    lastSeen: Date.now(),
  };
  saveStoredCurrentUser(defaultUser);
  return defaultUser;
}

export function saveStoredCurrentUser(user: CommUser) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save current user:', e);
  }
}

export function getStoredContacts(): CommUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (raw) {
      const parsed: CommUser[] = JSON.parse(raw);
      // Ensure AI contact is always present
      if (!parsed.some(c => c.id === 'rishi-ai')) {
        parsed.unshift(DEFAULT_AI_USER);
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load contacts:', e);
  }
  return INITIAL_CONTACTS;
}

export function saveStoredContacts(contacts: CommUser[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  } catch (e) {
    console.warn('Failed to save contacts:', e);
  }
}

export function getStoredConversations(): CommConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load conversations:', e);
  }

  // Create Initial default conversations
  const initialConvs: CommConversation[] = [
    {
      id: 'conv-ai-assistant',
      type: 'ai',
      name: 'Rishi AI Assistant',
      avatar: DEFAULT_AI_USER.avatar,
      participantIds: ['my-user-id', 'rishi-ai'],
      participants: [DEFAULT_AI_USER],
      unreadCount: 0,
      isPinned: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      updatedAt: Date.now() - 1000 * 60 * 5,
      lastMessage: {
        id: 'msg-ai-welcome',
        conversationId: 'conv-ai-assistant',
        senderId: 'rishi-ai',
        senderName: 'Rishi AI Assistant',
        content: 'Hello! I am ready for real-time messaging, two-way voice calls, or live video calls with real-time AI vision.',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 5,
      },
    },
    {
      id: 'conv-priya-direct',
      type: 'direct',
      name: 'Priya Sharma',
      avatar: INITIAL_CONTACTS[1].avatar,
      participantIds: ['my-user-id', 'user-priya'],
      participants: [INITIAL_CONTACTS[1]],
      unreadCount: 1,
      isPinned: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
      updatedAt: Date.now() - 1000 * 60 * 30,
      lastMessage: {
        id: 'msg-priya-1',
        conversationId: 'conv-priya-direct',
        senderId: 'user-priya',
        senderName: 'Priya Sharma',
        content: 'Hey! The new call and messaging design looks super crisp! Let me know if you want to test a quick video call.',
        type: 'text',
        status: 'delivered',
        timestamp: Date.now() - 1000 * 60 * 30,
      },
    },
    {
      id: 'conv-team-group',
      type: 'group',
      name: '🚀 AI Product Engineering',
      avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80',
      participantIds: ['my-user-id', 'user-priya', 'user-alex', 'user-sarah', 'rishi-ai'],
      participants: INITIAL_CONTACTS,
      unreadCount: 0,
      isPinned: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      updatedAt: Date.now() - 1000 * 60 * 60 * 2,
      lastMessage: {
        id: 'msg-group-1',
        conversationId: 'conv-team-group',
        senderId: 'user-alex',
        senderName: 'Alex Chen',
        content: 'WebRTC audio/video call signaling and real-time message sync are up and running perfectly!',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
      },
    },
  ];

  saveStoredConversations(initialConvs);
  return initialConvs;
}

export function saveStoredConversations(conversations: CommConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch (e) {
    console.warn('Failed to save conversations:', e);
  }
}

export function getStoredMessages(conversationId: string): CommMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to load messages for ${conversationId}:`, e);
  }

  // Initial seed messages for demo conversations
  if (conversationId === 'conv-ai-assistant') {
    const msgs: CommMessage[] = [
      {
        id: 'msg-ai-1',
        conversationId: 'conv-ai-assistant',
        senderId: 'rishi-ai',
        senderName: 'Rishi AI Assistant',
        content: 'Welcome to real-time communications! You can text me, send photos/videos/PDFs, start an HD voice call, or start a video call with live AI Vision.',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: 'msg-ai-2',
        conversationId: 'conv-ai-assistant',
        senderId: 'my-user-id',
        senderName: 'Rajeev',
        content: 'Thanks Rishi! Can you analyze images during live video calls?',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 45,
      },
      {
        id: 'msg-ai-3',
        conversationId: 'conv-ai-assistant',
        senderId: 'rishi-ai',
        senderName: 'Rishi AI Assistant',
        content: 'Yes, absolutely! When you click the 🎥 Video Call button, toggle **AI Vision Mode**. I will analyze your camera feed in real time and converse naturally.',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 5,
        reactions: {
          '🔥': ['my-user-id'],
        },
      },
    ];
    saveStoredMessages(conversationId, msgs);
    return msgs;
  }

  if (conversationId === 'conv-priya-direct') {
    const msgs: CommMessage[] = [
      {
        id: 'msg-p-1',
        conversationId: 'conv-priya-direct',
        senderId: 'my-user-id',
        senderName: 'Rajeev',
        content: 'Hi Priya! How is the new dashboard mockup coming along?',
        type: 'text',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
      },
      {
        id: 'msg-p-2',
        conversationId: 'conv-priya-direct',
        senderId: 'user-priya',
        senderName: 'Priya Sharma',
        content: 'Here is the latest preview design for the call controls and bottom sheet:',
        type: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        mediaName: 'dashboard_ui_preview.png',
        mediaSize: '1.4 MB',
        status: 'read',
        timestamp: Date.now() - 1000 * 60 * 90,
      },
      {
        id: 'msg-p-3',
        conversationId: 'conv-priya-direct',
        senderId: 'user-priya',
        senderName: 'Priya Sharma',
        content: 'Hey! The new call and messaging design looks super crisp! Let me know if you want to test a quick video call.',
        type: 'text',
        status: 'delivered',
        timestamp: Date.now() - 1000 * 60 * 30,
        reactions: {
          '👍': ['my-user-id'],
          '❤️': ['user-priya'],
        },
      },
    ];
    saveStoredMessages(conversationId, msgs);
    return msgs;
  }

  return [];
}

export function saveStoredMessages(conversationId: string, messages: CommMessage[]) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${conversationId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn(`Failed to save messages for ${conversationId}:`, e);
  }
}

export function getStoredCallHistory(): CallHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CALL_HISTORY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load call history:', e);
  }

  const initialHistory: CallHistoryItem[] = [
    {
      id: 'call-hist-1',
      callId: 'call-101',
      peerId: 'rishi-ai',
      peerName: 'Rishi AI Assistant',
      peerAvatar: DEFAULT_AI_USER.avatar,
      type: 'voice',
      direction: 'outgoing',
      timestamp: Date.now() - 1000 * 60 * 50,
      duration: 184, // 3m 4s
      status: 'ended',
    },
    {
      id: 'call-hist-2',
      callId: 'call-102',
      peerId: 'user-priya',
      peerName: 'Priya Sharma',
      peerAvatar: INITIAL_CONTACTS[1].avatar,
      type: 'video',
      direction: 'incoming',
      timestamp: Date.now() - 1000 * 60 * 60 * 4,
      duration: 412, // 6m 52s
      status: 'ended',
    },
    {
      id: 'call-hist-3',
      callId: 'call-103',
      peerId: 'user-alex',
      peerName: 'Alex Chen',
      peerAvatar: INITIAL_CONTACTS[2].avatar,
      type: 'voice',
      direction: 'missed',
      timestamp: Date.now() - 1000 * 60 * 60 * 22,
      duration: 0,
      status: 'missed',
    },
  ];

  saveStoredCallHistory(initialHistory);
  return initialHistory;
}

export function saveStoredCallHistory(history: CallHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CALL_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save call history:', e);
  }
}
