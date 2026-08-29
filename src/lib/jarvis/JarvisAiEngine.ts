/**
 * Jarvis AI Engine ported from JarvisLauncher (com.jarvis.launcher.ai.engine.AiEngine)
 * 
 * Central system agent orchestrator:
 * - Local vs Cloud mode switching
 * - OpenAI / Gemini provider routing
 * - Environmental & user context prompt enrichment
 * - Function calling registry execution
 * - Routine scheduler evaluation
 * - Keystore encrypted API key management
 */

import { AiMode, AiResponse, CloudProvider } from './types';
import { sensorMonitor } from './SensorMonitor';
import { functionRegistry } from './FunctionRegistry';
import { keystoreManager } from './KeystoreManager';
import { routineScheduler } from './RoutineScheduler';
import { appUsageTracker } from './AppUsageTracker';
import { universalAppLauncher } from '../launcher/UniversalAppLauncher';
import { openJarvisAgentCore, graphifyEngine } from '../openJarvis';
import { loomicEngine } from '../loomic';

export class JarvisAiEngine {
  private static instance: JarvisAiEngine;
  private currentMode: AiMode = 'LOCAL';
  private currentProvider: CloudProvider = 'OPENAI';

  private constructor() {
    this.initialize();
  }

  public static getInstance(): JarvisAiEngine {
    if (!JarvisAiEngine.instance) {
      JarvisAiEngine.instance = new JarvisAiEngine();
    }
    return JarvisAiEngine.instance;
  }

  private async initialize() {
    try {
      const savedMode = localStorage.getItem('jarvis_ai_mode') as AiMode;
      if (savedMode === 'LOCAL' || savedMode === 'CLOUD') {
        this.currentMode = savedMode;
      }
      const savedProvider = localStorage.getItem('jarvis_cloud_provider') as CloudProvider;
      if (savedProvider === 'OPENAI' || savedProvider === 'GEMINI') {
        this.currentProvider = savedProvider;
      }
    } catch {
      // Ignored
    }
  }

  public setMode(mode: AiMode) {
    this.currentMode = mode;
    localStorage.setItem('jarvis_ai_mode', mode);
  }

  public getMode(): AiMode {
    return this.currentMode;
  }

  public setCloudProvider(provider: CloudProvider) {
    this.currentProvider = provider;
    localStorage.setItem('jarvis_cloud_provider', provider);
  }

  public getCloudProvider(): CloudProvider {
    return this.currentProvider;
  }

  public async saveApiKey(provider: CloudProvider, apiKey: string): Promise<void> {
    await keystoreManager.saveSecureKey(provider.toLowerCase(), apiKey);
  }

  public async getApiKey(provider: CloudProvider): Promise<string> {
    return await keystoreManager.getSecureKey(provider.toLowerCase());
  }

  /**
   * Process incoming command through the Jarvis AI Agent pipeline
   */
  public async processCommand(command: string): Promise<AiResponse> {
    const cleanCmd = command.trim();
    if (!cleanCmd) {
      return { message: 'Command cannot be empty.' };
    }

    const userContextStr = await sensorMonitor.getUserContextSummary(cleanCmd);

    // 1. Direct App Launch intent recognition
    const launchMatch = cleanCmd.match(/^(?:open|launch|start|run)\s+(.+)$/i);
    if (launchMatch) {
      const targetApp = launchMatch[1].trim();
      const res = await universalAppLauncher.launchApp(targetApp);
      if (res.success) {
        appUsageTracker.trackLaunch(res.packageName || targetApp, targetApp);
        return {
          message: res.message,
          action: { type: 'launch_app', data: { packageName: res.packageName, appName: targetApp } },
        };
      }
    }

    // 2. Battery query intent
    if (/\b(battery|charging|power level|battery level)\b/i.test(cleanCmd)) {
      const toolRes = await functionRegistry.executeFunction('get_battery_info', {});
      return { message: toolRes.success ? toolRes.message : toolRes.error };
    }

    // 3. Time / Date query intent
    if (/\b(what time is it|current time|clock|what is the time)\b/i.test(cleanCmd)) {
      const toolRes = await functionRegistry.executeFunction('get_time', {});
      return { message: toolRes.success ? toolRes.message : toolRes.error };
    }
    if (/\b(what is the date|today's date|what day is it)\b/i.test(cleanCmd)) {
      const toolRes = await functionRegistry.executeFunction('get_date', {});
      return { message: toolRes.success ? toolRes.message : toolRes.error };
    }

    // 4. Memory remember/recall intent
    const rememberMatch = cleanCmd.match(/^(?:remember that|save fact|note that)\s+([^=:]+)\s+(?:is|=|:)\s+(.+)$/i);
    if (rememberMatch) {
      const toolRes = await functionRegistry.executeFunction('remember_information', {
        key: rememberMatch[1],
        value: rememberMatch[2],
      });
      return { message: toolRes.success ? toolRes.message : toolRes.error };
    }

    const recallMatch = cleanCmd.match(/^(?:what is|recall|remember|where is)\s+([^?]+)\??$/i);
    if (recallMatch) {
      const toolRes = await functionRegistry.executeFunction('recall_information', {
        key: recallMatch[1],
      });
      if (toolRes.success) {
        return { message: toolRes.message };
      }
    }

    // 5. Active routine tasks check
    const activeRoutine = routineScheduler.getActiveRoutineType();
    const tasks = routineScheduler.getTasksForRoutine(activeRoutine);

    // 5b. Loomic Media / Design Generation Intent Check
    if (/\b(generate image|draw|create poster|generate video|create animation|produce video|loomic|design canvas)\b/i.test(cleanCmd)) {
      const loomicRes = await loomicEngine.processAgentTask({ prompt: cleanCmd });
      return {
        message: loomicRes.message,
      };
    }

    // 6. Process command through Open Jarvis Agent Architecture
    const agentResult = await openJarvisAgentCore.executeTask(cleanCmd);
    if (agentResult.status === 'error') {
      return { message: agentResult.message || 'Error processing request.' };
    }

    graphifyEngine.logTaskExecution(cleanCmd, agentResult.message || 'Success', agentResult.providerUsed);

    return {
      message: `[Open Jarvis Agent - ${this.currentMode} Mode (${agentResult.providerUsed || this.currentProvider})] ${agentResult.message || 'Task evaluated successfully.'}\n\nContext: ${userContextStr}. Active Routine: ${activeRoutine}.`,
    };
  }
}

export const jarvisAiEngine = JarvisAiEngine.getInstance();
