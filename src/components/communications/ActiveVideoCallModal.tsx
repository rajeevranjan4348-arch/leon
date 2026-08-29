import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Sparkles,
  Eye,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  User,
} from 'lucide-react';
import { CallSession, CommUser } from '@/types/comm';
import { cn } from '@/lib/utils';

interface ActiveVideoCallModalProps {
  session: CallSession | null;
  currentUser: CommUser;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onToggleAIVision: (videoElement?: HTMLVideoElement) => void;
  onEndCall: () => void;
}

export const ActiveVideoCallModal: React.FC<ActiveVideoCallModalProps> = ({
  session,
  currentUser,
  localStream,
  remoteStream,
  onToggleMic,
  onToggleVideo,
  onFlipCamera,
  onToggleAIVision,
  onEndCall,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Attach local media stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, session?.isVideoEnabled]);

  // Attach remote media stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!session || session.type !== 'video') return null;

  const peer = session.caller.id === currentUser.id ? session.receiver : session.caller;
  const isConnected = session.status === 'connected';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleAIVisionClick = () => {
    if (localVideoRef.current) {
      onToggleAIVision(localVideoRef.current);
    } else {
      onToggleAIVision();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col justify-between bg-black text-white font-sans select-none overflow-hidden h-[100dvh] w-full"
      >
        {/* Main Stage: Remote Video Feed or AI Avatar */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : peer.isAI ? (
            // Dedicated AI Interactive Video Experience Stage
            <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950/40 via-zinc-950 to-black">
              {/* Dynamic AI Background Nebula */}
              <div className="absolute w-96 h-96 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
              
              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-36 h-36 md:w-48 md:h-48 rounded-full border-2 border-cyan-400/50 shadow-[0_0_60px_rgba(34,211,238,0.35)] overflow-hidden bg-black flex items-center justify-center p-2"
                >
                  <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover rounded-full" />
                </motion.div>
                <h3 className="mt-5 text-xl font-bold text-white tracking-tight">{peer.name}</h3>
                <p className="text-xs text-cyan-300 font-medium mt-1">Live AI Multimodal Video Session</p>
              </div>
            </div>
          ) : (
            // Placeholder when waiting for remote peer video
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="w-28 h-28 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
                {peer.avatar ? (
                  <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-white/60" />
                )}
              </div>
              <h3 className="text-xl font-bold text-white">{peer.name}</h3>
              <p className="text-sm text-white/60 mt-1">
                {session.status === 'calling' ? 'Calling...' : session.status === 'connecting' ? 'Establishing Video Stream...' : 'Connecting...'}
              </p>
            </div>
          )}

          {/* AI Vision Active Scanner Grid Overlay */}
          {session.isAIVisionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 border-2 border-cyan-400/60"
            >
              {/* Animated Scan Line */}
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                className="w-full h-0.5 bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
              />

              {/* Top AI Vision Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-cyan-400/40 text-cyan-300 text-xs font-semibold backdrop-blur-md self-center">
                <Sparkles size={14} className="animate-spin" />
                <span>AI Vision Scanning Active</span>
              </div>

              {/* Bottom AI Vision Analysis Prompt */}
              {session.aiVisionSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/85 border border-cyan-400/30 p-3.5 rounded-2xl max-w-md mx-auto text-center shadow-2xl backdrop-blur-xl"
                >
                  <p className="text-xs md:text-sm text-cyan-100 font-medium leading-relaxed">
                    "{session.aiVisionSummary}"
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Floating Picture-in-Picture Local Camera Preview */}
          <motion.div
            drag
            dragConstraints={containerRef}
            dragElastic={0.2}
            className="absolute top-20 right-4 md:right-8 z-30 w-32 h-44 md:w-44 md:h-60 rounded-2xl overflow-hidden border-2 border-white/25 shadow-2xl bg-zinc-900 cursor-move"
          >
            {session.isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/50 p-2 text-center">
                <VideoOff size={24} className="mb-1 text-red-400" />
                <span className="text-[10px]">Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-medium text-white/90 backdrop-blur-sm">
              You
            </div>
          </motion.div>
        </div>

        {/* Top Floating Controls */}
        <header className="absolute top-0 left-0 right-0 h-16 px-6 pt-4 flex items-center justify-between z-40 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white tracking-tight">{peer.name}</span>
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  )}
                />
                <span className="font-mono font-medium">{formatDuration(session.duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Vision Mode Toggle Button */}
            <button
              onClick={handleAIVisionClick}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-md',
                session.isAIVisionActive
                  ? 'bg-cyan-500 text-black border border-cyan-400 shadow-cyan-500/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md'
              )}
              title="Toggle AI Vision Frame Analysis"
            >
              <Sparkles size={14} className={session.isAIVisionActive ? 'text-black' : 'text-cyan-400'} />
              <span>{session.isAIVisionActive ? 'AI Vision ON' : 'AI Vision'}</span>
            </button>

            {/* Network Indicator */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] text-white/70 backdrop-blur-md">
              {session.networkQuality === 'poor' || session.isReconnecting ? (
                <WifiOff size={13} className="text-amber-400 animate-pulse" />
              ) : (
                <Wifi size={13} className="text-emerald-400" />
              )}
              <span className="capitalize hidden sm:inline">{session.networkQuality}</span>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black/40 hover:bg-white/10 border border-white/10 text-white/80 transition-colors backdrop-blur-md"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </header>

        {/* Bottom Call Action Toolbar */}
        <footer className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-6 flex items-center justify-center gap-5 sm:gap-7 z-40 bg-gradient-to-t from-black/90 via-black/50 to-transparent max-w-xl mx-auto w-full">
          {/* Mute Mic */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleMic}
            className={cn(
              'w-13 h-13 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-md',
              session.isMicMuted
                ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/15'
            )}
            title={session.isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {session.isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </motion.button>

          {/* Toggle Video Camera */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={onToggleVideo}
            className={cn(
              'w-13 h-13 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-md',
              !session.isVideoEnabled
                ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                : 'bg-white/15 text-white hover:bg-white/25 border border-white/15'
            )}
            title={session.isVideoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {session.isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </motion.button>

          {/* Flip Camera (Front / Back) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={onFlipCamera}
            className="w-13 h-13 rounded-full bg-white/15 hover:bg-white/25 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-md"
            title="Switch Front/Back Camera"
          >
            <SwitchCamera size={20} />
          </motion.button>

          {/* End Video Call Button (Large Red) */}
          <motion.button
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xl shadow-red-600/50"
            title="End Video Call"
          >
            <PhoneOff size={26} />
          </motion.button>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};
