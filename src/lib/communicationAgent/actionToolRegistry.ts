import {
  CommunicationToolType,
  DevicePermissionKey,
  ToolExecutionResult,
  RecentMessageItem,
} from './types';
import { permissionManager } from './permissionManager';
import { contactResolver } from './contactResolver';
import { auditLogger } from './auditLogger';
import { sanitizePhoneForWhatsApp, buildWhatsAppUrls } from '../whatsappService';
import { universalAppLauncher } from '../launcher/UniversalAppLauncher';
import { toast } from 'sonner';

export class ActionToolRegistry {
  private static instance: ActionToolRegistry;

  private constructor() {}

  public static getInstance(): ActionToolRegistry {
    if (!ActionToolRegistry.instance) {
      ActionToolRegistry.instance = new ActionToolRegistry();
    }
    return ActionToolRegistry.instance;
  }

  /**
   * 1. findContact
   */
  public findContact(query: string): ToolExecutionResult {
    const permCheck = permissionManager.checkPermissionsForTool(['contacts']);
    if (!permCheck.allAllowed) {
      auditLogger.log({
        toolType: 'find_contact',
        target: query,
        summary: `Find contact: ${query} (Permission Denied)`,
        status: 'failed',
        permissionChecked: ['contacts'],
        details: 'Contacts permission is revoked in AI Device Permissions',
      });
      return {
        success: false,
        toolType: 'find_contact',
        message: 'I need Contacts permission to find contacts on this device.',
        errorReason: 'contacts_permission_denied',
        timestamp: Date.now(),
      };
    }

    const res = contactResolver.resolve(query);
    if (res.exactMatch) {
      auditLogger.log({
        toolType: 'find_contact',
        target: query,
        summary: `Found contact: ${res.exactMatch.displayName}`,
        status: 'success',
        permissionChecked: ['contacts'],
      });
      return {
        success: true,
        toolType: 'find_contact',
        targetName: res.exactMatch.displayName,
        targetPhone: res.exactMatch.phone,
        message: `Found contact ${res.exactMatch.displayName} (${res.exactMatch.phone})`,
        timestamp: Date.now(),
      };
    }

    auditLogger.log({
      toolType: 'find_contact',
      target: query,
      summary: `Contact not found: ${query}`,
      status: 'failed',
      permissionChecked: ['contacts'],
    });

    return {
      success: false,
      toolType: 'find_contact',
      message: `I couldn't find "${query}" in your contacts.`,
      errorReason: 'contact_not_found',
      timestamp: Date.now(),
    };
  }

  /**
   * 2. sendSMS
   */
  public sendSMS(
    target: string,
    messageText: string,
    options?: { autoLaunch?: boolean }
  ): ToolExecutionResult {
    const requiredPerms: DevicePermissionKey[] = ['sms', 'contacts'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      const missingName = permCheck.missingKeys.join(', ');
      auditLogger.log({
        toolType: 'send_sms',
        target,
        summary: `Send SMS to ${target} (Permission Denied: ${missingName})`,
        status: 'failed',
        permissionChecked: requiredPerms,
      });
      return {
        success: false,
        toolType: 'send_sms',
        message: `I need ${missingName.toUpperCase()} permission to send text messages.`,
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    const contact = contactResolver.resolve(target).exactMatch;
    const phone = contact?.phone || target.replace(/[^0-9+]/g, '');
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const encodedBody = encodeURIComponent(messageText);

    // Standard SMS URI Scheme (RFC 5724): sms:+123456789?body=Hello
    // iOS and Android both honor sms: schemes
    const smsUrl = cleanPhone ? `sms:${cleanPhone}?body=${encodedBody}` : `sms:?body=${encodedBody}`;
    const intentUrl = `intent:${cleanPhone}?body=${encodedBody}#Intent;action=android.intent.action.SENDTO;type=text/plain;end`;

    auditLogger.log({
      toolType: 'send_sms',
      target: contact?.displayName || target,
      summary: `Prepared SMS to ${contact?.displayName || target}: "${messageText}"`,
      status: 'success',
      permissionChecked: requiredPerms,
      details: `SMS Scheme: ${smsUrl}`,
    });

    if (options?.autoLaunch !== false && typeof window !== 'undefined') {
      try {
        window.location.href = smsUrl;
      } catch (e) {
        console.warn('SMS scheme launch handled', e);
      }
    }

    return {
      success: true,
      toolType: 'send_sms',
      targetName: contact?.displayName || target,
      targetPhone: phone,
      payloadText: messageText,
      actionUrl: smsUrl,
      intentUrl,
      message: `SMS ready for ${contact?.displayName || target}: "${messageText}"`,
      timestamp: Date.now(),
    };
  }

  /**
   * 3. openMessages
   */
  public openMessages(target?: string): ToolExecutionResult {
    const requiredPerms: DevicePermissionKey[] = ['sms'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'open_messages',
        message: 'Messages permission is required.',
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    let targetPhone = '';
    let targetName = '';
    if (target) {
      const contact = contactResolver.resolve(target).exactMatch;
      targetPhone = contact?.phone || target.replace(/[^0-9+]/g, '');
      targetName = contact?.displayName || target;
    }

    const actionUrl = targetPhone ? `sms:${targetPhone}` : 'sms:';

    auditLogger.log({
      toolType: 'open_messages',
      target: targetName || 'Messages App',
      summary: `Opening Messages application`,
      status: 'success',
      permissionChecked: requiredPerms,
    });

    if (typeof window !== 'undefined') {
      window.location.href = actionUrl;
    }

    return {
      success: true,
      toolType: 'open_messages',
      targetName,
      targetPhone,
      actionUrl,
      message: `Opening Messages...`,
      timestamp: Date.now(),
    };
  }

  /**
   * 4. sendWhatsAppMessage
   */
  public sendWhatsAppMessage(
    target: string,
    messageText: string,
    options?: { autoLaunch?: boolean }
  ): ToolExecutionResult {
    const requiredPerms: DevicePermissionKey[] = ['whatsapp', 'contacts'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      const missing = permCheck.missingKeys.join(', ');
      auditLogger.log({
        toolType: 'send_whatsapp',
        target,
        summary: `WhatsApp to ${target} (Permission Denied: ${missing})`,
        status: 'failed',
        permissionChecked: requiredPerms,
      });
      return {
        success: false,
        toolType: 'send_whatsapp',
        message: `I need ${missing.toUpperCase()} permission to connect to WhatsApp.`,
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    const contact = contactResolver.resolve(target).exactMatch;
    const phone = contact?.phone || target;
    const { waMeUrl, webUrl, intentScheme } = buildWhatsAppUrls(phone, messageText);

    auditLogger.log({
      toolType: 'send_whatsapp',
      target: contact?.displayName || target,
      summary: `WhatsApp message to ${contact?.displayName || target}: "${messageText}"`,
      status: 'success',
      permissionChecked: requiredPerms,
      details: waMeUrl,
    });

    if (options?.autoLaunch !== false && typeof window !== 'undefined') {
      const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = waMeUrl;
      } else {
        window.open(webUrl, '_blank');
      }
    }

    return {
      success: true,
      toolType: 'send_whatsapp',
      targetName: contact?.displayName || target,
      targetPhone: phone,
      payloadText: messageText,
      actionUrl: waMeUrl,
      webUrl,
      intentUrl: intentScheme,
      message: `WhatsApp message ready for ${contact?.displayName || target}: "${messageText}"`,
      timestamp: Date.now(),
    };
  }

  /**
   * 5. openWhatsAppChat
   */
  public openWhatsAppChat(target: string): ToolExecutionResult {
    return this.sendWhatsAppMessage(target, '', { autoLaunch: true });
  }

  /**
   * 6. startPhoneCall
   */
  public startPhoneCall(target: string, options?: { autoLaunch?: boolean }): ToolExecutionResult {
    const requiredPerms: DevicePermissionKey[] = ['phone', 'contacts'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      auditLogger.log({
        toolType: 'start_phone_call',
        target,
        summary: `Call ${target} (Phone Permission Denied)`,
        status: 'failed',
        permissionChecked: requiredPerms,
      });
      return {
        success: false,
        toolType: 'start_phone_call',
        message: 'Phone Calling permission is required to initiate phone calls.',
        errorReason: 'phone_permission_denied',
        timestamp: Date.now(),
      };
    }

    const contact = contactResolver.resolve(target).exactMatch;
    const phone = contact?.phone || target;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    if (!cleanPhone) {
      return {
        success: false,
        toolType: 'start_phone_call',
        message: `Could not find a valid phone number for ${target}.`,
        errorReason: 'no_phone_number',
        timestamp: Date.now(),
      };
    }

    const telUrl = `tel:${cleanPhone}`;

    auditLogger.log({
      toolType: 'start_phone_call',
      target: contact?.displayName || target,
      summary: `Placing phone call to ${contact?.displayName || target} (${cleanPhone})`,
      status: 'success',
      permissionChecked: requiredPerms,
      details: telUrl,
    });

    if (options?.autoLaunch !== false && typeof window !== 'undefined') {
      window.location.href = telUrl;
    }

    return {
      success: true,
      toolType: 'start_phone_call',
      targetName: contact?.displayName || target,
      targetPhone: cleanPhone,
      actionUrl: telUrl,
      message: `Calling ${contact?.displayName || target}...`,
      timestamp: Date.now(),
    };
  }

  /**
   * 7. startWhatsAppCall
   */
  public startWhatsAppCall(target: string, isVideo = false): ToolExecutionResult {
    const requiredPerms: DevicePermissionKey[] = ['whatsapp', 'phone', 'contacts'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'start_whatsapp_call',
        message: 'WhatsApp and Phone permissions are required for calling.',
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    const contact = contactResolver.resolve(target).exactMatch;
    const phone = contact?.phone || target;
    const digits = sanitizePhoneForWhatsApp(phone);
    const waUrl = `https://wa.me/${digits}`;

    auditLogger.log({
      toolType: 'start_whatsapp_call',
      target: contact?.displayName || target,
      summary: `WhatsApp ${isVideo ? 'video' : 'voice'} call to ${contact?.displayName || target}`,
      status: 'success',
      permissionChecked: requiredPerms,
    });

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }

    return {
      success: true,
      toolType: 'start_whatsapp_call',
      targetName: contact?.displayName || target,
      targetPhone: phone,
      actionUrl: waUrl,
      message: `Starting WhatsApp ${isVideo ? 'video' : 'voice'} call with ${contact?.displayName || target}...`,
      timestamp: Date.now(),
    };
  }

  /**
   * 8. readAllowedMessages
   */
  public readAllowedMessages(sender?: string): { success: boolean; messages: RecentMessageItem[]; error?: string } {
    const requiredPerms: DevicePermissionKey[] = ['whatsapp', 'sms', 'notifications'];
    const permCheck = permissionManager.checkPermissionsForTool(requiredPerms);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        messages: [],
        error: 'Notifications or Message reading permission is revoked.',
      };
    }

    const sampleRecentMessages: RecentMessageItem[] = [
      {
        id: 'msg_dad_1',
        senderName: 'Dad',
        senderPhone: '+1 (800) 555-0102',
        platform: 'whatsapp',
        previewText: 'Remember to pick up the groceries on your way back.',
        timestamp: Date.now() - 1000 * 60 * 15,
        isRead: false,
        unreadCount: 1,
      },
      {
        id: 'msg_rahul_1',
        senderName: 'Rahul Sharma',
        senderPhone: '+1 (555) 234-5678',
        platform: 'whatsapp',
        previewText: 'Hey, are we still meeting for the code review at 4 PM?',
        timestamp: Date.now() - 1000 * 60 * 45,
        isRead: false,
        unreadCount: 2,
      },
      {
        id: 'msg_mom_1',
        senderName: 'Mom',
        senderPhone: '+1 (800) 555-0101',
        platform: 'sms',
        previewText: 'Let me know when you reach home safely!',
        timestamp: Date.now() - 1000 * 60 * 120,
        isRead: true,
      },
    ];

    if (sender) {
      const senderLower = sender.toLowerCase();
      const filtered = sampleRecentMessages.filter((m) =>
        m.senderName.toLowerCase().includes(senderLower)
      );
      return { success: true, messages: filtered };
    }

    return { success: true, messages: sampleRecentMessages };
  }

  /**
   * 9. openApp / launch_app
   */
  public openApp(appName: string): ToolExecutionResult {
    const launchRes = universalAppLauncher.launchApp(appName);

    if (launchRes.isAmbiguous && launchRes.ambiguousMatches) {
      const matchNames = launchRes.ambiguousMatches.map(m => m.name).join(', ');
      auditLogger.log({
        toolType: 'open_app',
        target: appName,
        summary: `Ambiguous app launch: ${appName} (${matchNames})`,
        status: 'failed',
        permissionChecked: [],
        details: 'Multiple apps matched user query',
      });
      return {
        success: false,
        toolType: 'open_app',
        targetName: appName,
        message: launchRes.message,
        errorReason: 'ambiguous_match',
        timestamp: Date.now(),
      };
    }

    toast.success(`Opening ${launchRes.appName || appName}...`);

    auditLogger.log({
      toolType: 'open_app',
      target: launchRes.appName || appName,
      summary: `Launched real app ${launchRes.appName || appName} (${launchRes.packageName || 'app'})`,
      status: 'success',
      permissionChecked: [],
    });

    return {
      success: true,
      toolType: 'open_app',
      targetName: launchRes.appName || appName,
      actionUrl: launchRes.marketUri || '',
      message: launchRes.message || `Opening ${launchRes.appName || appName}...`,
      timestamp: Date.now(),
    };
  }

  /**
   * 9b. searchInstalledApps
   */
  public searchInstalledApps(query: string) {
    const results = universalAppLauncher.searchApps(query);
    return results.map(r => ({
      name: r.name,
      package_name: r.packageName,
      category: r.category,
      launchable: r.launchable,
      is_system_app: Boolean(r.isSystemApp),
    }));
  }

  /**
   * 10. openMaps
   */
  public openMaps(destination: string): ToolExecutionResult {
    const permCheck = permissionManager.checkPermissionsForTool(['location']);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'open_maps',
        message: 'Location permission is required to navigate.',
        errorReason: 'location_permission_denied',
        timestamp: Date.now(),
      };
    }

    const encoded = encodeURIComponent(destination);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    const geoScheme = `geo:0,0?q=${encoded}`;

    auditLogger.log({
      toolType: 'open_maps',
      target: destination,
      summary: `Directions to: ${destination}`,
      status: 'success',
      permissionChecked: ['location'],
    });

    if (typeof window !== 'undefined') {
      window.open(mapsUrl, '_blank');
    }

    return {
      success: true,
      toolType: 'open_maps',
      targetName: destination,
      actionUrl: mapsUrl,
      webUrl: mapsUrl,
      intentUrl: geoScheme,
      message: `Opening Maps directions for ${destination}...`,
      timestamp: Date.now(),
    };
  }

  /**
   * 11. createReminder
   */
  public createReminder(reminderText: string, timeText?: string): ToolExecutionResult {
    const permCheck = permissionManager.checkPermissionsForTool(['calendar', 'notifications']);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'create_reminder',
        message: 'Calendar and Notifications permissions are required for reminders.',
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    const reminderId = `reminder_${Date.now()}`;
    const item = {
      id: reminderId,
      text: reminderText,
      time: timeText || 'Today',
      createdAt: Date.now(),
    };

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('rishi_user_reminders');
        const list = stored ? JSON.parse(stored) : [];
        list.push(item);
        localStorage.setItem('rishi_user_reminders', JSON.stringify(list));
      } catch (e) {}
    }

    // Try browser notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Reminder Set', {
          body: `${reminderText} (${timeText || 'Upcoming'})`,
          icon: '/favicon.ico',
        });
      } catch (e) {}
    }

    toast.success(`Reminder set: "${reminderText}" ${timeText ? `at ${timeText}` : ''}`);

    auditLogger.log({
      toolType: 'create_reminder',
      target: reminderText,
      summary: `Set reminder: "${reminderText}" (${timeText || 'Now'})`,
      status: 'success',
      permissionChecked: ['calendar', 'notifications'],
    });

    return {
      success: true,
      toolType: 'create_reminder',
      payloadText: reminderText,
      message: `Reminder created: "${reminderText}" for ${timeText || 'scheduled time'}.`,
      timestamp: Date.now(),
    };
  }

  /**
   * 12. setAlarm
   */
  public setAlarm(timeStr: string, label = 'Alarm'): ToolExecutionResult {
    const permCheck = permissionManager.checkPermissionsForTool(['calendar', 'notifications']);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'set_alarm',
        message: 'Alarm & Notification permissions required.',
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    toast.success(`Alarm set for ${timeStr} (${label})`);

    auditLogger.log({
      toolType: 'set_alarm',
      target: timeStr,
      summary: `Alarm set for ${timeStr} - ${label}`,
      status: 'success',
      permissionChecked: ['calendar', 'notifications'],
    });

    return {
      success: true,
      toolType: 'set_alarm',
      payloadText: `${label} at ${timeStr}`,
      message: `Alarm set for ${timeStr}.`,
      timestamp: Date.now(),
    };
  }

  /**
   * 13. createCalendarEvent
   */
  public createCalendarEvent(title: string, dateStr?: string, timeStr?: string): ToolExecutionResult {
    const permCheck = permissionManager.checkPermissionsForTool(['calendar']);
    if (!permCheck.allAllowed) {
      return {
        success: false,
        toolType: 'create_calendar_event',
        message: 'Calendar permission required.',
        errorReason: 'permission_denied',
        timestamp: Date.now(),
      };
    }

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&details=${encodeURIComponent('Scheduled via Rishi AI Assistant')}`;

    auditLogger.log({
      toolType: 'create_calendar_event',
      target: title,
      summary: `Calendar event: "${title}"`,
      status: 'success',
      permissionChecked: ['calendar'],
    });

    if (typeof window !== 'undefined') {
      window.open(gcalUrl, '_blank');
    }

    return {
      success: true,
      toolType: 'create_calendar_event',
      targetName: title,
      actionUrl: gcalUrl,
      webUrl: gcalUrl,
      message: `Calendar event created for "${title}".`,
      timestamp: Date.now(),
    };
  }

  /**
   * 14. executeAndroidControlCommand
   */
  public async executeAndroidControlCommand(
    command: {
      action: 'send_message' | 'open_app' | 'open_chat' | 'reply_message' | 'cancel_action' | 'get_status';
      target_app: 'whatsapp' | 'sms' | 'telegram' | 'messages' | 'phone' | 'auto';
      contact?: string;
      message?: string;
      phone?: string;
      requires_confirmation?: boolean;
    }
  ): Promise<ToolExecutionResult> {
    const { androidControlEngine } = await import('@/lib/androidControl/AndroidControlEngine');
    const { adapterRegistry } = await import('@/lib/androidControl/adapters/AdapterRegistry');

    if (command.action === 'cancel_action') {
      androidControlEngine.cancel();
      return {
        success: true,
        toolType: 'cancel_action',
        message: 'Action cancelled.',
        timestamp: Date.now(),
      };
    }

    const adapter = adapterRegistry.getAdapter(command.target_app);
    const res = await androidControlEngine.prepareMessageFlow({
      action: command.action,
      target_app: command.target_app,
      contact: command.contact,
      message: command.message,
      phone: command.phone,
      requires_confirmation: command.requires_confirmation ?? true,
    });

    return {
      success: res.success,
      toolType: 'android_control',
      targetName: res.contact || command.contact,
      targetPhone: res.phone || command.phone,
      payloadText: res.message || command.message,
      actionUrl: adapter.buildDirectChatUrl(res.phone || res.contact || '', res.message || ''),
      message: res.humanResponse,
      errorReason: res.errorReason,
      timestamp: Date.now(),
    };
  }

  /**
   * 15. cancelActiveAction
   */
  public cancelActiveAction(): ToolExecutionResult {
    import('@/lib/androidControl/AndroidControlEngine').then(({ androidControlEngine }) => {
      androidControlEngine.cancel();
    });
    return {
      success: true,
      toolType: 'cancel_action',
      message: 'Active automation action has been stopped.',
      timestamp: Date.now(),
    };
  }

  /**
   * 16. writeImprovementProposal
   */
  public async writeImprovementProposal(args: {
    title: string;
    problem: string;
    observedBehavior: string;
    expectedBehavior: string;
    rootCause: string;
    affectedFiles: string[];
    proposedChange: string;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    expectedBenefit: string;
    testPlan: string;
  }): Promise<ToolExecutionResult> {
    const { selfImprovementEngine } = await import('@/ai/selfImprovement');
    const proposal = selfImprovementEngine.createProposal(args);
    return {
      success: true,
      toolType: 'write_improvement_proposal' as CommunicationToolType,
      message: `Created improvement proposal "${proposal.title}" (ID: ${proposal.id}). Explicit user approval is required to apply.`,
      payloadText: JSON.stringify(proposal),
      timestamp: Date.now(),
    };
  }

  /**
   * 17. applyApprovedProposal
   */
  public async applyApprovedProposal(proposalId: string): Promise<ToolExecutionResult> {
    const { selfImprovementEngine } = await import('@/ai/selfImprovement');
    const res = await selfImprovementEngine.applyApprovedProposal(proposalId);
    return {
      success: res.success,
      toolType: 'apply_approved_proposal' as CommunicationToolType,
      message: res.message,
      errorReason: res.error,
      timestamp: Date.now(),
    };
  }

  /**
   * 18. retrieveRelevantLessons
   */
  public async retrieveRelevantLessons(query: string, feature?: string): Promise<ToolExecutionResult> {
    const { selfImprovementEngine } = await import('@/ai/selfImprovement');
    const contextText = selfImprovementEngine.getPromptLessonContext(query, feature);
    return {
      success: true,
      toolType: 'retrieve_relevant_lessons' as CommunicationToolType,
      payloadText: contextText,
      message: contextText || 'No prior relevant failure lessons found for this query.',
      timestamp: Date.now(),
    };
  }
}

export const actionToolRegistry = ActionToolRegistry.getInstance();

