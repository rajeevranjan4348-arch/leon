/**
 * System and Backend Types ported from JarvisLauncher (Debajeet-1411/JarvisLauncher)
 * Strictly non-UI data structures and interfaces for AI agent orchestration.
 */

export type AiMode = 'LOCAL' | 'CLOUD';

export type CloudProvider = 'OPENAI' | 'GEMINI';

export interface UserContextData {
  location?: string | null;
  lastCommand: string;
  commandCount: number;
  batteryLevel: number;
  isCharging: boolean;
  isWifiConnected: boolean;
  dayOfWeek: string;
}

export type TimeOfDay = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export type LocationType = 'HOME' | 'WORK' | 'SCHOOL' | 'GYM' | 'UNKNOWN';

export interface TimeContext {
  hour: number;
  timeOfDay: TimeOfDay;
  dayOfWeek: number;
  isWeekend: boolean;
}

export interface EnvironmentalContext {
  timeContext: TimeContext;
  location?: { latitude: number; longitude: number } | null;
  isMoving: boolean;
  isCharging: boolean;
  batteryLevel: number;
}

export interface AiAction {
  type: string;
  data: Record<string, any>;
}

export interface AiResponse {
  message: string;
  action?: AiAction | null;
}

export interface SchemaParam {
  type: string;
  description: string;
  required?: boolean;
}

export interface FunctionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, any>;
}

export type StreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type AppCategory = 'Productivity' | 'Social' | 'Games' | 'Utilities' | 'Entertainment' | 'System';

export interface AppUsageRecord {
  packageName: string;
  appName: string;
  launchCount: number;
  lastUsedTimestamp: number;
  category: AppCategory;
}

export type RoutineType = 'MORNING' | 'WORK' | 'EVENING' | 'NIGHT' | 'CUSTOM';

export interface RoutineTask {
  id: string;
  routineType: RoutineType;
  actionType: string;
  target: string;
  params?: Record<string, any>;
  enabled: boolean;
}
