import React, { useEffect } from 'react';
import { runStartupApiHealthCheck } from '@/lib/services/startupApiHealthService';

/**
 * StartupApiHealthListener
 * Non-blocking component mounted at the App root that initiates an asynchronous check
 * of all registered API endpoints (Gemini, NVIDIA, Qwen, Minimax, etc.) on startup
 * and triggers notifications if any critical service is unresponsive.
 */
export const StartupApiHealthListener: React.FC = () => {
  useEffect(() => {
    // Delay slightly (600ms) to ensure smooth initial paint before firing asynchronous probes
    const startupTimer = setTimeout(() => {
      runStartupApiHealthCheck({ notifyOnUnresponsive: true });
    }, 600);

    const handleManualCheck = () => {
      runStartupApiHealthCheck({ force: true, notifyOnUnresponsive: true });
    };

    window.addEventListener('check_api_health_now', handleManualCheck);
    window.addEventListener('retry_startup_health_check', handleManualCheck);

    return () => {
      clearTimeout(startupTimer);
      window.removeEventListener('check_api_health_now', handleManualCheck);
      window.removeEventListener('retry_startup_health_check', handleManualCheck);
    };
  }, []);

  return null;
};

export default StartupApiHealthListener;
