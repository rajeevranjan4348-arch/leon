import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { CallSession } from '@/types/comm';
import { cn } from '@/lib/utils';

interface IncomingCallModalProps {
  isOpen: boolean;
  session: CallSession | null;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  session,
  onAccept,
  onReject,
}) => {
  if (!isOpen || !session) return null;

  const isVideo = session.type === 'video';
  const caller = session.caller;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 select-none font-sans"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#1c1d24] to-[#0d0e12] border border-white/15 p-8 flex flex-col items-center text-center shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className={cn(
            "absolute -top-24 w-64 h-64 rounded-full blur-3xl opacity-30 pointer-events-none",
            isVideo ? "bg-cyan-500" : "bg-emerald-500"
          )} />

          {/* Call Type Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-white/90 mb-6">
            {isVideo ? <Video size={13} className="text-cyan-400" /> : <Phone size={13} className="text-emerald-400" />}
            <span>Incoming {isVideo ? 'Video' : 'Voice'} Call...</span>
          </div>

          {/* Caller Avatar with Pulsing Rings */}
          <div className="relative mb-6">
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                "absolute inset-0 rounded-full border-2",
                isVideo ? "border-cyan-400" : "border-emerald-400"
              )}
            />
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.8, delay: 0.3, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                "absolute inset-0 rounded-full border",
                isVideo ? "border-cyan-400/50" : "border-emerald-400/50"
              )}
            />
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-xl bg-zinc-800 flex items-center justify-center">
              {caller.avatar ? (
                <img src={caller.avatar} alt={caller.name} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-white/60" />
              )}
            </div>
          </div>

          {/* Caller Name & Status */}
          <h2 className="text-2xl font-bold text-white tracking-tight">{caller.name}</h2>
          <p className="text-sm text-white/60 mt-1 font-medium">
            {caller.isAI ? 'Rishi AI Assistant' : caller.email || 'Direct Connection'}
          </p>

          {/* Action Buttons: Decline (Red) and Accept (Green) */}
          <div className="flex items-center justify-between w-full max-w-xs mt-10 px-4">
            {/* Decline */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                id="rejectCallBtn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onReject}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/40 cursor-pointer transition-colors"
                title="Decline Call"
              >
                <PhoneOff size={26} />
              </motion.button>
              <span className="text-xs font-medium text-white/70">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                id="acceptCallBtn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onAccept}
                className={cn(
                  "w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg cursor-pointer transition-colors",
                  isVideo
                    ? "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/40 animate-pulse"
                    : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 animate-pulse"
                )}
                title="Accept Call"
              >
                {isVideo ? <Video size={26} /> : <Phone size={26} />}
              </motion.button>
              <span className="text-xs font-semibold text-emerald-400">Accept</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
