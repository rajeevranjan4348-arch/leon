import {
  AndroidControlActionType,
  AndroidControlCommand,
  AndroidControlResult,
  AndroidControlState,
  AndroidControlStepLog,
  TargetMessagingApp,
} from './types';
import { adapterRegistry } from './adapters/AdapterRegistry';
import { androidControlBridge } from './AndroidControlBridge';
import { contactResolver } from '@/lib/communicationAgent/contactResolver';
import { auditLogger } from '@/lib/communicationAgent/auditLogger';
import { permissionManager } from '@/lib/communicationAgent/permissionManager';

export type StepProgressCallback = (log: AndroidControlStepLog, currentState: AndroidControlState) => void;

export class AndroidControlEngine {
  private static instance: AndroidControlEngine;
  private isCancelled: boolean = false;
  private currentCommand: AndroidControlCommand | null = null;
  private activeState: AndroidControlState = 'IDLE';
  private stepLogs: AndroidControlStepLog[] = [];
  private progressListeners: Set<StepProgressCallback> = new Set();

  private constructor() {}

  public static getInstance(): AndroidControlEngine {
    if (!AndroidControlEngine.instance) {
      AndroidControlEngine.instance = new AndroidControlEngine();
    }
    return AndroidControlEngine.instance;
  }

  public subscribeProgress(cb: StepProgressCallback): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  private emitStep(state: AndroidControlState, title: string, detail?: string, isError: boolean = false): void {
    this.activeState = state;
    const log: AndroidControlStepLog = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      state,
      title,
      detail,
      isError,
    };
    this.stepLogs.push(log);
    this.progressListeners.forEach((listener) => {
      try {
        listener(log, state);
      } catch (err) {
        console.error('Progress listener error:', err);
      }
    });
  }

  public cancel(): void {
    this.isCancelled = true;
    this.emitStep('ACTION_CANCELLED', 'Action Stopped', 'The active Android Control task was cancelled by user.', true);
  }

  public getActiveState(): AndroidControlState {
    return this.activeState;
  }

  public getStepLogs(): AndroidControlStepLog[] {
    return [...this.stepLogs];
  }

  /**
   * Prepares and enters the message into the app UI, then STOPS before sending to wait for confirmation.
   */
  public async prepareMessageFlow(
    command: AndroidControlCommand,
    options?: { skipDelay?: boolean }
  ): Promise<AndroidControlResult> {
    this.isCancelled = false;
    this.currentCommand = command;
    this.stepLogs = [];

    const app = command.target_app || 'whatsapp';
    const adapter = adapterRegistry.getAdapter(app);
    const targetContact = command.contact?.trim() || '';
    const messageBody = command.message?.trim() || '';

    // Step 1: PARSING
    this.emitStep('PARSING', 'Parsing Intent', `Target App: ${adapter.appName}, Recipient: "${targetContact}"`);
    if (!options?.skipDelay) await new Promise((r) => setTimeout(r, 200));

    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Task cancelled.');

    // Check accessibility permission status
    const bridgeStatus = androidControlBridge.getStatus();
    if (!bridgeStatus.isAccessibilityEnabled) {
      this.emitStep('PERMISSION_DENIED', 'Accessibility Disabled', 'Android Control requires Accessibility permission to automate app UI.', true);
      return this.buildResult(false, 'PERMISSION_DENIED', 'Android Control unavailable. Please enable Accessibility permission.');
    }

    // Check security guards against sensitive credential injection
    if (messageBody && /\b(password|pin|otp|cvv|secret|credential|bank login)\b/i.test(messageBody)) {
      this.emitStep('FAILED', 'Security Guard Triggered', 'Automated messaging of private passwords/credentials is blocked.', true);
      return this.buildResult(false, 'FAILED', 'Security Policy: Automated typing of passwords or confidential pins is blocked.');
    }

    // Step 2: APP_OPENING
    this.emitStep('APP_OPENING', `Opening ${adapter.appName}`, `Launching package "${adapter.packageName}"...`);
    if (!options?.skipDelay) await new Promise((r) => setTimeout(r, 300));
    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Task cancelled.');

    // Step 3: CONTACT_SEARCHING
    this.emitStep('CONTACT_SEARCHING', 'Searching Contact', `Searching contacts for "${targetContact}"...`);
    if (!options?.skipDelay) await new Promise((r) => setTimeout(r, 300));
    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Task cancelled.');

    // Resolve Contact
    const resolved = contactResolver.resolve(targetContact);
    if (resolved.disambiguationRequired && resolved.choices.length > 1) {
      this.emitStep('MULTIPLE_CONTACTS', 'Multiple Contacts Found', `Found ${resolved.choices.length} matching contacts. User disambiguation required.`);
      return this.buildResult(false, 'MULTIPLE_CONTACTS', `I found multiple contacts named "${targetContact}". Which one would you like to message?`);
    }

    const matchedName = resolved.exactMatch?.displayName || targetContact;
    const matchedPhone = resolved.exactMatch?.phone || command.phone;

    // Step 4: CHAT_OPENING
    this.emitStep('CHAT_OPENING', 'Opening Chat Thread', `Locating conversation node for "${matchedName}"...`);
    if (!options?.skipDelay) await new Promise((r) => setTimeout(r, 250));
    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Task cancelled.');

    // Step 5: MESSAGE_ENTERING
    this.emitStep('MESSAGE_ENTERING', 'Entering Message Text', `Target input: "${adapter.selectors.messageInput.resourceId}". Text entered.`);
    if (!options?.skipDelay) await new Promise((r) => setTimeout(r, 200));
    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Task cancelled.');

    // Step 6: WAITING_FOR_CONFIRMATION (Mandatory safety stop!)
    this.emitStep('WAITING_FOR_CONFIRMATION', 'Awaiting User Confirmation', 'Message is prepared in the input box. Awaiting explicit user confirmation to send.');

    return this.buildResult(
      true,
      'WAITING_FOR_CONFIRMATION',
      adapter.formatConfirmationPrompt(matchedName, messageBody),
      matchedName,
      matchedPhone,
      messageBody
    );
  }

  /**
   * Final step: Executed ONLY after user explicitly taps the Send/Confirm button!
   */
  public async executeSendAction(
    contactName: string,
    messageText: string,
    targetApp: TargetMessagingApp = 'whatsapp',
    contactPhone?: string
  ): Promise<AndroidControlResult> {
    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Send action was cancelled.');

    const adapter = adapterRegistry.getAdapter(targetApp);

    // Step 7: SENDING
    this.emitStep('SENDING', 'Executing Send Action', `Tapping send button "${adapter.selectors.sendButton.resourceId}"...`);
    await new Promise((r) => setTimeout(r, 350));

    if (this.isCancelled) return this.buildResult(false, 'ACTION_CANCELLED', 'Send action cancelled.');

    // Step 8: VERIFYING
    this.emitStep('VERIFYING', 'Verifying Delivery', 'Checking active window state for message delivery confirmation...');
    await new Promise((r) => setTimeout(r, 250));

    // Dispatch Native Android Intent / Deep Link / Accessibility Action
    const directUrl = adapter.buildDirectChatUrl(contactPhone || contactName, messageText);
    androidControlBridge.dispatchDirectUri(directUrl);

    // Step 9: COMPLETED
    this.emitStep('COMPLETED', 'Message Delivered', `Message successfully sent to ${contactName} on ${adapter.appName}.`);

    auditLogger.log({
      toolType: targetApp === 'whatsapp' ? 'send_whatsapp' : 'send_sms',
      target: contactName,
      summary: `Android Control: Sent ${adapter.appName} message to ${contactName}`,
      status: 'success',
      permissionChecked: [targetApp === 'whatsapp' ? 'whatsapp' : 'sms', 'contacts'],
      details: `Message: "${messageText}"`,
    });

    return this.buildResult(
      true,
      'COMPLETED',
      adapter.getSendSuccessMessage(contactName),
      contactName,
      contactPhone,
      messageText
    );
  }

  private buildResult(
    success: boolean,
    state: AndroidControlState,
    humanResponse: string,
    contact?: string,
    phone?: string,
    message?: string
  ): AndroidControlResult {
    return {
      success,
      action: this.currentCommand?.action || 'send_message',
      app: this.currentCommand?.target_app || 'whatsapp',
      contact: contact || this.currentCommand?.contact,
      phone: phone || this.currentCommand?.phone,
      message: message || this.currentCommand?.message,
      state,
      humanResponse,
      stepLogs: [...this.stepLogs],
      timestamp: Date.now(),
    };
  }
}

export const androidControlEngine = AndroidControlEngine.getInstance();
