import { MessagingAdapter } from './MessagingAdapter';
import { TargetMessagingApp, AppSelectors } from '../types';
import { contactResolver } from '@/lib/communicationAgent/contactResolver';

export class SMSAdapter implements MessagingAdapter {
  public readonly appName = 'Messages';
  public readonly appType: TargetMessagingApp = 'sms';
  public readonly packageName = 'com.google.android.apps.messaging';
  public readonly deepLinkScheme = 'sms:';

  public readonly selectors: AppSelectors = {
    searchButton: {
      resourceId: 'com.google.android.apps.messaging:id/start_chat_fab',
      contentDescription: /Start chat/i,
      isClickable: true,
    },
    searchInput: {
      resourceId: 'com.google.android.apps.messaging:id/recipient_text_view',
      text: /Type names, phone numbers/i,
      isEditable: true,
    },
    contactListItem: {
      resourceId: 'com.google.android.apps.messaging:id/contact_name',
      isClickable: true,
    },
    messageInput: {
      resourceId: 'com.google.android.apps.messaging:id/compose_message_text',
      text: /Text message|Chat message/i,
      isEditable: true,
    },
    sendButton: {
      resourceId: 'com.google.android.apps.messaging:id/send_message_button',
      contentDescription: /Send SMS|Send MMS|Send/i,
      isClickable: true,
    },
    headerTitle: {
      resourceId: 'com.google.android.apps.messaging:id/conversation_title',
    },
  };

  public isSupported(): boolean {
    return true;
  }

  public getLaunchIntent(): string {
    return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_MESSAGING;end`;
  }

  public buildDirectChatUrl(phoneOrTarget: string, text: string = ''): string {
    const contact = contactResolver.resolve(phoneOrTarget).exactMatch;
    const phone = contact?.phone || phoneOrTarget.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(text);
    return phone ? `sms:${phone}?body=${encodedBody}` : `sms:?body=${encodedBody}`;
  }

  public resolveContactTarget(contactQuery: string): { name: string; phone?: string } {
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
    return `Send SMS to ${contact}: "${message}"?`;
  }

  public getSendSuccessMessage(contact: string): string {
    return `SMS text message sent to ${contact}.`;
  }
}
