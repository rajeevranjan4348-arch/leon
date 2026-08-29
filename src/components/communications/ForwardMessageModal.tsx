import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check, Send, Users, User, ArrowRight } from 'lucide-react';
import { CommConversation, CommMessage, CommUser } from '@/types/comm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ForwardMessageModalProps {
  isOpen: boolean;
  message: CommMessage | null;
  conversations: CommConversation[];
  contacts: CommUser[];
  onClose: () => void;
  onForward: (targetIds: string[], message: CommMessage) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  message,
  conversations,
  contacts,
  onClose,
  onForward,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one conversation or contact');
      return;
    }
    onForward(selectedIds, message);
    toast.success(`Forwarded to ${selectedIds.length} recipient${selectedIds.length > 1 ? 's' : ''}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[115] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 select-none font-sans"
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ArrowRight size={18} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Forward Message</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Message Preview Snippet */}
          <div className="my-3 p-3 bg-zinc-950/80 rounded-2xl border border-white/5 text-xs text-white/70 truncate">
            <span className="font-bold text-cyan-300 mr-1.5">{message.senderName}:</span>
            <span>{message.content || `[${message.type.toUpperCase()} Attachment]`}</span>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-3 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats and contacts..."
              className="w-full pl-9 pr-4 py-2.5 bg-black/40 rounded-xl text-xs text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* List of Conversations & Contacts */}
          <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
            {filteredConversations.map((conv) => {
              const isSelected = selectedIds.includes(conv.id);
              return (
                <div
                  key={conv.id}
                  onClick={() => toggleSelect(conv.id)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-colors border',
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-white'
                      : 'hover:bg-white/5 border-transparent text-white/80'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
                      {conv.avatar ? (
                        <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover" />
                      ) : (
                        conv.name[0]
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{conv.name}</div>
                      <div className="text-[10px] text-white/50">{conv.type === 'group' ? 'Group Chat' : 'Direct'}</div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-5 h-5 rounded-lg flex items-center justify-center border transition-all',
                      isSelected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-white/30 bg-white/5'
                    )}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-white/50">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleSend}
              disabled={selectedIds.length === 0}
              className="py-2 px-5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <span>Forward</span>
              <Send size={14} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
