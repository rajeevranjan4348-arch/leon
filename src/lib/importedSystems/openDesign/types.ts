/**
 * OpenDesign Design-to-Code & UI Reasoning Engine
 * Reference: https://github.com/nexu-io/open-design (Apache-2.0)
 * 
 * Defines schemas for design token extraction, component hierarchy planning,
 * layout reasoning, responsive validation, and iterative visual correction.
 */

export interface DesignTokens {
  colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    textPrimary?: string;
    textSecondary?: string;
    border?: string;
    accent?: string;
  };
  typography: {
    fontFamily?: string;
    headingScale?: string;
    bodySize?: string;
    lineHeight?: string;
  };
  spacing: {
    containerPadding?: string;
    cardPadding?: string;
    itemGap?: string;
  };
  borderRadius: {
    container?: string;
    card?: string;
    button?: string;
  };
}

export interface UIComponentPlan {
  id: string;
  name: string;
  purpose: string;
  parentComponentId?: string;
  props: Record<string, string>;
  stateVariables: string[];
  stylingClasses: string[];
  accessibilityRequirements: string[];
  children?: UIComponentPlan[];
}

export interface DesignToCodePlan {
  planId: string;
  targetLayout: 'single-screen' | 'dashboard' | 'split-view' | 'feed' | 'modal';
  theme: 'light' | 'dark' | 'adaptive';
  tokens: DesignTokens;
  rootComponents: UIComponentPlan[];
  implementationSteps: Array<{
    step: number;
    title: string;
    action: string;
    targetComponent: string;
  }>;
  antiSlopValidationChecks: string[];
}

export interface DesignAuditResult {
  passed: boolean;
  score: number; // 0-100
  wcagContrastValid: boolean;
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    component: string;
    message: string;
    suggestedFix: string;
  }>;
  suggestions: string[];
}
