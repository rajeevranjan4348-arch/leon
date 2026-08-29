import React, { useState, useEffect, useRef } from 'react';
import { X, Gauge, Zap, Activity, Cpu, Monitor, CheckCircle, ShieldAlert, Layers, Clock, AlertTriangle, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { frameRateEngine, FrameRateMetrics } from '@/lib/performance/FrameRateEngine';

interface FpsBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FpsBoostModal: React.FC<FpsBoostModalProps> = ({ isOpen, onClose }) => {
  const [boostEnabled, setBoostEnabled] = useState(true);
  const [metrics, setMetrics] = useState<FrameRateMetrics>(() => frameRateEngine.getMetrics());
  const [targetFPS, setTargetFPS] = useState<number>(() => {
    const m = frameRateEngine.getMetrics();
    return m.detectedHz >= 144 ? 144 : (m.detectedHz >= 120 ? 120 : (m.detectedHz >= 90 ? 90 : 60));
  });
  const [renderMode, setRenderMode] = useState<'Normal' | 'Optimized' | 'Paused'>('Optimized');
  const [systemStatus, setSystemStatus] = useState<'Standby' | 'Active' | 'Reconfigured'>('Active');
  
  const [graphBars, setGraphBars] = useState<number[]>(() =>
    Array.from({ length: 30 }, () => 20 + Math.random() * 40)
  );

  // Subscribe to real hardware engine metrics
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = frameRateEngine.addListener((newMetrics) => {
      setMetrics(newMetrics);
      
      // Update live graph bars based on actual frame time / FPS
      setGraphBars(prev => {
        const next = [...prev.slice(1)];
        const targetBudget = newMetrics.targetFrameBudgetMs || 6.94;
        // Calculate efficiency % (closer to 100% when frame time matches or beats budget)
        const frameEfficiency = Math.min(100, Math.max(10, Math.round((newMetrics.currentFPS / (targetFPS || 144)) * 100)));
        next.push(frameEfficiency);
        return next;
      });
    });

    return unsubscribe;
  }, [isOpen, targetFPS]);

  // Page visibility optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && boostEnabled) {
        setRenderMode('Paused');
      } else if (boostEnabled) {
        setRenderMode('Optimized');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [boostEnabled]);

  const toggleBoost = () => {
    if (!boostEnabled) {
      setBoostEnabled(true);
      frameRateEngine.setTargetFPS(targetFPS);
      setRenderMode('Optimized');
      setSystemStatus('Active');
      toast.success(`High Refresh Rate Boost Activated (${targetFPS} FPS / ${metrics.targetFrameBudgetMs}ms budget)`);
    } else {
      setBoostEnabled(false);
      frameRateEngine.setTargetFPS(60);
      setRenderMode('Normal');
      setSystemStatus('Standby');
      toast.info('FPS Boost Disabled (Standard 60 FPS mode)');
    }
  };

  const handleSelectTarget = (fps: number) => {
    setTargetFPS(fps);
    frameRateEngine.setTargetFPS(fps);
    if (boostEnabled) {
      setSystemStatus('Reconfigured');
      setTimeout(() => setSystemStatus('Active'), 400);
      const budget = (1000 / fps).toFixed(2);
      toast.success(`Target frame rate updated to ${fps} FPS (~${budget} ms/frame budget)`);
    }
  };

  if (!isOpen) return null;

  const displayHzLabel = `${metrics.detectedHz}Hz ${metrics.detectedHz >= 144 ? '(144Hz Ultra High)' : metrics.detectedHz >= 120 ? '(120Hz High Dynamic)' : metrics.detectedHz >= 90 ? '(90Hz Smooth)' : '(60Hz Standard)'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={cn(
          "w-full max-w-[520px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 relative select-none",
          "bg-[#050505] text-white border border-neutral-800 shadow-2xl",
          "radial-gradient-bg"
        )}
        style={{
          background: 'radial-gradient(circle at 50% -10%, rgba(90,90,90,0.22), transparent 40%), #050505'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Close FPS Controller"
        >
          <X size={18} />
        </button>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 pr-8">
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Gauge className="text-emerald-400" size={24} />
              <span>Performance</span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              144Hz High-Refresh-Rate & FPS Controller Engine
            </div>
          </div>

          <div className="text-[10px] font-bold tracking-wider px-2.5 py-1 border border-neutral-800 rounded-full text-emerald-400 bg-neutral-900/80 uppercase">
            {metrics.detectedHz >= 120 ? '144Hz READY' : 'ACTIVE'}
          </div>
        </div>

        {/* LIVE FPS CARD */}
        <div
          className={cn(
            "relative overflow-hidden border rounded-3xl p-6 transition-all duration-300",
            boostEnabled
              ? "bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border-neutral-700 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              : "bg-gradient-to-br from-[#111111] to-[#080808] border-neutral-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          )}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          <div className="text-xs font-semibold tracking-wider text-neutral-500 uppercase flex items-center justify-between">
            <span>LIVE MEASURED FRAME RATE</span>
            <Activity size={14} className={boostEnabled ? "text-emerald-400 animate-pulse" : "text-neutral-600"} />
          </div>

          <div className={cn("mt-1 text-7xl font-black tracking-tighter leading-none flex items-baseline gap-1.5", boostEnabled && "animate-pulse")}>
            <span>{metrics.currentFPS}</span>
            <span className="text-lg font-normal tracking-normal text-neutral-500">FPS</span>
          </div>

          <div className="mt-3.5 flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full transition-all duration-300", boostEnabled ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-neutral-600")} />
              <span className="font-medium">{boostEnabled ? `${targetFPS} FPS target active` : 'Boost disabled'}</span>
            </div>
            <div className="font-mono text-[11px] text-neutral-400">
              Frame Time: <span className="text-white font-bold">{metrics.frameTimeMs}ms</span> (Budget: {metrics.targetFrameBudgetMs}ms)
            </div>
          </div>

          {/* FPS LIVE GRAPH */}
          <div className="mt-5 h-[55px] flex items-end gap-1">
            {graphBars.map((height, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 min-h-[4px] rounded-t-sm transition-all duration-150",
                  boostEnabled ? (height > 85 ? "bg-emerald-400" : "bg-neutral-300") : "bg-neutral-600"
                )}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* MAIN TOGGLE */}
        <div className="mt-5 p-5 border border-neutral-800 rounded-2xl bg-[#0d0d0d] flex justify-between items-center">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Zap size={16} className={boostEnabled ? "text-amber-400" : "text-neutral-500"} />
              <span>144Hz Smooth Refresh Engine</span>
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Synchronize RAF loops, optimize GPU transforms & scroll rendering
            </div>
          </div>

          {/* Switch Toggle */}
          <button
            type="button"
            onClick={toggleBoost}
            className={cn(
              "w-[61px] h-[34px] rounded-full border p-1 cursor-pointer transition-colors duration-250 shrink-0",
              boostEnabled ? "bg-neutral-100 border-white" : "bg-[#252525] border-neutral-700"
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full transition-transform duration-250 shadow-md",
                boostEnabled ? "translate-x-[27px] bg-[#050505]" : "translate-x-0 bg-neutral-500"
              )}
            />
          </button>
        </div>

        {/* REFRESH RATE OPTIONS */}
        <div className="mt-6">
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2.5 flex justify-between items-center">
            <span>Target refresh rate</span>
            <span className="text-[10px] text-neutral-400 font-mono">Hardware: {metrics.detectedHz}Hz</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[60, 90, 120, 144].map(fps => (
              <button
                key={fps}
                type="button"
                onClick={() => handleSelectTarget(fps)}
                className={cn(
                  "border bg-[#0c0c0c] rounded-2xl py-3 px-1.5 text-center transition-all cursor-pointer",
                  targetFPS === fps
                    ? "border-neutral-500 bg-[#171717] shadow-[inset_0_0_20px_rgba(255,255,255,0.03)] text-white scale-[1.02]"
                    : "border-neutral-800/80 hover:border-neutral-700 text-neutral-400"
                )}
              >
                <strong className="block text-base font-bold">{fps}</strong>
                <small className="text-[8px] text-neutral-500 font-mono uppercase tracking-wider">
                  {fps === 144 ? '6.94ms' : fps === 120 ? '8.33ms' : fps === 90 ? '11.1ms' : '16.6ms'}
                </small>
              </button>
            ))}
          </div>
        </div>

        {/* PERFORMANCE INFO GRID */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-[#0c0c0c] border border-neutral-800/60">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor size={12} />
              <span>DISPLAY HARDWARE</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white truncate">{displayHzLabel}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0c0c0c] border border-neutral-800/60">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={12} />
              <span>FRAME BUDGET</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-mono">{metrics.targetFrameBudgetMs} ms/frame</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0c0c0c] border border-neutral-800/60">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={12} />
              <span>RENDER PIPELINE</span>
            </div>
            <div className={cn("mt-1 text-sm font-bold", renderMode === 'Optimized' ? "text-emerald-400" : renderMode === 'Paused' ? "text-amber-400" : "text-white")}>
              {renderMode} (144Hz Sync)
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0c0c0c] border border-neutral-800/60">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={12} />
              <span>DROPPED / LONG TASKS</span>
            </div>
            <div className="mt-1 text-sm font-bold text-white font-mono">
              {metrics.droppedFramesCount} drops • {metrics.longTasksCount} long
            </div>
          </div>
        </div>

        {/* MEMORY & PERFORMANCE TELEMETRY ACCORDION */}
        <div className="mt-5 p-4 rounded-2xl bg-[#080808] border border-neutral-800/80 text-[11px] font-mono text-neutral-400 space-y-1.5">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between font-sans">
            <div className="flex items-center gap-1.5">
              <Layers size={12} />
              <span>REALTIME PERFORMANCE TELEMETRY</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold">PASSIVE GPU PIPELINE</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-neutral-500 block">Frame Jitter</span>
              <span className="text-white font-bold">{metrics.jitterMs} ms</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-neutral-500 block">Memory Heap</span>
              <span className="text-white font-bold">{metrics.memoryUsedMB ? `${metrics.memoryUsedMB} MB / ${metrics.memoryTotalMB} MB` : 'Standard'}</span>
            </div>
          </div>

          <div className="text-center font-bold text-neutral-300 pt-1">144Hz Hardware Synchronized Pipeline</div>
          <div className="text-center text-neutral-600">│</div>
          <div className="text-center text-neutral-400">├── 60 FPS (16.6ms) │ 90 FPS (11.1ms) │ 120 FPS (8.3ms) │ 144 FPS (6.94ms)</div>
          <div className="text-center text-neutral-600">│</div>
          <div className="text-center text-emerald-400 font-semibold">▼ Central requestAnimationFrame Coordinator</div>
          <div className="text-center text-neutral-600">└──────┬──────┘</div>
          <div className="text-center text-emerald-300 font-bold uppercase tracking-wider">
            {boostEnabled ? `▼ 144Hz ENGINE ACTIVE (${metrics.targetFrameBudgetMs}MS/FRAME)` : "▼ STANDBY"}
          </div>
        </div>

        {/* MAIN OPTIMIZE ACTION BUTTON */}
        <button
          type="button"
          onClick={toggleBoost}
          className={cn(
            "mt-6 w-full py-4 px-4 rounded-2xl font-extrabold text-sm transition-all cursor-pointer shadow-lg active:scale-[0.98]",
            boostEnabled
              ? "bg-neutral-600 hover:bg-neutral-500 text-white"
              : "bg-neutral-200 hover:bg-white text-black"
          )}
        >
          {boostEnabled ? 'BOOST ACTIVE (CLICK TO DISABLE)' : 'ACTIVATE 144Hz BOOST'}
        </button>
      </div>
    </div>
  );
};

