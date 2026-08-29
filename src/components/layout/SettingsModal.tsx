import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsView } from '@/components/settings/SettingsView';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            className="bg-[#0e0e13] border border-white/10 sm:rounded-3xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl text-white"
          >
            <SettingsView onClose={onClose} isModal={true} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
