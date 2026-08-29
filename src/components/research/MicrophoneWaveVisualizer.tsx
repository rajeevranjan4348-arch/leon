import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface MicrophoneWaveVisualizerProps {
  isActive: boolean;
  isMuted?: boolean;
  className?: string;
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

export const MicrophoneWaveVisualizer: React.FC<MicrophoneWaveVisualizerProps> = ({
  isActive,
  isMuted = false,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  const [hasAudioInput, setHasAudioInput] = useState<boolean>(false);

  // Smooth smoothed intensity ref to avoid abrupt jumps
  const smoothedIntensityRef = useRef<number>(0.08);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize Microphone Web Audio Stream
  useEffect(() => {
    if (!isActive || isMuted) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
      setHasAudioInput(false);
      return;
    }

    let isMounted = true;

    async function initMicAudio() {
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

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDataRef.current = new Uint8Array(analyser.fftSize);

        // Spawn initial floating particles
        particlesRef.current = Array.from({ length: 16 }, () => ({
          x: Math.random() * 200,
          y: Math.random() * 100,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -Math.random() * 0.9 - 0.2,
          size: Math.random() * 2 + 1,
          alpha: Math.random() * 0.6 + 0.2,
          color: Math.random() > 0.5 ? 'rgba(34, 211, 238, ' : 'rgba(129, 140, 248, ',
        }));

        setHasAudioInput(true);

        // Canvas Rendering Loop with physics motion
        let phase = 0;

        const renderFrame = () => {
          if (!isMounted || !canvasRef.current || !analyserRef.current) return;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const width = canvas.width;
          const height = canvas.height;
          const centerY = height / 2;

          // Read frequency and time-domain data
          if (freqDataRef.current && timeDataRef.current) {
            analyserRef.current.getByteFrequencyData(freqDataRef.current as any);
            analyserRef.current.getByteTimeDomainData(timeDataRef.current as any);
          }

          // Calculate average volume & peak energy
          let sum = 0;
          if (freqDataRef.current) {
            for (let i = 0; i < freqDataRef.current.length; i++) {
              sum += freqDataRef.current[i];
            }
          }
          const avgFreq = freqDataRef.current ? sum / freqDataRef.current.length : 0;
          const targetIntensity = Math.min(1.0, Math.max(0.06, (avgFreq - 6) / 80));

          // Smooth interpolation for fluid motion
          smoothedIntensityRef.current += (targetIntensity - smoothedIntensityRef.current) * 0.15;
          const intensity = smoothedIntensityRef.current;

          ctx.clearRect(0, 0, width, height);

          // Update motion phase based on audio energy
          phase += 0.04 + intensity * 0.09;

          // Multi-layer Harmonic Fluid Waves
          const waves = [
            {
              // 1. Primary Vibrant Cyan Wave
              color: 'rgba(34, 211, 238, 0.95)',
              fillColor: 'rgba(34, 211, 238, 0.08)',
              speed: 1.1,
              freq: 0.024,
              amp: (height * 0.40) * (0.16 + intensity * 0.84),
              lineWidth: 3.2,
              glow: 16 * (0.6 + intensity),
            },
            {
              // 2. Violet / Indigo Overtone Wave
              color: 'rgba(129, 140, 248, 0.90)',
              fillColor: 'rgba(129, 140, 248, 0.05)',
              speed: -0.85,
              freq: 0.034,
              amp: (height * 0.30) * (0.12 + intensity * 0.88),
              lineWidth: 2.4,
              glow: 12 * (0.5 + intensity),
            },
            {
              // 3. Electric Pink Resonance Peak Wave
              color: 'rgba(244, 114, 182, 0.75)',
              fillColor: 'transparent',
              speed: 1.5,
              freq: 0.045,
              amp: (height * 0.22) * (0.08 + intensity * 0.92),
              lineWidth: 1.8,
              glow: 9 * (0.5 + intensity),
            },
            {
              // 4. Emerald Deep Bass Wave
              color: 'rgba(52, 211, 153, 0.70)',
              fillColor: 'transparent',
              speed: 0.7,
              freq: 0.016,
              amp: (height * 0.34) * (0.10 + intensity * 0.90),
              lineWidth: 1.6,
              glow: 8 * (0.5 + intensity),
            },
          ];

          // Draw Waves
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
              // Real-time audio time domain wave injection
              let timeMod = 0;
              if (timeDataRef.current && intensity > 0.08) {
                const sampleIdx = Math.floor((x / width) * timeDataRef.current.length);
                const sampleVal = (timeDataRef.current[sampleIdx] - 128) / 128; // -1 to 1
                timeMod = sampleVal * (height * 0.3) * intensity;
              }

              // Smooth parabolic windowing
              const windowEnvelope = Math.sin((x / width) * Math.PI);
              
              // Organic harmonic synthesis
              const harmonic1 = Math.sin(x * w.freq + timeOffset);
              const harmonic2 = Math.sin(x * w.freq * 2.1 - timeOffset * 0.7) * 0.35;
              const harmonic3 = Math.sin(x * w.freq * 0.5 + timeOffset * 1.2) * 0.2;
              const y = centerY + (harmonic1 + harmonic2 + harmonic3) * w.amp * windowEnvelope + timeMod * windowEnvelope;

              points.push({ x, y });

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }

            ctx.stroke();

            // Subtle gradient glow fill under wave
            if (w.fillColor !== 'transparent' && points.length > 0) {
              ctx.lineTo(width, centerY);
              ctx.lineTo(0, centerY);
              ctx.closePath();
              ctx.fillStyle = w.fillColor;
              ctx.fill();
            }

            ctx.restore();
          });

          // Floating audio-reactive kinetic particles
          ctx.save();
          particlesRef.current.forEach((p) => {
            // Update particle motion
            p.y += p.vy * (1 + intensity * 2.5);
            p.x += p.vx * (1 + intensity * 1.5);
            p.alpha -= 0.006 * (1 + intensity);

            // Respawn particles
            if (p.y < 0 || p.x < 0 || p.x > width || p.alpha <= 0) {
              p.x = width * 0.2 + Math.random() * (width * 0.6);
              p.y = centerY + (Math.random() - 0.5) * (height * 0.4 * intensity);
              p.vx = (Math.random() - 0.5) * (1.2 + intensity * 2);
              p.vy = -Math.random() * (1.2 + intensity * 2.5) - 0.3;
              p.alpha = Math.random() * 0.6 + 0.3;
              p.size = Math.random() * 2.2 + 1;
            }

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 + intensity * 0.8), 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
            ctx.shadowBlur = 6 * (1 + intensity);
            ctx.fill();
          });
          ctx.restore();

          animationFrameRef.current = requestAnimationFrame(renderFrame);
        };

        renderFrame();
      } catch (err) {
        console.warn('Microphone wave visualizer error:', err);
      }
    }

    initMicAudio();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (e) {}
        audioCtxRef.current = null;
      }
    };
  }, [isActive, isMuted]);

  // Adjust canvas size to match parent container with retina display sharpness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div className={cn("relative w-full h-full flex items-center justify-center pointer-events-none overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
};

export default MicrophoneWaveVisualizer;
