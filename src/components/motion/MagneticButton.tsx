import React, { useRef, useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends HTMLMotionProps<'button'> {
  children: React.ReactNode;
  magneticStrength?: number; // 0.1 - 0.4
  maxDistance?: number; // max px offset (e.g. 6px)
  className?: string;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  magneticStrength = 0.22,
  maxDistance = 6,
  className,
  ...props
}) => {
  const { enableMagneticButtons } = useMotionConfig();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!enableMagneticButtons || !buttonRef.current) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const distanceX = (clientX - centerX) * magneticStrength;
    const distanceY = (clientY - centerY) * magneticStrength;

    // Clamp distance to avoid extreme shifts
    const clampedX = Math.max(-maxDistance, Math.min(maxDistance, distanceX));
    const clampedY = Math.max(-maxDistance, Math.min(maxDistance, distanceY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  if (!enableMagneticButtons) {
    return (
      <motion.button
        ref={buttonRef}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={className}
        {...props}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      ref={buttonRef}
      data-cursor="magnetic"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 20,
        mass: 0.5,
      }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      className={cn('will-change-transform cursor-pointer', className)}
      {...props}
    >
      {children}
    </motion.button>
  );
};
