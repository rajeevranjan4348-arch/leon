import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Smartphone,
  Search,
  X,
  Send,
  User,
  Clock,
  CheckCheck,
  CornerDownRight,
  Shield,
} from 'lucide-react';
import {
  actionToolRegistry,
  RecentMessageItem,
  permissionManager,
} from '@/lib/communicationAgent';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RecentConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReply?: (senderName: string, messageText: string) => void;
}

export const RecentConversationsModal: React.FC<RecentConversationsModalProps> = ({
  isOpen,
  onClose,
  onSelectReply,
}) => {
  const [messages, setMessages] = useState<RecentMessageItem[]>([]);
  const [search, setSearch] = useState('');
  const [replyTarget, setReplyTarget] = useState<RecentMessageItem | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (isOpen) {
      const res = actionToolRegistry.readAllowedMessages();
      if (res.success) {
        setMessages(res.messages);
      } else {
        toast.error(res.error || 'Failed to read messages');
      }
    }
  }, [isOpen]);

  const filteredMessages = messages.filter(
    (m) =>
      m.senderName.toLowerCase().includes(search.toLowerCase()) ||
      m.previewText.toLowerCase().includes(search.toLowerCase())
  );

  const handleSendReply = () => {
    if (!replyTarget || !replyText.trim()) return;

    if (replyTarget.platform === 'whatsapp') {
      actionToolRegistry.sendWhatsAppMessage(replyTarget.senderName, replyText);
    } else {
      actionToolRegistry.sendSMS(replyTarget.senderName, replyText);
    }

    toast.success(`Reply sent to ${replyTarget.senderName}`);
    setReplyText('');
    setReplyTarget(null);
    onClose();
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
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-[#121218]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-white z-10 font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <MessageSquare size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    Recent Conversations
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      ALLOWED ONLY
                    </span>
                  </h2>
                  <p className="text-xs text-white/60">
                    Live inbox summaries from connected messaging platforms
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

            {/* Search Input */}
            <div className="px-6 py-3 border-b border-white/10 bg-black/20">
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sender or message content..."
                  className="w-full bg-white/5 text-white text-xs rounded-xl pl-9 pr-3 py-2 border border-white/10 focus:outline-none focus:border-indigo-500 placeholder-white/40"
                />
              </div>
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 sidebar-scrollbar">
              {filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-xs italic">
                  No recent messages found matching your query.
                </div>
              ) : (
                filteredMessages.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold">
                          {item.senderName.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-white">
                          {item.senderName}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase',
                            item.platform === 'whatsapp'
                              ? 'bg-[#25d366]/20 text-[#25d366] border-[#25d366]/30'
                              : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          )}
                        >
                          {item.platform}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-white/40">
                        <Clock size={11} />
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <p className="text-xs text-white/80 pl-9 font-mono leading-relaxed">
                      "{item.previewText}"
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={() => setReplyTarget(item)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <CornerDownRight size={12} />
                        Quick Reply
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Reply Form Area */}
            {replyTarget && (
              <div className="p-4 border-t border-white/10 bg-black/40 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    Replying to <strong>{replyTarget.senderName}</strong> via{' '}
                    <span className="capitalize">{replyTarget.platform}</span>:
                  </span>
                  <button
                    onClick={() => setReplyTarget(null)}
                    className="text-white/40 hover:text-white text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                    placeholder="Type your reply..."
                    autoFocus
                    className="flex-1 bg-white/10 text-white text-xs rounded-xl px-3 py-2 border border-indigo-500/40 focus:outline-none placeholder-white/40"
                  />
                  <button
                    onClick={handleSendReply}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Send size={13} />
                    Send
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
