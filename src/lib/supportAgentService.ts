export interface SupportBookingState {
  id?: string;
  service?: string;
  date?: string;
  time?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  attendees?: number;
  notes?: string;
  status: 'initial' | 'selecting_service' | 'selecting_time' | 'collecting_info' | 'confirmed' | 'cancelled';
  confirmationCode?: string;
  createdAt?: string;
}

export interface SupportTroubleshootState {
  issueTitle?: string;
  category?: 'connection' | 'permissions' | 'voice_video' | 'maps_gps' | 'account_keys' | 'performance' | 'general';
  deviceContext?: string;
  currentStep: number;
  totalSteps: number;
  stepsCompleted: string[];
  status: 'diagnosing' | 'in_progress' | 'resolved' | 'escalated';
  ticketId?: string;
}

export interface SupportAgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  bookingData?: SupportBookingState;
  troubleshootData?: SupportTroubleshootState;
  quickReplies?: string[];
  sources?: Array<{ title: string; url: string }>;
}

export interface SupportAgentSession {
  sessionId: string;
  mode: 'general' | 'booking' | 'troubleshooting';
  messages: SupportAgentMessage[];
  activeBooking?: SupportBookingState;
  activeTroubleshoot?: SupportTroubleshootState;
  lastUpdated: number;
}

const STORAGE_KEY = 'gemini_support_chatbot_session_v1';

export function getStoredSupportSession(): SupportAgentSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.messages)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load support session from storage:', e);
  }

  return {
    sessionId: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    mode: 'general',
    messages: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `👋 **Hello! I'm your Gemini Support & Booking Assistant.**\n\nI remember our conversation context across every step, making it effortless to:\n- 📅 **Book & Schedule Services** (appointments, consultations, demos, reservations)\n- 🛠️ **Troubleshoot Technical Issues** step-by-step with diagnostic guides\n- 💡 **Learn & Configure App Features** (Maps, Search, Gemini Live, Voice Calls)\n\nHow can I help you today?`,
        timestamp: Date.now(),
        quickReplies: [
          '📅 Book an appointment',
          '🛠️ Troubleshoot an issue',
          '🎙️ Mic & Camera permissions help',
          '🔑 Gemini API key assistance',
        ],
      },
    ],
    lastUpdated: Date.now(),
  };
}

export function saveSupportSession(session: SupportAgentSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save support session to storage:', e);
  }
}

export function clearSupportSession(): SupportAgentSession {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return getStoredSupportSession();
}

/**
 * Extracts context entities from conversation text to track stateful booking and troubleshooting variables.
 */
export function extractContextEntities(
  lastUserMsg: string,
  lastAssistantReply: string,
  currentBooking?: SupportBookingState,
  currentTroubleshoot?: SupportTroubleshootState
): { booking?: SupportBookingState; troubleshoot?: SupportTroubleshootState; detectedMode?: 'booking' | 'troubleshooting' | 'general' } {
  const combined = `${lastUserMsg}\n${lastAssistantReply}`.toLowerCase();
  
  let detectedMode: 'booking' | 'troubleshooting' | 'general' = 'general';
  let booking: SupportBookingState = currentBooking || { status: 'initial' };
  let troubleshoot: SupportTroubleshootState = currentTroubleshoot || { currentStep: 1, totalSteps: 3, stepsCompleted: [], status: 'diagnosing' };

  // Detect Booking Intent & Entities
  if (
    combined.includes('book') ||
    combined.includes('schedule') ||
    combined.includes('appointment') ||
    combined.includes('reservation') ||
    combined.includes('consultation') ||
    booking.status !== 'initial'
  ) {
    detectedMode = 'booking';
    
    // Check confirmation
    const codeMatch = lastAssistantReply.match(/#?BK-([A-Z0-9]{4,8})/i) || lastAssistantReply.match(/Confirmation Code:?\s*([A-Z0-9-]+)/i);
    if (codeMatch || combined.includes('confirmed') || combined.includes('booking confirmation')) {
      booking.status = 'confirmed';
      if (!booking.confirmationCode) {
        booking.confirmationCode = codeMatch ? codeMatch[1].toUpperCase() : `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else if (booking.status === 'initial') {
      booking.status = 'selecting_service';
    }

    // Extract potential service
    if (combined.includes('consultation') || combined.includes('technical consultation')) {
      booking.service = 'Technical Architecture Consultation';
    } else if (combined.includes('demo') || combined.includes('product demo')) {
      booking.service = 'Platform & AI Live Demo';
    } else if (combined.includes('onboarding')) {
      booking.service = 'Customer Onboarding Session';
    } else if (combined.includes('support call') || combined.includes('priority support')) {
      booking.service = 'Priority 1-on-1 Support';
    }

    // Extract potential date / time mentions
    const dateMatch = lastUserMsg.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|aug(ust)?\s+\d+|sept(ember)?\s+\d+|\d{1,2}\/\d{1,2}(\/\d{2,4})?)\b/i);
    if (dateMatch) {
      booking.date = dateMatch[0];
    }

    const timeMatch = lastUserMsg.match(/\b(\d{1,2}(:\d{2})?\s*(am|pm))\b/i) || lastUserMsg.match(/\b(\d{1,2}\s*o'clock)\b/i);
    if (timeMatch) {
      booking.time = timeMatch[0];
    }

    const emailMatch = lastUserMsg.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      booking.customerEmail = emailMatch[0];
    }
  }

  // Detect Troubleshooting Intent & Entities
  if (
    combined.includes('troubleshoot') ||
    combined.includes('not working') ||
    combined.includes('error') ||
    combined.includes('fix') ||
    combined.includes('broken') ||
    combined.includes('issue') ||
    troubleshoot.status !== 'diagnosing'
  ) {
    if (detectedMode !== 'booking') {
      detectedMode = 'troubleshooting';
    }

    if (combined.includes('mic') || combined.includes('microphone') || combined.includes('camera') || combined.includes('permission')) {
      troubleshoot.category = 'permissions';
      troubleshoot.issueTitle = 'Microphone & Camera Access';
    } else if (combined.includes('api key') || combined.includes('gemini key') || combined.includes('quota') || combined.includes('429')) {
      troubleshoot.category = 'account_keys';
      troubleshoot.issueTitle = 'Gemini API Key & Quota Limits';
    } else if (combined.includes('call') || combined.includes('webrtc') || combined.includes('video call')) {
      troubleshoot.category = 'voice_video';
      troubleshoot.issueTitle = 'Real-time Audio & Video Calling';
    } else if (combined.includes('map') || combined.includes('location') || combined.includes('gps')) {
      troubleshoot.category = 'maps_gps';
      troubleshoot.issueTitle = 'Google Maps & Geolocation Sync';
    } else if (combined.includes('slow') || combined.includes('fps') || combined.includes('lag')) {
      troubleshoot.category = 'performance';
      troubleshoot.issueTitle = 'App Latency & FPS Optimization';
    }

    // Step extraction (e.g. Step 1 of 4, Step 2)
    const stepMatch = lastAssistantReply.match(/Step\s*(\d+)(\s*(of|\/)\s*(\d+))?/i);
    if (stepMatch) {
      troubleshoot.currentStep = parseInt(stepMatch[1], 10);
      if (stepMatch[4]) {
        troubleshoot.totalSteps = parseInt(stepMatch[4], 10);
      }
      troubleshoot.status = 'in_progress';
    }

    if (combined.includes('resolved') || combined.includes('it worked') || combined.includes('fixed now') || combined.includes('solved')) {
      troubleshoot.status = 'resolved';
    }
  }

  return {
    booking: booking.status !== 'initial' ? booking : undefined,
    troubleshoot: troubleshoot.issueTitle ? troubleshoot : undefined,
    detectedMode,
  };
}

/**
 * Sends a message to the Gemini Support Agent backend.
 */
export async function sendSupportAgentMessage(params: {
  message: string;
  history: SupportAgentMessage[];
  activeBooking?: SupportBookingState;
  activeTroubleshoot?: SupportTroubleshootState;
  onChunk?: (delta: string, fullText: string) => void;
}): Promise<{ text: string; booking?: SupportBookingState; troubleshoot?: SupportTroubleshootState; quickReplies?: string[]; sources?: Array<{ title: string; url: string }> }> {
  const { message, history, activeBooking, activeTroubleshoot, onChunk } = params;

  const systemInstruction = `You are "Gemini Support & Booking Assistant" — an intelligent, empathetic, context-aware AI support agent for this platform.

### Core Strengths & Mandates:
1. **Multi-Turn Context Memory**:
   - Always remember prior details stated in previous messages (e.g. chosen service, preferred dates, device types, attempted fixes, customer names).
   - If the user provides a partial answer or multi-step booking request, build upon already gathered data without re-asking questions.

2. **Step-by-Step Bookings & Scheduling**:
   - Guide users through selecting a service, choosing date & time, providing contact info, and confirming.
   - When a booking is finalized, format a distinct confirmation summary with a generated code (e.g. "#BK-8421"), date/time, and friendly next steps.

3. **Guided Interactive Troubleshooting**:
   - Break technical fixes into bite-sized numbered steps (e.g. "Step 1 of 3: Check Browser Permissions").
   - Explain WHY a step is needed and ask if it solved the problem before proceeding to the next step.
   - For audio/mic issues: explain site permissions (chrome://settings/content/microphone).
   - For Gemini API keys: explain that the server handles keys via environment / settings without client exposure.

4. **Tone & Style**:
   - Empathetic, concise, clear, and proactive.
   - Use emojis, clean bullet points, and bold text for visual structure.
   - At the end of every reply, offer 2-3 brief logical next-step prompt suggestions.`;

  const formattedHistory = history.map(m => ({
    role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    content: m.content,
  }));

  // Build context payload description
  let contextAddendum = '';
  if (activeBooking && activeBooking.status !== 'initial') {
    contextAddendum += `\n[Active Booking State: ${JSON.stringify(activeBooking)}]`;
  }
  if (activeTroubleshoot && activeTroubleshoot.issueTitle) {
    contextAddendum += `\n[Active Troubleshooting State: ${JSON.stringify(activeTroubleshoot)}]`;
  }

  const promptWithContext = contextAddendum ? `${message}\n\n${contextAddendum}` : message;

  try {
    const response = await fetch('/api/gemini/support-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptWithContext,
        history: formattedHistory,
        activeBooking,
        activeTroubleshoot,
        systemInstruction,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.success) {
      // Fallback to standard /api/gemini/chat endpoint if dedicated endpoint had an issue
      console.warn('Support-agent endpoint fallback to /api/gemini/chat...');
      const fallbackRes = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptWithContext,
          history: formattedHistory,
          systemInstruction,
          mode: 'chat',
        }),
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      const fallbackText = fallbackData.text || "I'm here to assist you with your booking or troubleshooting request. Could you please specify your preferred date or the issue you're experiencing?";
      
      const entities = extractContextEntities(message, fallbackText, activeBooking, activeTroubleshoot);
      return {
        text: fallbackText,
        booking: entities.booking,
        troubleshoot: entities.troubleshoot,
        quickReplies: generateQuickReplies(entities.detectedMode, entities.booking, entities.troubleshoot),
      };
    }

    const text = data.text || '';
    if (onChunk) onChunk(text, text);

    const entities = extractContextEntities(message, text, activeBooking, activeTroubleshoot);

    return {
      text,
      booking: entities.booking || data.booking,
      troubleshoot: entities.troubleshoot || data.troubleshoot,
      quickReplies: data.quickReplies || generateQuickReplies(entities.detectedMode, entities.booking, entities.troubleshoot),
      sources: data.sources || [],
    };
  } catch (err) {
    console.warn('Support agent API request failed, using intelligent context fallback:', err);
    
    // Offline / Network fallback response
    let fallbackText = `I have received your request regarding: "${message}".\n\nI am keeping your context safe in memory. Here are recommended next steps:`;
    if (message.toLowerCase().includes('book') || (activeBooking && activeBooking.status !== 'initial')) {
      fallbackText = `📅 **Booking Request Recorded**\n\nI've noted your request for **${activeBooking?.service || 'Consultation / Service'}**.\n\n- **Selected Date**: ${activeBooking?.date || 'Please specify preferred day (e.g., Tomorrow, Monday)'}\n- **Selected Time**: ${activeBooking?.time || 'Please specify preferred time (e.g., 10:00 AM, 2:30 PM)'}\n- **Status**: Ready to confirm once details are complete.\n\nWould you like me to lock in this reservation?`;
    } else if (message.toLowerCase().includes('troubleshoot') || message.toLowerCase().includes('error')) {
      fallbackText = `🛠️ **Guided Troubleshooting (Step 1 of 3)**\n\nLet's diagnose this together:\n1. **Check Connection & Refresh**: Ensure your internet connection is stable and reload the tab.\n2. **Browser Permissions**: For audio/video calls, ensure microphone and camera permissions are set to "Allow".\n3. **Settings & Keys**: If an API quota is reached, the applet automatically manages fallbacks.\n\nDid Step 1 or 2 resolve the symptom for you?`;
    }

    const entities = extractContextEntities(message, fallbackText, activeBooking, activeTroubleshoot);

    return {
      text: fallbackText,
      booking: entities.booking,
      troubleshoot: entities.troubleshoot,
      quickReplies: generateQuickReplies(entities.detectedMode, entities.booking, entities.troubleshoot),
    };
  }
}

function generateQuickReplies(
  mode?: 'booking' | 'troubleshooting' | 'general',
  booking?: SupportBookingState,
  troubleshoot?: SupportTroubleshootState
): string[] {
  if (mode === 'booking' || (booking && booking.status !== 'initial')) {
    if (booking?.status === 'confirmed') {
      return ['📥 Download Calendar Invite', '🔄 Book another service', '💬 Ask a follow-up question'];
    }
    if (!booking?.date) {
      return ['📅 Tomorrow at 10:00 AM', '📅 This Friday at 2:00 PM', '📅 Next Monday at 3:30 PM'];
    }
    if (!booking?.customerEmail) {
      return ['Confirm with my current account', 'Use my Google account email', 'Modify booking time'];
    }
    return ['✅ Confirm this booking', '✏️ Change the time', '❌ Cancel and restart'];
  }

  if (mode === 'troubleshooting' || (troubleshoot && troubleshoot.issueTitle)) {
    if (troubleshoot?.status === 'resolved') {
      return ['🎉 All fixed! Thank you', '💬 Ask another question', '📅 Book a consultation'];
    }
    return ['✅ That fixed it!', '❌ Still having the issue, next step', '📞 Connect to human support', '🔄 Start troubleshooting over'];
  }

  return [
    '📅 Book an appointment',
    '🛠️ Troubleshoot an issue',
    '🎙️ Mic & Camera permissions',
    '🔑 Gemini API key questions',
  ];
}
