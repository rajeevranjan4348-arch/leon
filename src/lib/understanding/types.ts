export type QuestionIntent =
  | 'FACTUAL_QUESTION'
  | 'MATHEMATICAL_CALCULATION'
  | 'COMPARISON_DECISION'
  | 'FACT_CHECKING'
  | 'CONCEPTUAL_EXPLANATION'
  | 'HOW_TO_GUIDE'
  | 'CODE_GENERATION'
  | 'CODE_DEBUGGING'
  | 'CONTINUATION_FOLLOWUP'
  | 'TASK_INSTRUCTION'
  | 'MULTIMODAL_ANALYSIS'
  | 'CASUAL_CONVERSATION'
  | 'DISAMBIGUATION_NEEDED'
  | 'LOCATION_SEARCH'
  | 'NEARBY_SEARCH'
  | 'DIRECTIONS'
  | 'NAVIGATION'
  | 'DISTANCE'
  | 'ETA'
  | 'ROUTE'
  | 'PLACE_SEARCH'
  | 'LIVE_LOCATION'
  | 'MAP_REQUEST';

export interface NormalizedInput {
  raw: string;
  cleaned: string;
  normalized: string;
  wordCount: number;
}

export interface TypoAndLanguageAnalysis {
  detectedLanguage: 'en' | 'hi' | 'hinglish' | 'es' | 'fr' | 'de' | 'other';
  isHinglish: boolean;
  isSlangOrColloquial: boolean;
  hasTypos: boolean;
  originalText: string;
  correctedText: string;
  englishInterpretation: string;
  corrections: Array<{ original: string; corrected: string; reason: string }>;
}

export interface ResolvedContext {
  hasContextReferences: boolean;
  referenceType?: 'pronoun' | 'ellipsis' | 'continuation' | 'refinement' | 'code_action';
  referencedEntity?: string;
  referencedTopic?: string;
  referencedCodeSnippet?: string;
  contextEnrichedQuery: string;
  recentConversationSummary?: string;
}

export interface EntityAndTopicInfo {
  primaryEntity: string;
  secondaryEntities: string[];
  topicDomain: string;
  programmingLanguage?: string;
  searchQuery: string;
  temporalScope?: string;
  locationScope?: string;
}

export interface MultimodalContextInfo {
  hasMedia: boolean;
  mediaCount: number;
  mediaTypes: string[];
  detectedVisualIntent?: string;
  suggestedAction?: string;
}

export interface DisambiguationInfo {
  isAmbiguous: boolean;
  candidateMeanings?: string[];
  clarificationQuestion?: string;
  primaryInterpretation?: string;
  secondaryInterpretation?: string;
}

export interface QuestionUnderstandingResult {
  originalQuery: string;
  normalizedInput: NormalizedInput;
  languageAnalysis: TypoAndLanguageAnalysis;
  contextResolution: ResolvedContext;
  intent: QuestionIntent;
  entityInfo: EntityAndTopicInfo;
  multimodalInfo: MultimodalContextInfo;
  disambiguation: DisambiguationInfo;
  effectiveActionableQuery: string;
  recommendedSystemInstruction: string;
  timestamp: number;
}

export interface ValidationCheckResult {
  isValid: boolean;
  score: number;
  intentSatisfied: boolean;
  answeredActualQuestion: boolean;
  usedRelevantContext: boolean;
  isComplete: boolean;
  hasGenericRefusal: boolean;
  detectedIssues: string[];
  remediatedText?: string;
}
