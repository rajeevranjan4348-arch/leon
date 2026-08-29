import { RoutingDecision, AgentDivision } from './types';
import { agencyAgentRegistry } from './AgencyAgentRegistry';

/**
 * AgencyAgentRouter
 * Analyzes incoming user requests, determines task complexity, matches appropriate
 * division specialists, and formulates single or collaborative execution strategies.
 */
export class AgencyAgentRouter {
  /**
   * Evaluates user query and returns routing decision.
   */
  public static route(userQuery: string, conversationTopic?: string): RoutingDecision {
    const clean = (userQuery || '').trim();
    const lower = clean.toLowerCase();

    // 1. Security & Compliance Keywords
    if (
      lower.includes('security') ||
      lower.includes('vulnerability') ||
      lower.includes('owasp') ||
      lower.includes('threat') ||
      lower.includes('penetration') ||
      lower.includes('auth bypass') ||
      lower.includes('sqli') ||
      lower.includes('xss') ||
      lower.includes('csrf') ||
      lower.includes('jwt audit') ||
      lower.includes('privacy') ||
      lower.includes('pii') ||
      lower.includes('gdpr')
    ) {
      const isPrivacy = lower.includes('privacy') || lower.includes('pii') || lower.includes('gdpr');
      const primaryAgentId = isPrivacy ? 'sec-privacy-guardian' : 'sec-app-security';

      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId,
        collaboratingAgentIds: ['eng-backend-architect', 'test-edge-case-validator'],
        division: 'security',
        reasoning: 'Query requires application security analysis and vulnerability assessment',
        confidence: 0.95,
        suggestedTools: ['code_validator'],
      };
    }

    // 2. Testing & Quality Assurance Keywords
    if (
      lower.includes('test') ||
      lower.includes('unit test') ||
      lower.includes('integration test') ||
      lower.includes('jest') ||
      lower.includes('vitest') ||
      lower.includes('mock') ||
      lower.includes('fuzzing') ||
      lower.includes('race condition') ||
      lower.includes('memory leak')
    ) {
      const isEdgeCase = lower.includes('race condition') || lower.includes('memory leak') || lower.includes('fuzz');
      const primaryAgentId = isEdgeCase ? 'test-edge-case-validator' : 'test-qa-automation';

      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId,
        collaboratingAgentIds: ['eng-frontend-developer', 'eng-backend-architect'],
        division: 'testing',
        reasoning: 'Query requires automated testing, test suite design, or edge-case validation',
        confidence: 0.94,
        suggestedTools: ['code_validator'],
      };
    }

    // 3. UI/UX & Design Keywords
    if (
      lower.includes('ui') ||
      lower.includes('ux') ||
      lower.includes('design system') ||
      lower.includes('tailwind') ||
      lower.includes('accessibility') ||
      lower.includes('a11y') ||
      lower.includes('wcag') ||
      lower.includes('color palette') ||
      lower.includes('interaction design') ||
      lower.includes('css') ||
      lower.includes('responsive design')
    ) {
      let primaryAgentId = 'design-ui-ux';
      if (lower.includes('a11y') || lower.includes('accessibility') || lower.includes('wcag')) {
        primaryAgentId = 'design-accessibility-a11y';
      } else if (lower.includes('design system') || lower.includes('token') || lower.includes('theme')) {
        primaryAgentId = 'design-system-architect';
      }

      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId,
        collaboratingAgentIds: ['eng-frontend-developer'],
        division: 'design',
        reasoning: 'Query requires specialized UI/UX design, accessibility, or design system architecture',
        confidence: 0.92,
        suggestedTools: [],
      };
    }

    // 4. Deep Research & Fact Verification Keywords
    if (
      lower.includes('research') ||
      lower.includes('search the web') ||
      lower.includes('latest') ||
      lower.includes('current') ||
      lower.includes('2026') ||
      lower.includes('compare') ||
      lower.includes('vs') ||
      lower.includes('literature review') ||
      lower.includes('benchmarks')
    ) {
      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId: 'res-deep-research',
        collaboratingAgentIds: ['res-fact-verifier', 'mkt-technical-writer'],
        division: 'research',
        reasoning: 'Query requires live web grounding, literature extraction, or comparative research',
        confidence: 0.96,
        suggestedTools: ['web_search', 'citation_verifier'],
      };
    }

    // 5. DevOps, Cloud & Android Mobile Keywords
    if (
      lower.includes('docker') ||
      lower.includes('ci/cd') ||
      lower.includes('github actions') ||
      lower.includes('deploy') ||
      lower.includes('cloud run') ||
      lower.includes('kubernetes') ||
      lower.includes('container')
    ) {
      return {
        mode: 'single',
        primaryAgentId: 'eng-devops-cloud',
        collaboratingAgentIds: ['sec-app-security'],
        division: 'engineering',
        reasoning: 'Query requires DevOps, Docker containerization, or cloud deployment architecture',
        confidence: 0.91,
        suggestedTools: [],
      };
    }

    if (
      lower.includes('android') ||
      lower.includes('kotlin') ||
      lower.includes('intent') ||
      lower.includes('package manager') ||
      lower.includes('jetpack compose')
    ) {
      return {
        mode: 'single',
        primaryAgentId: 'eng-mobile-android',
        collaboratingAgentIds: ['eng-fullstack-engineer'],
        division: 'engineering',
        reasoning: 'Query requires native Android or mobile systems engineering',
        confidence: 0.93,
        suggestedTools: [],
      };
    }

    // 6. Database & Performance Keywords
    if (
      lower.includes('database') ||
      lower.includes('postgres') ||
      lower.includes('sql') ||
      lower.includes('schema') ||
      lower.includes('firestore') ||
      lower.includes('drizzle') ||
      lower.includes('prisma') ||
      lower.includes('indexing') ||
      lower.includes('query optimization')
    ) {
      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId: 'eng-database-performance',
        collaboratingAgentIds: ['eng-backend-architect', 'sec-app-security'],
        division: 'engineering',
        reasoning: 'Query requires database modeling, query tuning, or data integrity engineering',
        confidence: 0.94,
        suggestedTools: ['code_validator'],
      };
    }

    // 7. General Frontend / Backend / Full-Stack Coding Request
    if (
      lower.includes('react') ||
      lower.includes('typescript') ||
      lower.includes('javascript') ||
      lower.includes('component') ||
      lower.includes('frontend') ||
      lower.includes('hook') ||
      lower.includes('state')
    ) {
      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId: 'eng-frontend-developer',
        collaboratingAgentIds: ['test-qa-automation', 'design-ui-ux'],
        division: 'engineering',
        reasoning: 'Query requires frontend web development and React architecture',
        confidence: 0.95,
        suggestedTools: ['code_validator'],
      };
    }

    if (
      lower.includes('api') ||
      lower.includes('backend') ||
      lower.includes('server') ||
      lower.includes('endpoint') ||
      lower.includes('microservice') ||
      lower.includes('express')
    ) {
      return {
        mode: this.isComplexQuery(lower) ? 'collaborative_pipeline' : 'single',
        primaryAgentId: 'eng-backend-architect',
        collaboratingAgentIds: ['sec-app-security', 'test-qa-automation'],
        division: 'engineering',
        reasoning: 'Query requires server API architecture and backend engineering',
        confidence: 0.95,
        suggestedTools: ['code_validator'],
      };
    }

    // 8. Troubleshooting & Bug Diagnostics
    if (
      lower.includes('error') ||
      lower.includes('bug') ||
      lower.includes('crash') ||
      lower.includes('stack trace') ||
      lower.includes('fix') ||
      lower.includes('why does this fail') ||
      lower.includes('exception')
    ) {
      return {
        mode: 'single',
        primaryAgentId: 'supp-troubleshooting',
        collaboratingAgentIds: ['eng-fullstack-engineer'],
        division: 'support',
        reasoning: 'Query requires root cause debugging and error resolution',
        confidence: 0.93,
        suggestedTools: ['code_validator'],
      };
    }

    // Default: Fallback to matching specialist by keyword ranking
    const matches = agencyAgentRegistry.findMatchingSpecialists(clean, 1);
    const topAgent = matches[0] || agencyAgentRegistry.getSpecialist('eng-fullstack-engineer')!;

    return {
      mode: 'single',
      primaryAgentId: topAgent.id,
      division: topAgent.division,
      reasoning: `Matched ${topAgent.name} based on domain relevance`,
      confidence: 0.85,
      suggestedTools: [],
    };
  }

  /**
   * Determines if a request has high complexity requiring multi-agent collaboration.
   */
  private static isComplexQuery(query: string): boolean {
    const complexIndicators = [
      'and also',
      'including test',
      'with security',
      'end-to-end',
      'full architecture',
      'step-by-step',
      'comprehensive',
      'production ready',
      'full stack',
      'design and implement',
      'audit and fix',
    ];

    const wordCount = query.split(/\s+/).length;
    const hasComplexKeywords = complexIndicators.some(ind => query.includes(ind));

    return wordCount > 25 || hasComplexKeywords;
  }
}
