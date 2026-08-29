import React from 'react';
import { motion } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface AmbientMeshBackgroundProps {
  className?: string;
  opacity?: number;
}

export const AmbientMeshBackground: React.FC<AmbientMeshBackgroundProps> = ({
  className,
  opacity = 0.45,
}) => {
  const { reduceMotion, fps } = useMotionConfig();

  if (reduceMotion || fps < 30) {
    return (
      <div
        className={cn('fixed inset-0 pointer-events-none overflow-hidden z-0', className)}
        style={{ opacity }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-radial from-cyan-900/10 via-purple-900/5 to-transparent" />
      </div>
    );
  }

  return (
    <div
      className={cn('fixed inset-0 pointer-events-none overflow-hidden z-0 select-none', className)}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Primary Cyan Nebula Orb */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -50, 25, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        className="absolute -top-[15%] left-[10%] w-[550px] h-[550px] rounded-full bg-cyan-600/12 blur-[120px] pointer-events-none"
      />

      {/* Secondary Indigo/Purple Ambient Orb */}
      <motion.div
        animate={{
          x: [0, -45, 35, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        className="absolute top-[35%] right-[5%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none"
      />

      {/* Subtle Blue Depth Orb */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -30, 40, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none"
      />
    </div>
  );
};
