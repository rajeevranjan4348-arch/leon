import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Video,
  Upload,
  Play,
  Download,
  Share2,
  Copy,
  X,
  RefreshCw,
  Check,
  Wand2,
  Image as ImageIcon,
  Layers,
  Sliders,
  Box,
  User,
  Film,
  Flame,
  ArrowRight
} from 'lucide-react';
import {
  VEO3_PRESETS,
  Veo3MotionPreset,
  Veo3GenerationResult,
  animateImageWithVeo3,
  getVeo3VideoHistory
} from '@/lib/services/veo3VideoService';
import { toast } from 'sonner';

interface Veo3ImageToVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialImage?: string;
  onSendToChat?: (videoUrl: string, prompt: string) => void;
}

export const Veo3ImageToVideoModal: React.FC<Veo3ImageToVideoModalProps> = ({
  isOpen,
  onClose,
  initialImage,
  onSendToChat
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(initialImage || null);
  const [selectedPreset, setSelectedPreset] = useState<Veo3MotionPreset>(VEO3_PRESETS[0]);
  const [customPrompt, setCustomPrompt] = useState<string>(VEO3_PRESETS[0].defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [duration, setDuration] = useState<5 | 10>(5);
  const [motionIntensity, setMotionIntensity] = useState<'subtle' | 'smooth' | 'dynamic' | 'intense'>('dynamic');

  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [resultVideo, setResultVideo] = useState<Veo3GenerationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const b64 = evt.target?.result as string;
      setSelectedImage(b64);
      setResultVideo(null);
      toast.success('Image loaded for Veo 3 animation!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: Veo3MotionPreset) => {
    setSelectedPreset(preset);
    setCustomPrompt(preset.defaultPrompt);
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      toast.error('Please upload or select an image first!');
      return;
    }

    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStage('Initializing Veo 3 Neural Renderer...');

    try {
      const res = await animateImageWithVeo3(
        {
          imageSource: selectedImage,
          presetId: selectedPreset.id,
          customPrompt,
          aspectRatio,
          durationSeconds: duration,
          motionIntensity
        },
        (stage, percent) => {
          setProgressStage(stage);
          setProgressPercent(percent);
        }
      );

      setResultVideo(res);
      toast.success('Veo 3 Video Animation Ready!');
    } catch (err: any) {
      toast.error('Failed to animate image: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!resultVideo) return;
    navigator.clipboard.writeText(resultVideo.videoUrl);
    setCopied(true);
    toast.success('Video link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToChat = () => {
    if (!resultVideo) return;
    if (onSendToChat) {
      onSendToChat(resultVideo.videoUrl, resultVideo.promptUsed);
      toast.success('Sent Veo 3 video to Chat!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-zinc-900 to-black border border-purple-500/30 rounded-3xl shadow-2xl text-white p-6 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles size={22} className="text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">
                    Veo 3 Image-to-Video Animator
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    60 FPS AI
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Bring product photos to life as dynamic video ads or animate character portraits
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Image & Settings (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Image Input Container */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Source Image</span>
                  {selectedImage && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Change Image
                    </button>
                  )}
                </label>

                <div
                  onClick={() => !selectedImage && fileInputRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center min-h-[220px] transition-all cursor-pointer overflow-hidden ${
                    selectedImage
                      ? 'border-purple-500/50 bg-black/40'
                      : 'border-white/20 bg-white/5 hover:border-purple-400/60 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {selectedImage ? (
                    <div className="relative w-full h-[220px] flex items-center justify-center rounded-xl overflow-hidden group">
                      <img
                        src={selectedImage}
                        alt="Source Preview"
                        className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-medium flex items-center gap-1"
                        >
                          <Upload size={14} /> Upload New
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 p-4">
                      <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-sm font-medium text-zinc-200">
                        Click or drag a photo here
                      </p>
                      <p className="text-xs text-zinc-400 max-w-xs">
                        Upload a product photo, portrait, model shot, or landscape to generate a Veo 3 video ad.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preset Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Select Animation Style
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  {VEO3_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedPreset.id === preset.id
                          ? 'bg-purple-500/20 border-purple-500/80 shadow-md shadow-purple-500/10'
                          : 'bg-zinc-900/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="text-xs font-bold text-white line-clamp-1">{preset.name}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Override */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Veo 3 Motion Prompt</span>
                  <span className="text-[10px] text-purple-400">AI Guided</span>
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-purple-500/80 resize-none placeholder-zinc-500"
                  placeholder="Describe camera movement, lighting, motion effects..."
                />
              </div>

              {/* Controls: Aspect Ratio & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-1.5 p-1 bg-zinc-900/90 border border-white/10 rounded-xl">
                    {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          aspectRatio === ratio
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Video Length
                  </label>
                  <div className="flex gap-1.5 p-1 bg-zinc-900/90 border border-white/10 rounded-xl">
                    {([5, 10] as const).map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setDuration(sec)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          duration === sec
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {sec} Seconds
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedImage}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-bold text-sm transition-all shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Rendering Veo 3 Motion...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    <span>Generate Veo 3 Video Animation</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Progress & Output Video Player (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Video Preview Output
              </label>

              <div className="flex-1 bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
                {isGenerating ? (
                  <div className="w-full space-y-4 text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center mx-auto animate-pulse">
                      <Sparkles size={30} className="text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">
                        {progressStage}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Veo 3 Temporal Frame Synthesis ({progressPercent}%)
                      </p>
                    </div>

                    <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : resultVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                    <div className="relative w-full rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black">
                      <video
                        src={resultVideo.videoUrl}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        poster={resultVideo.thumbnailUrl}
                        className="w-full max-h-[260px] object-cover rounded-xl"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-purple-300 border border-purple-500/40">
                        Veo 3 AI 60fps
                      </div>
                    </div>

                    {/* Video Actions */}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <a
                        href={resultVideo.videoUrl}
                        download={`veo3_animation_${resultVideo.id}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download size={14} /> Download MP4
                      </a>

                      <button
                        onClick={handleCopyLink}
                        className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy Link'}
                      </button>
                    </div>

                    {onSendToChat && (
                      <button
                        onClick={handleShareToChat}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Share2 size={15} /> Send to AI Chat
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-zinc-500 space-y-2 p-6">
                    <Film size={36} className="mx-auto text-zinc-600" />
                    <p className="text-xs">Your generated Veo 3 dynamic video ad will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
