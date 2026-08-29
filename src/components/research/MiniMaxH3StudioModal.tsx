import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Sparkles,
  X,
  Play,
  Pause,
  Download,
  Send,
  Upload,
  RefreshCw,
  Sliders,
  Volume2,
  Music,
  Eye,
  Layers,
  ShoppingBag,
  BookOpen,
  Megaphone,
  Gamepad2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  MiniMaxH3Service,
  H3_SKILL_PRESETS,
  type MiniMaxH3Mode,
  type MiniMaxH3Resolution,
  type MiniMaxH3Ratio,
  type MiniMaxH3Duration,
  type H3SkillPreset,
  type H3TaskStatus,
} from '@/lib/services/miniMaxH3Service';

interface MiniMaxH3StudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertVideoToChat?: (videoUrl: string, promptText: string) => void;
  initialPrompt?: string;
}

export const MiniMaxH3StudioModal: React.FC<MiniMaxH3StudioModalProps> = ({
  isOpen,
  onClose,
  onInsertVideoToChat,
  initialPrompt = '',
}) => {
  const [selectedMode, setSelectedMode] = useState<MiniMaxH3Mode>('T2VA');
  const [selectedSkill, setSelectedSkill] = useState<string | null>('minimalist-product-ad');
  
  // Multimodal prompt inputs
  const [visualDescription, setVisualDescription] = useState<string>(initialPrompt || '');
  const [soundscape, setSoundscape] = useState<string>('');
  const [nonDiegeticMusic, setNonDiegeticMusic] = useState<string>('');
  
  // Generation parameters
  const [resolution, setResolution] = useState<MiniMaxH3Resolution>('2K');
  const [ratio, setRatio] = useState<MiniMaxH3Ratio>('16:9');
  const [duration, setDuration] = useState<MiniMaxH3Duration>(10);
  
  // Media inputs
  const [firstFramePreview, setFirstFramePreview] = useState<string | null>(null);
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null);
  const [firstFrameFile, setFirstFrameFile] = useState<File | null>(null);
  const [lastFrameFile, setLastFrameFile] = useState<File | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<H3TaskStatus | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const pollIntervalRef = useRef<any>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  // Apply skill preset
  const handleSelectSkill = (skill: H3SkillPreset) => {
    setSelectedSkill(skill.id);
    setSelectedMode(skill.defaultMode);
    setRatio(skill.defaultRatio);
    setDuration(skill.defaultDuration);
    setResolution(skill.defaultResolution);
    setVisualDescription(skill.promptTemplate.integrated_multimodal_description);
    setSoundscape(skill.promptTemplate.overall_soundscape || '');
    setNonDiegeticMusic(skill.promptTemplate.non_diegetic_music || '');
  };

  // Initial populate from skill if empty
  useEffect(() => {
    if (isOpen && !visualDescription) {
      const defaultSkill = H3_SKILL_PRESETS[0];
      handleSelectSkill(defaultSkill);
    }
  }, [isOpen]);

  // Clean up polling interval
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleFirstFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFirstFrameFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFirstFramePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLastFrameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLastFrameFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setLastFramePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!visualDescription.trim()) {
      setErrorMessage('Please provide a visual description for your video.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setTaskStatus({ taskId: 'init', status: 'Queued', progress: 10 });
    setGeneratedVideoUrl(null);

    try {
      const createRes = await MiniMaxH3Service.createVideoTask({
        model: 'MiniMax-H3',
        mode: selectedMode,
        prompt: {
          integrated_multimodal_description: visualDescription,
          overall_soundscape: soundscape,
          non_diegetic_music: nonDiegeticMusic,
        },
        resolution,
        ratio,
        duration,
        media: {
          firstFrameBase64: firstFramePreview || undefined,
          lastFrameBase64: lastFramePreview || undefined,
        },
      });

      if (!createRes.success) {
        throw new Error(createRes.error || 'Failed to start video generation job');
      }

      const activeTaskId = createRes.taskId || `h3_${Date.now()}`;
      setTaskId(activeTaskId);

      if (createRes.directVideoUrl) {
        setGeneratedVideoUrl(createRes.directVideoUrl);
        setTaskStatus({ taskId: activeTaskId, status: 'Success', progress: 100, videoUrl: createRes.directVideoUrl });
        setIsGenerating(false);
        return;
      }

      // Start polling
      let currentProgress = 20;
      pollIntervalRef.current = setInterval(async () => {
        currentProgress = Math.min(currentProgress + 15, 95);
        setTaskStatus(prev => prev ? { ...prev, progress: currentProgress, status: 'Processing' } : null);

        const statusRes = await MiniMaxH3Service.queryTaskStatus(activeTaskId);
        if (statusRes.status === 'Success' && statusRes.videoUrl) {
          clearInterval(pollIntervalRef.current);
          setGeneratedVideoUrl(statusRes.videoUrl);
          setTaskStatus(statusRes);
          setIsGenerating(false);
        } else if (statusRes.status === 'Fail') {
          clearInterval(pollIntervalRef.current);
          setErrorMessage(statusRes.error || 'Generation failed at provider.');
          setTaskStatus(statusRes);
          setIsGenerating(false);
        }
      }, 3000);
    } catch (err: any) {
      console.error('MiniMax H3 generation error:', err);
      setErrorMessage(err?.message || 'An unexpected error occurred during generation.');
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    const fullText = `${visualDescription}${soundscape ? `\n[Soundscape: ${soundscape}]` : ''}${nonDiegeticMusic ? `\n[Music: ${nonDiegeticMusic}]` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleInsert = () => {
    if (generatedVideoUrl && onInsertVideoToChat) {
      onInsertVideoToChat(generatedVideoUrl, visualDescription);
      onClose();
    }
  };

  const getPresetIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag': return <ShoppingBag size={16} />;
      case 'Sparkles': return <Sparkles size={16} />;
      case 'BookOpen': return <BookOpen size={16} />;
      case 'Megaphone': return <Megaphone size={16} />;
      case 'Music': return <Music size={16} />;
      case 'Gamepad2': return <Gamepad2 size={16} />;
      case 'Layers': return <Layers size={16} />;
      case 'Pencil': return <Pencil size={16} />;
      default: return <Video size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f1117] border border-white/12 rounded-3xl shadow-2xl overflow-hidden text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/30 border border-pink-500/30 text-pink-300">
                <Video size={22} className="text-pink-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">MiniMax-H3 Video Studio</h2>
                  <span className="text-[10px] font-semibold bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Video + Audio Synchronized
                  </span>
                </div>
                <p className="text-xs text-white/50">
                  Generate ultra-cinematic 2K/4K video with synchronized soundscapes, foley, and non-diegetic music
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Row: Official Skill Presets */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-400" /> Official H3 Production Skills & Templates
                </span>
                <span className="text-[11px] text-white/40">From MiniMax-H3 ecosystem</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {H3_SKILL_PRESETS.map(preset => {
                  const isSelected = selectedSkill === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectSkill(preset)}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-pink-500/15 border-pink-500/50 shadow-md shadow-pink-500/10'
                          : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-pink-500 text-black' : 'bg-white/8 text-white/70'}`}>
                          {getPresetIcon(preset.iconName)}
                        </div>
                        <span className="text-[9px] font-semibold text-pink-300 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded">
                          {preset.badge}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-white/40 line-clamp-2 mt-0.5 leading-tight">
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle Grid: Configuration & Multimodal Prompts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Prompt Formulation (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Generation Mode Selectors */}
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-2">Generation Mode</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'T2VA', label: 'T2VA', desc: 'Text to Video+Audio' },
                      { id: 'I2VA', label: 'I2VA', desc: 'Image to Video+Audio' },
                      { id: 'FL2VA', label: 'FL2VA', desc: 'First & Last Frame' },
                      { id: 'Ref2VA', label: 'Ref2VA', desc: 'Reference Motion' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedMode(mode.id as MiniMaxH3Mode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          selectedMode === mode.id
                            ? 'bg-pink-500 text-black font-bold border-pink-400 shadow-md shadow-pink-500/20'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {mode.label} <span className="text-[10px] opacity-75 font-normal">({mode.desc})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Integrated Multimodal Visual Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                      <Eye size={14} className="text-cyan-400" /> Integrated Visual & Cinematography Description
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copiedPrompt ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedPrompt ? 'Copied' : 'Copy prompt'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={visualDescription}
                    onChange={e => setVisualDescription(e.target.value)}
                    placeholder="Describe subjects, camera movements (dolly, crane, tracking), lighting, mood, actions..."
                    className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-pink-500/60 focus:ring-1 focus:ring-pink-500/30 resize-none transition-all"
                  />
                </div>

                {/* 2. Overall Soundscape / Ambient Foley */}
                <div>
                  <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-amber-400" /> Overall Soundscape & Diegetic Audio (Optional)
                  </label>
                  <input
                    type="text"
                    value={soundscape}
                    onChange={e => setSoundscape(e.target.value)}
                    placeholder="e.g. Crisp rain on asphalt, distant thunder, roaring supercar engine, mechanical clicks..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-pink-500/60 transition-all"
                  />
                </div>

                {/* 3. Non-diegetic Music Score */}
                <div>
                  <label className="text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                    <Music size={14} className="text-purple-400" /> Non-diegetic Musical Score / Rhythm (Optional)
                  </label>
                  <input
                    type="text"
                    value={nonDiegeticMusic}
                    onChange={e => setNonDiegeticMusic(e.target.value)}
                    placeholder="e.g. 120bpm cyberpunk synthwave, driving sub-bass, emotional orchestral crescendo..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-pink-500/60 transition-all"
                  />
                </div>

                {/* Keyframe Media Uploads for I2VA / FL2VA */}
                {(selectedMode === 'I2VA' || selectedMode === 'FL2VA') && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-semibold text-white/70 mb-1.5 block">First Frame (Start)</span>
                      <input
                        type="file"
                        ref={firstFrameInputRef}
                        accept="image/*"
                        onChange={handleFirstFrameChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => firstFrameInputRef.current?.click()}
                        className="w-full h-24 rounded-xl border border-dashed border-white/20 bg-white/4 hover:bg-white/8 flex flex-col items-center justify-center gap-1 text-white/60 hover:text-white transition-all overflow-hidden"
                      >
                        {firstFramePreview ? (
                          <img src={firstFramePreview} alt="First frame" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload size={16} />
                            <span className="text-[10px]">Upload First Frame</span>
                          </>
                        )}
                      </button>
                    </div>

                    {selectedMode === 'FL2VA' && (
                      <div>
                        <span className="text-[11px] font-semibold text-white/70 mb-1.5 block">Last Frame (End)</span>
                        <input
                          type="file"
                          ref={lastFrameInputRef}
                          accept="image/*"
                          onChange={handleLastFrameChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => lastFrameInputRef.current?.click()}
                          className="w-full h-24 rounded-xl border border-dashed border-white/20 bg-white/4 hover:bg-white/8 flex flex-col items-center justify-center gap-1 text-white/60 hover:text-white transition-all overflow-hidden"
                        >
                          {lastFramePreview ? (
                            <img src={lastFramePreview} alt="Last frame" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <Upload size={16} />
                              <span className="text-[10px]">Upload Last Frame</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Parameters & Live Generation Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-2xl bg-white/4 border border-white/8 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                    <Sliders size={15} className="text-pink-400" />
                    <span>H3 Engine Specifications</span>
                  </div>

                  {/* Resolution & Ratio */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Resolution</label>
                      <select
                        value={resolution}
                        onChange={e => setResolution(e.target.value as MiniMaxH3Resolution)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/6 border border-white/12 text-xs text-white focus:outline-none"
                      >
                        <option value="768p" className="bg-[#1a1d26]">768p (Fast)</option>
                        <option value="1080p" className="bg-[#1a1d26]">1080p HD</option>
                        <option value="2K" className="bg-[#1a1d26]">2K Ultra (Default)</option>
                        <option value="4K" className="bg-[#1a1d26]">4K Master</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-white/60 block mb-1">Aspect Ratio</label>
                      <select
                        value={ratio}
                        onChange={e => setRatio(e.target.value as MiniMaxH3Ratio)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white/6 border border-white/12 text-xs text-white focus:outline-none"
                      >
                        <option value="16:9" className="bg-[#1a1d26]">16:9 (Landscape)</option>
                        <option value="9:16" className="bg-[#1a1d26]">9:16 (Shorts/Reels)</option>
                        <option value="1:1" className="bg-[#1a1d26]">1:1 (Square)</option>
                        <option value="4:3" className="bg-[#1a1d26]">4:3 (Standard)</option>
                        <option value="21:9" className="bg-[#1a1d26]">21:9 (Anamorphic)</option>
                      </select>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[11px] text-white/60 block mb-1.5">Clip Duration</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDuration(5)}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          duration === 5 ? 'bg-pink-500/20 border-pink-500 text-pink-300' : 'bg-white/4 border-white/8 text-white/60'
                        }`}
                      >
                        5 Seconds
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuration(10)}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          duration === 10 ? 'bg-pink-500/20 border-pink-500 text-pink-300' : 'bg-white/4 border-white/8 text-white/60'
                        }`}
                      >
                        10 Seconds (Full)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Generation Result Player / Progress Box */}
                <div className="rounded-2xl bg-black/60 border border-white/10 overflow-hidden relative min-h-[220px] flex flex-col items-center justify-center">
                  {isGenerating ? (
                    <div className="p-6 text-center space-y-3 w-full max-w-xs">
                      <RefreshCw size={28} className="text-pink-400 animate-spin mx-auto" />
                      <div>
                        <div className="text-sm font-bold text-white">Synthesizing 2K Video + Audio</div>
                        <div className="text-xs text-white/50 mt-0.5">
                          {taskStatus?.status === 'Queued' ? 'Job queued in H3 cluster...' : 'Generating multimodal frames and audio sync...'}
                        </div>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-purple-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${taskStatus?.progress || 35}%` }}
                        />
                      </div>
                    </div>
                  ) : generatedVideoUrl ? (
                    <div className="relative w-full h-full flex flex-col">
                      <video
                        ref={videoRef}
                        src={generatedVideoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-48 sm:h-56 object-cover bg-black"
                      />
                      <div className="p-3 bg-white/5 border-t border-white/8 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={13} /> 2K Video Ready
                        </span>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={generatedVideoUrl}
                            download="minimax_h3_video.mp4"
                            className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                            title="Download MP4"
                          >
                            <Download size={14} />
                          </a>
                          {onInsertVideoToChat && (
                            <button
                              type="button"
                              onClick={handleInsert}
                              className="px-2.5 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Send size={12} /> Insert to Chat
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-2 text-white/40">
                      <Video size={36} className="mx-auto text-white/20" />
                      <p className="text-xs">Configure your multimodal prompt and click Generate to run MiniMax-H3</p>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-white/4">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>MiniMax Open Platform V2 Ready</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={isGenerating || !visualDescription.trim()}
                onClick={handleGenerate}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-black font-bold text-xs shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate H3 Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
