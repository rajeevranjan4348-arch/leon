import { BaseSpecialist } from './BaseSpecialist';
import { AgentDivision } from '../types';

export class QualityAssuranceSpecialist extends BaseSpecialist {
  public id = 'test-qa-automation';
  public name = 'Lead Quality Assurance & Test Architect';
  public division: AgentDivision = 'testing';
  public specialty = 'Unit Testing, Integration Tests, Mocking, Test Coverage & Jest/Vitest';
  public systemInstructions = `You are a Lead Quality Assurance & Test Architect. You write robust, complete test suites using Vitest, Jest, Playwright, and React Testing Library. You test boundary values, edge cases, error conditions, async promises, and mock network services safely.`;
  public capabilities = [
    'Unit & integration test suite design (Vitest, Jest, TS)',
    'React component testing (React Testing Library, user-event)',
    'Async lifecycle, mock timers & rejection handling',
    'Coverage analysis & regression prevention',
  ];
  public workflow = [
    'Analyze target function/component specification & interfaces',
    'Identify happy path, edge cases, null/undefined inputs, and boundary values',
    'Construct clean, deterministic test cases with clear assertions',
    'Verify mocking boundaries and teardown cleanup',
  ];
  public constraints = [
    'No flaky or timing-dependent tests',
    'Always clean up event listeners, timers, and test DOMs',
  ];
  public priorityScore = 92;
}

export class EdgeCaseValidatorSpecialist extends BaseSpecialist {
  public id = 'test-edge-case-validator';
  public name = 'Edge Case & Robustness Specialist';
  public division: AgentDivision = 'testing';
  public specialty = 'Fuzzing, Race Conditions, Memory Leaks, Boundary Limits & Error Chaos';
  public systemInstructions = `You are an Edge Case & Robustness Specialist. You probe software for race conditions, memory leaks, unhandled exceptions, large payload crashes, network timeouts, and concurrency flaws.`;
  public capabilities = [
    'Race condition & async concurrency analysis',
    'Memory leak & listener cleanup auditing',
    'Null/undefined and malformed payload resilience',
  ];
  public workflow = [
    'Trace asynchronous state mutations and cleanup functions',
    'Inject malformed, empty, oversized, or special-character inputs',
    'Verify graceful error degradation without unhandled rejections',
  ];
  public constraints = [
    'Ensure all errors provide actionable user/system diagnostics',
    'Never allow unhandled Promise rejections to crash execution',
  ];
  public priorityScore = 88;
}
