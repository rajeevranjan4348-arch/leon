import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Send,
  Sliders,
  Activity,
  Layers,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GeminiLiveSession } from '@/lib/geminiLiveClient';

export type WaveformMode = 'fluid' | 'bars' | 'pulse';

export interface GeminiLiveWaveformProps {
  session?: GeminiLiveSession | null;
  isActive: boolean;
  isLiveMode?: boolean;
  status?: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error';
  audioRms?: number;
  interimTranscript?: string;
  selectedVoice?: string;
  onVoiceChange?: (voice: string) => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  onStop?: () => void;
  onSubmitTranscript?: (text: string) => void;
  className?: string;
  height?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

const AVAILABLE_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', tone: 'Balanced & Natural' },
  { id: 'Puck', name: 'Puck', tone: 'Playful & Upbeat' },
  { id: 'Charon', name: 'Charon', tone: 'Deep & Resonant' },
  { id: 'Kore', name: 'Kore', tone: 'Gentle & Warm' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Crisp & Articulate' },
];

export const GeminiLiveWaveform: React.FC<GeminiLiveWaveformProps> = ({
  session,
  isActive,
  isLiveMode = true,
  status = 'listening',
  audioRms = 0,
  interimTranscript = '',
  selectedVoice = 'Zephyr',
  onVoiceChange,
  onToggleMute,
  isMuted = false,
  onStop,
  onSubmitTranscript,
  className,
  height = 90,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visualMode, setVisualMode] = useState<WaveformMode>('fluid');
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [liveIntensity, setLiveIntensity] = useState(0);

  // Audio Context and Stream refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const smoothedIntensityRef = useRef<number>(0.08);

  // Initialize particles
  useEffect(() => {
    particlesRef.current = Array.from({ length: 24 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 90,
      vx: (Math.random() - 0.5) * 0.9,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 2.2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.5 ? 'rgba(34, 211, 238, ' : 'rgba(168, 85, 247, ',
    }));
  }, []);

  // Sync external session frequency callbacks if provided
  useEffect(() => {
    if (!session) return;
    session.setCallbacks({
      onFrequencyData: (freq, time) => {
        if (!freqDataRef.current || freqDataRef.current.length !== freq.length) {
          freqDataRef.current = new Uint8Array(freq.length);
        }
        if (!timeDataRef.current || timeDataRef.current.length !== time.length) {
          timeDataRef.current = new Uint8Array(time.length);
        }
        freqDataRef.current.set(freq);
        timeDataRef.current.set(time);
      },
    });
  }, [session]);

  // Connect Audio Context to live mic if session has no direct analyser
  useEffect(() => {
    if (!isActive || isMuted) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current && !session) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && !session) {
        try {
          audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
      return;
    }

    let isMounted = true;

    async function initAudio() {
      // 1. If GeminiLiveSession has an AnalyserNode, use it directly
      const sessionAnalyser = session?.getInputAnalyser() || session?.getOutputAnalyser();
      if (sessionAnalyser) {
        analyserRef.current = sessionAnalyser;
        freqDataRef.current = new Uint8Array(sessionAnalyser.frequencyBinCount);
        timeDataRef.current = new Uint8Array(sessionAnalyser.fftSize);
        startRenderLoop();
        return;
      }

      // 2. Otherwise capture Web Audio stream
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;

        const audioCtx = new AudioCtxClass();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDataRef.current = new Uint8Array(analyser.fftSize);

        startRenderLoop();
      } catch (err) {
        console.warn('Audio waveform fallback init:', err);
      }
    }

    function startRenderLoop() {
      let phase = 0;

      const render = () => {
        if (!isMounted || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const cHeight = canvas.height;
        const centerY = cHeight / 2;

        // Fetch frequency & time domain data
        if (analyserRef.current) {
          if (!freqDataRef.current || freqDataRef.current.length !== analyserRef.current.frequencyBinCount) {
            freqDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
          }
          if (!timeDataRef.current || timeDataRef.current.length !== analyserRef.current.fftSize) {
            timeDataRef.current = new Uint8Array(analyserRef.current.fftSize);
          }
          analyserRef.current.getByteFrequencyData(freqDataRef.current as any);
          analyserRef.current.getByteTimeDomainData(timeDataRef.current as any);
        }

        // Calculate audio intensity from frequencies and external RMS
        let freqSum = 0;
        if (freqDataRef.current) {
          for (let i = 0; i < freqDataRef.current.length; i++) {
            freqSum += freqDataRef.current[i];
          }
        }
        const avgFreq = freqDataRef.current && freqDataRef.current.length > 0
          ? freqSum / freqDataRef.current.length
          : 0;

        const targetIntensity = Math.min(
          1.0,
          Math.max(0.08, Math.max((avgFreq - 8) / 75, audioRms * 3.5))
        );

        smoothedIntensityRef.current += (targetIntensity - smoothedIntensityRef.current) * 0.18;
        const intensity = isMuted ? 0.02 : smoothedIntensityRef.current;
        setLiveIntensity(Math.round(intensity * 100));

        ctx.clearRect(0, 0, width, cHeight);

        const isAISpeaking = status === 'speaking';
        const isInterrupted = status === 'interrupted';

        // Choose color schemes based on Gemini Live state
        const primaryColor = isAISpeaking
          ? 'rgba(168, 85, 247, 0.95)' // Purple for Gemini Speaking
          : isInterrupted
          ? 'rgba(239, 68, 68, 0.95)' // Red for Interrupted
          : isMuted
          ? 'rgba(245, 158, 11, 0.70)' // Amber for Muted
          : 'rgba(34, 211, 238, 0.95)'; // Cyan for User Speaking

        const secondaryColor = isAISpeaking
          ? 'rgba(236, 72, 153, 0.85)' // Pink
          : 'rgba(99, 102, 241, 0.85)'; // Indigo

        const tertiaryColor = isAISpeaking
          ? 'rgba(129, 140, 248, 0.75)'
          : 'rgba(52, 211, 153, 0.75)'; // Emerald

        phase += 0.04 + intensity * 0.12;

        // ════════ MODE 1: FLUID HARMONIC WAVES ════════
        if (visualMode === 'fluid') {
          const waves = [
            {
              color: primaryColor,
              fillColor: isAISpeaking ? 'rgba(168, 85, 247, 0.10)' : 'rgba(34, 211, 238, 0.10)',
              speed: 1.15,
              freq: 0.022,
              amp: (cHeight * 0.38) * (0.15 + intensity * 0.85),
              lineWidth: 3.2,
              glow: 18 * (0.6 + intensity),
            },
            {
              color: secondaryColor,
              fillColor: isAISpeaking ? 'rgba(236, 72, 153, 0.06)' : 'rgba(99, 102, 241, 0.06)',
              speed: -0.9,
              freq: 0.032,
              amp: (cHeight * 0.28) * (0.12 + intensity * 0.88),
              lineWidth: 2.2,
              glow: 12 * (0.5 + intensity),
            },
            {
              color: tertiaryColor,
              fillColor: 'transparent',
              speed: 1.45,
              freq: 0.044,
              amp: (cHeight * 0.22) * (0.08 + intensity * 0.92),
              lineWidth: 1.8,
              glow: 8 * (0.5 + intensity),
            },
          ];

          waves.forEach((w) => {
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = w.lineWidth;
            ctx.strokeStyle = w.color;
            ctx.shadowColor = w.color;
            ctx.shadowBlur = w.glow;

            const timeOffset = phase * w.speed;
            const points: { x: number; y: number }[] = [];

            const step = 3;
            for (let x = 0; x <= width; x += step) {
              let timeMod = 0;
              if (timeDataRef.current && intensity > 0.08 && !isMuted) {
                const sampleIdx = Math.floor((x / width) * timeDataRef.current.length);
                const sampleVal = (timeDataRef.current[sampleIdx] - 128) / 128;
                timeMod = sampleVal * (cHeight * 0.28) * intensity;
              }

              const windowEnvelope = Math.sin((x / width) * Math.PI);
              const harmonic1 = Math.sin(x * w.freq + timeOffset);
              const harmonic2 = Math.sin(x * w.freq * 2.2 - timeOffset * 0.7) * 0.35;
              const y = centerY + (harmonic1 + harmonic2) * w.amp * windowEnvelope + timeMod * windowEnvelope;

              points.push({ x, y });

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }

            ctx.stroke();

            if (w.fillColor !== 'transparent' && points.length > 0) {
              ctx.lineTo(width, centerY);
              ctx.lineTo(0, centerY);
              ctx.closePath();
              ctx.fillStyle = w.fillColor;
              ctx.fill();
            }

            ctx.restore();
          });
        }

        // ════════ MODE 2: EQUALIZER SPECTRUM BARS ════════
        else if (visualMode === 'bars') {
          const numBars = 48;
          const barWidth = (width / numBars) * 0.65;
          const barGap = (width / numBars) * 0.35;

          for (let i = 0; i < numBars; i++) {
            const x = i * (barWidth + barGap) + barGap / 2;
            let barHeight = 4;

            if (freqDataRef.current && !isMuted) {
              const freqIdx = Math.floor((i / numBars) * (freqDataRef.current.length * 0.7));
              const val = freqDataRef.current[freqIdx] || 0;
              barHeight = Math.max(4, (val / 255) * (cHeight * 0.8) * (0.3 + intensity * 0.7));
            } else {
              barHeight = 4 + Math.sin(phase * 2 + i * 0.3) * 6 * intensity;
            }

            const yTop = centerY - barHeight / 2;

            const grad = ctx.createLinearGradient(0, yTop, 0, yTop + barHeight);
            grad.addColorStop(0, primaryColor);
            grad.addColorStop(0.5, secondaryColor);
            grad.addColorStop(1, tertiaryColor);

            ctx.save();
            ctx.fillStyle = grad;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 8 * (0.4 + intensity);

            // Rounded bar
            ctx.beginPath();
            ctx.roundRect(x, yTop, barWidth, barHeight, 4);
            ctx.fill();

            // Peak cap
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(x, yTop - 2, barWidth, 1.5, 1);
            ctx.fill();

            ctx.restore();
          }
        }

        // ════════ MODE 3: CYBER PULSE ORB ════════
        else if (visualMode === 'pulse') {
          const orbRadius = (cHeight * 0.28) * (0.6 + intensity * 0.6);

          // Concentric shockwaves
          for (let ring = 1; ring <= 3; ring++) {
            const ringRadius = orbRadius + ring * (12 + intensity * 18);
            ctx.save();
            ctx.beginPath();
            ctx.arc(width / 2, centerY, ringRadius, 0, Math.PI * 2);
            ctx.strokeStyle = ring === 1 ? primaryColor : ring === 2 ? secondaryColor : tertiaryColor;
            ctx.lineWidth = 2 - ring * 0.4;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 12 * intensity;
            ctx.globalAlpha = Math.max(0.1, 0.8 - ring * 0.25);
            ctx.stroke();
            ctx.restore();
          }

          // Center glowing orb
          const orbGrad = ctx.createRadialGradient(width / 2, centerY, 2, width / 2, centerY, orbRadius);
          orbGrad.addColorStop(0, '#ffffff');
          orbGrad.addColorStop(0.4, primaryColor);
          orbGrad.addColorStop(1, secondaryColor);

          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, centerY, orbRadius, 0, Math.PI * 2);
          ctx.fillStyle = orbGrad;
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 24 * (0.6 + intensity);
          ctx.fill();
          ctx.restore();
        }

        // ════════ FLOATING KINETIC PARTICLES ════════
        ctx.save();
        particlesRef.current.forEach((p) => {
          p.y += p.vy * (1 + intensity * 2.2);
          p.x += p.vx * (1 + intensity * 1.4);
          p.alpha -= 0.005 * (1 + intensity);

          if (p.y < 0 || p.x < 0 || p.x > width || p.alpha <= 0) {
            p.x = width * 0.15 + Math.random() * (width * 0.7);
            p.y = centerY + (Math.random() - 0.5) * (cHeight * 0.4 * intensity);
            p.vx = (Math.random() - 0.5) * (1.2 + intensity * 2);
            p.vy = -Math.random() * (1.2 + intensity * 2) - 0.2;
            p.alpha = Math.random() * 0.6 + 0.3;
            p.size = Math.random() * 2.2 + 1;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + intensity * 0.7), 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha})`;
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 6 * (1 + intensity);
          ctx.fill();
        });
        ctx.restore();

        animationFrameRef.current = requestAnimationFrame(render);
      };

      render();
    }

    initAudio();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current && !session) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && !session) {
        try {
          audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
    };
  }, [isActive, isMuted, session, visualMode, status, audioRms]);

  // Auto-resize canvas for retina screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);

  const getStatusBadge = () => {
    if (isMuted) {
      return {
        label: 'Microphone Muted',
        icon: <MicOff size={13} className="text-amber-400" />,
        color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      };
    }
    if (status === 'speaking') {
      return {
        label: 'Gemini Live Speaking...',
        icon: <Volume2 size={13} className="text-purple-400 animate-pulse" />,
        color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-500/20',
      };
    }
    if (status === 'connecting') {
      return {
        label: 'Connecting 16kHz Stream...',
        icon: <Radio size={13} className="text-cyan-400 animate-spin" />,
        color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      };
    }
    if (status === 'interrupted') {
      return {
        label: 'Interrupted • Listening...',
        icon: <Activity size={13} className="text-red-400" />,
        color: 'bg-red-500/20 text-red-300 border-red-500/30',
      };
    }
    return {
      label: isLiveMode ? 'Gemini Live • Listening' : 'Voice Dictation Active',
      icon: <Mic size={13} className="text-cyan-400 animate-pulse" />,
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20',
    };
  };

  const badge = getStatusBadge();

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, height: 0, scale: 0.98 }}
      animate={{ opacity: 1, height: 'auto', scale: 1 }}
      exit={{ opacity: 0, height: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative w-full rounded-2xl bg-[#0d0f17]/95 border border-cyan-500/30 overflow-hidden shadow-2xl backdrop-blur-xl mb-3',
        className
      )}
    >
      {/* Top ambient glow gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

      {/* Header Bar with Live Controls */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1 relative z-10">
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm backdrop-blur-md',
              badge.color
            )}
          >
            {badge.icon}
            <span>{badge.label}</span>
          </span>

          {/* Real-time Decibel / Level Bar */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70">
            <Activity size={12} className="text-cyan-400" />
            <span className="font-mono">{liveIntensity}%</span>
            <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400"
                style={{ width: `${Math.min(100, liveIntensity * 1.2)}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5">
          {/* Visualizer Mode Selector */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setVisualMode('fluid')}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                visualMode === 'fluid' ? 'bg-cyan-500/30 text-cyan-300 font-semibold' : 'text-white/50 hover:text-white'
              )}
              title="Fluid Harmonic Waveform"
            >
              Waves
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('bars')}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                visualMode === 'bars' ? 'bg-cyan-500/30 text-cyan-300 font-semibold' : 'text-white/50 hover:text-white'
              )}
              title="Spectrum Equalizer Bars"
            >
              Bars
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('pulse')}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                visualMode === 'pulse' ? 'bg-cyan-500/30 text-cyan-300 font-semibold' : 'text-white/50 hover:text-white'
              )}
              title="Cyber Pulse Orb"
            >
              Pulse
            </button>
          </div>

          {/* Voice Selector Dropdown (When Live mode) */}
          {isLiveMode && onVoiceChange && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors cursor-pointer"
                title="Select Gemini Live Voice Persona"
              >
                <Sparkles size={12} className="text-purple-400" />
                <span className="font-medium">{selectedVoice}</span>
                <ChevronDown size={11} className="text-white/40" />
              </button>

              <AnimatePresence>
                {isVoiceDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-zinc-900/95 border border-white/15 shadow-2xl p-1 z-30 backdrop-blur-xl"
                  >
                    {AVAILABLE_VOICES.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          onVoiceChange(v.id);
                          setIsVoiceDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer',
                          selectedVoice === v.id ? 'bg-purple-500/20 text-purple-200 font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <div>
                          <div>{v.name}</div>
                          <div className="text-[10px] text-white/40">{v.tone}</div>
                        </div>
                        {selectedVoice === v.id && <Check size={13} className="text-purple-400" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mute Toggle Button */}
          {onToggleMute && (
            <button
              type="button"
              onClick={onToggleMute}
              className={cn(
                'p-1.5 rounded-xl border transition-colors cursor-pointer',
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
              )}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}

          {/* Stop / Close button */}
          {onStop && (
            <button
              type="button"
              onClick={onStop}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-colors cursor-pointer"
              title="Close live voice stream"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Real-Time Waveform Canvas */}
      <div className="relative w-full" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Live Interim Transcript Stream Bubble */}
      {interimTranscript && (
        <div className="px-3.5 pb-3 pt-1 flex items-center justify-between gap-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-2 truncate text-xs text-white/90">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="italic truncate text-cyan-200">"{interimTranscript}"</span>
          </div>

          {onSubmitTranscript && (
            <button
              type="button"
              onClick={() => onSubmitTranscript(interimTranscript)}
              className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              <span>Send</span>
              <Send size={12} />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default GeminiLiveWaveform;
