import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Navigation,
  Search,
  Globe,
  Compass,
  Car,
  Footprints,
  Bus,
  Bike,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Send,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  LocateFixed,
  FileText,
  Share2,
  Filter,
  Check,
  ChevronRight,
  Zap,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { callGoogleMapsAgent, callGoogleSearchAgent, GeminiResponse } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import { GoogleMapsView } from '@/components/maps/GoogleMapsView';

export type AgentMode = 'maps' | 'search' | 'factcheck';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{ title: string; url: string; type?: 'web' | 'maps'; address?: string }>;
  mapsPlaces?: Array<{ title: string; uri: string; address?: string; reviews?: string[] }>;
  verdict?: 'verified' | 'false' | 'disputed' | 'developing';
  origin?: string;
  destination?: string;
  distance?: string;
  duration?: string;
}

const SEARCH_SUGGESTIONS = [
  'Latest AI model releases and breakthroughs this month',
  'Summarize today’s global tech and space exploration news',
  'Current standings and upcoming matches in Premier League',
  'What are the newest updates in quantum computing?',
];

const FACT_CHECK_SUGGESTIONS = [
  'Fact check: Did NASA confirm water beneath Europa’s ice?',
  'Verify: Has the global average temperature record been broken recently?',
  'Is it true that quantum computers broke RSA encryption?',
  'Fact check: Did a new study link Mediterranean diet to longevity?',
];

export const GoogleAgentsHub: React.FC<{
  initialMode?: AgentMode;
  onBackToChat?: () => void;
}> = ({ initialMode = 'maps', onBackToChat }) => {
  const [activeMode, setActiveMode] = useState<AgentMode>(initialMode);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [messages, setMessages] = useState<Record<AgentMode, Message[]>>({
    maps: [],
    search: [
      {
        id: 'search-init',
        role: 'assistant',
        content: `🌐 **Real-Time Google Search AI Agent**\n\nI can retrieve breaking global news, verify current events, search live tech announcements, and summarize multi-source web articles with direct citations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    factcheck: [
      {
        id: 'fact-init',
        role: 'assistant',
        content: `🛡️ **Real-Time Fact-Checker AI Agent**\n\nEnter any factual claim, viral rumor, or headline. I will cross-reference live primary sources, evaluate credibility, and issue a structured verdict (Verified, False, Disputed, or Developing).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeMode]);

  // Request browser geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation access not granted in hub:', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputQuery;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeMode]: [...prev[activeMode], userMsg],
    }));

    setInputQuery('');
    setIsLoading(true);

    try {
      let res: GeminiResponse;

      if (activeMode === 'factcheck') {
        res = await callGoogleSearchAgent(promptToSend, { isFactCheck: true });
      } else {
        res = await callGoogleSearchAgent(promptToSend);
      }

      // Determine verdict if fact check
      let verdict: 'verified' | 'false' | 'disputed' | 'developing' | undefined;
      if (activeMode === 'factcheck') {
        const lower = (res.text || '').toLowerCase();
        if (lower.includes('verified') || lower.includes('true') || lower.includes('confirmed')) {
          verdict = 'verified';
        } else if (lower.includes('false') || lower.includes('debunked') || lower.includes('incorrect') || lower.includes('misleading')) {
          verdict = 'false';
        } else if (lower.includes('disputed') || lower.includes('conflicting') || lower.includes('mixed')) {
          verdict = 'disputed';
        } else {
          verdict = 'developing';
        }
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.text || 'Unable to retrieve real-time data at this moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources || [],
        mapsPlaces: res.mapsPlaces || [],
        verdict,
      };

      setMessages((prev) => ({
        ...prev,
        [activeMode]: [...prev[activeMode], aiMsg],
      }));
    } catch (err: any) {
      toast.error('Agent query failed: ' + (err?.message || 'Network error'));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const currentChat = messages[activeMode];

  return (
    <div id="google-agents-hub" className="flex flex-col h-[calc(100vh-2rem)] max-w-7xl mx-auto w-full p-3 lg:p-6 gap-3">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          {onBackToChat && (
            <button
              id="back-to-chat-btn"
              onClick={onBackToChat}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              ← Back to Chat
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="text-cyan-400" size={18} />
              Real-Time Google Agents
            </h1>
            <p className="text-[11px] text-white/60">
              Interactive Google Maps Spatial Intelligence & Real-time Web Search Grounding
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            id="tab-maps-agent"
            onClick={() => setActiveMode('maps')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeMode === 'maps'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            <MapPin size={13} className={activeMode === 'maps' ? 'text-slate-950' : 'text-blue-400'} />
            <span>Maps Agent</span>
          </button>

          <button
            id="tab-search-agent"
            onClick={() => setActiveMode('search')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeMode === 'search'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            <Search size={13} className="text-cyan-400" />
            <span>Search Agent</span>
          </button>

          <button
            id="tab-factcheck-agent"
            onClick={() => setActiveMode('factcheck')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              activeMode === 'factcheck'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            )}
          >
            <ShieldCheck size={13} className="text-purple-400" />
            <span>Fact-Check</span>
          </button>
        </div>
      </div>

      {/* Main Agent Body Area */}
      {activeMode === 'maps' ? (
        <div className="flex-1 w-full h-full min-h-[500px] flex flex-col">
          <GoogleMapsView
            className="w-full flex-1 min-h-[550px]"
            title="GOOGLE MAPS AGENT"
            onBackToHub={onBackToChat}
          />
        </div>
      ) : (
        <div className="flex-1 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 overflow-hidden shadow-xl flex flex-col min-h-0">
          {/* Chat Stream Header */}
          <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              {activeMode === 'search' ? (
                <>
                  <Globe size={14} className="text-blue-400" />
                  Live Google Search Grounding Stream
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="text-purple-400" />
                  Fact-Checking Verification Center
                </>
              )}
            </span>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
            {currentChat.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-4 rounded-2xl max-w-3xl space-y-2 border text-sm',
                  msg.role === 'user'
                    ? 'ml-auto bg-blue-600/90 text-white border-blue-500/30'
                    : 'mr-auto bg-white/5 text-white/90 border-white/10'
                )}
              >
                {/* Fact Check Verdict Badge */}
                {msg.verdict && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border shadow-sm',
                      msg.verdict === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : msg.verdict === 'false'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : msg.verdict === 'disputed'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    )}
                  >
                    {msg.verdict === 'verified' && <CheckCircle2 size={13} />}
                    {msg.verdict === 'false' && <AlertTriangle size={13} />}
                    {msg.verdict === 'disputed' && <HelpCircle size={13} />}
                    {msg.verdict === 'developing' && <Clock size={13} />}
                    <span>Verdict: {msg.verdict}</span>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>

                {/* Sources List */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                    <span className="text-[11px] font-semibold text-white/50 block">Grounding Sources:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors"
                        >
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <ExternalLink size={11} className="shrink-0 text-white/50" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Footer */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                  <span>{msg.timestamp}</span>
                  <button
                    onClick={() => copyToClipboard(msg.content)}
                    className="hover:text-white transition-colors cursor-pointer"
                    title="Copy text"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-xs w-fit"
              >
                <RefreshCw size={14} className="animate-spin text-cyan-400" />
                <span>Pulling live Google Search real-time intelligence...</span>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-4 py-2 bg-white/5 border-t border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-semibold text-white/40 shrink-0">Prompts:</span>
            {(activeMode === 'search' ? SEARCH_SUGGESTIONS : FACT_CHECK_SUGGESTIONS).map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(sug)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/70 hover:text-white shrink-0 transition-colors cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black/40 border-t border-white/10 flex items-center gap-2">
            <input
              id="agent-query-input"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={
                activeMode === 'search'
                  ? 'Ask about current news, latest events, real-time facts...'
                  : 'Enter any claim or statement to fact-check with live evidence...'
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              id="agent-send-btn"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputQuery.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-all active:scale-95 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
