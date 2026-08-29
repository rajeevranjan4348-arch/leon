import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquareHeart } from 'lucide-react';
import { ContactFeedbackForm } from './ContactFeedbackForm';

interface ContactFeedbackPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  activePanel?: string;
  triggerElementRef?: React.RefObject<HTMLElement | null>;
}

export const ContactFeedbackPanel: React.FC<ContactFeedbackPanelProps> = ({
  isOpen,
  onClose,
  sessionId,
  activePanel,
  triggerElementRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus management & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    // Save active element to restore focus on close
    const previousActiveElement = (triggerElementRef?.current || document.activeElement) as HTMLElement | null;

    // Focus panel container on open
    setTimeout(() => {
      panelRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose, triggerElementRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="contact-feedback-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-over Panel Container */}
          <motion.div
            key="contact-feedback-panel"
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 350,
              mass: 0.8,
            }}
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-label="Contact and Feedback Panel"
            aria-modal="true"
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] max-w-full bg-black/90 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-50 flex flex-col focus:outline-none overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <MessageSquareHeart size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Contact & Feedback</h2>
                  <p className="text-[11px] text-white/50">Send messages & download system diagnostics</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Contact and Feedback Panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
              <ContactFeedbackForm
                onSuccessClose={onClose}
                sessionId={sessionId}
                activePanel={activePanel}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
