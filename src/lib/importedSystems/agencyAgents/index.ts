/**
 * Agency Agents Subsystem
 * Reference: https://github.com/msitarzewski/agency-agents (MIT License)
 * 
 * Exports the complete Agency Agents backend architecture:
 * - Types & Contracts
 * - Specialist Agents across 9 divisions
 * - Dynamic AgencyAgentRegistry
 * - AgencyAgentRouter
 * - AgencyTaskDecomposer
 * - AgencyVerificationEngine
 * - AgencyErrorRecovery
 * - AgencyOrchestrator
 */

export * from './types';
export * from './specialists/BaseSpecialist';
export * from './specialists/engineeringSpecialists';
export * from './specialists/designSpecialists';
export * from './specialists/researchSpecialists';
export * from './specialists/testingSpecialists';
export * from './specialists/securitySpecialists';
export * from './specialists/productStrategySpecialists';
export * from './AgencyAgentRegistry';
export * from './AgencyAgentRouter';
export * from './AgencyTaskDecomposer';
export * from './AgencyVerificationEngine';
export * from './AgencyErrorRecovery';
export * from './AgencyOrchestrator';
