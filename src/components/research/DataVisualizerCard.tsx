import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Table2, 
  Download, 
  Copy, 
  Check, 
  Maximize2,
  Minimize2,
  Sparkles,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChartDataPayload } from '@/lib/chartDetector';

interface DataVisualizerCardProps {
  data: ChartDataPayload;
  className?: string;
}

const PALETTE = [
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#14b8a6', // teal-500
];

export const DataVisualizerCard: React.FC<DataVisualizerCardProps> = ({
  data,
  className
}) => {
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar' | 'pie' | 'radar'>(data.type || 'bar');
  const [showTable, setShowTable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSeries, setActiveSeries] = useState<string[]>(
    data.series.map(s => s.dataKey)
  );

  const toggleSeries = (key: string) => {
    if (activeSeries.includes(key)) {
      if (activeSeries.length > 1) {
        setActiveSeries(activeSeries.filter(k => k !== key));
      }
    } else {
      setActiveSeries([...activeSeries, key]);
    }
  };

  const handleCopyTable = () => {
    try {
      const headers = [data.xAxisKey, ...data.series.map(s => s.name)].join('\t');
      const rows = data.data.map(d => 
        [d[data.xAxisKey], ...data.series.map(s => d[s.dataKey] ?? '')].join('\t')
      ).join('\n');
      navigator.clipboard.writeText(`${headers}\n${rows}`);
      setCopied(true);
      toast.success('Data table copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy table');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [data.xAxisKey, ...data.series.map(s => s.name)].join(',');
      const rows = data.data.map(d => 
        [JSON.stringify(d[data.xAxisKey]), ...data.series.map(s => d[s.dataKey] ?? '')].join(',')
      ).join('\n');
      const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  // Pie chart data transformation (take the first active series)
  const pieData = useMemo(() => {
    const firstMetric = activeSeries[0] || data.series[0]?.dataKey;
    if (!firstMetric) return [];
    return data.data.map(item => ({
      name: String(item[data.xAxisKey]),
      value: Number(item[firstMetric]) || 0
    }));
  }, [data, activeSeries]);

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl overflow-hidden my-5 transition-all",
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
            {chartType === 'area' && <TrendingUp size={18} />}
            {chartType === 'line' && <LineChartIcon size={18} />}
            {chartType === 'bar' && <BarChart3 size={18} />}
            {chartType === 'pie' && <PieChartIcon size={18} />}
            {chartType === 'radar' && <Layers size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white tracking-tight">
                {data.title}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Interactive Recharts
              </span>
            </div>
            {data.subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {data.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => { setChartType('area'); setShowTable(false); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
              chartType === 'area' && !showTable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="Area Trend Chart"
          >
            <TrendingUp size={13} />
            <span className="hidden sm:inline">Trend</span>
          </button>

          <button
            type="button"
            onClick={() => { setChartType('bar'); setShowTable(false); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
              chartType === 'bar' && !showTable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="Bar Comparative Chart"
          >
            <BarChart3 size={13} />
            <span className="hidden sm:inline">Bar</span>
          </button>

          <button
            type="button"
            onClick={() => { setChartType('line'); setShowTable(false); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
              chartType === 'line' && !showTable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="Line Chart"
          >
            <LineChartIcon size={13} />
            <span className="hidden sm:inline">Line</span>
          </button>

          <button
            type="button"
            onClick={() => { setChartType('pie'); setShowTable(false); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
              chartType === 'pie' && !showTable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="Donut Breakdown"
          >
            <PieChartIcon size={13} />
            <span className="hidden sm:inline">Donut</span>
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              showTable
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
            title="Toggle Raw Data Table"
          >
            <Table2 size={14} />
          </button>

          <button
            type="button"
            onClick={handleCopyTable}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Copy Table"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Export CSV"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Series Filters & Metrics Tag Selector */}
      {data.series.length > 1 && !showTable && (
        <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-black/20 border-b border-white/5 text-xs">
          <span className="text-zinc-400 font-medium mr-1">Metrics:</span>
          {data.series.map((s, idx) => {
            const isActive = activeSeries.includes(s.dataKey);
            const color = s.color || PALETTE[idx % PALETTE.length];
            return (
              <button
                key={s.dataKey}
                type="button"
                onClick={() => toggleSeries(s.dataKey)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none font-medium text-[11px]",
                  isActive
                    ? "bg-white/10 text-white border border-white/20 shadow-sm"
                    : "bg-white/[0.03] text-zinc-500 border border-transparent hover:text-zinc-300"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? color : '#52525b' }}
                />
                <span>{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary KPI Badges if present */}
      {data.summary && data.summary.length > 0 && !showTable && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-3 bg-white/[0.01] border-b border-white/5">
          {data.summary.map((kpi, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[11px] text-zinc-400 block truncate">{kpi.label}</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base font-bold text-white tracking-tight">{kpi.value}</span>
                {kpi.change && (
                  <span className={cn(
                    "text-[10px] font-semibold",
                    kpi.trend === 'up' ? "text-emerald-400" : kpi.trend === 'down' ? "text-rose-400" : "text-zinc-400"
                  )}>
                    {kpi.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Chart Canvas or Table View */}
      <div className="p-4 sm:p-6 min-h-[320px] flex items-center justify-center">
        {showTable ? (
          <div className="w-full overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-zinc-300 border-b border-white/10 font-semibold">
                <tr>
                  <th className="px-4 py-3">{data.xAxisKey}</th>
                  {data.series.map(s => (
                    <th key={s.dataKey} className="px-4 py-3">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
                {data.data.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5 font-sans font-medium text-white">{row[data.xAxisKey]}</td>
                    {data.series.map(s => (
                      <td key={s.dataKey} className="px-4 py-2.5 text-zinc-300">
                        {typeof row[s.dataKey] === 'number' ? row[s.dataKey].toLocaleString() : row[s.dataKey]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {data.series.map((s, i) => {
                      const color = s.color || PALETTE[i % PALETTE.length];
                      return (
                        <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={data.xAxisKey}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                    tickFormatter={val => typeof val === 'number' ? val.toLocaleString() : val}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {data.series
                    .filter(s => activeSeries.includes(s.dataKey))
                    .map((s, i) => {
                      const color = s.color || PALETTE[i % PALETTE.length];
                      return (
                        <Area
                          key={s.dataKey}
                          type="monotone"
                          dataKey={s.dataKey}
                          name={s.name}
                          stroke={color}
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill={`url(#grad-${s.dataKey})`}
                        />
                      );
                    })}
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={data.xAxisKey}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {data.series
                    .filter(s => activeSeries.includes(s.dataKey))
                    .map((s, i) => {
                      const color = s.color || PALETTE[i % PALETTE.length];
                      return (
                        <Line
                          key={s.dataKey}
                          type="monotone"
                          dataKey={s.dataKey}
                          name={s.name}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: color }}
                          activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                      );
                    })}
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={data.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey={data.xAxisKey}
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#ffffff15' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {data.series
                    .filter(s => activeSeries.includes(s.dataKey))
                    .map((s, i) => {
                      const color = s.color || PALETTE[i % PALETTE.length];
                      return (
                        <Bar
                          key={s.dataKey}
                          dataKey={s.dataKey}
                          name={s.name}
                          fill={color}
                          radius={[6, 6, 0, 0]}
                        />
                      );
                    })}
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
