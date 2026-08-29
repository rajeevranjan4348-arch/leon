/**
 * Centralized App Controller Service
 * Dispatches UI and application state actions securely without arbitrary code execution.
 */

import { parseCommunicationIntent } from '@/lib/communicationAgent/intentParser';
import { appResolver } from '@/lib/launcher/AppResolver';
import { universalAppLauncher, UniversalAppLauncherResult } from '@/lib/launcher/UniversalAppLauncher';
import { toast } from 'sonner';

export type AppControllerAction =
  | "switch_tab"
  | "open_panel"
  | "close_panel"
  | "toggle_panel"
  | "open_settings"
  | "open_history"
  | "start_new_chat"
  | "select_chat"
  | "rename_chat"
  | "delete_chat"
  | "pin_chat"
  | "unpin_chat"
  | "scroll_chat"
  | "focus_input"
  | "clear_input"
  | "toggle_sidebar"
  | "toggle_voice"
  | "stop_voice"
  | "open_app"
  | "OPEN_APP";

export interface AppControllerArgs {
  action: AppControllerAction;
  target?: string;
  value?: string | number | boolean;
  chatId?: string;
  tab?: string;
  appName?: string;
  packageName?: string;
  query?: string;
}

export interface ToolResult {
  success: boolean;
  action: string;
  target?: string;
  value?: any;
  chatId?: string;
  tab?: string;
  message?: string;
  error?: string;
  reason?: string;
  packageName?: string;
  installed?: boolean;
  playStoreUrl?: string;
  marketUri?: string;
  ambiguousMatches?: any[];
}

export const ALLOWED_ACTIONS: ReadonlySet<AppControllerAction> = new Set<AppControllerAction>([
  "switch_tab",
  "open_panel",
  "close_panel",
  "toggle_panel",
  "open_settings",
  "open_history",
  "start_new_chat",
  "select_chat",
  "rename_chat",
  "delete_chat",
  "pin_chat",
  "unpin_chat",
  "scroll_chat",
  "focus_input",
  "clear_input",
  "toggle_sidebar",
  "toggle_voice",
  "stop_voice",
  "open_app",
  "OPEN_APP",
]);

export type ActionHandler = (args: AppControllerArgs) => Promise<ToolResult> | ToolResult;

class AppController {
  private static instance: AppController;
  private handlers: Map<AppControllerAction, ActionHandler> = new Map();

  // Command Execution Lock & Debounce Timer
  private lastLaunchedTarget: string = '';
  private lastLaunchTimestamp: number = 0;
  private static DEBOUNCE_MS = 1500;

  private constructor() {
    this.registerDefaultHandlers();
  }

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  /**
   * Extracts clean application name from raw input or natural language queries
   */
  public extractAppName(input: string): string {
    if (!input) return '';
    let raw = input.trim();

    // 1. Try parsing communication intent for command formats like "open whatsapp", "launch spotify"
    const parsed = parseCommunicationIntent(raw.startsWith('open') || raw.startsWith('launch') ? raw : `open ${raw}`);
    if (parsed.targetName && parsed.targetName.trim()) {
      raw = parsed.targetName.trim();
    }

    // 2. Delegate to AppResolver's normalization & prefix extraction
    return appResolver.extractAppName(raw) || raw;
  }

  /**
   * Central open_app tool that consumes UniversalAppLauncher and AppResolver.
   * Extracts the app name from input, performs direct launch with FLAG_ACTIVITY_NEW_TASK,
   * and provides structured fallback if missing.
   */
  public async open_app(appName: string): Promise<ToolResult> {
    const rawInput = (appName || '').trim();
    if (!rawInput) {
      return {
        success: false,
        action: 'open_app',
        installed: false,
        reason: 'APP_NOT_INSTALLED',
        error: 'No target application name provided',
        message: 'Please specify an app name to open.',
      };
    }

    // 1. Extract app name from input
    const extractedAppName = this.extractAppName(rawInput);
    console.log(`[AppController] open_app called for: "${rawInput}" (Extracted: "${extractedAppName}")`);

    // 2. Command Execution Lock & Debounce Check
    const now = Date.now();
    const lockKey = extractedAppName.toLowerCase();
    if (this.lastLaunchedTarget === lockKey && (now - this.lastLaunchTimestamp < AppController.DEBOUNCE_MS)) {
      console.log(`[AppController] Command execution lock active. Debouncing duplicate launch for "${extractedAppName}"`);
      return {
        success: true,
        action: 'open_app',
        target: extractedAppName,
        installed: true,
        reason: 'SUCCESS',
        message: `Opening ${extractedAppName}...`,
      };
    }

    this.lastLaunchedTarget = lockKey;
    this.lastLaunchTimestamp = now;

    // 3. Delegate to UniversalAppLauncher central orchestrator
    const result: UniversalAppLauncherResult = universalAppLauncher.launchApp(extractedAppName);

    // 4. Handle Ambiguous Matches
    if (result.isAmbiguous && result.ambiguousMatches && result.ambiguousMatches.length > 0) {
      return {
        success: false,
        action: 'open_app',
        target: extractedAppName,
        installed: true,
        reason: 'AMBIGUOUS_APP',
        ambiguousMatches: result.ambiguousMatches.map(a => ({
          name: a.name,
          packageName: a.packageName,
        })),
        message: result.message,
      };
    }

    // 5. Fallback for Missing / Not Installed App
    if (!result.success && result.reason === 'APP_NOT_INSTALLED') {
      if (result.playStoreUrl) {
        toast.error(`"${result.app || extractedAppName}" is not installed on this device.`, {
          description: 'Would you like to search for it on the Google Play Store?',
          action: {
            label: 'Open Play Store',
            onClick: () => {
              if (result.playStoreUrl) {
                universalAppLauncher.openPlayStore(result.app || extractedAppName);
              }
            },
          },
          duration: 8000,
        });
      }

      return {
        success: false,
        action: 'open_app',
        target: result.app || extractedAppName,
        installed: false,
        reason: 'APP_NOT_INSTALLED',
        playStoreUrl: result.playStoreUrl,
        marketUri: result.marketUri,
        message: result.message || `"${result.app || extractedAppName}" isn't installed on this device.`,
        error: `APP_NOT_INSTALLED: "${result.app || extractedAppName}" is not installed on this device.`,
      };
    }

    // 6. Successful Launch
    toast.success(`Opening ${result.app || extractedAppName}...`);

    return {
      success: result.success,
      action: 'open_app',
      target: result.app || extractedAppName,
      packageName: result.package || result.packageName,
      installed: true,
      reason: result.reason || 'SUCCESS',
      message: result.message || `Opened ${result.app || extractedAppName}`,
      error: result.success ? undefined : result.reason,
    };
  }

  /**
   * Alias for open_app
   */
  public async openApp(appName: string): Promise<ToolResult> {
    return this.open_app(appName);
  }

  /**
   * Register default handlers including OPEN_APP coordinator
   */
  private registerDefaultHandlers(): void {
    const handleOpenApp: ActionHandler = async (args) => {
      const targetQuery = (args.appName || args.target || args.query || args.value || '').toString().trim();
      return this.open_app(targetQuery);
    };

    this.handlers.set('open_app', handleOpenApp);
    this.handlers.set('OPEN_APP', handleOpenApp);
  }

  /**
   * Register an action handler for a specific supported app action.
   */
  public registerHandler(action: AppControllerAction, handler: ActionHandler): void {
    if (!ALLOWED_ACTIONS.has(action)) {
      console.warn(`[AppController] Attempted to register unsupported action: ${action}`);
      return;
    }
    this.handlers.set(action, handler);
  }

  /**
   * Unregister a handler.
   */
  public unregisterHandler(action: AppControllerAction): void {
    this.handlers.delete(action);
  }

  /**
   * Execute an AppControllerAction securely.
   */
  public async execute(args: AppControllerArgs): Promise<ToolResult> {
    try {
      if (!args || typeof args !== 'object') {
        return {
          success: false,
          action: args?.action || 'unknown',
          error: 'Invalid tool arguments provided',
        };
      }

      const { action } = args;

      // 1. Safety Boundary & Allowlist Validation
      if (!action || !ALLOWED_ACTIONS.has(action)) {
        return {
          success: false,
          action: action || 'unknown',
          error: `Unsupported app controller action: ${action}`,
        };
      }

      // 2. Dispatch to registered handler if present
      const handler = this.handlers.get(action);
      if (handler) {
        const result = await handler(args);
        return result;
      }

      // 3. Fallback to custom window event for decoupled listeners
      if (typeof window !== 'undefined') {
        let resolvedResult: ToolResult | null = null;
        const customEvent = new CustomEvent('APP_CONTROLLER_ACTION', {
          detail: {
            args,
            respond: (res: ToolResult) => {
              resolvedResult = res;
            },
          },
        });
        window.dispatchEvent(customEvent);

        if (resolvedResult) {
          return resolvedResult;
        }
      }

      // Default response if no handler explicitly returned
      return {
        success: true,
        action,
        target: args.target || args.tab,
        value: args.value,
        chatId: args.chatId,
        tab: args.tab,
        message: `Executed ${action} successfully.`,
      };
    } catch (err: any) {
      console.error('[AppController] Execution error:', err);
      return {
        success: false,
        action: args?.action || 'unknown',
        error: err?.message || 'Failed to execute app controller action',
      };
    }
  }
}

export const appController = AppController.getInstance();
