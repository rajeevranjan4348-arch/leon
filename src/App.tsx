import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { HistoryPanel } from '@/components/layout/HistoryPanel';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { CommandPaletteModal } from '@/components/layout/CommandPaletteModal';
import { ChatInterface } from '@/components/research/ChatInterface';
import { ManusAgentPanel } from '@/components/research/ManusAgentPanel';
import { AppLauncherModal } from '@/components/launcher/AppLauncherModal';
import { FpsBoostModal } from '@/components/tools/FpsBoostModal';
import { WallpaperPickerModal } from '@/components/wallpaper/WallpaperPickerModal';
import { DedicatedPanel, ImagesUI, LibraryUI, ProjectsUI, ResourceSearchUI, DiscoverPage, PanelType, VoiceHistoryPanel } from '@/components/panels/DedicatedPanels';
import { CommunicationsHub } from '@/components/communications/CommunicationsHub';
import { Veo3ImageToVideoModal } from '@/components/video/Veo3ImageToVideoModal';
import { GoogleMapsView } from '@/components/maps/GoogleMapsView';
import { GoogleAgentsHub } from '@/components/agents/GoogleAgentsHub';
import { AgentActivityLogPanel } from '@/components/ruflo/AgentActivityLogPanel';
import { SubtaskFailureToastListener } from '@/components/ruflo/SubtaskFailureToastListener';
import { StartupApiHealthListener } from '@/components/common/StartupApiHealthListener';
import { AIDevicePermissionsModal } from '@/components/agent/AIDevicePermissionsModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Image as ImageIcon, Library as LibraryIcon, Folder as FolderIcon, PanelLeft } from 'lucide-react';
import { CHAT_HANDOFF_EVENT, ChatHandoff, ImageItem } from '@/lib/chatHandoff';
import { useThreads, getStoredActiveConversationId, persistActiveConversationId } from '@/hooks/useThreads';
import { useSession } from '@/hooks/useSession';
import { appController, AppControllerArgs, ToolResult } from '@/controllers/appController';
import { ContactFeedbackPanel } from '@/components/contact-feedback/ContactFeedbackPanel';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { MotionBackground } from '@/components/ui/MotionBackground';
import { CustomCursor, ScrollProgressBar, AmbientMeshBackground } from '@/components/motion';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';

function App() {
  const { sessionId } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [isFpsModalOpen, setIsFpsModalOpen] = useState(false);
  const [isWallpaperPickerOpen, setIsWallpaperPickerOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isVeo3ModalOpen, setIsVeo3ModalOpen] = useState(false);
  const [isDevicePermissionsOpen, setIsDevicePermissionsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelType>('chat');
  const {
    createThread,
    deleteThread,
    deleteAllConversations,
    saveMessage,
    saveConversation,
    loadConversation,
    getThreadMessages,
    threads,
    renameThread,
    togglePinThread,
    toggleFavoriteThread,
    toggleArchiveThread,
    duplicateThread,
    updateThreadMessages,
  } = useThreads(sessionId);

  const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlThread = params.get('thread');
      if (urlThread) return urlThread;
      const storedActive = getStoredActiveConversationId();
      if (storedActive) return storedActive;
    }
    return null;
  });
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ImageItem[]>([]);
  const [pendingMode, setPendingMode] = useState<'chat' | 'search' | 'research'>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [newChatCounter, setNewChatCounter] = useState(0);

  // Listen for Image Panel → Chat handoffs
  useEffect(() => {
    const handleHandoff = (e: Event) => {
      const customEvent = e as CustomEvent<ChatHandoff>;
      if (customEvent.detail) {
        const { text, images } = customEvent.detail;
        setPendingQuery(text || (images.length > 0 ? 'Discussing attached image' : ''));
        setPendingImages(images || []);
        setActivePanel('chat');
      }
    };
    window.addEventListener(CHAT_HANDOFF_EVENT, handleHandoff);

    const handleOpenFps = () => setIsFpsModalOpen(true);
    window.addEventListener('open_fps_boost', handleOpenFps);

    const handleOpenWallpaper = () => setIsWallpaperPickerOpen(true);
    window.addEventListener('open_wallpaper_studio', handleOpenWallpaper);

    const handleOpenCmdPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener('open_command_palette', handleOpenCmdPalette);

    const handleOpenVeo3 = () => setIsVeo3ModalOpen(true);
    window.addEventListener('open_veo3_animator', handleOpenVeo3);

    const handleToggleActivityLog = () => setIsActivityLogOpen(prev => !prev);
    window.addEventListener('toggle_agent_activity_log', handleToggleActivityLog);

    const handleOpenActivityLog = () => setIsActivityLogOpen(true);
    window.addEventListener('open_agent_activity_log', handleOpenActivityLog);

    const handleOpenVoiceHistory = () => setActivePanel('voice-history');
    window.addEventListener('open_voice_history', handleOpenVoiceHistory);

    return () => {
      window.removeEventListener(CHAT_HANDOFF_EVENT, handleHandoff);
      window.removeEventListener('open_fps_boost', handleOpenFps);
      window.removeEventListener('open_wallpaper_studio', handleOpenWallpaper);
      window.removeEventListener('open_command_palette', handleOpenCmdPalette);
      window.removeEventListener('toggle_agent_activity_log', handleToggleActivityLog);
      window.removeEventListener('open_agent_activity_log', handleOpenActivityLog);
      window.removeEventListener('open_voice_history', handleOpenVoiceHistory);
    };
  }, []);

  // History panel toggle
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSearchStart = useCallback(async (query: string, mode: 'chat' | 'search' | 'research') => {
    try {
      const isSearch = mode === 'search' || mode === 'research';
      const thread = await createThread(query, sessionId, mode, isSearch);
      if (thread && thread.id) {
        setPendingQuery(query);
        setPendingMode(mode);
        setCurrentThreadId(thread.id);
        persistActiveConversationId(thread.id);
        setActivePanel('chat');
        return thread.id;
      }
      throw new Error('Thread creation returned empty result');
    } catch (error) {
      console.warn('Error creating thread (expected fallback to local storage):', error);
      return '';
    }
  }, [createThread, sessionId]);

  const handleNewThread = useCallback(() => {
    persistActiveConversationId(null);
    setCurrentThreadId(null);
    setInitialMessages([]);
    setPendingQuery(null);
    setPendingMode('chat');
    setActivePanel('chat');
    setIsHistoryOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    setNewChatCounter(prev => prev + 1);
  }, []);

  const handleSelectThread = useCallback(async (threadId: string) => {
    if (!threadId) return;
    setActivePanel('chat');

    // Close side panels immediately on mobile so the conversation is shown
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    setIsHistoryOpen(false);

    // 1. Instantly set active conversation ID
    setCurrentThreadId(threadId);
    persistActiveConversationId(threadId);

    // 2. Immediately retrieve cached/stored messages for instant render
    const storedConv = threads.find(t => t.id === threadId);
    if (storedConv && storedConv.messages && storedConv.messages.length > 0) {
      setInitialMessages(storedConv.messages);
    }

    // 3. Load full conversation messages asynchronously to ensure all attachments and parts are synced
    try {
      const conversation = await loadConversation(threadId);
      if (conversation && conversation.messages) {
        setInitialMessages(conversation.messages);
      } else {
        const fallbackMsgs = await getThreadMessages(threadId);
        if (fallbackMsgs && fallbackMsgs.length > 0) {
          setInitialMessages(fallbackMsgs);
        }
      }
    } catch (error) {
      console.warn('Error loading conversation:', error);
    }
  }, [threads, loadConversation, getThreadMessages]);

  const handleDeleteThread = useCallback(async (threadId: string) => {
    setIsLoading(true);
    setLoadingMessage('Deleting thread...');
    try {
      await deleteThread(threadId);
      toast.success('Conversation deleted', { duration: 2000 });
      if (currentThreadId === threadId) {
        handleNewThread();
      }
    } catch (error) {
      console.warn('Error deleting thread:', error);
      toast.error('Failed to delete conversation', { duration: 2000 });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [deleteThread, currentThreadId, handleNewThread]);

  const handleDeleteAllThreads = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Deleting all conversations...');
    try {
      await deleteAllConversations();
      handleNewThread();
      toast.success('All conversations deleted', { duration: 2000 });
    } catch (error) {
      console.warn('Error deleting all conversations:', error);
      toast.error('Failed to delete conversations', { duration: 2000 });
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [deleteAllConversations, handleNewThread]);

  const handleClearPendingQuery = useCallback(() => {
    setPendingQuery(null);
    setPendingImages([]);
  }, []);

  const currentThreadTitle = useMemo(() => {
    if (!currentThreadId) return 'AI Chat UI Repos';
    return threads.find(t => t.id === currentThreadId)?.title || 'AI Chat UI Repos';
  }, [threads, currentThreadId]);

  // Restore conversation from URL query param or active session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadIdFromUrl = params.get('thread');
    const storedActiveId = getStoredActiveConversationId();
    const targetId = threadIdFromUrl || storedActiveId;
    if (targetId) {
      handleSelectThread(targetId);
    }
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K or Cmd+P / Ctrl+P for Command Palette, Cmd+H / Ctrl+H for History)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'p')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsHistoryOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update URL search params when currentThreadId changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (currentThreadId && activePanel === 'chat') {
      params.set('thread', currentThreadId);
    } else {
      params.delete('thread');
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }, [currentThreadId, activePanel]);

  // Global listener to seamlessly open Google Maps Agent from Navigation Widgets & Cards
  useEffect(() => {
    const handleOpenMapsAgent = (_e: Event) => {
      setActivePanel('maps');
    };
    window.addEventListener('OPEN_MAPS_AGENT', handleOpenMapsAgent);
    return () => window.removeEventListener('OPEN_MAPS_AGENT', handleOpenMapsAgent);
  }, []);

  // Central App Controller action handler registrations
  useEffect(() => {
    appController.registerHandler('switch_tab', (args) => {
      const target = (args.tab || args.target || 'chat') as PanelType;
      setActivePanel(target);
      return { success: true, action: 'switch_tab', tab: target, message: `Switched tab to ${target}` };
    });

    appController.registerHandler('open_panel', (args) => {
      const target = (args.target || 'chat') as PanelType;
      if (target === 'history' as any) {
        setIsHistoryOpen(true);
      } else if (target === 'settings' as any) {
        setIsSettingsModalOpen(true);
      } else if (target === 'app_launcher' as any) {
        setIsAppLauncherOpen(true);
      } else if (target === 'fps_boost' as any) {
        setIsFpsModalOpen(true);
      } else if (target === 'wallpaper' as any) {
        setIsWallpaperPickerOpen(true);
      } else {
        setActivePanel(target);
      }
      return { success: true, action: 'open_panel', target, message: `Opened panel ${target}` };
    });

    appController.registerHandler('close_panel', (args) => {
      const target = args.target;
      if (target === 'history') {
        setIsHistoryOpen(false);
      } else if (target === 'settings') {
        setIsSettingsModalOpen(false);
      } else if (target === 'sidebar') {
        setIsSidebarOpen(false);
      } else {
        setActivePanel('chat');
      }
      return { success: true, action: 'close_panel', target, message: `Closed panel ${target}` };
    });

    appController.registerHandler('toggle_panel', (args) => {
      const target = args.target || 'history';
      if (target === 'history') {
        setIsHistoryOpen(prev => !prev);
      } else if (target === 'settings') {
        setIsSettingsModalOpen(prev => !prev);
      } else if (target === 'sidebar') {
        setIsSidebarOpen(prev => !prev);
      } else if (target === 'contact-feedback') {
        setActivePanel(prev => prev === 'contact-feedback' ? 'chat' : 'contact-feedback');
      } else {
        setActivePanel(prev => prev === target ? 'chat' : (target as PanelType));
      }
      return { success: true, action: 'toggle_panel', target, message: `Toggled panel ${target}` };
    });

    appController.registerHandler('open_settings', () => {
      setIsSettingsModalOpen(true);
      return { success: true, action: 'open_settings', message: 'Settings modal opened' };
    });

    appController.registerHandler('open_history', () => {
      setIsHistoryOpen(true);
      return { success: true, action: 'open_history', message: 'History panel opened' };
    });

    appController.registerHandler('start_new_chat', () => {
      handleNewThread();
      return { success: true, action: 'start_new_chat', message: 'New chat started' };
    });

    appController.registerHandler('select_chat', (args) => {
      const id = args.chatId || args.target;
      if (id) {
        handleSelectThread(id);
        return { success: true, action: 'select_chat', chatId: id, message: `Selected chat ${id}` };
      }
      return { success: false, action: 'select_chat', error: 'No chatId provided' };
    });

    appController.registerHandler('rename_chat', (args) => {
      const id = args.chatId || args.target || currentThreadId;
      const newTitle = args.value ? String(args.value) : 'Renamed Chat';
      if (id) {
        renameThread(id, newTitle);
        return { success: true, action: 'rename_chat', chatId: id, value: newTitle, message: `Renamed chat to ${newTitle}` };
      }
      return { success: false, action: 'rename_chat', error: 'No chatId found' };
    });

    appController.registerHandler('delete_chat', (args) => {
      const id = args.chatId || args.target || currentThreadId;
      if (args.target === 'all') {
        handleDeleteAllThreads();
        return { success: true, action: 'delete_chat', target: 'all', message: 'All conversations deleted' };
      }
      if (id) {
        handleDeleteThread(id);
        return { success: true, action: 'delete_chat', chatId: id, message: `Deleted chat ${id}` };
      }
      return { success: false, action: 'delete_chat', error: 'No chat ID found to delete' };
    });

    appController.registerHandler('pin_chat', (args) => {
      const id = args.chatId || args.target || currentThreadId;
      if (id) {
        togglePinThread(id);
        return { success: true, action: 'pin_chat', chatId: id, message: `Pinned chat ${id}` };
      }
      return { success: false, action: 'pin_chat', error: 'No chatId provided' };
    });

    appController.registerHandler('unpin_chat', (args) => {
      const id = args.chatId || args.target || currentThreadId;
      if (id) {
        togglePinThread(id);
        return { success: true, action: 'unpin_chat', chatId: id, message: `Unpinned chat ${id}` };
      }
      return { success: false, action: 'unpin_chat', error: 'No chatId provided' };
    });

    appController.registerHandler('scroll_chat', (args) => {
      const direction = args.value || 'down';
      window.dispatchEvent(new CustomEvent('SCROLL_CHAT', { detail: { direction } }));
      return { success: true, action: 'scroll_chat', value: direction, message: `Scrolled chat ${direction}` };
    });

    appController.registerHandler('focus_input', () => {
      window.dispatchEvent(new CustomEvent('FOCUS_CHAT_INPUT'));
      return { success: true, action: 'focus_input', message: 'Focused chat input' };
    });

    appController.registerHandler('clear_input', () => {
      window.dispatchEvent(new CustomEvent('CLEAR_CHAT_INPUT'));
      return { success: true, action: 'clear_input', message: 'Cleared chat input' };
    });

    appController.registerHandler('toggle_sidebar', (args) => {
      if (args.value !== undefined) {
        setIsSidebarOpen(Boolean(args.value));
      } else {
        setIsSidebarOpen(prev => !prev);
      }
      return { success: true, action: 'toggle_sidebar', message: 'Toggled sidebar' };
    });

    appController.registerHandler('toggle_voice', () => {
      window.dispatchEvent(new CustomEvent('TOGGLE_VOICE_MODE'));
      return { success: true, action: 'toggle_voice', message: 'Toggled voice mode' };
    });

    appController.registerHandler('stop_voice', () => {
      window.dispatchEvent(new CustomEvent('STOP_VOICE_MODE'));
      return { success: true, action: 'stop_voice', message: 'Stopped voice mode' };
    });
  }, [currentThreadId, deleteThread, renameThread, togglePinThread]);

  return (
    <div className="relative min-h-screen bg-transparent flex flex-col font-sans text-foreground selection:bg-primary/10 selection:text-primary overflow-x-clip">
      {/* Precision fluid custom cursor for desktop (Feature 2) */}
      <CustomCursor />

      {/* Top 2px smooth glowing scroll progress bar (Feature 15) */}
      <ScrollProgressBar />

      {/* Performance-optimized continuous video/dynamic background loop with ambient mesh (Feature 14) */}
      <MotionBackground />
      <AmbientMeshBackground />

      {/* Subtask Failure Toast Notification Listener */}
      <SubtaskFailureToastListener />

      {/* Asynchronous Startup API Health Check Service Listener */}
      <StartupApiHealthListener />

      <Toaster position="top-center" />
      <OfflineIndicator />
      <LoadingIndicator isVisible={isLoading} message={loadingMessage} />

      {/* Command Palette Modal (Scans all conversations & memories) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        threads={threads}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteAllThreads={handleDeleteAllThreads}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAppLauncher={() => setIsAppLauncherOpen(true)}
        onSelectFeature={(feat) => {
          if (feat === 'veo3_video') {
            setIsVeo3ModalOpen(true);
          } else {
            setActivePanel(feat as PanelType);
          }
        }}
        onAskAboutContent={(text) => {
          setPendingQuery(`Regarding this saved knowledge / interaction:\n"${text}"\n\nCan you explain or build upon this?`);
          setActivePanel('chat');
        }}
      />

      {/* App Launcher Modal */}
      <AppLauncherModal
        isOpen={isAppLauncherOpen}
        onClose={() => setIsAppLauncherOpen(false)}
        onSelectApp={(app) => {
          if (app.id === 'fps_boost') {
            setIsFpsModalOpen(true);
          } else if (app.id === 'wallpaper_studio') {
            setIsWallpaperPickerOpen(true);
          } else if (app.id === 'rishi_comm') {
            setActivePanel('comm');
            setIsAppLauncherOpen(false);
          }
        }}
      />

      {/* Experimental FPS Controller Modal */}
      <FpsBoostModal
        isOpen={isFpsModalOpen}
        onClose={() => setIsFpsModalOpen(false)}
      />

      {/* Dynamic Wallpaper & Video Studio Modal */}
      <WallpaperPickerModal
        isOpen={isWallpaperPickerOpen}
        onClose={() => setIsWallpaperPickerOpen(false)}
      />

      {/* Veo 3 Image-to-Video Animator Modal */}
      <Veo3ImageToVideoModal
        isOpen={isVeo3ModalOpen}
        onClose={() => setIsVeo3ModalOpen(false)}
      />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Contact & Feedback Panel */}
      <ContactFeedbackPanel
        isOpen={activePanel === 'contact-feedback'}
        onClose={() => setActivePanel('chat')}
        sessionId={sessionId}
        activePanel={activePanel}
      />

      {/* AI Device Permissions & Sandboxed Agent Modal */}
      <AIDevicePermissionsModal
        isOpen={isDevicePermissionsOpen}
        onClose={() => setIsDevicePermissionsOpen(false)}
      />

      {/* History panel */}
      <HistoryPanel
        threads={threads}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
        onDeleteAllThreads={handleDeleteAllThreads}
        onRenameThread={renameThread}
        onPinThread={togglePinThread}
        onFavoriteThread={toggleFavoriteThread}
        onArchiveThread={toggleArchiveThread}
        onDuplicateThread={duplicateThread}
        currentThreadId={currentThreadId ?? undefined}
        onNewThread={handleNewThread}
        onOpenAppLauncher={() => setIsAppLauncherOpen(true)}
        onSelectFeature={(feat) => setActivePanel(feat as PanelType)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onToggle={() => setIsSidebarOpen(prev => !prev)}
        onNewThread={handleNewThread}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
        onDeleteAllThreads={handleDeleteAllThreads}
        threads={threads}
        onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
        onOpenAppLauncher={() => setIsAppLauncherOpen(true)}
        activeFeature={activePanel}
        onSelectFeature={(feat) => setActivePanel(feat as PanelType)}
        currentThreadId={currentThreadId ?? undefined}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenPermissions={() => setIsDevicePermissionsOpen(true)}
      />

      {/* Floating Toggle Button when Sidebar is closed on dedicated panels */}
      <AnimatePresence>
        {!isSidebarOpen && activePanel !== 'chat' && (
          <motion.button
            id="sidebar-expand-floating-trigger"
            initial={{ x: -50, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -50, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed left-3 top-3.5 z-40 p-2.5 rounded-2xl bg-black/80 hover:bg-black text-white/80 hover:text-white border border-white/15 backdrop-blur-xl shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 group"
            title="Open Sidebar"
          >
            <PanelLeft size={18} className="text-white/80 group-hover:text-cyan-400 transition-colors" />
            <span className="text-xs font-semibold hidden md:inline pr-1">Sidebar</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isSidebarOpen ? "lg:pl-72" : "lg:pl-0"
        )}
      >
        <ErrorBoundary fallbackTitle="Panel View Error">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel === 'chat' ? (currentThreadId ? currentThreadId : `new_${newChatCounter}`) : activePanel}
              initial={{ opacity: 0, y: 8, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.995 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 32,
                mass: 0.7,
              }}
              className="flex-1 flex flex-col min-w-0 w-full h-full"
            >
              {activePanel === 'manus' ? (
                <div className="flex-1 overflow-y-auto">
                  <div className="sticky top-0 z-30 px-6 py-3 bg-black/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActivePanel('chat')}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                      >
                        ← Back to Rishi AI
                      </button>
                      <span className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
                        ✨ Manus Autonomous Agent Mode
                      </span>
                    </div>
                  </div>
                  <ManusAgentPanel onSearchStart={handleSearchStart} />
                </div>
              ) : activePanel === 'comm' ? (
                <CommunicationsHub onBackToChat={() => setActivePanel('chat')} />
              ) : activePanel === 'images' ? (
                <ImagesUI onBackToChat={() => setActivePanel('chat')} />
              ) : activePanel === 'library' ? (
                <LibraryUI
                  onBackToChat={() => setActivePanel('chat')}
                  onSelectThread={(threadId) => {
                    handleSelectThread(threadId);
                    setActivePanel('chat');
                  }}
                />
              ) : activePanel === 'projects' ? (
                <ProjectsUI
                  onBackToChat={() => setActivePanel('chat')}
                  onSelectProject={() => {
                    handleNewThread();
                    setActivePanel('chat');
                  }}
                />
              ) : activePanel === 'maps' ? (
                <GoogleAgentsHub
                  initialMode="maps"
                  onBackToChat={() => setActivePanel('chat')}
                />
              ) : activePanel === 'search-agent' ? (
                <GoogleAgentsHub
                  initialMode="search"
                  onBackToChat={() => setActivePanel('chat')}
                />
              ) : activePanel === 'discover' ? (
                <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
                  <DiscoverPage
                    onBackToChat={() => setActivePanel('chat')}
                    onSearchInChat={(q) => {
                      setPendingQuery(q);
                      setActivePanel('chat');
                    }}
                  />
                </div>
              ) : activePanel === 'resources' ? (
                <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                  <ResourceSearchUI
                    onSearchInChat={(q) => {
                      setPendingQuery(q);
                      setActivePanel('chat');
                    }}
                  />
                </div>
              ) : activePanel === 'voice-history' ? (
                <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full h-[calc(100vh-2rem)]">
                  <VoiceHistoryPanel
                    onSendToChat={(q) => {
                      setPendingQuery(q);
                      setActivePanel('chat');
                    }}
                  />
                </div>
              ) : (
                <ChatInterface
                  key={currentThreadId ? currentThreadId : `new_${newChatCounter}`}
                  initialMessages={initialMessages}
                  threadId={currentThreadId || undefined}
                  threadTitle={currentThreadTitle}
                  onSearchStart={handleSearchStart}
                  onMessageComplete={saveMessage}
                  onUserMessage={saveMessage}
                  onUpdateThreadMessages={updateThreadMessages}
                  pendingQuery={pendingQuery}
                  pendingImages={pendingImages}
                  onClearPendingQuery={handleClearPendingQuery}
                  pendingMode={pendingMode}
                  sessionId={sessionId}
                  onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  isSidebarOpen={isSidebarOpen}
                  onNewThread={handleNewThread}
                  onDeleteThread={() => currentThreadId && handleDeleteThread(currentThreadId)}
                  onOpenAppLauncher={() => setIsAppLauncherOpen(true)}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </div>

      {/* Ruflo Multi-Agent Activity Log & Telemetry Side Panel */}
      <AnimatePresence>
        {isActivityLogOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="activity-log-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
              onClick={() => setIsActivityLogOpen(false)}
            />

            {/* Slide-in Panel Container */}
            <motion.div
              key="activity-log-panel"
              initial={{ x: '100%', opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.4 }}
              transition={{
                type: 'spring',
                damping: 32,
                stiffness: 340,
                mass: 0.75,
              }}
              className="fixed top-0 right-0 bottom-0 z-50 flex shadow-2xl transform-gpu will-change-transform"
              onClick={e => e.stopPropagation()}
            >
              <AgentActivityLogPanel
                isOpen={isActivityLogOpen}
                onClose={() => setIsActivityLogOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
