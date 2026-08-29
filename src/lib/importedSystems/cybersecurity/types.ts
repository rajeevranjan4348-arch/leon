export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface SecurityScanItem {
  id: string;
  category: 'OWASP_TOP_10' | 'INSECURE_DEPENDENCY' | 'SECRET_LEAK' | 'AUTHENTICATION' | 'INPUT_VALIDATION' | 'CONFIG_HARDENING';
  severity: VulnerabilitySeverity;
  cveOrRuleId?: string;
  title: string;
  description: string;
  affectedTarget: string;
  remediationAdvice: string;
  defensiveCodeSnippet?: string;
}

export interface SecurityAuditReport {
  reportId: string;
  targetName: string;
  timestamp: string;
  overallRiskRating: VulnerabilitySeverity;
  vulnerabilitiesFound: SecurityScanItem[];
  defensiveHardeningRecommendations: string[];
  complianceChecks: {
    owaspTop10Passed: boolean;
    secretsExposed: boolean;
    inputSanitizationActive: boolean;
    leastPrivilegeEnforced: boolean;
  };
}
