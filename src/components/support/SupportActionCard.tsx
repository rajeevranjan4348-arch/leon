import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Wrench,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  User,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface BookingCardData {
  service?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  confirmationCode?: string;
  status?: 'confirmed' | 'pending' | 'in_progress' | 'cancelled';
  notes?: string;
}

export interface TroubleshootCardData {
  issueTitle?: string;
  category?: string;
  currentStep?: number;
  totalSteps?: number;
  stepsCompleted?: string[];
  status?: 'diagnosing' | 'in_progress' | 'resolved' | 'escalated';
  ticketId?: string;
}

interface SupportActionCardProps {
  bookingData?: BookingCardData;
  troubleshootData?: TroubleshootCardData;
  onQuickAction?: (actionText: string) => void;
  className?: string;
}

export const SupportActionCard: React.FC<SupportActionCardProps> = ({
  bookingData,
  troubleshootData,
  onQuickAction,
  className,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(
    troubleshootData?.currentStep ? troubleshootData.currentStep - 1 : 0
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Copied code ${code} to clipboard`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadICS = () => {
    if (!bookingData) return;
    const title = bookingData.service || 'Scheduled Service Appointment';
    const dateStr = bookingData.date || 'Tomorrow';
    const timeStr = bookingData.time || '10:00 AM';
    const code = bookingData.confirmationCode || 'BK-1001';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Gemini Support & Booking//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `SUMMARY:${title} (${code})`,
      `DESCRIPTION:Appointment confirmed via Gemini Support AI. Code: ${code}. Notes: ${bookingData.notes || 'N/A'}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointment-${code}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Calendar (.ics) invite downloaded');
  };

  if (!bookingData && !troubleshootData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('my-4 w-full max-w-xl', className)}
    >
      {/* ── Booking Ticket Card ── */}
      {bookingData && (
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#1c132b]/95 via-[#151726]/95 to-[#0f111a]/95 p-5 shadow-xl backdrop-blur-xl">
          {/* Subtle Top Glow Accent */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Calendar size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    {bookingData.status === 'confirmed' ? 'Appointment Confirmed' : 'Service Booking Details'}
                  </h4>
                  {bookingData.status === 'confirmed' && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={11} />
                      CONFIRMED
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/50">{bookingData.service || 'Consultation Session'}</p>
              </div>
            </div>

            {bookingData.confirmationCode && (
              <button
                onClick={() => handleCopyCode(bookingData.confirmationCode!)}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-mono font-medium text-purple-300 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                title="Copy confirmation code"
              >
                <span>#{bookingData.confirmationCode}</span>
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            )}
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3 py-3.5 sm:grid-cols-3">
            {bookingData.date && (
              <div className="rounded-xl bg-white/5 p-2.5 border border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-0.5">
                  <Calendar size={13} className="text-purple-400" />
                  Date
                </div>
                <div className="text-xs font-semibold text-white/90 truncate">{bookingData.date}</div>
              </div>
            )}

            {bookingData.time && (
              <div className="rounded-xl bg-white/5 p-2.5 border border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-0.5">
                  <Clock size={13} className="text-purple-400" />
                  Time Slot
                </div>
                <div className="text-xs font-semibold text-white/90 truncate">{bookingData.time}</div>
              </div>
            )}

            {(bookingData.customerName || bookingData.customerEmail) && (
              <div className="col-span-2 sm:col-span-1 rounded-xl bg-white/5 p-2.5 border border-white/5">
                <div className="flex items-center gap-1.5 text-[11px] text-white/50 mb-0.5">
                  <User size={13} className="text-purple-400" />
                  Attendee
                </div>
                <div className="text-xs font-semibold text-white/90 truncate">
                  {bookingData.customerName || bookingData.customerEmail}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            {bookingData.status === 'confirmed' && (
              <button
                onClick={handleDownloadICS}
                className="flex items-center gap-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 px-3 py-1.5 text-xs font-semibold text-purple-200 border border-purple-500/40 transition-colors cursor-pointer shadow-sm"
              >
                <Download size={13} />
                <span>Save to Calendar (.ics)</span>
              </button>
            )}

            {onQuickAction && (
              <>
                <button
                  onClick={() => onQuickAction(`Reschedule my appointment #${bookingData.confirmationCode || ''}`)}
                  className="rounded-xl bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => onQuickAction(`Cancel my booking #${bookingData.confirmationCode || ''}`)}
                  className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors cursor-pointer border border-rose-500/20"
                >
                  Cancel Booking
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Troubleshoot Diagnostic Card ── */}
      {troubleshootData && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0e1926]/95 via-[#131722]/95 to-[#0b0e14]/95 p-5 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Wrench size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  {troubleshootData.issueTitle || 'Diagnostic Troubleshooting'}
                  {troubleshootData.status === 'resolved' ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <CheckCircle2 size={11} /> RESOLVED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                      STEP {troubleshootData.currentStep || 1} OF {troubleshootData.totalSteps || 3}
                    </span>
                  )}
                </h4>
                <p className="text-xs text-white/50">Guided step-by-step resolution</p>
              </div>
            </div>

            {troubleshootData.ticketId && (
              <span className="text-[11px] font-mono text-white/40">#{troubleshootData.ticketId}</span>
            )}
          </div>

          {/* Step Progress Bar */}
          <div className="mt-3">
            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((troubleshootData.currentStep || 1) / (troubleshootData.totalSteps || 3)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Diagnostic Actions */}
          {onQuickAction && (
            <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-white/10">
              <button
                onClick={() => onQuickAction('This step fixed my issue! Mark as resolved.')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 px-3 py-1.5 text-xs font-semibold text-emerald-200 border border-emerald-500/40 transition-colors cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Issue Resolved</span>
              </button>

              <button
                onClick={() => onQuickAction('That step did not work, please show the next troubleshooting step.')}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
              >
                <ChevronRight size={13} />
                <span>Try Next Step</span>
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
