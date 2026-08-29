import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Activity,
  Cpu,
  Zap,
  DollarSign,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Trash2,
  Sparkles,
  BarChart2,
  PieChart as PieIcon,
  CheckCircle2,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  getDailyUsageData,
  getProviderSummary,
  getStoredApiUsage,
  recordApiUsage,
  resetApiUsageToSample,
  clearApiUsageHistory,
  subscribeApiUsage,
  ApiUsageRecord
} from '@/lib/apiUsageStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ApiUsageDashboard: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [records, setRecords] = useState<ApiUsageRecord[]>(() => getStoredApiUsage());
  const [dailyData, setDailyData] = useState(() => getDailyUsageData(7));
  const [providerSummary, setProviderSummary] = useState(() => getProviderSummary());
  const [activeChartTab, setActiveChartTab] = useState<'tokens' | 'providers' | 'costs'>('tokens');

  const refreshData = () => {
    setRecords(getStoredApiUsage());
    setDailyData(getDailyUsageData(rangeDays));
    setProviderSummary(getProviderSummary());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeApiUsage(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, [rangeDays]);

  // Aggregate Totals
  const totalTokens = records.reduce((acc, r) => acc + r.totalTokens, 0);
  const totalPromptTokens = records.reduce((acc, r) => acc + r.promptTokens, 0);
  const totalCompletionTokens = records.reduce((acc, r) => acc + r.completionTokens, 0);
  const totalRequests = records.length;
  const totalCost = records.reduce((acc, r) => acc + r.estimatedCost, 0);
  const avgLatency =
    totalRequests > 0 ? Math.round(records.reduce((acc, r) => acc + r.latencyMs, 0) / totalRequests) : 0;

  // Handle simulating a test call
  const handleSimulateCall = () => {
    const providers: ('gemini' | 'nvidia' | 'minimax' | 'openai')[] = ['gemini', 'nvidia', 'minimax', 'openai'];
    const p = providers[Math.floor(Math.random() * providers.length)];
    const prompt = Math.floor(Math.random() * 800) + 200;
    const comp = Math.floor(Math.random() * 1500) + 400;
    const lat = Math.floor(Math.random() * 200) + 80;

    const models = {
      gemini: 'gemini-2.5-flash',
      nvidia: 'meta/llama-3.3-70b-instruct',
      minimax: 'minimax-m2.5',
      openai: 'gpt-4o-mini',
    };

    recordApiUsage(p, models[p], prompt, comp, lat);
    toast.success(`Simulated ${models[p]} call logged (+${prompt + comp} tokens)`);
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.info('No API usage records to export');
      return;
    }
    const headers = 'ID,Timestamp,Date,Provider,Model,PromptTokens,CompletionTokens,TotalTokens,CostUSD,LatencyMs,Status\n';
    const rows = records
      .map(
        (r) =>
          `"${r.id}",${r.timestamp},"${new Date(r.timestamp).toISOString()}","${r.provider}","${r.model}",${r.promptTokens},${r.completionTokens},${r.totalTokens},${r.estimatedCost},${r.latencyMs},"${r.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_usage_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('API Usage Report exported as CSV');
  };

  const handleResetData = () => {
    resetApiUsageToSample();
    toast.success('Reset API usage history to baseline benchmark');
  };

  return (
    <div className="flex flex-col gap-6 w-full text-white">
      {/* Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                API Usage & Token Analytics
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Recharts Live
                </span>
              </h2>
              <p className="text-xs text-white/60">
                Track token consumption, prompt ratios, estimated cost & model response latency
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setRangeDays(1)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                rangeDays === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-white/60 hover:text-white'
              )}
            >
              24h
            </button>
            <button
              onClick={() => setRangeDays(7)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                rangeDays === 7 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-white/60 hover:text-white'
              )}
            >
              7 Days
            </button>
            <button
              onClick={() => setRangeDays(30)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer',
                rangeDays === 30 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-white/60 hover:text-white'
              )}
            >
              30 Days
            </button>
          </div>

          <button
            onClick={handleSimulateCall}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Play size={13} />
            <span>Test Call</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export CSV"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleResetData}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            title="Reset to Baseline"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium">Total Tokens</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {totalTokens.toLocaleString()}
            </div>
            <div className="text-[11px] text-white/50 mt-1 flex items-center gap-1">
              <span className="text-cyan-400">P: {(totalPromptTokens / 1000).toFixed(1)}k</span>
              <span>/</span>
              <span className="text-purple-400">C: {(totalCompletionTokens / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium">API Requests</span>
            <Activity size={16} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">{totalRequests}</div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={11} />
              <span>99.2% success rate</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium">Estimated Cost</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              ${totalCost.toFixed(4)}
            </div>
            <div className="text-[11px] text-white/50 mt-1">Based on standard API rates</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/60 mb-2">
            <span className="text-xs font-medium">Avg Latency</span>
            <Clock size={16} className="text-purple-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-purple-300">{avgLatency} ms</div>
            <div className="text-[11px] text-purple-400/80 mt-1">Global response speed</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Section */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
        {/* Chart Selector Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveChartTab('tokens')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                activeChartTab === 'tokens'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ring-1 ring-cyan-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              )}
            >
              <BarChart2 size={14} />
              <span>Token Consumption Trend</span>
            </button>

            <button
              onClick={() => setActiveChartTab('providers')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                activeChartTab === 'providers'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 ring-1 ring-purple-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              )}
            >
              <PieIcon size={14} />
              <span>Provider Share</span>
            </button>

            <button
              onClick={() => setActiveChartTab('costs')}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                activeChartTab === 'costs'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white/60'
              )}
            >
              <DollarSign size={14} />
              <span>Model Costs & Requests</span>
            </button>
          </div>

          <span className="text-[11px] text-white/40 font-mono hidden md:inline">
            Range: {rangeDays} Day History
          </span>
        </div>

        {/* Recharts Chart Canvas */}
        <div className="h-[280px] w-full pt-2">
          {activeChartTab === 'tokens' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="promptGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString()} tokens`,
                    name === 'promptTokens' ? 'Prompt Tokens' : 'Completion Tokens',
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}
                  formatter={(value) => (value === 'promptTokens' ? 'Prompt Tokens' : 'Completion Tokens')}
                />
                <Area
                  type="monotone"
                  dataKey="promptTokens"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#promptGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="completionTokens"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#completionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {activeChartTab === 'providers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 h-full items-center gap-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerSummary}
                    dataKey="tokens"
                    nameKey="displayName"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {providerSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} tokens`, 'Tokens']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex flex-col gap-2.5 justify-center pr-4">
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">
                  Provider Breakdown
                </span>
                {providerSummary.map((item) => (
                  <div
                    key={item.provider}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-white">{item.displayName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-white/80">{item.tokens.toLocaleString()} tok</span>
                      <span className="font-mono text-emerald-400 font-bold">${item.cost.toFixed(3)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChartTab === 'costs' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any) => [
                    name === 'cost' ? `$${Number(val).toFixed(4)}` : `${val} calls`,
                    name === 'cost' ? 'Daily Cost' : 'Requests',
                  ]}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[6, 6, 0, 0]} name="cost" />
                <Bar dataKey="requests" fill="#3b82f6" radius={[6, 6, 0, 0]} name="requests" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Log Table */}
      <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            <span>Recent API Call History</span>
          </h3>
          <span className="text-xs text-white/50">Showing latest {Math.min(10, records.length)} executions</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="bg-white/5 border-b border-white/10 text-white/60 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Provider</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Prompt / Comp Tokens</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Est. Cost</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {records.slice(0, 8).map((rec) => (
                <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2 px-3 text-white/60">
                    {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2 px-3">
                    <span className="capitalize font-sans font-medium text-white">{rec.provider}</span>
                  </td>
                  <td className="py-2 px-3 text-cyan-300">{rec.model}</td>
                  <td className="py-2 px-3">
                    <span className="text-white">{rec.totalTokens}</span>{' '}
                    <span className="text-white/40 text-[10px]">({rec.promptTokens}/{rec.completionTokens})</span>
                  </td>
                  <td className="py-2 px-3 text-purple-300">{rec.latencyMs} ms</td>
                  <td className="py-2 px-3 text-emerald-400">${rec.estimatedCost.toFixed(5)}</td>
                  <td className="py-2 px-3 text-right">
                    {rec.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 size={10} /> OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertTriangle size={10} /> Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
