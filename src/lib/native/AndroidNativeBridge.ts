/**
 * Android Native Bridge Service
 * Interfaces with WebView's postMessage or window-bound bridge methods for Android app control.
 */

export interface InstalledAppNativeInfo {
  packageName: string;
  appName: string;
  label?: string;
  icon?: string;
  isSystemApp?: boolean;
}

export interface NativeLaunchResult {
  success: boolean;
  message?: string;
  error?: string;
  packageName?: string;
}

declare global {
  interface Window {
    AndroidNativeBridge?: {
      postMessage?: (message: string) => void;
      launchApp?: (packageName: string) => string | boolean;
      getInstalledApps?: () => string;
      checkAppInstalled?: (packageName: string) => boolean | string;
    };
    webkit?: {
      messageHandlers?: {
        androidBridge?: {
          postMessage: (data: any) => void;
        };
      };
    };
  }
}

export class AndroidNativeBridge {
  private static instance: AndroidNativeBridge;

  private constructor() {
    this.initPostMessageListener();
  }

  public static getInstance(): AndroidNativeBridge {
    if (!AndroidNativeBridge.instance) {
      AndroidNativeBridge.instance = new AndroidNativeBridge();
    }
    return AndroidNativeBridge.instance;
  }

  /**
   * Listen for response messages dispatched from Android WebView / iframe via window.postMessage
   */
  private initPostMessageListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'NATIVE_BRIDGE_RESPONSE') {
          console.log('[AndroidNativeBridge] Received postMessage bridge response:', data);
        }
      } catch {
        // Non-JSON message, ignore safely
      }
    });
  }

  /**
   * Dispatch a cross-platform postMessage command to native WebView host or outer wrapper
   */
  private postToNativeBridge(payload: Record<string, any>): void {
    if (typeof window === 'undefined') return;

    const jsonString = JSON.stringify(payload);

    // 1. Direct window.AndroidNativeBridge.postMessage
    const win = window as any;
    if (win.AndroidNativeBridge && typeof win.AndroidNativeBridge.postMessage === 'function') {
      win.AndroidNativeBridge.postMessage(jsonString);
    }

    // 2. iOS/WebKit messageHandler fallback
    if (win.webkit?.messageHandlers?.androidBridge?.postMessage) {
      win.webkit.messageHandlers.androidBridge.postMessage(payload);
    }

    // 3. Standard window.postMessage for cross-platform container/iframe connectivity
    window.postMessage(
      {
        type: 'NATIVE_BRIDGE_REQUEST',
        source: 'ANDROID_NATIVE_BRIDGE',
        ...payload,
      },
      '*'
    );
  }

  /**
   * Launch an application by its package name
   */
  public async launchApp(packageName: string): Promise<NativeLaunchResult> {
    if (!packageName || typeof packageName !== 'string') {
      return {
        success: false,
        error: 'Invalid package name provided',
      };
    }

    const cleanPackage = packageName.trim();
    console.log(`[AndroidNativeBridge] Requesting app launch for package: "${cleanPackage}"`);

    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'Window environment unavailable',
      };
    }

    try {
      const win = window as any;

      // 1. Check window.AndroidAppLauncher direct method
      if (win.AndroidAppLauncher) {
        if (typeof win.AndroidAppLauncher.launchAppByPackage === 'function') {
          const res = win.AndroidAppLauncher.launchAppByPackage(cleanPackage);
          if (typeof res === 'boolean' && res) {
            return { success: true, packageName: cleanPackage, message: `Launched ${cleanPackage}` };
          }
          if (typeof res === 'string') {
            try {
              const parsed = JSON.parse(res);
              if (parsed.success || parsed.status === 'SUCCESS' || parsed.launched) {
                return { success: true, packageName: cleanPackage, message: parsed.message || `Launched ${cleanPackage}` };
              }
            } catch {
              return { success: true, packageName: cleanPackage, message: `Launched ${cleanPackage}` };
            }
          }
        }
      }

      // 2. Check window.AndroidControl direct method
      if (win.AndroidControl) {
        if (typeof win.AndroidControl.launchPackage === 'function') {
          const res = win.AndroidControl.launchPackage(cleanPackage);
          if (res) {
            return { success: true, packageName: cleanPackage, message: `Launched ${cleanPackage}` };
          }
        }
        if (typeof win.AndroidControl.launchApp === 'function') {
          const res = win.AndroidControl.launchApp(cleanPackage);
          if (res) {
            return { success: true, packageName: cleanPackage, message: `Launched ${cleanPackage}` };
          }
        }
      }

      // 3. Check window.AndroidNativeBridge direct launch function
      if (win.AndroidNativeBridge && typeof win.AndroidNativeBridge.launchApp === 'function') {
        const res = win.AndroidNativeBridge.launchApp(cleanPackage);
        if (res) {
          return { success: true, packageName: cleanPackage, message: `Launched ${cleanPackage}` };
        }
      }

      // 4. Dispatch postMessage for cross-platform bridge connectivity
      this.postToNativeBridge({
        action: 'LAUNCH_APP',
        packageName: cleanPackage,
        timestamp: Date.now(),
      });

      // 5. Fallback via Android Intent URL for Android browser environments
      const isAndroid = /android/i.test(navigator.userAgent || '');
      if (isAndroid) {
        const intentUrl = `intent://#Intent;package=${encodeURIComponent(cleanPackage)};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
        window.location.href = intentUrl;
        return {
          success: true,
          packageName: cleanPackage,
          message: `Attempted intent launch for ${cleanPackage}`,
        };
      }

      return {
        success: true,
        packageName: cleanPackage,
        message: `Dispatched native launch request for ${cleanPackage}`,
      };
    } catch (err: any) {
      console.error('[AndroidNativeBridge] Launch failed:', err);
      return {
        success: false,
        packageName: cleanPackage,
        error: err?.message || 'Failed to execute native app launch',
      };
    }
  }

  /**
   * Retrieve list of installed applications from native bridge
   */
  public async getInstalledApps(): Promise<InstalledAppNativeInfo[]> {
    if (typeof window === 'undefined') return [];

    try {
      const win = window as any;
      let rawJson: string | null = null;

      if (win.AndroidAppLauncher) {
        if (typeof win.AndroidAppLauncher.getInstalledAppsJson === 'function') {
          rawJson = win.AndroidAppLauncher.getInstalledAppsJson();
        } else if (typeof win.AndroidAppLauncher.getInstalledApps === 'function') {
          rawJson = win.AndroidAppLauncher.getInstalledApps();
        }
      } else if (win.AndroidControl && typeof win.AndroidControl.getInstalledApps === 'function') {
        rawJson = win.AndroidControl.getInstalledApps();
      } else if (win.AndroidNativeBridge && typeof win.AndroidNativeBridge.getInstalledApps === 'function') {
        rawJson = win.AndroidNativeBridge.getInstalledApps();
      }

      if (rawJson && typeof rawJson === 'string') {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            packageName: item.packageName || item.package || '',
            appName: item.appName || item.label || item.name || '',
            label: item.label || item.appName || item.name || '',
            icon: item.icon || '',
            isSystemApp: Boolean(item.isSystemApp),
          }));
        }
      }

      // Dispatch window.postMessage request for cross-platform query fallback
      this.postToNativeBridge({
        action: 'GET_INSTALLED_APPS',
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[AndroidNativeBridge] getInstalledApps error:', err);
    }

    return [];
  }

  /**
   * Check if a specific package is installed on the device
   */
  public async checkAppInstalled(packageName: string): Promise<boolean> {
    if (!packageName || typeof window === 'undefined') return false;
    const cleanPackage = packageName.trim();

    try {
      const win = window as any;
      if (win.AndroidAppLauncher) {
        if (typeof win.AndroidAppLauncher.isAppInstalled === 'function') {
          return Boolean(win.AndroidAppLauncher.isAppInstalled(cleanPackage));
        }
        if (typeof win.AndroidAppLauncher.checkAppInstalled === 'function') {
          return Boolean(win.AndroidAppLauncher.checkAppInstalled(cleanPackage));
        }
      }
      if (win.AndroidNativeBridge && typeof win.AndroidNativeBridge.checkAppInstalled === 'function') {
        return Boolean(win.AndroidNativeBridge.checkAppInstalled(cleanPackage));
      }

      const apps = await this.getInstalledApps();
      if (apps.length > 0) {
        return apps.some((app) => app.packageName.toLowerCase() === cleanPackage.toLowerCase());
      }

      // Dispatch postMessage query for package check
      this.postToNativeBridge({
        action: 'CHECK_APP_INSTALLED',
        packageName: cleanPackage,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[AndroidNativeBridge] checkAppInstalled error:', err);
    }

    return true; // Default to true if bridge cannot query to prevent false negatives
  }
}

export const androidNativeBridge = AndroidNativeBridge.getInstance();
