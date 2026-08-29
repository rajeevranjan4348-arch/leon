import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

interface MediaLightboxProps {
  media: {
    url: string;
    type: 'image' | 'video' | 'pdf' | 'file';
    name?: string;
  } | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ media, onClose }) => {
  if (!media) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex flex-col bg-black/95 backdrop-blur-2xl p-4 select-none"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 z-10">
          <div className="flex items-center gap-2 text-white truncate max-w-md">
            <span className="text-sm font-medium truncate">{media.name || 'Attachment'}</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={media.url}
              download={media.name || 'attachment'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download Media"
            >
              <Download size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden">
          {media.type === 'image' && (
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              src={media.url}
              alt={media.name || 'Image'}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
            />
          )}

          {media.type === 'video' && (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl"
            />
          )}

          {media.type === 'pdf' && (
            <div className="w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 flex flex-col items-center justify-center p-6 text-center">
              <FileText size={64} className="text-red-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{media.name || 'PDF Document'}</h3>
              <p className="text-sm text-white/60 mb-6">Preview and read document in new window</p>
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                <ExternalLink size={16} />
                <span>Open PDF Document</span>
              </a>
            </div>
          )}

          {media.type === 'file' && (
            <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900 border border-white/15 text-center flex flex-col items-center">
              <FileText size={56} className="text-cyan-400 mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">{media.name || 'Attached File'}</h3>
              <p className="text-xs text-white/50 mb-6">File attachment</p>
              <a
                href={media.url}
                download={media.name || 'file'}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-600 text-black font-semibold transition-colors"
              >
                <Download size={16} />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
