import {
  CommunicationToolType,
  ParsedAgentCommand,
  DisambiguationChoice,
} from './types';
import { contactResolver } from './contactResolver';
import { universalAppLauncher } from '../launcher/UniversalAppLauncher';

interface ActionContext {
  lastTargetName?: string;
  lastTargetPhone?: string;
  lastToolType?: CommunicationToolType;
  waitingForMessageBody?: boolean;
  waitingForConfirmation?: boolean;
  timestamp: number;
}

let sessionActionContext: ActionContext | null = null;

export function getSessionActionContext(): ActionContext | null {
  if (sessionActionContext && Date.now() - sessionActionContext.timestamp > 1000 * 60 * 10) {
    sessionActionContext = null; // expire after 10 mins
  }
  return sessionActionContext;
}

export function setSessionActionContext(ctx: Partial<ActionContext>): void {
  sessionActionContext = {
    ...sessionActionContext,
    ...ctx,
    timestamp: Date.now(),
  };
}

export function clearSessionActionContext(): void {
  sessionActionContext = null;
}

/**
 * Natural language intent parser for AI Device and Communication Agent
 */
export function parseCommunicationIntent(rawQuery: string): ParsedAgentCommand {
  const result = parseInternalIntent(rawQuery);
  return {
    ...result,
    isHandled: result.isAgentCommand,
    recipientName: result.targetName,
    recipientPhone: result.targetPhone,
    messageText: result.payloadText,
    spokenResponse: result.spokenResponsePrompt,
  };
}

function parseInternalIntent(rawQuery: string): ParsedAgentCommand {
  const query = rawQuery.trim();
  const lower = query.toLowerCase();

  // 0A. Cancel / Stop command
  if (
    /^(?:cancel(?:\s+the)?(?:\s+messaging|\s+action|\s+task)?|stop(?:\s+the)?(?:\s+action|\s+task|\s+messaging)?|abort|nevermind|don't send)$/i.test(
      lower
    ) ||
    lower === 'cancel' ||
    lower === 'stop'
  ) {
    clearSessionActionContext();
    return {
      isAgentCommand: true,
      toolType: 'cancel_action',
      rawQuery: query,
      requiresConfirmation: false,
      spokenResponsePrompt: 'Action cancelled.',
    };
  }

  const ctx = getSessionActionContext();

  // Multi-step follow up: User responds with message body to a prior "Message Rahul"
  if (ctx && ctx.waitingForMessageBody && ctx.lastTargetName) {
    let body = query;
    // Strip leading "tell him/her/them", "saying", "that"
    body = body.replace(/^(?:tell\s+(?:him|her|them|it)|saying|that|with\s+text)\s+/i, '');
    const tool = ctx.lastToolType || 'send_whatsapp';

    clearSessionActionContext();
    return {
      isAgentCommand: true,
      toolType: tool,
      rawQuery: query,
      targetName: ctx.lastTargetName,
      targetPhone: ctx.lastTargetPhone,
      payloadText: body,
      requiresConfirmation: true,
      spokenResponsePrompt: `Send to ${ctx.lastTargetName}: "${body}"?`,
    };
  }

  // 1. Quoted text patterns: e.g. Send "I'm outside" to Mom on WhatsApp.
  const quotedMatch = query.match(
    /^(?:send|text|message)\s+["'“](.+?)["'”]\s+to\s+([^:]+?)(?:\s+(?:on|via|using)\s+(whatsapp|telegram|sms|messages))?$/i
  );
  if (quotedMatch) {
    const quotedBody = quotedMatch[1].trim();
    let target = quotedMatch[2].trim();
    const appChoice = (quotedMatch[3] || 'whatsapp').toLowerCase();

    const resolved = contactResolver.resolve(target);
    const targetName = resolved.exactMatch?.displayName || target;
    const targetPhone = resolved.exactMatch?.phone;
    const toolType = appChoice === 'sms' || appChoice === 'messages' ? 'send_sms' : 'send_whatsapp';

    return {
      isAgentCommand: true,
      toolType,
      rawQuery: query,
      targetName,
      targetPhone,
      payloadText: quotedBody,
      requiresConfirmation: true,
      needsDisambiguation: resolved.disambiguationRequired,
      disambiguationChoices: resolved.choices,
      spokenResponsePrompt: `Send to ${targetName}: "${quotedBody}"?`,
    };
  }

  // 1. WhatsApp Commands
  const isWhatsApp = /\b(whatsapp|wa|whats app)\b/i.test(lower);

  // 1A. WhatsApp Call: "Call Mom on WhatsApp", "Start a WhatsApp call with Rahul", "WhatsApp call to Rahul"
  if (
    isWhatsApp &&
    (/\b(call|voice call|video call)\b/i.test(lower) || /\b(start\s+(a\s+)?whatsapp\s+call)\b/i.test(lower))
  ) {
    const isVideo = /\bvideo\b/i.test(lower);
    let target = '';
    const match1 = lower.match(/(?:call|voice call|video call)\s+(.+?)(?:\s+on\s+whatsapp|\s+via\s+whatsapp|\s+using\s+whatsapp|$)/i);
    const match2 = lower.match(/start\s+(?:a\s+)?whatsapp\s+(?:video\s+)?call\s+(?:with|to)\s+(.+)/i);
    const match3 = lower.match(/whatsapp\s+(?:video\s+)?call\s+(?:with|to)?\s*(.+)/i);

    if (match2) target = match2[1];
    else if (match3) target = match3[1];
    else if (match1) target = match1[1];

    target = target.replace(/^(?:to|with)\s+/i, '').trim();

    const resolved = contactResolver.resolve(target);
    const targetName = resolved.exactMatch?.displayName || target || 'Contact';
    const targetPhone = resolved.exactMatch?.phone;

    return {
      isAgentCommand: true,
      toolType: 'start_whatsapp_call',
      rawQuery: query,
      targetName,
      targetPhone,
      additionalData: { isVideo },
      requiresConfirmation: true,
      needsDisambiguation: resolved.disambiguationRequired,
      disambiguationChoices: resolved.choices,
      spokenResponsePrompt: `Starting WhatsApp ${isVideo ? 'video' : 'voice'} call with ${targetName}.`,
    };
  }

  // 1B. Reply to latest WhatsApp message: "Reply to the latest WhatsApp message from Rahul"
  if (isWhatsApp && /\b(reply|answer)\b/i.test(lower)) {
    const targetMatch = query.match(/(?:reply|answer)\s+(?:to\s+)?(?:the\s+)?(?:latest\s+)?(?:whatsapp\s+)?(?:message\s+)?(?:from\s+)?([a-zA-Z0-9\s]+?)(?:\s+(?:saying|that|with|:)\s*(.*))?$/i);
    const target = targetMatch ? targetMatch[1].trim() : 'Sender';
    const body = targetMatch ? (targetMatch[2] || '').trim() : '';

    const resolved = contactResolver.resolve(target);
    const targetName = resolved.exactMatch?.displayName || target;

    if (!body) {
      setSessionActionContext({
        lastTargetName: targetName,
        lastTargetPhone: resolved.exactMatch?.phone,
        lastToolType: 'send_whatsapp',
        waitingForMessageBody: true,
      });
      return {
        isAgentCommand: true,
        toolType: 'send_whatsapp',
        rawQuery: query,
        targetName,
        targetPhone: resolved.exactMatch?.phone,
        missingField: 'message',
        requiresConfirmation: true,
        spokenResponsePrompt: `What would you like to reply to ${targetName}?`,
      };
    }

    return {
      isAgentCommand: true,
      toolType: 'send_whatsapp',
      rawQuery: query,
      targetName,
      targetPhone: resolved.exactMatch?.phone,
      payloadText: body,
      requiresConfirmation: true,
      spokenResponsePrompt: `Reply to ${targetName} on WhatsApp: "${body}"?`,
    };
  }

  // 1C. Read latest message / Show recent conversations: "Show my recent conversations", "Read my latest message from Dad"
  if (
    /\b(show\s+(my\s+)?recent\s+conversations|show\s+recent\s+chats|read\s+(my\s+)?latest\s+message|check\s+messages)\b/i.test(lower)
  ) {
    const fromMatch = lower.match(/(?:from|by)\s+([a-zA-Z0-9\s]+)/i);
    const sender = fromMatch ? fromMatch[1].trim() : undefined;

    return {
      isAgentCommand: true,
      toolType: 'read_allowed_messages',
      rawQuery: query,
      targetName: sender,
      requiresConfirmation: false,
      spokenResponsePrompt: sender
        ? `Here is the latest message from ${sender}.`
        : `Here are your recent conversations.`,
    };
  }

  // 1D. Send WhatsApp / General Messaging:
  // "Message Rahul on WhatsApp: I'll reach home at 6 PM."
  // "Message Rahul: I'll call you later."
  // "Open WhatsApp and message Rahul"
  // "Send a WhatsApp message to Rahul"
  // "WhatsApp Alex: see you tomorrow"
  if (
    isWhatsApp ||
    /^(?:can\s+you\s+|please\s+)?message\s+[a-zA-Z0-9]/i.test(query) ||
    /^open\s+whatsapp\s+and\s+(?:message|text|send)/i.test(query)
  ) {
    let target = '';
    let body = '';

    // Pattern 0: "Open WhatsApp and message Rahul: I'm coming" or "Open WhatsApp and message Rahul"
    const m0 = query.match(/^open\s+whatsapp\s+and\s+(?:message|text|send(?:\s+to)?)\s+([^:]+?)(?:\s+(?:saying|that|with\s+text)\s+|:\s*)(.+)$/i) ||
               query.match(/^open\s+whatsapp\s+and\s+(?:message|text|send(?:\s+to)?)\s+(.+)$/i);
    if (m0) {
      target = m0[1].trim();
      body = (m0[2] || '').trim();
    } else {
      // Pattern 1: "Message Mom on WhatsApp saying I'll be home soon" or "Message Rahul: I'll call you later."
      const m1 = query.match(/^(?:can\s+you\s+|please\s+)?(?:send\s+(?:a\s+)?(?:whatsapp\s+)?message\s+(?:to\s+)?|message\s+|text\s+)([^:]+?)(?:\s+on\s+whatsapp|\s+via\s+whatsapp)?(?:\s+(?:saying|that|with\s+text|with\s+the\s+text)\s+|:\s*)(.+)$/i);
      if (m1) {
        target = m1[1].replace(/\s+on\s+whatsapp/i, '').trim();
        body = m1[2].trim();
      } else {
        // Pattern 2: "Send a WhatsApp message to Rahul" (no body) or "Message Rahul"
        const m2 = query.match(/(?:send\s+(?:a\s+)?whatsapp\s+message\s+(?:to\s+)?|message\s+)([^:]+?)(?:\s+on\s+whatsapp)?$/i);
        if (m2) {
          target = m2[1].replace(/\s+on\s+whatsapp/i, '').trim();
        } else {
          // Pattern 3: "whatsapp rahul I'll reach at 6"
          const m3 = query.match(/^whatsapp\s+([a-zA-Z0-9\s+]+?)(?:\s+(?:saying|that|:)\s*|\s+)(.+)$/i);
          if (m3) {
            target = m3[1].trim();
            body = m3[2].trim();
          }
        }
      }
    }

    if (target) {
      const resolved = contactResolver.resolve(target);
      const targetName = resolved.exactMatch?.displayName || target;
      const targetPhone = resolved.exactMatch?.phone;

      if (!body) {
        setSessionActionContext({
          lastTargetName: targetName,
          lastTargetPhone: targetPhone,
          lastToolType: 'send_whatsapp',
          waitingForMessageBody: true,
        });
        return {
          isAgentCommand: true,
          toolType: 'send_whatsapp',
          rawQuery: query,
          targetName,
          targetPhone,
          missingField: 'message',
          requiresConfirmation: true,
          spokenResponsePrompt: `What should I send to ${targetName} on WhatsApp?`,
        };
      }

      return {
        isAgentCommand: true,
        toolType: 'send_whatsapp',
        rawQuery: query,
        targetName,
        targetPhone,
        payloadText: body,
        requiresConfirmation: true,
        needsDisambiguation: resolved.disambiguationRequired,
        disambiguationChoices: resolved.choices,
        spokenResponsePrompt: `Send WhatsApp to ${targetName}: "${body}"?`,
      };
    }
  }

  // 2. Native SMS / Messages Commands
  // "Text Rahul: I'm coming in 10 minutes."
  // "Open Messages and text Dad."
  // "Send SMS to Dad saying hello"
  if (
    /^(?:open\s+messages\s+and\s+text\s+|text\s+|send\s+(?:an?\s+)?sms\s+(?:to\s+)?|send\s+a\s+text\s+(?:to\s+)?)/i.test(lower) ||
    /\b(via\s+sms|on\s+sms|using\s+sms)\b/i.test(lower)
  ) {
    let target = '';
    let body = '';

    const smsMatch = query.match(/^(?:open\s+messages\s+and\s+text\s+|text\s+|send\s+(?:an?\s+)?sms\s+(?:to\s+)?|send\s+a\s+text\s+(?:to\s+)?)([^:]+?)(?:\s+(?:saying|that|with\s+text)\s+|:\s*|\s+that\s+)(.+)$/i);
    if (smsMatch) {
      target = smsMatch[1].trim();
      body = smsMatch[2].trim();
    } else {
      const targetOnlyMatch = query.match(/^(?:open\s+messages\s+and\s+text\s+|text\s+|send\s+(?:an?\s+)?sms\s+(?:to\s+)?)(.+)$/i);
      if (targetOnlyMatch) {
        target = targetOnlyMatch[1].trim();
      }
    }

    if (target) {
      const resolved = contactResolver.resolve(target);
      const targetName = resolved.exactMatch?.displayName || target;
      const targetPhone = resolved.exactMatch?.phone;

      if (!body) {
        setSessionActionContext({
          lastTargetName: targetName,
          lastTargetPhone: targetPhone,
          lastToolType: 'send_sms',
          waitingForMessageBody: true,
        });
        return {
          isAgentCommand: true,
          toolType: 'send_sms',
          rawQuery: query,
          targetName,
          targetPhone,
          missingField: 'message',
          requiresConfirmation: true,
          spokenResponsePrompt: `What would you like to text ${targetName}?`,
        };
      }

      return {
        isAgentCommand: true,
        toolType: 'send_sms',
        rawQuery: query,
        targetName,
        targetPhone,
        payloadText: body,
        requiresConfirmation: true,
        needsDisambiguation: resolved.disambiguationRequired,
        disambiguationChoices: resolved.choices,
        spokenResponsePrompt: `Send SMS to ${targetName}: "${body}"?`,
      };
    }
  }

  // 3. Phone Calls: "Call Rahul", "Call Mom", "Call the school", "Call this number +18005550199"
  if (/^(?:make\s+a\s+phone\s+call\s+to\s+|call\s+|phone\s+|dial\s+)(.+)$/i.test(lower)) {
    const callMatch = query.match(/^(?:make\s+a\s+phone\s+call\s+to\s+|call\s+|phone\s+|dial\s+)(.+)$/i);
    let target = callMatch ? callMatch[1].trim() : '';

    // Strip "on phone", "cellular"
    target = target.replace(/\s+on\s+phone|\s+via\s+phone/i, '').trim();

    const resolved = contactResolver.resolve(target);
    const targetName = resolved.exactMatch?.displayName || target;
    const targetPhone = resolved.exactMatch?.phone;

    return {
      isAgentCommand: true,
      toolType: 'start_phone_call',
      rawQuery: query,
      targetName,
      targetPhone,
      requiresConfirmation: true,
      needsDisambiguation: resolved.disambiguationRequired,
      disambiguationChoices: resolved.choices,
      spokenResponsePrompt: `Calling ${targetName}...`,
    };
  }

  // 4. Reminders: "Remind me at 7 PM to buy groceries", "Remind me to call Dad tomorrow"
  if (/\b(remind\s+me|set\s+a\s+reminder)\b/i.test(lower)) {
    const remMatch = query.match(/remind\s+me\s+(?:to\s+)?(.+?)(?:\s+at\s+|\s+on\s+)(.+)$/i) ||
                     query.match(/remind\s+me\s+at\s+([^\s]+(?:\s+[ap]m)?)\s+(?:to\s+)?(.+)$/i);

    let text = query;
    let time = '';
    if (remMatch) {
      if (remMatch[2] && (remMatch[1].toLowerCase().includes('pm') || remMatch[1].toLowerCase().includes('am') || /\d/.test(remMatch[1]))) {
        time = remMatch[1].trim();
        text = remMatch[2].trim();
      } else {
        text = remMatch[1].trim();
        time = remMatch[2].trim();
      }
    }

    return {
      isAgentCommand: true,
      toolType: 'create_reminder',
      rawQuery: query,
      payloadText: text,
      additionalData: { time },
      requiresConfirmation: false,
      spokenResponsePrompt: `Setting a reminder for "${text}" ${time ? `at ${time}` : ''}.`,
    };
  }

  // 5. Alarms: "Set an alarm for 6 AM"
  if (/\b(set\s+(?:an?\s+)?alarm|alarm\s+for)\b/i.test(lower)) {
    const timeMatch = query.match(/alarm\s+(?:for\s+)?([0-9:]+\s*(?:am|pm)?)/i);
    const time = timeMatch ? timeMatch[1].trim() : '6:00 AM';

    return {
      isAgentCommand: true,
      toolType: 'set_alarm',
      rawQuery: query,
      payloadText: `Alarm for ${time}`,
      additionalData: { time },
      requiresConfirmation: false,
      spokenResponsePrompt: `Alarm set for ${time}.`,
    };
  }

  // 6. Navigation / Maps: "Open Maps and show directions to school", "Navigate to Times Square"
  if (/\b(navigate\s+to|directions\s+to|open\s+maps\s+and\s+show\s+directions\s+to|route\s+to)\b/i.test(lower)) {
    const navMatch = query.match(/(?:navigate\s+to|directions\s+to|show\s+directions\s+to|route\s+to)\s+(.+)/i);
    const destination = navMatch ? navMatch[1].trim() : 'Destination';

    return {
      isAgentCommand: true,
      toolType: 'open_maps',
      rawQuery: query,
      targetName: destination,
      requiresConfirmation: false,
      spokenResponsePrompt: `Opening Maps directions to ${destination}.`,
    };
  }

  // 7. Dynamic App Launcher: "Open YouTube", "Launch WhatsApp", "Open Source AI open the app and follow the instructions", "Open Spotify and play jazz", etc.
  const appLaunchPattern = /^(?:can\s+you\s+|please\s+|could\s+you\s+|i\s+want\s+to\s+|hey\s+rishi\s+|rishi\s+)?(?:open|launch|start|run|go\s+to|fire\s+up|bring\s+up)\s+(?:the\s+|my\s+)?([a-zA-Z0-9\s._-]+?)(?:\s+app|\s+application|\s+for\s+me|\s+now|\s+on\s+my\s+phone|\s+on\s+phone)?(?:\s+(?:open\s+the\s+app\s+and\s+|and\s+|then\s+|to\s+)(.+))?$/i;
  
  if (appLaunchPattern.test(lower)) {
    const match = lower.match(appLaunchPattern);
    let candidateName = match ? match[1].trim() : '';
    const instructions = match && match[2] ? match[2].trim() : '';

    // Handle phrases like "source ai open the app" or "the app"
    if (candidateName.includes('source') || candidateName === 'ai' || candidateName.includes('source ai') || candidateName.includes('sourceai') || candidateName === 'app' || candidateName === 'the app') {
      candidateName = 'Source AI';
    }

    if (candidateName && candidateName.length >= 2 && !['an', 'the', 'some', 'me', 'it'].includes(candidateName)) {
      const resolved = universalAppLauncher.resolveApp(candidateName);

      if (resolved.isAmbiguous && resolved.ambiguousMatches.length > 0) {
        const choices: DisambiguationChoice[] = resolved.ambiguousMatches.map((m, idx) => ({
          contact: {
            id: `app_${m.packageName}`,
            displayName: m.name,
            phone: m.packageName,
          },
          matchScore: 0.9 - idx * 0.05,
          distinguishingDetail: m.packageName,
        }));

        const matchBulletList = resolved.ambiguousMatches.map(m => `• ${m.name}`).join('\n');

        return {
          isAgentCommand: true,
          toolType: 'open_app',
          rawQuery: query,
          targetName: candidateName,
          requiresConfirmation: false,
          needsDisambiguation: true,
          disambiguationChoices: choices,
          spokenResponsePrompt: `I found ${resolved.ambiguousMatches.length} matching apps:\n${matchBulletList}\n\nWhich one should I open?`,
        };
      }

      const targetAppName = resolved.matchedApp?.name || (candidateName.toLowerCase().includes('source') ? 'Source AI' : candidateName);

      return {
        isAgentCommand: true,
        toolType: 'open_app',
        rawQuery: query,
        targetName: targetAppName,
        requiresConfirmation: false,
        messageText: instructions, // Carry forward any instructions
        spokenResponsePrompt: instructions 
          ? `Opening ${targetAppName} and following your instructions.`
          : `Opening ${targetAppName} directly.`,
      };
    }
  }

  return {
    isAgentCommand: false,
    toolType: 'find_contact',
    rawQuery: query,
    requiresConfirmation: false,
    spokenResponsePrompt: '',
  };
}
