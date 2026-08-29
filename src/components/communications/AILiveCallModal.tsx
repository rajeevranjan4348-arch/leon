import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  Eye,
  Volume2,
  VolumeX,
  SwitchCamera,
  Layers,
  Radio,
  User,
  Zap,
} from 'lucide-react';
import { CommUser } from '@/types/comm';
import { analyzeLiveFrame } from '@/lib/comm/aiVisionService';
import { voiceCommandRouter } from '@/voice/voiceCommandRouter';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AILiveCallModalProps {
  isOpen: boolean;
  currentUser: CommUser;
  mode: 'voice' | 'video';
  onClose: () => void;
  onTranscriptAdd?: (role: 'user' | 'assistant', text: string) => void;
}

export const AILiveCallModal: React.FC<AILiveCallModalProps> = ({
  isOpen,
  currentUser,
  mode: initialMode,
  onClose,
  onTranscriptAdd,
}) => {
  const [callMode, setCallMode] = useState<'voice' | 'video'>(initialMode);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(initialMode === 'video');
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [aiStatus, setAiStatus] = useState<'listening' | 'thinking' | 'speaking'>('listening');
  const [currentAiSpeech, setCurrentAiSpeech] = useState('Hello! I am your real-time AI copilot. How can I help you today?');
  const [userSpeechSnippet, setUserSpeechSnippet] = useState('');
  const [isVisionScanning, setIsVisionScanning] = useState(false);
  const [visionInsight, setVisionInsight] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  const visionScanTimerRef = useRef<any>(null);

  // Initialize camera/mic and speech recognition
  useEffect(() => {
    if (!isOpen) return;

    // Timer
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Initial greeting
    speakAI('Hello! I am your real-time AI assistant. I am listening and ready to help.');

    // Start media
    startMediaStream(callMode === 'video', cameraFacing);

    // Start Web Speech Recognition
    startSpeechRecognition();

    return () => {
      stopMediaStream();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (visionScanTimerRef.current) clearInterval(visionScanTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  const startMediaStream = async (video: boolean, facing: 'user' | 'environment') => {
    stopMediaStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current && video) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Could not start media stream:', err);
    }
  };

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const speakAI = (text: string) => {
    if (isSpeakerMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setCurrentAiSpeech(text);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Choose high quality voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((v) => v.lang.includes('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setAiStatus('speaking');
      setCurrentAiSpeech(text);
    };

    utterance.onend = () => {
      setAiStatus('listening');
      if (onTranscriptAdd) onTranscriptAdd('assistant', text);
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = async (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }

        setUserSpeechSnippet(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          const finalText = transcript.trim();
          if (!finalText) return;
          setUserSpeechSnippet('');
          setAiStatus('thinking');
          if (onTranscriptAdd) onTranscriptAdd('user', finalText);

          // Generate AI answer (with Vision if camera is on)
          await handleAIQuery(finalText);
        }
      };

      recognition.onerror = () => {
        // restart silently
        setTimeout(() => {
          if (isOpen && !isMicMuted) {
            try {
              recognition.start();
            } catch {}
          }
        }, 1000);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
    }
  };

  const handleAIQuery = async (query: string) => {
    try {
      // First check if query is an app launcher or UI command
      const voiceCmdResult = await voiceCommandRouter.processVoiceInput(query, { speakFeedback: false });
      if (voiceCmdResult.isCommand) {
        setAiStatus('speaking');
        const feedback = voiceCmdResult.textFeedback || 'Opening requested app...';
        speakAI(feedback);
        if (onTranscriptAdd) onTranscriptAdd('assistant', feedback);
        return;
      }

      let visionData = '';
      if (isVideoActive && localVideoRef.current) {
        setIsVisionScanning(true);
        const result = await analyzeLiveFrame(localVideoRef.current, query, 'Live Video Session');
        visionData = result.response;
        setVisionInsight(visionData);
        setIsVisionScanning(false);
        speakAI(visionData);
        return;
      }

      // Voice answer via Gemini API
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a real-time conversational AI voice assistant. Keep answers natural, concise (1-3 sentences), warm, and spoken directly.',
            },
            { role: 'user', content: query },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.text || data.response || "I'm right here with you! Let me know what you'd like to explore next.";
        speakAI(responseText);
      } else {
        speakAI(`I heard you say "${query}". I'm analyzing your request right now.`);
      }
    } catch {
      speakAI(`I understand. Let me help you with that right away.`);
    }
  };

  const handleToggleMic = () => {
    setIsMicMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
      }
      return next;
    });
  };

  const handleToggleVideo = () => {
    setIsVideoActive((prev) => {
      const next = !prev;
      startMediaStream(next, cameraFacing);
      return next;
    });
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (isVideoActive) {
      startMediaStream(true, nextFacing);
    }
  };

  const handleTriggerVisionScan = async () => {
    if (!localVideoRef.current) {
      toast.info('Enable video to scan with Gemini Vision');
      return;
    }
    setIsVisionScanning(true);
    toast.info('Scanning live camera frame...');
    try {
      const res = await analyzeLiveFrame(localVideoRef.current, undefined, 'Instant camera inspection');
      setVisionInsight(res.response);
      speakAI(res.response);
    } catch (e: any) {
      toast.error('Vision scan failed');
    } finally {
      setIsVisionScanning(false);
    }
  };

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 md:p-8 select-none font-sans overflow-hidden"
      >
        {/* TOP HEADER */}
        <div className="w-full max-w-lg flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0e0f17] rounded-[14px] flex items-center justify-center text-cyan-400">
                <Sparkles size={20} className="animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">Gemini Live Assistant</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  REAL-TIME AI
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/50 font-mono mt-0.5">
                <span>{formatTimer(callDuration)}</span>
                <span>•</span>
                <span className="capitalize text-emerald-400 font-sans">{aiStatus}...</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={cn(
              'p-2.5 rounded-2xl transition-colors cursor-pointer border',
              isSpeakerMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-white/10 text-white/80 hover:text-white border-white/10'
            )}
            title={isSpeakerMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
          >
            {isSpeakerMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* CENTER BODY: ORB / CAMERA VIEW */}
        <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center my-auto relative z-10">
          {isVideoActive ? (
            /* CAMERA + VISION HUD */
            <div className="relative w-full aspect-[3/4] max-h-[50vh] md:max-h-[55vh] rounded-3xl overflow-hidden bg-zinc-900 border border-white/20 shadow-2xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Vision Scan Scanner Line */}
              {isVisionScanning && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-pulse pointer-events-none border-b-2 border-cyan-400" />
              )}

              {/* Top Controls Overlay */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 flex items-center gap-1.5">
                  <Eye size={12} className="text-cyan-400" />
                  Live Vision Feed
                </span>

                <button
                  onClick={handleFlipCamera}
                  className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-white/90 hover:text-white border border-white/15 transition-transform active:scale-90"
                  title="Flip Camera"
                >
                  <SwitchCamera size={16} />
                </button>
              </div>

              {/* Instant Scan button */}
              <div className="absolute bottom-4 left-4 right-4">
                <button
                  onClick={handleTriggerVisionScan}
                  disabled={isVisionScanning}
                  className="w-full py-2.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  <span>{isVisionScanning ? 'Analyzing Scene...' : 'Scan Surroundings with Gemini'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* INTERACTIVE VOICE ORB VISUALIZER */
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Multi-layered Glowing Pulse Rings */}
                <motion.div
                  animate={{
                    scale: aiStatus === 'speaking' ? [1, 1.35, 1] : aiStatus === 'thinking' ? [1, 1.15, 1] : [1, 1.08, 1],
                    opacity: aiStatus === 'speaking' ? [0.4, 0.8, 0.4] : [0.2, 0.4, 0.2],
                  }}
                  transition={{ repeat: Infinity, duration: aiStatus === 'speaking' ? 1.5 : 2.5, ease: 'easeInOut' }}
                  className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500/40 via-indigo-500/30 to-purple-500/40 blur-2xl pointer-events-none"
                />

                <motion.div
                  animate={{
                    scale: aiStatus === 'speaking' ? [1, 1.1, 1] : [1, 1.03, 1],
                    rotate: 360,
                  }}
                  transition={{
                    scale: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                    rotate: { repeat: Infinity, duration: 16, ease: 'linear' },
                  }}
                  className="w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 p-1 shadow-2xl flex items-center justify-center cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-[#0a0b12] flex items-center justify-center">
                    <Sparkles
                      size={48}
                      className={cn(
                        'transition-all duration-300',
                        aiStatus === 'speaking'
                          ? 'text-cyan-300 scale-110 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                          : aiStatus === 'thinking'
                          ? 'text-purple-300 scale-95'
                          : 'text-white/60'
                      )}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/70">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    aiStatus === 'speaking'
                      ? 'bg-cyan-400 animate-pulse'
                      : aiStatus === 'thinking'
                      ? 'bg-purple-400 animate-ping'
                      : 'bg-emerald-400'
                  )}
                />
                <span className="capitalize">{aiStatus === 'speaking' ? 'Gemini is speaking' : aiStatus === 'thinking' ? 'Gemini is thinking' : 'Listening to you...'}</span>
              </div>
            </div>
          )}

          {/* REAL-TIME SPEECH & INSIGHT SUBTITLES */}
          <div className="w-full mt-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-center shadow-lg">
            {userSpeechSnippet ? (
              <p className="text-xs text-cyan-300 italic font-medium">"{userSpeechSnippet}..."</p>
            ) : visionInsight ? (
              <div className="text-xs text-white/90 font-sans">
                <span className="text-cyan-400 font-bold mr-1">Vision Copilot:</span>
                {visionInsight}
              </div>
            ) : (
              <p className="text-xs text-white/80 font-sans leading-relaxed">
                "{currentAiSpeech}"
              </p>
            )}
          </div>
        </div>

        {/* BOTTOM IN-CALL CONTROLS */}
        <div className="w-full max-w-md flex items-center justify-center gap-4 z-20 pt-2">
          {/* Mute Microphone */}
          <button
            onClick={handleToggleMic}
            className={cn(
              'w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border cursor-pointer',
              isMicMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-lg shadow-red-500/20'
                : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
            )}
            title={isMicMuted ? 'Unmute' : 'Mute'}
          >
            {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Toggle Video/Camera */}
          <button
            onClick={handleToggleVideo}
            className={cn(
              'w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border cursor-pointer',
              isVideoActive
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/30'
                : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
            )}
            title={isVideoActive ? 'Turn Video Off' : 'Turn Video On'}
          >
            {isVideoActive ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* END CALL BUTTON */}
          <button
            onClick={onClose}
            className="w-16 h-16 rounded-3xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="End Session"
          >
            <PhoneOff size={26} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
