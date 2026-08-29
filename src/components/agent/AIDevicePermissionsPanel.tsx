import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Phone,
  MessageSquare,
  Users,
  Bell,
  Calendar,
  MapPin,
  Mic,
  Camera,
  Folder,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  permissionManager,
  DevicePermissionItem,
  DevicePermissionKey,
  PermissionStatus,
} from '@/lib/communicationAgent';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIDevicePermissionsPanelProps {
  className?: string;
  focusCoreOnly?: boolean; // When true, highlights Contacts, Phone, SMS, WhatsApp
  onOpenFullModal?: () => void;
}

export const AIDevicePermissionsPanel: React.FC<AIDevicePermissionsPanelProps> = ({
  className,
  focusCoreOnly = false,
  onOpenFullModal,
}) => {
  const [permissions, setPermissions] = useState<DevicePermissionItem[]>([]);

  const loadData = () => {
    setPermissions(permissionManager.getAllPermissions());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = (key: DevicePermissionKey, currentStatus: PermissionStatus) => {
    const nextStatus: PermissionStatus =
      currentStatus === 'allowed' || currentStatus === 'connected' ? 'denied' : 'allowed';
    permissionManager.setPermission(key, nextStatus);
    loadData();
    toast.success(`${key.toUpperCase()} permission set to ${nextStatus.toUpperCase()}`);
  };

  const handleResetDefaults = () => {
    permissionManager.resetToDefaults();
    loadData();
    toast.success('Permissions reset to recommended defaults.');
  };

  const getPermissionIcon = (key: DevicePermissionKey) => {
    switch (key) {
      case 'contacts':
        return <Users size={18} className="text-sky-400" />;
      case 'phone':
        return <Phone size={18} className="text-emerald-400" />;
      case 'sms':
        return <MessageSquare size={18} className="text-indigo-400" />;
      case 'whatsapp':
        return <Smartphone size={18} className="text-[#25d366]" />;
      case 'notifications':
        return <Bell size={18} className="text-amber-400" />;
      case 'calendar':
        return <Calendar size={18} className="text-rose-400" />;
      case 'location':
        return <MapPin size={18} className="text-red-400" />;
      case 'microphone':
        return <Mic size={18} className="text-cyan-400" />;
      case 'camera':
        return <Camera size={18} className="text-purple-400" />;
      case 'files':
        return <Folder size={18} className="text-teal-400" />;
      default:
        return <Shield size={18} className="text-blue-400" />;
    }
  };

  const getBadgeStyle = (status: PermissionStatus) => {
    switch (status) {
      case 'allowed':
      case 'connected':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'optional':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  // Core permissions as prioritized in the prompt requirements
  const coreKeys: DevicePermissionKey[] = ['contacts', 'phone', 'sms', 'whatsapp'];
  const displayedPermissions = focusCoreOnly
    ? permissions.filter((p) => coreKeys.includes(p.id))
    : permissions;

  return (
    <div
      className={cn(
        'rounded-3xl bg-[#121218]/90 border border-white/10 p-5 text-white font-sans shadow-xl backdrop-blur-md',
        className
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/30 to-emerald-500/30 border border-blue-500/30 flex items-center justify-center shadow-lg">
            <ShieldCheck size={22} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              AI Device Permissions
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SANDBOX
              </span>
            </h3>
            <p className="text-xs text-white/60">
              Manage Contacts, Phone, SMS, WhatsApp & OS hardware permissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/70 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset to defaults"
          >
            <RefreshCw size={12} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {onOpenFullModal && (
            <button
              onClick={onOpenFullModal}
              className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-[11px] font-semibold text-blue-300 transition-colors cursor-pointer"
            >
              All Controls
            </button>
          )}
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="my-4 p-3 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5">
        <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11.5px] leading-relaxed text-blue-200/90">
          <strong>Explicit User Confirmation:</strong> The AI Agent strictly adheres to granular device controls. Toggling a permission off immediately blocks the agent from initiating calls, messages, or looking up contacts.
        </p>
      </div>

      {/* Core Permission Switches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayedPermissions.map((perm) => {
          const isGranted = perm.status === 'allowed' || perm.status === 'connected';
          return (
            <div
              key={perm.id}
              className={cn(
                'p-3.5 rounded-2xl border transition-all flex flex-col justify-between',
                isGranted
                  ? 'bg-[#181822]/80 border-white/10 hover:border-white/20'
                  : 'bg-red-950/10 border-red-500/20 opacity-80'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getPermissionIcon(perm.id)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">
                      {perm.name}
                    </span>
                    <span
                      className={cn(
                        'inline-block px-1.5 py-0.2 rounded text-[9.5px] font-semibold border uppercase tracking-wider',
                        getBadgeStyle(perm.status)
                      )}
                    >
                      [{perm.status.toUpperCase()}]
                    </span>
                  </div>
                </div>

                {/* Animated Framer-Motion Toggle Switch */}
                <button
                  id={`perm-toggle-${perm.id}`}
                  onClick={() => handleToggle(perm.id, perm.status)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shadow-inner',
                    isGranted ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-zinc-700 hover:bg-zinc-600'
                  )}
                  aria-label={`Toggle ${perm.name} permission`}
                >
                  <motion.div
                    layout
                    initial={false}
                    animate={{
                      x: isGranted ? 24 : 0,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 600,
                      damping: 35,
                      mass: 0.8,
                    }}
                    className={cn(
                      'w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center'
                    )}
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: isGranted ? 1 : 0, opacity: isGranted ? 1 : 0 }}
                      transition={{ duration: 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-emerald-600"
                    />
                  </motion.div>
                </button>
              </div>

              <p className="text-[11.5px] text-white/60 leading-relaxed">
                {perm.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
