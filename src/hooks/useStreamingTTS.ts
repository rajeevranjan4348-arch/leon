import { useEffect, useRef, useCallback } from 'react';
import { useChatTTS } from './useChatTTS';
import { stopTTS } from '@/lib/voiceService';

function extractSentences(text: string) {
  const boundaries = /[.!?\n]+(?:[\s"']|$)/g;
  let lastIndex = 0;
  let match;
  const sentences: string[] = [];
  while ((match = boundaries.exec(text)) !== null) {
    const end = match.index + match[0].length;
    sentences.push(text.slice(lastIndex, end));
    lastIndex = end;
  }
  return { sentences, processedLength: lastIndex };
}

export function useStreamingTTS(content: string, isStreaming: boolean, autoPlayEnabled: boolean, voiceURI?: string, rate?: number, pitch?: number) {
  const { speak, stop, isSpeaking, isPaused } = useChatTTS();
  const queueRef = useRef<string[]>([]);
  const processedLengthRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isStoppedRef = useRef(false);

  // Clear queue if stopped externally (not by our own onEnd)
  useEffect(() => {
    if (!isSpeaking && !isPaused) {
      if (isPlayingRef.current) {
        queueRef.current = [];
        isPlayingRef.current = false;
        isStoppedRef.current = true;
      }
    }
  }, [isSpeaking, isPaused]);

  // Reset if content completely changes (new message)
  useEffect(() => {
    if (content.length === 0 || (processedLengthRef.current > content.length)) {
      queueRef.current = [];
      processedLengthRef.current = 0;
      isPlayingRef.current = false;
      isStoppedRef.current = false;
      stopTTS();
    }
  }, [content]);

  const processQueue = useCallback(() => {
    if (isPlayingRef.current || isStoppedRef.current) return;
    if (queueRef.current.length === 0) return;

    const nextSentence = queueRef.current.shift();
    if (!nextSentence || !nextSentence.trim()) {
      processQueue();
      return;
    }

    isPlayingRef.current = true;
    speak(nextSentence, {
      voiceURI,
      rate,
      pitch,
      cancelPrevious: false,
      showToast: false,
      onEnd: () => {
        isPlayingRef.current = false;
        if (!isStoppedRef.current) {
          processQueue();
        }
      },
      onError: (e) => {
        isPlayingRef.current = false;
        if (!isStoppedRef.current) {
          processQueue();
        }
      }
    });
  }, [speak]);

  // Parse new sentences and add to queue
  useEffect(() => {
    if (!content) return;
    if (isStoppedRef.current) return;
    
    const newContent = content.substring(processedLengthRef.current);
    const { sentences, processedLength } = extractSentences(newContent);
    
    if (sentences.length > 0) {
      sentences.forEach(sentence => {
        if (sentence.trim().length > 0) {
          queueRef.current.push(sentence.trim());
        }
      });
      processedLengthRef.current += processedLength;
      
      if (autoPlayEnabled) {
        processQueue();
      }
    } else if (!isStreaming && newContent.trim().length > 0) {
      // Finished streaming, process the rest
      queueRef.current.push(newContent.trim());
      processedLengthRef.current = content.length;
      if (autoPlayEnabled) {
        processQueue();
      }
    }
  }, [content, isStreaming, autoPlayEnabled, processQueue]);

  const toggle = useCallback(() => {
    if (isSpeaking && !isPaused) {
      import('@/lib/voiceService').then(m => m.pauseTTS());
    } else if (isSpeaking && isPaused) {
      import('@/lib/voiceService').then(m => m.resumeTTS());
    } else {
      isStoppedRef.current = false;
      stopTTS(); 
      
      queueRef.current = [];
      isPlayingRef.current = false;
      
      const { sentences, processedLength } = extractSentences(content);
      if (sentences.length > 0) {
        sentences.forEach(s => {
          if (s.trim().length > 0) queueRef.current.push(s.trim());
        });
        const remainder = content.substring(processedLength);
        if (remainder.trim().length > 0) {
           queueRef.current.push(remainder.trim());
        }
      } else if (content.trim().length > 0) {
        queueRef.current.push(content.trim());
      }
      processedLengthRef.current = content.length;
      
      processQueue();
    }
  }, [isSpeaking, isPaused, content, processQueue]);

  return { toggle, isSpeaking, isPaused, stop: () => {
    isStoppedRef.current = true;
    stopTTS();
  } };
}
