/**
 * Universal Android App Launcher Engine
 * 
 * Central orchestrator for launching Android applications.
 * Consumes the AppResolver to resolve requested targets, performs direct
 * startActivity calls with FLAG_ACTIVITY_NEW_TASK, and returns a structured
 * 'APP_NOT_INSTALLED' fallback response if the package is missing.
 */

import { appResolver, AppResolver, InstalledApp, LaunchIntentInfo } from './AppResolver';
import { androidNativeBridge } from '../native/AndroidNativeBridge';

export type AppLaunchReason =
  | 'SUCCESS'
  | 'APP_NOT_INSTALLED'
  | 'AMBIGUOUS_APP'
  | 'LAUNCH_FAILED'
  | 'NO_LAUNCH_INTENT'
  | 'ACTIVITY_NOT_FOUND'
  | 'PERMISSION_ERROR';

export interface UniversalAppLauncherResult {
  success: boolean;
  action: 'open_app';
  app: string;
  appName?: string;
  package?: string;
  packageName?: string;
  installed?: boolean;
  reason?: AppLaunchReason;
  message: string;
  isAmbiguous?: boolean;
  candidateMatches?: InstalledApp[];
  ambiguousMatches?: InstalledApp[];
  playStoreUrl?: string;
  marketUri?: string;
  launchType?: 'native_intent' | 'system_action' | 'deep_scheme' | 'web_fallback' | 'play_store';
}

// Backward compatibility type aliases
export type AppLaunchResult = UniversalAppLauncherResult;
export type InstalledAppInfo = InstalledApp;
export type { InstalledApp, LaunchIntentInfo };

declare global {
  interface Window {
    AndroidAppLauncher?: {
      getInstalledAppsJson?: () => string;
      searchInstalledAppsJson?: (query: string) => string;
      launchAppByPackage?: (packageName: string) => string | boolean;
      launchAppByName?: (appName: string) => string | boolean;
      openPlayStore?: (packageName: string) => boolean;
      refreshInstalledApps?: () => boolean;
      isAppInstalled?: (packageName: string) => boolean;
      checkAppInstalled?: (packageName: string) => boolean;
    };
    AndroidControl?: {
      isAccessibilityServiceEnabled?: () => boolean;
      openAccessibilitySettings?: () => void;
      launchPackage?: (packageName: string) => boolean;
      launchApp?: (packageName: string) => boolean;
      performMessagingAction?: (actionJson: string) => string;
      cancelAction?: () => boolean;
      getInstalledApps?: () => string;
    };
    AndroidNativeBridge?: {
      postMessage?: (message: string) => void;
      launchApp?: (packageName: string) => string | boolean;
      getInstalledApps?: () => string;
      checkAppInstalled?: (packageName: string) => boolean | string;
    };
  }
}

export class UniversalAppLauncher {
  private static instance: UniversalAppLauncher;
  private resolver: AppResolver;

  // Command Execution Lock / Debounce tracking
  private lastLaunchedPackage: string = '';
  private lastLaunchTimestamp: number = 0;
  private lastLaunchResult: UniversalAppLauncherResult | null = null;
  private static DEBOUNCE_MS = 1500;

  private constructor() {
    this.resolver = appResolver;
  }

  public static getInstance(): UniversalAppLauncher {
    if (!UniversalAppLauncher.instance) {
      UniversalAppLauncher.instance = new UniversalAppLauncher();
    }
    return UniversalAppLauncher.instance;
  }

  /**
   * Delegates app resolution to AppResolver
   */
  public resolveApp(appNameQuery: string) {
    return this.resolver.resolveApp(appNameQuery);
  }

  /**
   * Normalizes app name string
   */
  public normalizeAppName(raw: string): string {
    return this.resolver.normalizeAppName(raw);
  }

  /**
   * Extracts clean app name from input text
   */
  public extractAppName(input: string): string {
    return this.resolver.extractAppName(input);
  }

  /**
   * Invalidate cached application list
   */
  public invalidateCache(): void {
    this.resolver.invalidateCache();
  }

  /**
   * Refresh installed apps
   */
  public refreshInstalledApps(force = false): void {
    this.resolver.discoverNativeInstalledApps();
  }

  /**
   * Fetch all launchable installed applications
   */
  public async getInstalledLaunchableApps(): Promise<InstalledApp[]> {
    return this.resolver.getLaunchableApps();
  }

  /**
   * Search registered apps
   */
  public searchApps(query: string): InstalledApp[] {
    const raw = (query || '').trim();
    if (!raw) return [];
    const res = this.resolver.resolveApp(raw);
    if (res.matchedApp) return [res.matchedApp];
    if (res.ambiguousMatches.length > 0) return res.ambiguousMatches;
    return [];
  }

  /**
   * Registers a custom app record
   */
  public registerApp(app: InstalledApp): void {
    this.resolver.registerApp(app);
  }

  /**
   * Native Package Launch via Android PackageManager / WebView Bridge.
   * Securely configures Intent with FLAG_ACTIVITY_NEW_TASK (0x10000000).
   */
  public launchPackage(packageName: string): { success: boolean; reason: AppLaunchReason; message: string } {
    if (!packageName || !packageName.trim()) {
      return {
        success: false,
        reason: 'NO_LAUNCH_INTENT',
        message: 'Package name cannot be empty.',
      };
    }
    const cleanPkg = packageName.trim();

    if (typeof window === 'undefined') {
      return {
        success: false,
        reason: 'LAUNCH_FAILED',
        message: 'Window context is unavailable for launching packages.',
      };
    }

    try {
      const win = window as any;

      // 1. Direct window.AndroidAppLauncher native bridge
      if (win.AndroidAppLauncher) {
        if (typeof win.AndroidAppLauncher.launchAppByPackage === 'function') {
          try {
            const res = win.AndroidAppLauncher.launchAppByPackage(cleanPkg);
            if (typeof res === 'boolean' && res) {
              return { success: true, reason: 'SUCCESS', message: `Launched ${cleanPkg} successfully.` };
            }
          } catch {}
        }
        if (typeof win.AndroidAppLauncher.launchApp === 'function') {
          try {
            win.AndroidAppLauncher.launchApp(cleanPkg);
            return { success: true, reason: 'SUCCESS', message: `Launched ${cleanPkg} successfully.` };
          } catch {}
        }
      }

      // 2. Direct window.AndroidControl launcher bridge
      if (win.AndroidControl) {
        if (typeof win.AndroidControl.launchPackage === 'function') {
          try {
            const launched = win.AndroidControl.launchPackage(cleanPkg);
            if (launched) {
              return { success: true, reason: 'SUCCESS', message: `Launched ${cleanPkg} via AndroidControl.` };
            }
          } catch {}
        }
        if (typeof win.AndroidControl.launchApp === 'function') {
          try {
            const launched = win.AndroidControl.launchApp(cleanPkg);
            if (launched) {
              return { success: true, reason: 'SUCCESS', message: `Launched ${cleanPkg} via AndroidControl.` };
            }
          } catch {}
        }
      }

      // 3. AndroidNativeBridge service invocation
      try {
        const nativePromise = androidNativeBridge.launchApp(cleanPkg);
        if (nativePromise && typeof (nativePromise as any).then === 'function') {
          nativePromise.catch(err => {
            console.warn(`[UniversalAppLauncher] Native bridge note for ${cleanPkg}:`, err);
          });
        }
      } catch (bridgeErr) {
        console.warn(`[UniversalAppLauncher] Error invoking androidNativeBridge for ${cleanPkg}:`, bridgeErr);
      }

      // 4. Direct native intent dispatch with FLAG_ACTIVITY_NEW_TASK (0x10000000)
      const isAndroid = /android/i.test(navigator.userAgent || '');
      if (isAndroid) {
        const intentUri = `intent://#Intent;package=${encodeURIComponent(cleanPkg)};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;launchFlags=0x10000000;end`;

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = intentUri;
        document.body.appendChild(iframe);

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);

        setTimeout(() => {
          try {
            window.location.href = intentUri;
          } catch {}
        }, 80);

        return {
          success: true,
          reason: 'SUCCESS',
          message: `Dispatched native launch intent with FLAG_ACTIVITY_NEW_TASK for ${cleanPkg}.`,
        };
      }

      return {
        success: true,
        reason: 'SUCCESS',
        message: `Dispatched native launch for ${cleanPkg}.`,
      };
    } catch (err: any) {
      console.error(`[UniversalAppLauncher] Error launching package ${cleanPkg}:`, err);
      return {
        success: false,
        reason: 'LAUNCH_FAILED',
        message: err?.message || `Failed to launch package ${cleanPkg}.`,
      };
    }
  }

  /**
   * Alias method for openApp / launchApp
   */
  public openApp(appNameOrPackage: string): UniversalAppLauncherResult {
    return this.launchApp(appNameOrPackage);
  }

  /**
   * Main Central Orchestrator Entry Point:
   * Consumes AppResolver to resolve the app, performs direct startActivity
   * calls with FLAG_ACTIVITY_NEW_TASK, and implements structured 'APP_NOT_INSTALLED'
   * fallback response if the package is missing.
   */
  public launchApp(appNameOrPackage: string): UniversalAppLauncherResult {
    const raw = (appNameOrPackage || '').trim();
    if (!raw) {
      return {
        success: false,
        action: 'open_app',
        app: '',
        appName: '',
        installed: false,
        reason: 'APP_NOT_INSTALLED',
        message: 'Please specify an application name to open.',
      };
    }

    const extractedName = this.extractAppName(raw) || raw;

    // 1. Consume AppResolver to identify the target application
    const resolution = this.resolver.resolveApp(raw);
    console.log(`[UniversalAppLauncher] Query: "${raw}", Matched: "${resolution.matchedApp?.name || 'none'}" (${resolution.matchedApp?.packageName || 'no_pkg'}), Confidence: ${resolution.confidence}`);

    // 2. Handle Ambiguous Matches
    if (resolution.isAmbiguous && resolution.ambiguousMatches.length > 0) {
      const matchNames = resolution.ambiguousMatches.map(m => m.name).join(', ');
      return {
        success: false,
        action: 'open_app',
        app: extractedName,
        appName: extractedName,
        installed: true,
        reason: 'AMBIGUOUS_APP',
        isAmbiguous: true,
        candidateMatches: resolution.ambiguousMatches,
        ambiguousMatches: resolution.ambiguousMatches,
        message: `Which app do you mean? I found ${resolution.ambiguousMatches.length} matching apps: ${matchNames}.`,
      };
    }

    const app = resolution.matchedApp;

    // 3. App Missing / Not Installed Fallback: Return structured 'APP_NOT_INSTALLED'
    if (!app) {
      const playStoreUrl = `https://play.google.com/store/search?q=${encodeURIComponent(extractedName)}&c=apps`;
      const marketUri = `market://search?q=${encodeURIComponent(extractedName)}`;

      console.log(`[UniversalAppLauncher] Target "${raw}" is NOT installed on device.`);

      return {
        success: false,
        action: 'open_app',
        app: extractedName,
        appName: extractedName,
        installed: false,
        reason: 'APP_NOT_INSTALLED',
        launchType: 'play_store',
        playStoreUrl,
        marketUri,
        message: `"${extractedName}" isn't installed on this device.`,
      };
    }

    // 4. Command Execution Lock / Debounce (1.5 seconds)
    const now = Date.now();
    if (this.lastLaunchedPackage === app.packageName && (now - this.lastLaunchTimestamp < UniversalAppLauncher.DEBOUNCE_MS) && this.lastLaunchResult) {
      console.log(`[UniversalAppLauncher] Debouncing duplicate launch for ${app.packageName}`);
      return this.lastLaunchResult;
    }

    // 5. Special Handler for Source AI Workspace
    if (app.id === 'source_ai' || app.packageName === 'ai.source.workspace') {
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('open-source-ai', { detail: { action: 'activate' } }));
        }
      } catch {}
      const res: UniversalAppLauncherResult = {
        success: true,
        action: 'open_app',
        app: 'Source AI',
        appName: 'Source AI',
        package: app.packageName,
        packageName: app.packageName,
        installed: true,
        reason: 'SUCCESS',
        launchType: 'native_intent',
        message: 'Source AI workspace active and ready to follow instructions.',
      };
      this.lastLaunchedPackage = app.packageName;
      this.lastLaunchTimestamp = now;
      this.lastLaunchResult = res;
      return res;
    }

    // 6. Direct Android Intent / Package Launch with FLAG_ACTIVITY_NEW_TASK
    const launchResult = this.launchPackage(app.packageName);

    // Also trigger scheme or web fallback if in preview browser environment
    if (typeof window !== 'undefined') {
      const isAndroid = /android/i.test(navigator.userAgent || '');
      if (!isAndroid && app.fallbackUrl && app.fallbackUrl !== '#' && !app.fallbackUrl.includes('google.com/search')) {
        window.open(app.fallbackUrl, '_blank', 'noopener,noreferrer');
      } else if (!isAndroid && app.scheme && !app.scheme.startsWith('intent:')) {
        try {
          window.location.href = app.scheme;
        } catch {}
      }
    }

    const result: UniversalAppLauncherResult = {
      success: launchResult.success,
      action: 'open_app',
      app: app.name,
      appName: app.name,
      package: app.packageName,
      packageName: app.packageName,
      installed: true,
      reason: launchResult.reason,
      launchType: 'native_intent',
      message: launchResult.success
        ? `Opening ${app.name}...`
        : `Could not open ${app.name}: ${launchResult.message}`,
    };

    this.lastLaunchedPackage = app.packageName;
    this.lastLaunchTimestamp = now;
    this.lastLaunchResult = result;

    console.log(`[UniversalAppLauncher] Launched app "${app.name}" (${app.packageName}) -> status: ${result.reason}`);
    return result;
  }

  /**
   * Opens Google Play Store listing when explicitly requested for missing app
   */
  public openPlayStore(packageNameOrQuery: string): boolean {
    if (typeof window === 'undefined') return false;
    const isPkg = packageNameOrQuery.includes('.');
    const marketUri = isPkg ? `market://details?id=${packageNameOrQuery}` : `market://search?q=${encodeURIComponent(packageNameOrQuery)}`;
    const webUrl = isPkg ? `https://play.google.com/store/apps/details?id=${packageNameOrQuery}` : `https://play.google.com/store/search?q=${encodeURIComponent(packageNameOrQuery)}&c=apps`;

    const win = window as any;
    if (win.AndroidAppLauncher && typeof win.AndroidAppLauncher.openPlayStore === 'function') {
      try {
        return win.AndroidAppLauncher.openPlayStore(packageNameOrQuery);
      } catch {}
    }

    try {
      const isAndroid = /android/i.test(navigator.userAgent || '');
      if (isAndroid) {
        window.location.href = marketUri;
      } else {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
      return true;
    } catch {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
  }
}

export const universalAppLauncher = UniversalAppLauncher.getInstance();
