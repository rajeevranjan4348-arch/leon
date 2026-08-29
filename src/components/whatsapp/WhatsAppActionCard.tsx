import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Phone, 
  Video, 
  ExternalLink, 
  Copy, 
  Check, 
  User, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { buildWhatsAppUrls, saveWhatsAppMessageHistory } from '@/lib/whatsappService';
import { toast } from 'sonner';

interface WhatsAppActionCardProps {
  recipientName: string;
  recipientPhone?: string | null;
  initialMessage?: string | null;
  actionType?: 'send_message' | 'open_chat' | 'voice_call' | 'video_call' | string;
  onSent?: () => void;
}

export const WhatsAppActionCard: React.FC<WhatsAppActionCardProps> = ({
  recipientName,
  recipientPhone,
  initialMessage,
  actionType = 'send_message',
  onSent
}) => {
  const [message, setMessage] = useState(initialMessage || '');
  const [phone, setPhone] = useState(recipientPhone || '');
  const [copied, setCopied] = useState(false);
  const [sentStatus, setSentStatus] = useState(false);

  const { waMeUrl, webUrl, intentScheme } = buildWhatsAppUrls(phone, message);

  const handleCopy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Message copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendApp = () => {
    saveWhatsAppMessageHistory({
      id: `msg_${Date.now()}`,
      recipientName,
      recipientPhone: phone,
      message: message || 'WhatsApp Chat',
      timestamp: Date.now(),
      status: 'sent',
      type: 'text'
    });

    setSentStatus(true);
    toast.success(`Opening WhatsApp for ${recipientName}...`);

    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = waMeUrl;
    } else {
      window.open(webUrl, '_blank');
    }

    if (onSent) onSent();
  };

  const handleSendWeb = () => {
    saveWhatsAppMessageHistory({
      id: `msg_${Date.now()}`,
      recipientName,
      recipientPhone: phone,
      message: message || 'WhatsApp Chat',
      timestamp: Date.now(),
      status: 'sent',
      type: 'text'
    });

    setSentStatus(true);
    toast.success(`Opening Web WhatsApp for ${recipientName}...`);
    window.open(webUrl, '_blank');

    if (onSent) onSent();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-3 rounded-2xl bg-gradient-to-br from-[#121b22] to-[#1f2c34] border border-[#25d366]/30 p-4 shadow-xl text-white max-w-md w-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#25d366] text-black flex items-center justify-center font-bold shadow-md shadow-[#25d366]/20">
            <MessageSquare size={20} className="fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white">WhatsApp AI Controller</span>
              <span className="text-[10px] bg-[#25d366]/20 text-[#25d366] px-1.5 py-0.5 rounded font-medium border border-[#25d366]/30">
                Connected
              </span>
            </div>
            <p className="text-xs text-white/60">Automated Direct Messaging</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => window.open('https://web.whatsapp.com', '_blank')}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Open WhatsApp Web"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="bg-[#111b21] p-3 rounded-xl border border-white/5 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#25d366] font-bold">
            <User size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{recipientName}</div>
            {phone ? (
              <div className="text-xs text-white/50">{phone}</div>
            ) : (
              <div className="text-xs text-amber-400/80">No direct phone saved — using contact name</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => window.open(`https://wa.me/${phone || ''}`, '_blank')}
            className="p-2 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
            title="WhatsApp Call"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => window.open(`https://wa.me/${phone || ''}`, '_blank')}
            className="p-2 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
            title="WhatsApp Video Call"
          >
            <Video size={16} />
          </button>
        </div>
      </div>

      {/* Message Input Box */}
      {actionType === 'send_message' && (
        <div className="space-y-2 mb-3">
          <label className="text-xs font-medium text-white/70 flex items-center justify-between">
            <span>Message Content:</span>
            <button
              onClick={handleCopy}
              className="text-[11px] text-[#25d366] hover:underline flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-[#111b21] border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-[#25d366]/50 resize-none placeholder-white/30"
            placeholder="Type your WhatsApp message..."
          />
        </div>
      )}

      {/* Action Trigger Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSendApp}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25d366] hover:bg-[#20bd5a] text-black font-semibold text-xs transition-all shadow-lg shadow-[#25d366]/20 active:scale-95 cursor-pointer"
        >
          <Send size={15} />
          <span>{sentStatus ? 'Message Sent' : 'Send via App'}</span>
        </button>

        <button
          onClick={handleSendWeb}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/10 transition-all active:scale-95 cursor-pointer"
        >
          <ExternalLink size={15} />
          <span>Open Web Chat</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <Sparkles size={12} className="text-[#25d366]" /> AI Automated Link Generator
        </span>
        <span className="flex items-center gap-1">
          <Smartphone size={12} /> Direct Intent Ready
        </span>
      </div>
    </motion.div>
  );
};
