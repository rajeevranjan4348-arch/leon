import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, ArrowUp, Globe, Plus, Telescope, Mic, MicOff, FileText, X, History, MessageSquare, Grid, Sparkles, Volume2, VolumeX, Send, Radio, Plug, Check, HardDrive, Video, Image as ImageIcon, Zap, WifiOff, Wifi, Pencil, Edit3, Activity, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AttachmentMenu } from '@/components/research/AttachmentMenu';
import { VoiceCallModal } from '@/components/research/VoiceCallModal';
import { GeminiLiveVoiceModal } from '@/components/voice/GeminiLiveVoiceModal';
import { GeminiLiveWaveform } from '@/components/research/GeminiLiveWaveform';
import { GeminiLiveSession } from '@/lib/geminiLiveClient';
import { SharedMediaStoreModal } from '@/components/research/SharedMediaStoreModal';
import { MiniMaxH3StudioModal } from '@/components/research/MiniMaxH3StudioModal';
import { useSpeechRecognition, POPULAR_SPEECH_LANGUAGES } from '@/hooks/useSpeechRecognition';
import { SpeechRecognitionErrorBanner } from '@/components/research/SpeechRecognitionErrorBanner';
import { usePluginStore } from '@/lib/plugins/PluginStore';
import { PLUGINS, pluginManager, PluginPickerStrip, ActivePluginChip } from '@/lib/plugins/PluginComposerSystem';
import { DeepSearchIcon } from '@/components/ui/DeepSearchIcon';
import { CirclePlusIcon } from '@/components/ui/CirclePlusIcon';
import { LoadingWave } from '@/components/ui/LoadingWave';
import { MagneticButton } from '@/components/motion';
import { useOnlineStatus } from '@/lib/offlineAiEngine';
import { processUploadedFile, MultimodalMediaItem } from '@/lib/multimodalMediaHandler';
import { useLanguage } from '@/context/LanguageContext';

export type SearchModeType = 'chat' | 'search' | 'research';

interface SearchBarProps {
  onSearch: (query: string, mode: SearchModeType, mediaItems?: MultimodalMediaItem[], editingIndex?: number) => void;
  isLoading?: boolean;
  onStop?: () => void;
  compact?: boolean;
  initialMode?: SearchModeType;
  onModeChange?: (mode: SearchModeType) => void;
  onOpenAppLauncher?: () => void;
  onOpenMediaStore?: () => void;
  isCallOpen?: boolean;
  onCallStateChange?: (open: boolean) => void;
  editingMessage?: { index: number; content: string; id?: string; mediaItems?: MultimodalMediaItem[] } | null;
  onCancelEdit?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  isLoading, 
  onStop,
  compact, 
  initialMode, 
  onModeChange,
  onOpenAppLauncher,
  onOpenMediaStore,
  isCallOpen: isCallOpenProp,
  onCallStateChange,
  editingMessage,
  onCancelEdit,
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchModeType>(initialMode || 'chat');

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Synchronize editing message into input query and focus
  useEffect(() => {
    if (editingMessage) {
      setQuery(editingMessage.content);
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = editingMessage.content.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }
  }, [editingMessage]);

  const handleModeToggle = (newMode: SearchModeType) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [internalCallOpen, setInternalCallOpen] = useState(false);

  const isCallModalOpen = isCallOpenProp !== undefined ? isCallOpenProp : internalCallOpen;
  const setIsCallModalOpen = onCallStateChange || setInternalCallOpen;
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [isMediaStoreOpen, setIsMediaStoreOpen] = useState(false);
  const [isH3StudioOpen, setIsH3StudioOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [webSearchMode, setWebSearchMode] = useState<'Auto' | 'Always' | 'Off'>('Auto');
  const [showPluginsDropdown, setShowPluginsDropdown] = useState(false);
  const [activePluginId, setActivePluginId] = useState<string | null>(null);
  const { plugins, toggle: togglePlugin } = usePluginStore();
  const isOnline = useOnlineStatus();

  const selectedPlugin = useMemo(() => {
    return activePluginId ? pluginManager.get(activePluginId) : null;
  }, [activePluginId]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger search execution from voice input
  const triggerVoiceSearch = useCallback((transcriptToSearch: string) => {
    const cleanText = transcriptToSearch.trim();
    if (!cleanText) return;

    toast.success(`Voice Search: "${cleanText}"`, { id: 'voice-active' });
    onSearch(cleanText, mode);
    setQuery('');
  }, [mode, onSearch]);

  // Integrated browser SpeechRecognition hook
  const {
    isListening,
    interimTranscript,
    autoSubmitOnSilence,
    setAutoSubmitOnSilence,
    currentLanguage,
    setLanguage,
    error: speechError,
    clearError: clearSpeechError,
    startListening,
    stopListening,
    retryListening,
    requestMicrophonePermission,
    fallbackToDefaultLanguage,
    toggleListening: rawToggleListening,
  } = useSpeechRecognition({
    autoSubmitOnSilence: true,
    silenceDuration: 2000,
    onTranscriptChange: (updatedText) => {
      setQuery(updatedText);
    },
    onAutoSubmit: (finalText) => {
      triggerVoiceSearch(finalText);
    },
  });

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Gemini Live Real-Time Microphone Stream State
  const [isInlineLiveActive, setIsInlineLiveActive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error'>('disconnected');
  const [liveVoice, setLiveVoice] = useState('Zephyr');
  const [isLiveMuted, setIsLiveMuted] = useState(false);
  const [liveRms, setLiveRms] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const inlineLiveSessionRef = useRef<GeminiLiveSession | null>(null);

  const startInlineLive = useCallback(async () => {
    if (isListening) {
      stopListening();
    }
    setIsInlineLiveActive(true);
    setLiveStatus('connecting');

    try {
      const session = new GeminiLiveSession({
        onStatusChange: (status) => {
          setLiveStatus(status);
          if (status === 'mic_permission_needed') {
            toast.info('Please allow microphone permissions for Gemini Live.');
          }
        },
        onAudioData: (rms) => {
          setLiveRms(rms);
        },
        onTranscript: (text, isUser) => {
          setLiveTranscript(text);
          if (isUser) {
            setQuery(prev => prev ? `${prev} ${text}` : text);
          }
        },
        onError: (err) => {
          toast.error(`Gemini Live: ${err}`);
        },
      });

      inlineLiveSessionRef.current = session;
      await session.start(liveVoice);
      toast.success('Gemini Live Real-time Stream active');
    } catch (err: any) {
      console.warn('Start inline live error:', err);
      toast.error('Could not initialize Gemini Live stream');
    }
  }, [isListening, stopListening, liveVoice]);

  const stopInlineLive = useCallback(() => {
    if (inlineLiveSessionRef.current) {
      inlineLiveSessionRef.current.stop();
      inlineLiveSessionRef.current = null;
    }
    setIsInlineLiveActive(false);
    setLiveStatus('disconnected');
    setLiveRms(0);
  }, []);

  const toggleInlineLive = useCallback(() => {
    if (isInlineLiveActive) {
      stopInlineLive();
    } else {
      startInlineLive();
    }
  }, [isInlineLiveActive, startInlineLive, stopInlineLive]);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (inlineLiveSessionRef.current) {
        inlineLiveSessionRef.current.stop();
        inlineLiveSessionRef.current = null;
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (isInlineLiveActive) {
      stopInlineLive();
    }
    rawToggleListening(query);
  }, [query, rawToggleListening, isInlineLiveActive, stopInlineLive]);

  // Global Alt+V (Voice Dictation) and Alt+L (Gemini Live Stream) shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'v' || e.key === 'V')) || (e.code === 'KeyV' && e.altKey)) {
        e.preventDefault();
        toggleListening();
      }
      if ((e.altKey && (e.key === 'l' || e.key === 'L')) || (e.code === 'KeyL' && e.altKey)) {
        e.preventDefault();
        toggleInlineLive();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleListening, toggleInlineLive]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.[1])) {
            setSuggestions(data[1].slice(0, 5));
            return;
          }
        }
      } catch {
        setSuggestions([]);
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((query.trim() || attachedFiles.length > 0) && !isLoading) {
      let finalQuery = query.trim();
      let processedMediaItems: MultimodalMediaItem[] = [];

      if (attachedFiles.length > 0) {
        toast.loading('Processing multimodal attachments...', { id: 'media-proc' });
        try {
          const processed = await Promise.all(
            attachedFiles.map(file => processUploadedFile(file))
          );
          processedMediaItems = processed;
          toast.success(`Prepared ${processed.length} multimodal attachment(s)`, { id: 'media-proc' });
        } catch (err) {
          console.warn('Error processing multimodal files:', err);
          toast.error('Could not process attached files for visual analysis', { id: 'media-proc' });
        }

        const fileDescs = attachedFiles.map(f => {
          const typeLabel = f.type.startsWith('image/') ? 'Photo' : f.type.startsWith('video/') ? 'Video' : 'File';
          return `[Shared ${typeLabel}: ${f.name} (${(f.size / 1024).toFixed(1)} KB)]`;
        }).join('\n');
        finalQuery = finalQuery ? `${finalQuery}\n${fileDescs}` : `Analyze shared file(s):\n${fileDescs}`;
      }

      if (activePluginId) {
        finalQuery = `[PLUGIN:${activePluginId}] ${finalQuery}`;
      }

      const editingIdx = editingMessage?.index;
      onSearch(
        finalQuery, 
        mode, 
        processedMediaItems.length > 0 ? processedMediaItems : (editingMessage?.mediaItems || undefined),
        editingIdx
      );
      if (editingMessage) {
        onCancelEdit?.();
      }
      setQuery('');
      setAttachedFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      setAttachedFiles(prev => [...prev, ...files]);
      toast.success(`Received ${files.length} shared file(s) from clipboard`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setAttachedFiles(prev => [...prev, ...files]);
      toast.success(`Received ${files.length} shared file(s)`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Avoid submitting while composition / IME is active (e.g. CJK or accent entry)
    if (e.nativeEvent.isComposing) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      onCancelEdit?.();
      setQuery('');
    }
  };

  const { t } = useLanguage();

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to 'auto' first to calculate scrollHeight accurately when lines increase or decrease
    textarea.style.height = 'auto';

    const minHeight = compact ? 28 : 48;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    // Responsive max height: 360px on desktop, 40-50vh on mobile
    const maxHeight = isMobile
      ? Math.min(360, Math.max(180, Math.floor(window.innerHeight * 0.45)))
      : 360;

    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${Math.max(scrollHeight, minHeight)}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [compact]);

  // Recalculate height on initialization, query change, editing message restore
  useEffect(() => {
    adjustTextareaHeight();
  }, [query, compact, adjustTextareaHeight]);

  // Recalculate height on mobile viewport changes or window resize
  useEffect(() => {
    const handleResize = () => adjustTextareaHeight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [adjustTextareaHeight]);

  const canSubmit = (Boolean(query.trim()) || attachedFiles.length > 0) && !isLoading;

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative w-full transition-all duration-300",
        compact ? "max-w-4xl" : "max-w-3xl mx-auto",
        showSuggestions && suggestions.length > 0 ? "z-50" : "z-auto"
      )}
    >
      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        className={cn(
          "bg-[#2f2f2f] relative flex flex-col transition-all duration-300",
          compact ? "rounded-[24px] p-3.5" : "rounded-[30px] p-5 shadow-2xl",
          isDraggingOver && "ring-2 ring-cyan-400/80 bg-cyan-950/20 border-cyan-400/50 shadow-cyan-500/20"
        )}
      >
        {/* Subtle top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px rounded-t-[28px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Speech Recognition Error Feedback Banner */}
        <SpeechRecognitionErrorBanner
          error={speechError}
          onDismiss={clearSpeechError}
          onRetry={retryListening}
          onRequestPermission={requestMicrophonePermission}
          onSwitchLanguage={setLanguage}
          currentLanguage={currentLanguage}
        />

        {/* Active Plugin Chip */}
        {selectedPlugin && (
          <ActivePluginChip
            plugin={selectedPlugin}
            onRemove={() => setActivePluginId(null)}
            file={attachedFiles[0] || null}
          />
        )}

        {/* Attached files preview chips */}
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1 overflow-x-auto no-scrollbar">
            {attachedFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              const isVideo = file.type.startsWith('video/');
              const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
              const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.txt') || file.name.endsWith('.md');
              const isSheet = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');
              const isCode = file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py') || file.name.endsWith('.json') || file.name.endsWith('.html') || file.name.endsWith('.css');
              const isZip = file.name.endsWith('.zip') || file.name.endsWith('.tar') || file.name.endsWith('.gz');

              const typeBadge = isImage ? 'Image' : isVideo ? 'Video' : isPdf ? 'PDF' : isDoc ? 'Doc' : isSheet ? 'Sheet' : isCode ? 'Code' : isZip ? 'Archive' : 'File';
              const previewUrl = isImage ? URL.createObjectURL(file) : null;

              return (
                <div 
                  key={idx} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 border border-white/15 hover:border-cyan-500/40 rounded-2xl text-xs text-white/90 shrink-0 shadow-lg backdrop-blur-md transition-all group"
                >
                  {/* Thumbnail / Icon preview */}
                  {previewUrl ? (
                    <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 border border-white/20">
                      <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border text-[11px] font-bold",
                      isImage ? "bg-purple-500/20 border-purple-500/40 text-purple-300" :
                      isVideo ? "bg-pink-500/20 border-pink-500/40 text-pink-300" :
                      isPdf ? "bg-rose-500/20 border-rose-500/40 text-rose-300" :
                      isSheet ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" :
                      isCode ? "bg-amber-500/20 border-amber-500/40 text-amber-300" :
                      isZip ? "bg-orange-500/20 border-orange-500/40 text-orange-300" :
                      "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    )}>
                      {isImage ? '📷' : isVideo ? '🎥' : isPdf ? '📄' : isSheet ? '📊' : isCode ? '💻' : isZip ? '📦' : '📁'}
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex flex-col min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[130px] truncate font-medium text-white">{file.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/70 font-mono">{typeBadge}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-white/50">
                      <span>{(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 0)} KB</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                        <Check size={10} className="inline" /> Ready
                      </span>
                    </div>
                  </div>

                  {/* Remove action */}
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 rounded-lg hover:bg-white/15 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title={`Remove ${file.name}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Speech Recognition Error & Troubleshooting Banner */}
        <SpeechRecognitionErrorBanner
          error={speechError}
          onDismiss={clearSpeechError}
          onRetry={retryListening}
          onRequestPermission={requestMicrophonePermission}
          onSwitchLanguage={(lang) => {
            setLanguage(lang);
            retryListening();
          }}
          currentLanguage={currentLanguage}
        />

        {/* Editing Message Banner */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              className="mb-2.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-200 text-xs font-medium backdrop-blur-md flex items-center justify-between shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="font-semibold text-cyan-300">Editing message #{editingMessage.index + 1}</span>
                <span className="text-white/40 text-[11px] hidden sm:inline truncate">— Submitting will update history & regenerate response</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCancelEdit?.();
                  setQuery('');
                }}
                className="text-white/60 hover:text-white flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors ml-2 shrink-0 cursor-pointer"
                title="Cancel editing"
              >
                <X size={12} />
                <span>Cancel</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          rows={1}
          value={query}
          onInput={() => adjustTextareaHeight()}
          onChange={(e) => {
            setQuery(e.target.value);
            adjustTextareaHeight();
          }}
          onPaste={(e) => {
            handlePaste(e);
            setTimeout(adjustTextareaHeight, 0);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder', 'Assign a task or type / for more')}
          className={cn(
            "w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none px-0 text-[15px] sm:text-[16px] leading-relaxed placeholder:text-white/40 text-white/90 smooth-scrollbar transition-[height] duration-100 ease-out",
            compact ? "min-h-[28px]" : "min-h-[48px]"
          )}
        />

        <div className="flex items-center justify-between mt-3 px-0">
          {/* Left side: offline chip or listening status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Offline AI Mode Indicator */}
            {!isOnline && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
                title="Offline Mode: Switched to Local AI Engine with 0ms network latency"
              >
                <WifiOff size={12} className="text-amber-400" />
                <span>Offline AI</span>
              </span>
            )}

            {isListening && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {POPULAR_SPEECH_LANGUAGES.find(l => l.code === currentLanguage)?.flag || '🌐'} {POPULAR_SPEECH_LANGUAGES.find(l => l.code === currentLanguage)?.nativeName || currentLanguage}
              </span>
            )}

            {!isListening && speechError && (
              <button
                type="button"
                onClick={() => retryListening()}
                className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                title={`${speechError.title}: Click to retry speech recognition`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>{speechError.title}</span>
                <span className="text-[10px] text-amber-400/70 underline ml-0.5">Resolve</span>
              </button>
            )}
          </div>

          {/* Right side tools */}
          <div className="flex items-center gap-1">
            {/* Attachment & Tools Plus Button */}
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              title="Add attachments, plugins & media"
              onClick={() => setIsAttachmentMenuOpen(true)}
              className="cursor-pointer outline-none p-2 rounded-full text-white/50 hover:text-white hover:bg-white/8 transition-colors flex items-center justify-center relative select-none"
              aria-label="Add attachments and plugins"
            >
              <Plus size={18} strokeWidth={2} />
              {attachedFiles.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white text-black font-bold text-[9px] rounded-full flex items-center justify-center shadow-sm">
                  {attachedFiles.length}
                </span>
              )}
            </motion.button>

            {/* Microphone Dictation Button (SpeechRecognition API) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={toggleListening}
              className={cn(
                "p-2 rounded-full transition-all cursor-pointer select-none relative flex items-center justify-center",
                isListening
                  ? "bg-red-500/25 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/30 scale-105"
                  : speechError
                  ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              )}
              title={
                isListening
                  ? "Listening... Click to stop microphone"
                  : speechError
                  ? `${speechError.title}: Click to retry dictation`
                  : `Dictate query with SpeechRecognition (Alt+V) - [${currentLanguage}]`
              }
              aria-label="Dictate Query"
            >
              {isListening ? (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <Mic size={17} className="text-red-400 animate-pulse relative z-10" />
                </>
              ) : speechError ? (
                <>
                  <MicOff size={17} className="text-amber-400" />
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                </>
              ) : (
                <Mic size={17} strokeWidth={1.8} />
              )}
            </motion.button>

            {isLoading ? (
              <MagneticButton
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStop?.();
                }}
                title="Stop Generating (Cancel)"
                aria-label="Stop Generating"
                className="p-2.5 ml-1 rounded-full bg-white text-black hover:bg-gray-100 shadow-sm transition-colors flex items-center justify-center cursor-pointer"
              >
                <Square size={16} className="fill-current text-black" />
              </MagneticButton>
            ) : (
              <MagneticButton
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "p-2.5 ml-1 rounded-full transition-colors flex items-center justify-center cursor-pointer",
                  canSubmit
                    ? "bg-white hover:bg-gray-100 text-black shadow-sm"
                    : "bg-[#676767] text-[#2f2f2f] cursor-default opacity-80 pointer-events-none"
                )}
                aria-label="Send message"
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </MagneticButton>
            )}
          </div>
        </div>
      </form>

      {/* Attachment Feature Menu Modal */}
      <AttachmentMenu
        isOpen={isAttachmentMenuOpen}
        onClose={() => setIsAttachmentMenuOpen(false)}
        onSelectFiles={(files) => {
          const newFiles = Array.from(files);
          setAttachedFiles(prev => [...prev, ...newFiles]);
        }}
        onSelectPhrase={(phrase) => {
          setQuery(prev => prev ? `${prev} ${phrase}` : phrase);
        }}
        webSearchMode={webSearchMode}
        onToggleWebSearch={setWebSearchMode}
        onStartCall={() => setIsCallModalOpen(true)}
        onStartLiveVoice={() => setIsLiveVoiceOpen(true)}
        onOpenAppLauncher={onOpenAppLauncher}
        onSelectPlugin={(id) => {
          if (id === 'image' || id === 'image-creation') {
            setActivePluginId('image-creation');
            if (!query.trim()) {
              setQuery('Generate an ultra-realistic image of ');
            }
            if (textareaRef.current) {
              textareaRef.current.focus();
            }
          } else if (id === 'video' || id === 'video-creation') {
            setActivePluginId('video-creation');
            setIsH3StudioOpen(true);
          } else {
            setActivePluginId(id);
          }
        }}
        onOpenMediaStore={() => setIsMediaStoreOpen(true)}
      />

      {/* MiniMax-H3 Video Studio Modal */}
      <MiniMaxH3StudioModal
        isOpen={isH3StudioOpen}
        onClose={() => setIsH3StudioOpen(false)}
        initialPrompt={query}
        onInsertVideoToChat={(videoUrl, promptText) => {
          setIsH3StudioOpen(false);
          onSearch(`[Generated MiniMax-H3 Video: ${promptText}]\n${videoUrl}`, mode);
        }}
      />

      {/* Shared AI Media & File Store Modal */}
      <SharedMediaStoreModal
        isOpen={isMediaStoreOpen}
        onClose={() => setIsMediaStoreOpen(false)}
        onShareToAI={(item) => {
          setQuery(prev => prev ? `${prev}\n[Referencing Stored Media: ${item.name}]` : `Analyze this stored item: ${item.name}`);
        }}
      />

      {/* Interactive Voice Call Screen */}
      <VoiceCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        aiName="AI Buddy"
        onSendMessage={(msg) => onSearch(msg, mode)}
      />

      {/* Gemini Live API Real-Time Voice Conversation Modal */}
      <GeminiLiveVoiceModal
        isOpen={isLiveVoiceOpen}
        onClose={() => setIsLiveVoiceOpen(false)}
        onSendToChat={(text) => {
          setQuery(text);
          onSearch(text, mode);
        }}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-50 shadow-2xl animate-fade-in-up">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors group border-b border-white/5 last:border-0"
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion, mode);
                setShowSuggestions(false);
              }}
            >
              <Search size={14} className="text-white/30 group-hover:text-white/60 transition-colors mt-0.5 shrink-0" />
              <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
