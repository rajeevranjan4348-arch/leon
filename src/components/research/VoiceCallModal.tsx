import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Radio, 
  Check, 
  ChevronRight,
  Maximize2,
  RefreshCw,
  PhoneOff,
  MessageSquare,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  getAIVoicePersonaId, 
  saveAIVoicePersonaId, 
  getVoiceForPersona, 
  VOICE_PERSONAS 
} from '@/lib/voiceService';
import { containsCallCommand, processAndExecuteCallCommand } from '@/lib/callRouter';
import { parseWhatsAppCommand, executeWhatsAppAction } from '@/lib/whatsappService';
import { parseCommunicationIntent, actionToolRegistry } from '@/lib/communicationAgent';
import { getCityAndWeatherContext } from '@/lib/weatherService';
import { saveToVoiceHistory } from '@/lib/voiceHistory';
import { FluidIridescentOrb } from '@/components/ui/FluidIridescentOrb';
import { VoicePulsingDots } from './VoicePulsingDots';
import { sendNvidiaVoiceChat, stopActiveNvidiaVoice } from '@/lib/services/nvidiaVoiceService';

export type VoiceMood = 'Warm' | 'Professional' | 'Energetic' | 'Calm';

export interface VoiceMoodOption {
  id: VoiceMood;
  label: string;
  icon: string;
  description: string;
  pitchModifier: number;
  rateModifier: number;
  promptInstruction: string;
}

export const VOICE_MOODS: VoiceMoodOption[] = [
  {
    id: 'Warm',
    label: 'Warm',
    icon: '☀️',
    description: 'Empathetic, soothing & friendly tone',
    pitchModifier: 1.0,
    rateModifier: 0.95,
    promptInstruction: 'Speak in a warm, friendly, empathetic, and reassuring conversational tone.'
  },
  {
    id: 'Professional',
    label: 'Professional',
    icon: '💼',
    description: 'Articulate, clear & formal tone',
    pitchModifier: 0.95,
    rateModifier: 1.0,
    promptInstruction: 'Speak in a formal, professional, clear, articulate, and direct tone.'
  },
  {
    id: 'Energetic',
    label: 'Energetic',
    icon: '⚡',
    description: 'Upbeat, enthusiastic & lively tone',
    pitchModifier: 1.12,
    rateModifier: 1.08,
    promptInstruction: 'Speak in an upbeat, energetic, dynamic, and enthusiastic tone!'
  },
  {
    id: 'Calm',
    label: 'Calm',
    icon: '🌿',
    description: 'Relaxed, gentle & mindful tone',
    pitchModifier: 0.88,
    rateModifier: 0.9,
    promptInstruction: 'Speak in a relaxed, gentle, peaceful, and serene tone.'
  }
];

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiName?: string;
  onSendMessage?: (message: string) => void;
}

// Web Speech Recognition types helper
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

  // Topographic Contour Lines SVG Background
const TopographicContourBackground: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn("absolute top-0 left-0 w-full h-56 pointer-events-none z-0 select-none overflow-visible", className)}
    viewBox="0 0 500 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="none"
  >
    <path d="M -30,15 C 80,0 180,38 250,38 C 320,38 420,0 530,15" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M -30,35 C 70,18 170,58 250,58 C 330,58 430,18 530,35" stroke="rgba(255, 255, 255, 0.09)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M -30,58 C 60,38 160,80 250,80 C 340,80 440,38 530,58" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M -30,82 C 50,60 150,102 250,102 C 350,102 450,60 530,82" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M -30,108 C 40,84 140,126 250,126 C 360,126 460,84 530,108" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M -30,135 C 30,110 130,150 250,150 C 370,150 470,110 530,135" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  isOpen,
  onClose,
  aiName = 'AI Buddy',
  onSendMessage,
}) => {
  // Call state machine
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'paused'>('connecting');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState<boolean>(false);
  const [popoverTab, setPopoverTab] = useState<'chat' | 'settings'>('chat');
  const [chatInputText, setChatInputText] = useState<string>('');
  const [activePersona, setActivePersona] = useState<string>(getAIVoicePersonaId());
  const [voiceMood, setVoiceMood] = useState<VoiceMood>('Warm');
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Transcripts & Display State
  const [liveUserSentence, setLiveUserSentence] = useState<string>('');
  const [lastCompletedQuery, setLastCompletedQuery] = useState<string>('');
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [showLiveTranscript, setShowLiveTranscript] = useState<boolean>(false);
  const [aiSpeechText, setAiSpeechText] = useState<string>('');

  // Audio Amplitude analyzer (0.0 to 1.0)
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const selectedLanguage = 'en-US';

  // Engine Refs
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const hideTranscriptTimerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isThinkingRef = useRef<boolean>(false);
  const voiceModeRef = useRef<boolean>(false);
  const isMicMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const fullTranscriptRef = useRef<string>('');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const SILENCE_DELAY = 1200;

  // Sync ref values for async callbacks
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
    if (isSpeakerMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeakerMuted]);

  // Call Duration Timer
  useEffect(() => {
    if (isOpen) {
      setCallDuration(0);
      timerIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load Speech Synthesis Voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Web Audio API Microphone Volume Input Analyzer
  const initAudioAnalyser = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1.0, Math.max(0, (avg - 10) / 70));
        setAudioVolume(normalized);

        animFrameIdRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (err) {
      console.warn('Microphone volume analyser fallback:', err);
    }
  }, []);

  const stopAudioAnalyser = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setAudioVolume(0);
  }, []);

  // Stop Speech Recognition instance
  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    isListeningRef.current = false;
  }, []);

  // Start Speech Recognition
  const startRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    if (!voiceModeRef.current || isMicMutedRef.current) return;
    if (isListeningRef.current || isSpeakingRef.current || isThinkingRef.current) return;
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) return;

    try {
      stopRecognition();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        isThinkingRef.current = false;
        setCallState('listening');
      };

      recognition.onresult = (event: any) => {
        // Interruption support: if user speaks while AI is speaking, interrupt AI speech immediately
        if (isSpeakingRef.current || (typeof window !== 'undefined' && window.speechSynthesis?.speaking)) {
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          isSpeakingRef.current = false;
          setAiSpeechText('');
          setCallState('listening');
        }

        if (!voiceModeRef.current || isMicMutedRef.current || isThinkingRef.current) return;

        let fullFinal = '';
        let fullInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            fullFinal += text + ' ';
          } else {
            fullInterim += text + ' ';
          }
        }

        const combined = cleanText(`${fullFinal} ${fullInterim}`);
        if (combined) {
          if (hideTranscriptTimerRef.current) {
            clearTimeout(hideTranscriptTimerRef.current);
            hideTranscriptTimerRef.current = null;
          }
          fullTranscriptRef.current = combined;
          setLiveUserSentence(combined);
          setIsUserSpeaking(true);
          setShowLiveTranscript(true);
        }

        // Reset silence timer - trigger after brief conversational pause
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          processVoiceInput();
        }, SILENCE_DELAY);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          stopRecognition();
          setIsMicMuted(true);
          toast.error('Microphone access denied. Please allow microphone permissions.');
          return;
        }

        // Auto restart recognition on soft transient errors
        if (voiceModeRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
          setTimeout(() => {
            if (voiceModeRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isThinkingRef.current && !isListeningRef.current) {
              startRecognition();
            }
          }, 300);
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        if (voiceModeRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isThinkingRef.current && isOpen) {
          setTimeout(() => {
            if (voiceModeRef.current && !isMicMutedRef.current && !isSpeakingRef.current && !isThinkingRef.current && !isListeningRef.current && isOpen) {
              startRecognition();
            }
          }, 150);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.warn('Start recognition exception:', error);
      isListeningRef.current = false;
    }
  }, [selectedLanguage, stopRecognition, isOpen]);

  // Voice AI Synthesis Output
  const speakVoiceReply = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || isSpeakerMutedRef.current) {
        setCallState('connected');
        if (voiceModeRef.current && !isMicMutedRef.current && isOpen) {
          setCallState('listening');
          startRecognition();
        }
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      isSpeakingRef.current = true;
      setCallState('speaking');
      setAiSpeechText(text);

      const activeMoodObj = VOICE_MOODS.find(m => m.id === voiceMood) || VOICE_MOODS[0];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0;
      utterance.lang = selectedLanguage;

      const voicesList = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      const { voice, pitch } = getVoiceForPersona(voicesList, activePersona);

      if (voice) {
        utterance.voice = voice;
      } else {
        const preferredVoice = voicesList.find(v => v.lang.toLowerCase().includes('en-us') || v.lang.toLowerCase().startsWith('en')) ||
          voicesList[0];
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      utterance.rate = Math.max(0.5, Math.min(2.0, speechRate * activeMoodObj.rateModifier));
      utterance.pitch = Math.max(0.5, Math.min(2.0, pitch * activeMoodObj.pitchModifier));

      currentUtteranceRef.current = utterance;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setCallState('speaking');
      };

      const handleEnd = () => {
        isSpeakingRef.current = false;
        currentUtteranceRef.current = null;
        setAiSpeechText('');

        if (voiceModeRef.current && !isMicMutedRef.current && isOpen) {
          setCallState('listening');
          startRecognition();
        } else {
          setCallState('connected');
        }
        resolve();
      };

      utterance.onend = handleEnd;
      utterance.onerror = () => {
        handleEnd();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [availableVoices, selectedLanguage, isOpen, startRecognition, activePersona, speechRate]);

  // Voice AI Query Dispatcher
  const askAIFromVoice = useCallback(async (text: string) => {
    isThinkingRef.current = true;
    setCallState('thinking');
    setLastCompletedQuery(text);

    // Save user prompt to voice history
    saveToVoiceHistory(text);

    try {
      if (containsCallCommand(text)) {
        const callResult = await processAndExecuteCallCommand(text, { speakResponse: false });
        isThinkingRef.current = false;
        saveToVoiceHistory(`AI: ${callResult.spokenMessage}`);
        await speakVoiceReply(callResult.spokenMessage);
        return;
      }

      // Voice Communication Agent Handling (WhatsApp, SMS, Phone, Reminders, Apps)
      const commParsed = parseCommunicationIntent(text);
      if (commParsed.isHandled && commParsed.isAgentCommand) {
        if (commParsed.toolType === 'send_whatsapp') {
          actionToolRegistry.sendWhatsAppMessage(commParsed.recipientName, commParsed.messageText);
        } else if (commParsed.toolType === 'send_sms') {
          actionToolRegistry.sendSMS(commParsed.recipientName, commParsed.messageText);
        } else if (commParsed.toolType === 'start_phone_call') {
          actionToolRegistry.startPhoneCall(commParsed.recipientName);
        } else if (commParsed.toolType === 'start_whatsapp_call') {
          actionToolRegistry.startWhatsAppCall(commParsed.recipientName);
        } else if (commParsed.toolType === 'open_maps') {
          actionToolRegistry.openMaps(commParsed.recipientName || commParsed.messageText || 'Destination');
        } else if (commParsed.toolType === 'create_reminder') {
          actionToolRegistry.createReminder(commParsed.messageText || commParsed.recipientName);
        } else if (commParsed.toolType === 'set_alarm') {
          actionToolRegistry.setAlarm(commParsed.messageText || '6:00 AM');
        } else if (commParsed.toolType === 'open_app') {
          actionToolRegistry.openApp(commParsed.recipientName);
        }

        isThinkingRef.current = false;
        saveToVoiceHistory(`AI: ${commParsed.spokenResponse}`);
        await speakVoiceReply(commParsed.spokenResponse);
        return;
      }

      // Voice WhatsApp Command Handling
      const parsedWa = parseWhatsAppCommand(text);
      if (parsedWa.isWhatsAppCommand && parsedWa.actionType !== 'none') {
        const waResult = executeWhatsAppAction(parsedWa, { autoOpen: true });
        isThinkingRef.current = false;
        saveToVoiceHistory(`AI: ${waResult.spokenMessage}`);
        await speakVoiceReply(waResult.spokenMessage);
        return;
      }

      const weatherContext = await getCityAndWeatherContext(text);
      const activeMoodObj = VOICE_MOODS.find(m => m.id === voiceMood) || VOICE_MOODS[0];

      let reply = '';
      try {
        const voiceChatRes = await sendNvidiaVoiceChat({
          prompt: `${text} (Context: ${weatherContext}. Voice Mood Instruction: ${activeMoodObj.promptInstruction})`,
          persona: activePersona,
          mood: voiceMood,
        });
        if (voiceChatRes.success && voiceChatRes.text) {
          reply = voiceChatRes.text.trim();
        }
      } catch {
        // Fallback to Gemini voice chat
      }

      if (!reply) {
        const response = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }],
            systemInstruction: `You are ${aiName}, a conversational and ultra-helpful voice AI buddy. Provide an elegant, engaging, concise, and direct spoken answer in 1-2 natural sentences suitable for a live voice chat.\nVoice Mood Instruction: ${activeMoodObj.promptInstruction}\n\n${weatherContext}`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          reply = data?.text?.trim() || `I looked into "${text}". Let me know what you'd like to explore next!`;
        } else {
          reply = `I heard "${text}". How would you like me to help with this?`;
        }
      }

      saveToVoiceHistory(`AI: ${reply}`);
      isThinkingRef.current = false;
      await speakVoiceReply(reply);
    } catch (error) {
      console.error('Voice AI error:', error);
      isThinkingRef.current = false;
      const fallback = `I caught "${text}". I'm ready for your next thought.`;
      saveToVoiceHistory(`AI: ${fallback}`);
      await speakVoiceReply(fallback);
    }
  }, [aiName, speakVoiceReply, voiceMood, activePersona]);

  // Process Voice Input when Silence Threshold is reached
  const processVoiceInput = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const queryToSend = fullTranscriptRef.current.trim();
    if (!queryToSend) {
      setIsUserSpeaking(false);
      setShowLiveTranscript(false);
      setLiveUserSentence('');
      return;
    }

    setIsUserSpeaking(false);

    // Briefly hold the final completed transcript on screen (~500ms), then smoothly transition to animated dots
    if (hideTranscriptTimerRef.current) {
      clearTimeout(hideTranscriptTimerRef.current);
    }
    hideTranscriptTimerRef.current = setTimeout(() => {
      setShowLiveTranscript(false);
      setLiveUserSentence('');
      fullTranscriptRef.current = '';
    }, 500);

    stopRecognition();
    await askAIFromVoice(queryToSend);
  }, [askAIFromVoice, stopRecognition]);

  // Start Voice Mode
  const startVoice = useCallback(async () => {
    if (voiceModeRef.current && isListeningRef.current) return;

    voiceModeRef.current = true;
    fullTranscriptRef.current = '';
    setLiveUserSentence('');
    setIsUserSpeaking(false);
    setShowLiveTranscript(false);
    setCallState('connected');

    try {
      await initAudioAnalyser();
    } catch (error: any) {
      console.warn('Microphone permission check failed:', error);
      setIsMicMuted(true);
      toast.error('Microphone access blocked. Click un-mute to grant permissions.');
      return;
    }

    startRecognition();
  }, [startRecognition, initAudioAnalyser]);

  // Stop Voice Mode
  const stopVoice = useCallback(() => {
    voiceModeRef.current = false;
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    isThinkingRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (hideTranscriptTimerRef.current) {
      clearTimeout(hideTranscriptTimerRef.current);
      hideTranscriptTimerRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    stopRecognition();
    stopAudioAnalyser();

    fullTranscriptRef.current = '';
    setLiveUserSentence('');
    setIsUserSpeaking(false);
    setShowLiveTranscript(false);
    setAiSpeechText('');
    setCallState('connected');
  }, [stopRecognition, stopAudioAnalyser]);

  // Interrupt & Reset Interaction (Stops audio playback & resets mic listener)
  const handleInterruptAndReset = useCallback(() => {
    stopActiveNvidiaVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    isSpeakingRef.current = false;
    isThinkingRef.current = false;
    currentUtteranceRef.current = null;
    setAiSpeechText('');

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (hideTranscriptTimerRef.current) {
      clearTimeout(hideTranscriptTimerRef.current);
      hideTranscriptTimerRef.current = null;
    }

    fullTranscriptRef.current = '';
    setLiveUserSentence('');
    setIsUserSpeaking(false);
    setShowLiveTranscript(false);

    setIsMicMuted(false);
    isMicMutedRef.current = false;

    stopRecognition();

    setTimeout(() => {
      if (voiceModeRef.current && isOpen) {
        setCallState('listening');
        startRecognition();
      }
    }, 120);

    toast.info('Reset microphone for next question');
  }, [startRecognition, stopRecognition, isOpen]);

  // Alias for backward compatibility
  const handleInterrupt = handleInterruptAndReset;

  // Auto-start on modal open
  useEffect(() => {
    if (!isOpen) {
      stopVoice();
      setIsMinimized(false);
      setShowSettingsPopover(false);
      return;
    }

    setCallState('connecting');
    const timer = setTimeout(() => {
      if (isOpen) {
        startVoice();
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      stopVoice();
    };
  }, [isOpen, startVoice, stopVoice]);

  // Toggle Microphone Mute or Interrupt & Reset
  const handleToggleMic = () => {
    // If AI is currently speaking or thinking/processing, button tap triggers Interrupt & Reset
    if (isSpeakingRef.current || isThinkingRef.current || callState === 'speaking' || callState === 'thinking') {
      handleInterruptAndReset();
      return;
    }

    if (isMicMuted) {
      setIsMicMuted(false);
      isMicMutedRef.current = false;
      toast.success('Microphone unmuted');
      if (voiceModeRef.current && !isSpeakingRef.current && !isThinkingRef.current) {
        setCallState('listening');
        startRecognition();
      }
    } else {
      // Re-clicking while actively listening triggers Interrupt & Reset for a fresh interaction loop
      handleInterruptAndReset();
    }
  };

  const handleClose = () => {
    stopVoice();
    setIsMinimized(false);
    setShowSettingsPopover(false);
    onClose();
  };

  if (!isOpen) return null;

  // Derived Status Label
  let displayStatus = 'Online';
  if (callState === 'connecting') displayStatus = 'Connecting…';
  else if (isMicMuted) displayStatus = 'Muted';

  return (
    <>
      {/* Minimized Floating Bar */}
      {isMinimized && (
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.95 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 bg-[#0d0d11]/95 border border-white/15 shadow-2xl backdrop-blur-2xl px-5 py-3 rounded-full text-white max-w-sm w-[90%]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0 flex items-center justify-center">
              <div className={cn(
                "w-9 h-9 rounded-full border border-white/20 flex items-center justify-center bg-gradient-to-tr from-zinc-800 to-zinc-600 shadow-inner",
                callState === 'speaking' && "animate-pulse ring-2 ring-[#c6f135]",
                callState === 'listening' && "ring-2 ring-emerald-400"
              )}>
                <Radio size={14} className="text-[#c6f135]" />
              </div>
            </div>
            
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{aiName}</span>
              <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c6f135] animate-pulse" />
                <span>{displayStatus}</span>
                <span>•</span>
                <span className="font-mono">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Expand Voice Chat"
            >
              <Maximize2 size={15} />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-md shadow-red-600/30"
              title="Close Voice Chat"
            >
              <PhoneOff size={15} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Full-Screen Voice Chat UI (Matching Screenshot Exactly) */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col justify-between bg-[#070709] text-white font-sans select-none overflow-hidden h-[100dvh] w-full"
          >
            {/* Topographic Altitude Contour Background */}
            <TopographicContourBackground />

            {/* Ambient Background Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-purple-900/15 via-cyan-900/15 to-transparent blur-3xl pointer-events-none" />

            {/* TOP HEADER: Centered "AI Buddy" Lime Green Pill & Status */}
            <header className="relative pt-7 pb-2 px-6 flex flex-col items-center justify-center shrink-0 z-20">
              {/* AI Buddy Lime Green Pill */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className="flex items-center justify-center"
              >
                <div className="px-5 py-1.5 rounded-full bg-[#c6f135] text-black font-bold text-xs tracking-tight shadow-[0_0_25px_rgba(198,241,53,0.35)] flex items-center gap-1.5">
                  <span>{aiName}</span>
                </div>
              </motion.div>

              {/* Status indicator directly under pill (matches screenshot) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-[#8e8d88] font-medium"
              >
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isMicMuted ? "bg-red-400" :
                  callState === 'speaking' ? "bg-[#c6f135] animate-pulse shadow-[0_0_8px_#c6f135]" :
                  "bg-[#c6f135] shadow-[0_0_6px_#c6f135]"
                )} />
                <span className="tracking-wide text-white/50 text-[11px]">Online</span>
              </motion.div>
            </header>

            {/* CENTER SECTION: 3D Iridescent Liquid Glass Sphere */}
            <main className="relative flex-1 flex flex-col items-center justify-center px-6 w-full max-w-lg mx-auto z-10">
              <div 
                className="relative flex items-center justify-center my-auto cursor-pointer"
                onClick={() => {
                  if (callState === 'speaking') {
                    handleInterrupt();
                  } else if (isMicMuted) {
                    handleToggleMic();
                  }
                }}
                title={callState === 'speaking' ? 'Tap to interrupt' : 'Voice Orb'}
              >
                {/* Reactive 3D Iridescent Orb */}
                <FluidIridescentOrb
                  size={290}
                  isSpeaking={callState === 'speaking'}
                  isListening={callState === 'listening'}
                  isPaused={isMicMuted}
                  volumeLevel={audioVolume}
                  className="transition-transform duration-300 transform-gpu hover:scale-105"
                />
              </div>

              {/* LIVE TRANSCRIPT / ANIMATED DOTS DISPLAY AREA */}
              <div className="w-[85%] max-w-sm sm:max-w-md mx-auto text-center px-4 mt-5 mb-2 min-h-[84px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {showLiveTranscript && liveUserSentence ? (
                    <motion.div
                      key="live-transcript"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full flex items-center justify-center"
                    >
                      {/* Live Spoken Sentence Typography (Multi-line, responsive, wrapped) */}
                      <p className="text-white text-base sm:text-lg md:text-xl font-normal leading-snug tracking-tight text-center break-words max-h-32 overflow-hidden select-text">
                        {liveUserSentence}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="animated-dots"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="w-full flex items-center justify-center"
                    >
                      {/* 3 CSS-Animated Pulse Dots: ● ● ● */}
                      <VoicePulsingDots />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>

            {/* BOTTOM CONTROLS: Square Message Icon + Mic + Close */}
            <footer className="relative px-6 pb-12 pt-3 flex items-center justify-center gap-7 shrink-0 z-20 max-w-md mx-auto w-full">
              
              {/* 1. LEFT BUTTON: Message / Settings Icon Button (Circular to match right Close button) */}
              <div className="relative">
                <motion.button
                  id="voicePersonaBtn"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                  className="w-12 h-12 rounded-full bg-[#18181c] hover:bg-[#25252c] text-[#bca7fa] hover:text-white border border-white/10 hover:border-[#a78bfa]/40 flex items-center justify-center relative cursor-pointer shadow-lg transition-colors"
                  title="In-Call Messages & Voice Settings"
                >
                  <div className="relative flex items-center justify-center">
                    {/* Speech Bubble Message Icon with 3 Dots */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <circle cx="9" cy="10" r="1.1" fill="currentColor" />
                      <circle cx="12" cy="10" r="1.1" fill="currentColor" />
                      <circle cx="15" cy="10" r="1.1" fill="currentColor" />
                    </svg>
                    {/* Red Notification Badge Dot */}
                    <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#18181c] shadow-sm animate-pulse" />
                  </div>
                </motion.button>

                {/* In-Call Messages & Persona Settings Popover */}
                <AnimatePresence>
                  {showSettingsPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-16 left-0 w-72 bg-[#141419]/95 border border-[#a78bfa]/30 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl z-50 text-xs text-white"
                    >
                      {/* Header Tabs */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => setPopoverTab('chat')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                              popoverTab === 'chat' ? "bg-[#bca7fa] text-black font-semibold shadow-sm" : "text-white/70 hover:text-white"
                            )}
                          >
                            <MessageSquare size={13} />
                            <span>Messages</span>
                          </button>
                          <button
                            onClick={() => setPopoverTab('settings')}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                              popoverTab === 'settings' ? "bg-[#bca7fa] text-black font-semibold shadow-sm" : "text-white/70 hover:text-white"
                            )}
                          >
                            <Sliders size={13} />
                            <span>Voice</span>
                          </button>
                        </div>

                        <button
                          onClick={() => setShowSettingsPopover(false)}
                          className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {popoverTab === 'chat' ? (
                        <div className="space-y-2.5">
                          {/* Live Call Transcript / Messages Stream */}
                          <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 max-h-44 overflow-y-auto space-y-2 text-[11px]">
                            {lastCompletedQuery && (
                              <div className="bg-[#272138]/60 border border-[#a78bfa]/20 rounded-lg p-2 text-white/90">
                                <span className="text-[#bca7fa] font-bold text-[10px] block mb-0.5">You:</span>
                                <p>{lastCompletedQuery}</p>
                              </div>
                            )}
                            {aiSpeechText ? (
                              <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-white/90">
                                <span className="text-[#c6f135] font-bold text-[10px] block mb-0.5">{aiName}:</span>
                                <p>{aiSpeechText}</p>
                              </div>
                            ) : (
                              !lastCompletedQuery && (
                                <div className="text-white/40 text-center py-4 italic text-[11px]">
                                  No messages yet. Speak or type below to chat during call.
                                </div>
                              )
                            )}
                          </div>

                          {/* Type Message Box during Voice Call */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!chatInputText.trim()) return;
                              const text = chatInputText.trim();
                              setChatInputText('');
                              setLastCompletedQuery(text);
                              askAIFromVoice(text);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              value={chatInputText}
                              onChange={(e) => setChatInputText(e.target.value)}
                              placeholder="Type message in call..."
                              className="flex-1 bg-white/10 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#bca7fa]"
                            />
                            <button
                              type="submit"
                              disabled={!chatInputText.trim()}
                              className="p-1.5 rounded-xl bg-[#bca7fa] hover:bg-[#a78bfa] text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            >
                              <Send size={13} />
                            </button>
                          </form>
                        </div>
                      ) : (
                        /* Voice Settings & Persona tab */
                        <div className="space-y-3">
                          {/* Voice Mood Selector */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#bca7fa] mb-1.5">
                              <span>Voice Mood</span>
                              <span className="text-[10px] text-white/50 font-normal">Updates AI prompt tone</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {VOICE_MOODS.map((m) => {
                                const isSelected = voiceMood === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      setVoiceMood(m.id);
                                      toast.success(`Voice mood set to ${m.label}`);
                                    }}
                                    className={cn(
                                      "px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center gap-1.5 cursor-pointer",
                                      isSelected
                                        ? "bg-[#bca7fa]/20 border-[#a78bfa] text-white shadow-sm"
                                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                                    )}
                                  >
                                    <span className="text-sm">{m.icon}</span>
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-[11px] leading-tight truncate">{m.label}</span>
                                      <span className="text-[9px] text-white/50 truncate">{m.description.split('&')[0]}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Voice Persona List */}
                          <div className="pt-2 border-t border-white/10">
                            <span className="text-[11px] font-semibold text-white/80 block mb-1">Voice Persona</span>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                              {VOICE_PERSONAS.map((p) => {
                                const isSelected = activePersona === p.id;
                                return (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      setActivePersona(p.id);
                                      saveAIVoicePersonaId(p.id);
                                      toast.success(`Voice set to ${p.name}`);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-1.5 rounded-xl text-left transition-colors cursor-pointer",
                                      isSelected ? "bg-[#c6f135]/15 border border-[#c6f135]/30 text-white" : "hover:bg-white/5 text-white/70"
                                    )}
                                  >
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-medium text-[11px] text-white truncate">{p.name}</span>
                                      <span className="text-[9px] text-white/50">{p.description}</span>
                                    </div>
                                    {isSelected && <Check size={13} className="text-[#c6f135] shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Speech Speed Slider */}
                          <div className="pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between text-[11px] text-white/70 mb-1">
                              <span>Speech Speed</span>
                              <span className="font-mono text-[#c6f135]">{speechRate}x</span>
                            </div>
                            <input
                              type="range"
                              min="0.75"
                              max="1.5"
                              step="0.05"
                              value={speechRate}
                              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#c6f135]"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2. CENTER BUTTON: Large Lime Green Mic Button with Concentric Radar Wave Rings */}
              <div className="relative flex items-center justify-center">
                {/* Outer Concentric Sound Wave Radar Rings */}
                {callState === 'listening' && (
                  <>
                    <motion.div
                      animate={{
                        scale: [1, 1.45, 1.85],
                        opacity: [0.6, 0.25, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                      className="absolute w-24 h-24 rounded-full border border-[#c6f135]/40 pointer-events-none"
                    />
                    <motion.div
                      animate={{
                        scale: [1, 1.35, 1.65],
                        opacity: [0.5, 0.2, 0],
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: 0.6,
                        ease: 'easeOut',
                      }}
                      className="absolute w-24 h-24 rounded-full border border-[#c6f135]/25 pointer-events-none"
                    />
                  </>
                )}

                {/* Additional Audio Amplitude Responsive Ripple Ring */}
                <div 
                  className="absolute rounded-full border border-[#c6f135]/30 pointer-events-none transition-all duration-75"
                  style={{
                    width: `${88 + audioVolume * 48}px`,
                    height: `${88 + audioVolume * 48}px`,
                    opacity: isMicMuted ? 0 : 0.25 + audioVolume * 0.75,
                  }}
                />

                {/* Large Center Lime Green Mic Button */}
                <motion.button
                  id="mainMicVoiceBtn"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleToggleMic}
                  className={cn(
                    "relative w-20 h-20 md:w-22 md:h-22 rounded-full flex items-center justify-center cursor-pointer transition-all z-10 shadow-2xl",
                    isMicMuted
                      ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                      : "bg-[#c6f135] text-black shadow-[0_0_40px_rgba(198,241,53,0.5)] hover:bg-[#d5ff3d]"
                  )}
                  title={
                    callState === 'speaking' || isSpeakingRef.current
                      ? "Interrupt & Reset Microphone"
                      : callState === 'thinking' || isThinkingRef.current
                      ? "Interrupt & Reset Interaction"
                      : isMicMuted
                      ? "Unmute Microphone"
                      : "Interrupt & Reset Interaction Loop"
                  }
                >
                  {isMicMuted ? (
                    <MicOff size={30} className="text-white" />
                  ) : (
                    <Mic size={32} className="text-black stroke-[2.4]" />
                  )}
                </motion.button>
              </div>

              {/* 3. RIGHT BUTTON: Dark Slate Close / Exit Button */}
              <div className="relative">
                <motion.button
                  id="closeVoiceChatBtn"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleClose}
                  className="w-12 h-12 rounded-full bg-[#18181c] hover:bg-[#25252c] text-white/70 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer shadow-lg transition-colors"
                  title="Exit Voice Chat"
                >
                  <X size={20} />
                </motion.button>
              </div>

            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceCallModal;
