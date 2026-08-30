import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  Zap,
  Globe,
  Server,
  Cpu,
  Volume2,
  Image as ImageIcon,
  Search,
  Key,
  ShieldCheck,
  Clock,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  Play,
  Layers,
  BarChart2,
  Check,
  Terminal,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  getHealthStatuses,
  checkAllServicesHealth,
  checkSingleServiceHealth,
  subscribeHealthUpdates,
  getHealthLogs,
  clearHealthLogs,
  setAutoHealthMonitoring,
  getAutoHealthMonitoringInterval,
  ServiceHealthStatus,
  HealthLogEntry,
  ServiceId
} from '@/lib/serviceHealth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ApiHealthMonitoringViewProps {
  onNavigateToDeveloperTab?: () => void;
}

export const ApiHealthMonitoringView: React.FC<ApiHealthMonitoringViewProps> = ({
  onNavigateToDeveloperTab,
}) => {
  const [statuses, setStatuses] = useState<ServiceHealthStatus[]>(() => getHealthStatuses());
  const [logs, setLogs] = useState<HealthLogEntry[]>(() => getHealthLogs());
  const [isPingingAll, setIsPingingAll] = useState(false);
  const [pingingServiceId, setPingingServiceId] = useState<string | null>(null);
  const [autoPollInterval, setAutoPollIntervalState] = useState<number>(() =>
    getAutoHealthMonitoringInterval()
  );
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'llm' | 'voice' | 'image' | 'system' | 'search'>('all');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | ServiceId>('all');

  useEffect(() => {
    const unsubscribe = subscribeHealthUpdates(() => {
      setStatuses(getHealthStatuses());
      setLogs(getHealthLogs());
    });
    return () => unsubscribe();
  }, []);

  // Handle Refreshing all services
  const handlePingAll = async () => {
    setIsPingingAll(true);
    toast.info('Pinging all AI and Backend API endpoints...');
    await checkAllServicesHealth();
    setIsPingingAll(false);
    toast.success('API health & latency checks completed');
  };

  // Handle single service ping
  const handlePingSingle = async (id: ServiceId, e: React.MouseEvent) => {
    e.stopPropagation();
    setPingingServiceId(id);
    await checkSingleServiceHealth(id);
    setPingingServiceId(null);
    toast.success(`Ping test completed for ${id.toUpperCase()}`);
  };

  // Handle changing auto poll interval
  const handleAutoPollChange = (seconds: number) => {
    setAutoPollIntervalState(seconds);
    setAutoHealthMonitoring(seconds);
    if (seconds > 0) {
      toast.success(`Auto health monitoring set to every ${seconds}s`);
    } else {
      toast.info('Auto health monitoring disabled');
    }
  };

  // Calculations
  const totalServices = statuses.length;
  const healthyCount = statuses.filter((s) => s.status === 'healthy').length;
  const degradedCount = statuses.filter((s) => s.status === 'degraded').length;
  const offlineCount = statuses.filter((s) => s.status === 'offline').length;
  const avgLatency = Math.round(
    statuses.reduce((acc, s) => acc + (s.latencyMs || 0), 0) / (totalServices || 1)
  );
  const overallUptime = (
    statuses.reduce((acc, s) => acc + (s.uptimePercent || 99.9), 0) / (totalServices || 1)
  ).toFixed(2);

  // Filtered services
  const filteredStatuses = statuses.filter(
    (s) => selectedCategory === 'all' || s.category === selectedCategory
  );

  // Chart data for comparative latency
  const chartData = statuses.map((s) => ({
    name: s.name.split(' ')[0] + (s.name.split(' ')[1] ? ' ' + s.name.split(' ')[1] : ''),
    latency: s.latencyMs || 0,
    status: s.status,
    id: s.id,
  }));

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'llm':
        return <Cpu size={14} className="text-cyan-400" />;
      case 'voice':
        return <Volume2 size={14} className="text-purple-400" />;
      case 'image':
        return <ImageIcon size={14} className="text-pink-400" />;
      case 'system':
        return <Server size={14} className="text-emerald-400" />;
      case 'search':
        return <Search size={14} className="text-amber-400" />;
      default:
        return <Activity size={14} className="text-cyan-400" />;
    }
  };

  // Export JSON Report
  const handleExportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      overallHealth: healthyCount === totalServices ? 'Optimal' : 'Degraded',
      averageLatencyMs: avgLatency,
      systemUptime: `${overallUptime}%`,
      services: statuses,
      recentLogs: logs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-health-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Health monitoring report downloaded');
  };

  return (
    <div className="space-y-6 text-white">
      {/* ── Top Executive Status Banner ── */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-[#0e1322] to-purple-950/30 border border-cyan-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10 shrink-0">
              <Activity size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  API & Infrastructure Health Monitor
                </h3>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider',
                    healthyCount === totalServices
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : degradedCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  )}
                >
                  {healthyCount === totalServices ? '100% Operational' : `${healthyCount}/${totalServices} Online`}
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Continuous real-time ping probes, latency tracking, and failover diagnostics across all AI providers.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handlePingAll}
              disabled={isPingingAll}
              className={cn(
                'px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50'
              )}
            >
              <RefreshCw size={14} className={cn(isPingingAll && 'animate-spin')} />
              <span>{isPingingAll ? 'Pinging All...' : 'Ping All Endpoints'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportReport}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Export Health Diagnostic JSON Report"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-400" /> Healthy Nodes
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold font-mono text-emerald-400">{healthyCount}</span>
              <span className="text-xs text-white/40 font-mono">/ {totalServices}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={12} className="text-cyan-400" /> Average Latency
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold font-mono text-cyan-300">{avgLatency}</span>
              <span className="text-xs text-cyan-400/60 font-mono">ms</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-purple-400" /> Fleet Uptime
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold font-mono text-purple-300">{overallUptime}%</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-amber-400" /> Auto-Monitor
            </span>
            <div className="flex items-center gap-1 mt-1">
              {[
                { label: 'Off', val: 0 },
                { label: '15s', val: 15 },
                { label: '30s', val: 30 },
                { label: '60s', val: 60 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleAutoPollChange(opt.val)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-all cursor-pointer',
                    autoPollInterval === opt.val
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Category Filter Bar ── */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'llm', label: 'AI Language (LLM)' },
            { id: 'voice', label: 'Voice & Audio' },
            { id: 'image', label: 'Image Engine' },
            { id: 'system', label: 'Backend & WS' },
            { id: 'search', label: 'Search Engine' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer',
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-sm'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {onNavigateToDeveloperTab && (
          <button
            type="button"
            onClick={onNavigateToDeveloperTab}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Key size={13} />
            <span>Manage API Keys</span>
          </button>
        )}
      </div>

      {/* ── Real-Time Services Status Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredStatuses.map((service) => {
          const isExpanded = expandedServiceId === service.id;
          const isPinging = pingingServiceId === service.id || isPingingAll;

          return (
            <div
              key={service.id}
              onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
              className={cn(
                'p-4 rounded-3xl bg-[#0f121d]/90 border transition-all duration-200 cursor-pointer flex flex-col gap-3 group',
                service.status === 'healthy'
                  ? 'border-white/10 hover:border-emerald-500/40 hover:bg-[#121624]'
                  : service.status === 'degraded'
                  ? 'border-amber-500/30 hover:border-amber-500/50 bg-[#16131c]'
                  : 'border-rose-500/30 hover:border-rose-500/50 bg-[#1c1214]'
              )}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {getCategoryIcon(service.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                        {service.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase bg-white/5 text-white/50 border border-white/10">
                        {service.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50">{service.provider}</div>
                  </div>
                </div>

                {/* Right Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border flex items-center gap-1.5',
                      service.status === 'healthy'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : service.status === 'checking'
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        : service.status === 'degraded'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        service.status === 'healthy'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : service.status === 'checking'
                          ? 'bg-cyan-400 animate-ping'
                          : service.status === 'degraded'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      )}
                    />
                    <span>{service.latencyMs !== null ? `${service.latencyMs}ms` : '---'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handlePingSingle(service.id, e)}
                    disabled={isPinging}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                    title={`Ping ${service.name}`}
                  >
                    <RefreshCw size={12} className={cn(isPinging && 'animate-spin text-cyan-400')} />
                  </button>
                </div>
              </div>

              {/* Sparkline & Status Message */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-white/60 truncate max-w-[200px] sm:max-w-xs">
                  <span className="text-[11px] truncate">{service.statusMessage || 'Operational'}</span>
                </div>

                {/* Mini Latency Bars */}
                <div className="flex items-end gap-1 h-4">
                  {(service.latencyHistory || [100, 110, 95, 105, 90]).slice(-8).map((lat, idx) => {
                    const heightPercent = Math.min(100, Math.max(20, (lat / 300) * 100));
                    return (
                      <span
                        key={idx}
                        style={{ height: `${heightPercent}%` }}
                        title={`${lat}ms`}
                        className={cn(
                          'w-1 rounded-t-sm transition-all',
                          lat < 120 ? 'bg-emerald-400' : lat < 250 ? 'bg-cyan-400' : 'bg-amber-400'
                        )}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Expanded Technical Diagnostics */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-3 border-t border-white/10 flex flex-col gap-2.5 text-xs text-white/70"
                  >
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/5 font-mono text-[11px]">
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase">Endpoint</span>
                        <span className="text-white/90 truncate block">{service.endpointUrl}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase">Protocol</span>
                        <span className="text-cyan-300 block">{service.protocol || 'HTTPS'}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase">Key Source</span>
                        <span className="text-emerald-300 block capitalize">{service.keySource} Key</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase">Uptime Score</span>
                        <span className="text-purple-300 block">{service.uptimePercent || 99.9}%</span>
                      </div>
                    </div>

                    {service.modelsSupported && service.modelsSupported.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-white/40 uppercase font-semibold mr-1">
                          Models:
                        </span>
                        {service.modelsSupported.map((m) => (
                          <span
                            key={m}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-white/80"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Comparative Latency Benchmark Chart ── */}
      <div className="p-5 rounded-3xl bg-[#0d0f19] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Comparative Response Latency Benchmark (ms)
            </h4>
          </div>
          <span className="text-[10px] text-white/50 font-mono">Lower is faster</span>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit="ms"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0d16',
                  borderColor: 'rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
                formatter={(value: any) => [`${value} ms`, 'Latency']}
              />
              <Bar dataKey="latency" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.latency < 50
                        ? '#10b981'
                        : entry.latency < 140
                        ? '#06b6d4'
                        : entry.latency < 180
                        ? '#8b5cf6'
                        : '#f59e0b'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Diagnostic Event Log Stream ── */}
      <div className="p-5 rounded-3xl bg-[#0d0f19] border border-white/10 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-purple-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Health & Ping Audit Logs
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as any)}
              className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-[11px] text-white/80 focus:outline-none"
            >
              <option value="all">All Services</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="nvidia">NVIDIA</option>
              <option value="minimax">MiniMax</option>
              <option value="backend">Backend</option>
              <option value="search">Search</option>
            </select>

            <button
              type="button"
              onClick={() => {
                clearHealthLogs();
                toast.info('Audit logs cleared');
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Clear Logs"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
          {logs.filter((l) => logFilter === 'all' || l.serviceId === logFilter).length === 0 ? (
            <div className="text-center py-6 text-white/40 text-xs">No event logs recorded yet.</div>
          ) : (
            logs
              .filter((l) => logFilter === 'all' || l.serviceId === logFilter)
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-white/40 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                        log.status === 'healthy'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.status === 'degraded'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      )}
                    >
                      {log.serviceId}
                    </span>
                    <span className="text-white/80 truncate text-xs">{log.message}</span>
                  </div>

                  {log.latencyMs !== null && (
                    <span className="text-cyan-400 font-bold shrink-0">{log.latencyMs}ms</span>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
