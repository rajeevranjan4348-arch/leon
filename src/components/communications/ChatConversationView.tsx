import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  Pin,
  Reply,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  X,
  File,
  Download,
  Play,
  Pause,
  CornerDownRight,
  ArrowRight,
  Flame,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { CommConversation, CommMessage, CommUser, MessageType } from '@/types/comm';
import { ForwardMessageModal } from './ForwardMessageModal';
import { GifPickerPopover } from './GifPickerPopover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ChatConversationViewProps {
  conversation: CommConversation | null;
  currentUser: CommUser;
  messages: CommMessage[];
  conversations?: CommConversation[];
  contacts?: CommUser[];
  activeTypingUsers: Record<string, { userId: string; userName: string }>;
  onSendMessage: (
    content: string,
    type?: MessageType,
    mediaData?: { url?: string; name?: string; size?: string; mimeType?: string; duration?: number },
    replyTo?: CommMessage['replyTo']
  ) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, forEveryone?: boolean) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onTogglePinMessage: (messageId: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onStartVoiceCall: (peer: CommUser) => void;
  onStartVideoCall: (peer: CommUser) => void;
  onOpenLightbox: (media: { url: string; type: 'image' | 'video' | 'pdf' | 'file'; name?: string }) => void;
  onBackToConversationsList?: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '👏', '🎉', '🚀', '🙏'];

export const ChatConversationView: React.FC<ChatConversationViewProps> = ({
  conversation,
  currentUser,
  messages,
  conversations = [],
  contacts = [],
  activeTypingUsers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onTogglePinMessage,
  onSendTyping,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenLightbox,
  onBackToConversationsList,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<CommMessage | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<CommMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeTypingUsers]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/50 select-none">
        <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
          <Sparkles size={28} />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Rishi Mobile Communications</h3>
        <p className="text-xs text-white/40 max-w-xs">
          Select a chat or start a call with your contacts and Gemini AI Copilot.
        </p>
      </div>
    );
  }

  const otherUser =
    conversation.type === 'direct' || conversation.type === 'ai'
      ? conversation.participants.find((p) => p.id !== currentUser.id)
      : null;

  const pinnedMessages = messages.filter((m) => m.isPinned);

  // Handle Send text message
  const handleSend = () => {
    const text = inputText.trim();
    if (!text && !editingMessage) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, text);
      setEditingMessage(null);
    } else {
      onSendMessage(
        text,
        'text',
        undefined,
        replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.senderName,
              content: replyingTo.content,
              type: replyingTo.type,
            }
          : undefined
      );
      setReplyingTo(null);
    }

    setInputText('');
    onSendTyping(false);
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onSendMessage('Voice Note', 'audio', {
          url: audioUrl,
          name: `Voice Note (${recordingSeconds}s)`,
          duration: recordingSeconds,
          size: `${Math.round(audioBlob.size / 1024)} KB`,
        });
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e: any) {
      toast.error('Microphone permission required to record voice notes');
    }
  };

  const stopVoiceRecording = (send: boolean = true) => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecordingVoice(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (!send) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        toast.info('Voice recording cancelled');
      } else {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // File / Image Attachment handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    let msgType: MessageType = 'file';
    if (file.type.startsWith('image/')) msgType = 'image';
    else if (file.type.startsWith('video/')) msgType = 'video';
    else if (file.type === 'application/pdf') msgType = 'pdf';
    else if (file.type.startsWith('audio/')) msgType = 'audio';

    onSendMessage(file.name, msgType, {
      url: fileUrl,
      name: file.name,
      size: sizeStr,
      mimeType: file.type,
    });

    setShowAttachmentMenu(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio note playback
  const togglePlayAudio = (url: string, id: string) => {
    if (playingAudioId === id) {
      currentAudioElementRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      const audio = new Audio(url);
      currentAudioElementRef.current = audio;
      audio.play();
      setPlayingAudioId(id);
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Filtered search messages
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0c12] text-white relative overflow-hidden font-sans select-none">
      {/* TOP CHAT HEADER */}
      <header className="h-16 px-4 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToConversationsList && (
            <button
              onClick={onBackToConversationsList}
              className="p-2 -ml-1 rounded-xl hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
              title="Back to Conversations"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/15 shadow-sm">
            {conversation.avatar ? (
              <img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-cyan-400 text-sm">
                {conversation.name[0]}
              </div>
            )}
            {otherUser?.isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{conversation.name}</span>
              {conversation.type === 'ai' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  AI COPILOT
                </span>
              )}
            </h2>
            <div className="text-[11px] text-white/50 truncate flex items-center gap-1">
              {otherUser?.isOnline ? (
                <span className="text-emerald-400 font-medium">● Online</span>
              ) : conversation.type === 'group' ? (
                <span>{conversation.participants.length} members</span>
              ) : (
                <span>Last seen recently</span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Search Messages"
          >
            <Search size={16} />
          </button>

          {otherUser && (
            <>
              <button
                onClick={() => onStartVoiceCall(otherUser)}
                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                title="Start Voice Call"
              >
                <Phone size={16} />
              </button>

              <button
                onClick={() => onStartVideoCall(otherUser)}
                className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95 cursor-pointer"
                title="Start HD Video Call"
              >
                <Video size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* SEARCH BAR (EXPANDABLE) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-zinc-900 border-b border-white/10 flex items-center gap-2 z-15 overflow-hidden"
          >
            <Search size={14} className="text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this conversation..."
              className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white text-xs">
                Clear
              </button>
            )}
            <button onClick={() => setIsSearchOpen(false)} className="text-white/60 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PINNED MESSAGES RIBBON */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-1.5 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between text-xs text-cyan-200 z-10">
          <div className="flex items-center gap-2 truncate">
            <Pin size={12} className="text-cyan-400 rotate-45 shrink-0" />
            <span className="font-bold text-[10px] uppercase tracking-wider text-cyan-400">Pinned:</span>
            <span className="truncate text-white/80">{pinnedMessages[pinnedMessages.length - 1].content}</span>
          </div>
          <span className="text-[10px] text-cyan-400/70 shrink-0 font-mono">
            {pinnedMessages.length} pinned
          </span>
        </div>
      )}

      {/* MESSAGE STREAM LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-xs">
            {searchQuery ? 'No matching messages found' : 'No messages yet. Say hello! 👋'}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={cn('flex flex-col group', isMe ? 'items-end' : 'items-start')}
              >
                {/* Sender Name in group chats */}
                {!isMe && conversation.type === 'group' && (
                  <span className="text-[10px] text-white/50 mb-1 ml-2 font-semibold">
                    {msg.senderName}
                  </span>
                )}

                {/* Reply Quote Preview */}
                {msg.replyTo && (
                  <div
                    className={cn(
                      'mb-1 max-w-xs md:max-w-md px-3 py-1.5 rounded-xl text-[11px] border text-white/70 bg-black/40 truncate',
                      isMe ? 'border-cyan-500/30' : 'border-white/10'
                    )}
                  >
                    <span className="font-bold text-cyan-300 mr-1">{msg.replyTo.senderName}:</span>
                    <span className="truncate">{msg.replyTo.content}</span>
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={cn(
                    'relative max-w-[82%] md:max-w-md rounded-3xl p-3.5 shadow-lg backdrop-blur-md transition-all',
                    isMe
                      ? 'bg-gradient-to-br from-cyan-600 to-indigo-700 text-white rounded-br-xs border border-white/20'
                      : 'bg-zinc-900/90 text-white/95 rounded-bl-xs border border-white/10'
                  )}
                >
                  {/* Pinned Marker */}
                  {msg.isPinned && (
                    <div className="absolute top-2 right-2 text-cyan-300">
                      <Pin size={11} className="rotate-45" />
                    </div>
                  )}

                  {/* MEDIA CONTENT RENDERING */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div
                      onClick={() => onOpenLightbox({ url: msg.mediaUrl!, type: 'image', name: msg.mediaName })}
                      className="mb-2 rounded-2xl overflow-hidden cursor-pointer max-h-60 bg-black/30 border border-white/10"
                    >
                      <img src={msg.mediaUrl} alt={msg.mediaName || 'Image'} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {msg.type === 'video' && msg.mediaUrl && (
                    <div
                      onClick={() => onOpenLightbox({ url: msg.mediaUrl!, type: 'video', name: msg.mediaName })}
                      className="mb-2 rounded-2xl overflow-hidden cursor-pointer max-h-60 bg-black relative group/vid border border-white/10"
                    >
                      <video src={msg.mediaUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play size={28} className="text-white drop-shadow" />
                      </div>
                    </div>
                  )}

                  {msg.type === 'audio' && msg.mediaUrl && (
                    <div className="flex items-center gap-3 p-2 bg-black/30 rounded-2xl mb-1 min-w-[200px]">
                      <button
                        onClick={() => togglePlayAudio(msg.mediaUrl!, msg.id)}
                        className="w-9 h-9 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow transition-transform active:scale-90"
                      >
                        {playingAudioId === msg.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{msg.mediaName || 'Voice Note'}</div>
                        <div className="text-[10px] text-white/50">{msg.mediaDuration ? `${msg.mediaDuration}s` : 'Audio'}</div>
                      </div>
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <a
                      href={msg.mediaUrl}
                      download={msg.mediaName}
                      className="flex items-center gap-3 p-2.5 bg-black/30 rounded-2xl mb-1 border border-white/10 hover:border-cyan-400 transition-colors"
                    >
                      <File size={22} className="text-cyan-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{msg.mediaName || 'Document'}</div>
                        <div className="text-[10px] text-white/50">{msg.mediaSize || 'File'}</div>
                      </div>
                      <Download size={15} className="text-white/60" />
                    </a>
                  )}

                  {/* Text Content */}
                  {msg.isDeletedForEveryone ? (
                    <p className="text-xs italic text-white/40">🚫 This message was deleted</p>
                  ) : (
                    <p className="text-xs font-normal leading-relaxed whitespace-pre-wrap select-text break-words">
                      {msg.content}
                    </p>
                  )}

                  {/* Message Footer: Timestamp & Read receipts */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-white/60">
                    {msg.isEdited && <span className="text-[9px] italic text-white/40">(edited)</span>}
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck size={13} className="text-cyan-300 inline font-bold" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck size={13} className="text-white/60 inline" />
                        ) : (
                          <Check size={13} className="text-white/40 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* EMOJI REACTIONS DISPLAY */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <button
                        key={emoji}
                        onClick={() => onReactMessage(msg.id, emoji)}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 border transition-colors',
                          userIds.includes(currentUser.id)
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-zinc-900 border-white/10 text-white/70'
                        )}
                      >
                        <span>{emoji}</span>
                        <span>{userIds.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* QUICK HOVER / TAP ACTION BAR */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 px-1 transition-opacity">
                  {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReactMessage(msg.id, emoji)}
                      className="p-1 text-xs hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 text-white/50 hover:text-white"
                    title="Reply"
                  >
                    <Reply size={13} />
                  </button>
                  <button
                    onClick={() => setForwardingMessage(msg)}
                    className="p-1 text-white/50 hover:text-white"
                    title="Forward"
                  >
                    <ArrowRight size={13} />
                  </button>
                  <button
                    onClick={() => onTogglePinMessage(msg.id)}
                    className="p-1 text-white/50 hover:text-cyan-400"
                    title="Pin Message"
                  >
                    <Pin size={13} />
                  </button>
                  {isMe && !msg.isDeletedForEveryone && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setInputText(msg.content);
                        }}
                        className="p-1 text-white/50 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteMessage(msg.id, true)}
                        className="p-1 text-white/50 hover:text-red-400"
                        title="Delete for Everyone"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Live Typing indicator in chat */}
        {Object.keys(activeTypingUsers).length > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/50 italic py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>{Object.values(activeTypingUsers).map((u) => u.userName).join(', ')} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* REPLYING / EDITING BANNER */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            {replyingTo ? (
              <>
                <CornerDownRight size={14} className="text-cyan-400 shrink-0" />
                <span className="font-bold text-cyan-300">Replying to {replyingTo.senderName}:</span>
                <span className="text-white/60 truncate">{replyingTo.content}</span>
              </>
            ) : (
              <>
                <Edit2 size={14} className="text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">Editing Message</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
              setEditingMessage(null);
              setInputText('');
            }}
            className="text-white/40 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ATTACHMENT MENU POPUP */}
      <AnimatePresence>
        {showAttachmentMenu && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-20 left-4 z-40 bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3 shadow-2xl flex flex-col gap-2"
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <ImageIcon size={16} />
              </div>
              <span>Photos & Videos</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <FileText size={16} />
              </div>
              <span>Documents & PDFs</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GIF PICKER POPOVER */}
      <GifPickerPopover
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={(gifUrl) => {
          onSendMessage('Animated GIF', 'image', { url: gifUrl, name: 'GIF' });
        }}
      />

      {/* FORWARD MESSAGE MODAL */}
      <ForwardMessageModal
        isOpen={!!forwardingMessage}
        message={forwardingMessage}
        conversations={conversations}
        contacts={contacts}
        onClose={() => setForwardingMessage(null)}
        onForward={(targetIds, msg) => {
          targetIds.forEach((targetId) => {
            onSendMessage(`Forwarded: ${msg.content}`, msg.type, {
              url: msg.mediaUrl,
              name: msg.mediaName,
              size: msg.mediaSize,
              mimeType: msg.mediaMimeType,
            });
          });
        }}
      />

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={false}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* BOTTOM INPUT BAR */}
      <footer className="p-3 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/10 flex items-center gap-2 z-20 shrink-0">
        {/* Attachment button */}
        <button
          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          className={cn(
            'p-2.5 rounded-2xl transition-colors cursor-pointer',
            showAttachmentMenu ? 'bg-cyan-500 text-black' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
          )}
          title="Attach Media"
        >
          <Paperclip size={18} />
        </button>

        {/* GIF button */}
        <button
          onClick={() => setShowGifPicker(!showGifPicker)}
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Insert GIF"
        >
          <Flame size={18} className="text-amber-400" />
        </button>

        {/* VOICE RECORDING OR TEXT INPUT */}
        {isRecordingVoice ? (
          <div className="flex-1 flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-red-300">
                Recording Voice ({recordingSeconds}s)...
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => stopVoiceRecording(false)}
                className="text-xs text-white/60 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => stopVoiceRecording(true)}
                className="px-3 py-1 rounded-xl bg-red-500 text-white text-xs font-bold"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                onSendTyping(e.target.value.length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${conversation.name}...`}
              className="w-full pl-4 pr-10 py-2.5 bg-zinc-900 rounded-2xl text-xs text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-cyan-400"
            />
            {/* Emoji toggle inside input */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 text-white/40 hover:text-white"
            >
              <Smile size={16} />
            </button>
          </div>
        )}

        {/* SEND OR VOICE NOTE BUTTON */}
        {inputText.trim() || editingMessage ? (
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Send Message"
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            onClick={startVoiceRecording}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
            title="Record Voice Note"
          >
            <Mic size={18} />
          </button>
        )}
      </footer>
    </div>
  );
};
