export type UserRole = 'guest' | 'homeowner' | 'worker' | 'admin';

export type IntentCategory =
  | 'GREETING'
  | 'GENERAL_HELP'
  | 'ACCOUNT_CREATE'
  | 'ACCOUNT_LOGIN'
  | 'ACCOUNT_PASSWORD'
  | 'ACCOUNT_PROFILE'
  | 'HOMEOWNER_HELP'
  | 'WORKER_SEARCH'
  | 'WORKER_PROFILE'
  | 'WORKER_MATCHING'
  | 'WORKER_RANKING'
  | 'WORKER_VERIFICATION'
  | 'JOB_CREATE'
  | 'JOB_REQUEST'
  | 'JOB_ACCEPT'
  | 'JOB_DECLINE'
  | 'JOB_CANCEL'
  | 'JOB_STATUS'
  | 'JOB_COMPLETE_ERECEIPT'
  | 'MESSAGING_CHAT'
  | 'SUPPORT_TICKETS'
  | 'WORKER_SCHEDULE'
  | 'MULTI_PROFESSIONS'
  | 'RATINGS_REVIEWS'
  | 'EMAIL_NOTIFICATIONS'
  | 'LOCATION_HELP'
  | 'PAYMENT_INFORMATION'
  | 'DISPUTE_INFORMATION'
  | 'TROUBLESHOOTING'
  | 'ADMIN_OVERVIEW'
  | 'ADMIN_WORKERS'
  | 'ADMIN_HOMEOWNERS'
  | 'ADMIN_REQUESTS'
  | 'ADMIN_DISPUTES'
  | 'ADMIN_LOGS'
  | 'SERVICES_OFFERED'
  | 'HOW_TO_REQUEST'
  | 'UNKNOWN';

export interface ChatbotAction {
  label: string;
  route?: string;
  externalUrl?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onClickAction?: 'restart' | 'clear' | 'support' | 'openTroubleshooting';
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  keywords: string[];
  answer: string;
  role?: UserRole[];
  relatedQuestions?: string[];
  actions?: ChatbotAction[];
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: string;
  intent?: IntentCategory;
  actions?: ChatbotAction[];
  quickReplies?: string[];
  isError?: boolean;
}

export interface ChatbotContext {
  role: UserRole;
  userName?: string;
  userEmail?: string;
  activePath?: string;
}
