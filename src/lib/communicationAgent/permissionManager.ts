import { DevicePermissionKey, DevicePermissionItem, PermissionStatus } from './types';

const STORAGE_KEY = 'rishi_ai_device_permissions';
const TRUSTED_AUTO_SEND_KEY = 'rishi_trusted_auto_send_contacts';

export const DEFAULT_PERMISSIONS: Record<DevicePermissionKey, DevicePermissionItem> = {
  contacts: {
    id: 'contacts',
    name: 'Contacts',
    description: 'Resolve and search contact names, nicknames, and phone numbers',
    status: 'allowed',
    category: 'personal',
    requiredFor: ['find_contact', 'send_sms', 'send_whatsapp', 'start_phone_call'],
    lastUpdated: Date.now(),
  },
  phone: {
    id: 'phone',
    name: 'Phone & Calling',
    description: 'Initiate cellular voice calls and WhatsApp voice/video calls',
    status: 'allowed',
    category: 'communication',
    requiredFor: ['start_phone_call', 'start_whatsapp_call'],
    lastUpdated: Date.now(),
  },
  sms: {
    id: 'sms',
    name: 'SMS / Messages',
    description: 'Prepare and launch native text messages and SMS threads',
    status: 'allowed',
    category: 'communication',
    requiredFor: ['send_sms', 'open_messages'],
    lastUpdated: Date.now(),
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Official WhatsApp deep links, direct chat opening, and messaging',
    status: 'connected',
    category: 'communication',
    requiredFor: ['send_whatsapp', 'open_whatsapp_chat', 'start_whatsapp_call'],
    lastUpdated: Date.now(),
  },
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'Display delivery confirmations, reminders, and incoming message alerts',
    status: 'allowed',
    category: 'system',
    requiredFor: ['get_notifications', 'create_reminder', 'set_alarm'],
    lastUpdated: Date.now(),
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar & Reminders',
    description: 'Schedule calendar events, reminders, and alarms',
    status: 'allowed',
    category: 'personal',
    requiredFor: ['create_calendar_event', 'create_reminder', 'set_alarm'],
    lastUpdated: Date.now(),
  },
  location: {
    id: 'location',
    name: 'Location & Maps',
    description: 'Provide directions, navigation, and location-based searches',
    status: 'allowed',
    category: 'hardware',
    requiredFor: ['open_maps'],
    lastUpdated: Date.now(),
  },
  microphone: {
    id: 'microphone',
    name: 'Microphone & Voice',
    description: 'Enable voice commands, live audio streaming, and voice notes',
    status: 'allowed',
    category: 'hardware',
    requiredFor: [],
    lastUpdated: Date.now(),
  },
  camera: {
    id: 'camera',
    name: 'Camera',
    description: 'Capture photos or launch camera for sharing media',
    status: 'optional',
    category: 'hardware',
    requiredFor: ['share_file', 'open_app'],
    lastUpdated: Date.now(),
  },
  files: {
    id: 'files',
    name: 'Files & Storage',
    description: 'Access and attach documents, images, and downloads for sharing',
    status: 'allowed',
    category: 'system',
    requiredFor: ['share_file'],
    lastUpdated: Date.now(),
  },
};

export class PermissionManager {
  private static instance: PermissionManager;
  private permissions: Record<DevicePermissionKey, DevicePermissionItem>;
  private trustedAutoSendContacts: Set<string>;

  private constructor() {
    this.permissions = { ...DEFAULT_PERMISSIONS };
    this.trustedAutoSendContacts = new Set();
    this.loadState();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private loadState(): void {
    if (typeof window === 'undefined') return;
    try {
      const savedPerms = localStorage.getItem(STORAGE_KEY);
      if (savedPerms) {
        const parsed = JSON.parse(savedPerms);
        this.permissions = { ...DEFAULT_PERMISSIONS, ...parsed };
      }

      const savedTrusted = localStorage.getItem(TRUSTED_AUTO_SEND_KEY);
      if (savedTrusted) {
        this.trustedAutoSendContacts = new Set(JSON.parse(savedTrusted));
      }
    } catch (e) {
      console.warn('Could not load permissions from storage', e);
    }
  }

  private saveState(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.permissions));
      localStorage.setItem(
        TRUSTED_AUTO_SEND_KEY,
        JSON.stringify(Array.from(this.trustedAutoSendContacts))
      );
    } catch (e) {
      console.warn('Could not save permissions to storage', e);
    }
  }

  public getAllPermissions(): DevicePermissionItem[] {
    return Object.values(this.permissions);
  }

  public getPermission(key: DevicePermissionKey): DevicePermissionItem {
    return this.permissions[key] || DEFAULT_PERMISSIONS[key];
  }

  public isAllowed(key: DevicePermissionKey): boolean {
    const perm = this.permissions[key];
    if (!perm) return false;
    return perm.status === 'allowed' || perm.status === 'connected' || perm.status === 'optional';
  }

  public checkPermissionsForTool(requiredKeys: DevicePermissionKey[]): {
    allAllowed: boolean;
    missingKeys: DevicePermissionKey[];
  } {
    const missingKeys = requiredKeys.filter((k) => !this.isAllowed(k));
    return {
      allAllowed: missingKeys.length === 0,
      missingKeys,
    };
  }

  public setPermission(key: DevicePermissionKey, status: PermissionStatus): void {
    if (this.permissions[key]) {
      this.permissions[key] = {
        ...this.permissions[key],
        status,
        lastUpdated: Date.now(),
      };
      this.saveState();
    }
  }

  public revokeAll(): void {
    for (const key of Object.keys(this.permissions) as DevicePermissionKey[]) {
      this.permissions[key].status = 'denied';
      this.permissions[key].lastUpdated = Date.now();
    }
    this.saveState();
  }

  public resetToDefaults(): void {
    this.permissions = { ...DEFAULT_PERMISSIONS };
    this.saveState();
  }

  public isTrustedAutoSend(contactIdOrPhone: string): boolean {
    if (!contactIdOrPhone) return false;
    return this.trustedAutoSendContacts.has(contactIdOrPhone.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  public setTrustedAutoSend(contactIdOrPhone: string, trusted: boolean): void {
    const clean = contactIdOrPhone.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!clean) return;
    if (trusted) {
      this.trustedAutoSendContacts.add(clean);
    } else {
      this.trustedAutoSendContacts.delete(clean);
    }
    this.saveState();
  }
}

export const permissionManager = PermissionManager.getInstance();
