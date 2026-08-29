import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  ChevronDown,
  ChevronUp,
  Key,
  Globe,
  Zap,
  Sparkles,
  X
} from 'lucide-react';
import {
  getHealthStatuses,
  checkAllServicesHealth,
  subscribeHealthUpdates,
  ServiceHealthStatus
} from '@/lib/serviceHealth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ServiceHealthWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
}

export const ServiceHealthWidget: React.FC<ServiceHealthWidgetProps> = ({
  className,
  defaultExpanded = false
}) => {
  const [statuses, setStatuses] = useState<ServiceHealthStatus[]>(() => getHealthStatuses());
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeHealthUpdates(() => {
      setStatuses(getHealthStatuses());
    });
    return () => unsubscribe();
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    toast.info('Pinging API endpoints...');
    await checkAllServicesHealth();
    setIsRefreshing(false);
    toast.success('Service health check updated');
  };

  const healthyCount = statuses.filter((s) => s.status === 'healthy').length;
  const avgLatency = Math.round(
    statuses.reduce((acc, s) => acc + (s.latencyMs || 0), 0) / (statuses.length || 1)
  );

  return (
    <div
      className={cn(
        'relative z-20 flex flex-col transition-all duration-300',
        className
      )}
    >
      {/* Compact Floating Status Pill */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="group flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-black/60 hover:bg-black/80 border border-white/15 backdrop-blur-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  healthyCount === statuses.length
                    ? 'bg-emerald-400'
                    : healthyCount > 0
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                )}
              />
              <span
                className={cn(
                  'relative inline-flex rounded-full h-2.5 w-2.5',
                  healthyCount === statuses.length
                    ? 'bg-emerald-500'
                    : healthyCount > 0
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                )}
              />
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              API Service Health
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-white/10 text-cyan-300 border border-white/10">
              {avgLatency}ms avg
            </span>
          </div>
        </div>

        {/* Live Service Dots */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {statuses.map((s) => (
              <span
                key={s.id}
                title={`${s.name}: ${s.statusMessage}`}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  s.status === 'healthy'
                    ? 'bg-emerald-400'
                    : s.status === 'checking'
                    ? 'bg-cyan-400 animate-pulse'
                    : s.status === 'degraded'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshAll();
            }}
            className={cn(
              'p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer',
              isRefreshing && 'animate-spin text-cyan-400'
            )}
            title="Ping All Services"
          >
            <RefreshCw size={13} />
          </button>

          <div className="text-white/50 group-hover:text-white transition-colors">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
      </div>

      {/* Expanded Floating Diagnostic Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="mt-2.5 p-4 rounded-3xl bg-[#0d0f18]/95 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col gap-3 text-white w-full"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Wifi size={15} className="text-cyan-400" />
                <span className="text-xs font-bold tracking-tight text-white">
                  Latency & Status Diagnostics
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* List of Configured Services */}
            <div className="flex flex-col gap-2">
              {statuses.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full flex-shrink-0',
                        service.status === 'healthy'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                          : service.status === 'checking'
                          ? 'bg-cyan-400 animate-pulse'
                          : service.status === 'degraded'
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'bg-rose-500'
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-white leading-tight">
                        {service.name}
                      </span>
                      <span className="text-[10px] text-white/50">
                        {service.provider}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border',
                        service.status === 'healthy'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : service.status === 'checking'
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      )}
                    >
                      {service.latencyMs ? `${service.latencyMs}ms` : '---'}
                    </span>

                    <span
                      className="px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-white/5 text-white/60 border border-white/10 uppercase"
                      title={`Key Source: ${service.keySource}`}
                    >
                      {service.keySource === 'custom'
                        ? 'Custom Key'
                        : service.keySource === 'env'
                        ? 'Env Key'
                        : 'Active Key'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Status Footer */}
            <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span>Gemini, NVIDIA & MiniMax APIs Configured</span>
              </span>
              <button
                onClick={handleRefreshAll}
                disabled={isRefreshing}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={11} className={cn(isRefreshing && 'animate-spin')} />
                <span>Ping Now</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
