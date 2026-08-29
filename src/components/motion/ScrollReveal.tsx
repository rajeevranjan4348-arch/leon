import React, { useRef } from 'react';
import { motion, useInView, HTMLMotionProps, Variants } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';

interface ScrollRevealProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  once?: boolean;
  className?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.45,
  distance = 20,
  threshold = 0.15,
  once = true,
  className,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: threshold, once });
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const getInitialOffset = () => {
    switch (direction) {
      case 'up':
        return { y: distance, x: 0, scale: 1 };
      case 'down':
        return { y: -distance, x: 0, scale: 1 };
      case 'left':
        return { x: distance, y: 0, scale: 1 };
      case 'right':
        return { x: -distance, y: 0, scale: 1 };
      case 'scale':
        return { scale: 0.94, x: 0, y: 0 };
      case 'fade':
      default:
        return { x: 0, y: 0, scale: 1 };
    }
  };

  const initial = {
    opacity: 0,
    ...getInitialOffset(),
  };

  const animate = isInView
    ? {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
      }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 28,
        mass: 0.8,
        delay,
        duration,
        opacity: { duration: duration * 0.75, ease: 'easeOut', delay },
      }}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
      className={cn('will-change-transform', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Container for staggering multiple list items on scroll
interface ScrollStaggerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const ScrollStagger: React.FC<ScrollStaggerProps> = ({
  children,
  staggerDelay = 0.06,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.1, once: true });
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.05,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface ScrollStaggerItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
}

export const ScrollStaggerItem: React.FC<ScrollStaggerItemProps> = ({
  children,
  className,
  ...props
}) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 340,
        damping: 26,
      },
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
      className={cn('will-change-transform', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};
