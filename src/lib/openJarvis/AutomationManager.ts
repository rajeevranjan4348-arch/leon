/**
 * AutomationManager - Open Jarvis Routine & Automation Scheduler System
 * Ported from com.openjarvis.automation.AutomationManager
 */

import { AutomationSchedule, AutomationTask } from './types';

export class AutomationManager {
  private static instance: AutomationManager;
  private automations = new Map<string, AutomationTask>();
  private STORAGE_KEY = 'open_jarvis_automations';

  private constructor() {
    this.loadAutomations();
  }

  public static getInstance(): AutomationManager {
    if (!AutomationManager.instance) {
      AutomationManager.instance = new AutomationManager();
    }
    return AutomationManager.instance;
  }

  private loadAutomations() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const list: AutomationTask[] = JSON.parse(raw);
        list.forEach((item) => this.automations.set(item.id, item));
      }
    } catch {
      // Storage fallback
    }
  }

  private saveAutomations() {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(Array.from(this.automations.values()))
      );
    } catch {
      // Storage error ignored
    }
  }

  public parseSchedule(input: string): AutomationSchedule | null {
    const lower = input.toLowerCase();

    // Daily match: "every day at 9:00 am" or "daily at 14:30"
    const dailyMatch = lower.match(/(?:every day|daily)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (dailyMatch) {
      let hour = parseInt(dailyMatch[1], 10);
      const minute = dailyMatch[2] ? parseInt(dailyMatch[2], 10) : 0;
      const ampm = dailyMatch[3] ? dailyMatch[3].toLowerCase() : '';

      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;

      return { type: 'daily', hour, minute };
    }

    // Interval match: "every 2 hours", "every 30 minutes"
    const intervalMatch = lower.match(/every\s+(\d+)\s*(minute|hour|day)s?/i);
    if (intervalMatch) {
      const val = parseInt(intervalMatch[1], 10);
      const unit = intervalMatch[2].toLowerCase();

      let intervalMs = 60 * 60 * 1000;
      if (unit === 'minute') intervalMs = val * 60 * 1000;
      if (unit === 'hour') intervalMs = val * 60 * 60 * 1000;
      if (unit === 'day') intervalMs = val * 24 * 60 * 60 * 1000;

      return { type: 'interval', intervalMs };
    }

    return null;
  }

  public createAutomation(name: string, command: string, schedule: AutomationSchedule): AutomationTask {
    const task: AutomationTask = {
      id: `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      command,
      schedule,
      enabled: true,
      runCount: 0,
    };
    this.automations.set(task.id, task);
    this.saveAutomations();
    return task;
  }

  public getAutomations(): AutomationTask[] {
    return Array.from(this.automations.values());
  }

  public toggleAutomation(id: string, enabled: boolean) {
    const existing = this.automations.get(id);
    if (existing) {
      existing.enabled = enabled;
      this.saveAutomations();
    }
  }

  public deleteAutomation(id: string) {
    this.automations.delete(id);
    this.saveAutomations();
  }
}

export const automationManager = AutomationManager.getInstance();
