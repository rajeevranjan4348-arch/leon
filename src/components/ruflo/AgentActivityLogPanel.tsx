import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bot,
  Wrench,
  Compass,
  AlertTriangle,
  RotateCw,
  Play,
  Pause,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Database,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Cpu,
  Layers,
  X,
  Maximize2,
  Minimize2,
  FileCode,
  ShieldCheck,
  Send,
  Zap,
  Globe,
  Search,
  Radio,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { eventBus } from '@/lib/ruflo/EventBus';
import { rufloMemory } from '@/lib/ruflo/RufloMemory';
import { SpecializedAgents } from '@/lib/ruflo/SpecializedAgents';
import { AgentRouter } from '@/lib/ruflo/AgentRouter';
import { RufloProgressEvent, AgentMessage, RufloSubtask, MCPToolResult } from '@/lib/ruflo/types';
import { toast } from 'sonner';

export type ActivityLogFilter = 'all' | 'messages' | 'tools' | 'routing' | 'retries' | 'memory' | 'search';

export interface WebSearchStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
  details?: {
    query?: string;
    targetDomains?: string[];
    resultsFound?: number;
    authorityScores?: Array<{ domain: string; score: number }>;
    extractedSnippetsCount?: number;
    verifiedClaimsCount?: number;
    sources?: Array<{ title: string; url: string; snippet?: string }>;
    topSources?: Array<{ title: string; url: string; snippet?: string }>;
  };
}

interface AgentActivityLogPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  activeSubtasks?: RufloSubtask[];
  onManualRetrySubtask?: (subtaskId: string, promptOverride?: string) => void;
  onForceCompleteSubtask?: (subtaskId: string, fallbackOutput?: string) => void;
}

export const AgentActivityLogPanel: React.FC<AgentActivityLogPanelProps> = ({
  isOpen = true,
  onClose,
  className,
  activeSubtasks = [],
  onManualRetrySubtask,
  onForceCompleteSubtask,
}) => {
  const [events, setEvents] = useState<RufloProgressEvent[]>(() => eventBus.getTelemetryHistory());
  const [messages, setMessages] = useState<AgentMessage[]>(() => eventBus.getMessageHistory());
  const [activeFilter, setActiveFilter] = useState<ActivityLogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RufloProgressEvent | null>(null);
  const [selectedSubtaskForIntervention, setSelectedSubtaskForIntervention] = useState<RufloSubtask | null>(null);
  const [interventionPrompt, setInterventionPrompt] = useState('');
  const [isIntervening, setIsIntervening] = useState(false);
  const [subtasksState, setSubtasksState] = useState<RufloSubtask[]>(activeSubtasks);
  const [memoryItemsCount, setMemoryItemsCount] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSimulatingSearch, setIsSimulatingSearch] = useState(false);
  const [searchSteps, setSearchSteps] = useState<WebSearchStep[]>([
    {
      id: 'step_1_intent',
      stepNumber: 1,
      title: 'Query Intent & Entity Formulation',
      subtitle: 'Extracting key entities, time bounds & formatting structured search queries',
      status: 'completed',
      durationMs: 140,
      details: {
        query: 'real-time AI Studio autonomous web search architecture 2026',
        targetDomains: ['google.com', 'github.com', 'arxiv.org', 'docs.python.org'],
      },
    },
    {
      id: 'step_2_api',
      stepNumber: 2,
      title: 'Multi-Source API Dispatch',
      subtitle: 'Querying Web Search APIs, ArXiv, Developer Docs & Wikipedia in parallel',
      status: 'completed',
      durationMs: 380,
      details: {
        query: 'real-time AI Studio autonomous web search architecture 2026',
        resultsFound: 16,
        targetDomains: ['ai.google.dev', 'github.com', 'arxiv.org', 'wikipedia.org'],
      },
    },
    {
      id: 'step_3_authority',
      stepNumber: 3,
      title: 'Authority & Relevance Scoring',
      subtitle: 'Evaluating domain trust scores, ranking primary sources & filtering SEO farm pages',
      status: 'completed',
      durationMs: 210,
      details: {
        authorityScores: [
          { domain: 'ai.google.dev', score: 98 },
          { domain: 'github.com', score: 94 },
          { domain: 'arxiv.org', score: 96 },
          { domain: 'developer.mozilla.org', score: 95 },
        ],
      },
    },
    {
      id: 'step_4_crawl',
      stepNumber: 4,
      title: 'Deep Content Crawling & Parsing',
      subtitle: 'Parsing HTML DOMs, extracting key paragraphs, code snippets & tables',
      status: 'running',
      durationMs: 320,
      details: {
        extractedSnippetsCount: 8,
        topSources: [
          {
            title: 'Autonomous Multi-Step Web Search Engine in AI Studio',
            url: 'https://ai.google.dev/docs/web_search_agent',
            snippet: 'Multi-step web search engine performs real-time entity extraction, multi-domain dispatch, domain authority ranking, and citation synthesis.',
          },
          {
            title: 'Google Maps & Web Search Tool Telemetry Specification',
            url: 'https://github.com/google/ai-studio-telemetry',
            snippet: 'Gives users a live step-by-step breakdown of autonomous research steps in progress.',
          },
        ],
      },
    },
    {
      id: 'step_5_grounding',
      stepNumber: 5,
      title: 'Cross-Verification & Citation Grounding',
      subtitle: 'Cross-checking claims across independent primary sources & generating citations',
      status: 'pending',
    },
  ]);

  const handleSimulateSearchProcess = async () => {
    setIsSimulatingSearch(true);
    toast.info('Starting autonomous web search process...');

    setSearchSteps([
      {
        id: 'step_1_intent',
        stepNumber: 1,
        title: 'Query Intent & Entity Formulation',
        subtitle: 'Extracting key entities, time bounds & formatting structured search queries',
        status: 'running',
      },
      {
        id: 'step_2_api',
        stepNumber: 2,
        title: 'Multi-Source API Dispatch',
        subtitle: 'Querying Web Search APIs, ArXiv, Developer Docs & Wikipedia in parallel',
        status: 'pending',
      },
      {
        id: 'step_3_authority',
        stepNumber: 3,
        title: 'Authority & Relevance Scoring',
        subtitle: 'Evaluating domain trust scores, ranking primary sources & filtering SEO farm pages',
        status: 'pending',
      },
      {
        id: 'step_4_crawl',
        stepNumber: 4,
        title: 'Deep Content Crawling & Parsing',
        subtitle: 'Parsing HTML DOMs, extracting key paragraphs, code snippets & tables',
        status: 'pending',
      },
      {
        id: 'step_5_grounding',
        stepNumber: 5,
        title: 'Cross-Verification & Citation Grounding',
        subtitle: 'Cross-checking claims across independent primary sources & generating citations',
        status: 'pending',
      },
    ]);

    // Step 1
    await new Promise(r => setTimeout(r, 600));
    eventBus.emitTelemetry({
      type: 'tool_invoked',
      agentType: 'researcher',
      message: '[WebSearch Step 1/5]: Formulated queries & extracted entities.',
      details: { query: searchQuery || 'latest AI Studio web search autonomous features 2026' }
    });
    setSearchSteps(prev => prev.map(s => s.stepNumber === 1 ? { ...s, status: 'completed', durationMs: 150, details: { query: searchQuery || 'latest AI Studio web search features 2026', targetDomains: ['ai.google.dev', 'github.com', 'arxiv.org'] } } : s.stepNumber === 2 ? { ...s, status: 'running' } : s));

    // Step 2
    await new Promise(r => setTimeout(r, 900));
    eventBus.emitTelemetry({
      type: 'tool_invoked',
      agentType: 'researcher',
      message: '[WebSearch Step 2/5]: Multi-Source API dispatch retrieved 24 raw results.',
      details: { resultsCount: 24 }
    });
    setSearchSteps(prev => prev.map(s => s.stepNumber === 2 ? { ...s, status: 'completed', durationMs: 450, details: { resultsFound: 24, targetDomains: ['ai.google.dev', 'github.com', 'arxiv.org', 'wikipedia.org'] } } : s.stepNumber === 3 ? { ...s, status: 'running' } : s));

    // Step 3
    await new Promise(r => setTimeout(r, 800));
    eventBus.emitTelemetry({
      type: 'tool_completed',
      agentType: 'researcher',
      message: '[WebSearch Step 3/5]: Evaluated domain authority & filtered 6 content farms.',
    });
    setSearchSteps(prev => prev.map(s => s.stepNumber === 3 ? { ...s, status: 'completed', durationMs: 300, details: { authorityScores: [{ domain: 'ai.google.dev', score: 98 }, { domain: 'github.com', score: 94 }, { domain: 'arxiv.org', score: 96 }] } } : s.stepNumber === 4 ? { ...s, status: 'running' } : s));

    // Step 4
    await new Promise(r => setTimeout(r, 1000));
    eventBus.emitTelemetry({
      type: 'tool_completed',
      agentType: 'researcher',
      message: '[WebSearch Step 4/5]: Parsed DOMs & extracted 14 grounded text snippets.',
    });
    setSearchSteps(prev => prev.map(s => s.stepNumber === 4 ? { ...s, status: 'completed', durationMs: 500, details: { extractedSnippetsCount: 14, topSources: [{ title: 'Google AI Studio Autonomous Web Search Engine', url: 'https://ai.google.dev/docs/web_search_agent', snippet: 'Step-by-step telemetry breakdown provides visibility into autonomous research actions.' }] } } : s.stepNumber === 5 ? { ...s, status: 'running' } : s));

    // Step 5
    await new Promise(r => setTimeout(r, 800));
    eventBus.emitTelemetry({
      type: 'subtask_complete',
      agentType: 'researcher',
      message: '[WebSearch Step 5/5]: Cross-verification complete. 6 claims verified & citations synthesized.',
    });
    setSearchSteps(prev => prev.map(s => s.stepNumber === 5 ? { ...s, status: 'completed', durationMs: 350, details: { verifiedClaimsCount: 6 } } : s));

    setIsSimulatingSearch(false);
    toast.success('Autonomous Web Search process complete!');
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  // Sync active subtasks when prop changes
  useEffect(() => {
    if (activeSubtasks && activeSubtasks.length > 0) {
      setSubtasksState(activeSubtasks);
    }
  }, [activeSubtasks]);

  // Subscribe to real-time telemetry events & messages
  useEffect(() => {
    const unsubTelemetry = eventBus.subscribeTelemetry((evt) => {
      if (!isPaused) {
        setEvents((prev) => {
          const next = [...prev, evt];
          return next.slice(-400); // keep last 400 events
        });
      }
    });

    const unsubBroadcast = eventBus.subscribeBroadcast((msg) => {
      if (!isPaused) {
        setMessages((prev) => {
          const next = [...prev, msg];
          return next.slice(-200);
        });
      }
    });

    // Count memory items
    try {
      setMemoryItemsCount(rufloMemory.listAll().length);
    } catch {
      // Ignore count error
    }

    const handleInspectEvent = (e: Event) => {
      const customEvt = e as CustomEvent<{ subtaskId?: string; event?: RufloProgressEvent }>;
      if (customEvt.detail?.event) {
        setSelectedEvent(customEvt.detail.event);
        setActiveFilter('retries');
      } else if (customEvt.detail?.subtaskId) {
        setActiveFilter('retries');
      }
    };
    window.addEventListener('open_agent_activity_log', handleInspectEvent);

    return () => {
      unsubTelemetry();
      unsubBroadcast();
      window.removeEventListener('open_agent_activity_log', handleInspectEvent);
    };
  }, [isPaused]);

  // Auto-scroll to bottom on new event
  useEffect(() => {
    if (isAutoScrollRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleClearLogs = () => {
    eventBus.clear();
    setEvents([]);
    setMessages([]);
    toast.success('Agent Activity Logs cleared');
  };

  // Filtered log events
  const filteredEvents = events.filter((evt) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (evt.message || '') + (evt.agentId || '') + (evt.agentType || '') + (evt.type || '');
      if (!matchText.toLowerCase().includes(q)) return false;
    }

    if (activeFilter === 'all') return true;
    if (activeFilter === 'messages') return evt.type === 'agent_message';
    if (activeFilter === 'tools') return evt.type.startsWith('tool_');
    if (activeFilter === 'routing') return evt.type === 'agent_assigned' || evt.type === 'plan_created' || evt.type === 'agent_spawned';
    if (activeFilter === 'retries') return evt.type === 'subtask_retry' || evt.type === 'subtask_failed' || evt.type.includes('error');
    if (activeFilter === 'memory') return evt.type.startsWith('memory_');
    return true;
  });

  // Manual Intervention Execution Handler
  const handleExecuteIntervention = async (subtask: RufloSubtask) => {
    setIsIntervening(true);
    toast.info(`Triggering manual intervention for subtask: "${subtask.title}"`);

    try {
      if (onManualRetrySubtask) {
        onManualRetrySubtask(subtask.id, interventionPrompt);
      } else {
        // Direct intervention execution via Ruflo Agent Router
        eventBus.emitTelemetry({
          type: 'subtask_retry',
          subtaskId: subtask.id,
          agentType: subtask.agentType,
          agentId: subtask.assignedAgentId || subtask.agentType,
          message: `Manual intervention invoked: Re-dispatching subtask with operator guidance "${interventionPrompt || 'Standard retry'}"`,
        });

        // Update local subtask state
        setSubtasksState(prev => prev.map(s => {
          if (s.id === subtask.id) {
            return {
              ...s,
              status: 'retrying',
              retryCount: s.retryCount + 1,
              description: interventionPrompt ? `${s.description} (Guidance: ${interventionPrompt})` : s.description,
            };
          }
          return s;
        }));

        // Execute subtask with override
        const response = await SpecializedAgents.executeSubtask(
          {
            ...subtask,
            description: interventionPrompt ? `${subtask.description}\n[Operator Intervention]: ${interventionPrompt}` : subtask.description,
          },
          subtask.title,
          new Map(),
          (logMsg) => {
            eventBus.emitTelemetry({
              type: 'subtask_progress',
              subtaskId: subtask.id,
              agentType: subtask.agentType,
              message: logMsg,
            });
          }
        );

        if (response.success && response.output) {
          eventBus.emitTelemetry({
            type: 'subtask_complete',
            subtaskId: subtask.id,
            agentType: subtask.agentType,
            message: `Manual intervention succeeded for "${subtask.title}"`,
            details: { outputLength: response.output.length },
          });

          setSubtasksState(prev => prev.map(s => {
            if (s.id === subtask.id) {
              return { ...s, status: 'completed', result: response.output };
            }
            return s;
          }));

          toast.success(`Subtask "${subtask.title}" successfully resolved!`);
        } else {
          toast.error(`Manual intervention failed. Check agent logs for details.`);
        }
      }

      setSelectedSubtaskForIntervention(null);
      setInterventionPrompt('');
    } catch (err: any) {
      toast.error(`Intervention error: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsIntervening(false);
    }
  };

  const handleForceComplete = (subtaskId: string) => {
    if (onForceCompleteSubtask) {
      onForceCompleteSubtask(subtaskId, 'Marked as completed by operator override.');
    } else {
      setSubtasksState(prev => prev.map(s => {
        if (s.id === subtaskId) {
          return { ...s, status: 'completed', result: '[Completed by operator manual override]' };
        }
        return s;
      }));
      eventBus.emitTelemetry({
        type: 'subtask_complete',
        subtaskId,
        message: `Operator forced completion of subtask (${subtaskId})`,
      });
    }
    toast.success(`Subtask ${subtaskId} forced complete.`);
    setSelectedSubtaskForIntervention(null);
  };

  const handleSimulateFailure = () => {
    eventBus.emitTelemetry({
      type: 'subtask_failed',
      subtaskId: 'subtask_code_synthesis',
      agentType: 'coder',
      agentId: 'coder-01',
      message: 'High-priority code synthesis failed: Network timeout while compiling AST module.',
      details: {
        subtaskId: 'subtask_code_synthesis',
        title: 'Architecture Design & Code Implementation',
        priority: 'critical',
        error: 'Network timeout while connecting to remote compiler endpoint.',
      },
    });
  };

  if (!isOpen) return null;

  return (
    <aside
      id="ruflo-agent-activity-panel"
      className={cn(
        "flex flex-col bg-[#171717]/98 dark:bg-[#171717]/98 chatgpt-minimal:bg-[#171717] light:bg-[#ffffff]/98 backdrop-blur-2xl border-l border-white/10 dark:border-white/10 light:border-black/10 text-white dark:text-white light:text-black font-sans transition-all duration-300 z-40 shadow-2xl h-full",
        isExpanded ? "w-full sm:w-[680px]" : "w-full sm:w-[460px]",
        className
      )}
    >
      {/* PANEL HEADER */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-sm shadow-purple-500/20">
            <Activity size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">Agent Activity Log</h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Telemetry
              </span>
            </div>
            <p className="text-[11px] text-white/50 leading-none mt-0.5">
              Multi-agent routing, tool executions & inter-agent messages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "p-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1",
              isPaused
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-white/5 text-white/70 border-white/10 hover:text-white hover:bg-white/10"
            )}
            title={isPaused ? "Resume live stream" : "Pause live stream"}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span className="text-[10px] hidden sm:inline">{isPaused ? 'Paused' : 'Live'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer hidden sm:flex"
            title={isExpanded ? "Collapse panel width" : "Expand panel width"}
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={handleSimulateFailure}
            className="p-1.5 rounded-lg text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
            title="Simulate high-priority subtask failure alert"
          >
            <AlertTriangle size={13} className="text-rose-400" />
            <span className="hidden sm:inline">Test Alert</span>
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg text-white/50 hover:text-red-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            title="Clear all logs"
          >
            <Trash2 size={14} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              title="Close activity log"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* SWARM HEALTH & ACTIVE SUBTASKS BAR */}
      {subtasksState.length > 0 && (
        <div className="p-3 bg-white/[0.015] border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white/70 flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              <span>Active Workflow Subtasks ({subtasksState.length})</span>
            </span>
            <span className="text-[10px] text-white/40 font-mono">
              {subtasksState.filter(s => s.status === 'completed').length}/{subtasksState.length} Done
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {subtasksState.map((st) => {
              const isRunning = st.status === 'running' || st.status === 'retrying';
              const isFailed = st.status === 'failed';
              const isCompleted = st.status === 'completed';

              return (
                <div
                  key={st.id}
                  className={cn(
                    "px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all",
                    isCompleted && "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
                    isRunning && "bg-amber-500/10 border-amber-500/40 text-amber-200 animate-pulse",
                    isFailed && "bg-red-500/15 border-red-500/40 text-red-200",
                    st.status === 'pending' && "bg-white/[0.03] border-white/10 text-white/60"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isCompleted && "bg-emerald-400",
                      isRunning && "bg-amber-400 animate-ping",
                      isFailed && "bg-red-400",
                      st.status === 'pending' && "bg-white/30"
                    )} />
                    <span className="font-mono text-[10px] text-white/50 uppercase">[{st.agentType}]</span>
                    <span className="truncate text-[11px] font-medium text-white/90">{st.title}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status Badge */}
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded capitalize font-mono",
                      isCompleted && "bg-emerald-500/20 text-emerald-300",
                      isRunning && "bg-amber-500/20 text-amber-300",
                      isFailed && "bg-red-500/20 text-red-300",
                      st.status === 'pending' && "bg-white/10 text-white/50"
                    )}>
                      {st.status}
                    </span>

                    {/* Manual Intervention / Retry Button */}
                    {(isFailed || isRunning || st.retryCount > 0) && (
                      <button
                        type="button"
                        onClick={() => setSelectedSubtaskForIntervention(st)}
                        className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                        title="Open Manual Intervention & Custom Retry"
                      >
                        <Wrench size={10} />
                        <span>Intervene</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="px-4 py-2 border-b border-white/10 bg-white/[0.01] space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: 'all', label: 'All Events', count: events.length },
            { id: 'search', label: 'Web Search Steps', count: searchSteps.length },
            { id: 'messages', label: 'Messages', count: messages.length },
            { id: 'tools', label: 'Tools', count: events.filter(e => e.type.startsWith('tool_')).length },
            { id: 'routing', label: 'Routing', count: events.filter(e => e.type === 'agent_assigned' || e.type === 'agent_spawned').length },
            { id: 'retries', label: 'Retries & Errors', count: events.filter(e => e.type === 'subtask_retry' || e.type === 'subtask_failed').length },
            { id: 'memory', label: 'AgentDB Memory', count: memoryItemsCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as ActivityLogFilter)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border shrink-0",
                activeFilter === tab.id
                  ? "bg-cyan-600/30 text-white border-cyan-500/50 shadow-sm"
                  : "bg-white/[0.03] text-white/60 border-white/5 hover:text-white hover:bg-white/10"
              )}
            >
              {tab.id === 'search' && <Search size={11} className="text-cyan-400" />}
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-60 font-mono">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search log messages, web search steps, tools..."
            className="w-full bg-[#181920] text-xs text-white placeholder-white/40 px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500/60 font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1.5 text-white/40 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* AUTONOMOUS WEB SEARCH STEP-BY-STEP BREAKDOWN PANEL */}
      {(activeFilter === 'search' || activeFilter === 'all') && (
        <div className="p-3.5 border-b border-white/10 bg-gradient-to-b from-cyan-950/20 to-transparent space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                <Globe size={15} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Autonomous Web Search Pipeline</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    5 Steps
                  </span>
                </h4>
                <p className="text-[11px] text-white/50">
                  Real-time step-by-step breakdown of query formulation, search dispatch & citation verification
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSimulateSearchProcess}
              disabled={isSimulatingSearch}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw size={12} className={cn(isSimulatingSearch && "animate-spin")} />
              <span>{isSimulatingSearch ? 'Searching...' : 'Simulate Search'}</span>
            </button>
          </div>

          {/* Search Steps Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-white/60">
              <span>Search Progress</span>
              <span>
                {searchSteps.filter(s => s.status === 'completed').length} of {searchSteps.length} Steps Complete
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-indigo-500 transition-all duration-300"
                style={{
                  width: `${(searchSteps.filter(s => s.status === 'completed').length / searchSteps.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* 5 Step-by-Step Breakdown Cards */}
          <div className="space-y-2">
            {searchSteps.map((step) => {
              const isDone = step.status === 'completed';
              const isRunning = step.status === 'running';
              const isPending = step.status === 'pending';

              return (
                <div
                  key={step.id}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs transition-all space-y-2",
                    isDone && "bg-emerald-500/10 border-emerald-500/30 text-emerald-100",
                    isRunning && "bg-cyan-500/15 border-cyan-500/40 text-cyan-100 animate-pulse shadow-md shadow-cyan-500/10",
                    isPending && "bg-white/[0.02] border-white/5 text-white/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-5 h-5 rounded-full font-mono text-[10px] font-bold flex items-center justify-center shrink-0",
                        isDone && "bg-emerald-500 text-black",
                        isRunning && "bg-cyan-400 text-black animate-spin",
                        isPending && "bg-white/10 text-white/50"
                      )}>
                        {isDone ? <CheckCircle2 size={12} /> : step.stepNumber}
                      </div>

                      <div>
                        <span className="font-semibold text-white/90 tracking-tight">
                          Step {step.stepNumber}: {step.title}
                        </span>
                        <p className="text-[10px] text-white/50 line-clamp-1">{step.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {step.durationMs && (
                        <span className="text-[10px] font-mono text-white/40 flex items-center gap-1">
                          <Clock size={10} />
                          {step.durationMs}ms
                        </span>
                      )}
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded capitalize font-mono uppercase",
                        isDone && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                        isRunning && "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse",
                        isPending && "bg-white/10 text-white/40"
                      )}>
                        {step.status}
                      </span>
                    </div>
                  </div>

                  {/* Step Details Breakdown */}
                  {step.details && (
                    <div className="pt-2 border-t border-white/10 text-[11px] space-y-1.5 text-white/80 font-sans">
                      {step.details.query && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono bg-black/30 px-2 py-1 rounded border border-white/5">
                          <Search size={10} className="text-cyan-400 shrink-0" />
                          <span className="text-white/40">Target Query:</span>
                          <span className="text-cyan-300 truncate">{step.details.query}</span>
                        </div>
                      )}

                      {step.details.targetDomains && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-white/40 mr-1">Domains:</span>
                          {step.details.targetDomains.map(d => (
                            <span key={d} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-cyan-200">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {step.details.authorityScores && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {step.details.authorityScores.map(as => (
                            <div key={as.domain} className="flex items-center justify-between text-[10px] font-mono px-2 py-1 bg-white/5 rounded border border-white/5">
                              <span className="text-white/70 truncate">{as.domain}</span>
                              <span className="text-emerald-400 font-bold">{as.score}% Trust</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {step.details.topSources && step.details.topSources.map((src, idx) => (
                        <div key={idx} className="p-1.5 rounded bg-white/5 border border-white/5 space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-cyan-300 truncate">{src.title}</span>
                            <a href={src.url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white flex items-center gap-0.5">
                              <ExternalLink size={9} />
                            </a>
                          </div>
                          <p className="text-[10px] text-white/60 line-clamp-2 italic">{src.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENT LOGS STREAM */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          isAutoScrollRef.current = isAtBottom;
        }}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs scrollbar-thin scrollbar-thumb-white/10"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-white/40 space-y-2">
            <Bot size={28} className="opacity-40" />
            <p className="text-xs">No activity logged yet.</p>
            <p className="text-[11px] opacity-70">Execute a prompt to watch multi-agent routing & tool calls live.</p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const dateStr = new Date(evt.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const isMsg = evt.type === 'agent_message';
            const isTool = evt.type.startsWith('tool_');
            const isRetry = evt.type === 'subtask_retry' || evt.type === 'subtask_failed';
            const isComplete = evt.type === 'subtask_complete' || evt.type === 'completed';
            const isRoute = evt.type === 'agent_assigned' || evt.type === 'plan_created';

            return (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer group hover:border-white/30",
                  isMsg && "bg-blue-950/20 border-blue-500/30 text-blue-200",
                  isTool && "bg-emerald-950/20 border-emerald-500/30 text-emerald-200",
                  isRetry && "bg-red-950/20 border-red-500/40 text-red-200",
                  isComplete && "bg-purple-950/20 border-purple-500/30 text-purple-200",
                  isRoute && "bg-indigo-950/20 border-indigo-500/30 text-indigo-200",
                  !isMsg && !isTool && !isRetry && !isComplete && !isRoute && "bg-white/[0.025] border-white/5 text-white/80"
                )}
              >
                <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono">{dateStr}</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded font-bold uppercase text-[9px]",
                      isMsg && "bg-blue-500/20 text-blue-300",
                      isTool && "bg-emerald-500/20 text-emerald-300",
                      isRetry && "bg-red-500/20 text-red-300",
                      isComplete && "bg-purple-500/20 text-purple-300",
                      isRoute && "bg-indigo-500/20 text-indigo-300"
                    )}>
                      {evt.type}
                    </span>
                  </div>

                  {evt.agentType && (
                    <span className="text-purple-300 font-semibold uppercase text-[10px]">
                      @{evt.agentType}
                    </span>
                  )}
                </div>

                <p className="text-[11.5px] leading-relaxed break-words font-sans text-white/90">
                  {evt.message}
                </p>

                {evt.details && (
                  <div className="mt-1 pt-1 border-t border-white/5 text-[10px] text-white/50 truncate">
                    {typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* EVENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 bg-[#181922] border-t border-white/10 space-y-2 max-h-64 overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FileCode size={13} className="text-purple-400" />
                <span>Event Telemetry Payload</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>
            <pre className="text-[11px] font-mono bg-black/40 p-2.5 rounded-xl overflow-x-auto text-emerald-300 border border-white/5 max-h-40">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MANUAL INTERVENTION MODAL */}
      <AnimatePresence>
        {selectedSubtaskForIntervention && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 bg-[#1a1b24] border-t-2 border-purple-500/50 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={15} className="text-purple-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Manual Intervention: {selectedSubtaskForIntervention.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubtaskForIntervention(null)}
                className="text-white/50 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-white/60">
              Provide specific directives, custom prompt overrides, or force-complete this subtask to unblock the swarm workflow.
            </p>

            <textarea
              value={interventionPrompt}
              onChange={(e) => setInterventionPrompt(e.target.value)}
              placeholder="e.g. Focus specifically on TypeScript typing and optimize with caching..."
              rows={2}
              className="w-full bg-[#101116] text-xs text-white rounded-xl p-2.5 border border-white/15 focus:outline-none focus:border-purple-500 placeholder-white/30 font-sans"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleForceComplete(selectedSubtaskForIntervention.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
              >
                Force Complete & Skip
              </button>

              <button
                type="button"
                onClick={() => handleExecuteIntervention(selectedSubtaskForIntervention)}
                disabled={isIntervening}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={12} className={cn(isIntervening && "animate-spin")} />
                <span>{isIntervening ? 'Re-executing…' : 'Re-execute Subtask'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
