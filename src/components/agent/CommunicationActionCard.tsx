import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Smartphone,
  Phone,
  PhoneCall,
  Video,
  Send,
  Check,
  X,
  Edit2,
  AlertCircle,
  ExternalLink,
  Users,
  MapPin,
  Clock,
  Bell,
  Calendar,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Square,
  Settings,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import {
  CommunicationToolType,
  ActionStatusType,
  ContactRecord,
  DisambiguationChoice,
} from '@/lib/communicationAgent/types';
import { actionToolRegistry } from '@/lib/communicationAgent/actionToolRegistry';
import { permissionManager } from '@/lib/communicationAgent/permissionManager';
import { androidControlEngine } from '@/lib/androidControl/AndroidControlEngine';
import { androidControlBridge } from '@/lib/androidControl/AndroidControlBridge';
import { AndroidControlStepLog, AndroidControlState } from '@/lib/androidControl/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CommunicationActionCardProps {
  toolType?: CommunicationToolType | string;
  recipientName?: string;
  recipientPhone?: string;
  payloadText?: string;
  actionUrl?: string;
  needsDisambiguation?: boolean;
  disambiguationChoices?: DisambiguationChoice[];
  onActionComplete?: () => void;
}

export const CommunicationActionCard: React.FC<CommunicationActionCardProps> = ({
  toolType = 'send_whatsapp',
  recipientName: initialRecipient = 'Contact',
  recipientPhone: initialPhone = '',
  payloadText: initialPayload = '',
  actionUrl,
  needsDisambiguation = false,
  disambiguationChoices = [],
  onActionComplete,
}) => {
  const [recipientName, setRecipientName] = useState(initialRecipient);
  const [recipientPhone, setRecipientPhone] = useState(initialPhone);
  const [messageText, setMessageText] = useState(initialPayload);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<ActionStatusType>('waiting_confirmation');
  const [controlState, setControlState] = useState<AndroidControlState>('WAITING_FOR_CONFIRMATION');
  const [currentStepLog, setCurrentStepLog] = useState<string>('Ready for user confirmation');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDisambiguation, setSelectedDisambiguation] = useState<ContactRecord | null>(null);
  const [accessibilityStatus, setAccessibilityStatus] = useState(androidControlBridge.getStatus());

  // Normalize tool type
  const normTool = (toolType || 'send_whatsapp') as CommunicationToolType;

  const isWhatsApp = normTool === 'send_whatsapp' || normTool === 'open_whatsapp_chat' || normTool === 'start_whatsapp_call';
  const isSMS = normTool === 'send_sms' || normTool === 'open_messages';
  const isCall = normTool === 'start_phone_call' || normTool === 'start_whatsapp_call';
  const isMaps = normTool === 'open_maps';
  const isReminder = normTool === 'create_reminder';
  const isAlarm = normTool === 'set_alarm';
  const isCalendar = normTool === 'create_calendar_event';
  const isApp = normTool === 'open_app';
  const isAndroidControl = normTool === 'android_control' || isWhatsApp || isSMS;

  // Auto-execute open_app immediately without requiring manual confirmation or accessibility blocking
  useEffect(() => {
    if (normTool === 'open_app' && status === 'waiting_confirmation') {
      try {
        const result = actionToolRegistry.openApp(recipientName);
        if (result.success) {
          setStatus('completed');
          if (onActionComplete) onActionComplete();
        } else {
          setStatus('failed');
          setErrorMessage(result.message || `"${recipientName}" is not installed on this device.`);
        }
      } catch (err: any) {
        setStatus('failed');
        setErrorMessage(err?.message || `Could not launch ${recipientName}`);
      }
    }
  }, [normTool, recipientName, onActionComplete]);

  useEffect(() => {
    const unsub = androidControlEngine.subscribeProgress((log, state) => {
      setControlState(state);
      setCurrentStepLog(log.title + (log.detail ? `: ${log.detail}` : ''));
      if (state === 'SENDING' || state === 'VERIFYING') {
        setStatus('executing');
      } else if (state === 'COMPLETED') {
        setStatus('completed');
      } else if (state === 'ACTION_CANCELLED' || state === 'PERMISSION_DENIED' || state === 'FAILED') {
        setStatus('failed');
        setErrorMessage(log.detail || log.title);
      }
    });

    return () => unsub();
  }, []);

  const handleSelectContact = (choice: DisambiguationChoice) => {
    setSelectedDisambiguation(choice.contact);
    setRecipientName(choice.contact.displayName);
    setRecipientPhone(choice.contact.phone);
    setStatus('waiting_confirmation');
    toast.success(`Selected ${choice.contact.displayName}`);
  };

  const handleExecute = async () => {
    setStatus('executing');
    setErrorMessage(null);

    // Check accessibility status only for automated UI messaging
    const requiresAccessibility = normTool === 'send_whatsapp' || (isAndroidControl && !isSMS && !isCall && !isApp && !isMaps);
    const bridgeState = androidControlBridge.getStatus();
    if (requiresAccessibility && !bridgeState.isAccessibilityEnabled) {
      setStatus('failed');
      setErrorMessage('Android Control requires Accessibility permission. Please enable it in Settings.');
      return;
    }

    try {
      let result;
      if (normTool === 'send_whatsapp' || (isAndroidControl && !isSMS && !isCall)) {
        const sendRes = await androidControlEngine.executeSendAction(
          recipientName,
          messageText,
          'whatsapp',
          recipientPhone
        );
        result = {
          success: sendRes.success,
          message: sendRes.humanResponse,
        };
      } else if (normTool === 'start_whatsapp_call') {
        result = actionToolRegistry.startWhatsAppCall(recipientName);
      } else if (normTool === 'send_sms') {
        const sendRes = await androidControlEngine.executeSendAction(
          recipientName,
          messageText,
          'sms',
          recipientPhone
        );
        result = {
          success: sendRes.success,
          message: sendRes.humanResponse,
        };
      } else if (normTool === 'start_phone_call') {
        result = actionToolRegistry.startPhoneCall(recipientName);
      } else if (normTool === 'open_messages') {
        result = actionToolRegistry.openMessages(recipientName);
      } else if (normTool === 'open_maps') {
        result = actionToolRegistry.openMaps(recipientName || messageText || 'Destination');
      } else if (normTool === 'create_reminder') {
        result = actionToolRegistry.createReminder(messageText || recipientName);
      } else if (normTool === 'set_alarm') {
        result = actionToolRegistry.setAlarm(messageText || '6:00 AM');
      } else if (normTool === 'create_calendar_event') {
        result = actionToolRegistry.createCalendarEvent(messageText || recipientName);
      } else if (normTool === 'open_app') {
        result = actionToolRegistry.openApp(recipientName);
      } else {
        result = actionToolRegistry.sendWhatsAppMessage(recipientName, messageText);
      }

      if (result.success) {
        setStatus('completed');
        toast.success(`Action executed: ${result.message}`);
        if (onActionComplete) onActionComplete();
      } else {
        setStatus('failed');
        setErrorMessage(result.message || 'Action could not be completed.');
      }
    } catch (err: any) {
      setStatus('failed');
      setErrorMessage(err?.message || 'Execution error');
    }
  };

  const handleCancel = () => {
    androidControlEngine.cancel();
    setStatus('failed');
    setErrorMessage('Action cancelled by user.');
    toast.info('Messaging action cancelled.');
  };

  const handleToggleAccessibility = () => {
    const nextState = !accessibilityStatus.isAccessibilityEnabled;
    androidControlBridge.setSimulatedAccessibility(nextState);
    const updated = androidControlBridge.getStatus();
    setAccessibilityStatus(updated);
    if (nextState) {
      toast.success('Android Control accessibility service enabled.');
    } else {
      toast.info('Android Control accessibility service paused.');
    }
  };

  const getHeaderIcon = () => {
    if (isWhatsApp) return <Smartphone size={18} className="text-[#25d366]" />;
    if (isSMS) return <MessageSquare size={18} className="text-indigo-400" />;
    if (isCall) return <PhoneCall size={18} className="text-emerald-400" />;
    if (isMaps) return <MapPin size={18} className="text-rose-400" />;
    if (isReminder) return <Bell size={18} className="text-amber-400" />;
    if (isAlarm) return <Clock size={18} className="text-sky-400" />;
    if (isCalendar) return <Calendar size={18} className="text-purple-400" />;
    return <Sparkles size={18} className="text-blue-400" />;
  };

  const getHeaderTitle = () => {
    if (isWhatsApp) return 'Android Control • WhatsApp';
    if (isSMS) return 'Android Control • SMS';
    if (normTool === ('start_phone_call' as CommunicationToolType)) return 'Phone Call Direct';
    if (normTool === ('start_whatsapp_call' as CommunicationToolType)) return 'WhatsApp Voice Call';
    if (isMaps) return 'Google Maps Navigation';
    if (isReminder) return 'Device Reminder';
    if (isAlarm) return 'Device Alarm';
    if (isCalendar) return 'Calendar Event';
    if (isApp) return 'Device App Launch';
    return 'Android Control Agent';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="my-3 rounded-2xl bg-gradient-to-br from-[#12121c] via-[#161622] to-[#1a1a2e] border border-white/15 p-4 shadow-2xl text-white max-w-lg w-full overflow-hidden font-sans select-none backdrop-blur-xl"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-md">
            {getHeaderIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-wide text-white">
                {getHeaderTitle()}
              </span>
              <span
                className={cn(
                  'text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase tracking-wider',
                  status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : status === 'executing'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse'
                    : status === 'failed'
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                )}
              >
                {status === 'waiting_confirmation' ? 'Pending Approval' : status}
              </span>
            </div>
            <p className="text-[10px] text-white/50">
              {accessibilityStatus.isAccessibilityEnabled
                ? 'Accessibility Service Active'
                : 'Accessibility Service Paused'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5" title="Android Control Safety Guard">
          <button
            onClick={handleToggleAccessibility}
            className={cn(
              'p-1.5 rounded-lg border text-[10px] flex items-center gap-1 transition-colors cursor-pointer',
              accessibilityStatus.isAccessibilityEnabled
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            )}
            title="Toggle Accessibility Service"
          >
            <ShieldCheck size={14} />
            <span className="text-[9px] font-medium hidden sm:inline">
              {accessibilityStatus.isAccessibilityEnabled ? 'Protected' : 'Service Off'}
            </span>
          </button>
        </div>
      </div>

      {/* Disambiguation Mode: "Which Rahul?" */}
      {needsDisambiguation && !selectedDisambiguation && disambiguationChoices.length > 0 ? (
        <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl space-y-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-200">
            <Users size={15} className="text-blue-400" />
            <span>Multiple contacts match "{recipientName}". Which one?</span>
          </div>
          <div className="space-y-1.5 pt-1">
            {disambiguationChoices.map((choice) => (
              <button
                key={choice.contact.id}
                onClick={() => handleSelectContact(choice)}
                className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/40 flex items-center justify-between text-xs transition-all cursor-pointer"
              >
                <div>
                  <span className="font-semibold text-white block">
                    {choice.contact.displayName}
                  </span>
                  <span className="text-[10.5px] text-white/50">
                    {choice.distinguishingDetail}
                  </span>
                </div>
                <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Standard Contact & Payload Display */
        <div className="space-y-3">
          {/* Target / Recipient Card */}
          {(recipientName || recipientPhone) && (
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {recipientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">
                    {recipientName}
                  </span>
                  {recipientPhone ? (
                    <span className="text-[10.5px] text-white/50 block truncate">
                      {recipientPhone}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400/80">Default Contact</span>
                  )}
                </div>
              </div>

              {isCall && recipientPhone && (
                <a
                  href={`tel:${recipientPhone.replace(/[^0-9+]/g, '')}`}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 border border-emerald-500/30 transition-colors"
                >
                  <Phone size={12} /> Call Direct
                </a>
              )}
            </div>
          )}

          {/* Message / Payload Box */}
          {messageText && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-white/60 px-1">
                <span>{isMaps ? 'Destination / Query:' : 'Message Content:'}</span>
                {status === 'waiting_confirmation' && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 size={11} /> {isEditing ? 'Done' : 'Edit'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-black/40 text-white text-xs rounded-xl p-2.5 border border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none h-18"
                />
              ) : (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-white/90 leading-relaxed font-mono">
                  "{messageText}"
                </div>
              )}
            </div>
          )}

          {/* Error Reason Display */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-2 text-xs text-red-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <span className="font-semibold block text-red-200">Execution Notice:</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Real-time Automation Step Tracker */}
          {status === 'executing' && (
            <div className="p-2 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs text-blue-200 flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin text-blue-400 shrink-0" />
              <span className="text-[11px] font-mono truncate">{currentStepLog}</span>
            </div>
          )}

          {/* Action Status Lifecycle Tracker */}
          <div className="pt-1 flex items-center justify-between text-[10.5px] text-white/40">
            <span>
              {status === 'waiting_confirmation' && 'Waiting for explicit confirmation...'}
              {status === 'executing' && (isApp ? 'Opening application...' : 'Android Control executing UI automation...')}
              {status === 'completed' && (isApp ? 'App launched successfully ✓' : isCall ? 'Call placed successfully ✓' : 'Message delivered via Android Control ✓')}
              {status === 'failed' && (isApp ? 'App not installed or launch failed' : 'Action terminated')}
            </span>

            <span className="text-white/30">Android Node Automation</span>
          </div>

          {/* Interactive Footer Controls */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
            {status === 'waiting_confirmation' && (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecute}
                  className={cn(
                    'px-4 py-1.5 rounded-xl text-xs font-semibold text-white shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95',
                    isWhatsApp
                      ? 'bg-[#25d366] hover:bg-[#20ba5a] text-black font-bold'
                      : isCall
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  )}
                >
                  {isCall ? (
                    <>
                      <Phone size={13} />
                      <span>Place Call</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Confirm & Send</span>
                    </>
                  )}
                </button>
              </>
            )}

            {status === 'executing' && (
              <button
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Square size={12} className="fill-red-400" />
                <span>Stop Action</span>
              </button>
            )}

            {status === 'completed' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check size={14} /> {isApp ? 'App Launched' : isCall ? 'Call Placed' : isMaps ? 'Location Opened' : 'Message Delivered'}
                </span>
                {isWhatsApp && (
                  <button
                    onClick={() => actionToolRegistry.sendWhatsAppMessage(recipientName, messageText)}
                    className="px-2.5 py-1 rounded-lg bg-[#25d366]/20 text-[#25d366] hover:bg-[#25d366]/30 text-[11px] font-semibold border border-[#25d366]/30 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink size={12} /> Open WhatsApp
                  </button>
                )}
              </div>
            )}

            {status === 'failed' && (
              <div className="flex items-center gap-2">
                {isApp && (
                  <button
                    onClick={() => {
                      const url = actionUrl || `https://play.google.com/store/search?q=${encodeURIComponent(recipientName)}&c=apps`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={12} /> Open Play Store
                  </button>
                )}
                <button
                  onClick={() => {
                    setStatus('waiting_confirmation');
                    setErrorMessage(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-semibold transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
