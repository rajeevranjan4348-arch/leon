import React from 'react';
import { Volume2, VolumeX, RefreshCw, Volume1 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VoiceIconState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'paused';

interface VoiceStateIconProps {
  state: VoiceIconState;
  size?: number;
  className?: string;
}

export const VoiceStateIcon: React.FC<VoiceStateIconProps> = ({
  state,
  size = 18,
  className,
}) => {
  if (state === 'thinking') {
    return (
      <RefreshCw
        size={size}
        className={cn('animate-spin text-cyan-400 shrink-0', className)}
      />
    );
  }

  if (state === 'listening') {
    return (
      <div className="relative flex items-center justify-center shrink-0">
        <Volume2 size={size} className={cn('text-cyan-400 relative z-10 animate-pulse', className)} />
        <span className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
      </div>
    );
  }

  if (state === 'speaking') {
    return (
      <div className={cn('flex items-end justify-center gap-[2px] shrink-0 my-0.5', className)} style={{ width: size, height: size }}>
        <span className="w-[2.5px] bg-cyan-400 rounded-full animate-v-bar-1 h-full" />
        <span className="w-[2.5px] bg-cyan-300 rounded-full animate-v-bar-2 h-[75%]" />
        <span className="w-[2.5px] bg-cyan-400 rounded-full animate-v-bar-3 h-full" />
        <span className="w-[2.5px] bg-cyan-300 rounded-full animate-v-bar-4 h-[60%]" />
      </div>
    );
  }

  if (state === 'muted') {
    return (
      <VolumeX
        size={size}
        className={cn('text-amber-400 shrink-0 animate-pulse', className)}
      />
    );
  }

  if (state === 'paused') {
    return (
      <Volume1
        size={size}
        className={cn('text-amber-300 shrink-0 opacity-80', className)}
      />
    );
  }

  // 'idle'
  return (
    <Volume2
      size={size}
      className={cn('text-cyan-400 transition-transform group-hover:scale-105 shrink-0', className)}
    />
  );
};
