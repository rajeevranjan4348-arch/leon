import { ResolvedContext } from './types';

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp?: string;
  media?: any[];
}

export class ContextResolver {
  /**
   * Resolves pronouns ("this", "it", "that", "he", "she"), elliptical queries ("explain more", "continue", "make it smaller"),
   * and implicit continuity requests by inspecting preceding conversation turns.
   */
  public static resolveContext(
    currentQuery: string,
    history: ConversationTurn[] = []
  ): ResolvedContext {
    const text = currentQuery.trim();
    const lower = text.toLowerCase();

    if (!history || history.length === 0) {
      return {
        hasContextReferences: false,
        contextEnrichedQuery: text,
      };
    }

    // Filter relevant recent turns
    const validHistory = history.filter(h => h.content && h.content.trim().length > 0);
    if (validHistory.length === 0) {
      return {
        hasContextReferences: false,
        contextEnrichedQuery: text,
      };
    }

    const lastTurn = validHistory[validHistory.length - 1];
    const lastUserTurn = [...validHistory].reverse().find(h => h.role === 'user');
    const lastAssistantTurn = [...validHistory].reverse().find(h => h.role === 'assistant' || h.role === 'model');

    // Extract key entities or topics from last turns
    const lastUserContent = lastUserTurn ? lastUserTurn.content.trim() : '';
    const lastAssistantContent = lastAssistantTurn ? lastAssistantTurn.content.trim() : '';

    // Check for code blocks in previous assistant content
    const codeBlockMatch = lastAssistantContent.match(/```(?:[a-z]*\n)?([\s\S]*?)```/);
    const lastCodeSnippet = codeBlockMatch ? codeBlockMatch[1].trim() : undefined;

    // Detect subject of last user query
    let lastSubject = lastUserContent
      .replace(/^(who|what|where|when|why|how|can you|please|tell me about|explain|give|show)\s+(is|are|was|were|do|does|did|to)?\s*/i, '')
      .replace(/[?!.]+$/, '')
      .trim();

    if (lastSubject.length > 80) {
      lastSubject = lastSubject.slice(0, 80) + '...';
    }

    let hasContextReferences = false;
    let referenceType: ResolvedContext['referenceType'] = undefined;
    let contextEnrichedQuery = text;
    let referencedEntity = lastSubject || undefined;
    let referencedTopic = lastSubject || undefined;

    // 1. "explain more" / "tell me more" / "elaborate"
    if (/^(?:explain\s+more|tell\s+me\s+more|elaborate|go\s+deeper|more\s+details?|expand\s+on\s+this|expand)\b/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'continuation';
      contextEnrichedQuery = `Please provide a deeper, more comprehensive explanation and detailed breakdown of: "${lastSubject || 'the previous topic'}".`;
    }

    // 2. "continue" / "go on" / "next"
    else if (/^(?:continue|go\s+on|proceed|next\s+step|next)\b/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'continuation';
      contextEnrichedQuery = `Please continue the previous response about "${lastSubject || 'the subject'}" from where it left off, covering the next steps or details.`;
    }

    // 3. "make it smaller" / "make it concise" / "shorten this" / "summarize it"
    else if (/^(?:make\s+it\s+(?:smaller|shorter|more\s+concise|compact|brief)|shorten\s+this|summarize\s+this|tldr)\b/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'refinement';
      contextEnrichedQuery = `Please condense and summarize the previous explanation/code about "${lastSubject || 'the topic'}" into a very concise, compact, and essential format.`;
    }

    // 4. "what about this?" / "what about that?" / "how about this?"
    else if (/^(?:what|how)\s+about\s+(?:this|that|it)\??$/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'pronoun';
      contextEnrichedQuery = `Regarding "${lastSubject || 'the previous discussion'}", what are the additional implications, edge cases, or relevant details?`;
    }

    // 5. "same for [new topic]" (e.g. "same for history", "same for python", "same for france")
    else if (/^(?:same\s+(?:for|with|in)|what\s+about)\s+(.+)$/i.test(lower)) {
      const match = text.match(/^(?:same\s+(?:for|with|in)|what\s+about)\s+(.+)$/i);
      const newSubject = match?.[1]?.replace(/[?!.]+$/, '').trim() || '';
      hasContextReferences = true;
      referenceType = 'refinement';
      contextEnrichedQuery = `Perform the same analysis / query as done previously for "${lastSubject}", but applied specifically to: "${newSubject}".`;
      referencedEntity = newSubject;
    }

    // 6. "fix this" / "fix the bug" / "why is it failing" / "solve this error"
    else if (/^(?:fix\s+this|fix\s+the\s+bug|solve\s+this|why\s+is\s+it\s+(?:failing|broken|not\s+working)|correct\s+this)\b/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'code_action';
      if (lastCodeSnippet) {
        contextEnrichedQuery = `Please debug, fix errors, and optimize the following previously generated code:\n\`\`\`\n${lastCodeSnippet.slice(0, 1500)}\n\`\`\``;
      } else {
        contextEnrichedQuery = `Please fix the issues, errors, or bugs related to: "${lastSubject || 'the previous topic'}".`;
      }
    }

    // 7. "give code" / "show code" / "code please" / "implement it"
    else if (/^(?:give|show|write|provide)\s+(?:me\s+)?code\b|^code\s+please\b|^implement\s+(?:this|it)\b/i.test(lower)) {
      hasContextReferences = true;
      referenceType = 'code_action';
      contextEnrichedQuery = `Please provide complete, production-ready, type-safe code implementation for: "${lastSubject || 'the concept previously discussed'}".`;
    }

    // 8. General pronoun resolution ("it", "this", "that", "he", "she", "they")
    else if (/\b(it|this|that|he|she|they|its|his|her|their)\b/i.test(lower) && lower.split(/\s+/).length <= 8) {
      if (lastSubject) {
        hasContextReferences = true;
        referenceType = 'pronoun';
        // Replace standalone pronoun with explicit subject reference in context
        const replaced = text
          .replace(/\b(it|this|that)\b/gi, `[${lastSubject}]`)
          .replace(/\b(its)\b/gi, `[${lastSubject}'s]`);
        contextEnrichedQuery = `${replaced} (Context: referring to "${lastSubject}")`;
      }
    }

    // Build brief recent summary
    const recentConversationSummary = validHistory.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.content.slice(0, 100).replace(/\n/g, ' ')}`).join(' | ');

    return {
      hasContextReferences,
      referenceType,
      referencedEntity,
      referencedTopic,
      referencedCodeSnippet: lastCodeSnippet,
      contextEnrichedQuery,
      recentConversationSummary,
    };
  }
}
