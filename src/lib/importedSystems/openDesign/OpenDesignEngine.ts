import {
  DesignTokens,
  UIComponentPlan,
  DesignToCodePlan,
  DesignAuditResult,
} from './types';

/**
 * OpenDesignEngine
 * Design-to-code planning, component hierarchy reasoning, design token extraction,
 * and automated accessibility/anti-slop audit validation.
 */
export class OpenDesignEngine {
  private static instance: OpenDesignEngine;

  private constructor() {}

  public static getInstance(): OpenDesignEngine {
    if (!OpenDesignEngine.instance) {
      OpenDesignEngine.instance = new OpenDesignEngine();
    }
    return OpenDesignEngine.instance;
  }

  /**
   * Generates a structured Design-to-Code architecture plan from a prompt description.
   */
  public planLayout(description: string, targetType: 'single-screen' | 'dashboard' | 'split-view' = 'single-screen'): DesignToCodePlan {
    const planId = `plan-${Date.now()}`;
    const descLower = description.toLowerCase();

    const isDark = descLower.includes('dark mode') || descLower.includes('dark theme');

    const tokens: DesignTokens = {
      colors: {
        background: isDark ? '#0f172a' : '#f8fafc',
        surface: isDark ? '#1e293b' : '#ffffff',
        textPrimary: isDark ? '#f1f5f9' : '#0f172a',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        accent: '#3b82f6',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        bodySize: '16px',
        lineHeight: '1.6',
        headingScale: '1.25',
      },
      spacing: {
        containerPadding: '24px',
        cardPadding: '16px',
        itemGap: '12px',
      },
      borderRadius: {
        container: '16px',
        card: '12px',
        button: '8px',
      },
    };

    const rootComponents: UIComponentPlan[] = [
      {
        id: 'comp-header',
        name: 'HeaderBar',
        purpose: 'Displays app title, status indicator, and primary action controls',
        props: { title: 'string', status: 'string' },
        stateVariables: [],
        stylingClasses: ['flex', 'items-center', 'justify-between', 'py-4', 'border-b', 'border-slate-200'],
        accessibilityRequirements: ['Semantic <header> tag', 'Accessible icon button labels'],
      },
      {
        id: 'comp-main-stage',
        name: 'MainContentStage',
        purpose: 'Primary workspace container rendering cards, lists, or interactive canvases',
        props: { data: 'any[]', onAction: 'function' },
        stateVariables: ['activeItem', 'isLoading'],
        stylingClasses: ['grid', 'gap-4', 'w-full', 'max-w-5xl', 'mx-auto', 'p-4'],
        accessibilityRequirements: ['ARIA live regions for loading states', 'Keyboard navigability'],
      },
    ];

    return {
      planId,
      targetLayout: targetType,
      theme: isDark ? 'dark' : 'light',
      tokens,
      rootComponents,
      implementationSteps: [
        { step: 1, title: 'Tokens & Theme', action: 'Initialize color variables, typography scales and container bounds', targetComponent: 'RootLayout' },
        { step: 2, title: 'Header & Frame', action: 'Build responsive header bar with status feedback', targetComponent: 'HeaderBar' },
        { step: 3, title: 'Core Workspace', action: 'Implement main interactive controls, state hooks and error boundary', targetComponent: 'MainContentStage' },
        { step: 4, title: 'Audit & Refinement', action: 'Run anti-slop verification and contrast checks', targetComponent: 'AuditEngine' },
      ],
      antiSlopValidationChecks: [
        'No purple-to-blue generic gradient backgrounds',
        'Mathematical padding nesting: outer container padding >= inner child gap',
        'Inner radius = outer radius - padding constraint satisfied',
        'Labels inside pills/buttons must not break into multiple lines',
        'Minimum body text size >= 16px with line-height >= 1.5',
      ],
    };
  }

  /**
   * Audits component code or JSX/CSS styles against accessibility and anti-slop guidelines.
   */
  public auditDesign(codeOrCss: string): DesignAuditResult {
    const issues: DesignAuditResult['issues'] = [];
    let score = 100;

    // 1. Check for AI Slop Gradients
    if (/bg-gradient-to-r\s+from-purple/i.test(codeOrCss) || /from-indigo-500\s+to-pink-500/i.test(codeOrCss)) {
      issues.push({
        severity: 'warning',
        component: 'Styling',
        message: 'Detected generic purple/pink AI slop gradient.',
        suggestedFix: 'Replace with a clean, high-contrast neutral surface palette or deliberate accent tone.',
      });
      score -= 15;
    }

    // 2. Check for missing button accessibility
    if (/<button(?![^>]*aria-label)[^>]*>\s*<svg/i.test(codeOrCss)) {
      issues.push({
        severity: 'error',
        component: 'Button',
        message: 'Icon button is missing an aria-label attribute.',
        suggestedFix: 'Add aria-label="Descriptive action title" to the button element.',
      });
      score -= 20;
    }

    // 3. Check for low contrast gray on colored background
    if (/text-gray-400\s+bg-blue/i.test(codeOrCss) || /text-slate-400\s+bg-indigo/i.test(codeOrCss)) {
      issues.push({
        severity: 'error',
        component: 'Typography',
        message: 'Low-contrast gray text on a saturated background violates WCAG AA standards.',
        suggestedFix: 'Use high-contrast white text (text-white) or a darkened text shade on light backgrounds.',
      });
      score -= 25;
    }

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      score: Math.max(0, score),
      wcagContrastValid: !issues.some(i => i.component === 'Typography' && i.severity === 'error'),
      issues,
      suggestions: [
        'Ensure outer container padding is strictly >= inner child padding.',
        'Use transform and opacity for 144Hz-friendly fluid animations.',
        'Keep touch targets >= 44px on mobile devices.',
      ],
    };
  }
}

export const openDesignEngine = OpenDesignEngine.getInstance();
