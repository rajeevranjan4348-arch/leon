import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface VirtualListProps<T> {
  items: T[];
  itemHeight?: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemKey: (item: T, index: number) => string | number;
  emptyState?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight = 56,
  overscan = 5,
  className = '',
  renderItem,
  getItemKey,
  emptyState = null,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Resize observer to get accurate container height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      setContainerHeight(el.clientHeight || 600);
    };

    updateHeight();

    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalCount = items.length;
  const totalHeight = totalCount * itemHeight;

  const { startIndex, endIndex, offsetY } = useMemo(() => {
    if (totalCount === 0) return { startIndex: 0, endIndex: 0, offsetY: 0 };

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const end = Math.min(totalCount, start + visibleCount);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
    };
  }, [scrollTop, itemHeight, overscan, containerHeight, totalCount]);

  if (totalCount === 0) {
    return <div className={className}>{emptyState}</div>;
  }

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className}`}
      style={{ position: 'relative' }}
    >
      <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, idx) => {
            const actualIndex = startIndex + idx;
            return (
              <div
                key={getItemKey(item, actualIndex)}
                style={{
                  minHeight: `${itemHeight}px`,
                  contentVisibility: 'auto',
                  containIntrinsicSize: `0 ${itemHeight}px`,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
