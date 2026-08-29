/**
 * AppLauncher Service - Entry point for application launcher
 * 
 * Utilizes PackageManager (for Android) or registry-based lookup (AppResolver)
 * to resolve installed application names and package names, implementing the
 * openApp(appName) interface to handle fuzzy matching and direct intent launching.
 */

import { universalAppLauncher, UniversalAppLauncherResult } from './launcher/UniversalAppLauncher';
import { appResolver, InstalledApp } from './launcher/AppResolver';

export interface PackageManager {
  getInstalledApps(): InstalledApp[];
  isAppInstalled(packageName: string): boolean;
  searchApps(query: string): InstalledApp[];
  resolveApp(appName: string): InstalledApp | null;
  fuzzyMatch(appName: string): InstalledApp | null;
  openApp(appName: string): Promise<UniversalAppLauncherResult>;
}

export interface AppLauncherService {
  openApp(appName: string): Promise<UniversalAppLauncherResult>;
  searchApps(query: string): InstalledApp[];
  getInstalledApps(): InstalledApp[];
  isAppInstalled(packageName: string): boolean;
}

export class AppLauncher implements AppLauncherService, PackageManager {
  private static instance: AppLauncher;

  public static getInstance(): AppLauncher {
    if (!AppLauncher.instance) {
      AppLauncher.instance = new AppLauncher();
    }
    return AppLauncher.instance;
  }

  /**
   * Primary entry point to resolve and open an app by name or package name.
   * Handles fuzzy matching and direct intent launching via native or fallback bridge.
   */
  public async openApp(appName: string): Promise<UniversalAppLauncherResult> {
    if (!appName || appName.trim().length === 0) {
      return {
        success: false,
        action: 'open_app',
        app: '',
        reason: 'LAUNCH_FAILED',
        message: 'Application name cannot be empty.',
      };
    }

    return universalAppLauncher.openApp(appName);
  }

  /**
   * Resolve an app by name or package name
   */
  public resolveApp(appName: string): InstalledApp | null {
    const res = appResolver.resolveApp(appName);
    return res ? res.matchedApp : null;
  }

  /**
   * Fuzzy match an installed app name
   */
  public fuzzyMatch(appName: string): InstalledApp | null {
    const matches = this.searchApps(appName);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Search installed apps using fuzzy matching
   */
  public searchApps(query: string): InstalledApp[] {
    return appResolver.searchApps(query);
  }

  /**
   * Get all registered or installed applications
   */
  public getInstalledApps(): InstalledApp[] {
    return appResolver.getAllApps();
  }

  /**
   * Check if a specific package is installed
   */
  public isAppInstalled(packageName: string): boolean {
    return appResolver.isInstalled(packageName);
  }
}

export const appLauncher = AppLauncher.getInstance();
export const packageManager: PackageManager = appLauncher;

export async function openApp(appName: string): Promise<UniversalAppLauncherResult> {
  return appLauncher.openApp(appName);
}

export default appLauncher;
