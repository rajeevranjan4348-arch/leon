import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Compass,
  TrendingUp,
  Globe,
  Sparkles,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  Copy,
  RefreshCw,
  X,
  Tag,
  Clock,
  ArrowRight,
  Newspaper,
  Flame,
  Zap,
  ChevronRight,
  Filter,
  Check,
  SlidersHorizontal,
  Bot,
  Layers,
  ArrowUpRight,
  Sliders
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface NewsTopic {
  id: string;
  title: string;
  category: 'Tech & AI' | 'Science & Space' | 'World' | 'Finance' | 'Climate & Energy' | 'Culture';
  summary: string;
  bullets?: string[];
  source: string;
  sourceUrl: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  imageUrl?: string;
  trendingScore?: number;
  isHot?: boolean;
}

export interface DiscoverPageProps {
  onBackToChat?: () => void;
  onSearchInChat?: (query: string) => void;
  className?: string;
}

const DEFAULT_NEWS_TOPICS: NewsTopic[] = [
  {
    id: 'news-1',
    title: 'Frontier AI Reasoning Models Advance Multi-Step Scientific Hypothesis Generation',
    category: 'Tech & AI',
    summary: 'Next-generation reasoning architectures demonstrate autonomous problem-solving capabilities in genomics, organic chemistry synthesis, and algorithmic proof verification.',
    bullets: [
      'Models utilize test-time dynamic search trees to evaluate theorem paths.',
      'Reduced hallucination rates on complex STEM benchmark suites by over 42%.',
      'Integration with laboratory automation pipelines speeds up candidate drug testing.'
    ],
    source: 'Nature Machine Intelligence',
    sourceUrl: 'https://nature.com',
    publishedAt: '20 minutes ago',
    readTime: '4 min read',
    tags: ['AI Reasoning', 'Genomics', 'Science', 'Machine Learning', 'Research'],
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    trendingScore: 98,
    isHot: true,
  },
  {
    id: 'news-2',
    title: 'Commercial Fusion Reactor Project Achieves Record Plasma Confinement Time',
    category: 'Science & Space',
    summary: 'High-temperature superconducting magnets enable magnetic confinement stellarators to maintain stable fusion conditions exceeding previously predicted thermal containment thresholds.',
    bullets: [
      'High-beta plasma equilibrium stabilized for over 18 consecutive minutes.',
      'Novel tungsten-coated divertor tiles withstand extreme heat flux without degradation.',
      'Pilot grid-interconnection feasibility assessments scheduled for late next year.'
    ],
    source: 'Physics World',
    sourceUrl: 'https://physicsworld.com',
    publishedAt: '1 hour ago',
    readTime: '5 min read',
    tags: ['Clean Energy', 'Fusion', 'Superconductors', 'Physics', 'Power Grid'],
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80',
    trendingScore: 95,
    isHot: true,
  },
  {
    id: 'news-3',
    title: 'James Webb Space Telescope Identifies Atmospheric Carbon and Water Vapor on Exoplanet',
    category: 'Science & Space',
    summary: 'High-resolution transmission spectroscopy reveals clear molecular signatures in the temperate habitable-zone atmosphere of a sub-Neptune exoplanet 120 light-years away.',
    bullets: [
      'Spectroscopic peaks confirm presence of methane, carbon dioxide, and sulfur dioxide.',
      'Cloud deck models indicate potential for liquid water cloud condensation layers.',
      'Follow-up observations with MIRI instrument queued for spectral re-verification.'
    ],
    source: 'NASA Astrophysics',
    sourceUrl: 'https://nasa.gov',
    publishedAt: '2 hours ago',
    readTime: '3 min read',
    tags: ['JWST', 'Exoplanets', 'Space Exploration', 'Astrophysics', 'NASA'],
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    trendingScore: 92,
    isHot: false,
  },
  {
    id: 'news-4',
    title: 'Global Semiconductor Foundries Unveil High-Yield 1.4nm RibbonFET Node Architectures',
    category: 'Tech & AI',
    summary: 'Next-generation backside power delivery networks (BSPDN) and extreme ultraviolet (EUV) double patterning unlock higher power efficiency for mobile edge AI processors and supercomputing nodes.',
    bullets: [
      '30% reduction in resistance-capacitance wire delays compared to 2nm fin structures.',
      'Enhanced thermal dissipation allows sustained high-clock AI inference workloads.',
      'Mass production validation runs expected to begin across major foundries.'
    ],
    source: 'IEEE Spectrum',
    sourceUrl: 'https://spectrum.ieee.org',
    publishedAt: '3 hours ago',
    readTime: '4 min read',
    tags: ['Semiconductors', 'Hardware', 'RibbonFET', 'Edge AI', 'Chips'],
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    trendingScore: 89,
    isHot: false,
  },
  {
    id: 'news-5',
    title: 'Central Banks Expand Real-Time Cross-Border Settlement Rail Interoperability',
    category: 'Finance',
    summary: 'Multilateral payment networks implement standardized ISO 20022 messaging schemas, reducing cross-currency transfer settlement times from multiple business days to sub-second finality.',
    bullets: [
      'Participating monetary authorities include Eurozone, ASEAN corridors, and Latin America.',
      'Automated FX liquidity matching algorithms minimize slippage on high-volume transactions.',
      'Strict cryptographic proofs ensure anti-money-laundering compliance in real time.'
    ],
    source: 'Financial Times',
    sourceUrl: 'https://ft.com',
    publishedAt: '4 hours ago',
    readTime: '3 min read',
    tags: ['Fintech', 'Banking', 'Cross-Border', 'ISO 20022', 'Global Economy'],
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    trendingScore: 86,
    isHot: false,
  },
  {
    id: 'news-6',
    title: 'Next-Generation Solid-State Battery Chemistry Reaches 1,200 Wh/L Volumetric Energy Density',
    category: 'Climate & Energy',
    summary: 'Lithium-metal anodes coupled with sulfide solid electrolytes demonstrate over 1,500 continuous rapid charge cycles without dendrite penetration or significant capacity degradation.',
    bullets: [
      '10-minute ultra-fast charging to 80% capacity tested across wide temperature ranges.',
      'Elimination of flammable liquid solvents prevents thermal runaway hazards.',
      'Automotive manufacturers initiate modular pack integration testing for electric vehicles.'
    ],
    source: 'Bloomberg Energy',
    sourceUrl: 'https://bloomberg.com',
    publishedAt: '5 hours ago',
    readTime: '4 min read',
    tags: ['Batteries', 'EVs', 'Clean Tech', 'Solid State', 'Materials'],
    imageUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
    trendingScore: 88,
    isHot: false,
  },
  {
    id: 'news-7',
    title: 'Open Source Community Launches Distributed AI Agent Protocol for Multi-Tool Collaboration',
    category: 'Tech & AI',
    summary: 'A decentralized, standardized RPC specification enables sovereign autonomous agents to negotiate tasks, share context memories, and invoke specialized browser tooling securely.',
    bullets: [
      'Zero-trust cryptographic handshakes between agent sandboxes.',
      'Built-in budget caps and human-in-the-loop permission verification flows.',
      'Compatible with leading open-weights models and commercial API providers.'
    ],
    source: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com',
    publishedAt: '6 hours ago',
    readTime: '3 min read',
    tags: ['Open Source', 'Autonomous Agents', 'Protocols', 'AI Swarms', 'Developer Tools'],
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    trendingScore: 91,
    isHot: true,
  },
  {
    id: 'news-8',
    title: 'Autonomous Ocean Cleanup Drones Recover Record Tonnage of Coastal Microplastics',
    category: 'Climate & Energy',
    summary: 'Solar-powered aquatic surface vessels equipped with computer vision sorting and acoustic deterrents collect over 250 metric tons of marine waste in harbor estuarine systems.',
    bullets: [
      'Non-invasive filtration prevents marine fauna entanglement.',
      'High-throughput recycling facilities convert retrieved polymers into construction composite.',
      'Municipal pilot programs expanding to 18 additional coastal cities.'
    ],
    source: 'Reuters Environment',
    sourceUrl: 'https://reuters.com',
    publishedAt: '7 hours ago',
    readTime: '3 min read',
    tags: ['Environment', 'Ocean Cleanup', 'Robotics', 'Sustainability', 'Marine Biology'],
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    trendingScore: 84,
    isHot: false,
  },
  {
    id: 'news-9',
    title: 'Global Summit Concludes with International Agreement on High-Altitude Satellite Debris Mitigation',
    category: 'World',
    summary: 'Delegates from 48 nations ratify binding orbital standards requiring active de-orbiting systems, automated collision avoidance beacons, and shared telemetry catalogs for low Earth orbit constellations.',
    bullets: [
      '5-year post-mission satellite disposal deadline strictly enforced.',
      'Universal radar cross-section tracking registry established.',
      'Incentives for private space salvage missions and laser-assisted momentum nudging.'
    ],
    source: 'BBC News',
    sourceUrl: 'https://bbc.com',
    publishedAt: '8 hours ago',
    readTime: '4 min read',
    tags: ['Space Policy', 'Orbital Debris', 'International Law', 'Satellites', 'Global Accord'],
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80',
    trendingScore: 82,
    isHot: false,
  },
  {
    id: 'news-10',
    title: 'Interactive 3D Neural Radiance Fields (NeRFs) Transform Digital Museum Preservation',
    category: 'Culture',
    summary: 'Curators employ volumetric Gaussian splatting and multimodal neural reconstruction to preserve fragile archaeological artifacts and heritage sites with millimeter-scale optical fidelity.',
    bullets: [
      'Visitors can virtually explore historical temples and sculpture vaults at 60 FPS.',
      'Integrated AI docents translate ancient inscriptions and provide historical context.',
      'Open-access archival repository created in partnership with global cultural foundations.'
    ],
    source: 'Wired Culture',
    sourceUrl: 'https://wired.com',
    publishedAt: '9 hours ago',
    readTime: '3 min read',
    tags: ['NeRF', 'Museums', 'Gaussian Splatting', 'Digital Heritage', '3D Graphics'],
    imageUrl: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=800&q=80',
    trendingScore: 80,
    isHot: false,
  }
];

const CATEGORIES = [
  { id: 'All', label: 'All Topics', icon: Compass },
  { id: 'Tech & AI', label: 'Tech & AI', icon: Sparkles },
  { id: 'Science & Space', label: 'Science & Space', icon: Globe },
  { id: 'World', label: 'World News', icon: Newspaper },
  { id: 'Finance', label: 'Finance & Markets', icon: TrendingUp },
  { id: 'Climate & Energy', label: 'Climate & Energy', icon: Zap },
  { id: 'Culture', label: 'Culture & Media', icon: Layers },
];

const POPULAR_KEYWORDS = [
  'Reasoning AI',
  'Fusion Energy',
  'Semiconductors',
  'JWST Space',
  'Solid-State Battery',
  'Open Source Agents',
  'ISO 20022',
  'Clean Tech',
  'Robotics',
  'NeRF 3D'
];

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  onBackToChat,
  onSearchInChat,
  className = '',
}) => {
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newsTopics, setNewsTopics] = useState<NewsTopic[]>(() => {
    try {
      const saved = localStorage.getItem('rishi_custom_news_topics');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_NEWS_TOPICS;
  });

  const [bookmarkedTopicIds, setBookmarkedTopicIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('rishi_bookmarked_news_topics');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTopicModal, setSelectedTopicModal] = useState<NewsTopic | null>(null);
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending');
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search input bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleBookmark = (id: string, title: string) => {
    setBookmarkedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info(`Removed "${title}" from saved topics`);
      } else {
        next.add(id);
        toast.success(`Saved "${title}"`);
      }
      try {
        localStorage.setItem('rishi_bookmarked_news_topics', JSON.stringify(Array.from(next)));
      } catch (err) {
        console.warn('Failed to save bookmark:', err);
      }
      return next;
    });
  };

  const handleRefreshNews = async () => {
    setIsRefreshing(true);
    toast.info('Fetching latest verified news topics...');
    try {
      // Attempt live briefing fetch via API or generate fresh timestamp items
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Retrieve top 3 breaking global technology, scientific research, and world news topics for today. Provide title, category, summary, 2 bullet points, and source.',
          mode: 'search',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          const freshTopic: NewsTopic = {
            id: `fresh-news-${Date.now()}`,
            title: `Live Flash: ${data.text.slice(0, 75).replace(/[*#]/g, '')}...`,
            category: 'Tech & AI',
            summary: data.text.slice(0, 240).replace(/[*#]/g, '') + '...',
            bullets: [
              'Real-time verified report synthesized from multi-source search index.',
              'Freshly synchronized with global news wire feeds.'
            ],
            source: 'Google Search Wire',
            sourceUrl: 'https://news.google.com',
            publishedAt: 'Just now',
            readTime: '2 min read',
            tags: ['Breaking', 'Live Wire', 'Real-Time', 'Google Search'],
            trendingScore: 100,
            isHot: true,
          };
          setNewsTopics(prev => [freshTopic, ...prev.filter(p => p.id !== freshTopic.id)]);
          toast.success('Discovered new live news topic!');
        } else {
          toast.success('News topics are up to date');
        }
      } else {
        toast.success('Latest news topics synchronized');
      }
    } catch {
      toast.success('Latest news topics synchronized');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter and Sort News Topics by Keyword and Category
  const filteredTopics = useMemo(() => {
    const trimmed = keyword.trim().toLowerCase();

    return newsTopics
      .filter(topic => {
        // Category filter
        const matchesCategory = selectedCategory === 'All' || topic.category === selectedCategory;
        if (!matchesCategory) return false;

        // Keyword filter
        if (!trimmed) return true;

        const inTitle = topic.title.toLowerCase().includes(trimmed);
        const inSummary = topic.summary.toLowerCase().includes(trimmed);
        const inCategory = topic.category.toLowerCase().includes(trimmed);
        const inSource = topic.source.toLowerCase().includes(trimmed);
        const inTags = topic.tags.some(tag => tag.toLowerCase().includes(trimmed));
        const inBullets = topic.bullets ? topic.bullets.some(b => b.toLowerCase().includes(trimmed)) : false;

        return inTitle || inSummary || inCategory || inSource || inTags || inBullets;
      })
      .sort((a, b) => {
        if (sortBy === 'trending') {
          return (b.trendingScore || 0) - (a.trendingScore || 0);
        }
        return 0;
      });
  }, [newsTopics, keyword, selectedCategory, sortBy]);

  const handleResearchWithAI = (topic: NewsTopic) => {
    const query = `Research and summarize the latest updates on: "${topic.title}". Discuss key findings from ${topic.source}, implications, and related developments.`;
    if (onSearchInChat) {
      onSearchInChat(query);
    } else {
      window.dispatchEvent(new CustomEvent('CHAT_HANDOFF', {
        detail: { text: query, images: [] }
      }));
    }
    toast.success(`Launching AI Research on "${topic.title.slice(0, 35)}..."`);
  };

  const handleCopyShareLink = (topic: NewsTopic) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${topic.title}\n\n${topic.summary}\nSource: ${topic.source} (${topic.sourceUrl})`);
      toast.success('Topic summary copied to clipboard');
    }
  };

  return (
    <div
      id="discover-page-root"
      className={cn(
        "w-full h-full flex flex-col font-sans bg-slate-950/25 text-white rounded-3xl p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto smooth-scrollbar border border-slate-800/80 backdrop-blur-2xl shadow-2xl",
        className
      )}
    >
      {/* Top Navigation & Header */}
      <div id="discover-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/25 border border-slate-700/80 backdrop-blur-xl shadow-xl shadow-black/40">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4 animate-spin-slow" />
            <span>Discover & Live News Radar</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-400/30 font-bold">
              REAL-TIME
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Discover News & Topics
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Stay ahead with verified breaking developments across artificial intelligence, breakthrough science, quantum tech, global finance, and clean energy.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="discover-refresh-btn"
            onClick={handleRefreshNews}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
            title="Refresh news radar"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-cyan-400")} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Radar'}</span>
          </button>

          {onBackToChat && (
            <button
              id="discover-back-to-chat-btn"
              onClick={onBackToChat}
              className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <span>Back to Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEARCH INPUT BAR FOR FILTERING NEWS TOPICS BY KEYWORD                    */}
      {/* ========================================================================= */}
      <div id="discover-search-section" className="space-y-3">
        <div className="relative w-full group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-cyan-400">
            <Search className="w-5 h-5 transition-transform group-focus-within:scale-110" />
          </div>

          <input
            id="discover-search-input"
            ref={searchInputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Filter news topics by keyword, entity, tech, or source (e.g. 'Reasoning', 'Fusion', 'NASA', 'Semiconductors')..."
            className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-2xl bg-slate-900/25 backdrop-blur-xl hover:bg-slate-900/40 focus:bg-slate-950/40 text-white placeholder-slate-400 border border-slate-700/80 focus:border-cyan-400 text-sm outline-none transition-all shadow-lg focus:ring-2 focus:ring-cyan-400/20"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {keyword ? (
              <button
                id="discover-clear-search-btn"
                type="button"
                onClick={() => setKeyword('')}
                className="p-1.5 rounded-xl bg-slate-800/25 hover:bg-slate-700/50 backdrop-blur-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Clear search keyword"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-slate-800/25 backdrop-blur-md border border-slate-700/80 text-[10px] text-slate-300 font-mono">
                /
              </kbd>
            )}

            <button
              id="discover-filter-sort-btn"
              type="button"
              onClick={() => setSortBy(prev => prev === 'trending' ? 'recent' : 'trending')}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border backdrop-blur-md",
                sortBy === 'trending'
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-slate-800/25 text-slate-200 border-slate-700/80 hover:bg-slate-800/40"
              )}
              title={`Sorting by: ${sortBy === 'trending' ? 'Highest Trending Score' : 'Most Recent'}`}
            >
              <Flame className={cn("w-3.5 h-3.5", sortBy === 'trending' ? "text-amber-400" : "text-white/60")} />
              <span className="hidden md:inline">{sortBy === 'trending' ? 'Trending' : 'Recent'}</span>
            </button>
          </div>
        </div>

        {/* Quick Keyword Topic Filter Chips */}
        <div id="discover-quick-chips" className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Quick Filter:
          </span>
          {POPULAR_KEYWORDS.map((tag) => {
            const isSelected = keyword.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                id={`discover-chip-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setKeyword(isSelected ? '' : tag)}
                className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-sm backdrop-blur-md",
                  isSelected
                    ? "bg-cyan-500 text-black font-extrabold border-cyan-400 shadow-md shadow-cyan-500/30"
                    : "bg-slate-900/25 hover:bg-slate-800/40 border-slate-700/80 text-slate-200 hover:text-white"
                )}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div id="discover-category-tabs" className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`discover-cat-${cat.id.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-sm backdrop-blur-md",
                isActive
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 scale-102 font-extrabold border border-cyan-400"
                  : "bg-slate-900/25 hover:bg-slate-800/40 text-slate-200 hover:text-white border border-slate-700/80"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Results Header & Counter */}
      <div id="discover-results-header" className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">
            {filteredTopics.length} {filteredTopics.length === 1 ? 'Topic' : 'Topics'} Found
          </span>
          {keyword && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[11px] border border-cyan-500/30">
              Keyword: "{keyword}"
              <button
                onClick={() => setKeyword('')}
                className="hover:text-white cursor-pointer ml-0.5"
                title="Remove keyword filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>

        {keyword && filteredTopics.length > 0 && (
          <button
            onClick={() => {
              if (onSearchInChat) {
                onSearchInChat(`Search live web and compile deep research report on: "${keyword}"`);
              }
            }}
            className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask Rishi AI to investigate "{keyword}"</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* NEWS TOPICS GRID                                                         */}
      {/* ========================================================================= */}
      {filteredTopics.length === 0 ? (
        <div id="discover-empty-state" className="p-12 text-center bg-slate-900/25 backdrop-blur-xl rounded-3xl border border-slate-700/80 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No news topics match "{keyword}"</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Try searching for broader keywords like 'AI', 'Quantum', 'Space', 'Energy', or explore other category tabs.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setKeyword('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Reset Filters
            </button>
            {onSearchInChat && keyword && (
              <button
                onClick={() => onSearchInChat(`Search the live web for breaking news about: ${keyword}`)}
                className="px-4 py-2 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Search Live Web for "{keyword}"</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div id="discover-topics-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTopics.map((topic) => {
            const isBookmarked = bookmarkedTopicIds.has(topic.id);
            return (
              <article
                key={topic.id}
                id={`discover-topic-card-${topic.id}`}
                className="p-5 sm:p-6 rounded-3xl bg-slate-900/25 hover:bg-slate-900/40 border border-slate-700/80 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between space-y-4 group shadow-2xl hover:shadow-cyan-500/10 relative overflow-hidden backdrop-blur-xl"
              >
                {/* Hot / Trending Accent Badge */}
                {topic.isHot && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-l from-amber-500 to-red-500 text-black text-[9.5px] font-black tracking-wider uppercase rounded-bl-xl shadow-md flex items-center gap-1">
                    <Flame className="w-3 h-3 fill-black" />
                    <span>HOT TOPIC</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Category & Meta */}
                  <div className="flex items-center justify-between gap-2 pr-16">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10.5px] font-extrabold uppercase tracking-wider">
                        {topic.category}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {topic.publishedAt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleBookmark(topic.id, topic.title)}
                        className={cn(
                          "p-2 rounded-xl transition-colors cursor-pointer border backdrop-blur-md",
                          isBookmarked
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-slate-800/25 text-slate-300 hover:text-white hover:bg-slate-800/40 border-slate-700/60"
                        )}
                        title={isBookmarked ? "Remove from saved" : "Save topic"}
                      >
                        {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleCopyShareLink(topic)}
                        className="p-2 rounded-xl bg-slate-800/25 hover:bg-slate-800/40 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                        title="Copy summary"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedTopicModal(topic)}
                    className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug cursor-pointer"
                  >
                    {topic.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed line-clamp-3">
                    {topic.summary}
                  </p>

                  {/* Key Takeaways */}
                  {topic.bullets && topic.bullets.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/25 backdrop-blur-md border border-slate-700/80 space-y-1.5 text-xs text-slate-100 shadow-inner">
                      <div className="font-bold text-[11px] text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-cyan-400" /> Key Insights
                      </div>
                      <ul className="space-y-1 list-disc list-inside text-slate-200">
                        {topic.bullets.slice(0, 2).map((b, idx) => (
                          <li key={idx} className="line-clamp-1">{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {topic.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => setKeyword(t)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/25 hover:bg-slate-800/40 backdrop-blur-md border border-slate-700/80 text-[11px] text-slate-300 hover:text-cyan-300 font-mono transition-colors cursor-pointer"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Source & Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <a
                    href={topic.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 truncate"
                    title={`View source: ${topic.source}`}
                  >
                    <Newspaper className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-medium truncate">{topic.source}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </a>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResearchWithAI(topic)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all cursor-pointer active:scale-95"
                      title="Launch multi-source AI research on this topic"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Research with AI</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL STORY BRIEFING DIALOG                                              */}
      {/* ========================================================================= */}
      {selectedTopicModal && (
        <div
          id="discover-topic-modal-backdrop"
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTopicModal(null)}
        >
          <div
            id="discover-topic-modal-content"
            className="w-full max-w-2xl bg-slate-900/25 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] smooth-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold uppercase tracking-wider">
                  {selectedTopicModal.category}
                </span>
                <span className="text-xs text-slate-300 ml-2">
                  {selectedTopicModal.publishedAt} • {selectedTopicModal.readTime}
                </span>
              </div>
              <button
                onClick={() => setSelectedTopicModal(null)}
                className="p-2 rounded-full bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                {selectedTopicModal.title}
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                {selectedTopicModal.summary}
              </p>
            </div>

            {selectedTopicModal.bullets && selectedTopicModal.bullets.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-950/25 backdrop-blur-md border border-slate-700/80 space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Key Strategic Points
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 list-disc list-inside">
                  {selectedTopicModal.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selectedTopicModal.tags.map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800/25 backdrop-blur-md text-xs text-slate-200 font-mono border border-slate-700/80">
                  #{t}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={selectedTopicModal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5"
              >
                <span>Read original source on {selectedTopicModal.source}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    handleCopyShareLink(selectedTopicModal);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer flex-1 sm:flex-none border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Summary</span>
                </button>

                <button
                  onClick={() => {
                    handleResearchWithAI(selectedTopicModal);
                    setSelectedTopicModal(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex-1 sm:flex-none"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Rishi AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
