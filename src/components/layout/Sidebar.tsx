import React, { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  MessageSquare,
  X,
  Trash2,
  PanelLeftClose,
  ChevronDown,
  ChevronUp,
  Pin,
  Clock,
  HelpCircle,
} from 'lucide-react';
import {
  SearchIcon,
  GlobeIcon,
  LibraryIcon,
  ProjectsIcon,
  VoiceIcon,
} from '@/components/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Thread, isSearchThread } from '@/hooks/useThreads';
import { toast } from 'sonner';
import { ProfileAvatarButton } from './ProfileAvatarButton';
import { ServiceHealthWidget } from '@/components/settings/ServiceHealthWidget';
import { useSystemPerformance } from '@/hooks/useSystemPerformance';
import { AnimatedNavIndicator } from '@/components/motion';
import { isToday, isYesterday, differenceInDays } from 'date-fns';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
  onNewThread: () => void;
  onSelectThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onDeleteAllThreads?: () => void;
  className?: string;
  threads: Thread[];
  onToggleHistory: () => void;
  activeFeature?: string;
  onSelectFeature?: (feature: string) => void;
  currentThreadId?: string;
  onOpenAppLauncher?: () => void;
  onOpenSettings?: () => void;
  onOpenPermissions?: () => void;
}

// Memoized Thread Item Row for 60 FPS list performance
const SidebarThreadItem = React.memo<{
  thread: Thread;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}>(({ thread, isActive, onSelect, onDelete, onClose }) => {
  const isSearch = isSearchThread(thread);

  return (
    <div
      onClick={() => {
        onSelect(thread.id);
        if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
          onClose();
        }
      }}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-normal transition-all duration-200 ease-in-out cursor-pointer group relative",
        isActive
          ? "bg-[#1c1c1e] text-white font-medium shadow-sm"
          : "text-white/90 hover:bg-white/8 hover:text-white"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
        {isSearch ? (
          <GlobeIcon className="w-4 h-4 shrink-0 text-blue-400 transition-opacity duration-200" />
        ) : (
          <MessageSquare size={15} className="shrink-0 text-white/50 transition-opacity duration-200" />
        )}
        <span className="truncate">{thread.title || 'Untitled Chat'}</span>
        {isSearch && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0 transition-opacity duration-200"
            title="Search Context"
          >
            Search
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(thread.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 rounded transition-opacity duration-200 shrink-0"
        title="Delete chat"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
});

SidebarThreadItem.displayName = 'SidebarThreadItem';

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen = true,
  onClose,
  onToggle,
  onNewThread,
  onSelectThread,
  onDeleteThread,
  onDeleteAllThreads,
  className,
  threads,
  activeFeature,
  onSelectFeature,
  currentThreadId,
  onOpenSettings,
  onOpenPermissions,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllRecents, setShowAllRecents] = useState(false);
  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(false);
  const [isRecentsCollapsed, setIsRecentsCollapsed] = useState(false);
  const [collapsedDateGroups, setCollapsedDateGroups] = useState<Record<string, boolean>>({});
  const { fps, shouldPauseHeavyAnimations } = useSystemPerformance();

  // Global Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B' || e.key === '\\')) {
        e.preventDefault();
        if (onToggle) {
          onToggle();
        } else if (isOpen && onClose) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onToggle]);

  // Lock body scroll on mobile when sidebar is open to prevent background scrolling
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 1024;
    if (isOpen && isMobile) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Filter threads by search query
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    return threads.filter(t =>
      (t.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [threads, searchQuery]);

  const pinnedThreads = useMemo(() => {
    return filteredThreads.filter(t => t.isPinned);
  }, [filteredThreads]);

  const recentThreads = useMemo(() => {
    return filteredThreads.filter(t => !t.isPinned);
  }, [filteredThreads]);

  // Group recents into collapsible time categories
  const groupedRecents = useMemo(() => {
    const groups: { label: string; items: Thread[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'Previous 7 Days', items: [] },
      { label: 'Older', items: [] },
    ];

    recentThreads.forEach(t => {
      const dateStr = t.updatedAt || t.updated_at || t.createdAt || t.created_at || new Date().toISOString();
      const date = new Date(dateStr);
      if (isToday(date)) {
        groups[0].items.push(t);
      } else if (isYesterday(date)) {
        groups[1].items.push(t);
      } else if (differenceInDays(new Date(), date) <= 7) {
        groups[2].items.push(t);
      } else {
        groups[3].items.push(t);
      }
    });

    return groups.filter(g => g.items.length > 0);
  }, [recentThreads]);

  const toggleDateGroup = (label: string) => {
    setCollapsedDateGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleFeatureClick = (featureId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
      onClose();
    }
    if (featureId === 'images') {
      toast.info('Images Mode Selected');
      if (onSelectFeature) onSelectFeature('images');
    } else if (featureId === 'library') {
      toast.info('Viewing Chat Library');
      if (onSelectFeature) onSelectFeature('library');
    } else if (featureId === 'projects') {
      toast.info('Projects Workspace Active');
      if (onSelectFeature) onSelectFeature('projects');
    } else if (featureId === 'plugins') {
      toast.info('AI Plugins Manager Active');
      if (onSelectFeature) onSelectFeature('plugins');
    } else if (featureId === 'maps') {
      toast.info('Google Maps AI Agent Active');
      if (onSelectFeature) onSelectFeature('maps');
    } else if (featureId === 'search-agent') {
      toast.info('Google Search AI Agent Active');
      if (onSelectFeature) onSelectFeature('search-agent');
    } else if (featureId === 'resources') {
      toast.info('Resources & Google Search Hub Active');
      if (onSelectFeature) onSelectFeature('resources');
    } else if (featureId === 'comm') {
      toast.info('Real-Time Messages & Calls Active');
      if (onSelectFeature) onSelectFeature('comm');
    } else if (featureId === 'discover') {
      toast.info('Discover News & Topics Active');
      if (onSelectFeature) onSelectFeature('discover');
    } else if (featureId === 'manus') {
      toast.info('Autonomous Agent Mode Active');
      if (onSelectFeature) onSelectFeature('manus');
    } else if (featureId === 'voice-history') {
      toast.info('Voice History & Transcripts Active');
      if (onSelectFeature) onSelectFeature('voice-history');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop for responsive drawer */}
          <motion.div
            id="sidebar-mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 lg:hidden"
            aria-hidden="true"
          />

          {/* Animated Sidebar with Mobile Touch Drag-to-Dismiss */}
          <motion.aside
            id="main-app-sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            drag={typeof window !== 'undefined' && window.innerWidth < 1024 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.5, right: 0.05 }}
            onDragEnd={(_e, info) => {
              if ((info.offset.x < -60 || info.velocity.x < -250) && onClose) {
                onClose();
              }
            }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 280,
              mass: 0.8,
            }}
            className={cn(
              "fixed left-0 top-0 bottom-0 h-[100dvh] w-[82vw] max-w-[300px] sm:w-72 flex flex-col z-[60] lg:z-30",
              "bg-[#0d0d12]/95 backdrop-blur-2xl text-white border-r border-white/10 shadow-2xl select-none font-sans transform-gpu will-change-transform overscroll-contain",
              className
            )}
          >
            {/* Mobile swipe dismiss indicator */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-9 rounded-full bg-white/15 lg:hidden pointer-events-none" />

            {/* Header with App Brand, Search Trigger & Collapse Toggle */}
            <div id="sidebar-header" className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Rishi</h1>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="sidebar-search-toggle-btn"
                  onClick={() => {
                    setIsSearching(!isSearching);
                    if (isSearching) setSearchQuery('');
                  }}
                  className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white flex items-center justify-center transition-all duration-200 ease-in-out cursor-pointer"
                  title="Search chats"
                >
                  {isSearching ? <X size={16} /> : <SearchIcon className="w-4 h-4 text-white" />}
                </button>

                {onClose && (
                  <button
                    id="sidebar-collapse-btn"
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 ease-in-out cursor-pointer"
                    title="Collapse sidebar"
                  >
                    <PanelLeftClose size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Inline Search Bar */}
            {isSearching && (
              <div id="sidebar-inline-search" className="px-5 pb-3 transition-opacity duration-200">
                <div className="relative flex items-center">
                  <SearchIcon className="w-4 h-4 absolute left-3 text-white/40" />
                  <input
                    id="sidebar-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    autoFocus
                    className="w-full bg-[#1c1c1e] text-white text-sm rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:outline-none focus:border-blue-500 placeholder-white/40 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Mode & Navigation Consolidated Menu */}
            <div id="sidebar-nav-menu" className="px-3 py-1 space-y-0.5 relative">
              <button
                id="sidebar-new-chat-btn"
                onClick={() => {
                  onNewThread();
                  if (onSelectFeature) onSelectFeature('chat');
                  if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
                    onClose();
                  }
                }}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'chat' || !activeFeature ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {(activeFeature === 'chat' || !activeFeature) && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 text-white/90 group-hover:scale-110 transition-transform">
                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                  <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                </svg>
                <span>New chat</span>
              </button>

              <button
                id="sidebar-discover-btn"
                onClick={() => handleFeatureClick('discover')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'discover' ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {activeFeature === 'discover' && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <Compass size={17} className="shrink-0 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Discover</span>
              </button>

              <button
                id="sidebar-search-agent-btn"
                onClick={() => handleFeatureClick('search-agent')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'search-agent' ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {activeFeature === 'search-agent' && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <GlobeIcon className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Search Agent</span>
              </button>

              <button
                id="sidebar-library-btn"
                onClick={() => handleFeatureClick('library')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'library' ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {activeFeature === 'library' && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <LibraryIcon className="w-4 h-4 shrink-0 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>Library</span>
              </button>

              <button
                id="sidebar-projects-btn"
                onClick={() => handleFeatureClick('projects')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'projects' ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {activeFeature === 'projects' && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <ProjectsIcon className="w-4 h-4 shrink-0 text-blue-300 group-hover:scale-110 transition-transform" />
                <span>Projects</span>
              </button>

              <button
                id="sidebar-voice-history-btn"
                onClick={() => handleFeatureClick('voice-history')}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer group select-none motion-hover-lift",
                  activeFeature === 'voice-history' ? "text-white font-medium" : "text-white/80 hover:text-white"
                )}
              >
                {activeFeature === 'voice-history' && (
                  <AnimatedNavIndicator layoutId="sidebar-active-indicator" />
                )}
                <VoiceIcon className="w-4 h-4 shrink-0 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Voice History</span>
              </button>
            </div>

            {/* Main Threads List Area with Smooth Custom Theme Scrollbar */}
            <div id="sidebar-threads-scroll" className="flex-1 overflow-y-auto px-4 py-2 space-y-4 sidebar-scrollbar transition-opacity duration-200">
              {/* Pinned Section with Collapsible Toggle */}
              {pinnedThreads.length > 0 && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setIsPinnedCollapsed(prev => !prev)}
                    className="w-full px-2 py-1 flex items-center justify-between text-left rounded-lg hover:bg-white/5 transition-colors cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70 group-hover:text-white">
                      <Pin size={12} className="text-amber-400/80 shrink-0" />
                      <span>Pinned</span>
                      <span className="text-[10px] text-white/40 font-mono px-1.5 py-0.2 rounded-full bg-white/5">
                        {pinnedThreads.length}
                      </span>
                    </div>
                    <span className="text-white/40 group-hover:text-white transition-transform">
                      {isPinnedCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {!isPinnedCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-0.5 overflow-hidden"
                      >
                        {pinnedThreads.map((thread) => {
                          const isSearch = isSearchThread(thread);
                          return (
                            <div
                              key={thread.id}
                              onClick={() => {
                                onSelectThread(thread.id);
                                if (typeof window !== 'undefined' && window.innerWidth < 1024 && onClose) {
                                  onClose();
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-normal transition-all duration-200 ease-in-out cursor-pointer group relative",
                                currentThreadId === thread.id
                                  ? "bg-[#1c1c1e] text-white font-medium shadow-sm"
                                  : "text-white/90 hover:bg-white/8 hover:text-white"
                              )}
                            >
                              {isSearch ? (
                                <GlobeIcon className="w-4 h-4 shrink-0 text-blue-400 transition-opacity duration-200" />
                              ) : (
                                <MessageSquare size={15} className="shrink-0 text-white/60 transition-opacity duration-200" />
                              )}
                              <span className="truncate flex-1">{thread.title || 'Untitled Chat'}</span>
                              {isSearch && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0 transition-opacity duration-200"
                                  title="Search Context"
                                >
                                  Search
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteThread(thread.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 rounded transition-opacity duration-200 shrink-0"
                                title="Delete chat"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Recents Section with Collapsible Time Groups */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <button
                    type="button"
                    onClick={() => setIsRecentsCollapsed(prev => !prev)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer group select-none"
                  >
                    <Clock size={12} className="text-cyan-400/80 shrink-0" />
                    <span>Recents</span>
                    <span className="text-[10px] text-white/40 font-mono px-1.5 py-0.2 rounded-full bg-white/5">
                      {recentThreads.length}
                    </span>
                    <span className="text-white/40 group-hover:text-white ml-0.5">
                      {isRecentsCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </span>
                  </button>

                  {recentThreads.length > 0 && !isRecentsCollapsed && (
                    <button
                      type="button"
                      onClick={() => setShowAllRecents(prev => !prev)}
                      className="text-[11px] text-white/40 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {showAllRecents ? 'Collapse' : 'Show all'}
                    </button>
                  )}
                </div>

                {!isRecentsCollapsed && (
                  recentThreads.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-white/40 italic">
                      No recent conversations
                    </div>
                  ) : searchQuery.trim() ? (
                    <div className="space-y-0.5">
                      {recentThreads.map((thread) => (
                        <SidebarThreadItem
                          key={thread.id}
                          thread={thread}
                          isActive={currentThreadId === thread.id}
                          onSelect={onSelectThread}
                          onDelete={onDeleteThread}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {groupedRecents.map((group) => {
                        const isGroupCollapsed = collapsedDateGroups[group.label];
                        const displayedItems = showAllRecents ? group.items : group.items.slice(0, 5);

                        return (
                          <div key={group.label} className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => toggleDateGroup(group.label)}
                              className="w-full px-2 py-0.5 flex items-center justify-between text-left text-[10px] font-bold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors cursor-pointer select-none"
                            >
                              <span>{group.label}</span>
                              <div className="flex items-center gap-1">
                                <span>{group.items.length}</span>
                                {isGroupCollapsed ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                              </div>
                            </button>

                            <AnimatePresence initial={false}>
                              {!isGroupCollapsed && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-0.5 overflow-hidden"
                                >
                                  {displayedItems.map((thread) => (
                                    <SidebarThreadItem
                                      key={thread.id}
                                      thread={thread}
                                      isActive={currentThreadId === thread.id}
                                      onSelect={onSelectThread}
                                      onDelete={onDeleteThread}
                                      onClose={onClose}
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Service Health Widget */}
            <div className="px-3 pb-2 pt-1 border-t border-white/5">
              <ServiceHealthWidget />
            </div>

            {/* Bottom Profile & Settings Bar */}
            <div id="sidebar-footer" className="p-3 border-t border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings();
                  if (onClose) onClose();
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/8 transition-colors duration-200 text-left flex-1 min-w-0 cursor-pointer"
              >
                <ProfileAvatarButton asDiv size="sm" />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-white/90 truncate">Account & Settings</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectFeature) onSelectFeature('contact-feedback');
                  if (onClose) onClose();
                }}
                title="Contact & Feedback"
                className="p-2 rounded-xl text-white/60 hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <HelpCircle size={17} />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};


