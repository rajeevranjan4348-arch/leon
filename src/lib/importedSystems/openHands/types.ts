/**
 * OpenHands Autonomous Coding Agent Architecture
 * Reference: https://github.com/All-Hands-AI/OpenHands (MIT)
 * 
 * Defines schemas for code inspection, AST/dependency parsing, code patch generation,
 * error log diagnosis, iterative bug fixing, and sandboxed validation.
 */

export interface CodebaseFileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children?: CodebaseFileNode[];
}

export interface CodeIssueDiagnosis {
  issueId: string;
  severity: 'critical' | 'error' | 'warning' | 'suggestion';
  filePath: string;
  lineRange?: { start: number; end: number };
  category: 'syntax' | 'type_error' | 'runtime_crash' | 'dependency' | 'performance' | 'security';
  errorMessage: string;
  rootCause: string;
  suggestedPatch: string;
}

export interface CodePatchPlan {
  planId: string;
  targetFiles: string[];
  description: string;
  diagnoses: CodeIssueDiagnosis[];
  steps: Array<{
    stepNumber: number;
    action: 'create_file' | 'edit_file' | 'delete_file' | 'install_package';
    filePath: string;
    description: string;
    patchContent?: string;
  }>;
  safetyCheck: {
    passed: boolean;
    reason?: string;
  };
}

export interface CodeFixResult {
  planId: string;
  success: boolean;
  appliedPatchesCount: number;
  fixedIssues: string[];
  remainingIssues: string[];
  executionTimeMs: number;
  verificationPassed: boolean;
}
