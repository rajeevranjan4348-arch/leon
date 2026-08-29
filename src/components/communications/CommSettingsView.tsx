import React, { useState, useEffect } from 'react';
import {
  Mic,
  Video,
  Volume2,
  Bell,
  Vibrate,
  ShieldCheck,
  Smartphone,
  Moon,
  Sun,
  User,
  Check,
  Radio,
  Sparkles,
} from 'lucide-react';
import { CommUser } from '@/types/comm';
import {
  playMessageNotificationSound,
  startIncomingRingtone,
  stopRingtone,
  triggerHapticVibrate,
} from '@/lib/comm/ringtoneService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CommSettingsViewProps {
  currentUser: CommUser;
  onUpdateUser: (updated: Partial<CommUser>) => void;
}

export const CommSettingsView: React.FC<CommSettingsViewProps> = ({
  currentUser,
  onUpdateUser,
}) => {
  const [userName, setUserName] = useState(currentUser.name);
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage || 'Available');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [camPermission, setCamPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [isPlayingRingtone, setIsPlayingRingtone] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'oled' | 'light'>('dark');

  // Enumerate devices & check permissions
  useEffect(() => {
    const checkDevices = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
          setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        }
      } catch (e) {
        console.warn('Device enumeration error:', e);
      }
    };
    checkDevices();

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then((p) => {
        setMicPermission(p.state as any);
        p.onchange = () => setMicPermission(p.state as any);
      }).catch(() => {});

      navigator.permissions.query({ name: 'camera' as any }).then((p) => {
        setCamPermission(p.state as any);
        p.onchange = () => setCamPermission(p.state as any);
      }).catch(() => {});
    }
  }, []);

  const handleRequestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
      setCamPermission('granted');
      toast.success('Microphone & Camera permissions granted');
    } catch (e: any) {
      toast.error('Permission request failed: ' + e.message);
    }
  };

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Notifications not supported in this browser');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      new Notification('Rishi Mobile Communications', {
        body: 'Push notifications are active for incoming calls & chats!',
      });
      toast.success('Push notifications enabled');
    }
  };

  const handleTestVibration = () => {
    triggerHapticVibrate([200, 100, 200, 100, 400]);
    toast.info('Triggered haptic vibration pattern');
  };

  const handleToggleRingtoneTest = () => {
    if (isPlayingRingtone) {
      stopRingtone();
      setIsPlayingRingtone(false);
    } else {
      startIncomingRingtone();
      setIsPlayingRingtone(true);
      setTimeout(() => {
        stopRingtone();
        setIsPlayingRingtone(false);
      }, 5000);
    }
  };

  const handleSaveProfile = () => {
    onUpdateUser({ name: userName, statusMessage });
    toast.success('Profile updated successfully');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-2xl mx-auto w-full select-none text-white font-sans scrollbar-thin">
      {/* PROFILE CARD */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-md border-2 border-white/20">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name[0]
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-zinc-950" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{currentUser.name}</h3>
            <p className="text-xs text-white/50">{currentUser.email || 'Mobile Account'}</p>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
              ● Online & Ready
            </span>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-white/5">
          <div>
            <label className="text-xs text-white/60 block mb-1">Display Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2 bg-black/40 rounded-xl text-xs text-white border border-white/10 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 block mb-1">Status Message</label>
            <input
              type="text"
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="e.g. In a meeting / Available"
              className="w-full px-3.5 py-2 bg-black/40 rounded-xl text-xs text-white border border-white/10 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* HARDWARE & MEDIA PERMISSIONS */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-cyan-400" />
          <span>Device Permissions & Hardware</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mic size={16} className="text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">Microphone</div>
                <div className="text-[10px] text-white/50 capitalize">{micPermission}</div>
              </div>
            </div>
            {micPermission === 'granted' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            ) : (
              <button
                onClick={handleRequestPermissions}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-bold"
              >
                Allow
              </button>
            )}
          </div>

          <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video size={16} className="text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-white">Camera</div>
                <div className="text-[10px] text-white/50 capitalize">{camPermission}</div>
              </div>
            </div>
            {camPermission === 'granted' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            ) : (
              <button
                onClick={handleRequestPermissions}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-bold"
              >
                Allow
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS & CALL SOUNDS */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={15} className="text-amber-400" />
          <span>Push Notifications & Ringtones</span>
        </h4>

        <div className="space-y-3">
          <div className="p-3.5 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Mobile Push Notifications</div>
              <div className="text-[10px] text-white/50">Alerts for incoming calls & background messages</div>
            </div>
            {notifPermission === 'granted' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                ACTIVE
              </span>
            ) : (
              <button
                onClick={handleRequestNotifications}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold transition-all active:scale-95"
              >
                Enable
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleToggleRingtoneTest}
              className={cn(
                'p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 cursor-pointer',
                isPlayingRingtone
                  ? 'bg-red-500/20 border-red-500/30 text-red-400'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
              )}
            >
              <Volume2 size={15} />
              <span>{isPlayingRingtone ? 'Stop Ringtone' : 'Test Ringtone'}</span>
            </button>

            <button
              onClick={handleTestVibration}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Vibrate size={15} />
              <span>Test Haptics</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
