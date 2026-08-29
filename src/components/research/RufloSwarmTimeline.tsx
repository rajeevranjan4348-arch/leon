import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Search,
  Code2,
  Calculator,
  ShieldCheck,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Terminal,
  Activity,
  Zap,
  Cpu,
  Database,
  Wrench,
  Network,
  MessageSquare,
} from 'lucide-react';
import { RufloPlan, RufloProgressEvent, RufloAgentType } from '@/lib/ruflo/types';
import { cn } from '@/lib/utils';

interface RufloSwarmTimelineProps {
  plan?: RufloPlan | null;
  events?: RufloProgressEvent[];
  isExecuting?: boolean;
  executionTimeMs?: number;
  className?: string;
}

const getAgentBadge = (agentType: RufloAgentType) => {
  switch (agentType) {
    case 'queen-coordinator':
      return {
        label: 'Queen Coordinator',
        icon: Bot,
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      };
    case 'task-planner':
      return {
        label: 'Task Planner',
        icon: Network,
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      };
    case 'researcher':
      return {
        label: 'Research Specialist',
        icon: Search,
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      };
    case 'coder':
      return {
        label: 'Coder & Architect',
        icon: Code2,
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      };
    case 'reasoner':
      return {
        label: 'Logic & Math',
        icon: Calculator,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    case 'security-architect':
      return {
        label: 'Security Architect',
        icon: ShieldCheck,
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
      };
    case 'reviewer':
      return {
        label: 'QA & Reviewer',
        icon: ShieldCheck,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    case 'memory-specialist':
      return {
        label: 'Memory & AgentDB',
        icon: Database,
        color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      };
    case 'mcp-specialist':
      return {
        label: 'MCP & Tools',
        icon: Wrench,
        color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      };
    case 'aggregator':
      return {
        label: 'Master Aggregator',
        icon: Layers,
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      };
    default:
      return {
        label: 'Swarm Agent',
        icon: Cpu,
        color: 'text-primary bg-primary/10 border-primary/20',
      };
  }
};

export const RufloSwarmTimeline: React.FC<RufloSwarmTimelineProps> = ({
  plan,
  events = [],
  isExecuting = false,
  executionTimeMs,
  className,
}) => {
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'telemetry'>('timeline');

  if (!plan) return null;

  const toggleSubtask = (id: string) => {
    setExpandedSubtaskId(prev => (prev === id ? null : id));
  };

  const interAgentEvents = events.filter(e => e.type === 'agent_message' || e.type === 'tool_completed' || e.type === 'memory_stored');

  return (
    <div className={cn('bg-secondary/40 border border-white/10 rounded-2xl p-4 my-3 text-xs shadow-lg backdrop-blur-md', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
            <Zap size={15} className={cn(isExecuting && 'animate-pulse text-amber-400')} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Ruflo Multi-Agent Swarm</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/10 border border-primary/20 text-primary font-medium">
                {plan.topology.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 border border-white/10 text-white/70">
                {plan.strategy.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-white/60">
              {isExecuting
                ? 'Decomposing task, routing specialized agents, and executing parallel DAG workflow...'
                : `Executed ${plan.subtasks.length} specialized subtasks successfully`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {executionTimeMs !== undefined && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <Clock size={12} />
              {(executionTimeMs / 1000).toFixed(2)}s
            </span>
          )}

          <div className="flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5">
            <button
              onClick={() => {
                setActiveTab('timeline');
                setShowLogs(false);
              }}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer',
                activeTab === 'timeline' && !showLogs ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white'
              )}
            >
              DAG Plan
            </button>
            <button
              onClick={() => {
                setActiveTab('messages');
                setShowLogs(true);
              }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer',
                showLogs && activeTab === 'messages' ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white'
              )}
            >
              <MessageSquare size={11} />
              <span>Comms ({interAgentEvents.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('telemetry');
                setShowLogs(true);
              }}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer',
                showLogs && activeTab === 'telemetry' ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white'
              )}
            >
              <Terminal size={11} />
              <span>Logs ({events.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtask Timeline Cards (DAG Plan View) */}
      {(!showLogs || activeTab === 'timeline') && (
        <div className="space-y-2">
          {plan.subtasks.map((subtask, index) => {
            const badge = getAgentBadge(subtask.agentType);
            const AgentIcon = badge.icon;
            const isExpanded = expandedSubtaskId === subtask.id;

            return (
              <div
                key={subtask.id}
                className={cn(
                  'rounded-xl border transition-all overflow-hidden bg-white/[0.02]',
                  subtask.status === 'running'
                    ? 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/10'
                    : subtask.status === 'completed'
                    ? 'border-white/10 hover:border-white/20'
                    : subtask.status === 'failed'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/5 opacity-70'
                )}
              >
                <div
                  onClick={() => toggleSubtask(subtask.id)}
                  className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-[10px] font-mono text-white/70 shrink-0">
                      {index + 1}
                    </div>

                    <span className={cn('px-2 py-0.5 rounded-md border text-[10px] font-medium flex items-center gap-1 shrink-0', badge.color)}>
                      <AgentIcon size={12} />
                      {badge.label}
                    </span>

                    <span className="font-medium text-white/90 text-xs truncate max-w-xs md:max-w-md">
                      {subtask.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Indicator */}
                    {subtask.status === 'running' && (
                      <span className="flex items-center gap-1 text-primary font-medium text-[11px] animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        Executing
                      </span>
                    )}
                    {subtask.status === 'retrying' && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px] animate-pulse">
                        <RefreshCw size={12} className="animate-spin" />
                        Retry #{subtask.retryCount}
                      </span>
                    )}
                    {subtask.status === 'completed' && (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 size={13} />
                        Done {subtask.durationMs ? `(${(subtask.durationMs / 1000).toFixed(1)}s)` : ''}
                      </span>
                    )}
                    {subtask.status === 'failed' && (
                      <span className="flex items-center gap-1 text-red-400 text-[11px]">
                        <AlertCircle size={13} />
                        Fallback
                      </span>
                    )}
                    {subtask.status === 'pending' && (
                      <span className="text-white/40 text-[11px]">Pending</span>
                    )}

                    {isExpanded ? <ChevronDown size={14} className="text-white/50" /> : <ChevronRight size={14} className="text-white/50" />}
                  </div>
                </div>

                {/* Subtask Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 p-3 bg-black/20 text-[11px] space-y-2"
                    >
                      <p className="text-white/70 italic">{subtask.description}</p>
                      {subtask.dependencies.length > 0 && (
                        <div className="text-white/50 font-mono text-[10px]">
                          DAG Dependencies: {subtask.dependencies.join(', ')}
                        </div>
                      )}

                      {subtask.logs.length > 0 && (
                        <div className="bg-black/40 rounded-lg p-2 font-mono text-[10px] space-y-1 text-emerald-300 border border-white/5 max-h-32 overflow-y-auto">
                          {subtask.logs.map((log, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-white/30">❯</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {subtask.result && (
                        <div className="bg-white/5 rounded-lg p-2 max-h-44 overflow-y-auto font-sans text-white/80 border border-white/5">
                          <div className="font-semibold text-white/90 text-[10px] mb-1">Subtask Output Artifact:</div>
                          <div className="whitespace-pre-wrap">{subtask.result}</div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Inter-Agent Comms & Telemetry Logs Panels */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pt-2 border-t border-white/10"
          >
            <div className="flex items-center justify-between mb-2 text-white/60 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Activity size={12} className="text-primary" />
                {activeTab === 'messages' ? 'Inter-Agent Message Broker Log' : 'Live Swarm Telemetry Log'}
              </span>
              <span>{activeTab === 'messages' ? interAgentEvents.length : events.length} events</span>
            </div>

            <div className="bg-black/60 rounded-xl p-2.5 font-mono text-[10px] max-h-52 overflow-y-auto space-y-1.5 border border-white/10">
              {(activeTab === 'messages' ? interAgentEvents : events).map((evt) => (
                <div key={evt.id} className="flex items-start gap-2 text-white/70 hover:text-white transition-colors">
                  <span className="text-white/30 shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-bold',
                      evt.type === 'plan_created'
                        ? 'text-cyan-400'
                        : evt.type === 'agent_message'
                        ? 'text-amber-300'
                        : evt.type === 'tool_completed'
                        ? 'text-orange-400'
                        : evt.type === 'memory_stored'
                        ? 'text-teal-400'
                        : evt.type === 'subtask_complete'
                        ? 'text-emerald-400'
                        : evt.type === 'subtask_failed'
                        ? 'text-red-400'
                        : evt.type === 'subtask_retry'
                        ? 'text-amber-400'
                        : 'text-primary'
                    )}
                  >
                    [{evt.type.toUpperCase()}]
                  </span>
                  <span className="break-all">{evt.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
