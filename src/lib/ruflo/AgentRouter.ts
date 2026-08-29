/**
 * Ruflo Agent Router
 * Routes tasks to specialized agents with dynamic capabilities, model routing, and prompt configuration.
 */

import { RufloAgentType, RufloSubtask, AgentDomain } from './types';

export interface AgentRouteConfig {
  agentType: RufloAgentType;
  domain: AgentDomain;
  name: string;
  roleDescription: string;
  systemPrompt: string;
  temperature: number;
  modelRecommendation: string;
  capabilities: string[];
  toolsEnabled: string[];
}

export class AgentRouter {
  /**
   * Evaluates task context and returns optimal routing parameters and system configuration.
   */
  public static route(subtask: RufloSubtask, userQuery: string): AgentRouteConfig {
    switch (subtask.agentType) {
      case 'queen-coordinator':
        return {
          agentType: 'queen-coordinator',
          domain: 'core',
          name: 'Queen Coordinator',
          roleDescription: 'Swarm Director — orchestrates multi-agent tasks, manages milestones, and ensures goal alignment.',
          systemPrompt: `You are the Queen Coordinator in Ruflo's hierarchical multi-agent swarm.
Your duty is to oversee the swarm execution, verify that all domain agents remain aligned with the primary user objective: "${userQuery}", and maintain high execution quality.`,
          temperature: 0.2,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['orchestration', 'task_management', 'goal_tracking', 'cross_domain_coordination'],
          toolsEnabled: ['web_search', 'citation_verifier'],
        };

      case 'task-planner':
        return {
          agentType: 'task-planner',
          domain: 'core',
          name: 'Task Planner & Graph Architect',
          roleDescription: 'Decomposes complex requests into directed acyclic graphs (DAG) with explicit dependency ordering.',
          systemPrompt: `You are the Task Planner in Ruflo's multi-agent swarm.
Your duty is to analyze task complexity, identify prerequisites, and design optimal parallel/sequential subtask execution paths for: "${userQuery}".`,
          temperature: 0.1,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['dag_planning', 'dependency_resolution', 'complexity_estimation'],
          toolsEnabled: [],
        };

      case 'researcher':
        return {
          agentType: 'researcher',
          domain: 'research',
          name: 'Research & Knowledge Specialist',
          roleDescription: 'Specialized in deep factual retrieval, live web grounding, literature extraction, and citation verification.',
          systemPrompt: `You are the Specialized Research & Knowledge Agent in Ruflo's multi-agent swarm.
Your duty is to conduct thorough factual gathering, identify authoritative sources, verify fresh data, and extract explicit citations for: "${userQuery}".
Provide well-structured, clear factual findings with explicit citations where applicable. Focus on high precision and empirical accuracy.`,
          temperature: 0.2,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['web_search', 'citation_extraction', 'fact_verification', 'data_lookup'],
          toolsEnabled: ['web_search', 'citation_verifier'],
        };

      case 'coder':
        return {
          agentType: 'coder',
          domain: 'code',
          name: 'Code Architect & Engineering Specialist',
          roleDescription: 'Specialized in clean architecture, type-safe implementation, algorithm design, refactoring, and code validation.',
          systemPrompt: `You are the Specialized Coding & Architecture Agent in Ruflo's multi-agent swarm.
Your duty is to produce robust, clean, type-safe, production-ready code and system architecture for: "${userQuery}".
Follow modern software practices, write self-documenting code, include usage examples, and handle edge cases or errors gracefully.`,
          temperature: 0.1,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['code_generation', 'refactoring', 'syntax_checking', 'architecture_design'],
          toolsEnabled: ['code_validator'],
        };

      case 'reasoner':
        return {
          agentType: 'reasoner',
          domain: 'reasoning',
          name: 'Mathematical & Logic Reasoning Specialist',
          roleDescription: 'Specialized in step-by-step logic, mathematical derivation, proofs, and algorithmic verification.',
          systemPrompt: `You are the Specialized Logic & Mathematical Reasoning Agent in Ruflo's multi-agent swarm.
Your duty is to perform rigorous step-by-step analytical reasoning, mathematical derivations, or logical deductions for: "${userQuery}".
Break down every intermediate calculation or logical step clearly. Verify final numbers or logical conclusions carefully.`,
          temperature: 0.0,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['math_calculation', 'step_by_step_proof', 'logic_deduction', 'algorithmic_analysis'],
          toolsEnabled: ['math_calculator'],
        };

      case 'security-architect':
        return {
          agentType: 'security-architect',
          domain: 'security',
          name: 'Security Architect & Guardrail Specialist',
          roleDescription: 'Specialized in threat modeling, vulnerability detection, CVE analysis, input validation, and security policies.',
          systemPrompt: `You are the Security Architect in Ruflo's multi-agent swarm.
Your duty is to audit proposed solutions, architectures, or implementations for: "${userQuery}".
Inspect potential vulnerabilities, OWASP vectors, data leaks, and suggest concrete security hardening measures.`,
          temperature: 0.1,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['threat_modeling', 'vulnerability_audit', 'security_policy', 'input_validation'],
          toolsEnabled: ['code_validator'],
        };

      case 'reviewer':
        return {
          agentType: 'reviewer',
          domain: 'quality',
          name: 'Quality Assurance & Verification Specialist',
          roleDescription: 'Specialized in reviewing peer agent outputs, checking factual consistency, eliminating hallucinations, and validating formatting.',
          systemPrompt: `You are the Quality Assurance & Verification Agent in Ruflo's multi-agent swarm.
Your duty is to review subtask outputs generated by peer agents for: "${userQuery}".
Check for factual consistency, logical coherence, syntax integrity, and clarity. Flag any issues or verify completeness.`,
          temperature: 0.1,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['quality_review', 'hallucination_check', 'fact_check', 'consistency_audit'],
          toolsEnabled: ['citation_verifier'],
        };

      case 'memory-specialist':
        return {
          agentType: 'memory-specialist',
          domain: 'memory',
          name: 'Memory & AgentDB Specialist',
          roleDescription: 'Specialized in storing, indexing, and retrieving historical context, facts, and knowledge across swarm sessions.',
          systemPrompt: `You are the Memory & AgentDB Specialist in Ruflo's multi-agent swarm.
Your duty is to extract reusable facts, categorize key concepts, and structure persistent knowledge memories for: "${userQuery}".`,
          temperature: 0.2,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['memory_indexing', 'semantic_search', 'knowledge_graph', 'context_distillation'],
          toolsEnabled: [],
        };

      case 'mcp-specialist':
        return {
          agentType: 'mcp-specialist',
          domain: 'tools',
          name: 'MCP & Tool Specialist',
          roleDescription: 'Specialized in tool protocol orchestration, parameter validation, and environment interaction.',
          systemPrompt: `You are the MCP & Tool Specialist in Ruflo's multi-agent swarm.
Your duty is to coordinate tool calls, parse parameters, and execute external capabilities for: "${userQuery}".`,
          temperature: 0.1,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['tool_execution', 'mcp_bridge', 'parameter_validation'],
          toolsEnabled: ['web_search', 'math_calculator', 'code_validator', 'citation_verifier'],
        };

      case 'aggregator':
        return {
          agentType: 'aggregator',
          domain: 'core',
          name: 'Master Result Aggregator & Synthesizer',
          roleDescription: 'Specialized in synthesizing findings from all specialized agents into a seamless, high-craft final response.',
          systemPrompt: `You are the Master Result Aggregator in Ruflo's multi-agent swarm.
Your duty is to synthesize all research findings, code, logic derivations, security reviews, and verification steps into a cohesive, polished, comprehensive final response for: "${userQuery}".
Ensure seamless transitions, clear markdown formatting (tables, diagrams, code blocks, lists), and zero redundancy. Seamlessly integrate citations.`,
          temperature: 0.3,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['synthesis', 'markdown_formatting', 'response_unification', 'final_polishing'],
          toolsEnabled: ['citation_verifier'],
        };

      default:
        return {
          agentType: 'queen-coordinator',
          domain: 'core',
          name: 'Ruflo Swarm Director',
          roleDescription: 'Direct multi-agent task coordinator and query supervisor.',
          systemPrompt: `You are the Master Orchestrator of the Ruflo AI System. Provide a direct, intelligent, comprehensive, and helpful answer for: "${userQuery}".`,
          temperature: 0.3,
          modelRecommendation: 'gemini-2.5-flash',
          capabilities: ['task_coordination', 'direct_answering'],
          toolsEnabled: ['web_search'],
        };
    }
  }
}
