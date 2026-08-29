import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Phone,
  Video,
  Users,
  Search,
  Pin,
  Check,
  CheckCheck,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowLeft,
  Wifi,
  WifiOff,
  Sparkles,
  Settings,
  Plus,
  Radio,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { useCommunications } from '@/hooks/useCommunications';
import { CommUser, CallType } from '@/types/comm';
import { ChatConversationView } from './ChatConversationView';
import { MobileIncomingCallScreen } from './MobileIncomingCallScreen';
import { MobileVoiceCallScreen } from './MobileVoiceCallScreen';
import { MobileVideoCallScreen } from './MobileVideoCallScreen';
import { AILiveCallModal } from './AILiveCallModal';
import { CommSettingsView } from './CommSettingsView';
import { NewGroupModal } from './NewGroupModal';
import { MediaLightbox } from './MediaLightbox';
import { WhatsAppBusinessView } from './WhatsAppBusinessView';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CommunicationsHubProps {
  onBackToChat?: () => void;
  className?: string;
}

export const CommunicationsHub: React.FC<CommunicationsHubProps> = ({
  onBackToChat,
  className,
}) => {
  const {
    currentUser,
    setCurrentUser,
    conversations,
    activeConversationId,
    activeConversation,
    contacts,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    togglePinMessage,
    sendTyping,
    activeTypingUsers,
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
    setActiveConversationId,
  } = useCommunications();

  const [activeTab, setActiveTab] = useState<'chats' | 'whatsapp' | 'contacts' | 'calls' | 'ai' | 'settings'>('chats');
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [callFilter, setCallFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isAILiveModalOpen, setIsAILiveModalOpen] = useState(false);
  const [aiLiveMode, setAiLiveMode] = useState<'voice' | 'video'>('voice');
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    type: 'image' | 'video' | 'pdf' | 'file';
    name?: string;
  } | null>(null);

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const missedCallsCount = callHistory.filter((c) => c.status === 'missed' || c.direction === 'missed').length;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (chatFilter === 'unread') return (c.unreadCount || 0) > 0;
    if (chatFilter === 'groups') return c.type === 'group';
    return true;
  });

  // Filter contacts
  const filteredContacts = contacts.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter call history
  const filteredCallHistory = callHistory.filter((log) => {
    const matchesSearch = log.peerName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (callFilter === 'missed') return log.status === 'missed' || log.direction === 'missed';
    return true;
  });

  const handleStartDirectChat = (contact: CommUser) => {
    createConversation([contact]);
    setActiveTab('chats');
  };

  const handleLaunchAICall = (mode: 'voice' | 'video') => {
    setAiLiveMode(mode);
    setIsAILiveModalOpen(true);
  };

  return (
    <div
      className={cn(
        'flex-1 flex h-[calc(100vh-0px)] w-full bg-[#0a0b10] text-white overflow-hidden font-sans select-none relative',
        className
      )}
    >
      {/* LEFT / MOBILE PRIMARY SIDEBAR */}
      <aside
        className={cn(
          'w-full md:w-84 lg:w-96 flex flex-col bg-zinc-950/90 backdrop-blur-2xl border-r border-white/10 shrink-0 h-full z-10 transition-all',
          activeConversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Top App Bar with User Profile & Back button */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBackToChat && (
              <button
                onClick={onBackToChat}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                title="Back to AI Assistant"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md border border-white/20">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name[0]
                )}
              </div>
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 bg-emerald-400"
                title="Online"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{currentUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70 font-mono">
                  YOU
                </span>
              </h2>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Wifi size={11} className="text-emerald-400" />
                <span className="font-medium">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsNewGroupModalOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Create New Group"
            >
              <UserPlus size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeTab !== 'settings' && activeTab !== 'ai' && (
          <div className="px-4 pt-3 pb-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900/90 rounded-2xl text-xs text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}

        {/* Sub-Filters for Chats */}
        {activeTab === 'chats' && (
          <div className="px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Chats' },
              { id: 'unread', label: `Unread (${unreadTotal})` },
              { id: 'groups', label: 'Groups' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setChatFilter(f.id as any)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  chatFilter === f.id
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-Filters for Calls */}
        {activeTab === 'calls' && (
          <div className="px-4 py-1.5 flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Calls' },
              { id: 'missed', label: `Missed (${missedCallsCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCallFilter(f.id as any)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                  callFilter === f.id
                    ? 'bg-cyan-500 text-black shadow-sm'
                    : 'bg-white/5 text-white/60 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable Directory Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 scrollbar-thin">
          {/* CHATS TAB */}
          {activeTab === 'chats' && (
            <>
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs">
                  No conversations found
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = conv.id === activeConversationId;
                  const other =
                    conv.type === 'direct' || conv.type === 'ai'
                      ? conv.participants.find((p) => p.id !== currentUser.id)
                      : null;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border',
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-white shadow-lg'
                          : 'hover:bg-white/5 border-transparent text-white/80'
                      )}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10 shadow-sm">
                        {conv.avatar ? (
                          <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-cyan-400 text-sm">
                            {conv.name[0]}
                          </div>
                        )}
                        {other?.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-white truncate">{conv.name}</span>
                            {conv.type === 'ai' && (
                              <span className="text-[9px] px-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                                AI
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <span className="text-[10px] text-white/40 shrink-0">
                              {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-white/50 truncate max-w-[180px] flex items-center gap-1">
                            {conv.lastMessage && conv.lastMessage.senderId === currentUser.id && (
                              <span>
                                {conv.lastMessage.status === 'read' ? (
                                  <CheckCheck size={12} className="text-cyan-400 inline" />
                                ) : (
                                  <Check size={12} className="text-white/40 inline" />
                                )}
                              </span>
                            )}
                            <span className="truncate">{conv.lastMessage?.content || 'Started chat'}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {conv.isPinned && <Pin size={11} className="text-cyan-400 rotate-45" />}
                            {conv.unreadCount > 0 && (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-cyan-500 text-black">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <>
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 border border-transparent transition-colors"
                >
                  <div
                    onClick={() => handleStartDirectChat(contact)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-cyan-400 text-xs">
                          {contact.name[0]}
                        </div>
                      )}
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
                      )}
                    </div>

                    <div className="truncate">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className="truncate">{contact.name}</span>
                        {contact.isAI && (
                          <span className="text-[9px] px-1.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/50 truncate">
                        {contact.statusMessage || contact.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartDirectChat(contact)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors"
                      title="Send Message"
                    >
                      <MessageSquare size={15} />
                    </button>
                    <button
                      onClick={() => startCall(contact, 'voice')}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors"
                      title="Voice Call"
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      onClick={() => startCall(contact, 'video')}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-400 transition-colors"
                      title="Video Call"
                    >
                      <Video size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* CALLS TAB */}
          {activeTab === 'calls' && (
            <>
              {filteredCallHistory.length === 0 ? (
                <div className="text-center py-12 text-white/40 text-xs">No call logs yet</div>
              ) : (
                filteredCallHistory.map((log) => {
                  const peerContact = contacts.find((c) => c.id === log.peerId);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 border border-transparent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                          {log.peerAvatar ? (
                            <img src={log.peerAvatar} alt={log.peerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-cyan-400 text-xs">
                              {log.peerName[0]}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white">{log.peerName}</div>
                          <div className="flex items-center gap-1 text-[10px] text-white/50">
                            {log.status === 'missed' ? (
                              <PhoneMissed size={11} className="text-red-400" />
                            ) : log.direction === 'incoming' ? (
                              <PhoneIncoming size={11} className="text-emerald-400" />
                            ) : (
                              <PhoneOutgoing size={11} className="text-cyan-400" />
                            )}
                            <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                            {log.duration ? (
                              <span>• {Math.floor(log.duration / 60)}m {log.duration % 60}s</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {peerContact && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startCall(peerContact, 'voice')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 transition-colors"
                            title="Call Again"
                          >
                            <Phone size={15} />
                          </button>
                          <button
                            onClick={() => startCall(peerContact, 'video')}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 transition-colors"
                            title="Video Call"
                          >
                            <Video size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* AI LIVE TAB */}
          {activeTab === 'ai' && (
            <div className="p-3 space-y-4 text-center">
              <div className="p-6 rounded-3xl bg-gradient-to-b from-cyan-950/40 via-indigo-950/20 to-black/60 border border-cyan-500/20 space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-black shadow-lg shadow-cyan-500/20">
                  <Sparkles size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Gemini Live Assistant</h3>
                  <p className="text-xs text-white/50 mt-1">
                    Real-time speech conversation & camera vision understanding.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={() => handleLaunchAICall('voice')}
                    className="py-2.5 px-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Phone size={14} />
                    <span>AI Voice Call</span>
                  </button>
                  <button
                    onClick={() => handleLaunchAICall('video')}
                    className="py-2.5 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Video size={14} />
                    <span>AI Vision Call</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <CommSettingsView
              currentUser={currentUser}
              onUpdateUser={(updated) => setCurrentUser({ ...currentUser, ...updated })}
            />
          )}
        </div>

        {/* NATIVE MOBILE BOTTOM NAVIGATION BAR */}
        <nav className="h-16 px-2 bg-zinc-950 border-t border-white/10 flex items-center justify-around z-20 shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadTotal },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'calls', label: 'Calls', icon: Phone, badge: missedCallsCount },
            { id: 'ai', label: 'AI Live', icon: Sparkles },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative shrink-0',
                activeTab === tab.id
                  ? 'text-[#25d366] font-bold scale-105'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <div className="relative">
                <tab.icon size={19} className={tab.id === 'whatsapp' ? 'text-[#25d366]' : ''} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-cyan-500 text-black">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* CENTER / MAIN: Active Conversation View OR WhatsApp Business API View */}
      <main className="flex-1 flex flex-col h-full bg-[#0d0e14] overflow-y-auto relative">
        {activeTab === 'whatsapp' ? (
          <WhatsAppBusinessView />
        ) : (
          <ChatConversationView
            conversation={activeConversation}
            currentUser={currentUser}
            messages={messages}
            conversations={conversations}
            contacts={contacts}
            activeTypingUsers={activeTypingUsers}
            onSendMessage={sendMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onReactMessage={reactToMessage}
            onTogglePinMessage={togglePinMessage}
            onSendTyping={sendTyping}
            onStartVoiceCall={(peer) => startCall(peer, 'voice')}
            onStartVideoCall={(peer) => startCall(peer, 'video')}
            onOpenLightbox={(media) => setLightboxMedia(media)}
            onBackToConversationsList={() => setActiveConversationId('')}
          />
        )}
      </main>

      {/* MOBILE INCOMING CALL SCREEN */}
      <MobileIncomingCallScreen
        isOpen={isIncomingCallModalOpen}
        session={callSession}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />

      {/* MOBILE VOICE CALL SCREEN */}
      {callSession && callSession.type === 'voice' && (
        <MobileVoiceCallScreen
          session={callSession}
          currentUser={currentUser}
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMic={toggleMic}
          onSwitchToVideo={() => {
            if (callSession) {
              const peer = callSession.caller.id === currentUser.id ? callSession.receiver : callSession.caller;
              endCallSession('ended');
              startCall(peer, 'video');
            }
          }}
          onEndCall={endCallSession}
        />
      )}

      {/* MOBILE VIDEO CALL SCREEN */}
      {callSession && callSession.type === 'video' && (
        <MobileVideoCallScreen
          session={callSession}
          currentUser={currentUser}
          localStream={localStream}
          remoteStream={remoteStream}
          onToggleMic={toggleMic}
          onToggleVideo={toggleVideo}
          onFlipCamera={flipCamera}
          onToggleAIVision={toggleAIVision}
          onEndCall={endCallSession}
        />
      )}

      {/* GEMINI LIVE AI VOICE & VISION CALL MODAL */}
      <AILiveCallModal
        isOpen={isAILiveModalOpen}
        currentUser={currentUser}
        mode={aiLiveMode}
        onClose={() => setIsAILiveModalOpen(false)}
        onTranscriptAdd={(role, text) => {
          if (activeConversationId) {
            sendMessage(
              text,
              'text',
              undefined,
              undefined
            );
          }
        }}
      />

      {/* NEW GROUP MODAL */}
      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        contacts={contacts}
        onClose={() => setIsNewGroupModalOpen(false)}
        onCreateGroup={createConversation}
      />

      {/* MEDIA LIGHTBOX */}
      <MediaLightbox
        media={lightboxMedia}
        onClose={() => setLightboxMedia(null)}
      />
    </div>
  );
};
