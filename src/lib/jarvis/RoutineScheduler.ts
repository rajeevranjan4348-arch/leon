/**
 * Routine Scheduler ported from JarvisLauncher (com.jarvis.launcher.context.RoutineScheduler)
 * Manages contextual routines (Morning, Work, Evening, Night) and task triggers.
 */

import { RoutineTask, RoutineType } from './types';
import { sensorMonitor } from './SensorMonitor';

export class RoutineScheduler {
  private static instance: RoutineScheduler;
  private routines: Map<RoutineType, RoutineTask[]> = new Map();

  private constructor() {
    this.registerDefaultRoutines();
  }

  public static getInstance(): RoutineScheduler {
    if (!RoutineScheduler.instance) {
      RoutineScheduler.instance = new RoutineScheduler();
    }
    return RoutineScheduler.instance;
  }

  private registerDefaultRoutines() {
    this.routines.set('MORNING', [
      { id: 'm1', routineType: 'MORNING', actionType: 'get_time', target: 'system', enabled: true },
      { id: 'm2', routineType: 'MORNING', actionType: 'get_battery_info', target: 'system', enabled: true },
    ]);

    this.routines.set('WORK', [
      { id: 'w1', routineType: 'WORK', actionType: 'adjust_volume', target: 'system', params: { level: 'vibrate' }, enabled: true },
    ]);

    this.routines.set('EVENING', [
      { id: 'e1', routineType: 'EVENING', actionType: 'adjust_brightness', target: 'system', params: { level: 'night_mode' }, enabled: true },
    ]);

    this.routines.set('NIGHT', [
      { id: 'n1', routineType: 'NIGHT', actionType: 'adjust_volume', target: 'system', params: { level: 'silent' }, enabled: true },
    ]);
  }

  /**
   * Get active routine based on current time context
   */
  public getActiveRoutineType(): RoutineType {
    const timeCtx = sensorMonitor.getTimeContext();
    switch (timeCtx.timeOfDay) {
      case 'MORNING': return 'MORNING';
      case 'AFTERNOON': return 'WORK';
      case 'EVENING': return 'EVENING';
      case 'NIGHT': return 'NIGHT';
    }
  }

  /**
   * Get tasks for routine
   */
  public getTasksForRoutine(routineType: RoutineType): RoutineTask[] {
    return this.routines.get(routineType) || [];
  }
}

export const routineScheduler = RoutineScheduler.getInstance();
