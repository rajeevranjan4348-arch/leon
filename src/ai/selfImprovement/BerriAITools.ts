/**
 * BerriAI Self-Improving Agent Tool Definitions
 * Exposes write_improvement_proposal, apply_approved_proposal, and retrieve_relevant_lessons
 * for integration into the AI agent tool system.
 */

import { selfImprovementEngine } from './SelfImprovementEngine';
import { RiskLevel } from './types';

export const berriAIToolDefinitions = [
  {
    name: 'write_improvement_proposal',
    description: 'Generates a structured self-improvement proposal when system failure or tool defect is detected. Requires human approval before application.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Concise title for the proposed improvement fix' },
        problem: { type: 'string', description: 'Description of the problem or defect' },
        observedBehavior: { type: 'string', description: 'The unexpected or failed behavior observed' },
        expectedBehavior: { type: 'string', description: 'The expected correct behavior' },
        rootCause: { type: 'string', description: 'Root cause analysis explaining why the failure happened' },
        affectedFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of files requiring adjustment',
        },
        proposedChange: { type: 'string', description: 'Detailed description of proposed fix or code adjustment' },
        riskLevel: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          description: 'Risk assessment level',
        },
        expectedBenefit: { type: 'string', description: 'Expected benefit or outcome' },
        testPlan: { type: 'string', description: 'Verification test plan' },
      },
      required: [
        'title',
        'problem',
        'observedBehavior',
        'expectedBehavior',
        'rootCause',
        'affectedFiles',
        'proposedChange',
        'expectedBenefit',
        'testPlan',
      ],
    },
  },
  {
    name: 'apply_approved_proposal',
    description: 'Applies an improvement proposal after explicit human approval. Saves the learned lesson to memory.',
    parameters: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'The unique ID of the approved proposal (e.g., prop_12345)' },
      },
      required: ['proposalId'],
    },
  },
  {
    name: 'retrieve_relevant_lessons',
    description: 'Retrieves previously learned lessons and solutions for a given query or tool to prevent past mistakes.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords or user request topic' },
        feature: { type: 'string', description: 'Optional feature or tool name' },
      },
      required: ['query'],
    },
  },
];

export async function executeBerriAITool(toolName: string, args: any): Promise<any> {
  switch (toolName) {
    case 'write_improvement_proposal': {
      const proposal = selfImprovementEngine.createProposal({
        title: args.title,
        problem: args.problem,
        observedBehavior: args.observedBehavior,
        expectedBehavior: args.expectedBehavior,
        rootCause: args.rootCause,
        affectedFiles: args.affectedFiles || [],
        proposedChange: args.proposedChange,
        riskLevel: (args.riskLevel as RiskLevel) || 'LOW',
        expectedBenefit: args.expectedBenefit,
        testPlan: args.testPlan,
      });

      return {
        success: true,
        proposalId: proposal.id,
        proposal,
        message: `Created improvement proposal "${proposal.title}". Explicit human approval is required before applying.`,
      };
    }

    case 'apply_approved_proposal': {
      const result = await selfImprovementEngine.applyApprovedProposal(args.proposalId);
      return result;
    }

    case 'retrieve_relevant_lessons': {
      const lessons = selfImprovementEngine.getAllLessons();
      const filtered = selfImprovementEngine.getPromptLessonContext(args.query, args.feature);
      return {
        success: true,
        lessonCount: lessons.length,
        context: filtered,
        lessons: lessons.slice(0, 5),
      };
    }

    default:
      return {
        success: false,
        error: `Unknown BerriAI tool: ${toolName}`,
      };
  }
}
