import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Video,
  Grid,
  Bluetooth,
  Headphones,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Radio,
  X,
} from 'lucide-react';
import { CallSession, CommUser } from '@/types/comm';
import { webrtcManager } from '@/lib/comm/webrtcManager';
import { cn } from '@/lib/utils';

interface MobileVoiceCallScreenProps {
  session: CallSession | null;
  currentUser: CommUser;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMic: () => void;
  onSwitchToVideo?: () => void;
  onEndCall: () => void;
}

export const MobileVoiceCallScreen: React.FC<MobileVoiceCallScreenProps> = ({
  session,
  currentUser,
  localStream,
  remoteStream,
  onToggleMic,
  onSwitchToVideo,
  onEndCall,
}) => {
  const [audioRoute, setAudioRoute] = useState<'speaker' | 'earpiece' | 'bluetooth'>('speaker');
  const [isAudioRouteMenuOpen, setIsAudioRouteMenuOpen] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play remote audio
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  if (!session || session.type !== 'voice') return null;

  const isCaller = session.caller.id === currentUser.id;
  const peer = isCaller ? session.receiver : session.caller;

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeypadPress = (num: string) => {
    setKeypadInput((prev) => prev + num);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[105] flex flex-col justify-between bg-gradient-to-b from-[#0e0f17] via-[#090a10] to-[#040508] text-white p-6 select-none font-sans overflow-hidden"
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* TOP STATUS BAR & NETWORK QUALITY */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 pt-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1.5 border',
                session.status === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : session.status === 'calling'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  session.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                )}
              />
              {session.status === 'connected'
                ? 'HD ENCRYPTED CALL'
                : session.status === 'calling'
                ? 'CALLING...'
                : 'CONNECTING...'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            {session.networkQuality === 'poor' ? (
              <WifiOff size={13} className="text-amber-400" />
            ) : (
              <Wifi size={13} className="text-emerald-400" />
            )}
            <span className="capitalize text-[11px]">{session.networkQuality || 'good'}</span>
          </div>
        </div>

        {/* RECONNECTION BANNER */}
        {session.isReconnecting && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm mx-auto bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs py-1.5 px-3 rounded-xl text-center flex items-center justify-center gap-2"
          >
            <Radio size={14} className="animate-spin text-amber-400" />
            <span>Reconnecting network drop...</span>
          </motion.div>
        )}

        {/* CALLER AVATAR & INFO */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto z-10 space-y-5">
          {/* Animated Pulsing Ring Avatar */}
          <div className="relative flex items-center justify-center">
            {session.status === 'connected' && (
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="absolute w-36 h-36 rounded-full bg-cyan-500/20 blur-xl pointer-events-none"
              />
            )}
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-2xl flex items-center justify-center">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
                {peer.avatar ? (
                  <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-3xl font-bold text-cyan-400">{peer.name[0]}</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
              <span>{peer.name}</span>
              {peer.isAI && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  AI
                </span>
              )}
            </h2>
            <p className="text-xs text-white/50 mt-1">{peer.role || peer.email || 'Mobile Voice Call'}</p>
          </div>

          {/* CALL TIMER / STATUS */}
          <div className="text-base font-mono font-medium text-cyan-400 tracking-wider">
            {session.status === 'connected'
              ? formatTimer(session.duration)
              : session.status === 'calling'
              ? 'Ringing...'
              : 'Connecting...'}
          </div>

          {/* SIMULATED AUDIO WAVEFORM */}
          {session.status === 'connected' && (
            <div className="flex items-center gap-1 h-6">
              {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 1, 0.6, 0.3, 0.8, 0.5].map((scale, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['4px', `${scale * 24}px`, '4px'] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1, ease: 'easeInOut' }}
                  className="w-1 bg-cyan-400/80 rounded-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* KEYPAD DRAWER MODAL */}
        {showKeypad && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="w-full max-w-xs mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 mb-4 shadow-2xl z-20"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 font-medium">Keypad</span>
              <span className="text-sm font-mono text-cyan-400">{keypadInput || '—'}</span>
              <button onClick={() => setShowKeypad(false)} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeypadPress(k)}
                  className="h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white font-bold text-sm transition-colors active:scale-95"
                >
                  {k}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* AUDIO ROUTE SELECTOR SHEET */}
        {isAudioRouteMenuOpen && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-xs mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 mb-3 shadow-2xl z-20 space-y-1.5"
          >
            <div className="text-[11px] font-bold text-white/50 px-2 py-1 uppercase tracking-wider">
              Audio Route
            </div>
            {[
              { id: 'speaker', label: 'Speakerphone', icon: Volume2 },
              { id: 'earpiece', label: 'Phone Earpiece', icon: Smartphone },
              { id: 'bluetooth', label: 'Bluetooth / Headset', icon: Bluetooth },
            ].map((route) => (
              <button
                key={route.id}
                onClick={() => {
                  setAudioRoute(route.id as any);
                  setIsAudioRouteMenuOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                  audioRoute === route.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-white/80 hover:bg-white/5'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <route.icon size={15} />
                  <span>{route.label}</span>
                </div>
                {audioRoute === route.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
              </button>
            ))}
          </motion.div>
        )}

        {/* BOTTOM CONTROLS GRID */}
        <div className="w-full max-w-sm mx-auto z-10 pb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4 place-items-center">
            {/* Mute Mic */}
            <button
              onClick={onToggleMic}
              className={cn(
                'w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border cursor-pointer',
                session.isMicMuted
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 shadow-lg shadow-red-500/20'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              )}
            >
              {session.isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="text-[10px] text-white/70 font-medium">
                {session.isMicMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>

            {/* Audio Route / Speaker */}
            <button
              onClick={() => setIsAudioRouteMenuOpen(!isAudioRouteMenuOpen)}
              className={cn(
                'w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 border cursor-pointer',
                audioRoute === 'speaker'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/10 text-white hover:bg-white/15 border-white/10'
              )}
            >
              {audioRoute === 'bluetooth' ? (
                <Bluetooth size={20} />
              ) : audioRoute === 'earpiece' ? (
                <Smartphone size={20} />
              ) : (
                <Volume2 size={20} />
              )}
              <span className="text-[10px] text-white/70 font-medium capitalize">{audioRoute}</span>
            </button>

            {/* Keypad */}
            <button
              onClick={() => setShowKeypad(!showKeypad)}
              className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <Grid size={20} />
              <span className="text-[10px] text-white/70 font-medium">Keypad</span>
            </button>
          </div>

          {/* SECONDARY ROW & END CALL */}
          <div className="flex items-center justify-center gap-6 pt-2">
            {/* Switch to Video */}
            {onSwitchToVideo && (
              <button
                onClick={onSwitchToVideo}
                className="w-12 h-12 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center transition-all active:scale-95"
                title="Switch to Video Call"
              >
                <Video size={18} />
              </button>
            )}

            {/* RED END CALL BUTTON */}
            <button
              onClick={onEndCall}
              className="w-18 h-18 rounded-3xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition-transform active:scale-90 hover:scale-105 cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
