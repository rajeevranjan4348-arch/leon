import React from 'react';

// Common English & conversational stop words to filter out when extracting auto-keywords
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
  'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
  'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
  'down', 'during', 'each', 'explain', 'few', 'find', 'for', 'from', 'further',
  'get', 'give', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having',
  'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve',
  'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'just',
  'know', 'let', 'let\'s', 'like', 'make', 'me', 'more', 'most', 'mustn\'t', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'please',
  'same', 'search', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
  'shouldn\'t', 'show', 'so', 'some', 'such', 'tell', 'than', 'that', 'that\'s',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s',
  'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we',
  'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s',
  'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s',
  'whom', 'why', 'why\'s', 'will', 'with', 'won\'t', 'would', 'wouldn\'t',
  'write', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
  'yourself', 'yourselves'
]);

/**
 * Escapes regex special characters in a string
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts key search keywords and multi-word terms from a user prompt or search query.
 */
export function extractSignificantKeywords(
  rawQuery?: string,
  additionalKeywords: string[] = []
): string[] {
  if (!rawQuery && (!additionalKeywords || additionalKeywords.length === 0)) {
    return [];
  }

  const results = new Set<string>();

  // Add explicit additional keywords first
  additionalKeywords.forEach((kw) => {
    const trimmed = kw.trim();
    if (trimmed.length >= 2) {
      results.add(trimmed);
    }
  });

  if (rawQuery) {
    const clean = rawQuery.trim();

    // 1. Extract quoted phrases (e.g. "artificial intelligence")
    const quotedMatches = clean.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedMatches) {
      quotedMatches.forEach((m) => {
        const unquoted = m.replace(/^["']|["']$/g, '').trim();
        if (unquoted.length >= 2) {
          results.add(unquoted);
        }
      });
    }

    // 2. Extract technical terms with special chars (e.g. C++, C#, node.js, gpt-4, react-19)
    const techMatches = clean.match(/[a-zA-Z0-9]+(?:[\.\-#\+\_][a-zA-Z0-9]+)+/g);
    if (techMatches) {
      techMatches.forEach((t) => {
        if (t.length >= 2 && !STOP_WORDS.has(t.toLowerCase())) {
          results.add(t);
        }
      });
    }

    // 3. Extract capitalized words / acronyms (e.g. NASA, AI, GPU, India, Paris)
    const capitalMatches = clean.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
    if (capitalMatches) {
      capitalMatches.forEach((c) => {
        if (c.length >= 2 && !STOP_WORDS.has(c.toLowerCase())) {
          results.add(c);
        }
      });
    }

    // 4. Tokenize remaining words
    const words = clean
      .replace(/[^\w\s\-\+\#\.]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()));

    words.forEach((w) => results.add(w));
  }

  // Filter out any empty strings and sort descending by length so longer phrases match first
  return Array.from(results)
    .filter((kw) => kw.length >= 2)
    .sort((a, b) => b.length - a.length);
}

export interface HighlightOptions {
  variant?: 'amber' | 'cyan' | 'emerald' | 'purple';
  activeKeyword?: string;
  customMarkClassName?: string;
  renderCitation?: (citationText: string, index: number) => React.ReactNode;
}

/**
 * Highlights keywords in a plaintext string and returns React elements.
 * Also supports preserving [1], [2] citation markers if a citation handler is provided.
 */
export function highlightKeywordsInText(
  text: string,
  keywords: string[],
  options: HighlightOptions = {}
): React.ReactNode[] {
  if (!text) return [];
  if (!keywords || keywords.length === 0) {
    if (options.renderCitation) {
      return processCitationsOnly(text, options.renderCitation);
    }
    return [text];
  }

  const {
    variant = 'amber',
    activeKeyword,
    customMarkClassName,
    renderCitation,
  } = options;

  // Filter and deduplicate valid keywords
  const validKeywords = Array.from(
    new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 2))
  ).sort((a, b) => b.length - a.length);

  if (validKeywords.length === 0) {
    if (renderCitation) {
      return processCitationsOnly(text, renderCitation);
    }
    return [text];
  }

  // Regex pattern matching any of the keywords OR citations if enabled
  const kwPattern = validKeywords.map((k) => escapeRegExp(k)).join('|');
  const fullPattern = renderCitation
    ? new RegExp(`(\\[\\d+\\])|(${kwPattern})`, 'gi')
    : new RegExp(`(${kwPattern})`, 'gi');

  const parts = text.split(fullPattern);
  const elements: React.ReactNode[] = [];

  let keyIndex = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Check for citation match e.g. [1]
    if (renderCitation && /^\[\d+\]$/.test(part)) {
      const numMatch = part.match(/\d+/);
      const citationNum = numMatch ? parseInt(numMatch[0], 10) : 1;
      elements.push(
        <React.Fragment key={`cite-${keyIndex++}`}>
          {renderCitation(part, citationNum)}
        </React.Fragment>
      );
      continue;
    }

    // Check if this part matches one of the keywords (case-insensitive)
    const isKeywordMatch = validKeywords.some(
      (kw) => kw.toLowerCase() === part.toLowerCase()
    );

    if (isKeywordMatch) {
      const isCurrentActive =
        activeKeyword &&
        activeKeyword.toLowerCase() === part.toLowerCase();

      let markStyle = 'bg-amber-400/20 text-amber-200 border-amber-400/35 shadow-[0_0_8px_rgba(251,191,36,0.15)]';
      if (variant === 'cyan') {
        markStyle = 'bg-cyan-500/20 text-cyan-100 border-cyan-400/35 shadow-[0_0_8px_rgba(6,182,212,0.15)]';
      } else if (variant === 'emerald') {
        markStyle = 'bg-emerald-500/20 text-emerald-200 border-emerald-400/35 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
      } else if (variant === 'purple') {
        markStyle = 'bg-purple-500/20 text-purple-200 border-purple-400/35 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
      }

      if (isCurrentActive) {
        markStyle += ' ring-2 ring-amber-400/80 bg-amber-400/35 font-semibold';
      }

      elements.push(
        <mark
          key={`kw-${keyIndex++}`}
          className={customMarkClassName || `inline px-1 py-0.5 rounded border ${markStyle} transition-colors select-text`}
          title={`Keyword: ${part}`}
        >
          {part}
        </mark>
      );
    } else {
      elements.push(part);
    }
  }

  return elements;
}

function processCitationsOnly(
  text: string,
  renderCitation: (citationText: string, index: number) => React.ReactNode
): React.ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/\[(\d+)\]/);
    if (match) {
      const index = parseInt(match[1], 10);
      return (
        <React.Fragment key={`cite-only-${index}-${i}`}>
          {renderCitation(part, index)}
        </React.Fragment>
      );
    }
    return part;
  });
}

/**
 * Reusable React component for highlighting keywords in plain text snippets
 */
export interface HighlightTextProps {
  text?: string;
  keywords?: string[];
  variant?: 'amber' | 'cyan' | 'emerald' | 'purple';
  activeKeyword?: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text = '',
  keywords = [],
  variant = 'amber',
  activeKeyword,
  className,
}) => {
  if (!text) return null;
  if (!keywords || keywords.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {highlightKeywordsInText(text, keywords, { variant, activeKeyword })}
    </span>
  );
};
