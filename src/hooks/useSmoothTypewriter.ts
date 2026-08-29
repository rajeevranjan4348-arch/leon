import { useState, useEffect, useRef, useCallback } from 'react';
import { frameRateEngine } from '@/lib/performance/FrameRateEngine';

interface UseSmoothTypewriterOptions {
  baseSpeed?: number; // Characters per second (default: 80)
  maxSpeed?: number; // Characters per second when catching up (default: 480)
  punctuationDelayMs?: number; // Subtle pause on punctuation (default: 10)
  enabled?: boolean;
}

export interface UseSmoothTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  cursorVisible: boolean;
  completeTyping: () => void;
}

/**
 * High-performance 60-144+ FPS typewriter animation hook with natural cadence,
 * dynamic token catch-up, micro-punctuation pauses, and an intelligent cursor indicator.
 * Synchronized with the central 144Hz rendering pipeline.
 */
export function useSmoothTypewriter(
  fullText: string,
  isStreaming = false,
  options: UseSmoothTypewriterOptions = {}
): UseSmoothTypewriterReturn {
  const {
    baseSpeed = 85,
    maxSpeed = 520,
    punctuationDelayMs = 8,
    enabled = true,
  } = options;

  const [displayedLength, setDisplayedLength] = useState<number>(() => {
    if (!enabled || !isStreaming) return fullText.length;
    return Math.min(fullText.length, 1);
  });

  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;

  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  const currentPosRef = useRef<number>(displayedLength);
  const pauseUntilRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  // Instantly finish typing (for example, on user interaction or export)
  const completeTyping = useCallback(() => {
    currentPosRef.current = fullTextRef.current.length;
    setDisplayedLength(fullTextRef.current.length);
  }, []);

  useEffect(() => {
    if (!enabled) {
      currentPosRef.current = fullText.length;
      setDisplayedLength(fullText.length);
      return;
    }

    // If text was cleared
    if (!fullText) {
      currentPosRef.current = 0;
      setDisplayedLength(0);
      return;
    }

    // If starting fresh or text was completely replaced
    if (currentPosRef.current > fullText.length || !fullText.startsWith(fullTextRef.current.slice(0, Math.floor(currentPosRef.current)))) {
      currentPosRef.current = Math.min(fullText.length, 1);
      setDisplayedLength(currentPosRef.current);
    }

    lastTimeRef.current = performance.now();

    // Subscribe to Central 144Hz Frame Engine
    const unsubscribe = frameRateEngine.subscribe((deltaMs, currentTime) => {
      const targetLength = fullTextRef.current.length;
      const currentPos = currentPosRef.current;

      // If already reached end
      if (currentPos >= targetLength) {
        if (!isStreamingRef.current && currentPos !== targetLength) {
          setDisplayedLength(targetLength);
        }
        return;
      }

      // Check punctuation micro-pause
      if (currentTime < pauseUntilRef.current) {
        return;
      }

      // Calculate backlog and dynamic adaptive speed for ultra-fast, word-fluid response
      const backlog = targetLength - currentPos;
      
      let effectiveSpeed = baseSpeed;
      if (backlog > 200) {
        effectiveSpeed = maxSpeed;
      } else if (backlog > 30) {
        effectiveSpeed = baseSpeed + (maxSpeed - baseSpeed) * ((backlog - 30) / 170);
      } else if (!isStreamingRef.current) {
        // Stream completed; render remaining text dynamically at high frame rate
        effectiveSpeed = Math.max(baseSpeed * 4, 850);
      }

      // Delta compensation for exact framerate (60fps, 90fps, 120fps, 144fps)
      const clampedDelta = Math.min(deltaMs, 34); // Max 34ms per step
      const charsToAdd = (effectiveSpeed * clampedDelta) / 1000;
      let nextPos = Math.min(currentPos + charsToAdd, targetLength);
      
      // Word boundary snap for natural reading flow
      const rawNextInt = Math.floor(nextPos);
      if (rawNextInt < targetLength && rawNextInt > Math.floor(currentPos)) {
        const nextChar = fullTextRef.current[rawNextInt];
        if (nextChar === ' ' || nextChar === '\n' || nextChar === ',' || nextChar === '.') {
          nextPos = Math.min(rawNextInt + 1, targetLength);
        }
      }

      const prevInt = Math.floor(currentPos);
      const nextInt = Math.floor(nextPos);

      // Micro-pause cadence on punctuation
      if (nextInt > prevInt) {
        const charChecked = fullTextRef.current[nextInt - 1];
        if (charChecked === '.' || charChecked === '!' || charChecked === '?' || charChecked === '\n') {
          pauseUntilRef.current = currentTime + punctuationDelayMs;
        }
      }

      currentPosRef.current = nextPos;
      if (nextInt !== prevInt) {
        setDisplayedLength(nextInt);
      }
    });

    return unsubscribe;
  }, [fullText, isStreaming, enabled, baseSpeed, maxSpeed, punctuationDelayMs]);

  const displayedText = fullText.slice(0, displayedLength);
  const isTyping = displayedLength < fullText.length;
  const cursorVisible = isStreaming || isTyping;

  return {
    displayedText,
    isTyping,
    cursorVisible,
    completeTyping,
  };
}
