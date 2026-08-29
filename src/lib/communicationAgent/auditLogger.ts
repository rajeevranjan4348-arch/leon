import { CommunicationAuditLog, CommunicationToolType, DevicePermissionKey } from './types';

const AUDIT_STORAGE_KEY = 'rishi_ai_communication_audit_logs';

export class AuditLogger {
  private static instance: AuditLogger;
  private logs: CommunicationAuditLog[] = [];

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  private loadLogs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load audit logs', e);
    }
  }

  private saveLogs(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      // Keep most recent 200 logs
      const trimmed = this.logs.slice(-200);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save audit logs', e);
    }
  }

  public log(entry: {
    toolType: CommunicationToolType;
    target?: string;
    summary: string;
    status: 'success' | 'failed' | 'cancelled' | 'pending';
    permissionChecked: DevicePermissionKey[];
    details?: string;
  }): CommunicationAuditLog {
    const item: CommunicationAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.unshift(item);
    this.saveLogs();
    return item;
  }

  public getLogs(): CommunicationAuditLog[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    }
  }
}

export const auditLogger = AuditLogger.getInstance();
