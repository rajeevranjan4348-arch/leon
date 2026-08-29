import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { isDeepEqual } from '@/lib/deepEqual';

export interface MessageItemProps {
  children: React.ReactNode;
  isUser: boolean;
  message?: any;
  onDelete?: () => void;
  className?: string;
}

export const MessageItem: React.FC<MessageItemProps> = memo(
  ({ children, isUser, className = '' }) => {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: isUser ? 12 : 16,
          scale: isUser ? 0.985 : 0.99,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          y: -10,
          scale: 0.98,
        }}
        transition={{
          type: 'spring',
          damping: isUser ? 28 : 32,
          stiffness: isUser ? 340 : 280,
          mass: 0.85,
          opacity: { duration: 0.22, ease: 'easeOut' },
        }}
        style={{
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        className={`relative group/msg ${className}`}
      >
        {children}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.isUser !== nextProps.isUser) return false;
    if (prevProps.className !== nextProps.className) return false;
    if (prevProps.message !== undefined || nextProps.message !== undefined) {
      if (!isDeepEqual(prevProps.message, nextProps.message)) return false;
    }
    return prevProps.children === nextProps.children;
  }
);

MessageItem.displayName = 'MessageItem';



