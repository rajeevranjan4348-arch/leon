// Android Control Messaging Agent Types & State Definitions

export type AndroidControlActionType =
  | 'open_app'
  | 'open_chat'
  | 'send_message'
  | 'reply_message'
  | 'cancel_action'
  | 'get_status';

export type TargetMessagingApp = 'whatsapp' | 'sms' | 'telegram' | 'messages' | 'phone' | 'auto';

export type AndroidControlState =
  | 'IDLE'
  | 'PARSING'
  | 'APP_OPENING'
  | 'CONTACT_SEARCHING'
  | 'CHAT_OPENING'
  | 'MESSAGE_ENTERING'
  | 'WAITING_FOR_CONFIRMATION'
  | 'SENDING'
  | 'VERIFYING'
  | 'COMPLETED'
  // Failure / Terminating States
  | 'APP_NOT_FOUND'
  | 'CONTACT_NOT_FOUND'
  | 'MULTIPLE_CONTACTS'
  | 'CHAT_NOT_FOUND'
  | 'INPUT_NOT_FOUND'
  | 'SEND_BUTTON_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'ACTION_CANCELLED'
  | 'TIMEOUT'
  | 'FAILED';

export interface AndroidControlCommand {
  action: AndroidControlActionType;
  target_app: TargetMessagingApp;
  contact?: string;
  phone?: string;
  message?: string;
  requires_confirmation: boolean;
  metadata?: Record<string, any>;
}

export interface AndroidControlStepLog {
  id: string;
  timestamp: number;
  state: AndroidControlState;
  title: string;
  detail?: string;
  isError?: boolean;
}

export interface AndroidControlResult {
  success: boolean;
  action: AndroidControlActionType;
  app: TargetMessagingApp;
  contact?: string;
  phone?: string;
  message?: string;
  state: AndroidControlState;
  errorReason?: string;
  humanResponse: string;
  stepLogs: AndroidControlStepLog[];
  timestamp: number;
}

export interface AndroidNodeSelector {
  resourceId?: string;
  text?: string | RegExp;
  contentDescription?: string | RegExp;
  className?: string;
  isClickable?: boolean;
  isEditable?: boolean;
}

export interface AppSelectors {
  searchButton?: AndroidNodeSelector;
  searchInput?: AndroidNodeSelector;
  contactListItem?: AndroidNodeSelector;
  messageInput: AndroidNodeSelector;
  sendButton: AndroidNodeSelector;
  headerTitle?: AndroidNodeSelector;
}

export interface NativeBridgeStatus {
  isAccessibilityEnabled: boolean;
  serviceBound: boolean;
  platform: 'android_native' | 'web_bridge' | 'simulated';
  supportedApps: string[];
  activeTaskId?: string;
}
