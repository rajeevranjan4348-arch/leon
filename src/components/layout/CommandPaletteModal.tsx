import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Brain,
  Sparkles,
  Clock,
  Tag,
  ArrowRight,
  CornerDownLeft,
  Copy,
  Trash2,
  Plus,
  Settings,
  Globe,
  Star,
  Pin,
  Check,
  X,
  Zap,
  BookOpen,
  Terminal,
  Grid,
  FileText,
  User,
  Bot,
  ExternalLink,
  ChevronRight,
  Layers,
  Flame,
  Calendar,
  Paperclip,
  ShieldAlert
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Thread } from '@/hooks/useThreads';
import { StoredMessage } from '@/lib/memory/types';
import { MessageStore } from '@/lib/memory/MessageStore';
import { MemoryManager } from '@/lib/memory/MemoryManager';
import { LongTermMemory } from '@/lib/memory/types';
import { LettaStore } from '@/lib/letta/LettaStore';
import { ArchivalPassage } from '@/lib/letta/types';
import { ConversationSummarizer } from '@/lib/memory/ConversationSummarizer';
import { toast } from 'sonner';

import {
  syncWhatsAppContacts,
  parseWhatsAppCommand,
  executeWhatsAppAction,
  buildWhatsAppUrls
} from '@/lib/whatsappService';

export type CommandFilterTab = 'all' | 'threads' | 'messages' | 'files' | 'memories' | 'archival' | 'actions' | 'improvements';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  threads: Thread[];
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteAllThreads?: () => void;
  onOpenSettings?: () => void;
  onOpenAppLauncher?: () => void;
  onOpenMemoryManager?: () => void;
  onSelectFeature?: (feature: string) => void;
  onAskAboutContent?: (text: string) => void;
}

interface SearchResultItem {
  id: string;
  type: 'thread' | 'message' | 'file' | 'memory' | 'archival' | 'action' | 'improvement';
  title: string;
  subtitle?: string;
  snippet?: string;
  date?: string | number;
  tags?: string[];
  category?: string;
  importance?: number;
  threadId?: string;
  role?: 'user' | 'assistant' | 'system';
  rawObject?: any;
  score: number;
  action?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  threads,
  onSelectThread,
  onNewThread,
  onDeleteAllThreads,
  onOpenSettings,
  onOpenAppLauncher,
  onOpenMemoryManager,
  onSelectFeature,
  onAskAboutContent,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CommandFilterTab>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allMessages, setAllMessages] = useState<StoredMessage[]>([]);
  const [allMemories, setAllMemories] = useState<LongTermMemory[]>([]);
  const [allArchivalPassages, setAllArchivalPassages] = useState<ArchivalPassage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load fresh data on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      try {
        setAllMessages(MessageStore.getAllLocalMessages());
        setAllMemories(MemoryManager.getAllMemories());
        setAllArchivalPassages(LettaStore.getAllArchivalPassages());
      } catch (err) {
        console.warn('Failed to load command palette data', err);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Built-in Quick Actions list
  const quickActions = useMemo<SearchResultItem[]>(() => {
    return [
      {
        id: 'action_new_chat',
        type: 'action',
        title: 'New Conversation',
        subtitle: 'Start a fresh chat thread with continuous memory context',
        score: 10,
        tags: ['chat', 'create', 'new'],
        action: () => {
          onNewThread();
          onClose();
          toast.info('Started New Conversation');
        },
      },
      {
        id: 'action_whatsapp_sync',
        type: 'action',
        title: 'Sync WhatsApp Contacts List',
        subtitle: 'Fetch and update WhatsApp contacts for proactive chat suggestions',
        score: 9.8,
        tags: ['whatsapp', 'contacts', 'sync', 'chat', 'people'],
        action: () => {
          const synced = syncWhatsAppContacts();
          onClose();
          toast.success(`Synced ${synced.length} WhatsApp contacts successfully!`);
        },
      },
      {
        id: 'action_whatsapp_comm_hub',
        type: 'action',
        title: 'Open WhatsApp & Communications Hub',
        subtitle: 'Access WhatsApp Business API, voice & video calling, and live messaging',
        score: 9.6,
        tags: ['whatsapp', 'business', 'messages', 'comm', 'calling'],
        action: () => {
          onClose();
          onSelectFeature?.('communications');
        },
      },
      {
        id: 'action_google_maps_agent',
        type: 'action',
        title: 'Launch Google Maps AI Agent (Live Places & Routes)',
        subtitle: 'Connect to real-time Google Maps data for places, routes, traffic, and directions',
        score: 9.8,
        tags: ['maps', 'google maps', 'places', 'directions', 'route', 'navigation', 'travel', 'geo'],
        action: () => {
          onClose();
          onSelectFeature?.('maps');
        },
      },
      {
        id: 'action_discover_news',
        type: 'action',
        title: 'Open Discover Page (Live News Topics & Search Filter)',
        subtitle: 'Filter trending news topics, science breakthroughs, tech, and world events by keyword',
        score: 9.8,
        tags: ['discover', 'news', 'topics', 'trending', 'filter', 'search', 'keyword', 'feed', 'articles'],
        action: () => {
          onClose();
          onSelectFeature?.('discover');
        },
      },
      {
        id: 'action_google_search_agent',
        type: 'action',
        title: 'Launch Google Search AI Agent (Live News & Events)',
        subtitle: 'Connect to real-time Google Search results to discuss current events and cite recent news',
        score: 9.7,
        tags: ['search', 'google search', 'news', 'current events', 'live', 'web', 'research'],
        action: () => {
          onClose();
          onSelectFeature?.('search-agent');
        },
      },
      {
        id: 'action_fact_checker',
        type: 'action',
        title: 'Launch Real-Time Fact Checker & Claim Verifier',
        subtitle: 'Fact-check rumors, statements, and breaking news with primary live citations',
        score: 9.6,
        tags: ['fact check', 'verify', 'claims', 'news', 'truth', 'evidence', 'debunk'],
        action: () => {
          onClose();
          onSelectFeature?.('search-agent');
        },
      },
      {
        id: 'action_veo3_video',
        type: 'action',
        title: 'Animate Product Photo / Image with Veo 3 AI',
        subtitle: 'Turn product photos into dynamic 60fps video ads or animate character portraits',
        score: 9.2,
        tags: ['veo', 'video', 'animate', 'image', 'ad', 'portrait', 'motion'],
        action: () => {
          onClose();
          onSelectFeature?.('veo3_video');
        },
      },
      {
        id: 'action_memory_manager',
        type: 'action',
        title: 'Open Memory & Knowledge Studio',
        subtitle: 'Inspect and manage Core Memory, Archival passages & user preferences',
        score: 9.5,
        tags: ['memory', 'knowledge', 'letta', 'facts'],
        action: () => {
          onClose();
          onOpenMemoryManager?.();
        },
      },
      {
        id: 'action_app_launcher',
        type: 'action',
        title: 'Open App Launcher & System Studio',
        subtitle: 'Access FPS Boost, Dynamic Wallpaper Studio, and Communications',
        score: 9,
        tags: ['apps', 'fps', 'wallpaper', 'launcher'],
        action: () => {
          onClose();
          onOpenAppLauncher?.();
        },
      },
      {
        id: 'action_gemini_support',
        type: 'action',
        title: 'Gemini Support & Booking Assistant',
        subtitle: '24/7 Context-aware AI chatbot for multi-step service bookings & technical troubleshooting',
        score: 9.8,
        tags: ['support', 'help', 'booking', 'troubleshoot', 'appointment', 'schedule', 'gemini'],
        action: () => {
          onClose();
          window.dispatchEvent(new CustomEvent('open_gemini_support_chatbot', { detail: { mode: 'general' } }));
        },
      },
      {
        id: 'action_settings',
        type: 'action',
        title: 'System Preferences & Settings',
        subtitle: 'Configure LLM model parameters, TTS personas, and search defaults',
        score: 8.5,
        tags: ['settings', 'preferences', 'models', 'tts'],
        action: () => {
          onClose();
          onOpenSettings?.();
        },
      },
      {
        id: 'action_open_maps',
        type: 'action',
        title: 'Open Google Maps Platform Explorer',
        subtitle: 'Interactive map viewer with routes, place details, and geocoding',
        score: 8,
        tags: ['maps', 'navigation', 'places', 'geo'],
        action: () => {
          onClose();
          onSelectFeature?.('maps');
        },
      },
      {
        id: 'action_open_library',
        type: 'action',
        title: 'Browse Chat & File Library',
        subtitle: 'Saved threads, media attachments, and exported research notes',
        score: 7.5,
        tags: ['library', 'files', 'saved', 'archive'],
        action: () => {
          onClose();
          onSelectFeature?.('library');
        },
      },
      ...(onDeleteAllThreads && threads.length > 0
        ? [
            {
              id: 'action_delete_all_threads',
              type: 'action' as const,
              title: 'Delete All Conversations',
              subtitle: 'Permanently remove all chat history and conversation records',
              score: 7.0,
              tags: ['delete', 'clear', 'history', 'trash', 'purge', 'wipe'],
              action: () => {
                if (window.confirm('Delete all conversation history?')) {
                  onDeleteAllThreads();
                  onClose();
                }
              },
            },
          ]
        : []),
    ];
  }, [onNewThread, onOpenMemoryManager, onOpenAppLauncher, onOpenSettings, onSelectFeature, onDeleteAllThreads, threads.length, onClose]);

  // Unified Search Pipeline with Fuzzy Token and Relevance Scoring
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery.split(/[\s,.;:!?\-+*/\\_"'`~()[\]{}<>]+/).filter(t => t.length > 1);

    const items: SearchResultItem[] = [];

    // Helper for scoring string against tokens
    const calculateMatchScore = (target: string, boost = 1): number => {
      if (!target) return 0;
      const lower = target.toLowerCase();
      if (!cleanQuery) return 0.5 * boost;
      
      // Exact substring match
      if (lower.includes(cleanQuery)) {
        return 5 * boost;
      }
      
      let tokenHits = 0;
      for (const token of queryTokens) {
        if (lower.includes(token)) {
          tokenHits += 1;
        }
      }
      return tokenHits > 0 ? (tokenHits / queryTokens.length) * 3 * boost : 0;
    };

    // 1. Thread Searches
    if (activeTab === 'all' || activeTab === 'threads') {
      threads.forEach(thread => {
        const titleScore = calculateMatchScore(thread.title, 2.0);
        const previewScore = calculateMatchScore(thread.preview || '', 1.2);
        const totalScore = Math.max(titleScore, previewScore);

        if (!cleanQuery || totalScore > 0) {
          items.push({
            id: `thread_${thread.id}`,
            type: 'thread',
            title: thread.title || 'Untitled Conversation',
            subtitle: thread.searchMode === 'research' ? 'Deep Research Session' : thread.searchMode === 'search' ? 'Web Grounded Search' : 'Interactive Chat',
            snippet: thread.preview || 'Conversation thread with historical context.',
            date: thread.updatedAt || thread.createdAt,
            tags: [thread.searchMode || 'chat', thread.isPinned ? 'pinned' : '', thread.isFavorite ? 'favorite' : ''].filter(Boolean),
            threadId: thread.id,
            score: totalScore + (thread.isPinned ? 1 : 0),
            rawObject: thread,
          });
        }
      });
    }

    // 2. Message Level Searches (Dialogue turns)
    if (activeTab === 'all' || activeTab === 'messages') {
      // Find matches in messages
      allMessages.forEach(msg => {
        const score = calculateMatchScore(msg.content, 1.5);
        if (cleanQuery && score > 0) {
          // Find matching thread title
          const parentThread = threads.find(t => t.id === msg.conversationId || (msg as any).threadId === t.id);
          const threadTitle = parentThread?.title || 'Conversation';

          items.push({
            id: `msg_${msg.id}`,
            type: 'message',
            title: msg.role === 'user' ? `User Inquiry in "${threadTitle}"` : `AI Response in "${threadTitle}"`,
            subtitle: `Thread: ${threadTitle}`,
            snippet: msg.content,
            date: msg.timestamp,
            role: msg.role,
            threadId: msg.conversationId || (msg as any).threadId,
            score,
            rawObject: msg,
          });
        }

        // File Attachments Search across history
        if ((activeTab === 'all' || (activeTab as string) === 'files') && msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach(att => {
            const attNameScore = calculateMatchScore(att.name, 2.5);
            const attTypeScore = calculateMatchScore(att.type || '', 1.5);
            const score = Math.max(attNameScore, attTypeScore);

            if (!cleanQuery || score > 0) {
              const parentThread = threads.find(t => t.id === msg.conversationId || (msg as any).threadId === t.id);
              const threadTitle = parentThread?.title || 'Conversation';

              items.push({
                id: `file_${msg.id}_${att.id}`,
                type: 'file',
                title: att.name,
                subtitle: `Attachment (${att.type || 'Document'}) in "${threadTitle}"`,
                snippet: `Attached in thread "${threadTitle}" at ${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'recent'}`,
                date: msg.timestamp,
                threadId: msg.conversationId || (msg as any).threadId,
                score: score + 1.5,
                rawObject: att,
              });
            }
          });
        }
      });
    }

    // 3. Long-Term Memories (Facts, Preferences, Science Topics)
    if (activeTab === 'all' || activeTab === 'memories') {
      allMemories.forEach(mem => {
        const factScore = calculateMatchScore(mem.fact, 2.2);
        const tagScore = calculateMatchScore(mem.tags.join(' '), 1.8);
        const score = Math.max(factScore, tagScore);

        if (!cleanQuery || score > 0) {
          items.push({
            id: `mem_${mem.id}`,
            type: 'memory',
            title: mem.fact,
            subtitle: `Category: ${mem.category.toUpperCase()} • Importance: ${mem.importance}/5`,
            snippet: mem.fact,
            date: mem.lastAccessedAt || mem.createdAt,
            tags: mem.tags,
            category: mem.category,
            importance: mem.importance,
            threadId: mem.conversationId,
            score: score + (mem.importance * 0.2),
            rawObject: mem,
          });
        }
      });
    }

    // 4. Letta Archival Memory Passages
    if (activeTab === 'all' || activeTab === 'archival') {
      allArchivalPassages.forEach(passage => {
        const contentScore = calculateMatchScore(passage.content, 2.0);
        const tagScore = calculateMatchScore(passage.tags.join(' '), 1.5);
        const score = Math.max(contentScore, tagScore);

        if (!cleanQuery || score > 0) {
          items.push({
            id: `arch_${passage.id}`,
            type: 'archival',
            title: passage.tags.length > 0 ? `[${passage.tags.join(', ')}] Knowledge Passage` : 'Archival Memory Passage',
            subtitle: `Archival Document • Accessed ${passage.accessCount} time(s)`,
            snippet: passage.content,
            date: passage.lastAccessedAt || passage.createdAt,
            tags: passage.tags,
            score,
            rawObject: passage,
          });
        }
      });
    }

    // 4b. BerriAI Self-Improvement Proposals & Learned Lessons
    if (activeTab === 'all' || activeTab === 'improvements') {
      try {
        const { selfImprovementEngine } = require('@/ai/selfImprovement');
        const proposals = selfImprovementEngine.getAllProposals();
        const lessons = selfImprovementEngine.getAllLessons();

        proposals.forEach((p: any) => {
          const score = calculateMatchScore(`${p.title} ${p.problem} ${p.proposedChange} ${p.id}`, 2.2);
          if (!cleanQuery || score > 0) {
            items.push({
              id: `prop_${p.id}`,
              type: 'improvement',
              title: `⚡ Proposal: ${p.title}`,
              subtitle: `Status: ${p.status} • Risk: ${p.riskLevel} • Tool: ${p.toolInvolved || 'General'}`,
              snippet: `Problem: ${p.problem} | Fix: ${p.proposedChange}`,
              date: p.createdAt,
              score: score + 2.0,
              rawObject: p,
            });
          }
        });

        lessons.forEach((l: any) => {
          const score = calculateMatchScore(`${l.problem} ${l.solution} ${l.affectedFeature}`, 2.0);
          if (!cleanQuery || score > 0) {
            items.push({
              id: `lesson_${l.id}`,
              type: 'improvement',
              title: `🧠 Learned Lesson (${l.toolInvolved})`,
              subtitle: `Feature: ${l.affectedFeature} • Date: ${new Date(l.date).toLocaleDateString()}`,
              snippet: `Problem: ${l.problem} -> Solution: ${l.solution}`,
              date: l.date,
              score: score + 1.8,
              rawObject: l,
            });
          }
        });
      } catch (e) {}
    }

    // 5. Quick Actions & WhatsApp Dynamic Actions
    if (activeTab === 'all' || activeTab === 'actions') {
      quickActions.forEach(act => {
        const score = calculateMatchScore(`${act.title} ${act.subtitle} ${act.tags?.join(' ')}`, 3.0);
        if (!cleanQuery || score > 0) {
          items.push({
            ...act,
            score: cleanQuery ? score + 4 : act.score,
          });
        }
      });

      // Synced WhatsApp Contacts Quick Messaging Actions
      const syncedContacts = syncWhatsAppContacts();
      syncedContacts.forEach(contact => {
        const contactScore = calculateMatchScore(`Send WhatsApp message to ${contact.name} ${contact.phone}`, 3.5);
        if (!cleanQuery || contactScore > 0) {
          items.push({
            id: `wa_contact_action_${contact.id}`,
            type: 'action',
            title: `Send WhatsApp message to ${contact.name}`,
            subtitle: `Direct chat with ${contact.name} (${contact.phone}) • ${contact.status || 'Active'}`,
            score: cleanQuery ? contactScore + 5 : 8.8,
            tags: ['whatsapp', 'message', 'chat', contact.name.toLowerCase()],
            action: () => {
              onClose();
              const { webUrl } = buildWhatsAppUrls(contact.phone, '');
              window.open(webUrl, '_blank');
              toast.success(`Opening WhatsApp chat with ${contact.name}...`);
            }
          });
        }
      });

      // If user typed an explicit WhatsApp command e.g. "whatsapp Mom: Dinner is ready!"
      const waParsed = parseWhatsAppCommand(cleanQuery);
      if (waParsed.isWhatsAppCommand && waParsed.actionType !== 'none') {
        items.unshift({
          id: 'wa_dynamic_intent_action',
          type: 'action',
          title: `Execute WhatsApp Action: ${waParsed.recipientName || 'Contact'}`,
          subtitle: waParsed.messageText ? `Message: "${waParsed.messageText}"` : `Launch WhatsApp ${waParsed.actionType.replace('_', ' ')}`,
          score: 100,
          tags: ['whatsapp', 'intent', 'direct'],
          action: () => {
            onClose();
            executeWhatsAppAction(waParsed, { autoOpen: true });
          }
        });
      }
    }

    // Sort by relevance score descending, then by date recency
    return items.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  }, [query, activeTab, threads, allMessages, allMemories, allArchivalPassages, quickActions]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= searchResults.length) {
      setSelectedIndex(Math.max(0, searchResults.length - 1));
    }
  }, [searchResults.length, selectedIndex]);

  const selectedItem = searchResults[selectedIndex] || null;

  // Keyboard navigation inside command palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1 < searchResults.length ? prev + 1 : 0));
        // Scroll into view
        scrollSelectedItemIntoView();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : Math.max(0, searchResults.length - 1)));
        scrollSelectedItemIntoView();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedItem) {
          executeItem(selectedItem);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, selectedItem]);

  const scrollSelectedItemIntoView = () => {
    setTimeout(() => {
      const activeEl = document.getElementById(`cmd-item-${selectedIndex}`);
      if (activeEl && listContainerRef.current) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 10);
  };

  const executeItem = (item: SearchResultItem) => {
    if (item.type === 'action' && item.action) {
      item.action();
      return;
    }

    if (item.type === 'thread' && item.threadId) {
      onSelectThread(item.threadId);
      onClose();
      toast.success(`Switched to conversation: ${item.title}`);
      return;
    }

    if (item.type === 'message' && item.threadId) {
      onSelectThread(item.threadId);
      onClose();
      toast.success(`Jumped to message thread: ${item.title}`);
      return;
    }

    if (item.type === 'file') {
      if (item.threadId) {
        onSelectThread(item.threadId);
        onClose();
        toast.success(`Opened thread with attachment: ${item.title}`);
      } else {
        handleCopy(item.title, item.id);
      }
      return;
    }

    if (item.type === 'improvement') {
      if (onAskAboutContent) {
        onAskAboutContent(`Tell me more about improvement proposal or lesson: ${item.title}`);
        onClose();
        toast.info('Loaded self-improvement item into chat discussion');
      } else {
        handleCopy(item.snippet || item.title, item.id);
      }
      return;
    }

    if (item.type === 'memory' || item.type === 'archival') {
      // If user wants to query AI about this memory
      if (onAskAboutContent) {
        onAskAboutContent(item.snippet || item.title);
        onClose();
        toast.info('Loaded memory into chat discussion');
      } else {
        handleCopy(item.snippet || item.title, item.id);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteMemory = (memoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const actualId = memoryId.replace(/^mem_/, '');
      MemoryManager.deleteMemory(actualId);
      setAllMemories(prev => prev.filter(m => m.id !== actualId));
      toast.success('Memory removed from long-term storage');
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  const handleDeletePassage = (passageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const actualId = passageId.replace(/^arch_/, '');
      LettaStore.deleteArchivalPassage(actualId);
      setAllArchivalPassages(prev => prev.filter(p => p.id !== actualId));
      toast.success('Archival passage deleted');
    } catch {
      toast.error('Failed to delete archival passage');
    }
  };

  const highlightMatches = (text: string, queryStr: string) => {
    if (!queryStr || !queryStr.trim()) return text;
    const clean = queryStr.trim();
    const regex = new RegExp(`(${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-primary/25 text-primary font-semibold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/65 backdrop-blur-md">
        {/* Backdrop click dismiss */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[85vh] bg-[#12141a]/95 border border-white/12 rounded-2xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl z-10 text-white"
        >
          {/* Top Search Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3 bg-white/[0.02]">
            <Search className="w-5 h-5 text-white/45 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search all conversations, dialogue turns, memories, science topics, or actions..."
              className="flex-1 bg-transparent text-white placeholder-white/40 text-base outline-none border-none ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-white/40 hover:text-white/80 rounded-md hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-1 text-[11px] font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-1 rounded-md">
              <span>ESC</span>
              <span>to close</span>
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/8 bg-white/[0.01] overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'all', label: 'All Results', icon: Layers, count: searchResults.length },
                { id: 'threads', label: 'Conversations', icon: MessageSquare, count: searchResults.filter(r => r.type === 'thread').length },
                { id: 'messages', label: 'Dialogue Turns', icon: FileText, count: searchResults.filter(r => r.type === 'message').length },
                { id: 'files', label: 'File Attachments', icon: Paperclip, count: searchResults.filter(r => r.type === 'file').length },
                { id: 'memories', label: 'Learned Memories', icon: Brain, count: searchResults.filter(r => r.type === 'memory').length },
                { id: 'archival', label: 'Archival Knowledge', icon: BookOpen, count: searchResults.filter(r => r.type === 'archival').length },
                { id: 'improvements', label: 'Self-Improvement', icon: ShieldAlert, count: searchResults.filter(r => r.type === 'improvement').length },
                { id: 'actions', label: 'Quick Actions', icon: Zap, count: searchResults.filter(r => r.type === 'action').length },
              ] as const
            ).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedIndex(0);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      isActive ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white/50'
                    )}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main Body: Results List + Interactive Preview Pane */}
          <div className="flex-1 flex min-h-[380px] max-h-[520px] overflow-hidden divide-x divide-white/8">
            {/* Left: Scrollable Results List */}
            <div
              ref={listContainerRef}
              className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10"
            >
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center text-white/40 space-y-2">
                  <Search className="w-8 h-8 opacity-40 mb-1" />
                  <p className="text-sm font-medium text-white/60">No matching interactions or memories found</p>
                  <p className="text-xs max-w-sm text-white/40">
                    Try searching for keywords like "science", "physics", "code", or start a new conversation.
                  </p>
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      id={`cmd-item-${idx}`}
                      key={item.id}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border text-left',
                        isSelected
                          ? 'bg-white/10 border-white/20 text-white shadow-md'
                          : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {/* Icon Avatar */}
                      <div className={cn(
                        'p-2 rounded-lg shrink-0 mt-0.5 transition-colors',
                        item.type === 'thread' && 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
                        item.type === 'message' && (item.role === 'user' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'),
                        item.type === 'file' && 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
                        item.type === 'memory' && 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
                        item.type === 'archival' && 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
                        item.type === 'action' && 'bg-rose-500/15 text-rose-400 border border-rose-500/25',
                        item.type === 'improvement' && 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
                      )}>
                        {item.type === 'thread' && <MessageSquare className="w-4 h-4" />}
                        {item.type === 'message' && (item.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />)}
                        {item.type === 'file' && <Paperclip className="w-4 h-4" />}
                        {item.type === 'memory' && <Brain className="w-4 h-4" />}
                        {item.type === 'archival' && <BookOpen className="w-4 h-4" />}
                        {item.type === 'action' && <Zap className="w-4 h-4" />}
                        {item.type === 'improvement' && <Flame className="w-4 h-4" />}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
                            {highlightMatches(item.title, query)}
                          </h4>
                          {item.date && (
                            <span className="text-[10px] text-white/40 shrink-0 font-mono">
                              {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        {item.snippet && (
                          <p className="text-xs text-white/50 line-clamp-2 mt-0.5 leading-relaxed font-sans">
                            {highlightMatches(item.snippet, query)}
                          </p>
                        )}

                        {/* Badges / Tags */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={cn(
                            'text-[9px] uppercase px-1.5 py-0.5 rounded font-mono tracking-wider',
                            item.type === 'thread' && 'bg-blue-500/20 text-blue-300',
                            item.type === 'message' && 'bg-emerald-500/20 text-emerald-300',
                            item.type === 'memory' && 'bg-purple-500/20 text-purple-300',
                            item.type === 'archival' && 'bg-cyan-500/20 text-cyan-300',
                            item.type === 'action' && 'bg-rose-500/20 text-rose-300',
                          )}>
                            {item.type}
                          </span>

                          {item.category && (
                            <span className="text-[9px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                              {item.category}
                            </span>
                          )}

                          {item.tags?.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="text-[9px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right Selection Indicator */}
                      <ChevronRight className={cn(
                        'w-4 h-4 text-white/20 shrink-0 self-center transition-transform',
                        isSelected && 'text-primary translate-x-0.5'
                      )} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Live Preview & Action Inspector */}
            {selectedItem && (
              <div className="hidden md:flex flex-col w-80 lg:w-96 bg-black/20 p-4 justify-between overflow-y-auto">
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        selectedItem.type === 'thread' && 'bg-blue-400',
                        selectedItem.type === 'message' && 'bg-emerald-400',
                        selectedItem.type === 'memory' && 'bg-purple-400',
                        selectedItem.type === 'archival' && 'bg-cyan-400',
                        selectedItem.type === 'action' && 'bg-rose-400',
                      )} />
                      <span className="text-xs font-mono uppercase text-white/60">
                        {selectedItem.type} Details
                      </span>
                    </div>
                    {selectedItem.date && (
                      <span className="text-[11px] text-white/40 font-mono">
                        {format(new Date(selectedItem.date), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>

                  {/* Title & Headline */}
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-snug">
                      {selectedItem.title}
                    </h3>
                    {selectedItem.subtitle && (
                      <p className="text-xs text-white/50 mt-0.5">
                        {selectedItem.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Snippet / Full Text View */}
                  {selectedItem.snippet && (
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/80 leading-relaxed font-sans max-h-52 overflow-y-auto whitespace-pre-wrap selection:bg-primary/20">
                      {selectedItem.snippet}
                    </div>
                  )}

                  {/* Metadata & Tags */}
                  <div className="space-y-2 text-xs">
                    {selectedItem.importance && (
                      <div className="flex items-center justify-between text-white/60">
                        <span>Importance Score:</span>
                        <span className="text-amber-400 font-mono">
                          {'★'.repeat(selectedItem.importance)}{'☆'.repeat(Math.max(0, 5 - selectedItem.importance))}
                        </span>
                      </div>
                    )}
                    {selectedItem.threadId && (
                      <div className="flex items-center justify-between text-white/60">
                        <span>Thread Reference:</span>
                        <span className="text-white/40 font-mono text-[10px] truncate max-w-[150px]">
                          {selectedItem.threadId}
                        </span>
                      </div>
                    )}
                    {selectedItem.tags && selectedItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedItem.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-white/5 text-white/60 px-2 py-0.5 rounded-full border border-white/8">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Interactive Controls */}
                <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
                  {selectedItem.type === 'thread' && (
                    <button
                      onClick={() => executeItem(selectedItem)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open Conversation</span>
                    </button>
                  )}

                  {selectedItem.type === 'message' && (
                    <button
                      onClick={() => executeItem(selectedItem)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Jump to Message</span>
                    </button>
                  )}

                  {(selectedItem.type === 'memory' || selectedItem.type === 'archival') && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => executeItem(selectedItem)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs rounded-xl shadow transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Discuss with AI Assistant</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(selectedItem.snippet || selectedItem.title, selectedItem.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                        >
                          {copiedId === selectedItem.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === selectedItem.id ? 'Copied' : 'Copy Text'}</span>
                        </button>

                        {selectedItem.type === 'memory' && (
                          <button
                            onClick={(e) => handleDeleteMemory(selectedItem.id, e)}
                            className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {selectedItem.type === 'archival' && (
                          <button
                            onClick={(e) => handleDeletePassage(selectedItem.id, e)}
                            className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20"
                            title="Delete archival passage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedItem.type === 'action' && (
                    <button
                      onClick={() => executeItem(selectedItem)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500 hover:bg-rose-600 text-white font-medium text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Execute Action</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts Guide */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-t border-white/8 text-[11px] text-white/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/60 font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/60 font-mono">↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/60 font-mono">↵</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-white/60 font-mono">ESC</kbd>
                <span>Dismiss</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/50">
              <span>{searchResults.length} total matches</span>
              <span>•</span>
              <span className="text-primary font-medium">Letta Memory Grounded</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
