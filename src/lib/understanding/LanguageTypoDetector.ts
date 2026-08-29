import { TypoAndLanguageAnalysis } from './types';

// Common typo corrections dictionary (word-level)
const COMMON_TYPOS: Record<string, string> = {
  // Geographical & Names
  'indai': 'India',
  'inda': 'India',
  'inida': 'India',
  'amarica': 'America',
  'amrica': 'America',
  'us': 'US',
  'englend': 'England',
  'ausralia': 'Australia',
  'rusia': 'Russia',
  'chian': 'China',
  'canad': 'Canada',
  'japn': 'Japan',
  'tokiyo': 'Tokyo',
  'delh': 'Delhi',
  'mubmai': 'Mumbai',

  // Technical & Programming
  'pyhton': 'python',
  'pyton': 'python',
  'reack': 'react',
  'raect': 'react',
  'typscript': 'typescript',
  'typescrit': 'typescript',
  'javasript': 'javascript',
  'javscript': 'javascript',
  'algorthm': 'algorithm',
  'algoritm': 'algorithm',
  'componant': 'component',
  'compnent': 'component',
  'funtion': 'function',
  'funciton': 'function',
  'varible': 'variable',
  'variabel': 'variable',
  'databaes': 'database',
  'databse': 'database',
  'libary': 'library',
  'librery': 'library',
  'pakage': 'package',
  'dependancy': 'dependency',
  'synatx': 'syntax',
  'syntx': 'syntax',
  'eror': 'error',
  'errror': 'error',
  'excaption': 'exception',
  'asyn': 'async',
  'promis': 'promise',
  'servr': 'server',
  'clint': 'client',

  // Conversational & Grammar
  'dont': "don't",
  'dnt': "don't",
  'doesnt': "doesn't",
  'isnt': "isn't",
  'arent': "aren't",
  'cant': "can't",
  'wont': "won't",
  'whats': "what's",
  'wats': "what's",
  'whos': "who's",
  'hows': "how's",
  'wheres': "where's",
  'ques': 'question',
  'questn': 'question',
  'answrs': 'answers',
  'answr': 'answer',
  'bcoz': 'because',
  'bcuz': 'because',
  'plz': 'please',
  'pls': 'please',
  'thx': 'thanks',
  'thanx': 'thanks',
  'u': 'you',
  'ur': 'your',
  'r': 'are',
  'captial': 'capital',
  'capitl': 'capital',
  'populatin': 'population',
  'defination': 'definition',
  'definaton': 'definition',
  'differnce': 'difference',
  'diference': 'difference',
  'diffrence': 'difference',
  'inteligence': 'intelligence',
  'inteligente': 'intelligent',
  'langugae': 'language',
  'langauge': 'language',
  'memry': 'memory',
  'memori': 'memory',
  'presedent': 'president',
  'presidant': 'president',
  'minstr': 'minister',
  'minitser': 'minister',
  'weathr': 'weather',
  'wether': 'weather',
  'temprature': 'temperature',
  'temperture': 'temperature',
};

// Hinglish phrases and word translations
const HINGLISH_PATTERNS: Array<{ pattern: RegExp; replacement: string; meaning: string }> = [
  { pattern: /\bmera ai question samajh nhi raha\b/i, replacement: 'My AI is not understanding questions. How do I fix question understanding?', meaning: 'AI question understanding failure' },
  { pattern: /\bquestion samajh nahi aa raha\b/i, replacement: 'The AI is failing to understand the question.', meaning: 'Question comprehension issue' },
  { pattern: /\bkaise banaye\b/i, replacement: 'how to build / create', meaning: 'how to build' },
  { pattern: /\bkaise kare\b/i, replacement: 'how to do / implement', meaning: 'how to do' },
  { pattern: /\bkaise kaam karta hai\b/i, replacement: 'how does this work', meaning: 'how it works' },
  { pattern: /\bkya hai\b/i, replacement: 'what is', meaning: 'what is' },
  { pattern: /\bkya hota hai\b/i, replacement: 'what happens / what is', meaning: 'what is' },
  { pattern: /\byeh kya hai\b/i, replacement: 'what is this', meaning: 'what is this' },
  { pattern: /\bkaha hai\b/i, replacement: 'where is', meaning: 'where is' },
  { pattern: /\bkab hua\b/i, replacement: 'when did it happen', meaning: 'when it happened' },
  { pattern: /\bkon hai\b/i, replacement: 'who is', meaning: 'who is' },
  { pattern: /\bkaun hai\b/i, replacement: 'who is', meaning: 'who is' },
  { pattern: /\bmujhe (?:batao|samjhao)\b/i, replacement: 'explain to me / tell me', meaning: 'explain to me' },
  { pattern: /\bsamjhao\b/i, replacement: 'explain', meaning: 'explain' },
  { pattern: /\bbatao\b/i, replacement: 'tell me', meaning: 'tell me' },
  { pattern: /\bbhai code do\b/i, replacement: 'please provide the code implementation', meaning: 'requesting code' },
  { pattern: /\bcode do\b/i, replacement: 'give code', meaning: 'give code' },
  { pattern: /\btheek karo\b/i, replacement: 'fix this / correct this', meaning: 'fix this' },
  { pattern: /\bisko theek karo\b/i, replacement: 'fix this code / issue', meaning: 'fix this' },
  { pattern: /\bkuch batao\b/i, replacement: 'tell me something about', meaning: 'tell me about' },
  { pattern: /\bmadad karo\b/i, replacement: 'help me', meaning: 'help' },
  { pattern: /\bchahiye\b/i, replacement: 'I need', meaning: 'need' },
  { pattern: /\bsahi hai\b/i, replacement: 'is this correct', meaning: 'is this correct' },
  { pattern: /\bgalat hai\b/i, replacement: 'this is wrong', meaning: 'incorrect' },
  { pattern: /\byaad rakho\b/i, replacement: 'remember this', meaning: 'remember' },
  { pattern: /\baur batao\b/i, replacement: 'tell me more / explain further', meaning: 'explain more' },
];

export class LanguageTypoDetector {
  /**
   * Detects language, Hinglish, typos, slang, and reconstructs incomplete sentences.
   */
  public static analyze(input: string): TypoAndLanguageAnalysis {
    const rawText = input.trim();
    if (!rawText) {
      return {
        detectedLanguage: 'en',
        isHinglish: false,
        isSlangOrColloquial: false,
        hasTypos: false,
        originalText: '',
        correctedText: '',
        englishInterpretation: '',
        corrections: [],
      };
    }

    const corrections: Array<{ original: string; corrected: string; reason: string }> = [];
    let isHinglish = false;
    let isSlang = false;
    let text = rawText;

    // 1. Hinglish pattern check & translation
    let englishInterpretation = text;
    for (const h of HINGLISH_PATTERNS) {
      if (h.pattern.test(text)) {
        isHinglish = true;
        englishInterpretation = englishInterpretation.replace(h.pattern, h.replacement);
        corrections.push({
          original: text.match(h.pattern)?.[0] || 'hinglish phrase',
          corrected: h.replacement,
          reason: `Translated Hinglish idiom: ${h.meaning}`,
        });
      }
    }

    // Check general Hinglish indicators (words like 'hai', 'kya', 'kaise', 'mera', 'nhi', 'nahi', 'samajh', 'bhai', 'yaar', 'karo', 'hoga')
    const hinglishMarkers = /\b(hai|kya|kaise|mera|meri|mere|nhi|nahi|samajh|bhai|yaar|karo|hoga|raha|rahi|wala|wali|batao|samjhao|yeh|woh|kaha|kab|kyu|kyun)\b/i;
    if (hinglishMarkers.test(text)) {
      isHinglish = true;
    }

    // 2. Tokenize words while preserving punctuation
    const words = text.split(/(\s+|[.,?!;:()\[\]{}'"])/);
    let reconstructedWords = [...words];

    for (let i = 0; i < reconstructedWords.length; i++) {
      const token = reconstructedWords[i];
      if (!token || /^\s+$/.test(token) || /^[.,?!;:()\[\]{}'"]+$/.test(token)) continue;

      const lowerToken = token.toLowerCase();
      if (COMMON_TYPOS[lowerToken]) {
        const replacement = COMMON_TYPOS[lowerToken];
        // Preserve capitalization if original started with capital
        const isCap = /^[A-Z]/.test(token);
        const correctedWord = isCap ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
        
        reconstructedWords[i] = correctedWord;
        corrections.push({
          original: token,
          corrected: correctedWord,
          reason: 'Corrected typo/spelling',
        });
      }
    }

    let correctedText = reconstructedWords.join('');

    // 3. Incomplete sentence reconstruction & structural grammar repair
    // Case: "who pm india" -> "Who is the Prime Minister of India?"
    if (/^who\s+pm\s+([a-zA-Z\s]+)$/i.test(correctedText.trim())) {
      const countryMatch = correctedText.trim().match(/^who\s+pm\s+([a-zA-Z\s]+)$/i);
      const country = countryMatch?.[1]?.trim() || 'India';
      const expansion = `Who is the Prime Minister of ${country}?`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed incomplete role query' });
      correctedText = expansion;
    }
    // Case: "who cm [state]" -> "Who is the Chief Minister of [state]?"
    else if (/^who\s+cm\s+([a-zA-Z\s]+)$/i.test(correctedText.trim())) {
      const stateMatch = correctedText.trim().match(/^who\s+cm\s+([a-zA-Z\s]+)$/i);
      const state = stateMatch?.[1]?.trim() || '';
      const expansion = `Who is the Chief Minister of ${state}?`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed incomplete CM role query' });
      correctedText = expansion;
    }
    // Case: "who ceo [company]" -> "Who is the CEO of [company]?"
    else if (/^who\s+ceo\s+([a-zA-Z\s]+)$/i.test(correctedText.trim())) {
      const compMatch = correctedText.trim().match(/^who\s+ceo\s+([a-zA-Z\s]+)$/i);
      const comp = compMatch?.[1]?.trim() || '';
      const expansion = `Who is the CEO of ${comp}?`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed incomplete CEO role query' });
      correctedText = expansion;
    }
    // Case: "whats capital [country]" -> "What is the capital of [country]?"
    else if (/^what'?s?\s+capital\s+([a-zA-Z\s]+)$/i.test(correctedText.trim())) {
      const cMatch = correctedText.trim().match(/^what'?s?\s+capital\s+([a-zA-Z\s]+)$/i);
      const targetCountry = cMatch?.[1]?.trim() || '';
      const expansion = `What is the capital of ${targetCountry}?`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed capital lookup question' });
      correctedText = expansion;
    }
    // Case: "how make memory like chatgpt" -> "How to implement conversational memory like ChatGPT?"
    else if (/^how\s+make\s+([a-zA-Z\s]+)\s+like\s+([a-zA-Z0-9\s]+)$/i.test(correctedText.trim())) {
      const match = correctedText.trim().match(/^how\s+make\s+([a-zA-Z\s]+)\s+like\s+([a-zA-Z0-9\s]+)$/i);
      const feature = match?.[1]?.trim() || 'memory';
      const target = match?.[2]?.trim() || 'ChatGPT';
      const expansion = `How do you build or implement ${feature} like ${target}?`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed how-to implementation query' });
      correctedText = expansion;
    }
    // Case: "give code for ai dont understand ques" -> "Provide code for handling when AI doesn't understand questions"
    else if (/^(?:give|show|write)\s+code\s+for\s+(.+)$/i.test(correctedText.trim())) {
      const match = correctedText.trim().match(/^(?:give|show|write)\s+code\s+for\s+(.+)$/i);
      const topic = match?.[1]?.trim() || '';
      const expansion = `Please provide a code solution and implementation for: ${topic}`;
      corrections.push({ original: correctedText, corrected: expansion, reason: 'Reconstructed explicit code request' });
      correctedText = expansion;
    }

    if (isHinglish) {
      // If Hinglish was detected, align englishInterpretation with correctedText
      englishInterpretation = correctedText;
    }

    // 4. Language classification
    let detectedLanguage: 'en' | 'hi' | 'hinglish' | 'es' | 'fr' | 'de' | 'other' = 'en';
    if (isHinglish) {
      detectedLanguage = 'hinglish';
    } else if (/[\u0900-\u097F]/.test(rawText)) {
      detectedLanguage = 'hi';
    } else if (/\b(que|como|donde|cuando|por que|hola|gracias|buenos dias)\b/i.test(rawText)) {
      detectedLanguage = 'es';
    } else if (/\b(bonjour|merci|comment|pourquoi|avec|salut)\b/i.test(rawText)) {
      detectedLanguage = 'fr';
    } else if (/\b(hallo|danke|warum|wie|bitte|guten tag)\b/i.test(rawText)) {
      detectedLanguage = 'de';
    }

    return {
      detectedLanguage,
      isHinglish,
      isSlangOrColloquial: isSlang || isHinglish,
      hasTypos: corrections.length > 0,
      originalText: rawText,
      correctedText,
      englishInterpretation,
      corrections,
    };
  }
}
