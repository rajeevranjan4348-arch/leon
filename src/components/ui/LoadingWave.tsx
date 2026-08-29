import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingWaveProps {
  className?: string;
  color?: string;
}

/**
 * Loading Wave Animation Icon
 * From Uiverse.io by mrpumps31232
 */
export const LoadingWave: React.FC<LoadingWaveProps> = ({
  className,
}) => {
  return (
    <div className={cn("loading-wave select-none shrink-0", className)} aria-hidden="true">
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
      <div className="loading-bar"></div>
    </div>
  );
};

export default LoadingWave;
