export type DevicePermissionKey =
  | 'contacts'
  | 'phone'
  | 'sms'
  | 'whatsapp'
  | 'notifications'
  | 'calendar'
  | 'location'
  | 'microphone'
  | 'camera'
  | 'files';

export type PermissionStatus = 'allowed' | 'denied' | 'prompt' | 'connected' | 'optional';

export interface DevicePermissionItem {
  id: DevicePermissionKey;
  name: string;
  description: string;
  status: PermissionStatus;
  category: 'communication' | 'hardware' | 'system' | 'personal';
  requiredFor: string[];
  lastUpdated: number;
}

export type ActionStatusType =
  | 'analyzing'
  | 'finding_contact'
  | 'checking_permission'
  | 'waiting_confirmation'
  | 'executing'
  | 'completed'
  | 'failed';

export type CommunicationToolType =
  | 'find_contact'
  | 'send_sms'
  | 'open_messages'
  | 'send_whatsapp'
  | 'open_whatsapp_chat'
  | 'start_phone_call'
  | 'start_whatsapp_call'
  | 'read_allowed_messages'
  | 'reply_to_message'
  | 'open_app'
  | 'open_maps'
  | 'create_reminder'
  | 'create_calendar_event'
  | 'set_alarm'
  | 'get_notifications'
  | 'share_file'
  | 'cancel_action'
  | 'android_control'
  | 'write_improvement_proposal'
  | 'apply_approved_proposal'
  | 'retrieve_relevant_lessons';

export interface ContactRecord {
  id: string;
  displayName: string;
  phone: string;
  email?: string;
  relationship?: string; // 'Mom', 'Dad', 'Brother', 'Colleague', etc.
  avatar?: string;
  isFavorite?: boolean;
  isTrustedAutoSend?: boolean;
}

export interface DisambiguationChoice {
  contact: ContactRecord;
  matchScore: number;
  distinguishingDetail: string;
}

export interface ParsedAgentCommand {
  isAgentCommand: boolean;
  isHandled?: boolean;
  toolType: CommunicationToolType;
  rawQuery: string;
  targetName?: string;
  recipientName?: string;
  targetPhone?: string;
  recipientPhone?: string;
  payloadText?: string;
  messageText?: string;
  actionUrl?: string;
  additionalData?: Record<string, any>;
  requiresConfirmation: boolean;
  needsDisambiguation?: boolean;
  disambiguationChoices?: DisambiguationChoice[];
  missingField?: 'recipient' | 'message' | 'time' | 'destination' | null;
  spokenResponsePrompt: string;
  spokenResponse?: string;
}

export interface ToolExecutionResult {
  success: boolean;
  toolType: CommunicationToolType;
  message: string;
  targetName?: string;
  targetPhone?: string;
  payloadText?: string;
  actionUrl?: string;
  webUrl?: string;
  intentUrl?: string;
  errorReason?: string;
  timestamp: number;
}

export interface CommunicationAuditLog {
  id: string;
  timestamp: number;
  toolType: CommunicationToolType;
  target?: string;
  summary: string;
  status: 'success' | 'failed' | 'cancelled' | 'pending';
  permissionChecked: DevicePermissionKey[];
  details?: string;
}

export interface RecentMessageItem {
  id: string;
  senderName: string;
  senderPhone: string;
  platform: 'whatsapp' | 'sms';
  previewText: string;
  timestamp: number;
  isRead: boolean;
  unreadCount?: number;
}
