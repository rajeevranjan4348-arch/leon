import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
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
  Check,
  X,
  RefreshCw,
  Lock,
  ListFilter,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  permissionManager,
  DevicePermissionItem,
  DevicePermissionKey,
  PermissionStatus,
  auditLogger,
  CommunicationAuditLog,
} from '@/lib/communicationAgent';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AIDevicePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIDevicePermissionsModal: React.FC<AIDevicePermissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'audit' | 'trusted'>('permissions');
  const [permissions, setPermissions] = useState<DevicePermissionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<CommunicationAuditLog[]>([]);

  const loadData = () => {
    setPermissions(permissionManager.getAllPermissions());
    setAuditLogs(auditLogger.getLogs());
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleToggle = (key: DevicePermissionKey, currentStatus: PermissionStatus) => {
    const nextStatus: PermissionStatus =
      currentStatus === 'allowed' || currentStatus === 'connected' ? 'denied' : 'allowed';
    permissionManager.setPermission(key, nextStatus);
    loadData();
    toast.success(`${key.toUpperCase()} permission set to ${nextStatus.toUpperCase()}`);
  };

  const handleRevokeAll = () => {
    permissionManager.revokeAll();
    loadData();
    toast.error('All AI device permissions revoked.');
  };

  const handleResetDefaults = () => {
    permissionManager.resetToDefaults();
    loadData();
    toast.success('Permissions reset to recommended defaults.');
  };

  const handleClearLogs = () => {
    auditLogger.clearLogs();
    setAuditLogs([]);
    toast.info('Audit logs cleared.');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 350,
              mass: 0.75,
            }}
            className="relative w-full max-w-2xl bg-[#121218]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white z-10 font-sans"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-900/20 via-black/40 to-emerald-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ShieldCheck size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    AI Device Permissions
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      SECURE SANDBOX
                    </span>
                  </h2>
                  <p className="text-xs text-white/60">
                    Granular permission controls for phone, messaging, and system features
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between px-6 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-2 py-2">
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    activeTab === 'permissions'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Lock size={14} />
                  Permissions ({permissions.length})
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    activeTab === 'audit'
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <ListFilter size={14} />
                  Security Audit Logs ({auditLogs.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'permissions' ? (
                  <button
                    onClick={handleResetDefaults}
                    className="text-[11px] text-white/50 hover:text-white flex items-center gap-1 transition-colors px-2 py-1"
                    title="Reset to defaults"
                  >
                    <RefreshCw size={12} />
                    Reset
                  </button>
                ) : (
                  <button
                    onClick={handleClearLogs}
                    className="text-[11px] text-red-400/80 hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-1"
                    title="Clear logs"
                  >
                    <Trash2 size={12} />
                    Clear Logs
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 sidebar-scrollbar">
              {activeTab === 'permissions' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-3">
                    <Shield size={18} className="text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed text-blue-200/90">
                      <strong className="text-blue-100 font-semibold block mb-0.5">
                        Zero-Bypass Security Guarantee
                      </strong>
                      The AI communication agent never performs background actions or sends messages
                      without explicit confirmation unless trusted auto-send is configured. Every
                      permission is independently revocable.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {permissions.map((perm) => {
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

                            <button
                              id={`modal-perm-toggle-${perm.id}`}
                              onClick={() => handleToggle(perm.id, perm.status)}
                              className={cn(
                                'w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400/50',
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
                                className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
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

                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/40">
                      Changes apply instantly to voice and chat agents
                    </span>
                    <button
                      onClick={handleRevokeAll}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-all cursor-pointer"
                    >
                      Revoke All Permissions
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="space-y-2.5">
                  {auditLogs.length === 0 ? (
                    <div className="py-12 text-center text-white/40 text-xs italic">
                      No security audit events recorded yet.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white truncate">{log.summary}</span>
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase',
                                log.status === 'success'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : log.status === 'failed'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                  : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'
                              )}
                            >
                              {log.status}
                            </span>
                          </div>
                          {log.details && (
                            <div className="text-[11px] text-white/50 truncate">{log.details}</div>
                          )}
                          <div className="text-[10px] text-white/40">
                            {new Date(log.timestamp).toLocaleTimeString()} • Checked:{' '}
                            {log.permissionChecked.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Shield size={14} className="text-emerald-400" />
                <span>Protected by Gemini-Style AI Device Security Layer</span>
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-xs shadow-lg transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
