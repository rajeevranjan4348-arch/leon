import React from 'react';
import { motion } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

// 1. High-fidelity Skeleton with Animated Gradient Shimmer
interface SkeletonShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export const SkeletonShimmer: React.FC<SkeletonShimmerProps> = ({
  className,
  width,
  height,
  borderRadius = 'rounded-xl',
}) => {
  const { reduceMotion } = useMotionConfig();

  return (
    <div
      style={{ width, height }}
      className={cn(
        'relative overflow-hidden bg-white/[0.06] border border-white/[0.04]',
        borderRadius,
        className
      )}
    >
      {!reduceMotion && (
        <motion.div
          animate={{ x: ['-100%', '100%'] }}
          transition={{
            repeat: Infinity,
            duration: 1.6,
            ease: 'linear',
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        />
      )}
    </div>
  );
};

// 2. Pulsating Triad Dots
interface PulseDotsProps {
  size?: number;
  color?: string;
  className?: string;
}

export const PulseDots: React.FC<PulseDotsProps> = ({
  size = 6,
  color = 'bg-cyan-400',
  className,
}) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('rounded-full opacity-60', color)} style={{ width: size, height: size }} />
        <span className={cn('rounded-full opacity-80', color)} style={{ width: size, height: size }} />
        <span className={cn('rounded-full opacity-60', color)} style={{ width: size, height: size }} />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn('rounded-full shadow-sm', color)}
          style={{ width: size, height: size }}
          animate={{
            scale: [0.8, 1.25, 0.8],
            opacity: [0.35, 1, 0.35],
            y: [0, -3, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.16,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// 3. AI Stream Processing Glow Wave
interface ProcessingGlowBarProps {
  className?: string;
}

export const ProcessingGlowBar: React.FC<ProcessingGlowBarProps> = ({ className }) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <div className={cn('w-full h-1 bg-cyan-500/40 rounded-full', className)} />;
  }

  return (
    <div className={cn('relative w-full h-0.5 bg-white/10 rounded-full overflow-hidden', className)}>
      <motion.div
        animate={{
          x: ['-100%', '100%'],
          scaleX: [0.3, 0.7, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.4,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(6,182,212,0.8)]"
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      />
    </div>
  );
};
