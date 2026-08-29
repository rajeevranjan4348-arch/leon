import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles, Contrast } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getSetting, setSetting, subscribeSettings } from '@/lib/settingsStore';

interface ThemeSwitcherProps {
  variant?: 'button' | 'segmented' | 'dropdown' | 'pill';
  className?: string;
  showLabel?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'button',
  className,
  showLabel = false,
}) => {
  const [currentTheme, setCurrentTheme] = React.useState<'dark' | 'light' | 'system' | 'chatgpt-minimal'>(() => {
    return (getSetting('theme') as 'dark' | 'light' | 'system' | 'chatgpt-minimal') || 'dark';
  });

  React.useEffect(() => {
    const unsub = subscribeSettings((newSettings) => {
      setCurrentTheme(newSettings.theme || 'dark');
    });
    return unsub;
  }, []);

  const handleSelectTheme = (theme: 'dark' | 'light' | 'system' | 'chatgpt-minimal') => {
    setSetting('theme', theme);
    setCurrentTheme(theme);
    
    const root = document.documentElement;
    if (theme === 'chatgpt-minimal') {
      root.classList.add('chatgpt-minimal', 'dark');
      root.classList.remove('light', 'light-high-contrast');
      root.setAttribute('data-theme', 'chatgpt-minimal');
      toast.success('ChatGPT Minimal Mode activated', { icon: '✨' });
    } else if (theme === 'light') {
      root.classList.add('light', 'light-high-contrast');
      root.classList.remove('dark', 'chatgpt-minimal');
      root.setAttribute('data-theme', 'high-contrast-light');
      toast.success('High-Contrast Light Mode activated', { icon: '☀️' });
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light', 'light-high-contrast', 'chatgpt-minimal');
      root.setAttribute('data-theme', 'dark');
      toast.success('Dark Mode activated', { icon: '🌙' });
    } else {
      root.classList.remove('chatgpt-minimal');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light', 'light-high-contrast');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.add('light', 'light-high-contrast');
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'high-contrast-light');
      }
      toast.success('System Theme mode active', { icon: '💻' });
    }
  };

  const toggleTheme = () => {
    const sequence: ('dark' | 'chatgpt-minimal' | 'light' | 'system')[] = ['dark', 'chatgpt-minimal', 'light', 'system'];
    const currentIndex = sequence.indexOf(currentTheme);
    const nextTheme = sequence[(currentIndex + 1) % sequence.length];
    handleSelectTheme(nextTheme);
  };

  const isLight = currentTheme === 'light';
  const isMinimal = currentTheme === 'chatgpt-minimal';

  if (variant === 'segmented') {
    return (
      <div className={cn("flex flex-wrap items-center p-1 bg-black/20 dark:bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 rounded-2xl gap-1", className)}>
        <button
          type="button"
          onClick={() => handleSelectTheme('dark')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            currentTheme === 'dark'
              ? "bg-white/15 dark:bg-white/20 text-white shadow-sm border border-white/10"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Moon size={13} />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTheme('chatgpt-minimal')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            currentTheme === 'chatgpt-minimal'
              ? "bg-emerald-500/25 text-emerald-300 shadow-sm border border-emerald-400/40"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Sparkles size={13} className="text-emerald-400" />
          <span>ChatGPT Minimal</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTheme('light')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            currentTheme === 'light'
              ? "bg-amber-400 text-black shadow-md font-bold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Sun size={13} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectTheme('system')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
            currentTheme === 'system'
              ? "bg-cyan-500/30 text-cyan-200 shadow-sm border border-cyan-400/30"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <Contrast size={13} />
          <span>System</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer rounded-full p-2 select-none group border",
        isLight
          ? "bg-black/5 hover:bg-black/10 text-neutral-900 border-black/15 shadow-sm"
          : isMinimal
            ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/30 shadow-sm"
            : "bg-white/10 hover:bg-white/20 text-white border-white/10 shadow-sm",
        className
      )}
      title={`Current Theme: ${currentTheme}. Click to cycle.`}
      aria-label="Toggle theme mode"
    >
      <motion.div
        key={currentTheme}
        initial={{ rotate: -90, scale: 0.7, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.7, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        {isLight ? (
          <Sun className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" strokeWidth={2.2} />
        ) : isMinimal ? (
          <Sparkles className="w-4.5 h-4.5 text-emerald-400" strokeWidth={2.2} />
        ) : currentTheme === 'system' ? (
          <Contrast className="w-4.5 h-4.5 text-cyan-300" strokeWidth={2} />
        ) : (
          <Moon className="w-4.5 h-4.5 text-cyan-300" strokeWidth={2} />
        )}
      </motion.div>

      {showLabel && (
        <span className="text-xs font-semibold tracking-wide">
          {isLight ? 'Light' : isMinimal ? 'ChatGPT' : currentTheme === 'system' ? 'System' : 'Dark'}
        </span>
      )}
    </button>
  );
};
