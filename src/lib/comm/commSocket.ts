import { CommMessage, CommUser } from '@/types/comm';

export type CommEventType =
  | 'registered'
  | 'user-presence'
  | 'online-users-list'
  | 'receive-message'
  | 'message-ack'
  | 'message-status-update'
  | 'message-delivered'
  | 'message-read'
  | 'message-reaction'
  | 'message-edit'
  | 'message-delete'
  | 'typing-indicator'
  | 'incoming-call'
  | 'call-accepted'
  | 'call-rejected'
  | 'call-ended'
  | 'webrtc-signal'
  | 'connection-status';

export type CommEventListener = (data: any) => void;

class CommSocketClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<CommEventListener>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private currentUser: CommUser | null = null;
  private isConnecting = false;
  private queuedMessages: any[] = [];
  public isConnected = false;

  public init(user: CommUser) {
    this.currentUser = user;
    this.connect();
  }

  public updateUser(user: CommUser) {
    this.currentUser = user;
    if (this.isConnected) {
      this.send('register', {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
      });
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    this.emit('connection-status', { status: 'connecting' });

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/comm`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connection-status', { status: 'connected' });

        // Register user
        if (this.currentUser) {
          this.send('register', {
            userId: this.currentUser.id,
            userName: this.currentUser.name,
            userAvatar: this.currentUser.avatar,
          });
        }

        // Flush offline queue
        while (this.queuedMessages.length > 0) {
          const item = this.queuedMessages.shift();
          this.send(item.type, item.data);
        }

        // Heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg.data || msg);
          }
        } catch (e) {
          console.warn('Comm WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('connection-status', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('Comm WS error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('Failed to establish Comm WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached. Waiting for next user action.');
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', {});
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type, data }));
        return true;
      } catch (e) {
        console.warn('Failed to send WS message:', e);
      }
    }

    // Queue if temporary drop
    if (type === 'send-message') {
      this.queuedMessages.push({ type, data });
    }
    return false;
  }

  public on(event: CommEventType | string, listener: CommEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  public off(event: CommEventType | string, listener: CommEventListener) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  public emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  }

  // Helper APIs for messaging
  public sendMessage(message: CommMessage) {
    return this.send('send-message', { message });
  }

  public sendTyping(conversationId: string, targetUserId?: string, participantIds?: string[], isTyping = true) {
    if (!this.currentUser) return;
    this.send('typing-indicator', {
      conversationId,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      targetUserId,
      participantIds,
      isTyping,
    });
  }

  public markDelivered(messageId: string, senderId: string) {
    this.send('message-delivered', { messageId, senderId });
  }

  public markRead(messageId: string, senderId: string, conversationId: string) {
    this.send('message-read', { messageId, senderId, conversationId });
  }

  public reactToMessage(conversationId: string, messageId: string, emoji: string) {
    if (!this.currentUser) return;
    this.send('message-reaction', {
      conversationId,
      messageId,
      emoji,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
    });
  }

  public editMessage(conversationId: string, messageId: string, newContent: string) {
    this.send('message-edit', {
      conversationId,
      messageId,
      newContent,
    });
  }

  public deleteMessage(conversationId: string, messageId: string, forEveryone = true) {
    this.send('message-delete', {
      conversationId,
      messageId,
      forEveryone,
    });
  }

  // WebRTC Call APIs
  public initiateCall(callId: string, caller: CommUser, receiver: CommUser, callType: 'voice' | 'video') {
    return this.send('webrtc-call-request', {
      callId,
      caller,
      receiver,
      callType,
    });
  }

  public acceptCall(callId: string, targetUserId: string) {
    return this.send('webrtc-call-accept', {
      callId,
      targetUserId,
    });
  }

  public rejectCall(callId: string, targetUserId: string, reason?: string) {
    return this.send('webrtc-call-reject', {
      callId,
      targetUserId,
      reason,
    });
  }

  public hangupCall(callId: string, targetUserId?: string) {
    return this.send('webrtc-call-hangup', {
      callId,
      targetUserId,
    });
  }

  public sendSignal(targetUserId: string, signal: any) {
    return this.send('webrtc-signal', {
      targetUserId,
      signal,
    });
  }
}

export const commSocket = new CommSocketClient();
