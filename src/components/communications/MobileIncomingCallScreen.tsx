import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, MessageSquare, User, Sparkles } from 'lucide-react';
import { CallSession } from '@/types/comm';
import { cn } from '@/lib/utils';

interface MobileIncomingCallScreenProps {
  isOpen: boolean;
  session: CallSession | null;
  onAccept: () => void;
  onReject: () => void;
  onQuickReply?: (message: string) => void;
}

export const MobileIncomingCallScreen: React.FC<MobileIncomingCallScreenProps> = ({
  isOpen,
  session,
  onAccept,
  onReject,
  onQuickReply,
}) => {
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  if (!isOpen || !session) return null;

  const isVideo = session.type === 'video';
  const caller = session.caller;

  const quickReplies = [
    "Can't talk now. Call you later!",
    "I'm in a meeting. What's up?",
    'On my way, give me a few minutes.',
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex flex-col justify-between bg-gradient-to-b from-[#11121c] via-[#090a12] to-[#040508] text-white p-6 select-none font-sans overflow-hidden"
      >
        {/* TOP CALL TYPE BADGE */}
        <div className="w-full flex items-center justify-center pt-8 z-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl"
          >
            {isVideo ? (
              <Video size={14} className="text-cyan-400" />
            ) : (
              <Phone size={14} className="text-emerald-400" />
            )}
            <span className="text-xs font-bold tracking-wider text-white">
              INCOMING {isVideo ? 'HD VIDEO' : 'HD VOICE'} CALL
            </span>
          </motion.div>
        </div>

        {/* CALLER PROFILE & RIPPLE GLOW */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto z-10 space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Multi-tier Pulsing Ripple Circles */}
            <motion.div
              animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border-2 border-cyan-400/40 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.3, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border border-indigo-400/30 pointer-events-none"
            />

            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-1 bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                {caller.avatar ? (
                  <img src={caller.avatar} alt={caller.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-cyan-400">{caller.name[0]}</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
              <span>{caller.name}</span>
              {caller.isAI && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                  AI
                </span>
              )}
            </h2>
            <p className="text-xs text-white/50 mt-1 font-medium">
              {caller.role || caller.email || 'Mobile Device Call'}
            </p>
          </div>
        </div>

        {/* QUICK REPLIES DRAWER */}
        {showQuickReplies && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-sm mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 mb-4 shadow-2xl z-20 space-y-2"
          >
            <div className="text-xs font-bold text-white/60 px-1 mb-1">Decline with Quick Message</div>
            {quickReplies.map((msg, i) => (
              <button
                key={i}
                onClick={() => {
                  if (onQuickReply) onQuickReply(msg);
                  onReject();
                }}
                className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white transition-colors"
              >
                "{msg}"
              </button>
            ))}
          </motion.div>
        )}

        {/* BOTTOM ACTION BUTTONS: DECLINE / ACCEPT / QUICK REPLY */}
        <div className="w-full max-w-sm mx-auto z-10 pb-8 space-y-6">
          {/* Quick Message Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <MessageSquare size={13} />
              <span>Quick Reply</span>
            </button>
          </div>

          <div className="flex items-center justify-between px-6">
            {/* DECLINE BUTTON */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onReject}
                className="w-18 h-18 rounded-3xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff size={28} />
              </button>
              <span className="text-xs font-semibold text-white/70">Decline</span>
            </div>

            {/* ACCEPT BUTTON */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onAccept}
                className="w-18 h-18 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-2xl shadow-emerald-500/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Accept Call"
              >
                {isVideo ? <Video size={28} /> : <Phone size={28} />}
              </button>
              <span className="text-xs font-semibold text-emerald-400">Accept</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
