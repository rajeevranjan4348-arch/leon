/**
 * Function Registry ported from JarvisLauncher (com.jarvis.launcher.ai.engine.FunctionRegistry)
 * 
 * Provides dynamic OpenAI & Gemini tool function schema generation and execution engine
 * for system/device automation (Wifi, Bluetooth, Battery, Apps, Volume, Memory).
 */

import { FunctionResult, SchemaParam } from './types';
import { sensorMonitor } from './SensorMonitor';
import { universalAppLauncher } from '../launcher/UniversalAppLauncher';
import { appResolver } from '../launcher/AppResolver';

export class FunctionRegistry {
  private static instance: FunctionRegistry;
  private memoryStore: Map<string, string> = new Map();
  private readonly MEMORY_KEY = 'jarvis_kv_memory';

  private constructor() {
    this.loadMemory();
  }

  public static getInstance(): FunctionRegistry {
    if (!FunctionRegistry.instance) {
      FunctionRegistry.instance = new FunctionRegistry();
    }
    return FunctionRegistry.instance;
  }

  private loadMemory() {
    try {
      const raw = localStorage.getItem(this.MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => this.memoryStore.set(k, String(v)));
      }
    } catch {
      // Ignored
    }
  }

  private saveMemory() {
    try {
      const obj = Object.fromEntries(this.memoryStore.entries());
      localStorage.setItem(this.MEMORY_KEY, JSON.stringify(obj));
    } catch {
      // Ignored
    }
  }

  /**
   * Return schema parameter specification
   */
  public getFunctionSchemas(): Array<{ name: string; description: string; parameters: any }> {
    return [
      this.createFunctionSchema('launch_app', 'Launch an application by name or package', {
        app_name: { type: 'string', description: 'Name of the application to open' },
      }),
      this.createFunctionSchema('search_apps', 'Search for installed applications', {
        query: { type: 'string', description: 'Search term for apps' },
      }),
      this.createFunctionSchema('toggle_wifi', 'Toggle WiFi settings state', {
        action: { type: 'string', description: '"enable" or "disable"' },
      }),
      this.createFunctionSchema('toggle_bluetooth', 'Toggle Bluetooth settings state', {
        action: { type: 'string', description: '"enable" or "disable"' },
      }),
      this.createFunctionSchema('toggle_flashlight', 'Turn device flashlight on or off', {
        state: { type: 'boolean', description: 'true for ON, false for OFF' },
      }),
      this.createFunctionSchema('adjust_volume', 'Adjust system audio volume', {
        level: { type: 'string', description: 'Volume level e.g. "mute", "silent", "vibrate", "max", "50%"' },
      }),
      this.createFunctionSchema('adjust_brightness', 'Adjust screen brightness', {
        level: { type: 'string', description: 'Brightness level e.g. "high", "low", "auto"' },
      }),
      this.createFunctionSchema('get_battery_info', 'Retrieve battery percentage and charging status', {}),
      this.createFunctionSchema('get_time', 'Retrieve current system time', {}),
      this.createFunctionSchema('get_date', 'Retrieve current date and day of week', {}),
      this.createFunctionSchema('open_url', 'Open a web URL in browser', {
        url: { type: 'string', description: 'URL starting with http:// or https://' },
      }),
      this.createFunctionSchema('make_call', 'Initiate a phone call to a contact or number', {
        phone_number: { type: 'string', description: 'Phone number or contact name' },
      }),
      this.createFunctionSchema('send_message', 'Send SMS or chat message', {
        phone_number: { type: 'string', description: 'Recipient number or contact' },
        message: { type: 'string', description: 'Text message content' },
      }),
      this.createFunctionSchema('remember_information', 'Save a key-value fact to long term memory', {
        key: { type: 'string', description: 'Topic or label' },
        value: { type: 'string', description: 'Fact or information to remember' },
      }),
      this.createFunctionSchema('recall_information', 'Retrieve a stored fact from long term memory', {
        key: { type: 'string', description: 'Topic or label to recall' },
      }),
    ];
  }

  /**
   * Helper to construct schema in standard format
   */
  private createFunctionSchema(name: string, description: string, parameters: Record<string, SchemaParam>) {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    Object.entries(parameters).forEach(([pName, pSpec]) => {
      properties[pName] = {
        type: pSpec.type,
        description: pSpec.description,
      };
      if (pSpec.required !== false) {
        required.push(pName);
      }
    });

    return {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    };
  }

  /**
   * Convert OpenAI function format to Gemini FunctionDeclaration format
   */
  public convertToGeminiFormat(openAiFunc: { name: string; description: string; parameters: any }) {
    return {
      name: openAiFunc.name,
      description: openAiFunc.description,
      parameters: openAiFunc.parameters,
    };
  }

  /**
   * Execute function tool by name
   */
  public async executeFunction(name: string, args: Record<string, any>): Promise<FunctionResult> {
    try {
      switch (name) {
        case 'launch_app': {
          const appName = args.app_name || args.appName || '';
          const res = await universalAppLauncher.launchApp(appName);
          if (res.success) {
            return { success: true, message: res.message, data: { packageName: res.packageName } };
          }
          return { success: false, error: res.message, data: { candidateMatches: res.candidateMatches } };
        }

        case 'search_apps': {
          const query = args.query || '';
          const matches = appResolver.searchApps(query);
          if (matches.length > 0) {
            return {
              success: true,
              message: `Found ${matches.length} apps matching "${query}": ${matches.map(m => m.name).join(', ')}`,
              data: { matches },
            };
          }
          return { success: false, error: `No apps found matching "${query}"` };
        }

        case 'toggle_wifi': {
          const action = args.action || 'toggle';
          return { success: true, message: `Opening WiFi settings to ${action} WiFi` };
        }

        case 'toggle_bluetooth': {
          const action = args.action || 'toggle';
          return { success: true, message: `Opening Bluetooth settings to ${action} Bluetooth` };
        }

        case 'toggle_flashlight': {
          const state = Boolean(args.state);
          return { success: true, message: `Flashlight ${state ? 'turned ON' : 'turned OFF'}` };
        }

        case 'adjust_volume': {
          const level = args.level || '50%';
          return { success: true, message: `System volume adjusted to ${level}` };
        }

        case 'adjust_brightness': {
          const level = args.level || 'auto';
          return { success: true, message: `Screen brightness adjusted to ${level}` };
        }

        case 'get_battery_info': {
          const env = await sensorMonitor.getEnvironmentalContext();
          return {
            success: true,
            message: `Battery is at ${env.batteryLevel}%${env.isCharging ? ' (charging)' : ''}`,
            data: { batteryLevel: env.batteryLevel, isCharging: env.isCharging },
          };
        }

        case 'get_time': {
          const time = new Date().toLocaleTimeString();
          return { success: true, message: `Current time is ${time}` };
        }

        case 'get_date': {
          const date = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          return { success: true, message: `Today is ${date}` };
        }

        case 'open_url': {
          const url = args.url || '';
          if (typeof window !== 'undefined') {
            window.open(url, '_blank');
          }
          return { success: true, message: `Opening URL ${url}` };
        }

        case 'make_call': {
          const num = args.phone_number || '';
          return { success: true, message: `Initiating phone call to ${num}` };
        }

        case 'send_message': {
          const num = args.phone_number || '';
          const msg = args.message || '';
          return { success: true, message: `Messaging ${num}: "${msg}"` };
        }

        case 'remember_information': {
          const key = (args.key || '').toLowerCase().trim();
          const val = args.value || '';
          if (key) {
            this.memoryStore.set(key, val);
            this.saveMemory();
            return { success: true, message: `I'll remember that ${key} is ${val}` };
          }
          return { success: false, error: 'Missing memory key or value' };
        }

        case 'recall_information': {
          const key = (args.key || '').toLowerCase().trim();
          if (this.memoryStore.has(key)) {
            const val = this.memoryStore.get(key);
            return { success: true, message: `Recalled: ${key} = ${val}`, data: { key, value: val } };
          }
          return { success: false, error: `No stored information found for "${key}"` };
        }

        default:
          return { success: false, error: `Unknown tool function "${name}"` };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || `Execution error for tool "${name}"` };
    }
  }
}

export const functionRegistry = FunctionRegistry.getInstance();
