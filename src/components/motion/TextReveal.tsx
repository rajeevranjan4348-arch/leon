import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useMotionConfig } from './MotionProvider';
import { cn } from '@/lib/utils';

interface TextRevealProps {
  text: string;
  type?: 'words' | 'characters' | 'lines';
  delay?: number;
  stagger?: number;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  type = 'words',
  delay = 0,
  stagger = 0.04,
  className,
  as: Component = 'div',
}) => {
  const { reduceMotion } = useMotionConfig();

  if (reduceMotion) {
    return <Component className={className}>{text}</Component>;
  }

  const items = type === 'words' ? text.split(' ') : text.split('');

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 8,
      filter: 'blur(3px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        type: 'spring',
        stiffness: 350,
        damping: 25,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('inline-flex flex-wrap gap-x-1.5', className)}
    >
      {items.map((item, index) => (
        <motion.span
          key={`${item}-${index}`}
          variants={itemVariants}
          style={{ willChange: 'transform, opacity, filter', transform: 'translateZ(0)' }}
          className="inline-block will-change-transform"
        >
          {item}
          {type === 'words' && index < items.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </motion.div>
  );
};
