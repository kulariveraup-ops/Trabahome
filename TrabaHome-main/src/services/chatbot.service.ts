import type { ChatMessage, ChatbotAction, ChatbotContext, FAQItem, UserRole } from '../types/chatbot.types.ts';
import { FAQ_KNOWLEDGE_BASE } from '../data/chatbot/faqData.ts';
import { detectIntent } from '../data/chatbot/chatbotIntents.ts';
import {
  getCantFindWorkerTroubleshootResponse,
  getGreetingMessage,
  getTroubleshootingMenuResponse,
  getUnknownQuestionResponse,
  getWorkerNotRespondingTroubleshootResponse,
  getServicesOfferedResponse,
  getHowToRequestServiceResponse
} from '../data/chatbot/chatbotResponses.ts';
import { getHomeownerSession, isHomeownerAuthenticated } from '../utils/homeownerAuth.ts';
import { getWorkerSession, isWorkerAuthenticated } from '../utils/workerAuth.ts';
import { getAdminSession, isAdminAuthenticated } from '../utils/adminAuth.ts';

export function getActiveUserContext(currentPath?: string): ChatbotContext {
  const rawPath = currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');
  const path = rawPath.toLowerCase();

  // 1. GUEST MODE ROUTES (Landing Page & Authentication screens)
  // When visiting the public landing page or login/signup screens, the assistant is STRICTLY in Guest Mode.
  // It NEVER assumes or inherits an Admin, Homeowner, or Worker session from localStorage.
  const isGuestAuthRoute =
    path === '/login' ||
    path === '/signup' ||
    path === '/worker-login' ||
    path === '/worker-signup' ||
    path === '/admin-login' ||
    path === '/admin-register' ||
    path.startsWith('/homeowner-forgot-password') ||
    path.startsWith('/homeowner-reset-password') ||
    path.startsWith('/homeowner-reset-success') ||
    path.startsWith('/worker-forgot-password') ||
    path.startsWith('/worker-reset-password') ||
    path.startsWith('/worker-reset-success');

  if (path === '/' || path === '' || isGuestAuthRoute) {
    return { role: 'guest', activePath: rawPath };
  }

  // 2. ADMIN PORTAL ROUTES (/admin-dashboard, /admin-workers, /admin-requests, etc.)
  // Strictly isolated to Admin portal. Never leak into homeowner, worker, or guest pages.
  if (path.startsWith('/admin')) {
    const session = getAdminSession();
    const adminName =
      (session?.admin as any)?.firstName ||
      (session?.admin as any)?.name ||
      [(session?.admin as any)?.firstName, (session?.admin as any)?.lastName].filter(Boolean).join(' ') ||
      session?.email?.split('@')[0] ||
      'Administrator';
    return { role: 'admin', userName: adminName, userEmail: session?.email, activePath: rawPath };
  }

  // 3. WORKER PORTAL ROUTES (/home-worker, /worker-jobs, /worker-messages, /worker-own-profile, etc.)
  // Strictly isolated to Worker portal. Never show Admin or Homeowner assistant on worker routes.
  const isWorkerPortalRoute =
    path === '/home-worker' ||
    path === '/homeworker' ||
    path.startsWith('/worker-') ||
    path.startsWith('/worker/');

  if (isWorkerPortalRoute) {
    const session = getWorkerSession();
    const workerName =
      [session?.worker?.firstName, session?.worker?.lastName].filter(Boolean).join(' ') ||
      session?.email?.split('@')[0] ||
      'Worker';
    return { role: 'worker', userName: workerName, userEmail: session?.email, activePath: rawPath };
  }

  // 4. HOMEOWNER PORTAL ROUTES (/home, /homeowner-*, /search, /list, /map, /profile/*, /my-requests, etc.)
  // Strictly isolated to Homeowner portal. Never show Admin or Worker assistant on homeowner routes.
  const isHomeownerPortalRoute =
    path === '/home' ||
    path.startsWith('/homeowner') ||
    path.startsWith('/search') ||
    path.startsWith('/list') ||
    path.startsWith('/worker-list') ||
    path.startsWith('/map') ||
    path.startsWith('/full-map') ||
    path.startsWith('/profile') ||
    path.startsWith('/my-requests') ||
    path.startsWith('/services') ||
    path.startsWith('/submission-success') ||
    path === '/messages';

  if (isHomeownerPortalRoute) {
    const session = getHomeownerSession();
    const homeownerName =
      [session?.homeowner?.firstName, session?.homeowner?.lastName].filter(Boolean).join(' ') ||
      session?.email?.split('@')[0] ||
      'Homeowner';
    return { role: 'homeowner', userName: homeownerName, userEmail: session?.email, activePath: rawPath };
  }

  // 5. UNRECOGNIZED / NEUTRAL ROUTES -> STRICTLY GUEST MODE
  // Do NOT fall back to checking admin, worker, or homeowner sessions in localStorage!
  return { role: 'guest', activePath: rawPath };
}

// Compute string similarity score (token overlap + substring search)
function calculateMatchScore(query: string, item: FAQItem): number {
  const normalizedQuery = query.toLowerCase().trim();
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 2);
  let score = 0;

  // Exact question match
  if (normalizedQuery === item.question.toLowerCase().trim()) {
    return 100;
  }

  // Question contains query
  if (item.question.toLowerCase().includes(normalizedQuery)) {
    score += 40;
  }

  // Check keywords
  for (const keyword of item.keywords) {
    const kw = keyword.toLowerCase();
    if (normalizedQuery.includes(kw)) {
      score += 25;
    }
    for (const token of queryTokens) {
      if (kw.includes(token) || token.includes(kw)) {
        score += 10;
      }
    }
  }

  // Check category match
  if (normalizedQuery.includes(item.category.toLowerCase())) {
    score += 15;
  }

  return score;
}

export async function processChatbotQuery(
  userInput: string,
  context: ChatbotContext
): Promise<ChatMessage> {
  const cleanInput = userInput.trim();
  const lowerInput = cleanInput.toLowerCase();

  // 1. Check for greeting
  const intent = detectIntent(cleanInput);
  if (intent === 'GREETING' || lowerInput === 'hi' || lowerInput === 'hello' || lowerInput === 'hey') {
    return getGreetingMessage(context.role, context.userName);
  }

  // 2. Specific troubleshooting menu & shortcuts
  if (
    lowerInput.includes("something isn't working") ||
    lowerInput.includes('troubleshoot') ||
    cleanInput.startsWith('🔴')
  ) {
    return getTroubleshootingMenuResponse(context.role, cleanInput);
  }

  if (
    lowerInput.includes("can't find a worker") ||
    lowerInput.includes('cannot find a worker') ||
    lowerInput.includes('no worker')
  ) {
    if (context.role === 'worker') {
      return {
        id: `troubleshoot-worker-find-${Date.now()}`,
        sender: 'bot',
        text: 'As a skilled worker, homeowners discover your profile when you are verified and available in your Pangasinan municipality. To increase job requests, keep your working schedule active and maintain high customer ratings.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'My Profile & Skills', route: '/worker-own-profile', variant: 'primary' }],
      };
    }
    if (context.role === 'admin') {
      return {
        id: `troubleshoot-admin-find-${Date.now()}`,
        sender: 'bot',
        text: 'Administrators can view all registered workers across Pangasinan from the Manage Workers page, including active, pending, and suspended accounts.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Manage Workers', route: '/admin-workers', variant: 'primary' }],
      };
    }
    return getCantFindWorkerTroubleshootResponse();
  }

  if (
    lowerInput.includes('not responding') ||
    lowerInput.includes("hasn't responded")
  ) {
    if (context.role === 'worker') {
      return {
        id: `troubleshoot-worker-chat-${Date.now()}`,
        sender: 'bot',
        text: 'If a homeowner is not responding in chat, please check your Messages tab. If an accepted on-site appointment cannot proceed due to client unresponsiveness, you may document the issue and contact support.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [
          { label: 'Worker Messages', route: '/worker-messages', variant: 'primary' },
          { label: 'Worker Support', route: '/worker-help', variant: 'outline' }
        ],
      };
    }
    if (context.role === 'admin') {
      return {
        id: `troubleshoot-admin-unresponsive-${Date.now()}`,
        sender: 'bot',
        text: 'Unresponsive party reports can be reviewed in the Admin Helpdesk (/admin-help-requests). Dispute tickets include AI conversation summaries to help admins verify communication timelines.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' }],
      };
    }
    return getWorkerNotRespondingTroubleshootResponse();
  }

  if (intent === 'SERVICES_OFFERED') {
    return getServicesOfferedResponse(context.role);
  }

  if (intent === 'HOW_TO_REQUEST') {
    return getHowToRequestServiceResponse(context.role);
  }

  // 3. STRICT ROLE-FILTERED Knowledge Base Search
  // Ensure that each role ONLY matches FAQs designated for their role:
  const roleFaqs = FAQ_KNOWLEDGE_BASE.filter((faq) => {
    if (!faq.role || faq.role.length === 0) return false;
    if (context.role === 'admin') {
      return faq.role.includes('admin');
    }
    if (context.role === 'worker') {
      return faq.role.includes('worker');
    }
    if (context.role === 'homeowner') {
      return faq.role.includes('homeowner');
    }
    // Guest Mode: Provide general knowledge of BOTH homeowner and worker, but NEVER admin
    return faq.role.includes('guest') && !faq.role.includes('admin');
  });

  let bestMatch: FAQItem | null = null;
  let highestScore = 0;

  for (const faq of roleFaqs) {
    const score = calculateMatchScore(cleanInput, faq);
    if (score > highestScore) {
      highestScore = score;
      bestMatch = faq;
    }
  }

  // If match score is sufficient (>= 18)
  if (bestMatch && highestScore >= 18) {
    const actions: ChatbotAction[] = (bestMatch.actions || []).map((action) => {
      // Contextualize generic actions based on user role
      if (context.role === 'admin' && action.route === '/login') {
        return { label: 'Admin Dashboard', route: '/admin-dashboard', variant: action.variant };
      }
      if (context.role === 'homeowner' && action.route === '/login') {
        return { label: 'Go to Home', route: '/home', variant: action.variant };
      }
      if (context.role === 'worker' && action.route === '/worker-login') {
        return { label: 'Go to Dashboard', route: '/home-worker', variant: action.variant };
      }
      return action;
    });

    const defaultQuickReplies =
      context.role === 'admin'
        ? [
            'How do I monitor dashboard statistics?',
            'How do I verify and approve worker accounts?',
            'How do I inspect service requests & E-Receipts?'
          ]
        : context.role === 'worker'
        ? [
            'How do I accept or decline job requests?',
            'How do I upload proof and complete a job?',
            'How do I change my working hours & days?'
          ]
        : context.role === 'homeowner'
        ? [
            'How do I search and request a worker?',
            'How do service requests work?',
            'How do I view and download my E-Receipt?'
          ]
        : [
            'How do I find and hire a worker?',
            'How do I register as a skilled worker?',
            'Where is TrabaHome available?'
          ];

    return {
      id: `bot-res-${Date.now()}`,
      sender: 'bot',
      text: bestMatch.answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent,
      actions,
      quickReplies: bestMatch.relatedQuestions || defaultQuickReplies
    };
  }

  // 4. Intent-based fallback answers with STRICT role separation
  if (context.role === 'admin') {
    if (intent === 'ADMIN_OVERVIEW') {
      return {
        id: `intent-admin-overview-${Date.now()}`,
        sender: 'bot',
        text: 'The Admin Dashboard displays key operational metrics: total registered workers, verified worker accounts, registered homeowners, and live service bookings across Pangasinan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Admin Dashboard', route: '/admin-dashboard', variant: 'primary' }],
        quickReplies: ['How do I verify and approve worker accounts?', 'How do I inspect service requests & E-Receipts?']
      };
    }
    if (intent === 'ADMIN_WORKERS') {
      return {
        id: `intent-admin-workers-${Date.now()}`,
        sender: 'bot',
        text: 'In Manage Workers (/admin-workers), administrators can verify Philippine IDs, check biometric match scores, suspend accounts, and view worker portfolios.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Manage Workers', route: '/admin-workers', variant: 'primary' }],
        quickReplies: ['How does worker ID and biometric verification approval work?', 'How do I suspend or activate a worker account?']
      };
    }
    if (intent === 'ADMIN_HOMEOWNERS') {
      return {
        id: `intent-admin-homeowners-${Date.now()}`,
        sender: 'bot',
        text: 'From Manage Homeowners (/admin-homeowners), you can review registered clients in Pangasinan, inspect their booking history, and manage account statuses.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Manage Homeowners', route: '/admin-homeowners', variant: 'primary' }],
        quickReplies: ['How do I manage homeowner accounts?', 'How do I supervise service booking requests across Pangasinan?']
      };
    }
    if (intent === 'ADMIN_REQUESTS' || intent === 'JOB_COMPLETE_ERECEIPT') {
      return {
        id: `intent-admin-req-${Date.now()}`,
        sender: 'bot',
        text: 'Service Requests (/admin-requests) gives administrators supervision over all bookings, proof-of-work photo submissions, payment receipts, and generated Official E-Receipts across Pangasinan.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'View Service Requests', route: '/admin-requests', variant: 'primary' }],
        quickReplies: ['How do I inspect proof-of-work photos, payment receipts, and Official E-Receipts?', 'How do I handle user support tickets and dispute mediation?']
      };
    }
    if (intent === 'ADMIN_DISPUTES' || intent === 'SUPPORT_TICKETS' || intent === 'DISPUTE_INFORMATION') {
      return {
        id: `intent-admin-disp-${Date.now()}`,
        sender: 'bot',
        text: 'In the Support Helpdesk (/admin-help-requests), administrators mediate user tickets and disputes with the assistance of automated AI conversation summaries of client-worker chats.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' }],
        quickReplies: ['How do AI conversation summaries work on support tickets?', 'How do I handle user support tickets and dispute mediation?']
      };
    }
    if (intent === 'ADMIN_LOGS' || intent === 'EMAIL_NOTIFICATIONS') {
      return {
        id: `intent-admin-logs-${Date.now()}`,
        sender: 'bot',
        text: 'The Email Logs module (/admin-emaillogs) provides a system audit trail for all transactional emails, login OTP codes, and booking alerts.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Email Logs', route: '/admin-emaillogs', variant: 'primary' }],
        quickReplies: ['How do I monitor system email delivery and OTP logs?', 'How do I use the Admin Dashboard?']
      };
    }
  }

  if (intent === 'PAYMENT_INFORMATION') {
    if (context.role === 'admin') {
      return {
        id: `intent-pay-admin-${Date.now()}`,
        sender: 'bot',
        text: 'Administrators supervise and audit all transaction payments, material fee declarations, and official E-Receipts in the Service Requests tab (/admin-requests).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Audit E-Receipts', route: '/admin-requests', variant: 'primary' }],
        quickReplies: ['How do I inspect proof-of-work photos, payment receipts, and Official E-Receipts?', 'How do I monitor dashboard statistics?']
      };
    }

    const text =
      context.role === 'worker'
        ? 'Service payments are paid directly to you by the homeowner (via cash on-site, GCash, or bank transfer). When finishing the job, record the agreed PHP amount and upload the payment proof to generate the Official E-Receipt.'
        : context.role === 'homeowner'
        ? 'TrabaHome does not take a cut or charge hidden fees on service payments. You settle the agreed fee directly with your worker upon completion (via cash on-site, GCash, or bank transfer).'
        : 'Service payments on TrabaHome are arranged directly between homeowners and skilled workers (via cash on-site, GCash, or bank transfer) and documented via the Official E-Receipt.';

    const actions: ChatbotAction[] =
      context.role === 'worker'
        ? [{ label: 'Go to Jobs Dashboard', route: '/worker-jobs', variant: 'primary' }]
        : [{ label: 'Find a Worker', route: '/search', variant: 'primary' }];

    return {
      id: `intent-pay-${Date.now()}`,
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions,
      quickReplies:
        context.role === 'worker'
          ? ['How is the Official E-Receipt generated?', 'How do I upload proof and complete a job?']
          : ['How does the Official E-Receipt work?', 'How do I hire a worker?']
    };
  }

  if (intent === 'DISPUTE_INFORMATION' || intent === 'SUPPORT_TICKETS') {
    if (context.role === 'admin') {
      return {
        id: `intent-disp-admin-${Date.now()}`,
        sender: 'bot',
        text: 'Dispute tickets can be managed and resolved under Support Helpdesk (/admin-help-requests). Admins can review AI-generated dispute summaries of the booking chat.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' }],
        quickReplies: ['How do AI conversation summaries work on support tickets?', 'How do I handle user support tickets and dispute mediation?']
      };
    }

    const text =
      context.role === 'worker'
        ? 'For concerns with a booking or homeowner, please open a support ticket under Worker Help. TrabaHome administrators review chat history and evidence to assist with mediation.'
        : context.role === 'homeowner'
        ? 'For concerns regarding a service request, worker conduct, or cancellation, submit a support ticket via Homeowner Help. Platform administrators mediate fairly using chat transcripts and proof photos.'
        : 'TrabaHome provides dedicated support and mediation. Users can submit support tickets through the Help section for inquiry or dispute resolution.';

    const actions: ChatbotAction[] =
      context.role === 'worker'
        ? [{ label: 'Worker Help & Support', route: '/worker-help', variant: 'primary' }]
        : [{ label: 'Homeowner Help & Support', route: '/homeowner-help', variant: 'primary' }];

    return {
      id: `intent-disp-${Date.now()}`,
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions,
      quickReplies:
        context.role === 'worker'
          ? ['How do I contact support for worker issues?', 'How do I accept or decline job requests?']
          : ['How do I submit a homeowner help ticket?', 'How do I search and request a worker?']
    };
  }

  if (intent === 'MESSAGING_CHAT') {
    if (context.role === 'admin') {
      return {
        id: `intent-msg-admin-${Date.now()}`,
        sender: 'bot',
        text: 'In-app booking chats between homeowners and workers can be inspected by administrators during ticket dispute mediation (/admin-help-requests).',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: [{ label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' }],
        quickReplies: ['How do AI conversation summaries work on support tickets?', 'How do I handle user support tickets and dispute mediation?']
      };
    }

    const text =
      context.role === 'worker'
        ? 'Use the Worker Messages tab to chat with homeowners for active bookings, confirm on-site arrival times, and send photos or location directions.'
        : context.role === 'homeowner'
        ? 'Use the Homeowner Messages tab to communicate directly with your booked skilled worker, clarify repair details, and receive arrival updates.'
        : 'TrabaHome includes real-time in-app messaging, allowing homeowners and booked workers to communicate directly and share job photos.';

    const actions: ChatbotAction[] =
      context.role === 'worker'
        ? [{ label: 'Worker Messages', route: '/worker-messages', variant: 'primary' }]
        : context.role === 'homeowner'
        ? [{ label: 'Homeowner Messages', route: '/homeowner-messages', variant: 'primary' }]
        : [{ label: 'Explore Services', route: '/search', variant: 'primary' }];

    return {
      id: `intent-msg-${Date.now()}`,
      sender: 'bot',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions,
      quickReplies:
        context.role === 'worker'
          ? ['How do I accept or decline job requests?', 'How do I upload proof and complete a job?']
          : ['How do service requests work?', 'How do I view and download my E-Receipt?']
    };
  }

  // 5. Fallback for unrecognized questions (strictly tailored by role)
  return getUnknownQuestionResponse(context.role);
}

