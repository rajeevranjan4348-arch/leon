import { TargetMessagingApp, AppSelectors } from '../types';

export interface MessagingAdapter {
  readonly appName: string;
  readonly appType: TargetMessagingApp;
  readonly packageName: string;
  readonly deepLinkScheme: string;
  readonly selectors: AppSelectors;

  isSupported(): boolean;
  getLaunchIntent(): string;
  buildDirectChatUrl(phoneOrUsername: string, text?: string): string;
  resolveContactTarget(contactQuery: string): { name: string; phone?: string; username?: string };
  formatConfirmationPrompt(contact: string, message: string): string;
  getSendSuccessMessage(contact: string): string;
}
