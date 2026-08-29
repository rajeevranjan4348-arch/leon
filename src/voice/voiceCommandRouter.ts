import { appController, AppControllerArgs, ToolResult } from '@/controllers/appController';
import { speakTextWithPersona } from '@/lib/voiceService';
import { universalAppLauncher } from '@/lib/launcher/UniversalAppLauncher';
import { appResolver } from '@/lib/launcher/AppResolver';
import { toast } from 'sonner';

export interface PendingVoiceAction {
  action: 'delete_chat' | 'delete_all_chats';
  chatId?: string;
  promptText: string;
}

class VoiceCommandRouter {
  private static instance: VoiceCommandRouter;
  private pendingConfirmation: PendingVoiceAction | null = null;

  private constructor() {}

  public static getInstance(): VoiceCommandRouter {
    if (!VoiceCommandRouter.instance) {
      VoiceCommandRouter.instance = new VoiceCommandRouter();
    }
    return VoiceCommandRouter.instance;
  }

  /**
   * Check if user spoken input matches a UI command or pending confirmation.
   * Returns true if handled as a voice command, false if it should be processed as a standard chat query.
   */
  public async processVoiceInput(
    rawInput: string,
    options?: {
      speakFeedback?: boolean;
      currentThreadId?: string;
    }
  ): Promise<{ isCommand: boolean; result?: ToolResult; textFeedback?: string }> {
    if (!rawInput || typeof rawInput !== 'string') {
      return { isCommand: false };
    }

    const cleanInput = rawInput.trim().toLowerCase();
    const speak = options?.speakFeedback !== false;

    // 1. Handle Pending Confirmation State for Destructive Actions
    if (this.pendingConfirmation) {
      if (/\b(yes|confirm|sure|do it|ok|yeah|yep|delete)\b/i.test(cleanInput)) {
        const pending = this.pendingConfirmation;
        this.pendingConfirmation = null;

        let result: ToolResult;
        if (pending.action === 'delete_chat') {
          result = await appController.execute({
            action: 'delete_chat',
            chatId: pending.chatId || options?.currentThreadId,
          });
        } else {
          result = await appController.execute({
            action: 'delete_chat',
            target: 'all',
          });
        }

        const feedbackMsg = 'Conversation deleted.';
        toast.success(feedbackMsg);
        if (speak) {
          speakTextWithPersona(feedbackMsg);
        }

        return { isCommand: true, result, textFeedback: feedbackMsg };
      }

      if (/\b(no|cancel|stop|don't|dont|nevermind|keep)\b/i.test(cleanInput)) {
        this.pendingConfirmation = null;
        const feedbackMsg = 'Deletion cancelled.';
        toast.info(feedbackMsg);
        if (speak) {
          speakTextWithPersona(feedbackMsg);
        }
        return { isCommand: true, textFeedback: feedbackMsg };
      }
    }

    // 2. Destructive Commands Intent Detection -> Ask Confirmation First!
    if (/\b(delete this chat|delete conversation|remove chat|delete current chat|delete chat)\b/i.test(cleanInput)) {
      this.pendingConfirmation = {
        action: 'delete_chat',
        chatId: options?.currentThreadId,
        promptText: 'Do you want me to delete this chat?',
      };

      const promptMsg = 'Do you want me to delete this chat? Say yes to confirm.';
      toast.warning('Confirm Chat Deletion', { description: 'Say "yes" or "confirm" to proceed.' });
      if (speak) {
        speakTextWithPersona(promptMsg);
      }
      return { isCommand: true, textFeedback: promptMsg };
    }

    if (/\b(delete all chats|clear all history|delete all conversations|clear history)\b/i.test(cleanInput)) {
      this.pendingConfirmation = {
        action: 'delete_all_chats',
        promptText: 'Do you want me to delete all conversations?',
      };

      const promptMsg = 'Do you want me to delete all conversations? Say yes to confirm.';
      toast.warning('Confirm Delete All Chats', { description: 'Say "yes" or "confirm" to proceed.' });
      if (speak) {
        speakTextWithPersona(promptMsg);
      }
      return { isCommand: true, textFeedback: promptMsg };
    }

    // 3. Harmless UI Commands -> Execute Immediately
    let commandArgs: AppControllerArgs | null = null;
    let spokenFeedback: string = '';

    // History
    if (/\b(open history|show my history|show history|take me to history|view history|chat history|my history)\b/i.test(cleanInput)) {
      commandArgs = { action: 'open_history' };
      spokenFeedback = 'Opening history.';
    }
    // Settings
    else if (/\b(open settings|show settings|app settings|view settings|preferences)\b/i.test(cleanInput)) {
      commandArgs = { action: 'open_settings' };
      spokenFeedback = 'Opening settings.';
    }
    // Contact & Feedback
    else if (/\b(open feedback|show feedback|contact panel|show contact panel|send feedback|bug report|contact support)\b/i.test(cleanInput)) {
      commandArgs = { action: 'open_panel', target: 'contact-feedback' };
      spokenFeedback = 'Opening feedback panel.';
    }
    // Start New Chat
    else if (/\b(start a new chat|start new chat|new chat|new conversation|fresh chat)\b/i.test(cleanInput)) {
      commandArgs = { action: 'start_new_chat' };
      spokenFeedback = 'Starting a new chat.';
    }
    // Switch to Home / Chat
    else if (/\b(switch to home|go to chat|show chat|main screen|back to chat)\b/i.test(cleanInput)) {
      commandArgs = { action: 'switch_tab', tab: 'chat' };
      spokenFeedback = 'Switching to chat.';
    }
    // Sidebar
    else if (/\b(open the sidebar|show sidebar|expand sidebar)\b/i.test(cleanInput)) {
      commandArgs = { action: 'toggle_sidebar', value: true };
      spokenFeedback = 'Opening sidebar.';
    } else if (/\b(close the sidebar|hide sidebar|collapse sidebar)\b/i.test(cleanInput)) {
      commandArgs = { action: 'toggle_sidebar', value: false };
      spokenFeedback = 'Closing sidebar.';
    } else if (/\b(toggle sidebar)\b/i.test(cleanInput)) {
      commandArgs = { action: 'toggle_sidebar' };
      spokenFeedback = 'Toggling sidebar.';
    }
    // Focus / Clear Input
    else if (/\b(focus the message box|focus input|type message|start typing)\b/i.test(cleanInput)) {
      commandArgs = { action: 'focus_input' };
      spokenFeedback = 'Focusing input box.';
    } else if (/\b(clear the message box|clear input)\b/i.test(cleanInput)) {
      commandArgs = { action: 'clear_input' };
      spokenFeedback = 'Input cleared.';
    }
    // Voice Mode Control
    else if (/\b(turn voice mode off|stop voice|stop listening|turn off mic|quiet mode)\b/i.test(cleanInput)) {
      commandArgs = { action: 'stop_voice' };
      spokenFeedback = 'Stopping voice mode.';
    }
    // Scrolling
    else if (/\b(scroll down|page down|go down)\b/i.test(cleanInput)) {
      commandArgs = { action: 'scroll_chat', value: 'down' };
      spokenFeedback = 'Scrolling down.';
    } else if (/\b(scroll up|page up|go up)\b/i.test(cleanInput)) {
      commandArgs = { action: 'scroll_chat', value: 'up' };
      spokenFeedback = 'Scrolling up.';
    }

    if (commandArgs) {
      const result = await appController.execute(commandArgs);
      if (spokenFeedback) {
        toast.info(spokenFeedback, { duration: 2000 });
        if (speak) {
          speakTextWithPersona(spokenFeedback);
        }
      }
      return { isCommand: true, result, textFeedback: spokenFeedback };
    }

    // 4. Android App Launcher Intent Detection ("Open YouTube", "Launch Chrome", "Start Calculator", "Go to Settings")
    const appLaunchMatch = cleanInput.match(
      /^(?:can\s+you\s+|please\s+|could\s+you\s+|i\s+want\s+to\s+|hey\s+rishi\s+|rishi\s+|will\s+you\s+)?(?:open|launch|start|run|go\s+to|show\s+me|show|bring\s+up|fire\s+up|load|execute)\s+(?:the\s+|my\s+)?([a-zA-Z0-9\s._-]+?)(?:\s+app|\s+application|\s+for\s+me|\s+now|\s+on\s+my\s+phone|\s+on\s+phone)?$/i
    );

    if (appLaunchMatch) {
      const rawAppName = appLaunchMatch[1].trim();
      const internalUiTargets = ['history', 'feedback', 'sidebar', 'message box', 'input', 'chat'];
      
      if (rawAppName && rawAppName.length >= 2 && !internalUiTargets.includes(rawAppName.toLowerCase())) {
        console.log(`[VOICE] recognizedText = "${rawInput}"`);
        console.log(`[ACTION] type = OPEN_APP appName = "${rawAppName}"`);

        const launchResult = await appResolver.openApp(rawAppName);

        let feedbackText = '';
        if (launchResult.ambiguousMatches && launchResult.ambiguousMatches.length > 0) {
          const matchNames = launchResult.ambiguousMatches.map(m => m.name).join(', ');
          feedbackText = `Which app do you mean? I found ${launchResult.ambiguousMatches.length} matching apps: ${matchNames}.`;
        } else if (!launchResult.success) {
          if (!launchResult.installed && launchResult.playStoreUrl) {
            feedbackText = `"${launchResult.appName || rawAppName}" isn't installed on your phone.`;
            toast.error(feedbackText, {
              description: 'Would you like to open its Google Play Store listing?',
              action: {
                label: 'Open Play Store',
                onClick: () => {
                  if (launchResult.playStoreUrl) {
                    window.open(launchResult.playStoreUrl, '_blank', 'noopener,noreferrer');
                  }
                },
              },
              duration: 8000,
            });
          } else {
            feedbackText = `I couldn't launch ${rawAppName} on your phone.`;
          }
        } else {
          feedbackText = launchResult.message || `Opening ${launchResult.appName || rawAppName}...`;
          toast.success(feedbackText, { duration: 3000 });
        }

        if (speak && feedbackText) {
          speakTextWithPersona(feedbackText);
        }

        return {
          isCommand: true,
          textFeedback: feedbackText,
          result: {
            success: launchResult.success,
            message: feedbackText,
            action: 'open_app',
            installed: launchResult.installed,
            playStoreUrl: launchResult.playStoreUrl,
          },
        };
      }
    }

    return { isCommand: false };
  }

  public cancelPendingConfirmation(): void {
    this.pendingConfirmation = null;
  }
}

export const voiceCommandRouter = VoiceCommandRouter.getInstance();
