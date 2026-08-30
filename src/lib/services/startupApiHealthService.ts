/**
 * Startup API Health Service
 * Performs an asynchronous, non-blocking check of all registered API endpoints
 * (Gemini, NVIDIA, Qwen, Minimax, etc.) during the App startup sequence and displays
 * a clear, actionable notification if any critical service is unresponsive.
 */

import { toast } from 'sonner';
import {
  ServiceId,
  ServiceHealthStatus,
  checkSingleServiceHealth,
  getHealthStatuses,
  subscribeHealthUpdates,
} from '@/lib/serviceHealth';
import {
  getGeminiKeyInfo,
  getNvidiaChatKeyInfo,
  getQwenKeyInfo,
  getMiniMaxKeyInfo,
  getOpenAIKeyInfo,
  getBFLKeyInfo,
} from '@/lib/settings';

export interface EndpointHealthResult {
  id: ServiceId;
  name: string;
  provider: string;
  endpointUrl: string;
  isCritical: boolean;
  isResponsive: boolean;
  status: 'healthy' | 'degraded' | 'unresponsive';
  latencyMs: number | null;
  statusCode?: number;
  errorMessage?: string;
}

export interface StartupHealthReport {
  timestamp: number;
  totalChecked: number;
  responsiveCount: number;
  unresponsiveCount: number;
  criticalUnresponsive: EndpointHealthResult[];
  allResults: EndpointHealthResult[];
  hasCriticalFailure: boolean;
}

// Critical services whose failure impairs core AI interactions
export const CRITICAL_SERVICE_IDS: ServiceId[] = ['gemini', 'nvidia', 'qwen', 'minimax'];

let hasRunStartupCheck = false;
let lastStartupReport: StartupHealthReport | null = null;
const startupListeners = new Set<(report: StartupHealthReport) => void>();

/**
 * Perform asynchronous probe of a single registered API endpoint
 */
async function probeEndpoint(id: ServiceId, timeoutMs = 5000): Promise<EndpointHealthResult> {
  const isCritical = CRITICAL_SERVICE_IDS.includes(id);
  const startTime = performance.now();
  let name: string = id;
  let provider = '';
  let endpointUrl = '';

  switch (id) {
    case 'gemini':
      name = 'Google Gemini AI';
      provider = 'Google AI Studio';
      endpointUrl = 'https://generativelanguage.googleapis.com';
      break;
    case 'nvidia':
      name = 'NVIDIA NIM Llama 3.3';
      provider = 'NVIDIA Build Cloud';
      endpointUrl = 'https://integrate.api.nvidia.com/v1';
      break;
    case 'qwen':
      name = 'Alibaba Qwen & Wanx';
      provider = 'DashScope Cloud Platform';
      endpointUrl = 'https://dashscope.aliyuncs.com';
      break;
    case 'minimax':
      name = 'MiniMax M2.5 & Speech';
      provider = 'MiniMax Open Platform';
      endpointUrl = 'https://api.minimax.chat/v1';
      break;
    case 'openai':
      name = 'OpenAI API';
      provider = 'OpenAI';
      endpointUrl = 'https://api.openai.com/v1';
      break;
    case 'bfl':
      name = 'BFL Flux';
      provider = 'Black Forest Labs';
      endpointUrl = 'https://api.bfl.ml/v1';
      break;
    case 'backend':
      name = 'App Backend';
      provider = 'Internal Proxy';
      endpointUrl = '/api/health';
      break;
    default:
      name = id;
      provider = 'Registered Provider';
      endpointUrl = '';
  }

  try {
    // Run the integrated service health check to update state & logs
    const healthStatus: ServiceHealthStatus = await checkSingleServiceHealth(id);
    const latency = healthStatus.latencyMs || Math.round(performance.now() - startTime);
    const isResponsive = healthStatus.status !== 'offline';

    return {
      id,
      name: healthStatus.name || name,
      provider: healthStatus.provider || provider,
      endpointUrl: healthStatus.endpointUrl || endpointUrl,
      isCritical,
      isResponsive,
      status: isResponsive ? (healthStatus.status === 'degraded' ? 'degraded' : 'healthy') : 'unresponsive',
      latencyMs: latency,
      statusCode: healthStatus.httpStatus,
      errorMessage: !isResponsive ? healthStatus.statusMessage || 'Endpoint unresponsive or unreachable' : undefined,
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - startTime);
    const errMsg = err?.message || 'Network request timeout or connection failed';

    return {
      id,
      name,
      provider,
      endpointUrl,
      isCritical,
      isResponsive: false,
      status: 'unresponsive',
      latencyMs: latency,
      errorMessage: errMsg,
    };
  }
}

/**
 * Asynchronously checks all registered API endpoints during startup
 * Displays an immediate notification if any critical service is unresponsive.
 */
export async function runStartupApiHealthCheck(options?: {
  force?: boolean;
  notifyOnUnresponsive?: boolean;
  quietSuccess?: boolean;
}): Promise<StartupHealthReport> {
  const { force = false, notifyOnUnresponsive = true } = options || {};

  if (hasRunStartupCheck && !force && lastStartupReport) {
    return lastStartupReport;
  }

  hasRunStartupCheck = true;

  // Registered endpoints list explicitly including Gemini, NVIDIA, Qwen, Minimax, etc.
  const registeredEndpointIds: ServiceId[] = ['gemini', 'nvidia', 'qwen', 'minimax', 'backend'];

  // Execute all asynchronous endpoint checks concurrently without blocking UI
  const results = await Promise.all(
    registeredEndpointIds.map(id => probeEndpoint(id, 4500))
  );

  const criticalUnresponsive = results.filter(
    r => r.isCritical && (!r.isResponsive || r.status === 'unresponsive')
  );

  const report: StartupHealthReport = {
    timestamp: Date.now(),
    totalChecked: results.length,
    responsiveCount: results.filter(r => r.isResponsive).length,
    unresponsiveCount: results.filter(r => !r.isResponsive).length,
    criticalUnresponsive,
    allResults: results,
    hasCriticalFailure: criticalUnresponsive.length > 0,
  };

  lastStartupReport = report;

  // Notify registered report listeners
  startupListeners.forEach(listener => {
    try {
      listener(report);
    } catch (e) {
      console.warn('Error in startup health report listener:', e);
    }
  });

  // Emit custom window event for any observing UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('startup_api_health_completed', {
        detail: report,
      })
    );
  }

  // Display notification if any critical service is unresponsive
  if (notifyOnUnresponsive && report.hasCriticalFailure) {
    const failedNames = criticalUnresponsive.map(s => s.name).join(', ');
    const failedCount = criticalUnresponsive.length;

    toast.error(
      `${failedCount === 1 ? 'Critical API Service Unresponsive' : `${failedCount} Critical API Services Unresponsive`}`,
      {
        description: `Unresponsive endpoint${failedCount > 1 ? 's' : ''}: ${failedNames}. Check network or API credentials.`,
        duration: 9000,
        action: {
          label: 'Inspect Health',
          onClick: () => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open_command_palette'));
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('open_api_health_dashboard'));
              }, 100);
            }
          },
        },
      }
    );
  }

  return report;
}

/**
 * Subscribe to startup health reports
 */
export function subscribeStartupHealthReport(callback: (report: StartupHealthReport) => void): () => void {
  startupListeners.add(callback);
  if (lastStartupReport) {
    callback(lastStartupReport);
  }
  return () => {
    startupListeners.delete(callback);
  };
}

/**
 * Get the latest startup health report
 */
export function getLastStartupHealthReport(): StartupHealthReport | null {
  return lastStartupReport;
}

/**
 * Reset startup check state (for manual re-runs)
 */
export function resetStartupHealthCheck(): void {
  hasRunStartupCheck = false;
}
