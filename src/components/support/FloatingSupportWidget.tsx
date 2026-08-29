import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles, MessageCircle, Calendar, Wrench, Shield } from 'lucide-react';
import { GeminiSupportChatbot } from './GeminiSupportChatbot';
import { cn } from '@/lib/utils';

export const FloatingSupportWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);

  // Global custom event listeners to trigger open from other parts of the app
  useEffect(() => {
    const handleOpenSupport = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: 'general' | 'booking' | 'troubleshooting' }>;
      setIsOpen(true);
      setShowGreeting(false);
    };

    window.addEventListener('open_gemini_support_chatbot', handleOpenSupport);
    return () => window.removeEventListener('open_gemini_support_chatbot', handleOpenSupport);
  }, []);

  // Auto-hide greeting bubble after 10s if not clicked
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Floating Toggle Button with Pulse Effect */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
        {/* Floating Greeting Tooltip Bubble */}
        <AnimatePresence>
          {!isOpen && showGreeting && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className="relative p-3 rounded-2xl bg-[#14141e]/95 backdrop-blur-xl border border-purple-500/30 text-white shadow-2xl max-w-xs cursor-pointer group"
              onClick={() => {
                setIsOpen(true);
                setShowGreeting(false);
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGreeting(false);
                }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70"
              >
                <X size={10} />
              </button>

              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-xl bg-purple-600/30 text-purple-300 shrink-0">
                  <Sparkles size={14} className="animate-spin" />
                </div>
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-purple-200">Gemini Support Assistant</span>
                  <span className="text-white/70 leading-relaxed text-[11px] mt-0.5">
                    Need help booking a service or troubleshooting an issue? Chat with me!
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Action Button */}
        {!isOpen && (
          <motion.button
            id="floating-gemini-support-trigger"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsOpen(true);
              setShowGreeting(false);
            }}
            className="relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-2xl shadow-purple-600/40 hover:shadow-purple-600/60 border border-white/20 transition-all cursor-pointer group"
            title="Open Gemini Support & Booking Chatbot"
          >
            <div className="relative flex items-center justify-center">
              <Bot size={20} className="group-hover:rotate-12 transition-transform duration-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
            </div>

            <span className="text-xs font-bold tracking-tight pr-0.5 hidden sm:inline">
              Gemini Support
            </span>
          </motion.button>
        )}
      </div>

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-5 sm:right-5 z-50 pointer-events-auto"
          >
            <GeminiSupportChatbot
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              isFloating={true}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
