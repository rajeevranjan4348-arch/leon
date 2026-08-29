import { MessagingAdapter } from './MessagingAdapter';
import { TargetMessagingApp, AppSelectors } from '../types';
import { contactResolver } from '@/lib/communicationAgent/contactResolver';
import { sanitizePhoneForWhatsApp, buildWhatsAppUrls } from '@/lib/whatsappService';

export class WhatsAppAdapter implements MessagingAdapter {
  public readonly appName = 'WhatsApp';
  public readonly appType: TargetMessagingApp = 'whatsapp';
  public readonly packageName = 'com.whatsapp';
  public readonly deepLinkScheme = 'whatsapp://';

  public readonly selectors: AppSelectors = {
    searchButton: {
      resourceId: 'com.whatsapp:id/menuitem_search',
      contentDescription: /Search|Search…/i,
      isClickable: true,
    },
    searchInput: {
      resourceId: 'com.whatsapp:id/search_src_text',
      text: /Search…|Search/i,
      isEditable: true,
    },
    contactListItem: {
      resourceId: 'com.whatsapp:id/conversations_row_contact_name',
      isClickable: true,
    },
    messageInput: {
      resourceId: 'com.whatsapp:id/entry',
      text: /Type a message|Message/i,
      isEditable: true,
    },
    sendButton: {
      resourceId: 'com.whatsapp:id/send',
      contentDescription: /Send/i,
      isClickable: true,
    },
    headerTitle: {
      resourceId: 'com.whatsapp:id/conversation_contact_name',
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
    const phone = contact?.phone || phoneOrTarget;
    const { waMeUrl } = buildWhatsAppUrls(phone, text);
    return waMeUrl;
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
    return `Send WhatsApp message to ${contact}: "${message}"?`;
  }

  public getSendSuccessMessage(contact: string): string {
    return `Message sent to ${contact} on WhatsApp.`;
  }
}
