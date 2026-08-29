import { StoredMessage, MemoryRecord, ConversationSummary } from './types';
import { MemoryRetriever } from './MemoryRetriever';
import { MemoryManager } from './MemoryManager';
import { ConversationSummarizer } from './ConversationSummarizer';
import { MessageStore } from './MessageStore';
import { globalUndercoverSanitizer } from '@/lib/claw';
import { LettaStore } from '@/lib/letta/LettaStore';
import { documentRagSyncEngine } from '@/lib/rag/DocumentRagSyncEngine';
import { RagSearchResult } from '@/lib/rag/types';

export interface ContextPayload {
  systemPrompt: string;
  userMessage: string;
  recentMessages: StoredMessage[];
  retrievedMemories: MemoryRecord[];
  retrievedHistoricalMessages: StoredMessage[];
  retrievedRagDocuments?: RagSearchResult[];
  summary: ConversationSummary | null;
  implicitMemoryTriggered: boolean;
  implicitMemoryText?: string;
  lettaContext?: {
    coreMemoryHuman: string;
    coreMemoryPersona: string;
    archivalPassagesCount: number;
  };
}

export class ContextBuilder {
  /**
   * Check if user query contains implicit memory reference keywords.
   */
  public static isImplicitMemoryReference(query: string): boolean {
    const lower = query.toLowerCase();
    const triggers = [
      'that thing i asked before',
      'continue from yesterday',
      'use the code we made earlier',
      'what did i say about this',
      'continue where we stopped',
      'as we discussed earlier',
      'remember what we did',
      'what did i tell you',
      'my previous question',
      'earlier today',
      'previous chat',
      'previous conversation',
      'last conversation',
      'last chat',
      'we discussed',
      'we talked about',
      'what did we discuss',
      'what were we talking',
      'remember our',
      'remember the',
      'in my other chat',
      'in our previous',
      'as i said',
      'last time',
      'earlier',
      'continue with the',
      'follow up on'
    ];
    return triggers.some(t => lower.includes(t));
  }

  /**
   * Build unified context pipeline in exact required order with Letta tiered memory.
   */
  public static buildContext(
    currentConversationId: string,
    currentUserMessage: string,
    recentMessages: StoredMessage[] = [],
    baseSystemPrompt = 'You are an intelligent AI assistant with long-term memory and research capabilities.'
  ): ContextPayload {
    // Apply Undercover Mode sanitization to incoming user message
    const { sanitizedText } = globalUndercoverSanitizer.sanitizeOutput(currentUserMessage);
    const isImplicit = this.isImplicitMemoryReference(sanitizedText);

    // Load Letta Agent State & Core Memory
    const agent = LettaStore.getOrCreateAgent();

    // 1. System Instructions Base
    let systemPrompt = baseSystemPrompt;

    // 2. Letta Core Memory (Human Block & Persona Block)
    if (agent.coreMemory.human) {
      systemPrompt += `\n\n<letta_core_memory>\n=== HUMAN BLOCK (User Profile & Preferences) ===\n${agent.coreMemory.human}`;
      if (agent.coreMemory.project_context) {
        systemPrompt += `\n\n=== PROJECT CONTEXT ===\n${agent.coreMemory.project_context}`;
      }
      systemPrompt += `\n</letta_core_memory>`;
    }

    // 3. Letta Archival Memory Retrieval (Automatic passage lookup including science & concepts)
    const archivalHits = LettaStore.searchArchivalPassages(agent.id, currentUserMessage, 5);
    if (archivalHits.length > 0) {
      systemPrompt += `\n\n<letta_archival_memory>\n` + 
        archivalHits.map((h, i) => `[Archival Knowledge ${i + 1} | Score: ${(h.score * 100).toFixed(0)}% | Tags: ${h.passage.tags.join(', ') || 'knowledge'}]:\n${h.passage.content}`).join('\n\n') +
        `\n</letta_archival_memory>`;
    }

    // 4. Legacy User Preferences & Long-Term Memories (synced)
    const allMemories = MemoryManager.getAllMemories();
    const preferences = allMemories.filter(m => m.category === 'preference');
    if (preferences.length > 0) {
      systemPrompt += `\n\n[USER PREFERENCES & PROFILE]:\n` + preferences.map(p => `- ${p.fact}`).join('\n');
    }

    // 5. Retrieved Long-Term Memories (including science takeaways & facts)
    const retrievedMemories = MemoryRetriever.retrieveRelevantMemories(
      currentUserMessage, 
      currentConversationId, 
      undefined,
      6
    );
    if (retrievedMemories.length > 0) {
      systemPrompt += `\n\n[RELEVANT LONG-TERM MEMORIES & PRIOR TOPICS]:\n` + retrievedMemories.map(rm => `- ${rm.memory.fact}`).join('\n');
    }

    // 6. Current & Recent Cross-Conversation Summaries
    const currentSummary = ConversationSummarizer.getSummary(currentConversationId);
    if (currentSummary && currentSummary.summaryText) {
      systemPrompt += `\n\n[CURRENT CONVERSATION SUMMARY]:\n${currentSummary.summaryText}`;
      if (currentSummary.userRequirements.length > 0) {
        systemPrompt += `\nKey Requirements: ${currentSummary.userRequirements.join('; ')}`;
      }
    }

    // Cross-Chat Intelligence: If this is a new chat (few or 0 messages), load recent past chat summaries
    const recentSummaries = ConversationSummarizer.getRecentSummaries(currentConversationId, 3);
    if (recentSummaries.length > 0) {
      systemPrompt += `\n\n[CROSS-CHAT CONTINUITY: RECENT PAST CONVERSATION SUMMARIES]:\n` +
        recentSummaries.map((s, idx) => `[Chat ${idx + 1} (${new Date(s.lastUpdated).toLocaleDateString()})]: ${s.summaryText} | Facts: ${s.keyFacts.join(', ') || 'None'}`).join('\n');
    }

    // 7. Retrieved Historical Messages (Cross-conversation search for recall)
    const searchedMessages = MessageStore.searchMessages(currentUserMessage, currentConversationId, 4);
    const recallEvents = LettaStore.searchRecallMemory(agent.id, currentUserMessage, 4);
    let retrievedHistoricalMessages: StoredMessage[] = [];
    let implicitText = '';

    if (isImplicit || searchedMessages.length > 0 || recallEvents.length > 0) {
      retrievedHistoricalMessages = searchedMessages;
      const msgText = searchedMessages.map(m => `[From previous chat on ${new Date(m.timestamp).toLocaleDateString()} (${m.role})]: ${m.content}`).join('\n\n');
      const recallText = recallEvents.map(r => `[Recalled dialogue on ${new Date(r.timestamp).toLocaleDateString()} (${r.role})]: ${r.content}`).join('\n\n');
      implicitText = [msgText, recallText].filter(Boolean).join('\n\n');
      
      if (implicitText) {
        systemPrompt += `\n\n[CROSS-CHAT RECALLED MESSAGES & DIALOGUE]:\n${implicitText}`;
      }
    }

    // 8. User-Selected RAG Library Documents (Background Sync Index)
    const retrievedRagDocs = documentRagSyncEngine.searchIndexedDocuments(currentUserMessage, 4);
    if (retrievedRagDocs.length > 0) {
      const ragPromptBlock = documentRagSyncEngine.getFormattedRagContext(currentUserMessage, 4);
      if (ragPromptBlock) {
        systemPrompt += `\n\n${ragPromptBlock}`;
      }
    }

    systemPrompt += `\n\nCRITICAL DIRECTIVE: You possess continuous memory across all conversation sessions and access to user-selected indexed documents from the local library. When the user asks questions relevant to indexed documents or previously discussed topics, cite or incorporate the relevant document passages and recalled dialogue accurately in Markdown.`;

    return {
      systemPrompt,
      userMessage: currentUserMessage,
      recentMessages: recentMessages.slice(-10), // Short-term memory (last 10 turns)
      retrievedMemories: retrievedMemories.map(rm => rm.memory),
      retrievedHistoricalMessages,
      retrievedRagDocuments: retrievedRagDocs,
      summary: currentSummary,
      implicitMemoryTriggered: isImplicit || recallEvents.length > 0,
      implicitMemoryText: implicitText,
      lettaContext: {
        coreMemoryHuman: agent.coreMemory.human,
        coreMemoryPersona: agent.coreMemory.persona,
        archivalPassagesCount: archivalHits.length,
      },
    };
  }
}
