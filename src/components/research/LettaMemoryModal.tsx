import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  User,
  Sparkles,
  Database,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  RefreshCw,
  X,
  Layers,
  History,
  FileText,
  Sliders,
  ShieldCheck,
  HardDrive,
  Copy
} from 'lucide-react';
import { LettaStore } from '@/lib/letta/LettaStore';
import { LettaService } from '@/lib/letta/LettaService';
import { CoreMemory, ArchivalPassage, RecallEvent } from '@/lib/letta/types';
import { toast } from 'sonner';

interface LettaMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LettaMemoryModal: React.FC<LettaMemoryModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'core' | 'archival' | 'recall' | 'settings'>('core');
  const [activeBlock, setActiveBlock] = useState<keyof CoreMemory | 'project_context'>('human');
  
  // Core Memory State
  const [coreMemory, setCoreMemory] = useState<CoreMemory>({ human: '', persona: '', project_context: '', task_state: '' });
  const [editBlockValue, setEditBlockValue] = useState('');
  const [newAppendText, setNewAppendText] = useState('');
  
  // Archival Memory State
  const [archivalSearchQuery, setArchivalSearchQuery] = useState('');
  const [archivalPassages, setArchivalPassages] = useState<ArchivalPassage[]>([]);
  const [newPassageContent, setNewPassageContent] = useState('');
  const [newPassageTags, setNewPassageTags] = useState('');
  const [showAddPassage, setShowAddPassage] = useState(false);

  // Recall Memory State
  const [recallSearchQuery, setRecallSearchQuery] = useState('');
  const [recallEvents, setRecallEvents] = useState<RecallEvent[]>([]);

  // Agent State & Stats
  const [agentState, setAgentState] = useState(LettaStore.getOrCreateAgent());
  const [isSaving, setIsSaving] = useState(false);

  const loadData = () => {
    const agent = LettaStore.getOrCreateAgent();
    setAgentState(agent);
    setCoreMemory(agent.coreMemory);
    setEditBlockValue(agent.coreMemory[activeBlock] || '');
    
    if (archivalSearchQuery.trim()) {
      const results = LettaStore.searchArchivalPassages(agent.id, archivalSearchQuery, 20);
      setArchivalPassages(results.map(r => r.passage));
    } else {
      setArchivalPassages(LettaStore.getAllArchivalPassages(agent.id));
    }

    if (recallSearchQuery.trim()) {
      setRecallEvents(LettaStore.searchRecallMemory(agent.id, recallSearchQuery, 30));
    } else {
      setRecallEvents(LettaStore.getAllRecallEvents(agent.id).slice(0, 30));
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab, activeBlock, archivalSearchQuery, recallSearchQuery]);

  const handleSaveCoreBlock = () => {
    setIsSaving(true);
    LettaStore.updateCoreMemory(agentState.id, activeBlock, editBlockValue);
    setCoreMemory(prev => ({ ...prev, [activeBlock]: editBlockValue }));
    toast.success(`Updated Core Memory block: ${activeBlock}`);
    setIsSaving(false);
    loadData();
  };

  const handleAppendCoreBlock = () => {
    if (!newAppendText.trim()) return;
    const res = LettaStore.appendCoreMemory(agentState.id, activeBlock, newAppendText);
    if (res.success) {
      toast.success(`Appended to ${activeBlock}`);
      setNewAppendText('');
      loadData();
    } else {
      toast.error(res.message);
    }
  };

  const handleAddArchivalPassage = () => {
    if (!newPassageContent.trim()) return;
    const tags = newPassageTags.split(',').map(t => t.trim()).filter(Boolean);
    LettaStore.insertArchivalPassage(agentState.id, newPassageContent, tags, {
      importance: 4,
    });
    toast.success('Inserted new passage into Archival Memory');
    setNewPassageContent('');
    setNewPassageTags('');
    setShowAddPassage(false);
    loadData();
  };

  const handleDeletePassage = (id: string) => {
    LettaStore.deleteArchivalPassage(id);
    toast.success('Deleted archival passage');
    loadData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#12141a]/95 border border-white/10 shadow-2xl overflow-hidden text-white font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <Brain size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Letta Agent Brain & Hierarchical Memory</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Stateful Agent
                </span>
              </div>
              <p className="text-xs text-white/50">
                Persistent Core Memory, Archival Passage Store & Event Stream Recall
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs & Metrics Bar */}
        <div className="px-6 py-2.5 bg-white/[0.01] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10">
            <button
              onClick={() => setActiveTab('core')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'core'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={14} /> Core Memory (In-Context)
            </button>

            <button
              onClick={() => setActiveTab('archival')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'archival'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database size={14} /> Archival Store ({agentState.stats.archivalPassagesCount})
            </button>

            <button
              onClick={() => setActiveTab('recall')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'recall'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <History size={14} /> Recall Events ({agentState.stats.messagesCount})
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-white/50 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-400" />
              Isolated & Persistent
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* 1. CORE MEMORY TAB */}
          {activeTab === 'core' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
                <button
                  onClick={() => { setActiveBlock('human'); setEditBlockValue(coreMemory.human || ''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeBlock === 'human'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <User size={13} className="text-cyan-400" /> Human Block (User Profile)
                </button>

                <button
                  onClick={() => { setActiveBlock('persona'); setEditBlockValue(coreMemory.persona || ''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeBlock === 'persona'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Sparkles size={13} className="text-purple-400" /> Persona Block (Agent Rules)
                </button>

                <button
                  onClick={() => { setActiveBlock('project_context'); setEditBlockValue(coreMemory.project_context || ''); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeBlock === 'project_context'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <Layers size={13} className="text-emerald-400" /> Project Context
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                    <Edit3 size={14} className="text-cyan-400" />
                    Edit Block Content: <span className="font-mono text-cyan-300">[{activeBlock}]</span>
                  </span>
                  <button
                    onClick={handleSaveCoreBlock}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    <Check size={14} /> Save Block
                  </button>
                </div>

                <textarea
                  value={editBlockValue}
                  onChange={(e) => setEditBlockValue(e.target.value)}
                  rows={8}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs font-mono text-white/90 focus:outline-none focus:border-cyan-500/50 resize-y"
                  placeholder={`Write content for ${activeBlock} block...`}
                />
              </div>

              {/* Quick Append Tool */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <Plus size={14} className="text-cyan-400" />
                  Quick Append Fact to <span className="font-mono text-cyan-300">[{activeBlock}]</span>
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAppendText}
                    onChange={(e) => setNewAppendText(e.target.value)}
                    placeholder="e.g. Always generate production TypeScript with comments"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAppendCoreBlock(); }}
                  />
                  <button
                    onClick={handleAppendCoreBlock}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Append
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. ARCHIVAL MEMORY TAB */}
          {activeTab === 'archival' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={archivalSearchQuery}
                    onChange={(e) => setArchivalSearchQuery(e.target.value)}
                    placeholder="Semantic search across archival passages & file notes..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <button
                  onClick={() => setShowAddPassage(!showAddPassage)}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Add Passage
                </button>
              </div>

              {showAddPassage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/30 space-y-3"
                >
                  <h4 className="text-xs font-semibold text-white">Insert New Archival Passage</h4>
                  <textarea
                    value={newPassageContent}
                    onChange={(e) => setNewPassageContent(e.target.value)}
                    rows={4}
                    placeholder="Enter factual passage, code snippet, or reference text..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassageTags}
                      onChange={(e) => setNewPassageTags(e.target.value)}
                      placeholder="Tags (comma-separated: project, api, auth)"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleAddArchivalPassage}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-colors cursor-pointer"
                    >
                      Save Passage
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Passages List */}
              <div className="space-y-2.5">
                {archivalPassages.length === 0 ? (
                  <div className="text-center py-12 text-white/40 text-xs">
                    No archival passages found. Add passages or ask the agent to store key information.
                  </div>
                ) : (
                  archivalPassages.map((passage) => (
                    <div
                      key={passage.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-mono text-white/90 whitespace-pre-wrap leading-relaxed">
                          {passage.content}
                        </p>
                        <button
                          onClick={() => handleDeletePassage(passage.id)}
                          className="text-white/30 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Delete passage"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {passage.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-cyan-300/80">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <span>Accessed: {passage.accessCount} times • {new Date(passage.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. RECALL MEMORY TAB */}
          {activeTab === 'recall' && (
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={recallSearchQuery}
                  onChange={(e) => setRecallSearchQuery(e.target.value)}
                  placeholder="Filter past conversation events..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-2">
                {recallEvents.length === 0 ? (
                  <div className="text-center py-12 text-white/40 text-xs">
                    No past recall events recorded yet.
                  </div>
                ) : (
                  recallEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs"
                    >
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] uppercase font-bold shrink-0 ${
                        evt.role === 'user' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                      }`}>
                        {evt.role}
                      </span>
                      <p className="text-white/80 flex-1 truncate font-mono">
                        {evt.content}
                      </p>
                      <span className="text-[10px] text-white/30 shrink-0 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-white/[0.02] text-xs text-white/50">
          <div className="flex items-center gap-2">
            <HardDrive size={14} className="text-cyan-400" />
            <span>Agent ID: <span className="font-mono text-white/80">{agentState.id}</span></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
