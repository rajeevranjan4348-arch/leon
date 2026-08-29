export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'file' | 'gif' | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: Array<{ id: string; name: string }>;
}

export interface CommMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId?: string;
  participantIds?: string[];
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: string;
  mediaMimeType?: string;
  mediaDuration?: number;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
    type: MessageType;
  };
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  status: MessageStatus;
  timestamp: number;
  isEdited?: boolean;
  isPinned?: boolean;
  isDeletedForEveryone?: boolean;
}

export interface CommUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: number;
  isAI?: boolean;
  phoneNumber?: string;
  role?: string;
}

export interface CommConversation {
  id: string;
  type: 'direct' | 'group' | 'ai';
  name: string;
  avatar?: string;
  participantIds: string[];
  participants: CommUser[];
  lastMessage?: CommMessage;
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export type CallType = 'voice' | 'video';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'rejected'
  | 'busy'
  | 'missed';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'reconnecting';

export interface CallSession {
  id: string;
  conversationId?: string;
  caller: CommUser;
  receiver: CommUser;
  type: CallType;
  status: CallStatus;
  startTime?: number;
  duration: number; // in seconds
  isMicMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  selectedAudioInputId?: string;
  selectedAudioOutputId?: string;
  selectedVideoInputId?: string;
  cameraFacing: 'user' | 'environment';
  networkQuality: NetworkQuality;
  isAIVisionActive?: boolean;
  aiVisionSummary?: string;
  isReconnecting?: boolean;
}

export interface CallHistoryItem {
  id: string;
  callId: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
  type: CallType;
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  duration: number;
  status: CallStatus;
}
