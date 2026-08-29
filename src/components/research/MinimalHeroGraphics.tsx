import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ParallaxContainer, TextReveal } from '@/components/motion';

interface MinimalHeroGraphicsProps {
  onSelectPrompt?: (prompt: string, mode?: 'chat' | 'search' | 'research') => void;
  className?: string;
}

export const MinimalHeroGraphics: React.FC<MinimalHeroGraphicsProps> = ({
  className,
}) => {
  return (
    <div className={cn('w-full flex flex-col items-center select-none', className)}>
      {/* ── Parallax Responsive Orbital Graphic ── */}
      <ParallaxContainer strength={14}>
        <div className="relative mb-6 flex items-center justify-center">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-indigo-500/10 blur-2xl pointer-events-none" />

          {/* Outer Kinetic Orbital Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 rounded-full border border-dashed border-white/10 flex items-center justify-center p-2"
          >
            {/* Orbiting Micro-Node */}
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute -top-0.5 shadow-sm shadow-cyan-400" />
          </motion.div>

          {/* Inner Counter-Rotating Ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute w-16 h-16 rounded-full border border-white/15 flex items-center justify-center"
          >
            <div className="w-1 h-1 rounded-full bg-purple-400 absolute -bottom-0.5 shadow-sm shadow-purple-400" />
          </motion.div>

          {/* Center Minimal Geometric Core */}
          <motion.div
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="absolute w-10 h-10 rounded-2xl bg-[#141620] border border-white/20 flex items-center justify-center shadow-lg shadow-black/40 backdrop-blur-md cursor-pointer"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white/90"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M101.008 42L190.99 124.905V124.886V42.1913H208.506V125.276L298.891 42V136.524H336V272.866H299.005V357.035L208.506 277.525V357.948H190.99V278.836L101.11 358V272.866H64V136.524H101.008V42ZM177.785 153.826H81.5159V255.564H101.088V223.472L177.785 153.826ZM118.625 231.149V319.392L190.99 255.655V165.421L118.625 231.149ZM209.01 254.812V165.336L281.396 231.068V272.866H281.489V318.491L209.01 254.812ZM299.005 255.564H318.484V153.826H222.932L299.005 222.751V255.564ZM281.375 136.524V81.7983L221.977 136.524H281.375ZM177.921 136.524H118.524V81.7983L177.921 136.524Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
        </div>
      </ParallaxContainer>

      {/* ── Brand Title with Text Reveal ── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white/95 font-sans flex items-center justify-center">
          <TextReveal text="Rishi" delay={0.1} />
        </h1>
      </div>
    </div>
  );
};

