/**
 * Fuzzy Matcher Utility for App Launcher Intent Resolution
 * Handles spoken voice variations, minor typos, string distance metrics, and alias normalization.
 */

export interface CandidateAppItem {
  name: string;
  packageName: string;
  aliases?: string[];
  category?: string;
}

export interface FuzzyMatchResult<T extends CandidateAppItem = CandidateAppItem> {
  matchedApp: T | null;
  score: number; // 0 to 1
  isExactMatch: boolean;
  isAmbiguous: boolean;
  ambiguousMatches: T[];
  reason: 'EXACT_MATCH' | 'ALIAS_MATCH' | 'FUZZY_MATCH' | 'NO_MATCH' | 'AMBIGUOUS';
}

const COMMON_VOICE_ALIASES: Record<string, string[]> = {
  youtube: ['you tube', 'yutu', 'yt', 'you-tube', 'youtube app'],
  whatsapp: ['whats app', 'what app', 'wa', 'watsapp', 'whatsapp messenger'],
  chrome: ['google chrome', 'chrome browser', 'browser', 'google browser'],
  calculator: ['calc', 'kalculator', 'calculater'],
  settings: ['phone settings', 'system settings', 'android settings', 'setting'],
  instagram: ['insta', 'ig', 'insta gram'],
  facebook: ['fb', 'face book'],
  gmail: ['g mail', 'google mail', 'email app', 'mail'],
  maps: ['google maps', 'map', 'navigation', 'gmaps'],
  spotify: ['music', 'spotify music'],
  telegram: ['tg', 'tele gram'],
  camera: ['phone camera', 'photo camera'],
  gallery: ['photos', 'photo gallery', 'google photos'],
};

export class FuzzyMatcher {
  /**
   * Normalize text for robust string comparisons
   */
  public static normalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/['’'"]/g, '')
      .replace(/[-_.:;,/]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Compute Levenshtein edit distance between two strings
   */
  public static levenshteinDistance(a: string, b: string): number {
    const s1 = this.normalize(a);
    const s2 = this.normalize(b);
    if (s1 === s2) return 0;
    if (!s1.length) return s2.length;
    if (!s2.length) return s1.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Compute normalized similarity score between 0.0 and 1.0
   */
  public static similarity(a: string, b: string): number {
    const s1 = this.normalize(a);
    const s2 = this.normalize(b);
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1.0;

    // Substring containment boost
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);
      return Math.max(0.75, minLen / maxLen);
    }

    const maxLen = Math.max(s1.length, s2.length);
    const dist = this.levenshteinDistance(s1, s2);
    return Math.max(0, 1 - dist / maxLen);
  }

  /**
   * Match spoken app name query against installed / registered candidate applications
   */
  public static matchAppName<T extends CandidateAppItem>(
    query: string,
    candidates: T[],
    threshold: number = 0.55
  ): FuzzyMatchResult<T> {
    const cleanQuery = this.normalize(query);
    if (!cleanQuery || !candidates || candidates.length === 0) {
      return {
        matchedApp: null,
        score: 0,
        isExactMatch: false,
        isAmbiguous: false,
        ambiguousMatches: [],
        reason: 'NO_MATCH',
      };
    }

    // 1. Exact Name / Package Name Match
    for (const app of candidates) {
      const cleanName = this.normalize(app.name);
      const cleanPkg = this.normalize(app.packageName);
      if (cleanQuery === cleanName || cleanQuery === cleanPkg) {
        return {
          matchedApp: app,
          score: 1.0,
          isExactMatch: true,
          isAmbiguous: false,
          ambiguousMatches: [app],
          reason: 'EXACT_MATCH',
        };
      }
    }

    // 2. Alias match checking (known voice aliases + custom app aliases)
    for (const app of candidates) {
      const cleanName = this.normalize(app.name);
      const aliases = app.aliases ? app.aliases.map((a) => this.normalize(a)) : [];
      
      // Check preset voice aliases for common app names
      const presetAliases = COMMON_VOICE_ALIASES[cleanName] || [];
      const allAliases = [...aliases, ...presetAliases];

      if (allAliases.some((alias) => alias === cleanQuery || cleanQuery.includes(alias) || alias.includes(cleanQuery))) {
        return {
          matchedApp: app,
          score: 0.95,
          isExactMatch: false,
          isAmbiguous: false,
          ambiguousMatches: [app],
          reason: 'ALIAS_MATCH',
        };
      }
    }

    // 3. Score all candidates using similarity & substring overlap
    const scoredList = candidates
      .map((app) => {
        const cleanName = this.normalize(app.name);
        let maxSim = this.similarity(cleanQuery, cleanName);

        if (app.aliases) {
          for (const alias of app.aliases) {
            const sim = this.similarity(cleanQuery, alias);
            if (sim > maxSim) maxSim = sim;
          }
        }

        const preset = COMMON_VOICE_ALIASES[cleanName] || [];
        for (const p of preset) {
          const sim = this.similarity(cleanQuery, p);
          if (sim > maxSim) maxSim = sim;
        }

        return { app, score: maxSim };
      })
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score);

    if (scoredList.length === 0) {
      return {
        matchedApp: null,
        score: 0,
        isExactMatch: false,
        isAmbiguous: false,
        ambiguousMatches: [],
        reason: 'NO_MATCH',
      };
    }

    const topScore = scoredList[0].score;

    // 4. Ambiguity check: Top 2 candidates have virtually identical high scores
    if (
      scoredList.length >= 2 &&
      topScore >= 0.7 &&
      Math.abs(scoredList[0].score - scoredList[1].score) < 0.08
    ) {
      const ambiguousApps = scoredList.slice(0, 3).map((s) => s.app);
      return {
        matchedApp: null,
        score: topScore,
        isExactMatch: false,
        isAmbiguous: true,
        ambiguousMatches: ambiguousApps,
        reason: 'AMBIGUOUS',
      };
    }

    return {
      matchedApp: scoredList[0].app,
      score: topScore,
      isExactMatch: topScore >= 0.9,
      isAmbiguous: false,
      ambiguousMatches: [scoredList[0].app],
      reason: 'FUZZY_MATCH',
    };
  }
}
