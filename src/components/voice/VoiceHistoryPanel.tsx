import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Trash2,
  Download,
  Copy,
  Send,
  Search,
  Calendar,
  Clock,
  Sparkles,
  User,
  Filter,
  RefreshCw,
  FileText,
  Music,
  Check,
  ChevronDown,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getVoiceHistory,
  deleteVoiceHistoryItem,
  clearVoiceHistory,
  VoiceHistoryItem
} from '@/lib/voiceHistory';
import {
  speakTextWithPersona,
  stopTTS,
  subscribeTTSState,
  TTSState,
  getAIVoicePersonaId,
  VOICE_PERSONAS
} from '@/lib/voiceService';

interface VoiceHistoryPanelProps {
  onSendToChat?: (text: string) => void;
  className?: string;
}

export const VoiceHistoryPanel: React.FC<VoiceHistoryPanelProps> = ({
  onSendToChat,
  className,
}) => {
  const [items, setItems] = useState<VoiceHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'assistant'>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ttsState, setTtsState] = useState<TTSState | null>(null);

  // HTML5 Audio ref for blob/URL clips
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load items and listen to voice history updates
  const reloadHistory = () => {
    const list = getVoiceHistory();
    setItems(list);
  };

  useEffect(() => {
    reloadHistory();

    const handleUpdate = () => reloadHistory();
    window.addEventListener('voice_history_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const unsubscribe = subscribeTTSState((state) => {
      setTtsState(state);
      if (!state.isSpeaking && playingId) {
        setPlayingId(null);
      }
    });

    return () => {
      window.removeEventListener('voice_history_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopTTS();
    };
  }, [playingId]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'user' && item.role === 'user') ||
        (roleFilter === 'assistant' && item.role === 'assistant');

      const matchesSearch =
        !searchQuery.trim() ||
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.voicePersona && item.voicePersona.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesRole && matchesSearch;
    });
  }, [items, roleFilter, searchQuery]);

  // Handle Play / Stop
  const handleTogglePlay = (item: VoiceHistoryItem) => {
    if (playingId === item.id) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopTTS();
      setPlayingId(null);
      return;
    }

    // Stop any active audio/TTS first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopTTS();

    setPlayingId(item.id);

    if (item.audioUrl) {
      try {
        const audio = new Audio(item.audioUrl);
        audio.playbackRate = playbackSpeed;
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          toast.error('Failed to play audio clip. Falling back to synthetic voice.');
          audioRef.current = null;
          playTTSFallback(item);
        };
        audio.play();
        toast.info('Playing recorded voice audio clip');
      } catch {
        playTTSFallback(item);
      }
    } else {
      playTTSFallback(item);
    }
  };

  const playTTSFallback = (item: VoiceHistoryItem) => {
    const persona = item.voicePersona || getAIVoicePersonaId();
    speakTextWithPersona(item.text, {
      personaId: persona,
      rate: playbackSpeed,
      onStart: () => setPlayingId(item.id),
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  // Copy transcript text
  const handleCopy = (item: VoiceHistoryItem) => {
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    toast.success('Transcript copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete single item
  const handleDeleteItem = (id: string) => {
    if (playingId === id) {
      stopTTS();
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
    }
    deleteVoiceHistoryItem(id);
    toast.success('Voice transcript deleted');
  };

  // Clear all history
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all voice history?')) {
      stopTTS();
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
      clearVoiceHistory();
      toast.success('Voice history cleared');
    }
  };

  // Export as Text / JSON
  const handleExportText = () => {
    if (items.length === 0) {
      toast.info('No voice history to export.');
      return;
    }
    const textContent = items
      .map(
        (it) =>
          `[${new Date(it.timestamp).toLocaleString()}] ${it.role === 'assistant' ? 'AI' : 'User'}: ${it.text}`
      )
      .join('\n\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-transcripts-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported transcripts to text file');
  };

  // Send to Chat
  const handleSendToChat = (text: string) => {
    if (onSendToChat) {
      onSendToChat(text);
      toast.success('Sent transcript to chat workspace');
    } else {
      window.dispatchEvent(
        new CustomEvent('chat-handoff', {
          detail: { text: `[Voice Transcript] ${text}` },
        })
      );
      toast.success('Sent transcript to chat');
    }
  };

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col bg-[#0b0c10] text-white overflow-hidden rounded-2xl border border-white/10 shadow-2xl font-sans",
        className
      )}
    >
      {/* Top Header Panel */}
      <div className="px-6 py-5 border-b border-white/10 bg-[#121319]/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Voice History & Transcripts
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {items.length} {items.length === 1 ? 'Entry' : 'Entries'}
              </span>
            </h2>
            <p className="text-xs text-white/50">
              Review prior voice queries, audio transcripts, and listen to synthesized voice clips.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <>
              <button
                onClick={handleExportText}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Export all transcripts"
              >
                <Download size={14} />
                <span>Export TXT</span>
              </button>

              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Clear all voice history"
              >
                <Trash2 size={14} />
                <span>Clear All</span>
              </button>
            </>
          )}

          <button
            onClick={reloadHistory}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
            title="Refresh history list"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="px-6 py-3.5 border-b border-white/10 bg-[#0f1015]/60 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts, keywords, or voice models..."
            className="w-full bg-[#181922] text-sm text-white placeholder-white/40 rounded-xl pl-10 pr-4 py-2 border border-white/10 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>

        {/* Role Filters & Playback speed */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Speaker Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#181922] border border-white/10 text-xs">
            <button
              onClick={() => setRoleFilter('all')}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all",
                roleFilter === 'all'
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1",
                roleFilter === 'user'
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              <User size={12} />
              <span>User</span>
            </button>
            <button
              onClick={() => setRoleFilter('assistant')}
              className={cn(
                "px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1",
                roleFilter === 'assistant'
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Sparkles size={12} />
              <span>AI</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#181922] border border-white/10 text-xs text-white/70">
            <span className="text-[11px] text-white/40 font-semibold">Speed:</span>
            {[0.8, 1.0, 1.2, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackSpeed(rate)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[11px] font-mono transition-all",
                  playbackSpeed === rate
                    ? "bg-white/20 text-white font-bold"
                    : "hover:bg-white/10 text-white/50"
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Transcripts List Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 sidebar-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl bg-white/2">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 mb-3">
              <Mic size={24} />
            </div>
            <h3 className="text-base font-semibold text-white/90">No Voice Transcripts Found</h3>
            <p className="text-xs text-white/40 max-w-sm mt-1">
              {searchQuery
                ? `No transcripts match "${searchQuery}". Try clearing search filters.`
                : 'Start a voice call or Gemini Live session to record spoken conversations automatically.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPlaying = playingId === item.id;
            const isUser = item.role === 'user';
            const dateObj = new Date(item.timestamp);
            const formattedTime = isNaN(dateObj.getTime())
              ? item.timestamp
              : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
                ' - ' +
                dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={cn(
                  "group relative p-4 rounded-2xl border transition-all duration-200",
                  isPlaying
                    ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                    : isUser
                    ? "bg-[#13151f]/80 border-white/8 hover:border-white/20"
                    : "bg-[#181a26]/90 border-indigo-500/20 hover:border-indigo-500/40"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Speaker Badge & Icon */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold border",
                        isUser
                          ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                          : "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                      )}
                    >
                      {isUser ? <User size={15} /> : <Sparkles size={15} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white/90">
                          {isUser ? 'User Voice Query' : 'AI Voice Response'}
                        </span>
                        {item.voicePersona && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 border border-white/10 text-white/60">
                            Voice: {item.voicePersona}
                          </span>
                        )}
                        {item.audioUrl && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Music size={10} />
                            Audio Clip
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5 font-mono">
                        <Clock size={11} />
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                  {/* Actions Header Toolbar */}
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Play Audio Button */}
                    <button
                      onClick={() => handleTogglePlay(item)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm",
                        isPlaying
                          ? "bg-amber-500 text-black font-semibold animate-pulse"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40"
                      )}
                      title={isPlaying ? 'Stop playback' : 'Play audio transcript clip'}
                    >
                      {isPlaying ? (
                        <>
                          <Square size={12} fill="currentColor" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>Play Audio</span>
                        </>
                      )}
                    </button>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(item)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
                      title="Copy transcript text"
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>

                    {/* Send to Chat Workspace Button */}
                    <button
                      onClick={() => handleSendToChat(item.text)}
                      className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 hover:text-blue-200 transition-all"
                      title="Send to Chat Workspace"
                    >
                      <Send size={14} />
                    </button>

                    {/* Delete Item */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                      title="Delete transcript item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Spoken Text Content */}
                <div className="mt-3 text-sm text-white/85 leading-relaxed pl-1">
                  {item.text}
                </div>

                {/* Active Waveform Visualizer Bar when playing */}
                {isPlaying && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center gap-3 bg-emerald-500/5 p-2.5 rounded-xl"
                  >
                    <div className="flex items-center gap-1 h-5">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [6, 18, 8, 22, 10][i % 5],
                          }}
                          transition={{
                            repeat: Infinity,
                            repeatType: 'reverse',
                            duration: 0.35 + (i % 3) * 0.1,
                          }}
                          className="w-1 bg-emerald-400 rounded-full"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono text-emerald-300 tracking-wide">
                      Playing audio at {playbackSpeed}x speed...
                    </span>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VoiceHistoryPanel;
