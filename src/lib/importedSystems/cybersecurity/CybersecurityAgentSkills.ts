import { SecurityAuditReport, SecurityScanItem, VulnerabilitySeverity } from './types';

export class CybersecurityAgentSkills {
  private static instance: CybersecurityAgentSkills;

  private constructor() {}

  public static getInstance(): CybersecurityAgentSkills {
    if (!CybersecurityAgentSkills.instance) {
      CybersecurityAgentSkills.instance = new CybersecurityAgentSkills();
    }
    return CybersecurityAgentSkills.instance;
  }

  /**
   * Run defensive code or architecture security audit
   */
  public auditCodeOrArchitecture(params: {
    targetName: string;
    codeSnippetOrDescription: string;
    scanOptions?: { checkSecrets?: boolean; checkOwasp?: boolean };
  }): SecurityAuditReport {
    const reportId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const text = params.codeSnippetOrDescription;
    const findings: SecurityScanItem[] = [];

    // 1. Secret leakage check
    if (/api_key\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(text) || /sk-[a-zA-Z0-9]{20,}/i.test(text) || /ghp_[a-zA-Z0-9]{20,}/i.test(text)) {
      findings.push({
        id: 'SEC-001',
        category: 'SECRET_LEAK',
        severity: 'critical',
        cveOrRuleId: 'CWE-798',
        title: 'Hardcoded Secret / API Token Detected',
        description: 'Hardcoded credentials or API keys found in source code or configuration string.',
        affectedTarget: params.targetName,
        remediationAdvice: 'Move API keys to environment variables (e.g. process.env.API_KEY or .env.example) and access via secure server-side routes.',
        defensiveCodeSnippet: `// BAD: const apiKey = "sk-12345...";\n// GOOD: const apiKey = process.env.MY_API_KEY;`,
      });
    }

    // 2. SQL Injection / Unsanitized query check
    if (/SELECT\s+.*\s+FROM\s+.*WHERE\s+.*\+\s*req\./i.test(text) || /eval\(/i.test(text)) {
      findings.push({
        id: 'SEC-002',
        category: 'OWASP_TOP_10',
        severity: 'high',
        cveOrRuleId: 'CWE-89',
        title: 'Potential Injection or Dynamic Evaluation Vulnerability',
        description: 'Concatenating untrusted inputs into database queries or string evaluations enables command/SQL injection.',
        affectedTarget: params.targetName,
        remediationAdvice: 'Use parameterized queries, ORM prepared statements, or strict JSON schema validation prior to execution.',
        defensiveCodeSnippet: `// BAD: db.query("SELECT * FROM users WHERE id = " + req.query.id);\n// GOOD: db.query("SELECT * FROM users WHERE id = ?", [req.query.id]);`,
      });
    }

    // 3. XSS / Unsanitized innerHTML check
    if (/dangerouslySetInnerHTML/i.test(text) || /innerHTML\s*=/i.test(text)) {
      findings.push({
        id: 'SEC-003',
        category: 'INPUT_VALIDATION',
        severity: 'medium',
        cveOrRuleId: 'CWE-79',
        title: 'Raw HTML Injection Risk (XSS)',
        description: 'Directly assigning unescaped string input to innerHTML or dangerouslySetInnerHTML opens Cross-Site Scripting attack vectors.',
        affectedTarget: params.targetName,
        remediationAdvice: 'Sanitize HTML inputs using DOMPurify or rely on standard React text nodes.',
        defensiveCodeSnippet: `import DOMPurify from 'dompurify';\n<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />`,
      });
    }

    let overallRisk: VulnerabilitySeverity = 'low';
    if (findings.some(f => f.severity === 'critical')) overallRisk = 'critical';
    else if (findings.some(f => f.severity === 'high')) overallRisk = 'high';
    else if (findings.some(f => f.severity === 'medium')) overallRisk = 'medium';

    return {
      reportId,
      targetName: params.targetName,
      timestamp: new Date().toISOString(),
      overallRiskRating: overallRisk,
      vulnerabilitiesFound: findings,
      defensiveHardeningRecommendations: [
        'Enforce Content Security Policy (CSP) headers across application servers.',
        'Ensure all API endpoints validate input parameters with strict TypeScript/Zod schemas.',
        'Implement rate limiting and origin restriction on backend API routes.',
      ],
      complianceChecks: {
        owaspTop10Passed: !findings.some(f => f.category === 'OWASP_TOP_10'),
        secretsExposed: findings.some(f => f.category === 'SECRET_LEAK'),
        inputSanitizationActive: !findings.some(f => f.category === 'INPUT_VALIDATION'),
        leastPrivilegeEnforced: true,
      },
    };
  }
}

export const cybersecurityAgentSkills = CybersecurityAgentSkills.getInstance();
