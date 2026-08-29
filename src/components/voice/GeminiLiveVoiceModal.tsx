import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  PhoneOff,
  Pause,
  Play,
  Sliders,
  X,
  MessageSquare,
  Send,
  Sparkles,
  Keyboard,
  Gauge,
  Volume2,
  Moon,
  ListFilter,
  Check,
  Radio,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GeminiLiveSession } from '@/lib/geminiLiveClient';
import { saveToVoiceHistory } from '@/lib/voiceHistory';
import { voiceCommandRouter } from '@/voice/voiceCommandRouter';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (text: string) => void;
  aiName?: string;
}

const LIVE_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', desc: 'Balanced & Natural' },
  { id: 'Tintin', name: 'Tintin', desc: 'Friendly & Warm' },
  { id: 'Puck', name: 'Puck', desc: 'Playful & Upbeat' },
  { id: 'Charon', name: 'Charon', desc: 'Deep Baritone' },
  { id: 'Kore', name: 'Kore', desc: 'Soft & Empathetic' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Direct & Crisp' },
];

const SPEECH_RATES = [0.8, 1.0, 1.2, 1.5, 2.0];

/**
 * Real-time Smooth Waveform Visualizer Component
 * Displays reactive audio waveform bars based on microphone volume levels
 */
const SmoothListeningWaveform: React.FC<{
  status: string;
  audioLevel: number;
  isPaused: boolean;
}> = ({ status, audioLevel, isPaused }) => {
  const isListening = status === 'listening' || status === 'connected' || audioLevel > 0.02;
  const barsCount = 28;

  return (
    <div className="flex flex-col items-center gap-2.5 my-3 w-full max-w-sm px-4 relative z-20">
      {/* Listening State Status Pill */}
      <div
        className={cn(
          "px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2.5 transition-all shadow-lg backdrop-blur-md",
          isPaused
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : isListening
            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10"
            : "bg-cyan-500/10 border-cyan-500/25 text-cyan-300"
        )}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isPaused ? "bg-amber-400" : "bg-emerald-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              isPaused ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
        </span>

        <span className="tracking-wide">
          {isPaused
            ? 'Session Paused'
            : isListening
            ? 'Listening to Microphone...'
            : 'Ready to Listen'}
        </span>

        <div className="h-3 w-px bg-white/20" />

        <span className="font-mono text-[11px] opacity-85">
          {Math.round(audioLevel * 100)}% Vol
        </span>
      </div>

      {/* Smooth Multi-Bar Waveform Visualization */}
      <div className="flex items-center justify-center gap-1.5 h-12 w-full py-1">
        {Array.from({ length: barsCount }).map((_, i) => {
          // Center distance weight for parabolic wave arc
          const centerIndex = barsCount / 2;
          const distFromCenter = Math.abs(i - centerIndex) / centerIndex;
          const centerWeight = Math.cos(distFromCenter * (Math.PI / 2.2));

          // Base animated height + audio level boost
          const noise = Math.sin(i * 0.45 + Date.now() * 0.005) * 0.25;
          const dynamicMultiplier = isPaused ? 0.08 : Math.max(0.12, audioLevel * 2.2 + noise);
          const barHeightPx = Math.min(48, Math.max(6, Math.round(centerWeight * dynamicMultiplier * 48)));

          return (
            <motion.div
              key={i}
              animate={{
                height: `${barHeightPx}px`,
                opacity: isPaused ? 0.3 : 0.4 + (barHeightPx / 48) * 0.6,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 18,
              }}
              className={cn(
                "w-1 rounded-full transition-colors duration-200",
                audioLevel > 0.35
                  ? "bg-gradient-to-t from-emerald-500 via-cyan-400 to-indigo-400 shadow-sm shadow-emerald-400/50"
                  : audioLevel > 0.15
                  ? "bg-gradient-to-t from-cyan-500 to-blue-400"
                  : "bg-gradient-to-t from-cyan-600/60 to-blue-500/40"
              )}
            />
          );
        })}
      </div>
    </div>
  );
};

export const GeminiLiveVoiceModal: React.FC<GeminiLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
  aiName = 'Rishi',
}) => {
  const [status, setStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error'
  >('disconnected');

  // Interactive controls
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Settings Toggles (Matching Screenshot 2)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enableOpening, setEnableOpening] = useState(true);
  const [enableVoiceInterrupt, setEnableVoiceInterrupt] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [keyboardInputEnabled, setKeyboardInputEnabled] = useState(true);

  // Panels & Views
  const [showCaptions, setShowCaptions] = useState(false);
  const [showKeyboardInput, setShowKeyboardInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  // Transcripts & Live Spoken Text
  const [transcripts, setTranscripts] = useState<
    Array<{ text: string; isUser: boolean; timestamp: string }>
  >([]);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>(
    'Good to hear your voice! How are you?'
  );

  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Scroll transcripts to bottom
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Connect when modal opens
  useEffect(() => {
    if (isOpen) {
      const session = new GeminiLiveSession({
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onAudioData: (rms) => {
          setAudioLevel(Math.min(1, rms * 4));
        },
        onTranscript: (text, isUser) => {
          if (!isUser && text.trim()) {
            setCurrentSpokenText(text);
          }
          if (text.trim()) {
            saveToVoiceHistory({
              text: text.trim(),
              role: isUser ? 'user' : 'assistant',
              voicePersona: selectedVoice,
              timestamp: new Date().toISOString(),
            });
            if (isUser) {
              voiceCommandRouter.processVoiceInput(text.trim(), { speakFeedback: true });
            }
          }
          setTranscripts((prev) => [
            ...prev,
            {
              text,
              isUser,
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]);
        },
        onError: (err) => {
          if (
            !err?.toLowerCase().includes('permission') &&
            !err?.toLowerCase().includes('microphone')
          ) {
            toast.error(`Gemini Live: ${err}`);
          }
        },
      });

      liveSessionRef.current = session;
      session.start(selectedVoice);

      // Default opening greeting text if enabled
      if (enableOpening) {
        setCurrentSpokenText('Good to hear your voice! How are you?');
      } else {
        setCurrentSpokenText('Start speaking anytime...');
      }

      return () => {
        session.stop();
        liveSessionRef.current = null;
      };
    } else {
      liveSessionRef.current?.stop();
      liveSessionRef.current = null;
      setStatus('disconnected');
      setIsSettingsOpen(false);
      setShowCaptions(false);
      setShowKeyboardInput(false);
    }
  }, [isOpen]);

  // Request Microphone permissions
  const handleRequestMic = async () => {
    if (!liveSessionRef.current) return;
    setIsRequestingMic(true);
    try {
      const granted = await liveSessionRef.current.requestMicrophone();
      if (granted) {
        toast.success('Microphone connected successfully');
      } else {
        toast.info('Please grant microphone access in browser settings.');
      }
    } catch {
      toast.info('Microphone access could not be granted.');
    } finally {
      setIsRequestingMic(false);
    }
  };

  // Toggle Voice Pause / Resume
  const handleTogglePause = () => {
    if (liveSessionRef.current) {
      const muted = liveSessionRef.current.toggleMute();
      setIsPaused(muted);
      if (muted) {
        toast.info('Voice session paused');
      } else {
        toast.success('Voice session resumed');
      }
    } else {
      setIsPaused(!isPaused);
    }
  };

  // Change Voice
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    liveSessionRef.current?.setVoice(voiceId);
    toast.success(`Voice updated to ${voiceId}`);
  };

  // Cycle Speech Rate
  const handleCycleSpeechRate = () => {
    const currentIndex = SPEECH_RATES.indexOf(speechRate);
    const nextRate = SPEECH_RATES[(currentIndex + 1) % SPEECH_RATES.length];
    setSpeechRate(nextRate);
    liveSessionRef.current?.setSpeechRate(nextRate);
    toast.success(`Speech rate set to ${nextRate.toFixed(1)}x`);
  };

  // Send Text Message to Live Session
  const handleSendText = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (textInput.trim()) {
      if (liveSessionRef.current) {
        liveSessionRef.current.sendTextMessage(textInput.trim());
      } else {
        setTranscripts((prev) => [
          ...prev,
          {
            text: textInput.trim(),
            isUser: true,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      }
      setTextInput('');
    }
  };

  // Export full transcript back to main chat
  const handleExportToChat = () => {
    const fullTranscript = transcripts
      .map((t) => `${t.isUser ? 'You' : `${aiName} AI`}: ${t.text}`)
      .join('\n\n');
    if (fullTranscript && onSendToChat) {
      onSendToChat(fullTranscript);
      onClose();
      toast.success('Conversation exported to chat');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0b0e14] text-white overflow-hidden select-none animate-fade-in font-sans">
        {/* ── TOP HEADER BAR ── */}
        <div className="relative z-40 flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent">
          {/* Left: Document/Captions Toggle Icon [=] */}
          <button
            type="button"
            onClick={() => setShowCaptions(!showCaptions)}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
              showCaptions
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
            )}
            title="Toggle Live Transcripts / Captions"
            aria-label="Toggle Transcripts"
          >
            <ListFilter size={20} />
          </button>

          {/* Center: AI Name & Subtitle */}
          <div className="text-center flex flex-col items-center">
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>{aiName}</span>
            </h2>
            <p className="text-[11px] font-medium text-zinc-400/90 tracking-wide">
              Generated by {aiName} AI
            </p>
          </div>

          {/* Right: Settings Sliders Icon [o=o] & Active Mic Indicator */}
          <div className="flex items-center gap-2">
            {/* Top Right Green Mic Indicator Capsule */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Mic size={12} />
            </div>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center",
                isSettingsOpen
                  ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/10"
                  : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              )}
              title="Voice Call Settings"
              aria-label="Open Voice Settings"
            >
              <Sliders size={20} />
            </button>
          </div>
        </div>

        {/* ── SETTINGS POPOVER DROPDOWN (MATCHING SCREENSHOT 2) ── */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-4 top-16 z-50 w-72 p-3 bg-[#131824] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl text-xs space-y-2.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-semibold text-white/90 text-xs">Live Voice Options</span>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X size={15} />
                </button>
              </div>

              {/* 1. Speech Rate */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                <div className="flex items-center gap-2.5">
                  <Gauge size={16} className="text-cyan-400" />
                  <span className="font-medium text-white/90">Speech rate</span>
                </div>
                <button
                  type="button"
                  onClick={handleCycleSpeechRate}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-colors"
                >
                  {speechRate.toFixed(1)}x
                </button>
              </div>

              {/* 2. Voice Playback Persona */}
              <div className="p-2 rounded-xl bg-white/[0.03] space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Volume2 size={16} className="text-cyan-400" />
                    <span className="font-medium text-white/90">Voice playback</span>
                  </div>
                  <span className="text-cyan-300 font-semibold text-xs">{selectedVoice}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {LIVE_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVoiceChange(v.id)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-left text-[11px] transition-colors flex items-center justify-between border",
                        selectedVoice === v.id
                          ? "bg-cyan-500/25 border-cyan-500/50 text-cyan-200 font-bold"
                          : "bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className="truncate">{v.name}</span>
                      {selectedVoice === v.id && <Check size={12} className="text-cyan-300 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Opening Greeting Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={16} className="text-cyan-400" />
                  <span className="font-medium text-white/90">Opening</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableOpening(!enableOpening)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center",
                    enableOpening ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  )}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 4. Voice Interrupt Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Mic size={16} className="text-cyan-400" />
                  <span className="font-medium text-white/90">Voice Interrupt</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableVoiceInterrupt(!enableVoiceInterrupt)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center",
                    enableVoiceInterrupt ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  )}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 5. Dark Mode Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Moon size={16} className="text-cyan-400" />
                  <span className="font-medium text-white/90">Dark mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center",
                    darkMode ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  )}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* 6. Keyboard Input Toggle */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <div className="flex items-center gap-2.5">
                  <Keyboard size={16} className="text-cyan-400" />
                  <span className="font-medium text-white/90">Keyboard input</span>
                </div>
                <button
                  type="button"
                  onClick={() => setKeyboardInputEnabled(!keyboardInputEnabled)}
                  className={cn(
                    "w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer flex items-center",
                    keyboardInputEnabled ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  )}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MAIN CENTER AREA (GLOWING ORB + SPOKEN CAPTION) ── */}
        <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center">
          {/* Central Blue Ambient Glowing Orb Background */}
          <div className="relative flex items-center justify-center max-w-lg w-full">
            {/* Soft Ambient Radial Blur Halos */}
            <motion.div
              animate={{
                scale: status === 'speaking' ? [1, 1.2, 1] : isPaused ? 0.9 : [1, 1.08, 1],
                opacity: status === 'speaking' ? [0.55, 0.85, 0.55] : isPaused ? 0.2 : [0.35, 0.55, 0.35],
              }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-br from-blue-600/40 via-cyan-500/30 to-indigo-600/30 blur-3xl pointer-events-none"
            />

            <motion.div
              animate={{
                scale: 1 + audioLevel * 0.3,
              }}
              className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-cyan-400/20 via-blue-500/25 to-indigo-700/20 blur-2xl pointer-events-none"
            />

            {/* Central Spoken Caption Typography */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSpokenText}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="relative z-20 px-6 py-4 max-w-md mx-auto"
              >
                <p className="text-xl sm:text-2xl font-bold leading-relaxed text-white drop-shadow-md tracking-tight">
                  {currentSpokenText}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sub-status text & Smooth Listening Waveform Indicator */}
          <div className="mt-4 flex flex-col items-center gap-2 relative z-20 w-full">
            {status === 'mic_permission_needed' ? (
              <button
                type="button"
                onClick={handleRequestMic}
                disabled={isRequestingMic}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:bg-amber-400 cursor-pointer"
              >
                <Mic size={15} />
                <span>{isRequestingMic ? 'Connecting Mic...' : 'Allow Microphone'}</span>
              </button>
            ) : (
              <SmoothListeningWaveform
                status={status}
                audioLevel={audioLevel}
                isPaused={isPaused}
              />
            )}
          </div>
        </div>

        {/* ── LIVE TRANSCRIPT SHEET OVERLAY (WHEN [=] IS TOGGLED) ── */}
        <AnimatePresence>
          {showCaptions && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="relative z-30 mx-4 mb-2 p-4 bg-[#111622]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl max-h-52 overflow-y-auto"
              ref={transcriptScrollRef}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} /> Spoken Conversation History
                </span>
                {transcripts.length > 0 && (
                  <button
                    onClick={handleExportToChat}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold cursor-pointer"
                  >
                    Export to Chat
                  </button>
                )}
              </div>

              {transcripts.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">
                  Conversation history will stream here in real time...
                </p>
              ) : (
                <div className="space-y-2">
                  {transcripts.map((t, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs p-2 rounded-xl max-w-[88%]",
                        t.isUser
                          ? "ml-auto bg-cyan-500/20 border border-cyan-500/30 text-cyan-100"
                          : "mr-auto bg-white/5 border border-white/10 text-zinc-200"
                      )}
                    >
                      <span className="text-[9px] font-semibold opacity-60 block mb-0.5">
                        {t.isUser ? 'You' : `${aiName} AI`} • {t.timestamp}
                      </span>
                      <p>{t.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BOTTOM ACTION CONTROLS & KEYBOARD LINK ── */}
        <div className="relative z-30 pb-6 pt-2 px-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Main Circular Action Buttons */}
          <div className="flex items-center justify-center gap-10">
            {/* Pause / Resume Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={handleTogglePause}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center border transition-all cursor-pointer shadow-xl active:scale-95",
                  isPaused
                    ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-emerald-500/20"
                    : "bg-[#212735] hover:bg-[#2c3345] border-white/15 text-white/90"
                )}
                title={isPaused ? "Resume Session" : "Pause Session"}
              >
                {isPaused ? <Play size={24} className="ml-0.5" /> : <Pause size={24} />}
              </button>
              <span className="text-xs font-semibold text-white/70">
                {isPaused ? 'Resume' : 'Pause'}
              </span>
            </div>

            {/* End Call Button */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-[#cc3939] hover:bg-[#e24444] border border-red-400/40 text-white flex items-center justify-center shadow-xl shadow-red-900/30 cursor-pointer active:scale-95 transition-all"
                title="End Conversation"
              >
                <PhoneOff size={24} />
              </button>
              <span className="text-xs font-semibold text-white/70">End</span>
            </div>
          </div>

          {/* Keyboard Input Row / Link */}
          {keyboardInputEnabled && (
            <div className="w-full max-w-md flex flex-col items-center gap-2">
              {showKeyboardInput ? (
                <form
                  onSubmit={handleSendText}
                  className="w-full flex items-center gap-2 p-1.5 bg-[#181d2a] border border-white/15 rounded-2xl shadow-xl"
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Type a message to Rishi..."
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim()}
                    className="p-2 rounded-xl bg-cyan-500 text-black font-bold disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKeyboardInput(false)}
                    className="p-2 text-zinc-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowKeyboardInput(true)}
                  className="flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5"
                >
                  <Keyboard size={15} />
                  <span>Tap to show keyboard</span>
                </button>
              )}
            </div>
          )}

          {/* Bottom Gesture Handle Indicator */}
          <div className="w-28 h-1 bg-white/20 rounded-full mt-1" />
        </div>
      </div>
    </AnimatePresence>
  );
};

export default GeminiLiveVoiceModal;
