/**
 * Ruflo Task Analyzer & Planner
 * Automatically evaluates query complexity and decomposes complex tasks into an executable DAG plan.
 */

import { RufloPlan, RufloSubtask, ExecutionStrategy, SwarmTopology } from './types';
import { rufloSelfLearning } from './RufloSelfLearning';

export class TaskDecomposer {
  /**
   * Analyzes user query and decomposes it into an optimal multi-agent execution plan.
   */
  public static decomposeTask(query: string, searchMode: string = 'auto'): RufloPlan {
    const trimmed = query.trim();
    const isExplicitResearch = searchMode === 'research' || searchMode === 'deep';
    const complexityScore = this.calculateComplexityScore(trimmed, isExplicitResearch);
    const isComplex = complexityScore >= 35 || isExplicitResearch;

    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!isComplex) {
      // Direct simple path
      return {
        id: planId,
        originalQuery: query,
        isComplex: false,
        strategy: 'simple',
        topology: 'centralized',
        subtasks: [
          {
            id: 'subtask_direct',
            title: 'Direct Intelligence Response',
            description: 'Direct response for standard single-turn user inquiry',
            agentType: 'queen-coordinator',
            status: 'pending',
            dependencies: [],
            logs: [],
            retryCount: 0,
            maxRetries: 1,
          },
        ],
        createdAt: Date.now(),
        estimatedSteps: 1,
        complexityScore,
        rationale: 'Direct AI path selected for concise, straightforward query.',
      };
    }

    // Check Self-Learning Hive-Mind for past matching pattern
    const patternMatch = rufloSelfLearning.findMatchingPattern(trimmed, complexityScore);
    if (patternMatch) {
      const subtasks: RufloSubtask[] = patternMatch.subtaskTemplates.map((tmpl, idx) => ({
        id: `subtask_pattern_${idx + 1}`,
        title: tmpl.title,
        description: tmpl.description,
        agentType: tmpl.agentType,
        priority: tmpl.priority || 'high',
        status: 'pending',
        dependencies: idx > 0 ? [`subtask_pattern_${idx}`] : [],
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      }));

      // Append aggregator if not present
      if (!subtasks.some(s => s.agentType === 'aggregator')) {
        subtasks.push({
          id: `subtask_pattern_aggregator`,
          title: 'Master Multi-Agent Synthesis',
          description: 'Synthesize all peer findings into a unified, polished final response',
          agentType: 'aggregator',
          priority: 'critical',
          status: 'pending',
          dependencies: subtasks.map(s => s.id),
          logs: [],
          retryCount: 0,
          maxRetries: 1,
        });
      }

      return {
        id: planId,
        originalQuery: query,
        isComplex: true,
        strategy: 'hierarchical_swarm',
        topology: patternMatch.recommendedTopology,
        subtasks,
        createdAt: Date.now(),
        estimatedSteps: subtasks.length,
        complexityScore,
        rationale: `Reused learned swarm pattern "${patternMatch.patternName}" (Success Rate: ${Math.round(patternMatch.successRate * 100)}%).`,
        patternMatchId: patternMatch.id,
      };
    }

    // Complex multi-agent decomposition
    const subtasks: RufloSubtask[] = [];
    const lower = trimmed.toLowerCase();

    // 1. Research & Fact-Finding Domain
    const needsResearch =
      isExplicitResearch ||
      /\b(search|find|latest|news|compare|vs|what is|who is|explain|paper|history|data|overview|review|analyse|analyze|investigate|trends|forecast)\b/i.test(
        lower
      );

    if (needsResearch) {
      subtasks.push({
        id: 'subtask_research',
        title: 'Deep Information Retrieval & Grounding',
        description: 'Conduct deep web grounding, gather authoritative citations, and extract factual data',
        agentType: 'researcher',
        priority: 'high',
        status: 'pending',
        dependencies: [],
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // 2. Code Architecture & Engineering Domain
    const needsCode =
      /\b(code|script|function|class|bug|build|component|python|typescript|javascript|react|api|html|css|sql|algorithm|implement|debug|refactor|database|schema)\b/i.test(
        lower
      );

    if (needsCode) {
      subtasks.push({
        id: 'subtask_code',
        title: 'Architecture Design & Code Implementation',
        description: 'Design software structure, write robust type-safe code, and handle edge cases',
        agentType: 'coder',
        priority: 'critical',
        status: 'pending',
        dependencies: needsResearch ? ['subtask_research'] : [],
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // 3. Mathematical Reasoning & Formal Logic Domain
    const needsMath =
      /\b(solve|calculate|math|logic|proof|formula|equation|probability|stats|derivation|optimize|matrix|integral|theorem)\b/i.test(
        lower
      ) || /[\d+*/\\^=-]{6,}/.test(lower);

    if (needsMath) {
      subtasks.push({
        id: 'subtask_math',
        title: 'Step-by-Step Logic & Math Derivation',
        description: 'Perform rigorous mathematical reasoning, equation solving, and formal derivation',
        agentType: 'reasoner',
        priority: 'high',
        status: 'pending',
        dependencies: needsResearch ? ['subtask_research'] : [],
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // 4. Security & Vulnerability Audit Domain
    const needsSecurity =
      /\b(security|vulnerability|audit|auth|token|secret|cve|penetration|guardrail|safe|privacy|encrypt|sanitize)\b/i.test(
        lower
      );

    if (needsSecurity || (needsCode && complexityScore > 50)) {
      const secDependencies = subtasks.filter(s => s.id === 'subtask_code' || s.id === 'subtask_research').map(s => s.id);
      subtasks.push({
        id: 'subtask_security',
        title: 'Security Architecture & Threat Audit',
        description: 'Audit logic for security vulnerabilities, access control flaws, and input validation',
        agentType: 'security-architect',
        priority: 'high',
        status: 'pending',
        dependencies: secDependencies,
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // Fallback if no specific triggers matched but query is complex
    if (subtasks.length === 0) {
      subtasks.push({
        id: 'subtask_analysis',
        title: 'Multi-Dimensional Domain Analysis',
        description: 'Examine core principles, practical implications, and structured breakdown',
        agentType: 'researcher',
        priority: 'high',
        status: 'pending',
        dependencies: [],
        logs: [],
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // 5. Quality Assurance & Verification Subtask
    const priorForReview = subtasks.map(s => s.id);
    subtasks.push({
      id: 'subtask_review',
      title: 'QA Review & Hallucination Audit',
      description: 'Audit subtask outputs for factual accuracy, consistency, and correctness',
      agentType: 'reviewer',
      priority: 'high',
      status: 'pending',
      dependencies: priorForReview,
      logs: [],
      retryCount: 0,
      maxRetries: 1,
    });

    // 6. Master Result Aggregation Subtask
    const allPriorIds = subtasks.map(s => s.id);
    subtasks.push({
      id: 'subtask_aggregate',
      title: 'Master Multi-Agent Synthesis',
      description: 'Synthesize all peer findings into a unified, polished, highly structured final response',
      agentType: 'aggregator',
      priority: 'critical',
      status: 'pending',
      dependencies: allPriorIds,
      logs: [],
      retryCount: 0,
      maxRetries: 1,
    });

    // Determine execution strategy and topology
    const initialParallelTasks = subtasks.filter(s => s.dependencies.length === 0);
    const hasParallelism = initialParallelTasks.length > 1;

    let strategy: ExecutionStrategy = 'sequential';
    let topology: SwarmTopology = 'hierarchical';

    if (hasParallelism) {
      strategy = 'hierarchical_swarm';
      topology = 'hierarchical-mesh';
    } else if (subtasks.length > 3) {
      strategy = 'parallel';
      topology = 'mesh';
    }

    return {
      id: planId,
      originalQuery: query,
      isComplex: true,
      strategy,
      topology,
      subtasks,
      createdAt: Date.now(),
      estimatedSteps: subtasks.length,
      complexityScore,
      rationale: `Decomposed into ${subtasks.length} specialized subtasks using ${topology.toUpperCase()} topology.`,
    };
  }

  /**
   * Calculates a continuous complexity score (0-100) based on query attributes.
   */
  private static calculateComplexityScore(query: string, isExplicitResearch: boolean): number {
    let score = 0;
    const words = query.split(/\s+/).filter(Boolean);
    const length = words.length;

    // Word count factor
    if (length > 40) score += 40;
    else if (length > 20) score += 25;
    else if (length > 10) score += 15;
    else score += 5;

    if (isExplicitResearch) score += 35;

    // Conjunctions & multi-part requests
    const conjunctionMatches = (query.match(/\b(and|also|furthermore|moreover|compare|contrast|versus|pros and cons|step-by-step|detailed|comprehensive|architecture|pipeline|workflow|system)\b/gi) || []).length;
    score += Math.min(30, conjunctionMatches * 10);

    // Question marks / bullet points
    const questionMarks = (query.match(/\?/g) || []).length;
    if (questionMarks > 1) score += 15;

    // Code / Technical keywords
    if (/\b(create|build|implement|design|write a|generate a|develop|refactor|test|security|database|api|backend|frontend)\b/i.test(query)) {
      score += 15;
    }

    return Math.min(100, score);
  }
}
