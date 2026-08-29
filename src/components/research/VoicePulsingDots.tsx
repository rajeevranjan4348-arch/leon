import React from 'react';
import { cn } from '@/lib/utils';

interface VoicePulsingDotsProps {
  className?: string;
  dotClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * CSS-based Pulsing 3-Dot Animation Component
 * Replaces static text in voice chat during idle, thinking, or waiting states.
 * Uses hardware-accelerated CSS keyframe animations for smooth, stutter-free performance.
 */
export const VoicePulsingDots: React.FC<VoicePulsingDotsProps> = ({
  className,
  dotClassName,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    lg: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
  };

  return (
    <div
      role="status"
      aria-label="Listening for speech"
      className={cn(
        "flex items-center justify-center gap-3 py-3 select-none pointer-events-none transition-all duration-300",
        className
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] voice-pulse-dot-1 transform-gpu",
          sizeClasses[size],
          dotClassName
        )}
      />
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] voice-pulse-dot-2 transform-gpu",
          sizeClasses[size],
          dotClassName
        )}
      />
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] voice-pulse-dot-3 transform-gpu",
          sizeClasses[size],
          dotClassName
        )}
      />
      <span className="sr-only">Waiting for speech...</span>
    </div>
  );
};

export default VoicePulsingDots;
