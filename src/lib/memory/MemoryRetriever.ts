import { MemoryRecord, MemoryRetrievalScore } from './types';
import { MemoryManager } from './MemoryManager';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up',
  'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'what', 'which', 'who'
]);

export class MemoryRetriever {
  /**
   * Calculate semantic similarity (token overlap + Jaccard + substring bonus).
   */
  private static calculateSemanticSimilarity(query: string, fact: string): number {
    const qTokens = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));
    const fTokens = fact.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2 && !STOP_WORDS.has(t));

    if (qTokens.length === 0 || fTokens.length === 0) return 0;

    const qSet = new Set(qTokens);
    const fSet = new Set(fTokens);

    let matchCount = 0;
    qSet.forEach(t => {
      if (fSet.has(t)) {
        matchCount += 1;
      } else {
        // Partial stemming check
        for (const ft of fSet) {
          if (t.length > 3 && ft.length > 3 && (t.startsWith(ft) || ft.startsWith(t))) {
            matchCount += 0.7;
            break;
          }
        }
      }
    });

    const unionSize = new Set([...qTokens, ...fTokens]).size;
    const jaccard = unionSize > 0 ? matchCount / unionSize : 0;

    // Substring bonus
    const qLower = query.toLowerCase();
    const fLower = fact.toLowerCase();
    const substringBonus = fLower.includes(qLower) || qLower.includes(fLower) ? 0.3 : 0;

    return Math.min(1.0, jaccard + substringBonus);
  }

  /**
   * Retrieve top relevant memories based on semantic similarity, recency, importance, project match, task relevance.
   */
  public static retrieveRelevantMemories(
    query: string,
    currentConversationId?: string,
    projectId?: string,
    limit = 6,
    userId?: string
  ): MemoryRetrievalScore[] {
    const allMemories = MemoryManager.getAllMemories(userId);
    if (allMemories.length === 0) return [];

    const now = Date.now();

    const scored: MemoryRetrievalScore[] = allMemories.map(mem => {
      // 1. Semantic similarity
      const semSim = this.calculateSemanticSimilarity(query, `${mem.key} ${mem.value} ${mem.fact}`);

      // 2. Recency score (decay over days)
      const lastAccess = new Date(mem.lastAccessedAt || mem.createdAt).getTime();
      const ageHours = Math.max(0, (now - lastAccess) / (1000 * 60 * 60));
      const recencyScore = Math.exp(-ageHours / 168); // Decay over 1 week

      // 3. Importance score (0-100 mapped to 0.0 to 1.0)
      const importanceScore = Math.min(1.0, (mem.importance || 50) / 100);

      // 4. Project match & Conversation affinity
      let projectMatchScore = 0;
      if (projectId && mem.projectId === projectId) {
        projectMatchScore = 0.5;
      }

      let taskRelevanceScore = 0.1;
      if (currentConversationId && mem.conversationId === currentConversationId) {
        taskRelevanceScore += 0.3;
      }
      if (mem.category === 'personal' || mem.category === 'preference' || mem.category === 'instruction') {
        taskRelevanceScore += 0.3;
      }

      // Total weighted score: relevanceScore = semanticSimilarity + importance + recency + projectMatch + conversationMatch
      const totalScore = 
        (semSim * 0.35) + 
        (importanceScore * 0.25) + 
        (recencyScore * 0.15) + 
        (projectMatchScore * 0.15) +
        (taskRelevanceScore * 0.10);

      return {
        memory: mem,
        score: totalScore,
        semanticSimilarity: semSim,
        recencyScore,
        importanceScore,
        taskRelevanceScore,
        projectMatchScore,
      };
    });

    // Always include personal preferences/instructions with high importance or direct matches
    const sorted = scored
      .filter(item => item.score >= 0.20 || item.semanticSimilarity > 0.25 || item.memory.category === 'personal' || item.memory.category === 'instruction')
      .sort((a, b) => b.score - a.score);

    // Touch access time for top memories
    const top = sorted.slice(0, limit);
    top.forEach(item => {
      item.memory.lastAccessedAt = new Date().toISOString();
      item.memory.accessCount = (item.memory.accessCount || 0) + 1;
    });

    return top;
  }
}

