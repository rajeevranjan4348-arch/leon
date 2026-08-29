/**
 * App Category Manager & Usage Tracker ported from JarvisLauncher (com.jarvis.launcher.data)
 * Handles app categorization, usage frequency tracking, and recency scoring for agent decisions.
 */

import { AppCategory, AppUsageRecord } from './types';

export class AppCategoryManager {
  private static categoryMap: Record<string, AppCategory> = {
    whatsapp: 'Social',
    telegram: 'Social',
    instagram: 'Social',
    twitter: 'Social',
    facebook: 'Social',
    youtube: 'Entertainment',
    netflix: 'Entertainment',
    spotify: 'Entertainment',
    chrome: 'Productivity',
    gmail: 'Productivity',
    slack: 'Productivity',
    notion: 'Productivity',
    settings: 'System',
    camera: 'Utilities',
    calculator: 'Utilities',
  };

  public static getCategory(appNameOrPackage: string): AppCategory {
    const clean = appNameOrPackage.toLowerCase();
    for (const [key, category] of Object.entries(this.categoryMap)) {
      if (clean.includes(key)) return category;
    }
    return 'Utilities';
  }
}

export class AppUsageTracker {
  private static instance: AppUsageTracker;
  private records: Map<string, AppUsageRecord> = new Map();
  private readonly STORAGE_KEY = 'jarvis_app_usage_records';

  private constructor() {
    this.loadRecords();
  }

  public static getInstance(): AppUsageTracker {
    if (!AppUsageTracker.instance) {
      AppUsageTracker.instance = new AppUsageTracker();
    }
    return AppUsageTracker.instance;
  }

  private loadRecords() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed: AppUsageRecord[] = JSON.parse(raw);
        parsed.forEach(rec => this.records.set(rec.packageName, rec));
      }
    } catch {
      // Ignored
    }
  }

  private saveRecords() {
    try {
      const arr = Array.from(this.records.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // Ignored
    }
  }

  public trackLaunch(packageName: string, appName: string) {
    const existing = this.records.get(packageName) || {
      packageName,
      appName,
      launchCount: 0,
      lastUsedTimestamp: 0,
      category: AppCategoryManager.getCategory(appName),
    };

    existing.launchCount += 1;
    existing.lastUsedTimestamp = Date.now();
    this.records.set(packageName, existing);
    this.saveRecords();
  }

  public getTopApps(limit: number = 5): AppUsageRecord[] {
    return Array.from(this.records.values())
      .sort((a, b) => b.launchCount - a.launchCount)
      .slice(0, limit);
  }
}

export const appUsageTracker = AppUsageTracker.getInstance();
