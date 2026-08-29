import { MessagingAdapter } from './MessagingAdapter';
import { TargetMessagingApp, AppSelectors } from '../types';
import { contactResolver } from '@/lib/communicationAgent/contactResolver';

export class TelegramAdapter implements MessagingAdapter {
  public readonly appName = 'Telegram';
  public readonly appType: TargetMessagingApp = 'telegram';
  public readonly packageName = 'org.telegram.messenger';
  public readonly deepLinkScheme = 'tg://';

  public readonly selectors: AppSelectors = {
    searchButton: {
      resourceId: 'org.telegram.messenger:id/search_btn',
      contentDescription: /Search/i,
      isClickable: true,
    },
    searchInput: {
      resourceId: 'org.telegram.messenger:id/search_edit_text',
      text: /Search/i,
      isEditable: true,
    },
    contactListItem: {
      resourceId: 'org.telegram.messenger:id/dialog_name',
      isClickable: true,
    },
    messageInput: {
      resourceId: 'org.telegram.messenger:id/chat_text_edit',
      text: /Message/i,
      isEditable: true,
    },
    sendButton: {
      resourceId: 'org.telegram.messenger:id/send_btn',
      contentDescription: /Send/i,
      isClickable: true,
    },
    headerTitle: {
      resourceId: 'org.telegram.messenger:id/action_bar_title',
    },
  };

  public isSupported(): boolean {
    return true;
  }

  public getLaunchIntent(): string {
    return `intent:#Intent;package=${this.packageName};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
  }

  public buildDirectChatUrl(phoneOrTarget: string, text: string = ''): string {
    const contact = contactResolver.resolve(phoneOrTarget).exactMatch;
    const phone = contact?.phone || phoneOrTarget.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(text);
    return phone ? `tg://msg?to=${phone}&text=${encodedBody}` : `tg://msg?text=${encodedBody}`;
  }

  public resolveContactTarget(contactQuery: string): { name: string; phone?: string; username?: string } {
    const contact = contactResolver.resolve(contactQuery).exactMatch;
    if (contact) {
      return {
        name: contact.displayName,
        phone: contact.phone,
      };
    }
    return {
      name: contactQuery,
      phone: contactQuery.replace(/[^0-9+]/g, '') || undefined,
    };
  }

  public formatConfirmationPrompt(contact: string, message: string): string {
    return `Send Telegram message to ${contact}: "${message}"?`;
  }

  public getSendSuccessMessage(contact: string): string {
    return `Message sent to ${contact} on Telegram.`;
  }
}
