import { SpecialistAgent, AgentDivision } from './types';
import {
  BackendArchitectSpecialist,
  FrontendDeveloperSpecialist,
  FullStackEngineerSpecialist,
  AIMLEngineerSpecialist,
  DevOpsCloudSpecialist,
  MobileAndroidSpecialist,
  DatabasePerformanceSpecialist,
} from './specialists/engineeringSpecialists';
import {
  UIUXDesignerSpecialist,
  AccessibilitySpecialist,
  DesignSystemArchitect,
} from './specialists/designSpecialists';
import {
  DeepResearchSpecialist,
  TechnicalFactVerifierSpecialist,
} from './specialists/researchSpecialists';
import {
  QualityAssuranceSpecialist,
  EdgeCaseValidatorSpecialist,
} from './specialists/testingSpecialists';
import {
  ApplicationSecuritySpecialist,
  PrivacyComplianceGuardian,
} from './specialists/securitySpecialists';
import {
  TechnicalProductManagerSpecialist,
  SystemsAnalystSpecialist,
  TroubleshootingSpecialist,
  TechnicalWriterSpecialist,
} from './specialists/productStrategySpecialists';

/**
 * AgencyAgentRegistry
 * Dynamic registry organizing specialized agents across 9 core agency divisions.
 * Supports lazy loading, priority resolution, and domain mapping.
 */
export class AgencyAgentRegistry {
  private static instance: AgencyAgentRegistry;
  private specialistsMap = new Map<string, SpecialistAgent>();
  private divisionMap = new Map<AgentDivision, string[]>();

  private constructor() {
    this.registerAllSpecialists();
  }

  public static getInstance(): AgencyAgentRegistry {
    if (!AgencyAgentRegistry.instance) {
      AgencyAgentRegistry.instance = new AgencyAgentRegistry();
    }
    return AgencyAgentRegistry.instance;
  }

  private registerAllSpecialists(): void {
    const allInstances: SpecialistAgent[] = [
      // Engineering
      new BackendArchitectSpecialist(),
      new FrontendDeveloperSpecialist(),
      new FullStackEngineerSpecialist(),
      new AIMLEngineerSpecialist(),
      new DevOpsCloudSpecialist(),
      new MobileAndroidSpecialist(),
      new DatabasePerformanceSpecialist(),

      // Design
      new UIUXDesignerSpecialist(),
      new AccessibilitySpecialist(),
      new DesignSystemArchitect(),

      // Research
      new DeepResearchSpecialist(),
      new TechnicalFactVerifierSpecialist(),

      // Testing
      new QualityAssuranceSpecialist(),
      new EdgeCaseValidatorSpecialist(),

      // Security
      new ApplicationSecuritySpecialist(),
      new PrivacyComplianceGuardian(),

      // Product & Strategy & Support & Marketing
      new TechnicalProductManagerSpecialist(),
      new SystemsAnalystSpecialist(),
      new TroubleshootingSpecialist(),
      new TechnicalWriterSpecialist(),
    ];

    allInstances.forEach(agent => {
      this.specialistsMap.set(agent.id, agent);
      const divAgents = this.divisionMap.get(agent.division) || [];
      divAgents.push(agent.id);
      this.divisionMap.set(agent.division, divAgents);
    });
  }

  /**
   * Retrieves a specialist agent by ID.
   */
  public getSpecialist(id: string): SpecialistAgent | undefined {
    return this.specialistsMap.get(id);
  }

  /**
   * Retrieves all specialists in a given division.
   */
  public getByDivision(division: AgentDivision): SpecialistAgent[] {
    const ids = this.divisionMap.get(division) || [];
    return ids.map(id => this.specialistsMap.get(id)!).filter(Boolean);
  }

  /**
   * Finds matching specialists ranked by domain relevance and capability match.
   */
  public findMatchingSpecialists(query: string, limit: number = 3): SpecialistAgent[] {
    const lower = query.toLowerCase();
    const scoredAgents: Array<{ agent: SpecialistAgent; score: number }> = [];

    this.specialistsMap.forEach(agent => {
      let score = 0;

      // 1. Division keyword match
      if (lower.includes(agent.division)) score += 30;

      // 2. Specialty & Name matching
      const nameWords = agent.name.toLowerCase().split(/\s+/);
      for (const word of nameWords) {
        if (word.length > 3 && lower.includes(word)) score += 25;
      }

      const specialtyWords = agent.specialty.toLowerCase().split(/[,\s]+/);
      for (const word of specialtyWords) {
        if (word.length > 3 && lower.includes(word)) score += 15;
      }

      // 3. Capability matching
      for (const cap of agent.capabilities) {
        if (lower.includes(cap.toLowerCase())) score += 20;
      }

      // 4. Priority baseline
      score += (agent.priorityScore || 50) * 0.2;

      scoredAgents.push({ agent, score });
    });

    return scoredAgents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.agent);
  }

  /**
   * Summary overview of registered divisions and agent count.
   */
  public getRegistrySummary() {
    const divisionsSummary: Record<string, number> = {};
    this.divisionMap.forEach((agents, div) => {
      divisionsSummary[div] = agents.length;
    });

    return {
      totalSpecialists: this.specialistsMap.size,
      divisionsCount: this.divisionMap.size,
      divisions: divisionsSummary,
      availableSpecialists: Array.from(this.specialistsMap.values()).map(a => ({
        id: a.id,
        name: a.name,
        division: a.division,
        specialty: a.specialty,
      })),
    };
  }
}

export const agencyAgentRegistry = AgencyAgentRegistry.getInstance();
