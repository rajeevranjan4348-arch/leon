/**
 * Session Diagnostics Exporter
 * Compiles non-sensitive application runtime diagnostics into a downloadable diagnostics.json file.
 */

export interface DiagnosticsReport {
  appVersion: string;
  timestamp: string;
  sessionId: string;
  platform: string;
  browser: {
    userAgent: string;
    language: string;
    onlineStatus: boolean;
    cookieEnabled: boolean;
  };
  display: {
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    devicePixelRatio: number;
  };
  currentLocation: {
    href: string;
    pathname: string;
    search: string;
  };
  uiStateSummary: {
    activePanel: string;
    isSidebarOpen: boolean;
    isHistoryOpen: boolean;
  };
  modelInfo: {
    providerName: string;
    defaultModel: string;
  };
  featureFlags: {
    voiceEnabled: boolean;
    appControllerToolEnabled: boolean;
    offlineAiFallbackEnabled: boolean;
  };
  recentErrorSummaries: string[];
}

export function generateDiagnosticsReport(extraState?: {
  sessionId?: string;
  activePanel?: string;
  isSidebarOpen?: boolean;
  isHistoryOpen?: boolean;
}): DiagnosticsReport {
  const isClient = typeof window !== 'undefined';

  const report: DiagnosticsReport = {
    appVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    sessionId: extraState?.sessionId || (isClient ? localStorage.getItem('rishi_session_id') || 'session_default' : 'session_default'),
    platform: isClient ? navigator.platform || 'Unknown Platform' : 'Server',
    browser: {
      userAgent: isClient ? navigator.userAgent : 'Unknown',
      language: isClient ? navigator.language : 'en-US',
      onlineStatus: isClient ? navigator.onLine : true,
      cookieEnabled: isClient ? navigator.cookieEnabled : false,
    },
    display: {
      screenWidth: isClient ? window.screen?.width || 0 : 0,
      screenHeight: isClient ? window.screen?.height || 0 : 0,
      viewportWidth: isClient ? window.innerWidth || 0 : 0,
      viewportHeight: isClient ? window.innerHeight || 0 : 0,
      devicePixelRatio: isClient ? window.devicePixelRatio || 1 : 1,
    },
    currentLocation: {
      href: isClient ? window.location.href : '',
      pathname: isClient ? window.location.pathname : '',
      search: isClient ? window.location.search : '',
    },
    uiStateSummary: {
      activePanel: extraState?.activePanel || 'chat',
      isSidebarOpen: extraState?.isSidebarOpen ?? true,
      isHistoryOpen: extraState?.isHistoryOpen ?? false,
    },
    modelInfo: {
      providerName: 'Google Gemini API / MiniMax AI',
      defaultModel: 'Gemini 2.5 Flash / MiniMax M3',
    },
    featureFlags: {
      voiceEnabled: true,
      appControllerToolEnabled: true,
      offlineAiFallbackEnabled: true,
    },
    recentErrorSummaries: getRecentErrorSummaries(),
  };

  return report;
}

function getRecentErrorSummaries(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('app_recent_errors') || '[]';
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(-5).map(e => typeof e === 'string' ? e : e?.message || 'Unknown error');
    }
  } catch (e) {
    // Ignore error
  }
  return [];
}

/**
 * Trigger browser download of diagnostics.json
 */
export function exportDiagnosticsFile(extraState?: {
  sessionId?: string;
  activePanel?: string;
  isSidebarOpen?: boolean;
  isHistoryOpen?: boolean;
}): boolean {
  try {
    const report = generateDiagnosticsReport(extraState);
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagnostics.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to export diagnostics report:', err);
    return false;
  }
}
