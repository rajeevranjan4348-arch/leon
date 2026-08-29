import {
  TaskDecompositionPlan,
  SubTaskDefinition,
  RoutingDecision,
  AgentDivision
} from './types';
import { agencyAgentRegistry } from './AgencyAgentRegistry';

/**
 * AgencyTaskDecomposer
 * Decomposes complex user objectives into structured multi-agent subtasks with
 * dependency resolution, expected output formats, and execution strategies.
 */
export class AgencyTaskDecomposer {
  /**
   * Generates an execution plan based on query and routing decision.
   */
  public static plan(userQuery: string, route: RoutingDecision): TaskDecompositionPlan {
    const isComplex = route.mode === 'collaborative_pipeline';

    // Simple single-specialist execution plan
    if (!isComplex) {
      const primaryAgent = agencyAgentRegistry.getSpecialist(route.primaryAgentId);
      const subtask: SubTaskDefinition = {
        id: 'subtask_1_primary',
        title: `Execute ${primaryAgent?.name || 'Specialist'} Analysis`,
        description: `Perform primary domain task for user objective: "${userQuery}"`,
        assignedAgentId: route.primaryAgentId,
        division: route.division,
        dependencies: [],
        expectedOutputFormat: route.division === 'engineering' ? 'code' : 'summary',
        status: 'pending',
      };

      return {
        originalQuery: userQuery,
        isComplex: false,
        intent: route.reasoning,
        primaryDivision: route.division,
        subtasks: [subtask],
        executionStrategy: 'single_specialist',
        estimatedComplexity: 'low',
      };
    }

    // Collaborative multi-agent pipeline
    const subtasks: SubTaskDefinition[] = [];

    // Step 1: Architecture & Design / Planning
    const plannerId = route.division === 'design'
      ? 'design-ui-ux'
      : route.division === 'security'
        ? 'sec-app-security'
        : route.division === 'research'
          ? 'res-deep-research'
          : 'eng-backend-architect';

    subtasks.push({
      id: 'subtask_1_plan',
      title: 'Phase 1: Architecture & Strategy Specification',
      description: `Establish architectural requirements, interfaces, schemas, or research scope for "${userQuery}"`,
      assignedAgentId: plannerId,
      division: route.division,
      dependencies: [],
      expectedOutputFormat: 'analysis',
      status: 'pending',
    });

    // Step 2: Primary Implementation / Deep Exploration
    subtasks.push({
      id: 'subtask_2_impl',
      title: 'Phase 2: Core Domain Implementation',
      description: `Produce production-ready implementation, structured code, or deep factual findings based on Phase 1 specification`,
      assignedAgentId: route.primaryAgentId,
      division: route.division,
      dependencies: ['subtask_1_plan'],
      expectedOutputFormat: route.division === 'research' ? 'summary' : 'code',
      status: 'pending',
    });

    // Step 3: Verification / Testing / Security Review
    const reviewerId = route.division === 'security'
      ? 'test-edge-case-validator'
      : route.division === 'research'
        ? 'res-fact-verifier'
        : 'test-qa-automation';

    subtasks.push({
      id: 'subtask_3_review',
      title: 'Phase 3: QA, Security & Verification Review',
      description: `Audit implementation against edge cases, security vulnerabilities, or factual citations`,
      assignedAgentId: reviewerId,
      division: route.division === 'research' ? 'research' : 'testing',
      dependencies: ['subtask_2_impl'],
      expectedOutputFormat: 'verification',
      status: 'pending',
    });

    return {
      originalQuery: userQuery,
      isComplex: true,
      intent: route.reasoning,
      primaryDivision: route.division,
      subtasks,
      executionStrategy: 'sequential_pipeline',
      estimatedComplexity: 'high',
    };
  }
}
