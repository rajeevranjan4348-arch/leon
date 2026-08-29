import { NativeBridgeStatus, TargetMessagingApp } from './types';
import { adapterRegistry } from './adapters/AdapterRegistry';

declare global {
  interface Window {
    AndroidControl?: {
      isAccessibilityServiceEnabled?: () => boolean;
      openAccessibilitySettings?: () => void;
      launchPackage?: (packageName: string) => boolean;
      launchApp?: (packageName: string) => boolean;
      performMessagingAction?: (actionJson: string) => string;
      cancelAction?: () => boolean;
      getInstalledApps?: () => string;
    };
    AndroidControlBridge?: any;
  }
}

export class AndroidControlBridge {
  private static instance: AndroidControlBridge;
  private isSimulatedAccessibilityEnabled: boolean = true;

  private constructor() {}

  public static getInstance(): AndroidControlBridge {
    if (!AndroidControlBridge.instance) {
      AndroidControlBridge.instance = new AndroidControlBridge();
    }
    return AndroidControlBridge.instance;
  }

  public isNativeAndroid(): boolean {
    return typeof window !== 'undefined' && (!!window.AndroidControl || !!window.AndroidControlBridge);
  }

  public getStatus(): NativeBridgeStatus {
    const isNative = this.isNativeAndroid();
    let isEnabled = this.isSimulatedAccessibilityEnabled;

    if (isNative && window.AndroidControl?.isAccessibilityServiceEnabled) {
      try {
        isEnabled = window.AndroidControl.isAccessibilityServiceEnabled();
      } catch (e) {
        console.warn('Native accessibility check error:', e);
      }
    }

    return {
      isAccessibilityEnabled: isEnabled,
      serviceBound: isEnabled,
      platform: isNative ? 'android_native' : 'simulated',
      supportedApps: adapterRegistry.getAllSupportedApps(),
    };
  }

  public setSimulatedAccessibility(enabled: boolean): void {
    this.isSimulatedAccessibilityEnabled = enabled;
  }

  public openAccessibilitySettings(): void {
    if (this.isNativeAndroid() && window.AndroidControl?.openAccessibilitySettings) {
      window.AndroidControl.openAccessibilitySettings();
      return;
    }

    // On standard Android browser or web, launch Android settings intent
    if (typeof window !== 'undefined') {
      const intentUrl = 'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end';
      try {
        window.location.href = intentUrl;
      } catch (e) {
        console.info('Launched accessibility settings intent');
      }
    }
  }

  public launchApp(app: TargetMessagingApp): boolean {
    const adapter = adapterRegistry.getAdapter(app);
    if (this.isNativeAndroid() && window.AndroidControl?.launchPackage) {
      return window.AndroidControl.launchPackage(adapter.packageName);
    }

    if (typeof window !== 'undefined') {
      try {
        window.location.href = adapter.getLaunchIntent();
        return true;
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  public dispatchDirectUri(url: string): void {
    if (typeof window !== 'undefined' && url) {
      try {
        window.location.href = url;
      } catch (e) {
        console.warn('URI dispatch failed:', e);
      }
    }
  }
}

export const androidControlBridge = AndroidControlBridge.getInstance();
