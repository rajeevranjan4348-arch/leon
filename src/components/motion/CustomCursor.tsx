import React, { useEffect, useRef, useState } from 'react';
import { useMotionConfig } from './MotionProvider';

export const CustomCursor: React.FC = () => {
  const { enableCustomCursor } = useMotionConfig();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Position state refs to avoid React re-renders on every mouse move
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const [cursorType, setCursorType] = useState<'default' | 'pointer' | 'text' | 'magnetic'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    if (!enableCustomCursor || typeof window === 'undefined') return;

    let isMounted = true;
    let animId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;

      if (!isVisible && isMounted) {
        setIsVisible(true);
      }

      // Check hovered element type
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'button, a, input, textarea, select, [role="button"], [data-cursor], .cursor-pointer'
        );
        if (interactive) {
          const customType = interactive.getAttribute('data-cursor');
          if (customType === 'text' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            setCursorType('text');
          } else if (customType === 'magnetic') {
            setCursorType('magnetic');
          } else {
            setCursorType('pointer');
          }
        } else {
          setCursorType('default');
        }
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // 60-144 FPS smooth spring interpolation loop for outer ring
    const renderLoop = () => {
      if (!isMounted) return;

      const dot = dotRef.current;
      const ring = ringRef.current;

      if (dot) {
        dot.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
      }

      if (ring) {
        // Elastic lerp interpolation
        const ease = 0.18;
        ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease;
        ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease;
        ring.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [enableCustomCursor, isVisible]);

  if (!enableCustomCursor) return null;

  const isPointer = cursorType === 'pointer' || cursorType === 'magnetic';
  const isText = cursorType === 'text';

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-[9999] overflow-hidden transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden="true"
    >
      {/* Precision Inner Dot */}
      <div
        ref={dotRef}
        className={`fixed top-0 left-0 -ml-[3px] -mt-[3px] rounded-full pointer-events-none will-change-transform transition-all duration-150 ease-out ${
          isText
            ? 'w-[2px] h-[16px] -ml-[1px] -mt-[8px] bg-cyan-400 rounded-none'
            : isPointer
            ? 'w-[6px] h-[6px] -ml-[3px] -mt-[3px] bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
            : isClicking
            ? 'w-[4px] h-[4px] -ml-[2px] -mt-[2px] bg-white scale-75'
            : 'w-[6px] h-[6px] -ml-[3px] -mt-[3px] bg-white'
        }`}
        style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      />

      {/* Elastic Aura Outer Ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full pointer-events-none will-change-transform transition-all duration-200 ease-out ${
          isText
            ? 'w-0 h-0 opacity-0'
            : isPointer
            ? 'w-10 h-10 -ml-5 -mt-5 border border-cyan-400/60 bg-cyan-500/10 backdrop-blur-[1px] scale-110 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            : isClicking
            ? 'w-6 h-6 -ml-3 -mt-3 border border-white/80 bg-white/20 scale-90'
            : 'w-7 h-7 -ml-3.5 -mt-3.5 border border-white/30 bg-white/[0.03]'
        }`}
        style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      />
    </div>
  );
};
