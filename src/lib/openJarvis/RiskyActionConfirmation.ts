/**
 * RiskyActionConfirmation - Open Jarvis Security Risk Classification Engine
 * Ported from com.openjarvis.agent.RiskyActionConfirmation
 */

import { ActionPreview, OpenJarvisAction, RiskLevel } from './types';

export class RiskyActionConfirmation {
  private autoProceedSeconds = 8;
  private enabled = true;

  private messagingPackages = new Set([
    'com.whatsapp',
    'com.google.android.apps.messaging',
    'com.instagram.android',
    'com.facebook.orca',
    'org.telegram.messenger',
    'com.discord',
  ]);

  private financialPackages = new Set([
    'com.google.android.apps.wallet',
    'com.paytm',
    'com.phonepe',
    'com.razorpay',
    'com.paypal.android',
  ]);

  private socialPackages = new Set([
    'com.instagram.android',
    'com.twitter.android',
    'com.facebook.katana',
    'com.snapchat.android',
    'com.tiktok',
  ]);

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public getRiskLevel(action: OpenJarvisAction): RiskLevel {
    if (action.action === 'type') {
      const pkg = action.packageName || '';
      return this.messagingPackages.has(pkg) ? 'MEDIUM' : 'LOW';
    }

    if (action.action === 'open_app') {
      const pkg = action.packageName || '';
      if (this.financialPackages.has(pkg)) return 'HIGH';
      if (this.socialPackages.has(pkg)) return 'MEDIUM';
      return 'LOW';
    }

    return 'LOW';
  }

  public shouldConfirm(action: OpenJarvisAction): boolean {
    if (!this.enabled) return false;
    const level = this.getRiskLevel(action);
    return level === 'HIGH' || level === 'MEDIUM';
  }

  public buildPreview(action: OpenJarvisAction): ActionPreview {
    const riskLevel = this.getRiskLevel(action);
    const summary = this.buildSummary(action);
    const details = [
      `Target interaction package: ${action.packageName || 'System'}`,
      `Auto-execution timer: ${this.autoProceedSeconds}s`,
      `Safety level evaluated: ${riskLevel}`,
    ];

    return {
      riskLevel,
      summary,
      details,
      canUndo: false,
    };
  }

  private buildSummary(action: OpenJarvisAction): string {
    switch (action.action) {
      case 'type':
        return `Send text input: "${(action.value || '').slice(0, 30)}..."`;
      case 'open_app':
        return `Open application ${action.label || action.packageName}`;
      default:
        return `Execute system action: ${action.action}`;
    }
  }
}

export const riskyActionConfirmation = new RiskyActionConfirmation();
