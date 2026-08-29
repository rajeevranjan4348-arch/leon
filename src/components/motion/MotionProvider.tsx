import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useSettingsStore } from '@/lib/settingsStore';

interface MotionContextType {
  reduceMotion: boolean;
  isTouchDevice: boolean;
  enableCustomCursor: boolean;
  enableMagneticButtons: boolean;
  enableParallax: boolean;
  enableSmoothTransitions: boolean;
  setEnableCustomCursor: (enable: boolean) => void;
  fps: number;
}

const MotionContext = createContext<MotionContextType>({
  reduceMotion: false,
  isTouchDevice: false,
  enableCustomCursor: true,
  enableMagneticButtons: true,
  enableParallax: true,
  enableSmoothTransitions: true,
  setEnableCustomCursor: () => {},
  fps: 60,
});

export const useMotionConfig = () => useContext(MotionContext);

interface MotionProviderProps {
  children: React.ReactNode;
}

export const MotionProvider: React.FC<MotionProviderProps> = ({ children }) => {
  const { settings, setSetting } = useSettingsStore();
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [fps, setFps] = useState(60);

  // Detect system prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Detect touch device
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkTouch = () => {
      const hasTouchScreen =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(hasTouchScreen);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch, { passive: true });
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Simple, low-overhead FPS monitor for dynamic animation scaling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const checkFps = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }
      animId = requestAnimationFrame(checkFps);
    };

    animId = requestAnimationFrame(checkFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  const reduceMotion = Boolean(settings.reduceMotion || systemReducedMotion);
  const enableCustomCursor = Boolean(
    !reduceMotion &&
    !isTouchDevice &&
    (settings.customCursorEnabled ?? true)
  );
  const enableMagneticButtons = Boolean(!reduceMotion && !isTouchDevice);
  const enableParallax = Boolean(!reduceMotion && !isTouchDevice && fps >= 45);
  const enableSmoothTransitions = !reduceMotion;

  const setEnableCustomCursor = (enable: boolean) => {
    setSetting('customCursorEnabled', enable);
  };

  const contextValue = useMemo<MotionContextType>(
    () => ({
      reduceMotion,
      isTouchDevice,
      enableCustomCursor,
      enableMagneticButtons,
      enableParallax,
      enableSmoothTransitions,
      setEnableCustomCursor,
      fps,
    }),
    [
      reduceMotion,
      isTouchDevice,
      enableCustomCursor,
      enableMagneticButtons,
      enableParallax,
      enableSmoothTransitions,
      fps,
    ]
  );

  return (
    <MotionContext.Provider value={contextValue}>
      {children}
    </MotionContext.Provider>
  );
};
