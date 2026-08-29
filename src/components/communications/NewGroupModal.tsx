import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Check, Search, Sparkles } from 'lucide-react';
import { CommUser } from '@/types/comm';
import { cn } from '@/lib/utils';

interface NewGroupModalProps {
  isOpen: boolean;
  contacts: CommUser[];
  onClose: () => void;
  onCreateGroup: (selectedContacts: CommUser[], groupName: string) => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  contacts,
  onClose,
  onCreateGroup,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    const selected = contacts.filter((c) => selectedIds.includes(c.id));
    onCreateGroup(selected, groupName.trim());
    setGroupName('');
    setSelectedIds([]);
    onClose();
  };

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.email?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-bold">Create New Group</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Group Name Input */}
          <div className="py-4">
            <label className="text-xs font-semibold text-white/60 block mb-1.5">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. AI Research Squad 🚀"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 placeholder:text-white/30"
              autoFocus
            />
          </div>

          {/* Contact Search */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3.5 top-3 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts to add..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Selected Count */}
          <div className="text-xs text-white/50 mb-2 px-1">
            {selectedIds.length} participant{selectedIds.length === 1 ? '' : 's'} selected
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-60 scrollbar-thin">
            {filtered.map((contact) => {
              const isSelected = selectedIds.includes(contact.id);
              return (
                <div
                  key={contact.id}
                  onClick={() => toggleSelect(contact.id)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
                    isSelected ? 'bg-cyan-500/15 border border-cyan-500/30' : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-cyan-400">
                          {contact.name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{contact.name}</span>
                        {contact.isAI && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-mono">
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 truncate max-w-[200px]">
                        {contact.statusMessage || contact.email}
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'border-white/30 hover:border-white/60'
                    )}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Action */}
          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedIds.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:pointer-events-none text-black transition-colors shadow-lg shadow-cyan-500/20"
            >
              Create Group
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
