import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  User,
  Send,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Sparkles,
  Calendar,
  Wrench,
  CheckCircle2,
  Clock,
  ChevronRight,
  Copy,
  Check,
  Volume2,
  VolumeX,
  HelpCircle,
  Download,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  PhoneCall,
  CalendarDays,
  MessageSquare
} from 'lucide-react';
import {
  SupportAgentMessage,
  SupportBookingState,
  SupportTroubleshootState,
  getStoredSupportSession,
  saveSupportSession,
  clearSupportSession,
  sendSupportAgentMessage,
} from '@/lib/supportAgentService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeminiSupportChatbotProps {
  isOpen?: boolean;
  onClose?: () => void;
  isFloating?: boolean;
  initialMode?: 'general' | 'booking' | 'troubleshooting';
  className?: string;
}

export const GeminiSupportChatbot: React.FC<GeminiSupportChatbotProps> = ({
  isOpen = true,
  onClose,
  isFloating = false,
  initialMode = 'general',
  className,
}) => {
  const [session, setSession] = useState(() => getStoredSupportSession());
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showContextDetails, setShowContextDetails] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isLoading]);

  // Persist session to local storage on changes
  useEffect(() => {
    saveSupportSession(session);
  }, [session]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Handle TTS speech readout
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported on this browser');
      return;
    }

    if (isTTSActive) {
      window.speechSynthesis.cancel();
      setIsTTSActive(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/[*#_`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Choose high-quality voice if available
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
    if (friendlyVoice) utterance.voice = friendlyVoice;

    utterance.onend = () => setIsTTSActive(false);
    utterance.onerror = () => setIsTTSActive(false);

    window.speechSynthesis.speak(utterance);
    setIsTTSActive(true);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setInputMessage('');

    const userMsg: SupportAgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const updatedMessages = [...session.messages, userMsg];
    setSession(prev => ({
      ...prev,
      messages: updatedMessages,
      lastUpdated: Date.now(),
    }));

    setIsLoading(true);

    try {
      const result = await sendSupportAgentMessage({
        message: query,
        history: updatedMessages,
        activeBooking: session.activeBooking,
        activeTroubleshoot: session.activeTroubleshoot,
      });

      const assistantMsg: SupportAgentMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: Date.now(),
        bookingData: result.booking,
        troubleshootData: result.troubleshoot,
        quickReplies: result.quickReplies,
        sources: result.sources,
      };

      setSession(prev => ({
        ...prev,
        messages: [...updatedMessages, assistantMsg],
        activeBooking: result.booking || prev.activeBooking,
        activeTroubleshoot: result.troubleshoot || prev.activeTroubleshoot,
        lastUpdated: Date.now(),
      }));

      // Speak automatically if TTS was active
      if (isTTSActive) {
        speakText(result.text);
      }
    } catch (err: any) {
      toast.error('Failed to get response from Gemini Support');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsTTSActive(false);
    const fresh = clearSupportSession();
    setSession(fresh);
    toast.success('Support conversation and context reset');
  };

  const downloadCalendarFile = (booking?: SupportBookingState) => {
    if (!booking) return;
    const title = booking.service || 'Appointment Consultation';
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gemini Support Agent//EN
BEGIN:VEVENT
SUMMARY:${title}
DESCRIPTION:Service Booking with Gemini Support (Confirmation: ${booking.confirmationCode || 'BK-CONFIRMED'})
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `booking-${booking.confirmationCode || 'event'}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar file (.ics) downloaded');
  };

  if (!isOpen) return null;

  return (
    <div
      id="gemini-support-chatbot-container"
      className={cn(
        "flex flex-col bg-[#0f0f13]/95 backdrop-blur-2xl text-white border border-white/15 shadow-2xl overflow-hidden font-sans transition-all duration-300",
        isFloating
          ? isMaximized
            ? "fixed inset-4 sm:inset-8 z-50 rounded-3xl"
            : "fixed bottom-5 right-5 z-50 w-[95vw] sm:w-[460px] h-[640px] max-h-[88vh] rounded-3xl"
          : "w-full h-full rounded-2xl",
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-purple-900/40 via-blue-950/40 to-black/60 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 shrink-0">
            <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center">
              <Bot size={19} className="text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight truncate">
                Gemini Support
              </span>
              <span className="px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                3.7 Flash
              </span>
            </div>
            <span className="text-[11px] text-white/50 truncate flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Context-Aware Booking & Troubleshooting
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* TTS Speech Toggle */}
          <button
            onClick={() => {
              const lastAsst = [...session.messages].reverse().find(m => m.role === 'assistant');
              if (lastAsst) speakText(lastAsst.content);
            }}
            className={cn(
              "p-2 rounded-xl transition-colors cursor-pointer",
              isTTSActive ? "bg-purple-600/40 text-purple-300" : "hover:bg-white/10 text-white/70 hover:text-white"
            )}
            title={isTTSActive ? "Stop speech" : "Read response aloud"}
          >
            {isTTSActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* Reset Session */}
          <button
            onClick={handleResetSession}
            className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Reset conversation & context memory"
          >
            <RotateCcw size={16} />
          </button>

          {/* Maximize / Restore (floating mode only) */}
          {isFloating && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="hidden sm:flex p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title={isMaximized ? "Restore window size" : "Expand window"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close support assistant"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Active Context Memory Banner */}
      {(session.activeBooking?.service || session.activeTroubleshoot?.issueTitle) && (
        <div className="px-4 py-2 bg-purple-950/30 border-b border-purple-500/20 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {session.activeBooking?.service ? (
              <span className="flex items-center gap-1.5 text-purple-300 font-medium truncate">
                <Calendar size={13} className="shrink-0 text-purple-400" />
                <span>
                  Booking:{' '}
                  <strong className="text-white">{session.activeBooking.service}</strong>
                  {session.activeBooking.date && ` · ${session.activeBooking.date}`}
                  {session.activeBooking.time && ` @ ${session.activeBooking.time}`}
                </span>
                {session.activeBooking.status === 'confirmed' && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                    Confirmed #{session.activeBooking.confirmationCode}
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-cyan-300 font-medium truncate">
                <Wrench size={13} className="shrink-0 text-cyan-400" />
                <span>
                  Troubleshooting:{' '}
                  <strong className="text-white">{session.activeTroubleshoot?.issueTitle}</strong>
                  {session.activeTroubleshoot?.currentStep && ` (Step ${session.activeTroubleshoot.currentStep}/${session.activeTroubleshoot.totalSteps || 3})`}
                </span>
              </span>
            )}
          </div>

          <button
            onClick={() => setShowContextDetails(!showContextDetails)}
            className="text-[11px] text-white/50 hover:text-white underline shrink-0 cursor-pointer"
          >
            {showContextDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      )}

      {/* Expanded Context Details Drawer */}
      <AnimatePresence>
        {showContextDetails && (session.activeBooking?.status === 'confirmed' || (session.activeBooking?.service && session.activeBooking?.date)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2.5 bg-purple-900/20 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="text-purple-200">
                🎫 <strong>{session.activeBooking.service}</strong>
              </span>
              {session.activeBooking.date && (
                <span className="text-white/70">
                  🗓️ {session.activeBooking.date} {session.activeBooking.time}
                </span>
              )}
            </div>

            {session.activeBooking.status === 'confirmed' && (
              <button
                onClick={() => downloadCalendarFile(session.activeBooking)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 font-medium transition-colors cursor-pointer"
              >
                <Download size={12} />
                <span>Add to Calendar</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 scroll-smooth">
        {session.messages.map((msg, index) => {
          const isAssistant = msg.role === 'assistant';

          return (
            <motion.div
              key={msg.id || index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex flex-col gap-1.5 max-w-[92%]",
                isAssistant ? "mr-auto items-start" : "ml-auto items-end"
              )}
            >
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-white/40">
                {isAssistant ? (
                  <>
                    <Bot size={12} className="text-purple-400" />
                    <span>Gemini Support Agent</span>
                  </>
                ) : (
                  <>
                    <span>You</span>
                    <User size={12} className="text-blue-400" />
                  </>
                )}
                <span>·</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words",
                  isAssistant
                    ? "bg-[#181820] text-white/90 border border-white/10 rounded-tl-sm shadow-md"
                    : "bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm shadow-lg shadow-blue-600/10"
                )}
              >
                {msg.content}

                {/* Rich Interactive Booking Confirmation Card */}
                {msg.bookingData && msg.bookingData.status === 'confirmed' && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-gradient-to-br from-purple-900/40 to-black/60 border border-purple-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-purple-200">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        Booking Confirmed
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[10px]">
                        #{msg.bookingData.confirmationCode || 'BK-CONFIRMED'}
                      </span>
                    </div>

                    <div className="space-y-1 text-white/80">
                      <div>
                        <strong>Service:</strong> {msg.bookingData.service || 'Consultation'}
                      </div>
                      {msg.bookingData.date && (
                        <div>
                          <strong>Date & Time:</strong> {msg.bookingData.date} at {msg.bookingData.time || 'TBD'}
                        </div>
                      )}
                      {msg.bookingData.customerEmail && (
                        <div>
                          <strong>Email:</strong> {msg.bookingData.customerEmail}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => downloadCalendarFile(msg.bookingData)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors cursor-pointer"
                      >
                        <CalendarDays size={13} />
                        <span>Save to Calendar (.ics)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Rich Troubleshooting Progress Card */}
                {msg.troubleshootData && msg.troubleshootData.issueTitle && (
                  <div className="mt-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between text-cyan-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Wrench size={13} />
                        {msg.troubleshootData.issueTitle}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                        Step {msg.troubleshootData.currentStep} of {msg.troubleshootData.totalSteps || 3}
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((msg.troubleshootData.currentStep) / (msg.troubleshootData.totalSteps || 3)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Message Actions */}
              {isAssistant && (
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => handleCopy(msg.content, msg.id)}
                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => speakText(msg.content)}
                    className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Listen"
                  >
                    <Volume2 size={12} />
                    <span>Listen</span>
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Loading / Typing Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5 mr-auto p-3.5 rounded-2xl bg-[#181820] border border-white/10 text-xs text-purple-300"
          >
            <Bot size={16} className="text-purple-400 animate-spin" />
            <div className="flex items-center gap-1">
              <span>Gemini is recalling context & typing</span>
              <span className="animate-bounce">.</span>
              <span className="animate-bounce delay-100">.</span>
              <span className="animate-bounce delay-200">.</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Reply Chips */}
      {session.messages.length > 0 && !isLoading && (
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(
            session.messages[session.messages.length - 1]?.quickReplies || [
              '📅 Book an appointment',
              '🛠️ Troubleshoot an issue',
              '🎙️ Mic & Camera permissions',
              '🔑 Gemini API key assistance',
            ]
          ).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium whitespace-nowrap transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 border border-white/5"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3.5 bg-black/60 border-t border-white/10 flex items-end gap-2 shrink-0"
      >
        <div className="relative flex-1 bg-[#1c1c24] rounded-2xl border border-white/10 focus-within:border-purple-500 transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask anything, book a service, or troubleshoot..."
            className="w-full bg-transparent text-white text-sm px-3.5 py-2.5 focus:outline-none resize-none max-h-28 placeholder:text-white/40"
          />
        </div>

        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className={cn(
            "p-3 rounded-2xl font-medium text-white transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer",
            inputMessage.trim() && !isLoading
              ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-600/30 scale-100"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          )}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
