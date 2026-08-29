import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Flame, Sparkles } from 'lucide-react';

interface GifPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

const SAMPLE_GIFS = [
  { id: '1', title: 'Cheers', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&h=200&fit=crop' },
  { id: '2', title: 'Thumbs Up', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=200&fit=crop' },
  { id: '3', title: 'Celebration', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&h=200&fit=crop' },
  { id: '4', title: 'Excited', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&h=200&fit=crop' },
  { id: '5', title: 'Dancing', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop' },
  { id: '6', title: 'Mind Blown', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=200&fit=crop' },
];

export const GifPickerPopover: React.FC<GifPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectGif,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = SAMPLE_GIFS.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="absolute bottom-16 right-4 z-40 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/15 rounded-3xl p-3 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Flame size={14} className="text-amber-400" />
            <span>Trending GIFs</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-2.5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full pl-8 pr-3 py-1.5 bg-black/40 rounded-xl text-xs text-white placeholder:text-white/40 border border-white/10 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {filtered.map((gif) => (
            <div
              key={gif.id}
              onClick={() => {
                onSelectGif(gif.url);
                onClose();
              }}
              className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-cyan-400 transition-all"
            >
              <img src={gif.url} alt={gif.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
              <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-black/60 px-1 py-0.2 rounded backdrop-blur">
                {gif.title}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
