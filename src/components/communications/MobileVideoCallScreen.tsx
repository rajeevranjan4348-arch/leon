import React, { useState, useEffect, useRef } from 'react';
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
  Smartphone,
  Bluetooth,
  User,
  Radio,
  Layers,
} from 'lucide-react';
import { CallSession, CommUser } from '@/types/comm';
import { webrtcManager } from '@/lib/comm/webrtcManager';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MobileVideoCallScreenProps {
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

export const MobileVideoCallScreen: React.FC<MobileVideoCallScreenProps> = ({
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
  const [isSwapped, setIsSwapped] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [audioRoute, setAudioRoute] = useState<'speaker' | 'earpiece' | 'bluetooth'>('speaker');
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Mobile Screen WakeLock to prevent screen timeout during calls
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Ignore wakeLock unsupported
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
      }
    };
  }, []);

  if (!session || session.type !== 'video') return null;

  const isCaller = session.caller.id === currentUser.id;
  const peer = isCaller ? session.receiver : session.caller;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Picture in Picture
  const handleRequestPiP = async () => {
    try {
      const targetVideo = remoteVideoRef.current || localVideoRef.current;
      if (targetVideo && 'requestPictureInPicture' in targetVideo) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await targetVideo.requestPictureInPicture();
          toast.info('Picture-in-Picture enabled');
        }
      } else {
        toast.info('Picture-in-Picture not supported in this browser');
      }
    } catch (e: any) {
      toast.error('PiP failed: ' + e.message);
    }
  };

  const handleVisionToggle = () => {
    const targetVideo = isSwapped ? localVideoRef.current : remoteVideoRef.current || localVideoRef.current;
    onToggleAIVision(targetVideo || undefined);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsControlsVisible((prev) => !prev)}
        className="fixed inset-0 z-[105] flex flex-col bg-black text-white select-none font-sans overflow-hidden"
      >
        {/* FULLSCREEN REMOTE / PRIMARY VIDEO CANVAS */}
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 overflow-hidden">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={cn(
                'w-full h-full transition-all',
                fitMode === 'cover' ? 'object-cover' : 'object-contain'
              )}
            />
          ) : (
            /* Fallback while waiting for remote video or when peer camera is off */
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/20 shadow-2xl flex items-center justify-center">
                  {peer.avatar ? (
                    <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-cyan-400">{peer.name[0]}</span>
                  )}
                </div>
                {session.status === 'connected' && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{peer.name}</h3>
                <p className="text-xs text-white/50 mt-1">
                  {session.status === 'connected' ? 'Camera is paused' : 'Connecting HD Video...'}
                </p>
              </div>
            </div>
          )}

          {/* FLOATING LOCAL CAMERA PREVIEW (MOVABLE PIP) */}
          <motion.div
            drag
            dragConstraints={{ left: 10, right: 280, top: 10, bottom: 500 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsSwapped(!isSwapped);
            }}
            className="absolute top-16 right-4 z-20 w-28 md:w-36 aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border-2 border-white/25 shadow-2xl cursor-pointer active:scale-95 transition-transform"
          >
            {session.isVideoEnabled && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/40 text-[10px] p-2 text-center">
                <VideoOff size={16} className="mb-1" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-1 left-2 text-[9px] font-bold text-white/80 bg-black/60 px-1.5 py-0.2 rounded backdrop-blur">
              YOU
            </div>
          </motion.div>

          {/* AI VISION SUMMARY BANNER */}
          {session.isAIVisionActive && session.aiVisionSummary && (
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-20 left-4 right-4 z-20 bg-black/75 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 text-xs text-white/90 shadow-2xl flex items-start gap-2.5"
            >
              <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-cyan-300 mr-1.5">Gemini Vision Copilot:</span>
                <span>{session.aiVisionSummary}</span>
              </div>
            </motion.div>
          )}

          {/* RECONNECTING ALERT */}
          {session.isReconnecting && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-amber-500/90 text-black text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
              <Radio size={14} className="animate-spin" />
              <span>Poor Connection • Reconnecting...</span>
            </div>
          )}
        </div>

        {/* TOP STATUS BAR OVERLAY */}
        <AnimatePresence>
          {isControlsVisible && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white truncate max-w-[120px]">{peer.name}</span>
                  <span className="text-xs font-mono text-cyan-400">{formatTimer(session.duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Network Quality */}
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10 text-xs text-white/80">
                  {session.networkQuality === 'poor' ? (
                    <WifiOff size={13} className="text-amber-400" />
                  ) : (
                    <Wifi size={13} className="text-emerald-400" />
                  )}
                  <span className="capitalize text-[10px] hidden sm:inline">{session.networkQuality}</span>
                </div>

                {/* PiP Button */}
                <button
                  onClick={handleRequestPiP}
                  className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white border border-white/10 transition-colors"
                  title="Picture-in-Picture"
                >
                  <Layers size={15} />
                </button>

                {/* Fit Mode */}
                <button
                  onClick={() => setFitMode(fitMode === 'cover' ? 'contain' : 'cover')}
                  className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white/80 hover:text-white border border-white/10 transition-colors"
                  title="Toggle Aspect Ratio"
                >
                  {fitMode === 'cover' ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM CONTROLS OVERLAY */}
        <AnimatePresence>
          {isControlsVisible && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center justify-center gap-4 z-30 pointer-events-auto"
            >
              {/* AUDIO ROUTE SELECTOR MENU */}
              {showAudioMenu && (
                <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 mb-2 shadow-2xl flex items-center gap-2">
                  {[
                    { id: 'speaker', label: 'Speaker', icon: Volume2 },
                    { id: 'earpiece', label: 'Earpiece', icon: Smartphone },
                    { id: 'bluetooth', label: 'Bluetooth', icon: Bluetooth },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAudioRoute(item.id as any);
                        setShowAudioMenu(false);
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors',
                        audioRoute === item.id
                          ? 'bg-cyan-500 text-black'
                          : 'text-white/80 hover:bg-white/10'
                      )}
                    >
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* PRIMARY ACTION BUTTONS */}
              <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
                {/* Mute Mic */}
                <button
                  onClick={onToggleMic}
                  className={cn(
                    'w-13 h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 border',
                    session.isMicMuted
                      ? 'bg-red-500/25 text-red-400 border-red-500/40'
                      : 'bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border-white/15'
                  )}
                  title={session.isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                >
                  {session.isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Camera Toggle */}
                <button
                  onClick={onToggleVideo}
                  className={cn(
                    'w-13 h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 border',
                    !session.isVideoEnabled
                      ? 'bg-red-500/25 text-red-400 border-red-500/40'
                      : 'bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border-white/15'
                  )}
                  title={session.isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {!session.isVideoEnabled ? <VideoOff size={20} /> : <Video size={20} />}
                </button>

                {/* Flip Camera */}
                <button
                  onClick={onFlipCamera}
                  className="w-13 h-13 rounded-2xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/15 flex items-center justify-center transition-all active:scale-90"
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera size={20} />
                </button>

                {/* Audio Route */}
                <button
                  onClick={() => setShowAudioMenu(!showAudioMenu)}
                  className="w-13 h-13 rounded-2xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 border border-white/15 flex items-center justify-center transition-all active:scale-90"
                  title="Audio Route"
                >
                  {audioRoute === 'bluetooth' ? (
                    <Bluetooth size={20} />
                  ) : audioRoute === 'earpiece' ? (
                    <Smartphone size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>

                {/* Gemini AI Vision Copilot */}
                <button
                  onClick={handleVisionToggle}
                  className={cn(
                    'w-13 h-13 rounded-2xl flex items-center justify-center transition-all active:scale-90 border',
                    session.isAIVisionActive
                      ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-black border-cyan-400 shadow-lg shadow-cyan-500/30'
                      : 'bg-black/60 backdrop-blur-md text-cyan-400 hover:bg-black/80 border-cyan-500/30'
                  )}
                  title="Gemini AI Vision Copilot"
                >
                  <Eye size={20} className={session.isAIVisionActive ? 'animate-pulse' : ''} />
                </button>

                {/* RED END CALL BUTTON */}
                <button
                  onClick={onEndCall}
                  className="w-16 h-16 rounded-3xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transition-all hover:scale-105 active:scale-90 cursor-pointer"
                  title="End Call"
                >
                  <PhoneOff size={26} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
