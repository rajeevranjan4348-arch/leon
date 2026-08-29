export interface ScientificHypothesis {
  id: string;
  statement: string;
  domain: string;
  variables: { independent: string[]; dependent: string[]; controlled: string[] };
  confidenceScore: number;
  falsifiabilityCriteria: string;
}

export interface LiteratureReference {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  journalOrArxiv?: string;
  abstract: string;
  keyFindings: string[];
  methodology: string;
  citationCount?: number;
}

export interface ResearchWorkflowResult {
  workflowId: string;
  researchTopic: string;
  hypotheses: ScientificHypothesis[];
  relevantLiterature: LiteratureReference[];
  structuredReasoningSteps: Array<{
    stepNumber: number;
    phase: 'hypothesis_generation' | 'literature_triangulation' | 'methodology_design' | 'synthesis';
    findings: string;
  }>;
  executiveSummary: string;
  recommendedNextExperiments: string[];
}
