import React, { useRef, useState, useEffect } from 'react';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface ParallaxContainerProps {
  children: React.ReactNode;
  strength?: number; // 5 - 25
  className?: string;
}

export const ParallaxContainer: React.FC<ParallaxContainerProps> = ({
  children,
  strength = 12,
  className,
}) => {
  const { enableParallax } = useMotionConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enableParallax || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const normX = (clientX / innerWidth - 0.5) * 2;
      const normY = (clientY / innerHeight - 0.5) * 2;

      cancelAnimationFrame(animId);
      animId = requestAnimationFrame(() => {
        setOffset({
          x: normX * strength,
          y: normY * strength,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, [enableParallax, strength]);

  if (!enableParallax) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative will-change-transform transition-transform duration-300 ease-out', className)}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
    >
      {children}
    </div>
  );
};
