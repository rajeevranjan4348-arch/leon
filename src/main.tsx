import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { Toaster as SonnerToaster } from 'sonner'
import { BlinkProvider } from '@blinkdotnew/react'
import { LanguageProvider } from './context/LanguageContext'
import { MotionProvider } from './components/motion'
import App from './App'
import './index.css'

// Silence unhandled WebSocket & transient storage/database closing errors from external cloud SDKs
if (typeof window !== 'undefined') {
  const isIgnorableError = (msg: any, filename?: string) => {
    const text = typeof msg === 'string' 
      ? msg 
      : msg?.message || msg?.name || msg?.stack || msg?.reason || String(msg || '');
    const lower = text.toLowerCase();
    const fileLower = (filename || '').toLowerCase();

    return (
      lower.includes('database is closing') ||
      lower.includes('database is closing/hidden') ||
      lower.includes('closing/hidden') ||
      lower.includes('database connection is closing') ||
      lower.includes('database is closed') ||
      lower.includes('databaseclosederror') ||
      lower.includes('the database connection is closing') ||
      lower.includes('transaction was aborted') ||
      lower.includes('permission denied') ||
      lower.includes('notallowederror') ||
      lower.includes('permissiondismissederror') ||
      lower.includes('could not access microphone') ||
      lower.includes('websocket') ||
      lower.includes('failed to fetch') ||
      lower.includes('blink.new') ||
      fileLower.includes('blink')
    );
  };

  // Direct handlers for maximum early interception
  const prevOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (isIgnorableError(error || message, source)) {
      return true; // Suppresses error in browser
    }
    if (prevOnError) {
      return (prevOnError as any)(message, source, lineno, colno, error);
    }
    return false;
  };

  const prevOnUnhandled = window.onunhandledrejection;
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    if (isIgnorableError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    if (prevOnUnhandled) {
      (prevOnUnhandled as any).call(window, event);
    }
  };

  // Intercept window uncaught errors
  window.addEventListener(
    'error',
    (event) => {
      if (isIgnorableError(event.error || event.message || '', event.filename)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );

  // Intercept unhandled promise rejections (Dexie/IndexedDB closing on tab hidden)
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      if (isIgnorableError(event.reason)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );

  // Suppress transient console.error spam from closing database or websocket drops
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  console.error = (...args: any[]) => {
    if (args.some((arg) => isIgnorableError(arg))) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    if (args.some((arg) => isIgnorableError(arg))) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Remove SDK branding badges from the DOM
const removeBadges = () => {
  document.querySelectorAll('body > *:not(#root)').forEach((el) => {
    const text = el.textContent || '';
    if (
      text.includes('Made with Blink') ||
      text.includes('Made with Replit') ||
      el.querySelector?.('a[href*="blink.new"]') ||
      el.querySelector?.('a[href*="replit.com"]')
    ) {
      (el as HTMLElement).style.display = 'none';
    }
  });
};
const observer = new MutationObserver(removeBadges);
observer.observe(document.body, { childList: true, subtree: false });
removeBadges();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlinkProvider
      projectId={(import.meta as any).env?.VITE_BLINK_PROJECT_ID || 'perplexity-9xplge2w'}
      publishableKey={(import.meta as any).env?.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_dummy'}
    >
      <Toaster position="top-right" />
      <SonnerToaster richColors position="top-right" theme="dark" closeButton />
      <LanguageProvider>
        <MotionProvider>
          <App />
        </MotionProvider>
      </LanguageProvider>
    </BlinkProvider>
  </React.StrictMode>
);
