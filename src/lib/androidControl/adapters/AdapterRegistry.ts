import { MessagingAdapter } from './MessagingAdapter';
import { WhatsAppAdapter } from './WhatsAppAdapter';
import { SMSAdapter } from './SMSAdapter';
import { TelegramAdapter } from './TelegramAdapter';
import { TargetMessagingApp } from '../types';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<TargetMessagingApp, MessagingAdapter> = new Map();

  private constructor() {
    this.register(new WhatsAppAdapter());
    this.register(new SMSAdapter());
    this.register(new TelegramAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: MessagingAdapter): void {
    this.adapters.set(adapter.appType, adapter);
  }

  public getAdapter(app: TargetMessagingApp | string): MessagingAdapter {
    const normalized = (app || 'whatsapp').toLowerCase();
    if (normalized === 'messages' || normalized === 'sms') {
      return this.adapters.get('sms') || new SMSAdapter();
    }
    if (normalized === 'telegram' || normalized === 'tg') {
      return this.adapters.get('telegram') || new TelegramAdapter();
    }
    return this.adapters.get('whatsapp') || new WhatsAppAdapter();
  }

  public getAllSupportedApps(): string[] {
    return Array.from(this.adapters.values()).map((a) => a.appName);
  }
}

export const adapterRegistry = AdapterRegistry.getInstance();
