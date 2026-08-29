import { QuestionIntent, DisambiguationInfo } from './types';

// Genuinely ambiguous polysemous terms that have 2+ vastly different common meanings
const AMBIGUOUS_ENTITIES: Record<string, { meanings: [string, string]; clarification: string }> = {
  'apple': {
    meanings: ['Apple Inc. (Technology company & products)', 'Apple (the edible fruit)'],
    clarification: 'Do you mean Apple Inc. (the technology company) or the fruit?',
  },
  'mercury': {
    meanings: ['Mercury (the planet in the Solar System)', 'Mercury (the chemical element / metal)'],
    clarification: 'Are you asking about Mercury the planet, the chemical element (Hg), or mythology?',
  },
  'jaguar': {
    meanings: ['Jaguar (the wild big cat species)', 'Jaguar (the luxury automobile brand)'],
    clarification: 'Do you mean Jaguar the animal species or Jaguar the car manufacturer?',
  },
  'python': {
    meanings: ['Python (the programming language)', 'Python (the constrictor snake)'],
    clarification: 'Are you asking about Python programming language or python snakes?',
  },
  'amazon': {
    meanings: ['Amazon (e-commerce & cloud tech company)', 'Amazon Rainforest / River'],
    clarification: 'Do you mean Amazon the technology/e-commerce company or the Amazon Rainforest?',
  },
  'tesla': {
    meanings: ['Tesla Inc. (electric vehicles & energy)', 'Nikola Tesla (the inventor & physicist)'],
    clarification: 'Are you referring to Tesla Inc. (automotive/energy) or the inventor Nikola Tesla?',
  },
};

export class IntentAnalyzer {
  /**
   * Classify intent holistically using structural grammar, linguistic cues, and semantic context.
   */
  public static analyzeIntent(
    query: string,
    hasAttachments = false,
    hasPreviousTurns = false
  ): { intent: QuestionIntent; disambiguation: DisambiguationInfo } {
    const text = query.trim();
    const lower = text.toLowerCase().replace(/[?!.,]+$/, '').trim();

    // 1. Check for genuine ambiguity in very short, polysemous queries
    if (AMBIGUOUS_ENTITIES[lower] || lower.match(/^(?:tell\s+me\s+about|what\s+is|about)\s+([a-zA-Z]+)$/i)) {
      const match = lower.match(/^(?:tell\s+me\s+about|what\s+is|about)\s+([a-zA-Z]+)$/i);
      const entity = match ? match[1].toLowerCase() : lower;
      if (AMBIGUOUS_ENTITIES[entity]) {
        const info = AMBIGUOUS_ENTITIES[entity];
        return {
          intent: 'DISAMBIGUATION_NEEDED',
          disambiguation: {
            isAmbiguous: true,
            candidateMeanings: info.meanings,
            clarificationQuestion: info.clarification,
            primaryInterpretation: info.meanings[0],
            secondaryInterpretation: info.meanings[1],
          },
        };
      }
    }

    // Default disambiguation state
    const defaultDisambiguation: DisambiguationInfo = {
      isAmbiguous: false,
    };

    // 2. Multimodal analysis
    if (hasAttachments || /\b(this\s+image|attached\s+photo|this\s+video|in\s+this\s+pdf|this\s+document|the\s+attached\s+file)\b/i.test(lower)) {
      return { intent: 'MULTIMODAL_ANALYSIS', disambiguation: defaultDisambiguation };
    }

    // 3. Mathematical & Quantitative Calculation
    const isMathExpression = /^[\d\s\+\-\*\/\(\)\.\^\%\=]+$/.test(lower) && /[\d]/.test(lower) && /[\+\-\*\/\^\%]/.test(lower);
    const hasMathKeywords = /\b(calculate|compute|solve|math|equation|percentage|square root|arithmetic|integral|derivative|sum of|product of|divided by|multiplied by)\b/i.test(lower);
    if (isMathExpression || hasMathKeywords || /^(?:what is|\s*)\s*(\d+\s*[\+\-\*\/\^\%]\s*\d+)/i.test(lower)) {
      return { intent: 'MATHEMATICAL_CALCULATION', disambiguation: defaultDisambiguation };
    }

    // 4. Comparison & Decision (e.g. "React vs Vue", "Which is better X or Y?", "compare A and B")
    if (/\b(?:vs\.?|versus|compare|comparison|difference between|which is better|which one should i choose|pros and cons of)\b/i.test(lower)) {
      return { intent: 'COMPARISON_DECISION', disambiguation: defaultDisambiguation };
    }

    // 5. Fact-Checking & Verification (e.g. "Is it true that...", "fact check...", "did X really happen?")
    if (/\b(?:is it true that|fact check|verify if|did .* really|is .* fake|myth or fact)\b/i.test(lower)) {
      return { intent: 'FACT_CHECKING', disambiguation: defaultDisambiguation };
    }

    // 6. Casual greetings and social conversation
    const greetingsList = [
      'hi', 'hello', 'hey', 'hii', 'hiii', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'whats up', "what's up", 'how do you do', 'sup', 'yo', 'thanks', 'thank you', 'bye', 'goodbye'
    ];
    if (greetingsList.includes(lower) || (lower.length < 15 && greetingsList.some(g => lower === g || lower.startsWith(g + ' ')))) {
      return { intent: 'CASUAL_CONVERSATION', disambiguation: defaultDisambiguation };
    }

    // 4. Location, Navigation, Route & Places
    if (/\b(?:navigate|take me to|drive me to|start navigation to|navigate me to)\b/i.test(lower)) {
      return { intent: 'NAVIGATION', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:directions|direct me|guide me|way to|how to reach|how do i get to)\b/i.test(lower)) {
      return { intent: 'DIRECTIONS', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:route to|show me the route|best route to|fastest route to)\b/i.test(lower)) {
      return { intent: 'ROUTE', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:how far is|distance to|distance between|what is the distance)\b/i.test(lower)) {
      return { intent: 'DISTANCE', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:how long will it take|travel time to|eta to|eta for)\b/i.test(lower)) {
      return { intent: 'ETA', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:near me|nearby|nearest|around here)\b/i.test(lower) && /\b(?:restaurant|hospital|hotel|pharmacy|cafe|coffee|petrol|gas station|atm|park|store|food|shop)\b/i.test(lower)) {
      return { intent: 'NEARBY_SEARCH', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:where is|location of|where can i find)\b/i.test(lower)) {
      return { intent: 'LOCATION_SEARCH', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:show (?:me )?map|open map|map view of)\b/i.test(lower)) {
      return { intent: 'MAP_REQUEST', disambiguation: defaultDisambiguation };
    }
    if (/\b(?:where am i|my current location|live location|current gps)\b/i.test(lower)) {
      return { intent: 'LIVE_LOCATION', disambiguation: defaultDisambiguation };
    }

    // 5. Code Debugging & Bug Fixes
    const isDebugging = /\b(error|bug|fix|failing|not working|broken|syntaxerror|typeerror|undefined is not|nullpointer|exception|stack trace|segfault|crash|cant run|cannot run|infinite loop)\b/i.test(lower) &&
      (/\b(code|function|script|react|typescript|python|javascript|component|api|backend|frontend|sql|html|css)\b/i.test(lower) || text.includes('```'));
    if (isDebugging) {
      return { intent: 'CODE_DEBUGGING', disambiguation: defaultDisambiguation };
    }

    // 5. Code Generation / Architecture
    const isCodeGeneration = /\b(write|give|create|build|generate|implement|code|script|component|hook|class|function|algorithm|endpoint|regex|query|database schema)\b/i.test(lower) &&
      /\b(python|javascript|typescript|react|html|css|tailwind|node|express|sql|c\+\+|java|rust|go|swift|kotlin|php|code|api)\b/i.test(lower) ||
      /^(?:write|give|generate|show)\s+(?:me\s+)?(?:the\s+)?code\b/i.test(lower);
    if (isCodeGeneration) {
      return { intent: 'CODE_GENERATION', disambiguation: defaultDisambiguation };
    }

    // 6. Continuation & Follow-up
    if (hasPreviousTurns) {
      const isContinuation = /^(?:explain\s+more|continue|go\s+on|make\s+it\s+(?:smaller|shorter|concise)|what\s+about\s+(?:this|that|it)|same\s+for|fix\s+this|give\s+code)\b/i.test(lower);
      if (isContinuation) {
        return { intent: 'CONTINUATION_FOLLOWUP', disambiguation: defaultDisambiguation };
      }
    }

    // 7. How-To Guide & Instructions
    if (/^how\s+(?:to|do\s+i|can\s+i|should\s+i|does\s+one)\b/i.test(lower) || /\b(?:step-by-step|tutorial|guide\s+for|how\s+do\s+you)\b/i.test(lower)) {
      return { intent: 'HOW_TO_GUIDE', disambiguation: defaultDisambiguation };
    }

    // 8. Conceptual Explanation
    if (/^(?:explain|why\s+is|why\s+does|why\s+do|what\s+is\s+the\s+difference\s+between|compare|describe|how\s+does\s+.+\s+work)\b/i.test(lower)) {
      return { intent: 'CONCEPTUAL_EXPLANATION', disambiguation: defaultDisambiguation };
    }

    // 9. Task / Instruction (Summarize, Draft, Rewrite, Format, Translate)
    if (/^(?:summarize|draft|write\s+(?:an?\s+)?(?:email|letter|essay|post)|rewrite|rephrase|translate|convert|format|calculate|compute)\b/i.test(lower)) {
      return { intent: 'TASK_INSTRUCTION', disambiguation: defaultDisambiguation };
    }

    // 10. Factual Question (Who, What, Where, When, Current Info)
    if (/^(?:who|what|where|when|which|is|are|was|were|has|have|does|did|will|can)\b/i.test(lower)) {
      return { intent: 'FACTUAL_QUESTION', disambiguation: defaultDisambiguation };
    }

    // Default to Conceptual Explanation if detailed, or Factual Question if short
    return {
      intent: text.split(/\s+/).length > 8 ? 'CONCEPTUAL_EXPLANATION' : 'FACTUAL_QUESTION',
      disambiguation: defaultDisambiguation,
    };
  }
}
