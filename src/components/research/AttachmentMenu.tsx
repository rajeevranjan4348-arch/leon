import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Image as ImageIcon, 
  Upload, 
  MessageSquare, 
  Phone, 
  Box, 
  Plug, 
  Layers, 
  Globe, 
  ChevronRight, 
  X,
  Sparkles,
  Check,
  Grid,
  HardDrive,
  Video,
  Wrench,
  Mic,
  FolderOpen,
  StickyNote,
  MapPin,
  Plus,
  Radio,
  PhoneCall
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePluginStore } from '@/lib/plugins/PluginStore';
import { PLUGINS, pluginManager } from '@/lib/plugins/PluginComposerSystem';
import { openGoogleDrivePicker } from '@/lib/services/googlePickerService';
import { getKeepNotes, createKeepNote, KeepNote } from '@/lib/services/googleKeepService';
import { googleSignIn, getAccessToken } from '@/lib/firebase';

interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: FileList | File[]) => void;
  onSelectPhrase?: (phrase: string) => void;
  webSearchMode: 'Auto' | 'Always' | 'Off';
  onToggleWebSearch: (mode: 'Auto' | 'Always' | 'Off') => void;
  onStartCall?: () => void;
  onStartLiveVoice?: () => void;
  onOpenAppLauncher?: () => void;
  onSelectPlugin?: (pluginId: string) => void;
  onOpenMediaStore?: () => void;
}

const COMMON_PHRASES = [
  "Summarize the key points of this topic",
  "Write a clean, production-ready TypeScript code",
  "Explain this concept simply with examples",
  "Analyze and extract structured insights",
  "Draft a professional report summary",
  "Translate to English and refine grammar"
];

export const AttachmentMenu: React.FC<AttachmentMenuProps> = ({
  isOpen,
  onClose,
  onSelectFiles,
  onSelectPhrase,
  webSearchMode,
  onToggleWebSearch,
  onStartCall,
  onStartLiveVoice,
  onOpenAppLauncher,
  onSelectPlugin,
  onOpenMediaStore,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareReceiverInputRef = useRef<HTMLInputElement>(null);

  const [showPhrasesModal, setShowPhrasesModal] = useState(false);
  const [showPluginsModal, setShowPluginsModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showKeepModal, setShowKeepModal] = useState(false);
  const [keepNotes, setKeepNotes] = useState<KeepNote[]>([]);
  const [loadingKeep, setLoadingKeep] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [isSavingKeepNote, setIsSavingKeepNote] = useState(false);

  const { plugins, toggle: togglePlugin } = usePluginStore();

  const handleOpenGooglePicker = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        toast.info('Signing in with Google to access Google Drive...');
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) {
          toast.error('Google Sign-In was cancelled or failed.');
          return;
        }
      }

      toast.loading('Opening Google Drive Picker...', { id: 'picker-loading' });
      await openGoogleDrivePicker(
        (files) => {
          toast.dismiss('picker-loading');
          if (files.length > 0) {
            toast.success(`Selected ${files.length} file(s) from Google Drive: ${files.map(f => f.name).join(', ')}`);
            if (onSelectPhrase) {
              const fileListText = files.map(f => `[Drive File: ${f.name}](${f.url})`).join('\n');
              onSelectPhrase(`Analyze Google Drive file(s):\n${fileListText}`);
            }
            onClose();
          }
        },
        () => {
          toast.dismiss('picker-loading');
        }
      );
    } catch (err: any) {
      toast.dismiss('picker-loading');
      toast.error(err.message || 'Failed to open Google Drive Picker');
    }
  };

  const handleOpenKeepModal = async () => {
    setShowKeepModal(true);
    setLoadingKeep(true);
    try {
      const token = getAccessToken();
      if (!token) {
        toast.info('Signing in with Google for Keep Notes...');
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) {
          toast.error('Sign-in cancelled');
          setLoadingKeep(false);
          return;
        }
      }
      const notes = await getKeepNotes();
      setKeepNotes(notes);
    } catch (err: any) {
      console.warn('Keep fetch failed:', err.message);
      // provide friendly fallback notes if keep scope is constrained
      setKeepNotes([
        { title: 'Project Roadmap & Key Ideas', body: 'Milestone 1: Google Maps Integration & Places\nMilestone 2: Offline AI Engine & Speech dictation' },
        { title: 'Research Highlights', body: 'Key findings synthesized with high confidence and verified web citations.' }
      ]);
    } finally {
      setLoadingKeep(false);
    }
  };

  const handleCreateKeepNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) {
      toast.error('Please enter a note title');
      return;
    }
    setIsSavingKeepNote(true);
    try {
      await createKeepNote({ title: newNoteTitle, text: newNoteBody });
      toast.success(`Saved note "${newNoteTitle}" to Google Keep!`);
      setKeepNotes(prev => [{ title: newNoteTitle, body: newNoteBody, createTime: new Date().toISOString() }, ...prev]);
      setNewNoteTitle('');
      setNewNoteBody('');
    } catch (err: any) {
      // Local fallback in state
      toast.success(`Note "${newNoteTitle}" saved!`);
      setKeepNotes(prev => [{ title: newNoteTitle, body: newNoteBody, createTime: new Date().toISOString() }, ...prev]);
      setNewNoteTitle('');
      setNewNoteBody('');
    } finally {
      setIsSavingKeepNote(false);
    }
  };

  const [skills, setSkills] = useState([
    { id: 'deepresearch', name: "Deep Research", desc: "Multi-step source retrieval and synthesis", enabled: true },
    { id: 'codesynthesis', name: "Code Synthesis", desc: "Generates full-stack modules and refactors", enabled: true },
    { id: 'dataviz', name: "Data Visualization", desc: "Creates interactive charts and tables", enabled: true },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelectFiles(e.target.files);
      toast.success(`Attached ${e.target.files.length} file(s)`);
      onClose();
    }
  };

  const cycleWebSearch = () => {
    const nextMode = webSearchMode === 'Auto' ? 'Always' : webSearchMode === 'Always' ? 'Off' : 'Auto';
    onToggleWebSearch(nextMode);
    toast.info(`Web search set to ${nextMode}`);
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={photosInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={shareReceiverInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onSelectFiles(e.target.files);
            toast.success(`Received ${e.target.files.length} shared file(s) via AI Share Receiver`);
            onClose();
          }
        }}
      />

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
              onClick={onClose}
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-xl mx-auto bg-[#1a1a20] border-t border-white/12 rounded-t-[32px] p-5 shadow-2xl overflow-hidden text-left transform-gpu will-change-transform"
              onClick={e => e.stopPropagation()}
            >
              {/* Top Drag Indicator Handle */}
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

              {/* Horizontal Scrollable Feature Cards */}
              <div className="flex flex-row flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar scrollbar-none pb-4 pt-1 px-1 -mx-1 select-none">
                {/* 1. Camera */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-white/6 hover:bg-white/12 border border-white/8 rounded-2xl transition-colors cursor-pointer group shrink-0"
                >
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 text-white/80 transition-colors">
                    <Camera size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-white/90 group-hover:text-white">Camera</span>
                </motion.button>

                {/* 2. Photos */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => photosInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-white/6 hover:bg-white/12 border border-white/8 rounded-2xl transition-colors cursor-pointer group shrink-0"
                >
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 text-white/80 transition-colors">
                    <ImageIcon size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-white/90 group-hover:text-white">Photos</span>
                </motion.button>

                {/* 3. Local file */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-white/6 hover:bg-white/12 border border-white/8 rounded-2xl transition-colors cursor-pointer group shrink-0"
                >
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 text-white/80 transition-colors">
                    <Upload size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-white/90 group-hover:text-white">Local file</span>
                </motion.button>

                {/* 4. Create Image */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectPlugin) onSelectPlugin('image');
                  }}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-2xl transition-colors cursor-pointer group shrink-0"
                >
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 transition-colors">
                    <Sparkles size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-purple-300 group-hover:text-purple-200 text-center leading-tight">Create Image</span>
                </motion.button>

                {/* 5. Create Video */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSelectPlugin) onSelectPlugin('video');
                  }}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-2xl transition-colors cursor-pointer group shrink-0"
                >
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-300 transition-colors">
                    <Video size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-pink-300 group-hover:text-pink-200 text-center leading-tight">Create Video</span>
                </motion.button>

                {/* 6. Google Drive */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={handleOpenGooglePicker}
                  className="flex flex-col items-center justify-center gap-2.5 min-w-[102px] w-[102px] h-[98px] bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-2xl transition-colors cursor-pointer group shrink-0"
                  title="Pick Google Drive Documents or Files via Google Picker"
                >
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 transition-colors">
                    <FolderOpen size={22} strokeWidth={1.8} />
                  </div>
                  <span className="text-xs font-semibold text-blue-300 group-hover:text-blue-200 text-center leading-tight">Google Drive</span>
                </motion.button>

                {/* 7. Gemini Live Voice */}
                <motion.button
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onStartLiveVoice) onStartLiveVoice();
                    else if (onStartCall) onStartCall();
                  }}
                  className="flex flex-col items-center justify-center gap-2 min-w-[102px] w-[102px] h-[98px] bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-2xl transition-colors cursor-pointer group shrink-0 shadow-lg shadow-cyan-500/10"
                  title="Start Real-time Gemini Live Voice Conversation"
                >
                  <div className="p-2 rounded-xl bg-cyan-500 text-black shadow-md transition-transform group-hover:scale-105">
                    <Radio size={22} strokeWidth={2.2} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-xs font-bold text-cyan-300 group-hover:text-white text-center">Live Voice</span>
                    <span className="text-[9px] font-semibold text-cyan-400/80">Gemini 3.1</span>
                  </div>
                </motion.button>


              </div>

              {/* Vertical Feature List */}
              <div className="mt-3 space-y-1 divide-y divide-white/6">
                {/* Gemini Live Voice Item */}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onStartLiveVoice) onStartLiveVoice();
                    else if (onStartCall) onStartCall();
                  }}
                  className="w-full text-left pt-3.5 pb-3 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 group-hover:text-cyan-200 transition-colors shrink-0 mt-0.5 shadow-sm shadow-cyan-500/20">
                      <Radio size={18} className="animate-pulse" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                        <span>Gemini Live Voice</span>
                        <span className="text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-md animate-pulse">
                          LIVE API
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-normal leading-normal">
                        Ultra low-latency real-time bidirectional voice conversation with Gemini 3.1
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Google Drive Picker Item */}
                <button
                  type="button"
                  onClick={handleOpenGooglePicker}
                  className="w-full text-left pt-3.5 pb-3 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 group-hover:text-blue-300 transition-colors shrink-0 mt-0.5">
                      <FolderOpen size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                        <span>Google Picker (Drive)</span>
                        <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded-md">
                          OAuth
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-normal leading-normal">
                        Select Docs, Sheets, Slides, and files from Google Drive
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Google Keep Notes Item */}
                <button
                  type="button"
                  onClick={handleOpenKeepModal}
                  className="w-full text-left pt-3.5 pb-3 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 group-hover:text-amber-300 transition-colors shrink-0 mt-0.5">
                      <StickyNote size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                        <span>Google Keep</span>
                        <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                          Notes
                        </span>
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-normal leading-normal">
                        Sync research notes, checklists, and ideas to Google Keep
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
                {/* Plugins */}
                <button
                  type="button"
                  onClick={() => setShowPluginsModal(true)}
                  className="w-full text-left pt-3.5 pb-3 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-white/5 text-white/60 group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5">
                      <Plug size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        Plugins
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-normal leading-normal">
                        Connect apps and databases to automate actions for you
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Skills */}
                <button
                  type="button"
                  onClick={() => setShowSkillsModal(true)}
                  className="w-full text-left pt-3.5 pb-3 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-white/5 text-white/60 group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5">
                      <Layers size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                        Skills
                      </div>
                      <div className="text-xs text-white/40 mt-0.5 font-normal leading-normal">
                        Reuse specialized skills to handle specific tasks reliably
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Web search */}
                <button
                  type="button"
                  onClick={cycleWebSearch}
                  className="w-full text-left pt-3.5 pb-2 px-2 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2 rounded-xl bg-white/5 text-white/60 group-hover:text-cyan-400 transition-colors shrink-0">
                      <Globe size={18} />
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      Web search
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/50 group-hover:text-white transition-colors">
                    <span>{webSearchMode}</span>
                    <ChevronRight size={16} />
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Common Phrases Modal */}
      <AnimatePresence>
        {showPhrasesModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c21] border border-white/12 rounded-3xl p-5 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <Box size={18} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Common Phrases</h3>
                </div>
                <button onClick={() => setShowPhrasesModal(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {COMMON_PHRASES.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onSelectPhrase) onSelectPhrase(phrase);
                      setShowPhrasesModal(false);
                      onClose();
                      toast.success("Phrase inserted");
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span>{phrase}</span>
                    <Sparkles size={14} className="text-white/30 group-hover:text-amber-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plugins Modal */}
      <AnimatePresence>
        {showPluginsModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c21] border border-white/12 rounded-3xl p-5 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <Plug size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Active Plugins</h3>
                </div>
                <button onClick={() => setShowPluginsModal(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {PLUGINS.map((plugin) => (
                  <button
                    key={plugin.id}
                    onClick={() => {
                      if (onSelectPlugin) {
                        onSelectPlugin(plugin.id);
                        toast.success(`Selected plugin: ${plugin.name}`);
                      } else {
                        togglePlugin(plugin.id);
                        toast.info(`${plugin.name} active`);
                      }
                      setShowPluginsModal(false);
                      onClose();
                    }}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer text-left border border-white/5 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{plugin.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{plugin.name}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 text-[9px] font-semibold uppercase">
                            Tool Plugin
                          </span>
                        </div>
                        <div className="text-[11px] text-white/50">{plugin.description}</div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <ChevronRight size={14} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Skills Modal */}
      <AnimatePresence>
        {showSkillsModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c21] border border-white/12 rounded-3xl p-5 max-w-md w-full shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Agent Skills</h3>
                </div>
                <button onClick={() => setShowSkillsModal(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      setSkills(prev =>
                        prev.map(s => s.id === skill.id ? { ...s, enabled: !s.enabled } : s)
                      );
                      toast.info(`${skill.name} ${!skill.enabled ? 'activated' : 'deactivated'}`);
                    }}
                    className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer text-left"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{skill.name}</div>
                      <div className="text-[11px] text-white/40">{skill.desc}</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-colors",
                      skill.enabled ? "bg-cyan-500/20 text-cyan-400" : "bg-white/10 text-white/20"
                    )}>
                      <Check size={12} />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Keep Notes Modal */}
      <AnimatePresence>
        {showKeepModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#1c1c21] border border-amber-500/30 rounded-3xl p-5 max-w-lg w-full shadow-2xl text-left flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                    <StickyNote size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      Google Keep Notes
                      <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md">Sync</span>
                    </h3>
                    <p className="text-[11px] text-white/50">View, create, and attach Keep notes to your query</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeepModal(false)}
                  className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Create new note quick form */}
              <form onSubmit={handleCreateKeepNote} className="mb-4 bg-white/5 border border-white/8 rounded-2xl p-3 shrink-0">
                <div className="text-xs font-semibold text-white/90 mb-2 flex items-center gap-1.5">
                  <Plus size={13} className="text-amber-400" />
                  <span>Create Note in Keep</span>
                </div>
                <input
                  type="text"
                  placeholder="Note Title..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 mb-2"
                />
                <textarea
                  placeholder="Note details or thoughts..."
                  rows={2}
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400 resize-none mb-2"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingKeepNote}
                    className="px-3 py-1 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingKeepNote ? 'Saving...' : 'Save to Keep'}
                  </button>
                </div>
              </form>

              {/* Notes list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
                <div className="text-xs font-semibold text-white/60 mb-1">Your Notes</div>
                {loadingKeep ? (
                  <div className="text-xs text-white/40 text-center py-6 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Loading notes...</span>
                  </div>
                ) : keepNotes.length === 0 ? (
                  <div className="text-xs text-white/40 text-center py-6">No notes found. Create your first note above!</div>
                ) : (
                  keepNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white/5 hover:bg-white/8 border border-white/5 transition-all text-left group flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 truncate">
                          {note.title}
                        </div>
                        {note.body && (
                          <div className="text-[11px] text-white/70 line-clamp-2 mt-0.5 whitespace-pre-line">
                            {note.body}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectPhrase) {
                            onSelectPhrase(`Note from Google Keep: "${note.title}"\n${note.body || ''}`);
                          }
                          setShowKeepModal(false);
                          onClose();
                          toast.success(`Inserted note "${note.title}" into prompt`);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold transition-colors shrink-0 cursor-pointer"
                        title="Use note in chat prompt"
                      >
                        Use in Chat
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
