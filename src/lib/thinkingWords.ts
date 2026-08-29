export type QuestionTopic =
  | 'math'
  | 'coding'
  | 'science'
  | 'web_search'
  | 'image'
  | 'file'
  | 'general';

export interface QuestionTopicDetails {
  topic: QuestionTopic;
  label: string;
  description: string;
  thinkingWords: string[];
}

/**
 * The full list of verified thinking words according to user specification
 */
export const ALL_THINKING_WORDS = [
  "Thinking...",
  "Understanding your question",
  "Analyzing your request",
  "Identifying what you need",
  "Searching the web",
  "Finding relevant information",
  "Finding relevant sources",
  "Opening sources",
  "Reading sources",
  "Checking sources",
  "Verifying information",
  "Cross-checking sources",
  "Comparing information",
  "Looking for recent updates",
  "Checking the latest information",
  "Gathering information",
  "Connecting the information",
  "Calculating",
  "Processing the data",
  "Analyzing the data",
  "Reading the file",
  "Analyzing the file",
  "Examining the image",
  "Understanding the image",
  "Writing the code",
  "Checking the code",
  "Testing the code",
  "Fixing the issue",
  "Generating a response",
  "Organizing the answer",
  "Preparing the answer",
  "Finalizing the response",
  "Done"
] as const;

export const TOPIC_THINKING_MAPPINGS: Record<QuestionTopic, QuestionTopicDetails> = {
  web_search: {
    topic: 'web_search',
    label: 'Web Search & Real-time Info',
    description: 'Searching the web, cross-checking sources, gathering recent updates and news.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Searching the web",
      "Finding relevant information",
      "Finding relevant sources",
      "Opening sources",
      "Reading sources",
      "Checking sources",
      "Verifying information",
      "Cross-checking sources",
      "Comparing information",
      "Looking for recent updates",
      "Checking the latest information",
      "Gathering information",
      "Connecting the information",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  coding: {
    topic: 'coding',
    label: 'Coding & Software Engineering',
    description: 'Analyzing, writing, testing, and debugging source code and algorithms.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Writing the code",
      "Checking the code",
      "Testing the code",
      "Fixing the issue",
      "Processing the data",
      "Analyzing the data",
      "Gathering information",
      "Connecting the information",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  math: {
    topic: 'math',
    label: 'Mathematics & Calculation',
    description: 'Solving mathematical equations, calculations, algebra, and numerical reasoning.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Calculating",
      "Processing the data",
      "Analyzing the data",
      "Gathering information",
      "Connecting the information",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  image: {
    topic: 'image',
    label: 'Visual & Image Analysis',
    description: 'Inspecting images, graphics, diagrams, or visual structures.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Examining the image",
      "Understanding the image",
      "Processing the data",
      "Analyzing the data",
      "Gathering information",
      "Connecting the information",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  file: {
    topic: 'file',
    label: 'Document & File Parsing',
    description: 'Parsing uploaded documents, PDFs, CSVs, spreadsheets, and files.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Reading the file",
      "Analyzing the file",
      "Processing the data",
      "Analyzing the data",
      "Gathering information",
      "Connecting the information",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  science: {
    topic: 'science',
    label: 'Science & Theoretical Analysis',
    description: 'Applying scientific concepts, empirical evidence, physics, biology, and chemistry.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Gathering information",
      "Connecting the information",
      "Processing the data",
      "Analyzing the data",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  },
  general: {
    topic: 'general',
    label: 'General Inquiry',
    description: 'General conversational reasoning, creative synthesis, and general knowledge.',
    thinkingWords: [
      "Thinking...",
      "Understanding your question",
      "Analyzing your request",
      "Identifying what you need",
      "Gathering information",
      "Connecting the information",
      "Processing the data",
      "Analyzing the data",
      "Generating a response",
      "Organizing the answer",
      "Preparing the answer",
      "Finalizing the response",
      "Done"
    ]
  }
};

/**
 * Categorizes a user query into one of the main topics: 'math', 'coding', 'science', 'web_search', 'image', 'file', 'general'
 */
export function categorizeQuestionTopic(query?: string): QuestionTopic {
  if (!query || !query.trim()) return 'general';
  const q = query.toLowerCase().trim();

  // 1. Math / Calculation / Geometry / Algebra / Calculus / Physics numbers
  if (
    /\b(math|maths|calculate|calc|sum|add|subtract|multiply|divide|equation|formula|algebra|geometry|calculus|integral|derivative|trigonometry|percentage|theorem|matrix|logarithm|arithmetic|%)\b/i.test(q) ||
    /\d+\s*[\+\-\*\/]\s*\d+/.test(q) ||
    /\bwhat\s+is\s+\d+/.test(q)
  ) {
    return 'math';
  }

  // 2. Code / Scripting / Programming / Software Engineering / Bugs
  if (
    /\b(code|coding|function|script|program|developer|python|javascript|typescript|react|html|css|bug|bugs|error|errors|fix|refactor|compile|build|repo|git|api|sql|json|database|component|class|variable|algorithm)\b/i.test(q)
  ) {
    return 'coding';
  }

  // 3. Image / Visual
  if (
    /\b(image|photo|picture|diagram|graphic|visual|examine|look at|png|jpg|jpeg|svg|screenshot|illustration|draw|render|camera|pic)\b/i.test(q)
  ) {
    return 'image';
  }

  // 4. File / Document / PDF / CSV
  if (
    /\b(file|document|pdf|csv|json|txt|doc|docx|sheet|excel|read file|analyze file|attachment|upload|parse)\b/i.test(q)
  ) {
    return 'file';
  }

  // 5. Science / Physics / Chemistry / Biology / Astronomy / Genetics / Quantum
  if (
    /\b(science|scientific|physics|chemistry|biology|astronomy|quantum|thermodynamics|genetics|dna|atom|molecule|gravity|evolution|photosynthesis|element|periodic table|particle|cosmology|neuroscience)\b/i.test(q)
  ) {
    return 'science';
  }

  // 6. Web Search / Research / News / Weather / Latest Updates / Citations
  if (
    /\b(search|research|web|google|weather|news|latest|update|who is|where is|find|source|site|url|link|article|today|current|breaking|score|price|stock)\b/i.test(q)
  ) {
    return 'web_search';
  }

  return 'general';
}

/**
 * Returns full topic details and domain-specific thinking words mapping for a query
 */
export function getTopicAndThinkingWordsForQuery(query?: string): {
  topic: QuestionTopic;
  label: string;
  description: string;
  thinkingWords: string[];
} {
  const topic = categorizeQuestionTopic(query);
  const details = TOPIC_THINKING_MAPPINGS[topic];
  return {
    topic,
    label: details.label,
    description: details.description,
    thinkingWords: details.thinkingWords,
  };
}

/**
 * Returns domain-specific thinking words array for a given query
 */
export function getThinkingWordsForQuery(query?: string): string[] {
  return getTopicAndThinkingWordsForQuery(query).thinkingWords;
}
