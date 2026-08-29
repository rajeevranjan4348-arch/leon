import { InputNormalizer } from './InputNormalizer';
import { LanguageTypoDetector } from './LanguageTypoDetector';
import { ContextResolver, ConversationTurn } from './ContextResolver';
import { IntentAnalyzer } from './IntentAnalyzer';
import { EntityTopicExtractor } from './EntityTopicExtractor';
import { MultimodalAnalyzer } from './MultimodalAnalyzer';
import { QuestionUnderstandingResult, QuestionIntent } from './types';

export class QuestionUnderstandingSystem {
  /**
   * Master Question Understanding Engine:
   * Translates raw user message into deep, intent-grounded understanding representation.
   * Runs the full 10-step architectural pipeline.
   */
  public static understand(
    rawQuery: string,
    history: ConversationTurn[] = [],
    attachments: any[] = []
  ): QuestionUnderstandingResult {
    // 1. Input Normalizer
    const normalizedInput = InputNormalizer.normalize(rawQuery);

    // 2. Language + Typo Detection (including Hinglish and incomplete query reconstruction)
    const languageAnalysis = LanguageTypoDetector.analyze(normalizedInput.normalized);

    // 3. Context Retrieval & Pronoun/Reference Resolution
    // Use the typo-corrected query as the base for context resolution
    const effectiveBaseQuery = languageAnalysis.correctedText || normalizedInput.normalized;
    const contextResolution = ContextResolver.resolveContext(effectiveBaseQuery, history);

    // 4. Intent Detection & Ambiguity Check
    const effectiveQueryForIntent = contextResolution.contextEnrichedQuery || effectiveBaseQuery;
    const { intent, disambiguation } = IntentAnalyzer.analyzeIntent(
      effectiveQueryForIntent,
      attachments.length > 0,
      history.length > 0
    );

    // 5. Entity & Topic Extraction
    const entityInfo = EntityTopicExtractor.extract(
      effectiveQueryForIntent,
      intent,
      contextResolution.referencedEntity
    );

    // 6. Multimodal Analysis
    const multimodalInfo = MultimodalAnalyzer.analyzeMedia(
      attachments,
      effectiveQueryForIntent
    );

    // 7. Determine Final Actionable Query
    let effectiveActionableQuery = effectiveQueryForIntent;
    if (languageAnalysis.isHinglish && languageAnalysis.englishInterpretation !== rawQuery) {
      effectiveActionableQuery = languageAnalysis.englishInterpretation;
    }

    // 8. Construct Tailored System Guidance for Downstream LLMs
    const recommendedSystemInstruction = this.buildInstruction(
      intent,
      languageAnalysis.detectedLanguage,
      languageAnalysis.isHinglish,
      disambiguation.isAmbiguous,
      disambiguation.clarificationQuestion,
      multimodalInfo
    );

    return {
      originalQuery: rawQuery,
      normalizedInput,
      languageAnalysis,
      contextResolution,
      intent,
      entityInfo,
      multimodalInfo,
      disambiguation,
      effectiveActionableQuery,
      recommendedSystemInstruction,
      timestamp: Date.now(),
    };
  }

  private static buildInstruction(
    intent: QuestionIntent,
    lang: string,
    isHinglish: boolean,
    isAmbiguous: boolean,
    clarificationQuestion?: string,
    multimodalInfo?: any
  ): string {
    const rules: string[] = [
      '### AI ANSWER LOGIC & REASONING PROTOCOL:',
      '- FIRST-SENTENCE DIRECTNESS: Answer the core question directly in sentence 1. Avoid fluff, filler, or unnecessary conversational introductory chatter.',
      '- SIMPLE VS COMPLEX ADAPTABILITY:',
      '  * Simple questions (e.g., 2+2, basic definitions, simple factual questions, "hi", "what is X"): Give the direct answer immediately in 1-4 clean sentences. Do not add heavy section headers, bullet lists, or templates unless necessary.',
      '  * Complex questions (e.g., multi-step analysis, coding, deep concepts, comparisons): Structure the answer logically with clear Markdown headings, step-by-step reasoning, and a clear direct conclusion first.',
      '- LOGICAL RIGOR: Step-by-step reasoning for all technical, mathematical, or multi-step questions. Verify intermediate steps before concluding.',
      '- NO GENERIC REFUSALS: Do not output generic disclaimers like "I don\'t understand" or "As an AI model". Deliver a structured, well-reasoned response.',
    ];

    if (isAmbiguous && clarificationQuestion) {
      rules.push(
        `- DISAMBIGUATION: The user's query has multiple distinct meanings. Provide a concise dual summary covering both common aspects OR ask: "${clarificationQuestion}".`
      );
    }

    if (isHinglish) {
      rules.push(
        '- LANGUAGE MATCH: The user is speaking Hinglish. Respond warmly and clearly, balancing conversational English with natural Hinglish terms.'
      );
    }

    if (intent === 'MATHEMATICAL_CALCULATION') {
      rules.push(
        '- MATHEMATICAL LOGIC: Give the direct numerical/symbolic result in the first sentence. Show the explicit formula and concise step-by-step intermediate calculation. Highlight final answer with **Result: `<value>`**.'
      );
    } else if (intent === 'COMPARISON_DECISION') {
      rules.push(
        '- COMPARISON & DECISION LOGIC: State the direct recommendation/verdict in the first sentence. Follow with a structured Markdown comparison table (Features, Pros, Cons, Best for) and conclude with concrete decision criteria.'
      );
    } else if (intent === 'FACT_CHECKING') {
      rules.push(
        '- FACT-CHECKING LOGIC: State the verdict upfront (**Verified**, **False**, **Misleading**, or **Inconclusive**) with dated primary source evidence and the verified reality.'
      );
    } else if (intent === 'FACTUAL_QUESTION') {
      rules.push(
        '- FACTUAL LOGIC: Deliver the direct factual answer in the first sentence. If simple (who/what/when), keep response concise (1-3 sentences). If multi-faceted, provide structured supporting facts.'
      );
    } else if (intent === 'CODE_GENERATION' || intent === 'CODE_DEBUGGING') {
      rules.push(
        '- CODE LOGIC: Provide complete, runnable, production-ready code with correct imports and syntax highlighting. Include a 3-part breakdown: 💻 Solution -> 🔧 Key Logic -> 🚀 Usage & Complexity.'
      );
    } else if (intent === 'CONCEPTUAL_EXPLANATION') {
      rules.push(
        '- CONCEPTUAL LOGIC: Define core concept in 1 sentence -> Intuitive analogy/real-world example -> Key components/architecture -> Practical takeaway.'
      );
    } else if (intent === 'HOW_TO_GUIDE') {
      rules.push(
        '- PROCEDURAL LOGIC: Provide numbered, sequential steps with prerequisites, clear actions, code/commands if applicable, and expected outcome verification.'
      );
    } else if (intent === 'TASK_INSTRUCTION') {
      rules.push(
        '- TASK EXECUTION LOGIC: Execute the requested transformation, summary, draft, or calculation immediately with zero meta-commentary.'
      );
    } else if (intent === 'LOCATION_SEARCH' || intent === 'NEARBY_SEARCH' || intent === 'DIRECTIONS' || intent === 'NAVIGATION' || intent === 'DISTANCE' || intent === 'ETA' || intent === 'ROUTE' || intent === 'PLACE_SEARCH' || intent === 'LIVE_LOCATION' || intent === 'MAP_REQUEST') {
      rules.push(
        '- LOCATION & NAVIGATION LOGIC: State the direct location answer, ETA, distance, and key route guidance in the first paragraph. The system will automatically render the interactive real-time Location & Navigation Widget with live GPS simulation.'
      );
    } else if (intent === 'CONTINUATION_FOLLOWUP') {
      rules.push(
        '- CONTINUATION LOGIC: Fully build upon the established conversation context seamlessly without repeating previous intro statements.'
      );
    }

    if (multimodalInfo?.hasMedia) {
      rules.push(
        `- MULTIMODAL EVIDENCE: ${multimodalInfo.suggestedAction} (${multimodalInfo.detectedVisualIntent}). Use uploaded media as authoritative ground-truth evidence.`
      );
    }

    return rules.join('\n');
  }
}
