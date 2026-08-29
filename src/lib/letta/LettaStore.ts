import {
  LettaAgentState,
  ArchivalPassage,
  ArchivalSearchResult,
  RecallEvent,
  CoreMemory
} from './types';

const STORAGE_KEY_AGENTS = 'letta_agents_store_v1';
const STORAGE_KEY_ARCHIVAL = 'letta_archival_passages_v1';
const STORAGE_KEY_RECALL = 'letta_recall_events_v1';
const STORAGE_KEY_ACTIVE_AGENT_ID = 'letta_active_agent_id_v1';

// Default default Human and Persona block contents
const DEFAULT_HUMAN_BLOCK = `User profile & key preferences:
- Name: User
- Style Preference: Concise, direct, high-value, well-formatted answers with markdown
- Technical interests: Full-stack development, modern AI agents, TypeScript, Python
- Constraints: No hallucinated facts or unverified claims; direct answer in the first sentence`;

const DEFAULT_PERSONA_BLOCK = `I am Rishi AI, powered by a stateful Letta Agent Brain with persistent hierarchical memory (Core Memory, Archival Memory, Recall Memory).
- Tone: Friendly, highly intelligent, objective, composed, direct
- Mandate: Provide immediate, high-accuracy solutions without conversational filler or preambles
- Capabilities: Live web search grounding, native multimodal vision, document analysis, code synthesis, mathematical derivations, persistent memory across threads`;

const DEFAULT_PROJECT_CONTEXT = `Active Project:
- Multi-capability AI assistant with Letta stateful agent memory
- Real-time communications, AI vision, location awareness, web search grounding`;

export class LettaStore {
  /**
   * Get the active Agent ID.
   */
  public static getActiveAgentId(): string {
    try {
      const id = localStorage.getItem(STORAGE_KEY_ACTIVE_AGENT_ID);
      if (id) return id;
    } catch {}
    return 'default_letta_agent';
  }

  /**
   * Set the active Agent ID.
   */
  public static setActiveAgentId(agentId: string): void {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT_ID, agentId);
    } catch {}
  }

  /**
   * Load all Letta agents.
   */
  public static getAllAgents(): LettaAgentState[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AGENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Save all Letta agents.
   */
  public static saveAllAgents(agents: LettaAgentState[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_AGENTS, JSON.stringify(agents));
    } catch (e) {
      console.warn('LettaStore: failed to save agents', e);
    }
  }

  /**
   * Get or initialize the primary Letta Agent.
   */
  public static getOrCreateAgent(agentId = 'default_letta_agent'): LettaAgentState {
    const agents = this.getAllAgents();
    const existing = agents.find(a => a.id === agentId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const defaultAgent: LettaAgentState = {
      id: agentId,
      name: 'Rishi Letta Brain',
      description: 'Persistent stateful Letta agent with tiered memory, tool autonomy, and cross-session knowledge retention.',
      systemPrompt: 'You are a persistent stateful AI assistant equipped with Letta OS-level hierarchical memory and tool integration.',
      coreMemory: {
        human: DEFAULT_HUMAN_BLOCK,
        persona: DEFAULT_PERSONA_BLOCK,
        project_context: DEFAULT_PROJECT_CONTEXT,
        task_state: 'Ready to assist with questions, research, code development, and analysis.',
      },
      tools: [
        'core_memory_append',
        'core_memory_replace',
        'archival_memory_insert',
        'archival_memory_search',
        'conversation_search',
        'web_search',
        'calculator_eval',
      ],
      llmConfig: {
        model: 'gemini-3.7-flash',
        provider: 'gemini',
        contextWindow: 64000,
        temperature: 0.3,
      },
      embeddingConfig: {
        model: 'text-embedding-004',
        embeddingDim: 768,
      },
      stats: {
        messagesCount: 0,
        archivalPassagesCount: 0,
        coreMemoryEditsCount: 0,
        toolInvocationsCount: 0,
        lastActive: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    agents.push(defaultAgent);
    this.saveAllAgents(agents);
    this.setActiveAgentId(agentId);
    return defaultAgent;
  }

  /**
   * Save or update an agent.
   */
  public static saveAgent(agent: LettaAgentState): void {
    const agents = this.getAllAgents();
    const index = agents.findIndex(a => a.id === agent.id);
    agent.updatedAt = new Date().toISOString();
    if (index >= 0) {
      agents[index] = agent;
    } else {
      agents.push(agent);
    }
    this.saveAllAgents(agents);
  }

  /**
   * Update Core Memory block for an agent.
   */
  public static updateCoreMemory(
    agentId: string, 
    blockName: keyof CoreMemory | string, 
    value: string
  ): CoreMemory {
    const agent = this.getOrCreateAgent(agentId);
    agent.coreMemory[blockName] = value;
    agent.stats.coreMemoryEditsCount += 1;
    this.saveAgent(agent);
    return agent.coreMemory;
  }

  /**
   * Append content to Core Memory block.
   */
  public static appendCoreMemory(
    agentId: string, 
    blockName: keyof CoreMemory | string, 
    contentToAppend: string
  ): { success: boolean; newContent: string; message: string } {
    const agent = this.getOrCreateAgent(agentId);
    const existing = agent.coreMemory[blockName] || '';
    const cleanAppend = contentToAppend.trim();

    if (!cleanAppend) {
      return { success: false, newContent: existing, message: 'Content to append is empty' };
    }

    // Deduplication check
    if (existing.toLowerCase().includes(cleanAppend.toLowerCase())) {
      return { success: true, newContent: existing, message: 'Content already present in core memory block' };
    }

    const separator = existing.endsWith('\n') ? '' : '\n';
    const newContent = `${existing}${separator}- ${cleanAppend}`;
    agent.coreMemory[blockName] = newContent;
    agent.stats.coreMemoryEditsCount += 1;
    this.saveAgent(agent);

    return { 
      success: true, 
      newContent, 
      message: `Successfully appended to core memory block [${String(blockName)}]` 
    };
  }

  /**
   * Replace text within a Core Memory block.
   */
  public static replaceCoreMemory(
    agentId: string,
    blockName: keyof CoreMemory | string,
    oldText: string,
    newText: string
  ): { success: boolean; newContent: string; message: string } {
    const agent = this.getOrCreateAgent(agentId);
    const existing = agent.coreMemory[blockName] || '';

    if (!existing.includes(oldText)) {
      // Fuzzy/case-insensitive fallback
      const lowerExisting = existing.toLowerCase();
      const lowerOld = oldText.toLowerCase();
      const idx = lowerExisting.indexOf(lowerOld);
      if (idx >= 0) {
        const actualTarget = existing.substring(idx, idx + oldText.length);
        const updated = existing.replace(actualTarget, newText);
        agent.coreMemory[blockName] = updated;
        agent.stats.coreMemoryEditsCount += 1;
        this.saveAgent(agent);
        return { success: true, newContent: updated, message: `Replaced in core memory block [${String(blockName)}]` };
      }
      return { success: false, newContent: existing, message: `Target text "${oldText}" not found in block [${String(blockName)}]` };
    }

    const updated = existing.replace(oldText, newText);
    agent.coreMemory[blockName] = updated;
    agent.stats.coreMemoryEditsCount += 1;
    this.saveAgent(agent);
    return { success: true, newContent: updated, message: `Successfully replaced in core memory block [${String(blockName)}]` };
  }

  // -------------------------------------------------------------
  // ARCHIVAL MEMORY (PASSAGES & DOCUMENTS)
  // -------------------------------------------------------------

  /**
   * Get all Archival Passages for an agent.
   */
  public static getAllArchivalPassages(agentId?: string): ArchivalPassage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ARCHIVAL);
      if (!raw) return [];
      const parsed: ArchivalPassage[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      if (agentId) {
        return parsed.filter(p => p.agentId === agentId || !p.agentId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  /**
   * Save all Archival Passages.
   */
  public static saveAllArchivalPassages(passages: ArchivalPassage[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_ARCHIVAL, JSON.stringify(passages));
    } catch (e) {
      console.warn('LettaStore: failed to save archival passages', e);
    }
  }

  /**
   * Insert a passage into Archival Memory with deduplication.
   */
  public static insertArchivalPassage(
    agentId: string,
    content: string,
    tags: string[] = [],
    metadata?: ArchivalPassage['metadata']
  ): ArchivalPassage {
    const passages = this.getAllArchivalPassages();
    const cleanContent = content.trim();
    const now = new Date().toISOString();

    // Check for existing duplicate passage
    const existing = passages.find(p => 
      p.agentId === agentId && p.content.toLowerCase() === cleanContent.toLowerCase()
    );

    if (existing) {
      existing.lastAccessedAt = now;
      existing.accessCount += 1;
      if (tags && tags.length > 0) {
        existing.tags = Array.from(new Set([...existing.tags, ...tags]));
      }
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      this.saveAllArchivalPassages(passages);
      return existing;
    }

    const newPassage: ArchivalPassage = {
      id: `arch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      content: cleanContent,
      tags: tags || [],
      metadata: metadata || {},
      createdAt: now,
      accessCount: 1,
      lastAccessedAt: now,
    };

    const updated = [newPassage, ...passages];
    this.saveAllArchivalPassages(updated);

    // Update agent stats
    const agent = this.getOrCreateAgent(agentId);
    agent.stats.archivalPassagesCount = updated.filter(p => p.agentId === agentId).length;
    this.saveAgent(agent);

    return newPassage;
  }

  /**
   * Delete an archival passage by ID.
   */
  public static deleteArchivalPassage(passageId: string): boolean {
    const passages = this.getAllArchivalPassages();
    const initialLen = passages.length;
    const filtered = passages.filter(p => p.id !== passageId);
    if (filtered.length !== initialLen) {
      this.saveAllArchivalPassages(filtered);
      return true;
    }
    return false;
  }

  /**
   * Search Archival Passages using hybrid semantic + keyword scoring.
   */
  public static searchArchivalPassages(
    agentId: string,
    query: string,
    limit = 5,
    tagFilter?: string[]
  ): ArchivalSearchResult[] {
    const passages = this.getAllArchivalPassages(agentId);
    if (passages.length === 0 || !query || !query.trim()) return [];

    const cleanQuery = query.toLowerCase().trim();
    const queryTokens = cleanQuery
      .split(/[\s,.;:!?\-+*/\\_"'`~()[\]{}<>]+/)
      .filter(t => t.length > 2);

    const scored: ArchivalSearchResult[] = [];

    for (const passage of passages) {
      // Check tag filter
      if (tagFilter && tagFilter.length > 0) {
        const hasTag = tagFilter.some(t => passage.tags.includes(t));
        if (!hasTag) continue;
      }

      const contentLower = passage.content.toLowerCase();
      let matchScore = 0;
      let matchType: ArchivalSearchResult['matchType'] = 'keyword';

      // 1. Exact phrase match
      if (contentLower.includes(cleanQuery)) {
        matchScore += 0.8;
        matchType = 'semantic';
      }

      // 2. Token overlap & keyword frequency
      let tokenMatches = 0;
      for (const token of queryTokens) {
        if (contentLower.includes(token)) {
          tokenMatches += 1;
          // Count occurrences
          const regex = new RegExp(token, 'gi');
          const count = (passage.content.match(regex) || []).length;
          matchScore += Math.min(0.3, count * 0.1);
        }
      }

      if (queryTokens.length > 0) {
        const tokenRatio = tokenMatches / queryTokens.length;
        matchScore += tokenRatio * 0.5;
      }

      // 3. Tag relevance
      const matchingTags = passage.tags.filter(t => cleanQuery.includes(t.toLowerCase()));
      if (matchingTags.length > 0) {
        matchScore += 0.25 * matchingTags.length;
        matchType = 'tag';
      }

      // 4. Recency & Access importance boost
      const importance = passage.metadata?.importance || 3;
      matchScore += (importance / 5) * 0.15;

      if (matchScore > 0.2) {
        scored.push({
          passage,
          score: Math.min(1.0, Math.round(matchScore * 100) / 100),
          matchType,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit);

    // Update access stats for retrieved passages
    if (results.length > 0) {
      const now = new Date().toISOString();
      const updatedPassages = passages.map(p => {
        const hit = results.find(r => r.passage.id === p.id);
        if (hit) {
          return { ...p, lastAccessedAt: now, accessCount: p.accessCount + 1 };
        }
        return p;
      });
      this.saveAllArchivalPassages(updatedPassages);
    }

    return results;
  }

  // -------------------------------------------------------------
  // RECALL MEMORY (EVENT STREAM / CONVERSATION SEARCH)
  // -------------------------------------------------------------

  /**
   * Get all Recall Events for an agent.
   */
  public static getAllRecallEvents(agentId?: string): RecallEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECALL);
      if (!raw) return [];
      const parsed: RecallEvent[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      if (agentId) {
        return parsed.filter(e => e.agentId === agentId || !e.agentId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  /**
   * Save all Recall Events.
   */
  public static saveAllRecallEvents(events: RecallEvent[]): void {
    try {
      // Limit recall event storage to last 1000 events to prevent quota overflow
      const trimmed = events.slice(0, 1000);
      localStorage.setItem(STORAGE_KEY_RECALL, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('LettaStore: failed to save recall events', e);
    }
  }

  /**
   * Record a new event into Recall Memory.
   */
  public static recordRecallEvent(event: Omit<RecallEvent, 'id' | 'timestamp'>): RecallEvent {
    const events = this.getAllRecallEvents();
    const newEvent: RecallEvent = {
      ...event,
      id: `recall_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };

    const updated = [newEvent, ...events];
    this.saveAllRecallEvents(updated);

    // Update agent message stats
    const agent = this.getOrCreateAgent(event.agentId);
    agent.stats.messagesCount = updated.filter(e => e.agentId === event.agentId).length;
    agent.stats.lastActive = newEvent.timestamp;
    this.saveAgent(agent);

    return newEvent;
  }

  /**
   * Search Recall Memory across conversation history with smart token, semantic, and topic scoring.
   */
  public static searchRecallMemory(
    agentId: string,
    query: string,
    limit = 10,
    conversationId?: string
  ): RecallEvent[] {
    const events = this.getAllRecallEvents(agentId);
    if (!query || !query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    // Stopwords list to focus on key topical and science terms
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'and', 'or', 'to', 'for', 'of',
      'with', 'about', 'as', 'by', 'that', 'this', 'it', 'from', 'what', 'did', 'we',
      'talk', 'discuss', 'tell', 'me', 'remember', 'previous', 'last', 'earlier', 'chat',
      'conversation', 'before', 'our', 'my', 'can', 'you', 'explain', 'again', 'show'
    ]);

    const queryTokens = lowerQuery
      .split(/[\s,.;:!?\-+*/\\_"'`~()[\]{}<>]+/)
      .filter(t => t.length > 2 && !stopWords.has(t));

    const scored: Array<{ event: RecallEvent; score: number }> = [];

    for (const event of events) {
      if (conversationId && event.conversationId !== conversationId) continue;
      const contentLower = event.content.toLowerCase();
      let score = 0;

      // 1. Direct substring match bonus
      if (contentLower.includes(lowerQuery)) {
        score += 1.0;
      }

      // 2. Token overlap and frequency
      if (queryTokens.length > 0) {
        let tokenHits = 0;
        for (const token of queryTokens) {
          if (contentLower.includes(token)) {
            tokenHits += 1;
            // Additional frequency bonus
            const regex = new RegExp(token, 'gi');
            const count = (event.content.match(regex) || []).length;
            score += Math.min(0.25, count * 0.08);
          } else {
            // Prefix / stem match
            if (token.length > 4) {
              const prefix = token.slice(0, 4);
              if (contentLower.includes(prefix)) {
                score += 0.15;
              }
            }
          }
        }
        score += (tokenHits / queryTokens.length) * 0.7;
      } else {
        // If all query tokens were stop words (e.g. "what did we discuss earlier?")
        // match events from past turns
        score += 0.3;
      }

      // 3. Recency weighting (more recent events get slight boost)
      const eventTime = new Date(event.timestamp).getTime();
      const ageHours = Math.max(0, (Date.now() - eventTime) / (1000 * 60 * 60));
      const recencyBoost = Math.exp(-ageHours / 72) * 0.15;
      score += recencyBoost;

      // 4. Role preference: user queries and assistant explanations both valuable
      if (event.role === 'user') score += 0.05;

      if (score >= 0.25) {
        scored.push({ event, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.event);
  }

  /**
   * Clear all Letta Memory for an agent or globally.
   */
  public static clearAllData(agentId?: string): void {
    if (!agentId) {
      localStorage.removeItem(STORAGE_KEY_AGENTS);
      localStorage.removeItem(STORAGE_KEY_ARCHIVAL);
      localStorage.removeItem(STORAGE_KEY_RECALL);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_AGENT_ID);
    } else {
      const agents = this.getAllAgents().filter(a => a.id !== agentId);
      this.saveAllAgents(agents);
      const passages = this.getAllArchivalPassages().filter(p => p.agentId !== agentId);
      this.saveAllArchivalPassages(passages);
      const events = this.getAllRecallEvents().filter(e => e.agentId !== agentId);
      this.saveAllRecallEvents(events);
    }
  }
}
