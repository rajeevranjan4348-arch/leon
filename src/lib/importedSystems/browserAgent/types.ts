export type BrowserActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'extract_text'
  | 'extract_links'
  | 'take_screenshot'
  | 'wait'
  | 'evaluate_js';

export interface BrowserElementInfo {
  selector: string;
  tagName: string;
  text?: string;
  href?: string;
  isClickable: boolean;
  isVisible: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface BrowserActionStep {
  stepNumber: number;
  action: BrowserActionType;
  targetSelector?: string;
  inputValue?: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: any;
  error?: string;
  durationMs?: number;
}

export interface BrowserTaskResult {
  taskId: string;
  initialUrl: string;
  targetGoal: string;
  steps: BrowserActionStep[];
  extractedData?: any;
  finalPageTitle?: string;
  finalUrl?: string;
  totalDurationMs: number;
  status: 'completed' | 'partially_completed' | 'failed';
  errorPolicyApplied?: string;
}
