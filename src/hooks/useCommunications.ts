import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CommConversation,
  CommMessage,
  CommUser,
  CallSession,
  CallHistoryItem,
  MessageType,
  CallType,
  NetworkQuality,
} from '@/types/comm';
import {
  getStoredCurrentUser,
  saveStoredCurrentUser,
  getStoredConversations,
  saveStoredConversations,
  getStoredMessages,
  saveStoredMessages,
  getStoredContacts,
  saveStoredContacts,
  getStoredCallHistory,
  saveStoredCallHistory,
  DEFAULT_AI_USER,
} from '@/lib/comm/commStorage';
import { commSocket } from '@/lib/comm/commSocket';
import { webrtcManager } from '@/lib/comm/webrtcManager';
import {
  startIncomingRingtone,
  startOutgoingDialTone,
  stopRingtone,
  playCallConnectedSound,
  playCallEndedSound,
  playMessageNotificationSound,
} from '@/lib/comm/ringtoneService';
import { analyzeLiveFrame } from '@/lib/comm/aiVisionService';
import { toast } from 'sonner';

export function useCommunications() {
  // 1. Current User
  const [currentUser, setCurrentUser] = useState<CommUser>(getStoredCurrentUser);

  // 2. Conversations & Contacts
  const [conversations, setConversations] = useState<CommConversation[]>(getStoredConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const list = getStoredConversations();
    return list[0]?.id || null;
  });
  const [contacts, setContacts] = useState<CommUser[]>(getStoredContacts);

  // 3. Active Conversation Messages
  const [messages, setMessages] = useState<CommMessage[]>([]);
  const [activeTypingUsers, setActiveTypingUsers] = useState<Record<string, { userId: string; userName: string; timeout: any }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Call Session State
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>(getStoredCallHistory);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Refs for timers and current active references
  const callTimerRef = useRef<any>(null);
  const aiVisionIntervalRef = useRef<any>(null);
  const activeConvIdRef = useRef<string | null>(activeConversationId);
  activeConvIdRef.current = activeConversationId;
  const callSessionRef = useRef<CallSession | null>(callSession);
  callSessionRef.current = callSession;
  const messagesRef = useRef<CommMessage[]>(messages);
  messagesRef.current = messages;

  // Sync current user with WebSocket
  useEffect(() => {
    commSocket.init(currentUser);
  }, [currentUser]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      const loaded = getStoredMessages(activeConversationId);
      setMessages(loaded);

      // Clear unread count for this conversation
      setConversations((prev) => {
        const updated = prev.map((c) => (c.id === activeConversationId ? { ...c, unreadCount: 0 } : c));
        saveStoredConversations(updated);
        return updated;
      });
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Handle incoming WebSocket messages and WebRTC signaling
  useEffect(() => {
    const unsubMsg = commSocket.on('receive-message', ({ message }: { message: CommMessage }) => {
      // If it belongs to active conversation, add to state
      if (activeConvIdRef.current === message.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const next = [...prev, message];
          saveStoredMessages(message.conversationId, next);
          return next;
        });
        // Mark as read
        commSocket.markRead(message.id, message.senderId, message.conversationId);
      } else {
        // Save to storage
        const currentMsgs = getStoredMessages(message.conversationId);
        if (!currentMsgs.some((m) => m.id === message.id)) {
          saveStoredMessages(message.conversationId, [...currentMsgs, message]);
        }
      }

      // Update conversation last message & unread count
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === message.conversationId);
        let updated: CommConversation[];
        if (exists) {
          updated = prev.map((c) => {
            if (c.id === message.conversationId) {
              const isCurrent = activeConvIdRef.current === message.conversationId;
              return {
                ...c,
                lastMessage: message,
                unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1,
                updatedAt: Date.now(),
              };
            }
            return c;
          });
        } else {
          // New conversation
          const newConv: CommConversation = {
            id: message.conversationId,
            type: message.participantIds && message.participantIds.length > 2 ? 'group' : 'direct',
            name: message.senderName,
            avatar: message.senderAvatar,
            participantIds: message.participantIds || [currentUser.id, message.senderId],
            participants: [
              currentUser,
              {
                id: message.senderId,
                name: message.senderName,
                avatar: message.senderAvatar,
                isOnline: true,
                lastSeen: Date.now(),
              },
            ],
            lastMessage: message,
            unreadCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          updated = [newConv, ...prev];
        }
        // Sort by most recent
        updated.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        saveStoredConversations(updated);
        return updated;
      });

      // Sound notification if not sent by me
      if (message.senderId !== currentUser.id) {
        playMessageNotificationSound();
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`${message.senderName}`, {
            body: message.type === 'text' ? message.content : `Sent an attachment (${message.type})`,
            icon: message.senderAvatar,
          });
        }
      }
    });

    const unsubAck = commSocket.on('message-ack', ({ messageId, status }: any) => {
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? { ...m, status } : m));
        if (activeConvIdRef.current) {
          saveStoredMessages(activeConvIdRef.current, next);
        }
        return next;
      });
    });

    const unsubReaction = commSocket.on('message-reaction', ({ conversationId, messageId, emoji, userId }: any) => {
      if (activeConvIdRef.current === conversationId) {
        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.id === messageId) {
              const reactions = { ...(m.reactions || {}) };
              const currentUsers = reactions[emoji] || [];
              if (currentUsers.includes(userId)) {
                reactions[emoji] = currentUsers.filter((id) => id !== userId);
                if (reactions[emoji].length === 0) delete reactions[emoji];
              } else {
                reactions[emoji] = [...currentUsers, userId];
              }
              return { ...m, reactions };
            }
            return m;
          });
          saveStoredMessages(conversationId, next);
          return next;
        });
      }
    });

    const unsubEdit = commSocket.on('message-edit', ({ conversationId, messageId, newContent }: any) => {
      if (activeConvIdRef.current === conversationId) {
        setMessages((prev) => {
          const next = prev.map((m) => (m.id === messageId ? { ...m, content: newContent, isEdited: true } : m));
          saveStoredMessages(conversationId, next);
          return next;
        });
      }
    });

    const unsubDelete = commSocket.on('message-delete', ({ conversationId, messageId, forEveryone }: any) => {
      if (activeConvIdRef.current === conversationId) {
        setMessages((prev) => {
          let next: CommMessage[];
          if (forEveryone) {
            next = prev.map((m) =>
              m.id === messageId
                ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true, mediaUrl: undefined }
                : m
            );
          } else {
            next = prev.filter((m) => m.id !== messageId);
          }
          saveStoredMessages(conversationId, next);
          return next;
        });
      }
    });

    const unsubTyping = commSocket.on('typing-indicator', ({ conversationId, userId, userName, isTyping }: any) => {
      if (activeConvIdRef.current === conversationId && userId !== currentUser.id) {
        setActiveTypingUsers((prev) => {
          if (isTyping) {
            if (prev[userId]?.timeout) clearTimeout(prev[userId].timeout);
            const timeout = setTimeout(() => {
              setActiveTypingUsers((curr) => {
                const copy = { ...curr };
                delete copy[userId];
                return copy;
              });
            }, 3500);
            return { ...prev, [userId]: { userId, userName, timeout } };
          } else {
            const copy = { ...prev };
            if (copy[userId]?.timeout) clearTimeout(copy[userId].timeout);
            delete copy[userId];
            return copy;
          }
        });
      }
    });

    const unsubPresence = commSocket.on('user-presence', ({ userId, isOnline }: any) => {
      setContacts((prev) => {
        const next = prev.map((c) => (c.id === userId ? { ...c, isOnline, lastSeen: Date.now() } : c));
        saveStoredContacts(next);
        return next;
      });
      setConversations((prev) => {
        const next = prev.map((conv) => ({
          ...conv,
          participants: conv.participants.map((p) => (p.id === userId ? { ...p, isOnline, lastSeen: Date.now() } : p)),
        }));
        saveStoredConversations(next);
        return next;
      });
    });

    // WebRTC Incoming Call listener
    const unsubIncomingCall = commSocket.on('incoming-call', ({ callId, caller, callType }: any) => {
      stopRingtone();
      startIncomingRingtone();

      const newSession: CallSession = {
        id: callId,
        caller,
        receiver: currentUser,
        type: callType,
        status: 'incoming',
        duration: 0,
        isMicMuted: false,
        isVideoEnabled: callType === 'video',
        isSpeakerOn: true,
        cameraFacing: 'user',
        networkQuality: 'good',
      };

      setCallSession(newSession);
      setIsIncomingCallModalOpen(true);
    });

    const unsubCallAccepted = commSocket.on('call-accepted', async ({ callId }: any) => {
      stopRingtone();
      playCallConnectedSound();

      setCallSession((prev) => {
        if (!prev || prev.id !== callId) return prev;
        return {
          ...prev,
          status: 'connected',
          startTime: Date.now(),
        };
      });

      // Start duration counter
      startCallTimer();
    });

    const unsubCallRejected = commSocket.on('call-rejected', ({ callId, reason }: any) => {
      stopRingtone();
      playCallEndedSound();
      toast.error(reason || 'Call was declined');

      setCallSession((prev) => {
        if (!prev) return null;
        return { ...prev, status: 'rejected' };
      });

      setTimeout(() => {
        endCallSession('rejected');
      }, 1200);
    });

    const unsubCallEnded = commSocket.on('call-ended', () => {
      stopRingtone();
      playCallEndedSound();
      toast.info('Call ended');
      endCallSession('ended');
    });

    const unsubSignal = commSocket.on('webrtc-signal', async ({ signal }: any) => {
      if (!signal) return;
      if (signal.type === 'offer') {
        const answer = await webrtcManager.handleOffer(signal.offer);
        const curr = callSessionRef.current;
        if (curr) {
          commSocket.sendSignal(curr.caller.id === currentUser.id ? curr.receiver.id : curr.caller.id, {
            type: 'answer',
            answer,
          });
        }
      } else if (signal.type === 'answer') {
        await webrtcManager.handleAnswer(signal.answer);
      } else if (signal.type === 'candidate') {
        await webrtcManager.addIceCandidate(signal.candidate);
      }
    });

    return () => {
      unsubMsg();
      unsubAck();
      unsubReaction();
      unsubEdit();
      unsubDelete();
      unsubTyping();
      unsubPresence();
      unsubIncomingCall();
      unsubCallAccepted();
      unsubCallRejected();
      unsubCallEnded();
      unsubSignal();
    };
  }, [currentUser]);

  // Call timer helper
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallSession((prev) => {
        if (!prev || prev.status !== 'connected') return prev;
        return { ...prev, duration: prev.duration + 1 };
      });
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  // End active call session and log to history
  const endCallSession = useCallback(
    (reason: 'ended' | 'rejected' | 'missed' = 'ended') => {
      stopRingtone();
      stopCallTimer();
      if (aiVisionIntervalRef.current) {
        clearInterval(aiVisionIntervalRef.current);
        aiVisionIntervalRef.current = null;
      }

      const curr = callSessionRef.current;
      if (curr) {
        const peer = curr.caller.id === currentUser.id ? curr.receiver : curr.caller;
        const direction =
          curr.caller.id === currentUser.id
            ? 'outgoing'
            : reason === 'rejected' || reason === 'missed'
            ? 'missed'
            : 'incoming';

        const historyItem: CallHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          callId: curr.id,
          peerId: peer.id,
          peerName: peer.name,
          peerAvatar: peer.avatar,
          type: curr.type,
          direction,
          timestamp: Date.now(),
          duration: curr.duration,
          status: reason,
        };

        setCallHistory((prev) => {
          const next = [historyItem, ...prev];
          saveStoredCallHistory(next);
          return next;
        });

        // Notify server
        commSocket.hangupCall(curr.id, peer.id);
      }

      webrtcManager.cleanup();
      setRemoteStream(null);
      setLocalStream(null);
      setCallSession(null);
      setIsIncomingCallModalOpen(false);
    },
    [currentUser, stopCallTimer]
  );

  // Initiate outgoing Voice or Video Call
  const startCall = useCallback(
    async (peer: CommUser, type: CallType) => {
      stopRingtone();
      const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newSession: CallSession = {
        id: callId,
        caller: currentUser,
        receiver: peer,
        type,
        status: 'calling',
        duration: 0,
        isMicMuted: false,
        isVideoEnabled: type === 'video',
        isSpeakerOn: true,
        cameraFacing: 'user',
        networkQuality: 'excellent',
      };

      setCallSession(newSession);

      // AI Contact special instant answer
      if (peer.isAI || peer.id === 'rishi-ai') {
        startOutgoingDialTone();
        setTimeout(async () => {
          stopRingtone();
          playCallConnectedSound();

          try {
            const stream = await webrtcManager.getLocalMedia({
              audio: true,
              video: type === 'video',
              cameraFacing: 'user',
            });
            setLocalStream(stream);

            setCallSession((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'connected',
                    startTime: Date.now(),
                  }
                : null
            );
            startCallTimer();
          } catch (err: any) {
            toast.error(`Could not access microphone/camera: ${err?.message || err}`);
            endCallSession('ended');
          }
        }, 1200);
        return;
      }

      // Real peer connection
      startOutgoingDialTone();

      try {
        const stream = await webrtcManager.getLocalMedia({
          audio: true,
          video: type === 'video',
          cameraFacing: 'user',
        });
        setLocalStream(stream);

        // Setup WebRTC peer connection
        webrtcManager.initPeerConnection({
          onSignal: (signal) => {
            commSocket.sendSignal(peer.id, signal);
          },
          onRemoteStream: (stream) => {
            setRemoteStream(stream);
          },
          onNetworkQuality: (quality) => {
            setCallSession((prev) => (prev ? { ...prev, networkQuality: quality } : null));
          },
          onConnectionStateChange: (state) => {
            if (state === 'connected') {
              stopRingtone();
              playCallConnectedSound();
              setCallSession((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
              startCallTimer();
            } else if (state === 'disconnected' || state === 'failed') {
              setCallSession((prev) => (prev ? { ...prev, isReconnecting: true } : null));
            }
          },
        });

        // Create and send offer
        const offer = await webrtcManager.createOffer();
        commSocket.initiateCall(callId, currentUser, peer, type);
        commSocket.sendSignal(peer.id, { type: 'offer', offer });
      } catch (err: any) {
        stopRingtone();
        toast.error(`Media access failed: ${err.message || 'Permission denied'}`);
        endCallSession('ended');
      }
    },
    [currentUser, endCallSession, startCallTimer]
  );

  // Accept incoming call
  const acceptIncomingCall = useCallback(async () => {
    const session = callSessionRef.current;
    if (!session) return;

    stopRingtone();
    setIsIncomingCallModalOpen(false);

    try {
      const stream = await webrtcManager.getLocalMedia({
        audio: true,
        video: session.type === 'video',
        cameraFacing: 'user',
      });
      setLocalStream(stream);

      webrtcManager.initPeerConnection({
        onSignal: (signal) => {
          commSocket.sendSignal(session.caller.id, signal);
        },
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onNetworkQuality: (quality) => {
          setCallSession((prev) => (prev ? { ...prev, networkQuality: quality } : null));
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            playCallConnectedSound();
            setCallSession((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
            startCallTimer();
          }
        },
      });

      commSocket.acceptCall(session.id, session.caller.id);

      setCallSession((prev) => (prev ? { ...prev, status: 'connecting' } : null));
    } catch (err: any) {
      toast.error(`Cannot answer call: ${err.message || 'Permission error'}`);
      endCallSession('rejected');
    }
  }, [endCallSession, startCallTimer]);

  // Reject incoming call
  const rejectIncomingCall = useCallback(() => {
    const session = callSessionRef.current;
    if (session) {
      commSocket.rejectCall(session.id, session.caller.id, 'Call declined by user');
    }
    endCallSession('rejected');
  }, [endCallSession]);

  // Toggle Microphone
  const toggleMic = useCallback(() => {
    setCallSession((prev) => {
      if (!prev) return null;
      const nextMuted = !prev.isMicMuted;
      webrtcManager.setAudioMuted(nextMuted);
      return { ...prev, isMicMuted: nextMuted };
    });
  }, []);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    setCallSession((prev) => {
      if (!prev) return null;
      const nextEnabled = !prev.isVideoEnabled;
      webrtcManager.setVideoEnabled(nextEnabled);
      return { ...prev, isVideoEnabled: nextEnabled };
    });
  }, []);

  // Flip Camera (Front / Back)
  const flipCamera = useCallback(async () => {
    const curr = callSessionRef.current;
    if (!curr) return;
    const nextFacing = curr.cameraFacing === 'user' ? 'environment' : 'user';
    const newStream = await webrtcManager.switchCamera(nextFacing);
    if (newStream) {
      setLocalStream(newStream);
      setCallSession((prev) => (prev ? { ...prev, cameraFacing: nextFacing } : null));
      toast.info(`Switched to ${nextFacing === 'user' ? 'Front' : 'Back'} Camera`);
    }
  }, []);

  // Toggle AI Vision during Video Calls
  const toggleAIVision = useCallback((videoElement?: HTMLVideoElement) => {
    setCallSession((prev) => {
      if (!prev) return null;
      const nextActive = !prev.isAIVisionActive;

      if (nextActive && videoElement) {
        // Run AI vision scan loop every 8 seconds
        const runScan = async () => {
          const result = await analyzeLiveFrame(videoElement, undefined, 'Live Video Call AI Vision');
          setCallSession((current) => (current ? { ...current, aiVisionSummary: result.response } : null));
          toast.info(`AI Vision: ${result.response}`, { duration: 4000 });
        };
        runScan();
        aiVisionIntervalRef.current = setInterval(runScan, 9000);
      } else {
        if (aiVisionIntervalRef.current) {
          clearInterval(aiVisionIntervalRef.current);
          aiVisionIntervalRef.current = null;
        }
      }

      return {
        ...prev,
        isAIVisionActive: nextActive,
        aiVisionSummary: nextActive ? 'Scanning camera frame with Gemini Vision...' : undefined,
      };
    });
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (
      content: string,
      type: MessageType = 'text',
      mediaData?: { url?: string; name?: string; size?: string; mimeType?: string; duration?: number },
      replyTo?: CommMessage['replyTo']
    ) => {
      if (!activeConversationId) return;

      const activeConv = conversations.find((c) => c.id === activeConversationId);
      if (!activeConv) return;

      const isAI = activeConv.type === 'ai' || activeConv.participantIds.includes('rishi-ai');

      const newMsg: CommMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        conversationId: activeConversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        content,
        type,
        mediaUrl: mediaData?.url,
        mediaName: mediaData?.name,
        mediaSize: mediaData?.size,
        mediaMimeType: mediaData?.mimeType,
        mediaDuration: mediaData?.duration,
        replyTo,
        status: 'sending',
        timestamp: Date.now(),
      };

      // Optimistic addition
      setMessages((prev) => {
        const next = [...prev, newMsg];
        saveStoredMessages(activeConversationId, next);
        return next;
      });

      // Update conversation list
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === activeConversationId ? { ...c, lastMessage: newMsg, updatedAt: Date.now() } : c));
        saveStoredConversations(next);
        return next;
      });

      // Transmit via WebSocket
      commSocket.sendMessage(newMsg);

      // If chatting with AI, generate real-time AI response with Search and Vision grounding
      if (isAI) {
        // Show typing indicator for AI
        setActiveTypingUsers((prev) => ({
          ...prev,
          'rishi-ai': { userId: 'rishi-ai', userName: 'Rishi AI', timeout: null },
        }));

        try {
          const res = await fetch('/api/gemini/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: content,
              history: messagesRef.current.slice(-6).map((m) => ({
                role: m.senderId === currentUser.id ? 'user' : 'model',
                content: m.content,
              })),
              mode: 'chat',
            }),
          });

          const aiData = await res.json();
          const aiResponseText = aiData.text || 'I am processing your message and ready to help!';

          const aiMsg: CommMessage = {
            id: `msg-ai-${Date.now()}`,
            conversationId: activeConversationId,
            senderId: 'rishi-ai',
            senderName: DEFAULT_AI_USER.name,
            senderAvatar: DEFAULT_AI_USER.avatar,
            content: aiResponseText,
            type: 'text',
            status: 'delivered',
            timestamp: Date.now(),
          };

          setMessages((prev) => {
            const next = [...prev, aiMsg];
            saveStoredMessages(activeConversationId, next);
            return next;
          });

          setConversations((prev) => {
            const next = prev.map((c) => (c.id === activeConversationId ? { ...c, lastMessage: aiMsg, updatedAt: Date.now() } : c));
            saveStoredConversations(next);
            return next;
          });

          playMessageNotificationSound();
        } catch (err: any) {
          console.warn('AI response generation failed:', err);
        } finally {
          setActiveTypingUsers((prev) => {
            const copy = { ...prev };
            delete copy['rishi-ai'];
            return copy;
          });
        }
      }
    },
    [activeConversationId, conversations, currentUser]
  );

  // Edit message
  const editMessage = useCallback(
    (messageId: string, newContent: string) => {
      if (!activeConversationId) return;
      commSocket.editMessage(activeConversationId, messageId, newContent);
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? { ...m, content: newContent, isEdited: true } : m));
        saveStoredMessages(activeConversationId, next);
        return next;
      });
    },
    [activeConversationId]
  );

  // Delete message
  const deleteMessage = useCallback(
    (messageId: string, forEveryone = true) => {
      if (!activeConversationId) return;
      commSocket.deleteMessage(activeConversationId, messageId, forEveryone);
      setMessages((prev) => {
        let next: CommMessage[];
        if (forEveryone) {
          next = prev.map((m) =>
            m.id === messageId
              ? { ...m, content: 'This message was deleted', isDeletedForEveryone: true, mediaUrl: undefined }
              : m
          );
        } else {
          next = prev.filter((m) => m.id !== messageId);
        }
        saveStoredMessages(activeConversationId, next);
        return next;
      });
    },
    [activeConversationId]
  );

  // React to message
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!activeConversationId) return;
      commSocket.reactToMessage(activeConversationId, messageId, emoji);
      setMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id === messageId) {
            const reactions = { ...(m.reactions || {}) };
            const currentUsers = reactions[emoji] || [];
            if (currentUsers.includes(currentUser.id)) {
              reactions[emoji] = currentUsers.filter((id) => id !== currentUser.id);
              if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
              reactions[emoji] = [...currentUsers, currentUser.id];
            }
            return { ...m, reactions };
          }
          return m;
        });
        saveStoredMessages(activeConversationId, next);
        return next;
      });
    },
    [activeConversationId, currentUser.id]
  );

  // Pin message
  const togglePinMessage = useCallback(
    (messageId: string) => {
      if (!activeConversationId) return;
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? { ...m, isPinned: !m.isPinned } : m));
        saveStoredMessages(activeConversationId, next);
        return next;
      });
    },
    [activeConversationId]
  );

  // Create new direct or group conversation
  const createConversation = useCallback(
    (selectedContacts: CommUser[], groupName?: string) => {
      if (selectedContacts.length === 1 && !groupName) {
        const target = selectedContacts[0];
        // Check if direct conversation already exists
        const existing = conversations.find(
          (c) => c.type === 'direct' && c.participantIds.includes(target.id)
        );
        if (existing) {
          setActiveConversationId(existing.id);
          return existing.id;
        }

        const newConv: CommConversation = {
          id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: target.isAI ? 'ai' : 'direct',
          name: target.name,
          avatar: target.avatar,
          participantIds: [currentUser.id, target.id],
          participants: [currentUser, target],
          unreadCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setConversations((prev) => {
          const next = [newConv, ...prev];
          saveStoredConversations(next);
          return next;
        });
        setActiveConversationId(newConv.id);
        return newConv.id;
      }

      // Group Conversation
      const allParticipants = [currentUser, ...selectedContacts];
      const newGroup: CommConversation = {
        id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'group',
        name: groupName || `Group (${allParticipants.length})`,
        avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80',
        participantIds: allParticipants.map((p) => p.id),
        participants: allParticipants,
        unreadCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setConversations((prev) => {
        const next = [newGroup, ...prev];
        saveStoredConversations(next);
        return next;
      });
      setActiveConversationId(newGroup.id);
      return newGroup.id;
    },
    [conversations, currentUser]
  );

  return {
    currentUser,
    setCurrentUser: (user: CommUser) => {
      setCurrentUser(user);
      saveStoredCurrentUser(user);
    },
    conversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation: conversations.find((c) => c.id === activeConversationId) || null,
    contacts,
    setContacts: (cList: CommUser[]) => {
      setContacts(cList);
      saveStoredContacts(cList);
    },
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    togglePinMessage,
    activeTypingUsers,
    sendTyping: (isTyping: boolean) => {
      if (!activeConversationId) return;
      const activeConv = conversations.find((c) => c.id === activeConversationId);
      commSocket.sendTyping(activeConversationId, undefined, activeConv?.participantIds, isTyping);
    },
    searchQuery,
    setSearchQuery,
    callSession,
    startCall,
    endCallSession,
    acceptIncomingCall,
    rejectIncomingCall,
    isIncomingCallModalOpen,
    toggleMic,
    toggleVideo,
    flipCamera,
    toggleAIVision,
    localStream,
    remoteStream,
    callHistory,
    createConversation,
  };
}
