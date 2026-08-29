/**
 * Ruflo Self-Learning & Pattern Engine
 * Implements hive-mind learning: records successful execution plans, optimizes agent routing,
 * and retrieves high-confidence strategy patterns for recurring user queries.
 * Inspired by Ruflo (https://github.com/ruvnet/ruflo)
 */

import { SwarmPattern, RufloPlan, RufloExecutionResult, SwarmTopology } from './types';

const PATTERN_STORAGE_KEY = 'ruflo_swarm_learned_patterns_v1';

export class RufloSelfLearning {
  private static instance: RufloSelfLearning;
  private patterns: Map<string, SwarmPattern> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RufloSelfLearning {
    if (!RufloSelfLearning.instance) {
      RufloSelfLearning.instance = new RufloSelfLearning();
    }
    return RufloSelfLearning.instance;
  }

  /**
   * Find a matching learned strategy pattern for a given user query.
   */
  public findMatchingPattern(query: string, complexityScore: number): SwarmPattern | null {
    this.ensureLoaded();
    const cleanQuery = query.trim().toLowerCase();
    const queryWords = cleanQuery.split(/\W+/).filter(w => w.length > 3);

    if (queryWords.length === 0) return null;

    let bestMatch: SwarmPattern | null = null;
    let highestScore = 0;

    for (const pattern of this.patterns.values()) {
      // Score threshold and minimum success rate check
      if (pattern.successRate < 0.7) continue;

      const patternWords = pattern.queryIntent.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      let matchCount = 0;

      for (const qWord of queryWords) {
        if (patternWords.includes(qWord)) {
          matchCount++;
        }
      }

      const matchRatio = matchCount / Math.max(queryWords.length, 1);
      const scoreDelta = 1 - Math.abs(pattern.complexityScore - complexityScore) / 100;
      const combinedScore = matchRatio * 0.7 + scoreDelta * 0.3;

      if (combinedScore > 0.65 && combinedScore > highestScore) {
        highestScore = combinedScore;
        bestMatch = pattern;
      }
    }

    if (bestMatch) {
      bestMatch.usageCount++;
      bestMatch.lastUsedAt = Date.now();
      this.persistToStorage();
    }

    return bestMatch;
  }

  /**
   * Record execution outcomes and consolidate them into a learned swarm pattern.
   */
  public async learnFromExecution(plan: RufloPlan, result: RufloExecutionResult): Promise<SwarmPattern | null> {
    this.ensureLoaded();

    // Only learn from multi-agent plans that executed successfully
    if (!plan.isComplex || plan.subtasks.length < 2) return null;

    const completedSubtasks = plan.subtasks.filter(s => s.status === 'completed').length;
    const successRate = completedSubtasks / Math.max(plan.subtasks.length, 1);

    if (successRate < 0.7) return null;

    const patternId = `pattern_${plan.strategy}_${plan.subtasks.map(s => s.agentType).join('_')}`;
    const existing = this.patterns.get(patternId);

    if (existing) {
      // Update existing pattern stats
      existing.usageCount++;
      existing.successRate = (existing.successRate * (existing.usageCount - 1) + successRate) / existing.usageCount;
      existing.averageExecutionTimeMs = Math.round(
        (existing.averageExecutionTimeMs * (existing.usageCount - 1) + result.executionTimeMs) / existing.usageCount
      );
      existing.lastUsedAt = Date.now();
      this.persistToStorage();
      return existing;
    }

    // Create new learned pattern
    const newPattern: SwarmPattern = {
      id: patternId,
      patternName: `Learned Swarm (${plan.topology})`,
      queryIntent: plan.originalQuery.substring(0, 100),
      complexityScore: plan.complexityScore,
      recommendedTopology: plan.topology,
      subtaskTemplates: plan.subtasks.map(s => ({
        title: s.title,
        description: s.description,
        agentType: s.agentType,
        priority: s.priority,
      })),
      successRate,
      usageCount: 1,
      averageExecutionTimeMs: result.executionTimeMs,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    this.patterns.set(newPattern.id, newPattern);
    this.persistToStorage();
    return newPattern;
  }

  /**
   * Get all stored patterns.
   */
  public getAllPatterns(): SwarmPattern[] {
    this.ensureLoaded();
    return Array.from(this.patterns.values()).sort((a, b) => b.usageCount - a.usageCount);
  }

  private ensureLoaded(): void {
    if (!this.isLoaded) {
      this.loadFromStorage();
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(PATTERN_STORAGE_KEY);
      if (raw) {
        const items: SwarmPattern[] = JSON.parse(raw);
        this.patterns = new Map(items.map(p => [p.id, p]));
      }
    } catch (e) {
      console.warn('RufloSelfLearning failed to load from localStorage:', e);
    } finally {
      this.isLoaded = true;
    }
  }

  private persistToStorage(): void {
    try {
      const items = Array.from(this.patterns.values());
      localStorage.setItem(PATTERN_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('RufloSelfLearning failed to persist to localStorage:', e);
    }
  }
}

export const rufloSelfLearning = RufloSelfLearning.getInstance();
