import {
  LettaAgentState,
  LettaExecutionContext,
  LettaExecutionResult,
  LettaExecutionStatus,
  ArchivalSearchResult,
} from './types';
import { LettaStore } from './LettaStore';
import { executeLettaTool } from './LettaTools';
import { streamGeminiAPI, callGeminiAPI } from '../gemini';
import { streamMiniMaxAPI, callMiniMaxAPI } from '../minimax';
import { getAllSettings } from '../settingsStore';
import { MultimodalMediaItem } from '../multimodalMediaHandler';
import { QuestionUnderstandingSystem } from '../understanding/QuestionUnderstandingSystem';
import { ResponseValidatorEngine } from '../understanding/ResponseValidatorEngine';

export class LettaAgentEngine {
  /**
   * Execute the full Letta Agent reasoning, memory retrieval, and LLM synthesis pipeline.
   */
  public static async execute(
    query: string,
    conversationId: string,
    options?: {
      agentId?: string;
      mode?: 'chat' | 'search' | 'research';
      onStatusUpdate?: (status: LettaExecutionStatus) => void;
      onChunk?: (accumulated: string) => void;
      mediaItems?: MultimodalMediaItem[];
      history?: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>;
      signal?: AbortSignal;
    }
  ): Promise<LettaExecutionResult> {
    const agentId = options?.agentId || LettaStore.getActiveAgentId();
    const agent = LettaStore.getOrCreateAgent(agentId);
    const mode = options?.mode || 'chat';
    const onStatusUpdate = options?.onStatusUpdate;
    const onChunk = options?.onChunk;

    const context: LettaExecutionContext = {
      agentId: agent.id,
      conversationId,
      query,
      signal: options?.signal,
      onStatusUpdate,
    };

    const historyTurns = (options?.history || []).map(h => ({
      role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.content,
    }));
    const understanding = QuestionUnderstandingSystem.understand(query, historyTurns, options?.mediaItems);
    const effectiveActionableQuery = understanding.effectiveActionableQuery || query;

    // 1. Thinking / Understanding Stage
    if (onStatusUpdate) {
      onStatusUpdate({
        stage: 'thinking',
        message: 'Letta Agent: Understanding request and analyzing context...',
      });
    }

    // Record user query in Recall Memory
    LettaStore.recordRecallEvent({
      agentId: agent.id,
      conversationId,
      role: 'user',
      content: query,
    });

    // 2. Memory Retrieval Stage (Archival + Core + Cross-Conversation Recall)
    if (onStatusUpdate) {
      onStatusUpdate({
        stage: 'retrieving_memory',
        message: 'Letta Agent: Retrieving relevant core, archival & cross-chat memories...',
      });
    }

    const retrievedPassages: ArchivalSearchResult[] = LettaStore.searchArchivalPassages(
      agent.id,
      effectiveActionableQuery,
      5
    );

    // Cross-conversation recall search across all past chat sessions
    const recallHits = LettaStore.searchRecallMemory(agent.id, effectiveActionableQuery, 5);

    // Fetch recent conversation summaries from other chat sessions for high context continuity
    let recentSummaries: any[] = [];
    try {
      const { ConversationSummarizer } = await import('../memory/ConversationSummarizer');
      recentSummaries = ConversationSummarizer.getRecentSummaries(conversationId, 3);
    } catch {
      recentSummaries = [];
    }

    if (onStatusUpdate) {
      onStatusUpdate({
        stage: 'processing',
        message: `Letta Agent: Loaded ${retrievedPassages.length} archival memories, ${recallHits.length} recalled events & core profile...`,
        archivalHits: retrievedPassages.length,
        memoriesRetrieved: (retrievedPassages.length + recallHits.length + recentSummaries.length),
      });
    }

    // 3. Construct Letta Tiered In-Context Prompt Envelope
    const coreMemorySection = `
<letta_core_memory>
=== HUMAN BLOCK (User Profile, Preferences & Active Topics) ===
${agent.coreMemory.human || 'No user constraints recorded yet.'}

=== PERSONA BLOCK (AI Agent Identity & Mandates) ===
${agent.coreMemory.persona || 'Rishi Letta AI Agent.'}

${agent.coreMemory.project_context ? `=== PROJECT CONTEXT ===\n${agent.coreMemory.project_context}` : ''}
</letta_core_memory>`;

    let archivalMemorySection = '';
    if (retrievedPassages.length > 0) {
      archivalMemorySection = `
<letta_archival_memory>
${retrievedPassages.map((p, idx) => `[Archival Passage ${idx + 1} | Score: ${(p.score * 100).toFixed(0)}% | Tags: ${p.passage.tags.join(', ') || 'knowledge'}]\n${p.passage.content}`).join('\n\n')}
</letta_archival_memory>`;
    }

    let recallMemorySection = '';
    if (recallHits.length > 0) {
      recallMemorySection = `
<letta_recall_context>
=== RECALLED DIALOGUE FROM PREVIOUS CHATS & SESSIONS ===
${recallHits.map((r, idx) => `[Turn ${idx + 1} | Date: ${new Date(r.timestamp).toLocaleDateString()} | Role: ${r.role}]:\n${r.content}`).join('\n\n')}
</letta_recall_context>`;
    }

    let crossChatSummariesSection = '';
    if (recentSummaries.length > 0) {
      crossChatSummariesSection = `
<letta_cross_chat_summaries>
=== RECENT PAST CHAT THREADS CONTEXT ===
${recentSummaries.map((s, idx) => `[Thread ${idx + 1} | ${new Date(s.lastUpdated).toLocaleDateString()}]: ${s.summaryText} | Key Facts: ${s.keyFacts.join(', ') || 'None'}`).join('\n')}
</letta_cross_chat_summaries>`;
    }

    const systemPrompt = `You are Rishi AI, powered by a stateful Letta Agent Brain with persistent hierarchical memory and tools.

${understanding.recommendedSystemInstruction}

CRITICAL OPERATIONAL RULES & ANSWER LOGIC:
1. FIRST SENTENCE DIRECT ANSWER: Always answer the user's primary question immediately in the first sentence. Simple question -> concise answer (1-3 sentences). Complex question -> direct summary first, then structured sections.
2. ZERO CONVERSATIONAL FILLER: Never start with "Sure!", "Certainly!", "I can help with that", or "As an AI".
3. PERSISTENT CROSS-CHAT MEMORY: You have continuous memory across all conversation sessions. When the user asks about previously discussed topics, science questions, or preferences, draw directly upon the recalled dialogue and summaries.
4. GROUNDING IN RETRIEVED MEMORY: Seamlessly ground your answer in the facts and knowledge in <letta_core_memory>, <letta_archival_memory>, <letta_recall_context>, and <letta_cross_chat_summaries>.
5. HIGH ACCURACY & ZERO HALLUCINATION: Calculate math accurately. Verify facts with primary sources.
6. FORMATTING: Use structured Markdown, bold headings, clean bullet points, equations, and syntax-highlighted code blocks.

${coreMemorySection}
${archivalMemorySection}
${recallMemorySection}
${crossChatSummariesSection}`;

    // 4. LLM Execution via configured Provider (Gemini / MiniMax / OpenAI)
    if (onStatusUpdate) {
      onStatusUpdate({
        stage: 'generating',
        message: 'Letta Agent: Synthesizing verified response...',
      });
    }

    const appSettings = getAllSettings();
    const selectedModel = appSettings.selectedModel || 'gemini-3.7-flash';
    let responseText = '';
    let sources: Array<{ title: string; url: string; snippet?: string }> = [];
    let groundingMetadata: any = null;

    if (selectedModel === 'minimax-m3') {
      try {
        if (onChunk) {
          const streamRes = await streamMiniMaxAPI(
            {
              prompt: query,
              systemPrompt,
              model: 'MiniMax-M3',
            },
            (_delta, accumulated) => {
              if (accumulated) onChunk(accumulated);
            }
          );
          if (streamRes.success && streamRes.text) {
            responseText = streamRes.text.trim();
          }
        } else {
          const callRes = await callMiniMaxAPI({
            prompt: query,
            systemPrompt,
            model: 'MiniMax-M3',
          });
          if (callRes.success && callRes.text) {
            responseText = callRes.text.trim();
          }
        }
      } catch (err) {
        console.warn('Letta MiniMax call failed, falling back to Gemini:', err);
      }
    }

    // Default or fallback to Gemini API
    if (!responseText) {
      const historyFormatted = (options?.history || []).slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content || '',
      }));

      if (onChunk) {
        const streamRes = await streamGeminiAPI(
          {
            prompt: query,
            mode,
            systemInstruction: systemPrompt,
            model: selectedModel === 'minimax-m3' ? 'gemini-3.7-flash' : selectedModel,
            history: historyFormatted as any,
          },
          (_delta, accumulated) => {
            if (accumulated) onChunk(accumulated);
          },
          (collectedSources) => {
            if (collectedSources && collectedSources.length > 0) {
              sources = collectedSources;
            }
          },
          (metadata) => {
            if (metadata) {
              groundingMetadata = metadata;
            }
          }
        );

        if (streamRes.success && streamRes.text) {
          responseText = streamRes.text.trim();
          if (streamRes.sources && streamRes.sources.length > 0) {
            sources = streamRes.sources;
          }
          if (streamRes.groundingMetadata) {
            groundingMetadata = streamRes.groundingMetadata;
          }
        }
      } else {
        const geminiRes = await callGeminiAPI({
          prompt: query,
          mode,
          systemInstruction: systemPrompt,
          model: selectedModel === 'minimax-m3' ? 'gemini-3.7-flash' : selectedModel,
          history: historyFormatted as any,
        });

        if (geminiRes.success && geminiRes.text) {
          responseText = geminiRes.text.trim();
          if (geminiRes.sources) sources = geminiRes.sources;
          if (geminiRes.groundingMetadata) groundingMetadata = geminiRes.groundingMetadata;
        }
      }
    }

    // 5. Tool Call Parsing & Execution (if model invoked Letta tools)
    const executedToolCalls: Array<{ name: string; args: any; result: any }> = [];
    const coreMemoryUpdates: string[] = [];
    let humanChanged = false;
    let personaChanged = false;

    // Check if the response contains Letta core memory commands or JSON tool calls
    const toolCallRegex = /\[LETTA_TOOL:([a-zA-Z0-9_]+)\s*({[^}]+})\]/g;
    let match;
    while ((match = toolCallRegex.exec(responseText)) !== null) {
      const toolName = match[1];
      try {
        const args = JSON.parse(match[2]);
        const toolResult = await executeLettaTool(toolName, args, context);
        executedToolCalls.push({ name: toolName, args, result: toolResult });
        if (toolName === 'core_memory_append' || toolName === 'core_memory_replace') {
          if (args.name === 'human') humanChanged = true;
          if (args.name === 'persona') personaChanged = true;
          coreMemoryUpdates.push(`${toolName} on ${args.name}`);
        }
      } catch (err) {
        console.warn('Letta tool execution error:', err);
      }
    }

    // Clean any raw tool invocation syntax from display text
    const cleanDisplayResponse = responseText
      .replace(/\[LETTA_TOOL:[^\]]+\]/g, '')
      .trim();

    // Validate response and remediate if any generic refusal or intent mismatch occurred
    const validation = ResponseValidatorEngine.validate(understanding, cleanDisplayResponse);
    const finalAnswer = validation.remediatedText || cleanDisplayResponse;

    // 6. Self-Improvement & Automatic Extraction (extract persistent facts / preferences)
    this.extractAndPersistMemories(query, finalAnswer, agent.id, conversationId);

    // 7. Save Assistant Response in Recall Memory
    LettaStore.recordRecallEvent({
      agentId: agent.id,
      conversationId,
      role: 'assistant',
      content: finalAnswer,
      toolCalls: executedToolCalls.map(t => ({
        id: `call_${Date.now()}`,
        name: t.name,
        arguments: t.args,
      })),
      toolResults: executedToolCalls.map(t => ({
        toolCallId: `call_${Date.now()}`,
        name: t.name,
        result: t.result,
      })),
    });

    if (onStatusUpdate) {
      onStatusUpdate({
        stage: 'done',
        message: 'Letta Agent: Complete',
      });
    }

    const updatedAgent = LettaStore.getOrCreateAgent(agent.id);

    return {
      text: finalAnswer || cleanDisplayResponse || responseText,
      agentState: updatedAgent,
      toolCallsExecuted: executedToolCalls,
      retrievedPassages,
      coreMemoryDiff: {
        humanChanged,
        personaChanged,
        updates: coreMemoryUpdates,
      },
      sources,
      groundingMetadata,
    };
  }

  /**
   * Self-Improvement & Continuous Learning:
   * Extracts science questions, theories, user facts, preferences, and project context
   * and saves them into the Letta Core Memory or Archival Memory automatically.
   */
  public static autoExtractAndArchive(
    userText: string,
    assistantText: string,
    agentId: string,
    conversationId: string
  ): void {
    const text = userText.trim();
    if (!text || text.length < 5) return;

    const lower = text.toLowerCase();

    // 1. Explicit user preferences & constraints
    const prefPatterns = [
      /(?:i prefer|i like|i always use|my preference is|always answer in|remember that i|note that i)\s+([^\.\,\!\?]+)/gi,
      /(?:my name is|i am a|i work as|my role is)\s+([^\.\,\!\?]+)/gi,
      /(?:we are building|my project stack is|the app architecture is)\s+([^\.\,\!\?]+)/gi,
    ];

    for (const pattern of prefPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const captured = match[0].trim();
        if (captured.length > 5) {
          if (lower.includes('prefer') || lower.includes('like') || lower.includes('name is') || lower.includes('my role is')) {
            // Append to Human block
            LettaStore.appendCoreMemory(agentId, 'human', captured);
          } else if (lower.includes('building') || lower.includes('project') || lower.includes('stack')) {
            // Save as archival passage and project context
            LettaStore.insertArchivalPassage(agentId, captured, ['project', 'architecture'], {
              conversationId,
              importance: 4,
            });
            LettaStore.appendCoreMemory(agentId, 'project_context', captured);
          }
        }
      }
    }

    // 2. Science & Intellectual Topic Archiving
    const scienceKeywords = [
      'physics', 'quantum', 'mechanics', 'entanglement', 'relativity', 'gravity', 'thermodynamics',
      'chemistry', 'molecule', 'atom', 'reaction', 'periodic', 'organic', 'synthesis',
      'biology', 'dna', 'rna', 'gene', 'crispr', 'cell', 'evolution', 'protein', 'enzyme',
      'astronomy', 'black hole', 'planet', 'galaxy', 'star', 'cosmos', 'universe', 'telescope',
      'math', 'mathematics', 'calculus', 'algebra', 'equation', 'theorem', 'derivative', 'integral',
      'science', 'scientific', 'experiment', 'hypothesis', 'theory', 'laboratory', 'neuroscience'
    ];

    const matchedScienceWords = scienceKeywords.filter(kw => lower.includes(kw));
    if (matchedScienceWords.length > 0) {
      const summarySentence = assistantText.split(/(?<=[.?!])\s+/)[0]?.trim() || assistantText.slice(0, 150);
      const sciencePassage = `[Scientific Q&A / Concept]: User asked about "${text.slice(0, 120)}". Summary / Core finding: ${summarySentence.slice(0, 200)}`;
      
      LettaStore.insertArchivalPassage(
        agentId, 
        sciencePassage, 
        ['science', ...matchedScienceWords.slice(0, 3)], 
        { conversationId, importance: 5 }
      );

      // Also track in Letta Core memory human block recent interests
      const topicHeadline = matchedScienceWords.join(', ');
      LettaStore.appendCoreMemory(agentId, 'human', `Explored science topics: ${topicHeadline}`);
    }

    // 3. General Research & Meaningful Questions
    if (text.length > 25 && (lower.startsWith('what') || lower.startsWith('how') || lower.startsWith('why') || lower.startsWith('explain') || lower.startsWith('can you'))) {
      const firstLine = assistantText.split('\n')[0]?.replace(/^#+\s*/, '').trim() || '';
      if (firstLine.length > 10) {
        const generalPassage = `[Discussion Q&A]: "${text.slice(0, 100)}". Takeaway: ${firstLine.slice(0, 150)}`;
        LettaStore.insertArchivalPassage(
          agentId,
          generalPassage,
          ['discussion', 'knowledge'],
          { conversationId, importance: 3 }
        );
      }
    }
  }

  private static extractAndPersistMemories(
    userText: string,
    assistantText: string,
    agentId: string,
    conversationId: string
  ): void {
    this.autoExtractAndArchive(userText, assistantText, agentId, conversationId);
  }
}
