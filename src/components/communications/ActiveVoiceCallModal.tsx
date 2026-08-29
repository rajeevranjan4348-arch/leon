import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Wifi,
  WifiOff,
  Headphones,
  User,
} from 'lucide-react';
import { CallSession, CommUser } from '@/types/comm';
import { MicrophoneWaveVisualizer } from '@/components/research/MicrophoneWaveVisualizer';
import { cn } from '@/lib/utils';

interface ActiveVoiceCallModalProps {
  session: CallSession | null;
  currentUser: CommUser;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onToggleMic: () => void;
  onEndCall: () => void;
}

export const ActiveVoiceCallModal: React.FC<ActiveVoiceCallModalProps> = ({
  session,
  currentUser,
  localStream,
  remoteStream,
  onToggleMic,
  onEndCall,
}) => {
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Play remote audio
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Load available audio devices (Bluetooth, headphones, speaker)
  useEffect(() => {
    async function loadDevices() {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const outputs = devices.filter((d) => d.kind === 'audiooutput');
          setAudioDevices(outputs);
          if (outputs[0]) setSelectedDeviceId(outputs[0].deviceId);
        }
      } catch (e) {
        console.warn('Error loading audio devices:', e);
      }
    }
    loadDevices();
  }, []);

  if (!session || session.type !== 'voice') return null;

  const peer = session.caller.id === currentUser.id ? session.receiver : session.caller;
  const isConnected = session.status === 'connected';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = () => {
    if (session.isReconnecting) return 'Reconnecting audio stream...';
    switch (session.status) {
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'HD Voice Connected';
      case 'ended':
        return 'Call Ended';
      case 'rejected':
        return 'Call Declined';
      default:
        return 'Connecting...';
    }
  };

  const handleDeviceSelect = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowDevicePicker(false);
    if (remoteAudioRef.current && 'setSinkId' in remoteAudioRef.current) {
      try {
        await (remoteAudioRef.current as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('setSinkId error:', e);
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex flex-col justify-between bg-[#08080c] text-white font-sans select-none overflow-hidden h-[100dvh] w-full"
      >
        {/* Hidden Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Top Header */}
        <header className="h-16 px-6 pt-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-white tracking-tight">{peer.name}</span>
              <div className="flex items-center gap-1.5 text-xs text-white/60">
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

          {/* Network Quality Badge & Bluetooth picker */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70">
              {session.networkQuality === 'poor' || session.isReconnecting ? (
                <WifiOff size={13} className="text-amber-400 animate-pulse" />
              ) : (
                <Wifi size={13} className="text-emerald-400" />
              )}
              <span className="capitalize">{session.networkQuality}</span>
            </div>

            {audioDevices.length > 0 && (
              <button
                onClick={() => setShowDevicePicker(!showDevicePicker)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                title="Select Audio Device"
              >
                <Headphones size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Device Picker Popup */}
        {showDevicePicker && (
          <div className="absolute top-16 right-6 z-30 w-56 rounded-2xl bg-zinc-900 border border-white/15 p-2 shadow-2xl">
            <span className="text-[11px] font-semibold text-white/50 px-3 py-1 block">Audio Output</span>
            {audioDevices.map((d) => (
              <button
                key={d.deviceId}
                onClick={() => handleDeviceSelect(d.deviceId)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-xl transition-colors truncate',
                  selectedDeviceId === d.deviceId ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'text-white/80 hover:bg-white/5'
                )}
              >
                {d.label || `Device ${d.deviceId.substring(0, 5)}`}
              </button>
            ))}
          </div>
        )}

        {/* Center Area: Large Circular Avatar & Dynamic Audio Waves */}
        <main className="relative flex-1 flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto">
          {/* Outer Wave Rings */}
          <div className="relative flex items-center justify-center my-auto">
            {/* Ambient Background Glow */}
            <motion.div
              animate={{
                scale: isConnected && !session.isMicMuted ? [1, 1.25, 1] : [1, 1.05, 1],
                opacity: isConnected ? [0.35, 0.65, 0.35] : [0.15, 0.25, 0.15],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full blur-3xl bg-cyan-500/30 pointer-events-none transform-gpu"
            />

            {/* Concentric Animated Wave Rings */}
            {isConnected && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.45, 1.8], opacity: [0.65, 0.25, 0] }}
                  transition={{ duration: 2.0, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border border-cyan-400/40 shadow-[0_0_24px_rgba(34,211,238,0.25)] pointer-events-none"
                />
                <motion.div
                  animate={{ scale: [1, 1.38, 1.68], opacity: [0.55, 0.2, 0] }}
                  transition={{ duration: 2.0, repeat: Infinity, delay: 0.65, ease: 'easeOut' }}
                  className="absolute w-48 h-48 md:w-56 md:h-56 rounded-full border border-indigo-400/45 pointer-events-none"
                />
              </>
            )}

            {/* Large Circular Avatar Core */}
            <motion.div
              animate={{ scale: isConnected ? [1, 1.04, 1] : 1 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className={cn(
                'relative w-44 h-44 md:w-52 md:h-52 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl z-10 border border-white/20 overflow-hidden',
                isConnected && 'shadow-[0_0_55px_rgba(34,211,238,0.4)] border-cyan-400/40',
                session.isMicMuted && 'border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
              )}
              style={{
                background: 'radial-gradient(circle at 35% 30%, #2e2f38 0%, #17181e 50%, #0a0b0e 100%)',
              }}
            >
              {peer.avatar ? (
                <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-white/60" />
              )}

              {/* Dynamic Wave Overlay inside Avatar */}
              {isConnected && !session.isMicMuted && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-3">
                  <MicrophoneWaveVisualizer isActive={true} isMuted={false} className="w-full h-24" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Status Display */}
          <div className="mt-8 flex flex-col items-center text-center max-w-sm px-4">
            <motion.div
              layout
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/90 shadow-md backdrop-blur-md"
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400 animate-ping'
                )}
              />
              <span className="tracking-wide">{getStatusDisplay()}</span>
            </motion.div>
          </div>
        </main>

        {/* Bottom Controls Bar */}
        <motion.footer
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 pb-12 pt-4 flex items-center justify-center gap-8 shrink-0 z-20 max-w-md mx-auto w-full"
        >
          {/* Mute Mic */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              id="voiceCallMuteBtn"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={onToggleMic}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-md',
                session.isMicMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              )}
              title={session.isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {session.isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </motion.button>
            <span className="text-[11px] font-medium text-white/60">{session.isMicMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              id="voiceCallEndBtn"
              whileHover={{ scale: 1.12, y: -3 }}
              whileTap={{ scale: 0.9 }}
              onClick={onEndCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xl shadow-red-600/40"
              title="End Call"
            >
              <PhoneOff size={26} />
            </motion.button>
            <span className="text-[11px] font-medium text-white/80">End Call</span>
          </div>

          {/* Speaker Mute */}
          <div className="flex flex-col items-center gap-2">
            <motion.button
              id="voiceCallSpeakerBtn"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setIsSpeakerMuted(!isSpeakerMuted);
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.muted = !isSpeakerMuted;
                }
              }}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-md',
                isSpeakerMuted
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              )}
              title={isSpeakerMuted ? 'Unmute Audio Output' : 'Mute Audio Output'}
            >
              {isSpeakerMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </motion.button>
            <span className="text-[11px] font-medium text-white/60">Speaker</span>
          </div>
        </motion.footer>
      </motion.div>
    </AnimatePresence>
  );
};
