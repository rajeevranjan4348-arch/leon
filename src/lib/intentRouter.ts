import { getCityAndWeatherContext } from './weatherService';
import { FreshnessDetector } from './search/FreshnessDetector';

export type IntentType = 'conversation' | 'web';
export type AutoSearchMode = 'chat' | 'search' | 'research';

export interface AutoRoutingResult {
  mode: AutoSearchMode;
  intent: IntentType;
  pluginId?: string;
  isDeepSearch: boolean;
  isWebSearch: boolean;
  reason: string;
}

/**
 * Automatically classifies a user's question into 'chat', 'search', or 'research' (Deep Search)
 * and determines if plugins should be activated.
 */
export function classifyAutoSearchMode(
  message: string,
  options?: { topicCount?: number; isAutoDeepResearch?: boolean }
): AutoRoutingResult {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      mode: 'chat',
      intent: 'conversation',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Empty query',
    };
  }

  // 1. Check if user already explicitly prefixed with [PLUGIN:id]
  const explicitPluginMatch = text.match(/^\[PLUGIN:([^\]]+)\]/i);
  if (explicitPluginMatch) {
    const pId = explicitPluginMatch[1].toLowerCase();
    return {
      mode: pId === 'deep-search' ? 'research' : 'chat',
      intent: pId === 'web-search' || pId === 'deep-search' ? 'web' : 'conversation',
      pluginId: pId,
      isDeepSearch: pId === 'deep-search',
      isWebSearch: pId === 'web-search',
      reason: `Explicit plugin [PLUGIN:${pId}]`,
    };
  }

  // 2. Image Generation Plugin Intent Detection
  if (
    /^(generate|create|make|draw|render|show me|produce|paint)\s+(an?|the)?\s*(image|picture|photo|illustration|drawing|artwork|portrait|wallpaper|visual|graphic)\b/i.test(lower) ||
    /\b(generate image|create image|make image|draw an image|draw a picture|generate an image|make an image|create an image|generate photo|make photo|create photo|generate artwork)\b/i.test(lower) ||
    /\b(image|picture|photo)\s+(of|for|showing)\b/i.test(lower) ||
    /^(draw|sketch|render)\s+/i.test(lower)
  ) {
    return {
      mode: 'chat',
      intent: 'conversation',
      pluginId: 'image-creation',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Image generation plugin triggered',
    };
  }

  // 3. Video / Storyboard Plugin Intent Detection
  if (
    /^(generate|create|make|render|produce|animate)\s+(a|an|the)?\s*(video|animation|clip|movie scene|storyboard|short video|short film)\b/i.test(lower) ||
    /\b(generate video|create video|make video|generate a video|make a video|create a video|generate animation|create animation)\b/i.test(lower) ||
    /\b(video|animation)\s+(of|for|about)\b/i.test(lower)
  ) {
    return {
      mode: 'chat',
      intent: 'conversation',
      pluginId: 'video-creation',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Video creation plugin triggered',
    };
  }

  // 4. Study / Flashcards Plugin Intent Detection
  if (
    /\b(flashcards?|quiz|study guide|practice test|make a quiz|create flashcards)\b/i.test(lower)
  ) {
    return {
      mode: 'chat',
      intent: 'conversation',
      pluginId: 'study-companion',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Study companion plugin triggered',
    };
  }

  // 4b. Agents CLI / ADK Lifecycle Intent Detection
  if (
    /\b(agents[- ]cli|google[- ]agents[- ]cli|adk agent|scaffold agent|evaluate agent|agents eval|agents init|agents deploy|agents list|agents benchmark)\b/i.test(lower) ||
    /^(agents|agents-cli)\s+(list|init|create|eval|run|deploy|skills|tools|show)\b/i.test(lower)
  ) {
    return {
      mode: 'chat',
      intent: 'conversation',
      pluginId: 'agents-cli',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Google Agents CLI / ADK lifecycle intent detected',
    };
  }

  // 4c. Unified 7-Repo Core Subsystems Intent Detection
  if (
    /\b(browser[- ]use|browser agent|cybersecurity audit|owasp scan|security audit|vulnerability scan|scientific hypothesis|literature triangulation|diagram design|mermaid diagram|plantuml diagram|agent memory|openviking|context tree|harness circuit breaker|harness benchmark)\b/i.test(lower)
  ) {
    return {
      mode: 'chat',
      intent: 'conversation',
      pluginId: 'imported-systems',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Unified 7-repo functional core intent detected',
    };
  }

  // 5. DEEP SEARCH (RESEARCH) MODE - Deep analysis, comprehensive report, multi-step investigation
  const deepResearchPatterns = [
    /\b(deep\s*(search|research|dive|analysis|investigation|exploration))\b/i,
    /\b(comprehensive\s+(report|analysis|guide|review|comparison|breakdown))\b/i,
    /\b(in-depth\s+(analysis|report|guide|study|explanation|comparison))\b/i,
    /\b(compare\s+.+\s+(in detail|thoroughly|comprehensively|pros and cons|depth))\b/i,
    /\b(detailed\s+(breakdown|comparison|overview|investigation|study|analysis))\b/i,
    /\b(systematic\s+review|academic\s+synthesis|literature\s+review|exhaustive\s+research)\b/i,
    /\b(multi-faceted\s+analysis|step-by-step\s+deep\s+dive|thoroughly\s+research)\b/i,
    /\b(pros\s+and\s+cons\s+in\s+detail|state\s+of\s+the\s+art\s+analysis)\b/i,
    /\b(full\s+market\s+research|industry\s+analysis\s+report)\b/i,
  ];

  if (
    deepResearchPatterns.some(p => p.test(lower)) ||
    options?.isAutoDeepResearch ||
    (options?.topicCount && options.topicCount >= 3)
  ) {
    return {
      mode: 'research',
      intent: 'web',
      pluginId: 'deep-search',
      isDeepSearch: true,
      isWebSearch: true,
      reason: 'Deep multi-step research intent detected',
    };
  }

  // 6. GREETINGS & CASUAL TALK -> Pure Chat (No web search)
  const greetings = [
    "hi", "hello", "hey", "hii", "hiii", "good morning", "good afternoon",
    "good evening", "how are you", "what's up", "whats up", "yo", "sup"
  ];
  if (greetings.includes(lower)) {
    return {
      mode: 'chat',
      intent: 'conversation',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Greeting',
    };
  }

  const casualPatterns = [
    /^how are you\b/i,
    /^who are you\b/i,
    /^what can you do\b/i,
    /^thank you\b/i,
    /^thanks\b/i,
    /^bye\b/i,
    /^good night\b/i,
    /^help me\b/i,
  ];
  if (casualPatterns.some(p => p.test(lower))) {
    return {
      mode: 'chat',
      intent: 'conversation',
      isDeepSearch: false,
      isWebSearch: false,
      reason: 'Casual conversation',
    };
  }

  // 7. FreshnessDetector for Automatic Web Search Routing
  const freshnessAnalysis = FreshnessDetector.analyze(text);
  if (freshnessAnalysis.needsSearch) {
    return {
      mode: freshnessAnalysis.category === 'deep_research' ? 'research' : 'search',
      intent: 'web',
      pluginId: 'web-search',
      isDeepSearch: freshnessAnalysis.category === 'deep_research',
      isWebSearch: true,
      reason: freshnessAnalysis.reason,
    };
  }

  // 8. General AI Chat (Coding, math, creative writing, explanations)
  return {
    mode: 'chat',
    intent: 'conversation',
    isDeepSearch: false,
    isWebSearch: false,
    reason: 'Standard conversational AI response',
  };
}

export function detectIntent(message: string): IntentType { 
  const res = classifyAutoSearchMode(message);
  return res.intent;
}

/**
 * Enriches system prompt with real-time city and weather context
 */
export async function enrichPromptWithWeatherContext(prompt: string, existingSystemInstruction?: string): Promise<{ prompt: string; systemInstruction: string }> {
  const weatherContext = await getCityAndWeatherContext(prompt);

  const enrichedSystemInstruction = existingSystemInstruction
    ? `${existingSystemInstruction}\n\n${weatherContext}`
    : `You are a modern AI assistant equipped with an AI Emoji & Smart Response System.
Your responses must be clear, concise, professional, friendly, and visually structured.
Use relevant emojis naturally (💡, ✅, ❌, ⚠️, 🔥, 🚀, 📌, 💻, 🔧, 🧠, 📚, 🔍, 🎯, ⚡).
Format with Markdown. Match user language (English, Hindi, Hinglish).\n${weatherContext}`;

  return {
    prompt,
    systemInstruction: enrichedSystemInstruction,
  };
}


