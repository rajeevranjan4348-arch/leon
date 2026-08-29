/**
 * Sensor Monitor ported from JarvisLauncher (com.jarvis.launcher.context.SensorMonitor)
 * Provides environmental context awareness: location, time of day, day of week, battery status, WiFi state.
 */

import { EnvironmentalContext, TimeContext, TimeOfDay, UserContextData } from './types';

export class SensorMonitor {
  private static instance: SensorMonitor;

  private constructor() {}

  public static getInstance(): SensorMonitor {
    if (!SensorMonitor.instance) {
      SensorMonitor.instance = new SensorMonitor();
    }
    return SensorMonitor.instance;
  }

  /**
   * Get current time context
   */
  public getTimeContext(): TimeContext {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

    let timeOfDay: TimeOfDay = 'NIGHT';
    if (hour >= 6 && hour < 12) timeOfDay = 'MORNING';
    else if (hour >= 12 && hour < 18) timeOfDay = 'AFTERNOON';
    else if (hour >= 18 && hour < 22) timeOfDay = 'EVENING';

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return {
      hour,
      timeOfDay,
      dayOfWeek,
      isWeekend,
    };
  }

  /**
   * Get environmental context
   */
  public async getEnvironmentalContext(): Promise<EnvironmentalContext> {
    const timeContext = this.getTimeContext();
    let batteryLevel = 85;
    let isCharging = false;
    let isWifiConnected = true;

    if (typeof navigator !== 'undefined') {
      isWifiConnected = navigator.onLine;

      if ('getBattery' in navigator) {
        try {
          const battery: any = await (navigator as any).getBattery();
          batteryLevel = Math.round(battery.level * 100);
          isCharging = battery.charging;
        } catch {
          // Default fallback values
        }
      }
    }

    return {
      timeContext,
      location: null,
      isMoving: false,
      isCharging,
      batteryLevel,
    };
  }

  /**
   * Get user context summary formatted for system prompt enrichment
   */
  public async getUserContextSummary(lastCommand: string = ''): Promise<string> {
    const env = await this.getEnvironmentalContext();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dayStr = now.toLocaleDateString([], { weekday: 'long' });

    const parts: string[] = [
      `Time: ${timeStr} (${env.timeContext.timeOfDay})`,
      `Day: ${dayStr}`,
      `Battery: ${env.batteryLevel}%${env.isCharging ? ' (charging)' : ''}`,
      `WiFi: ${navigator.onLine ? 'connected' : 'offline'}`,
    ];

    if (lastCommand) {
      parts.push(`LastCommand: "${lastCommand}"`);
    }

    return parts.join(', ');
  }
}

export const sensorMonitor = SensorMonitor.getInstance();
