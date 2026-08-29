import React, { useEffect, useRef } from 'react';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface ScrollProgressBarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  colorGradient?: string;
}

export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({
  containerRef,
  className,
  colorGradient = 'from-cyan-400 via-blue-500 to-purple-500',
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const { reduceMotion } = useMotionConfig();

  useEffect(() => {
    const target = containerRef?.current || (typeof window !== 'undefined' ? window : null);
    if (!target || !barRef.current) return;

    let ticking = false;

    const updateProgress = () => {
      if (!barRef.current) return;

      let progress = 0;
      if (target === window) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      } else {
        const el = target as HTMLElement;
        const scrollTop = el.scrollTop;
        const scrollHeight = el.scrollHeight - el.clientHeight;
        progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      }

      const clamped = Math.max(0, Math.min(1, progress));
      barRef.current.style.transform = `scaleX(${clamped})`;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    updateProgress();

    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerRef]);

  if (reduceMotion) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 h-[2.5px] z-50 pointer-events-none overflow-hidden bg-white/[0.04]',
        className
      )}
    >
      <div
        ref={barRef}
        className={cn(
          'h-full w-full origin-left bg-gradient-to-r shadow-[0_0_8px_rgba(6,182,212,0.8)] will-change-transform',
          colorGradient
        )}
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
};
