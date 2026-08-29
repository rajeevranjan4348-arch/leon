import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trash2, 
  MessageSquare, 
  Pin, 
  Star, 
  Archive, 
  Edit2, 
  MoreVertical, 
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SearchIcon,
  GlobeIcon,
  VoiceIcon,
  LibraryIcon,
  ProjectsIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
} from '@/components/icons';
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  differenceInDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Thread, isSearchThread } from '@/hooks/useThreads';
import { toast } from 'sonner';
import { ProfileAvatarButton } from './ProfileAvatarButton';

interface HistoryPanelProps {
  threads: Thread[];
  isOpen: boolean;
  onClose: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onDeleteAllThreads?: () => void;
  onRenameThread?: (id: string, newTitle: string) => void;
  onPinThread?: (id: string) => void;
  onFavoriteThread?: (id: string) => void;
  onArchiveThread?: (id: string) => void;
  onDuplicateThread?: (id: string) => void;
  currentThreadId?: string;
  onNewThread?: () => void;
  onOpenAppLauncher?: () => void;
  onSelectFeature?: (feature: string) => void;
  onOpenSettings?: () => void;
}

type DateGroup = 'Pinned' | 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'Older';
type FilterTab = 'all' | 'searches' | 'voice' | 'pinned' | 'favorites' | 'archived';

function getDateGroup(thread: Thread): DateGroup {
  if (thread.isPinned) return 'Pinned';
  const dateStr = thread.updatedAt || thread.updated_at || thread.createdAt || thread.created_at || new Date().toISOString();
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const days = differenceInDays(new Date(), date);
  if (days <= 7) return 'Last 7 Days';
  if (days <= 30) return 'Last 30 Days';
  return 'Older';
}

function getRelativeTime(dateInput: string | number | Date): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, 'h:mm a')}`;
    }
    if (differenceInDays(new Date(), date) <= 7) {
      return format(date, 'EEEE h:mm a');
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return '';
  }
}

const GROUP_ORDER: DateGroup[] = ['Pinned', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className }) => {
  if (!query.trim() || !text) {
    return <span className={className}>{text || ''}</span>;
  }

  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const escapedWords = words.map(w => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = words.some(w => w.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark
              key={i}
              className="bg-cyan-500/25 text-cyan-200 font-semibold rounded-[3px] px-0.5 py-0 border-b border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
            >
              {part}
            </mark>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};

// Memoized History Row Component for 60 FPS scrolling
const HistoryThreadItemRow = React.memo<{
  thread: Thread;
  isActive: boolean;
  isHovered: boolean;
  searchQuery: string;
  isEditing: boolean;
  editTitle: string;
  menuOpenId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onHover: (id: string | null) => void;
  onMenuOpenChange: (id: string | null) => void;
  onStartRename: (thread: Thread) => void;
  onSaveRename: (id: string) => void;
  onCancelRename: () => void;
  onEditTitleChange: (val: string) => void;
  onPinThread?: (id: string) => void;
  onFavoriteThread?: (id: string) => void;
  onRenameThread?: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onArchiveThread?: (id: string) => void;
  onDuplicateThread?: (id: string) => void;
}>(({
  thread,
  isActive,
  isHovered,
  searchQuery,
  isEditing,
  editTitle,
  menuOpenId,
  onSelect,
  onClose,
  onHover,
  onMenuOpenChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onEditTitleChange,
  onPinThread,
  onFavoriteThread,
  onRenameThread,
  onDeleteThread,
  onArchiveThread,
  onDuplicateThread,
}) => {
  const isSearch = isSearchThread(thread);
  const isVoice = (Array.isArray(thread.tags) && (thread.tags.includes('voice') || thread.tags.includes('voice-initiated'))) ||
    (thread.title && (thread.title.includes('🎙️') || thread.title.toLowerCase().startsWith('voice')));
  const relTime = getRelativeTime(
    thread.updatedAt || thread.updated_at || thread.createdAt || thread.created_at || new Date().toISOString()
  );

  return (
    <div
      className={cn(
        'group relative px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-200 ease-in-out text-left border',
        isActive
          ? isVoice
            ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
            : isSearch
            ? 'bg-blue-500/10 border-blue-500/30 text-white'
            : 'bg-cyan-500/10 border-cyan-500/30 text-white'
          : 'hover:bg-white/6 border-transparent hover:border-white/5 text-white/70'
      )}
      onMouseEnter={() => onHover(thread.id)}
      onMouseLeave={() => {
        onHover(null);
        if (menuOpenId === thread.id) onMenuOpenChange(null);
      }}
      onClick={() => {
        if (!isEditing) {
          onSelect(thread.id);
          onClose();
        }
      }}
    >
      <div className="flex items-start gap-2.5 pr-12">
        {/* Sparkle/Globe/Voice Icon */}
        <div
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 ease-in-out',
            isVoice
              ? isActive
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : isSearch
              ? isActive
                ? 'bg-blue-500/25 text-blue-300 border border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
                : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              : isActive
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-white/5 text-white/40'
          )}
          title={isVoice ? 'Voice-Initiated Conversation' : isSearch ? 'Web Search & Research Thread' : 'AI Conversation'}
        >
          {isVoice ? <VoiceIcon className="w-3.5 h-3.5" /> : isSearch ? <GlobeIcon className="w-3.5 h-3.5" /> : <SparklesIcon className="w-3.5 h-3.5" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title Inline Edit */}
          {isEditing ? (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={e => onEditTitleChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveRename(thread.id);
                  if (e.key === 'Escape') onCancelRename();
                }}
                autoFocus
                className="w-full bg-white/10 border border-cyan-500/50 rounded-lg px-2 py-0.5 text-xs text-white outline-none transition-all duration-200"
              />
              <button
                onClick={() => onSaveRename(thread.id)}
                className="p-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all duration-200"
              >
                <CheckIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <p
                className={cn(
                  'text-xs font-semibold leading-snug truncate max-w-[170px]',
                  isActive ? 'text-white' : 'text-white/85'
                )}
                title={thread.title}
              >
                <HighlightText text={thread.title || 'New Chat'} query={searchQuery} />
              </p>

              {/* Voice Context Pill */}
              {isVoice && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0 select-none shadow-[0_0_6px_rgba(16,185,129,0.15)] transition-opacity duration-200"
                  title="Voice-initiated conversation"
                >
                  <VoiceIcon className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span>Voice</span>
                </span>
              )}

              {/* Search Context Pill */}
              {isSearch && !isVoice && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 shrink-0 select-none shadow-[0_0_6px_rgba(59,130,246,0.15)] transition-opacity duration-200"
                  title="Thread initiated with Web Search research context"
                >
                  <GlobeIcon className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                  <span>Search Context</span>
                </span>
              )}

              {/* Badges / Pin / Favorite indicators */}
              {thread.isPinned && (
                <Pin size={10} className="text-cyan-400 shrink-0 fill-cyan-400/30 transition-opacity duration-200" />
              )}
              {thread.isFavorite && (
                <Star size={10} className="text-amber-400 shrink-0 fill-amber-400 transition-opacity duration-200" />
              )}
            </div>
          )}

          {/* Preview text */}
          {thread.preview && (
            <p className="text-[11px] text-white/35 truncate mt-0.5">
              <HighlightText text={thread.preview} query={searchQuery} />
            </p>
          )}

          {/* Bottom meta: model + relative time */}
          <div className="flex items-center justify-between mt-1 text-[10px] text-white/30">
            <span>{relTime}</span>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {thread.model && (
                <span className="bg-white/5 border border-white/8 px-1.5 py-0.2 rounded-md font-medium text-white/50 truncate max-w-[110px]">
                  <HighlightText text={thread.model} query={searchQuery} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Revealed on Hover */}
      <AnimatePresence>
        {(isHovered || menuOpenId === thread.id) && !isEditing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute right-2 top-2.5 flex items-center gap-1 z-20"
            onClick={e => e.stopPropagation()}
          >
            {/* Quick Pin Toggle */}
            {onPinThread && (
              <button
                onClick={() => {
                  onPinThread(thread.id);
                  toast.success(thread.isPinned ? 'Unpinned' : 'Pinned');
                }}
                className={cn(
                  "p-1 rounded-lg transition-all duration-200 cursor-pointer",
                  thread.isPinned
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-white/8 hover:bg-white/15 text-white/50 hover:text-white"
                )}
                title={thread.isPinned ? "Unpin" : "Pin"}
              >
                <Pin size={11} />
              </button>
            )}

            {/* Quick Star Toggle */}
            {onFavoriteThread && (
              <button
                onClick={() => {
                  onFavoriteThread(thread.id);
                  toast.success(thread.isFavorite ? 'Removed from Starred' : 'Added to Starred');
                }}
                className={cn(
                  "p-1 rounded-lg transition-all duration-200 cursor-pointer",
                  thread.isFavorite
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/8 hover:bg-white/15 text-white/50 hover:text-white"
                )}
                title={thread.isFavorite ? "Unstar" : "Star"}
              >
                <Star size={11} />
              </button>
            )}

            {/* Rename */}
            {onRenameThread && (
              <button
                onClick={() => onStartRename(thread)}
                className="p-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all duration-200 cursor-pointer"
                title="Rename"
              >
                <Edit2 size={11} />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => onDeleteThread(thread.id)}
              className="p-1 rounded-lg bg-white/8 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all duration-200 cursor-pointer"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>

            {/* More menu */}
            <div className="relative">
              <button
                onClick={() => onMenuOpenChange(menuOpenId === thread.id ? null : thread.id)}
                className="p-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all duration-200 cursor-pointer"
                title="More actions"
              >
                <MoreVertical size={11} />
              </button>

              {menuOpenId === thread.id && (
                <div
                  className="absolute right-0 top-full mt-1 w-38 bg-zinc-900/95 backdrop-blur-md border border-white/12 rounded-xl shadow-2xl py-1 z-30 text-xs text-white/80 animate-fade-in"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(thread.title);
                      toast.success('Title copied');
                      onMenuOpenChange(null);
                    }}
                    className="w-full px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-left transition-all duration-200 cursor-pointer"
                  >
                    <CopyIcon className="w-3 h-3" />
                    <span>Copy Title</span>
                  </button>
                  {onDuplicateThread && (
                    <button
                      onClick={() => {
                        onDuplicateThread(thread.id);
                        onMenuOpenChange(null);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-left transition-all duration-200 cursor-pointer"
                    >
                      <CopyIcon className="w-3 h-3" />
                      <span>Duplicate</span>
                    </button>
                  )}
                  {onArchiveThread && (
                    <button
                      onClick={() => {
                        onArchiveThread(thread.id);
                        onMenuOpenChange(null);
                      }}
                      className="w-full px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-left transition-all duration-200 cursor-pointer"
                    >
                      <Archive size={11} />
                      <span>{thread.isArchived ? 'Unarchive' : 'Archive'}</span>
                    </button>
                  )}
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    onClick={() => {
                      onDeleteThread(thread.id);
                      onMenuOpenChange(null);
                    }}
                    className="w-full px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center gap-2 text-left transition-all duration-200 cursor-pointer"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

HistoryThreadItemRow.displayName = 'HistoryThreadItemRow';

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  threads,
  isOpen,
  onClose,
  onSelectThread,
  onDeleteThread,
  onDeleteAllThreads,
  onRenameThread,
  onPinThread,
  onFavoriteThread,
  onArchiveThread,
  onDuplicateThread,
  currentThreadId,
  onNewThread,
  onOpenAppLauncher,
  onSelectFeature,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Filter threads by tab and search query
  const filtered = useMemo(() => {
    let list = threads;

    // Filter by tab
    if (activeTab === 'searches') {
      list = list.filter(t => isSearchThread(t) && !t.isArchived);
    } else if (activeTab === 'voice') {
      list = list.filter(t => (
        (Array.isArray(t.tags) && (t.tags.includes('voice') || t.tags.includes('voice-initiated'))) ||
        (t.title && (t.title.includes('🎙️') || t.title.toLowerCase().startsWith('voice')))
      ) && !t.isArchived);
    } else if (activeTab === 'pinned') {
      list = list.filter(t => t.isPinned && !t.isArchived);
    } else if (activeTab === 'favorites') {
      list = list.filter(t => t.isFavorite && !t.isArchived);
    } else if (activeTab === 'archived') {
      list = list.filter(t => t.isArchived);
    } else {
      // 'all' shows non-archived
      list = list.filter(t => !t.isArchived);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      list = list.filter(t => {
        const titleText = (t.title || '').toLowerCase();
        const previewText = (t.preview || '').toLowerCase();
        const modelText = (t.model || '').toLowerCase();
        const fullText = `${titleText} ${previewText} ${modelText}`;
        return words.every(w => fullText.includes(w));
      });
    }

    return list;
  }, [threads, activeTab, searchQuery]);

  // Group threads
  const grouped = useMemo(() => {
    const groups: Partial<Record<DateGroup, Thread[]>> = {};
    filtered.forEach(thread => {
      const group = getDateGroup(thread);
      if (!groups[group]) groups[group] = [];
      groups[group]!.push(thread);
    });
    return groups;
  }, [filtered]);

  // Display limited to 10 items unless showAllHistory is true or searching
  const displayGroups = useMemo(() => {
    if (showAllHistory || searchQuery.trim() || filtered.length <= 10) {
      return grouped;
    }

    const limitedGroups: Partial<Record<DateGroup, Thread[]>> = {};
    let count = 0;
    const limit = 10;

    for (const group of GROUP_ORDER) {
      const items = grouped[group];
      if (!items || items.length === 0) continue;
      if (count >= limit) break;

      const remaining = limit - count;
      const slice = items.slice(0, remaining);
      if (slice.length > 0) {
        limitedGroups[group] = slice;
        count += slice.length;
      }
    }

    return limitedGroups;
  }, [grouped, showAllHistory, searchQuery, filtered.length]);

  const handleStartRename = (thread: Thread) => {
    setEditingId(thread.id);
    setEditTitle(thread.title || '');
    setMenuOpenId(null);
  };

  const handleSaveRename = (threadId: string) => {
    if (editTitle.trim() && onRenameThread) {
      onRenameThread(threadId, editTitle.trim());
      toast.success('Conversation renamed');
    }
    setEditingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="history-panel"
            initial={{ x: '-100%', opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.9 }}
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#171717]/98 dark:bg-[#171717]/98 chatgpt-minimal:bg-[#171717] light:bg-[#ffffff]/98 backdrop-blur-2xl border-r border-white/10 dark:border-white/10 light:border-black/10 z-50 flex flex-col shadow-2xl transform-gpu will-change-transform"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h2 className="text-2xl font-bold tracking-tight text-white">Rishi</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchQuery(prev => prev ? '' : ' ')}
                  className="w-10 h-10 rounded-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white flex items-center justify-center transition-all duration-200 ease-in-out cursor-pointer"
                  title="Search chats"
                >
                  <SearchIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all duration-200 ease-in-out cursor-pointer"
                  aria-label="Close history"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Feature Navigation List */}
            <div className="px-4 py-2 shrink-0 space-y-1">
              <button
                onClick={() => {
                  if (onNewThread) onNewThread();
                  if (onSelectFeature) onSelectFeature('chat');
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white hover:bg-white/10 text-lg font-medium transition-all duration-200 ease-in-out cursor-pointer group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 text-white group-hover:scale-105 transition-transform duration-200">
                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                  <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                </svg>
                <span>New chat</span>
              </button>

              <button
                onClick={() => {
                  if (onSelectFeature) onSelectFeature('library');
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white hover:bg-white/10 text-lg font-medium transition-all duration-200 ease-in-out cursor-pointer group"
              >
                <LibraryIcon className="w-5 h-5 shrink-0 text-white group-hover:scale-105 transition-transform duration-200" />
                <span>Library</span>
              </button>

              <button
                onClick={() => {
                  if (onSelectFeature) onSelectFeature('projects');
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white hover:bg-white/10 text-lg font-medium transition-all duration-200 ease-in-out cursor-pointer group"
              >
                <ProjectsIcon className="w-5 h-5 shrink-0 text-white group-hover:scale-105 transition-transform duration-200" />
                <span>Projects</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenAppLauncher) onOpenAppLauncher();
                  onClose();
                }}
                className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-white hover:bg-white/10 text-lg font-medium transition-all duration-200 ease-in-out cursor-pointer group"
              >
                <LibraryIcon className="w-5 h-5 shrink-0 text-white group-hover:scale-105 transition-transform duration-200" />
                <span>Plugins</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between px-3.5 pt-2 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'searches', label: 'Searches', icon: GlobeIcon },
                  { id: 'voice', label: 'Voice', icon: VoiceIcon },
                  { id: 'pinned', label: 'Pinned' },
                  { id: 'favorites', label: 'Starred' },
                  { id: 'archived', label: 'Archived' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as FilterTab)}
                    className={cn(
                      "px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all duration-200 ease-in-out cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                      activeTab === tab.id
                        ? tab.id === 'searches'
                          ? "bg-blue-500/20 text-blue-300 border border-blue-400/40 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                          : tab.id === 'voice'
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                          : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                    )}
                  >
                    {tab.icon && <tab.icon className={cn("w-3 h-3 transition-colors duration-200", activeTab === tab.id ? (tab.id === 'voice' ? "text-emerald-400" : "text-blue-400") : "text-white/40")} />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="px-3.5 py-2.5 shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/8 focus-within:border-cyan-500/40 transition-all duration-200 ease-in-out">
                <SearchIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search title, content, or model…"
                  className="flex-1 bg-transparent text-xs text-white/80 placeholder:text-white/25 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-white/30 hover:text-white/70 transition-colors duration-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0 custom-scrollbar">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <MessageSquare size={18} className="text-white/20" />
                  </div>
                  <p className="text-xs text-white/30 leading-relaxed">
                    {searchQuery
                      ? `No chats found matching "${searchQuery}"`
                      : activeTab === 'searches'
                      ? 'No web search or research chats found yet.'
                      : activeTab === 'voice'
                      ? 'No voice-initiated conversations logged yet.'
                      : activeTab !== 'all'
                      ? `No ${activeTab} chats available`
                      : 'No chat history yet. Start a conversation!'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {GROUP_ORDER.map(group => {
                    const items = displayGroups[group];
                    if (!items?.length) return null;
                    const isCollapsed = collapsedGroups[group];

                    return (
                      <div key={group} className="space-y-1">
                        {/* Group label with Collapsible Trigger */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className="w-full px-3 pt-2 pb-1 flex items-center justify-between text-left hover:bg-white/5 rounded-lg transition-colors cursor-pointer group select-none"
                        >
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider group-hover:text-white/70">
                            {group}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-white/30 group-hover:text-white/60">
                            <span>{items.length}</span>
                            {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                          </div>
                        </button>

                        {/* Thread items */}
                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-0.5 overflow-hidden"
                            >
                              {items.map((thread) => (
                                <HistoryThreadItemRow
                                  key={thread.id}
                                  thread={thread}
                                  isActive={thread.id === currentThreadId}
                                  isHovered={hoveredId === thread.id}
                                  searchQuery={searchQuery}
                                  isEditing={editingId === thread.id}
                                  editTitle={editTitle}
                                  menuOpenId={menuOpenId}
                                  onSelect={onSelectThread}
                                  onClose={onClose}
                                  onHover={setHoveredId}
                                  onMenuOpenChange={setMenuOpenId}
                                  onStartRename={handleStartRename}
                                  onSaveRename={handleSaveRename}
                                  onCancelRename={() => setEditingId(null)}
                                  onEditTitleChange={setEditTitle}
                                  onPinThread={onPinThread}
                                  onFavoriteThread={onFavoriteThread}
                                  onRenameThread={onRenameThread}
                                  onDeleteThread={onDeleteThread}
                                  onArchiveThread={onArchiveThread}
                                  onDuplicateThread={onDuplicateThread}
                                />
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  {/* See all... Button if more than 10 items */}
                  {filtered.length > 10 && !searchQuery.trim() && (
                    <div className="px-2 pt-1 pb-2">
                      <button
                        type="button"
                        onClick={() => setShowAllHistory(prev => !prev)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group border border-transparent hover:border-white/5"
                      >
                        <span className="font-normal">{showAllHistory ? 'Show less' : 'See all...'}</span>
                        <span className="text-xs text-white/40 group-hover:text-white/70 font-mono">
                          {showAllHistory ? 'Collapse' : `+${filtered.length - 10} more`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Action Bar */}
            <div className="p-4 pt-3 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0">
              <button
                onClick={() => {
                  if (onNewThread) onNewThread();
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1d6bf3] hover:bg-[#1558c0] active:scale-95 text-white font-semibold text-base shadow-lg transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 shrink-0 text-white">
                  <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
                  <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
                </svg>
                <span>Chat</span>
              </button>

              <div className="flex items-center gap-2">
                <ProfileAvatarButton
                  onClick={() => {
                    if (onOpenSettings) onOpenSettings();
                    onClose();
                  }}
                  size="md"
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
