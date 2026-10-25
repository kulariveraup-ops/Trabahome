import type { IntentCategory, UserRole } from '../../types/chatbot.types.ts';

export interface IntentMatcher {
  intent: IntentCategory;
  patterns: RegExp[];
  priority: number;
}

export const INTENT_MATCHERS: IntentMatcher[] = [
  // GREETING
  {
    intent: 'GREETING',
    patterns: [
      /\b(hello|hi|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta|sup|greetings)\b/i
    ],
    priority: 10
  },

  // ACCOUNT CREATION
  {
    intent: 'ACCOUNT_CREATE',
    patterns: [
      /\b(create|make|open|register|sign\s*up)\b.*\b(account|profile)?\b/i,
      /\b(registration|new\s+user|how\s+to\s+join)\b/i,
      /\b(homeowner\s+or\s+worker|which\s+account)\b/i
    ],
    priority: 8
  },

  // LOGIN & AUTH
  {
    intent: 'ACCOUNT_LOGIN',
    patterns: [
      /\b(log\s*in|sign\s*in|access\s+account|portal\s+login)\b/i
    ],
    priority: 8
  },

  // PASSWORD RECOVERY
  {
    intent: 'ACCOUNT_PASSWORD',
    patterns: [
      /\b(forgot|reset|change|lost|recover)\b.*\b(password|credentials|code|otp)\b/i
    ],
    priority: 9
  },

  // WORKER SEARCH & BROWSE
  {
    intent: 'WORKER_SEARCH',
    patterns: [
      /\b(find|search|look\s+for|browse|hire|need)\b.*\b(worker|plumber|electrician|carpenter|mason|painter|cleaner|handyman|welder|technician)\b/i,
      /\b(how\s+to\s+find|available\s+workers|list\s+of\s+workers)\b/i
    ],
    priority: 8
  },

  // WORKER RANKING & MATCHING
  {
    intent: 'WORKER_RANKING',
    patterns: [
      /\b(rank|ranking|algorithm|recommend|weighted\s+scoring|proximity\s+score|distance\s+score)\b/i,
      /\b(how\s+are\s+workers\s+ranked|matching\s+work)\b/i
    ],
    priority: 8
  },

  // WORKER VERIFICATION
  {
    intent: 'WORKER_VERIFICATION',
    patterns: [
      /\b(verif(ied|ication|y)|proof\s+of\s+work|legit|vetting|background\s+check)\b/i,
      /\b(are\s+workers\s+verified)\b/i
    ],
    priority: 8
  },

  // OFFERED SERVICES & PROFESSIONS
  {
    intent: 'SERVICES_OFFERED',
    patterns: [
      /\b(what\s+(are\s+the\s+)?services|services\s+(offered|available|list)|what\s+professions|professions\s+offered|what\s+can\s+i\s+(hire|book)|available\s+services|list\s+of\s+services|explore\s+services|trades\s+offered|categories\s+of\s+services|what\s+kinds?\s+of\s+(work|services|trades))\b/i,
      /\b(tell\s+me\s+about|do\s+you\s+(have|offer))\b.*\b(services|professions|plumber|electrician|carpenter|appliance|cleaner|mason|welder|gardener|babysitter|cook|stylist)\b/i
    ],
    priority: 9
  },

  // HOW TO REQUEST A SERVICE / STEPS
  {
    intent: 'HOW_TO_REQUEST',
    patterns: [
      /\b(how\s+to\s+request|how\s+do\s+i\s+request|request\s+a\s+service|steps\s+to\s+request|instructions?\s+(on\s+how\s+)?to\s+request|how\s+to\s+book\s+a\s+service|how\s+to\s+book\s+a\s+worker|booking\s+instructions|booking\s+steps)\b/i
    ],
    priority: 9
  },

  // HIRING & JOB REQUESTS
  {
    intent: 'JOB_CREATE',
    patterns: [
      /\b(how\s+to\s+hire|how\s+to\s+book|book\s+a\s+worker|create\s+a?\s*job\s+request|submit\s+request)\b/i,
      /\b(hiring\s+process|booking\s+process)\b/i
    ],
    priority: 8
  },

  // JOB CANCELLATION
  {
    intent: 'JOB_CANCEL',
    patterns: [
      /\b(cancel|cancellation|stop)\b.*\b(job|booking|request)\b/i
    ],
    priority: 8
  },

  // WORKER ACTIONS (ACCEPT / DECLINE / RECEIVE)
  {
    intent: 'JOB_ACCEPT',
    patterns: [
      /\b(how\s+do\s+i\s+accept|accept\s+a?\s*job|take\s+a?\s*job)\b/i
    ],
    priority: 8
  },
  {
    intent: 'JOB_DECLINE',
    patterns: [
      /\b(how\s+do\s+i\s+decline|decline\s+a?\s*job|reject\s+request)\b/i
    ],
    priority: 8
  },

  // JOB COMPLETION & OFFICIAL E-RECEIPT
  {
    intent: 'JOB_COMPLETE_ERECEIPT',
    patterns: [
      /\b(e-?receipt|official\s*receipt|receipt|proof\s*of\s*work|proof\s*of\s*payment|complete\s*(a\s*)?job|job\s*completion)\b/i,
      /\b(how\s+to\s+complete|finish\s*job|billing\s*summary|work\s*evidence)\b/i
    ],
    priority: 9
  },

  // IN-APP MESSAGING & CHAT
  {
    intent: 'MESSAGING_CHAT',
    patterns: [
      /\b(chat|message|messages|messaging|inbox|conversation|talk\s*to\s*worker|contact\s*worker|talk\s*to\s*homeowner)\b/i,
      /\b(how\s+do\s+i\s+chat|send\s+message)\b/i
    ],
    priority: 8
  },

  // SUPPORT TICKETS & DISPUTE HELP
  {
    intent: 'SUPPORT_TICKETS',
    patterns: [
      /\b(support\s*ticket|ticket|helpdesk|submit\s*ticket|dispute\s*ticket|admin\s*help|customer\s*support)\b/i,
      /\b(report\s*(a\s*)?problem|report\s*(a\s*)?worker|report\s*(a\s*)?homeowner)\b/i
    ],
    priority: 8
  },

  // WORKER SCHEDULE
  {
    intent: 'WORKER_SCHEDULE',
    patterns: [
      /\b(working\s*schedule|work\s*days|working\s*hours|available\s*days|schedule\s*settings)\b/i
    ],
    priority: 8
  },

  // MULTI-PROFESSIONS
  {
    intent: 'MULTI_PROFESSIONS',
    patterns: [
      /\b(multi-?profession|multiple\s*trades|multiple\s*professions|up\s*to\s*8|different\s*skills)\b/i
    ],
    priority: 8
  },

  // RATINGS AND REVIEWS
  {
    intent: 'RATINGS_REVIEWS',
    patterns: [
      /\b(rate|rating|review|stars|feedback|score|comment|feedback\s*tags|mutual\s*review)\b/i
    ],
    priority: 7
  },

  // EMAIL NOTIFICATIONS
  {
    intent: 'EMAIL_NOTIFICATIONS',
    patterns: [
      /\b(email\s+notification|email\s+alert|smtp|gmail|inbox|email|notification)\b/i
    ],
    priority: 8
  },

  // LOCATION & GEOLOCATION
  {
    intent: 'LOCATION_HELP',
    patterns: [
      /\b(location|geolocation|map|gps|pangasinan|dagupan|city|barangay|coordinates|radius)\b/i
    ],
    priority: 7
  },

  // PAYMENTS (EXPLICIT DIRECT SETTLEMENT & E-RECEIPT)
  {
    intent: 'PAYMENT_INFORMATION',
    patterns: [
      /\b(pay|payment|gcash|maya|credit\s*card|debit|wallet|fee|price|cash|online\s+payment)\b/i
    ],
    priority: 9
  },

  // DISPUTES (SUPPORT MEDIATION)
  {
    intent: 'DISPUTE_INFORMATION',
    patterns: [
      /\b(dispute|refund|complain|scam|fight|conflict|mediation|resolution)\b/i
    ],
    priority: 9
  },

  // TROUBLESHOOTING
  {
    intent: 'TROUBLESHOOTING',
    patterns: [
      /\b(problem|error|broken|issue|not\s+working|can'?t\s+log\s*in|can'?t\s+find|troubleshoot|help\s+me)\b/i
    ],
    priority: 6
  },

  // ADMIN DASHBOARD & METRICS
  {
    intent: 'ADMIN_OVERVIEW',
    patterns: [
      /\b(admin\s*dashboard|platform\s*(metrics|stats|statistics)|total\s*(users|workers|homeowners|bookings))\b/i,
      /\b(kpi|analytics\s*overview|system\s*performance)\b/i
    ],
    priority: 9
  },

  // ADMIN WORKERS MANAGEMENT & APPROVAL
  {
    intent: 'ADMIN_WORKERS',
    patterns: [
      /\b(manage\s*workers?|worker\s*approval|approve\s*worker|reject\s*worker|suspend\s*worker|activate\s*worker|id\s*verification\s*status)\b/i,
      /\b(worker\s*audit|verified\s*workers?\s*list)\b/i
    ],
    priority: 9
  },

  // ADMIN HOMEOWNERS MANAGEMENT
  {
    intent: 'ADMIN_HOMEOWNERS',
    patterns: [
      /\b(manage\s*homeowners?|homeowner\s*list|suspend\s*homeowner|deactivate\s*homeowner|homeowner\s*accounts?)\b/i
    ],
    priority: 9
  },

  // ADMIN SERVICE REQUESTS & E-RECEIPTS
  {
    intent: 'ADMIN_REQUESTS',
    patterns: [
      /\b(all\s*bookings|all\s*requests|supervise\s*(requests|bookings)|audit\s*e-?receipt|inspect\s*(receipt|proof))\b/i
    ],
    priority: 9
  },

  // ADMIN DISPUTES & TICKET MEDIATION
  {
    intent: 'ADMIN_DISPUTES',
    patterns: [
      /\b(mediate\s*dispute|dispute\s*tickets?|admin\s*helpdesk|resolve\s*ticket|ai\s*summary\s*ticket)\b/i
    ],
    priority: 9
  },

  // ADMIN EMAIL & OTP LOGS
  {
    intent: 'ADMIN_LOGS',
    patterns: [
      /\b(email\s*logs?|otp\s*logs?|system\s*audit|delivery\s*logs?|sms\s*logs?)\b/i
    ],
    priority: 9
  }
];

export function detectIntent(text: string): IntentCategory {
  const clean = text.trim();
  if (!clean) return 'UNKNOWN';

  for (const matcher of INTENT_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (pattern.test(clean)) {
        return matcher.intent;
      }
    }
  }

  return 'UNKNOWN';
}
