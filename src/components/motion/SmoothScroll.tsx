import React, { useEffect, useRef, useCallback } from 'react';
import { useMotionConfig } from './MotionProvider';

interface SmoothScrollToOptions {
  top?: number;
  left?: number;
  behavior?: 'smooth' | 'auto';
}

export const useSmoothScroll = (containerRef?: React.RefObject<HTMLElement | null>) => {
  const { reduceMotion } = useMotionConfig();

  const scrollTo = useCallback(
    (options: SmoothScrollToOptions | number) => {
      const targetElement = containerRef?.current || (typeof window !== 'undefined' ? window : null);
      if (!targetElement) return;

      const top = typeof options === 'number' ? options : options.top ?? 0;
      const behavior = reduceMotion ? 'auto' : typeof options === 'object' ? options.behavior ?? 'smooth' : 'smooth';

      if ('scrollTo' in targetElement) {
        targetElement.scrollTo({ top, behavior });
      }
    },
    [containerRef, reduceMotion]
  );

  const scrollToBottom = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
      const targetElement = containerRef?.current;
      if (!targetElement) return;

      const top = targetElement.scrollHeight;
      targetElement.scrollTo({
        top,
        behavior: reduceMotion ? 'auto' : behavior,
      });
    },
    [containerRef, reduceMotion]
  );

  const scrollToTop = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
      const targetElement = containerRef?.current;
      if (!targetElement) return;

      targetElement.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : behavior,
      });
    },
    [containerRef, reduceMotion]
  );

  return { scrollTo, scrollToBottom, scrollToTop };
};

interface SmoothScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const SmoothScrollContainer: React.FC<SmoothScrollContainerProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={`scroll-smooth overscroll-contain subpixel-antialiased ${className || ''}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
      {...props}
    >
      {children}
    </div>
  );
};
