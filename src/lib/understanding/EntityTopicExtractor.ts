import { EntityAndTopicInfo, QuestionIntent } from './types';

const PROGRAMMING_LANGUAGES = [
  'typescript', 'javascript', 'python', 'react', 'node', 'express', 'html', 'css',
  'tailwind', 'nextjs', 'vue', 'angular', 'svelte', 'sql', 'postgresql', 'mongodb',
  'rust', 'go', 'golang', 'c++', 'cpp', 'c#', 'csharp', 'java', 'kotlin', 'swift', 'php'
];

export class EntityTopicExtractor {
  /**
   * Extract primary entities, topic domain, and clean search query from normalized query.
   */
  public static extract(
    normalizedText: string,
    intent: QuestionIntent,
    contextEntity?: string
  ): EntityAndTopicInfo {
    const text = normalizedText.trim();
    const lower = text.toLowerCase();

    // 1. Detect programming language if applicable
    let programmingLanguage: string | undefined;
    for (const lang of PROGRAMMING_LANGUAGES) {
      const regex = new RegExp(`\\b${lang.replace('+', '\\+')}\\b`, 'i');
      if (regex.test(lower)) {
        programmingLanguage = lang;
        break;
      }
    }

    // 2. Identify primary entity
    let primaryEntity = contextEntity || '';
    if (!primaryEntity) {
      // Strip common conversational prefixes
      primaryEntity = text
        .replace(/^(?:who\s+is\s+(?:the\s+)?(?:current\s+)?|what\s+is\s+(?:the\s+)?|where\s+is\s+(?:the\s+)?|when\s+(?:did|was|is)\s+|why\s+is\s+|how\s+(?:to|do\s+i|can\s+i)\s+|tell\s+me\s+about\s+|explain\s+|describe\s+|summarize\s+|write\s+code\s+for\s+|give\s+code\s+for\s+)/i, '')
        .replace(/[?!.,]+$/, '')
        .trim();
    }

    if (!primaryEntity) {
      primaryEntity = text;
    }

    // 3. Domain classification
    let topicDomain = 'General Knowledge';
    if (intent === 'CODE_GENERATION' || intent === 'CODE_DEBUGGING' || programmingLanguage) {
      topicDomain = 'Software Engineering & Programming';
    } else if (/\b(weather|temperature|forecast|rain|climate|humidity)\b/i.test(lower)) {
      topicDomain = 'Meteorology & Weather';
    } else if (/\b(stock|price|market|bitcoin|crypto|shares|economy|nasdaq|dow)\b/i.test(lower)) {
      topicDomain = 'Finance & Markets';
    } else if (/\b(doctor|medicine|health|symptoms|disease|therapy|hospital)\b/i.test(lower)) {
      topicDomain = 'Health & Medicine';
    } else if (/\b(history|war|century|empire|dynasty|ancient|medieval|president)\b/i.test(lower)) {
      topicDomain = 'History & Social Studies';
    } else if (/\b(quantum|physics|chemistry|biology|science|astronomy|planet|galaxy)\b/i.test(lower)) {
      topicDomain = 'Science & Technology';
    }

    // 4. Temporal & Location scope
    let temporalScope: string | undefined;
    if (/\b(today|now|currently|current|latest|recent|2026|2025|2024|this week|this month)\b/i.test(lower)) {
      temporalScope = 'Current / Real-time';
    }

    let locationScope: string | undefined;
    const locationMatch = text.match(/\b(?:in|at|near|of|for)\s+([A-Z][a-zA-Z\s]+(?:\b|$))/);
    if (locationMatch) {
      locationScope = locationMatch[1].trim();
    }

    // 5. Clean optimized search query for web grounding
    let searchQuery = text
      .replace(/[?!.,]+$/, '')
      .replace(/^(?:please\s+|can\s+you\s+|tell\s+me\s+)/i, '')
      .trim();

    return {
      primaryEntity,
      secondaryEntities: [],
      topicDomain,
      programmingLanguage,
      searchQuery: searchQuery || text,
      temporalScope,
      locationScope,
    };
  }
}
