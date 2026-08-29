import { useState, useEffect, useRef, RefObject } from 'react';

interface UseInViewportOptions {
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * High-performance viewport intersection observer hook.
 * Allows components to pause animations and heavy canvas rendering when scrolled offscreen.
 */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewportOptions = {}
): [RefObject<T>, boolean] {
  const [isInViewport, setIsInViewport] = useState(true);
  const elementRef = useRef<T>(null);
  const { rootMargin = '100px', threshold = 0 } = options;

  useEffect(() => {
    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { rootMargin, threshold }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold]);

  return [elementRef, isInViewport];
}
