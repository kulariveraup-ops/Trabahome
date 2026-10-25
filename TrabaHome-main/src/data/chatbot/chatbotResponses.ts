import type { ChatMessage, ChatbotAction, UserRole } from '../../types/chatbot.types.ts';

export function getGreetingMessage(role: UserRole, userName?: string): ChatMessage {
  const nameGreeting = userName ? ` **${userName}**` : '';

  if (role === 'admin') {
    return {
      id: 'welcome-msg-admin',
      sender: 'bot',
      text: `Hello${nameGreeting}! Welcome to TrabaHome Admin Portal 👋\n\nI'm the **TrabaHome Admin Assistant**. You are signed in as an **Administrator**.\n\nI can help you supervise platform operations in Pangasinan, including worker ID & biometric verification, homeowner account management, service request oversight, E-Receipt audits, support ticket dispute mediation, and system logs.\n\nWhat administrative task would you like help with today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Admin Dashboard', route: '/admin-dashboard', variant: 'primary' },
        { label: 'Worker Approvals', route: '/admin-workers', variant: 'outline' },
        { label: 'Homeowner Accounts', route: '/admin-homeowners', variant: 'outline' },
        { label: 'Service Requests', route: '/admin-requests', variant: 'outline' },
        { label: 'Dispute Tickets', route: '/admin-help-requests', variant: 'outline' },
        { label: 'Email & OTP Logs', route: '/admin-emaillogs', variant: 'outline' }
      ],
      quickReplies: [
        '📊 How do I monitor dashboard statistics?',
        '🛡️ How do I verify and approve worker accounts?',
        '👥 How do I manage homeowner accounts?',
        '📑 How do I inspect service requests & E-Receipts?',
        '🎫 How do I handle support tickets & disputes?',
        '📧 How do I monitor email and OTP delivery logs?'
      ]
    };
  }

  if (role === 'worker') {
    return {
      id: 'welcome-msg-worker',
      sender: 'bot',
      text: `Hello${nameGreeting}! Welcome to TrabaHome 👋\n\nI'm the **TrabaHome Worker Assistant**. You are signed in as a **Local Skilled Worker**.\n\nI can help you manage incoming booking requests, in-app client messaging, uploading proof of work/payment to complete jobs, generating Official E-Receipts, setting your multi-profession profile (1–8 trades), and configuring your working schedule.\n\nWhat would you like help with today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'View Job Requests', route: '/worker-jobs', variant: 'primary' },
        { label: 'Messages', route: '/worker-messages', variant: 'outline' },
        { label: 'My Profile & Skills', route: '/worker-own-profile', variant: 'outline' },
        { label: 'Help & Support', route: '/worker-help', variant: 'outline' }
      ],
      quickReplies: [
        '📋 How do I accept or decline job requests?',
        '📸 How do I upload proof and complete a job?',
        '🧾 How is the Official E-Receipt generated?',
        '🕒 How do I change my working hours & days?',
        '🛠️ How do I add up to 8 professions/trades?',
        '⭐ How does worker rating work?',
        '🎫 How do I contact support for worker issues?'
      ]
    };
  }

  if (role === 'homeowner') {
    return {
      id: 'welcome-msg-homeowner',
      sender: 'bot',
      text: `Hello${nameGreeting}! Welcome to TrabaHome 👋\n\nI'm the **TrabaHome Homeowner Assistant**. You are signed in as a **Homeowner**.\n\nI can assist you with searching verified skilled workers in Pangasinan, sending service requests, live in-app messaging, tracking job completion, downloading Official E-Receipts, and leaving ratings.\n\nWhat would you like help with today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Find a Worker', route: '/search', variant: 'primary' },
        { label: 'My Bookings & Receipts', route: '/homeowner-bookings', variant: 'outline' },
        { label: 'Messages', route: '/homeowner-messages', variant: 'outline' },
        { label: 'Help & Support', route: '/homeowner-help', variant: 'outline' }
      ],
      quickReplies: [
        '🔍 How do I search and request a worker?',
        '📅 How do service requests work?',
        '💬 How do I chat with my booked worker?',
        '🧾 How do I view and download my E-Receipt?',
        '⭐ How do I rate and review a worker?',
        '🔴 I can\'t find an available worker',
        '🎫 How do I submit a homeowner help ticket?'
      ]
    };
  }

  // Guest Mode: General knowledge of BOTH homeowner and worker
  return {
    id: 'welcome-msg-guest',
    sender: 'bot',
    text: `Welcome to TrabaHome 👋\n\nI'm the **TrabaHome Assistant** in Guest Guide Mode.\n\nI provide general knowledge about both Homeowners (finding, hiring, and rating local workers) and Skilled Workers (joining as a tradesperson, AI ID verification, and taking jobs in Pangasinan).\n\nWhat would you like to know?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'Hire Workers (Sign In)', route: '/login', variant: 'primary' },
      { label: 'Homeowner Sign Up', route: '/signup', variant: 'outline' },
      { label: 'Worker Sign Up', route: '/worker-signup', variant: 'outline' },
      { label: 'Worker Sign In', route: '/worker-login', variant: 'outline' }
    ],
    quickReplies: [
      '🏠 How do I find and hire a worker?',
      '🛠️ How do I register as a skilled worker?',
      '🛡️ How does AI ID verification work?',
      '📍 Where is TrabaHome available?',
      '🧾 What is an Official E-Receipt?',
      '👤 Should I register as Homeowner or Worker?'
    ]
  };
}

export function getUnknownQuestionResponse(role: UserRole = 'guest'): ChatMessage {
  if (role === 'admin') {
    return {
      id: `unknown-admin-${Date.now()}`,
      sender: 'bot',
      text: `I'm not sure about that administrative query.\n\nI can assist with Admin Dashboard metrics, approving worker accounts, managing homeowners, supervising service requests, auditing Official E-Receipts, mediating dispute tickets, and checking email/OTP logs.\n\nCould you try asking about one of these operational topics?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Admin Dashboard', route: '/admin-dashboard', variant: 'primary' },
        { label: 'Worker Approvals', route: '/admin-workers', variant: 'outline' },
        { label: 'Service Requests', route: '/admin-requests', variant: 'outline' },
        { label: 'Dispute Tickets', route: '/admin-help-requests', variant: 'outline' }
      ],
      quickReplies: [
        'How do I monitor dashboard statistics?',
        'How do I verify and approve worker accounts?',
        'How do I inspect service requests & E-Receipts?',
        'How do I handle support tickets & disputes?'
      ]
    };
  }

  if (role === 'worker') {
    return {
      id: `unknown-worker-${Date.now()}`,
      sender: 'bot',
      text: `I'm not sure about that worker question.\n\nI can assist with viewing job requests, accepting or declining bookings, completing jobs with proof photos, generating Official E-Receipts, setting your working schedule, multi-professions (1-8 trades), and worker support.\n\nCould you try asking about one of those topics?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'View Job Requests', route: '/worker-jobs', variant: 'primary' },
        { label: 'My Profile & Skills', route: '/worker-own-profile', variant: 'outline' },
        { label: 'Contact Worker Support', route: '/worker-help', variant: 'outline' }
      ],
      quickReplies: [
        'How do I accept or decline job requests?',
        'How do I upload proof and complete a job?',
        'How do I change my working hours & days?',
        'How do I add up to 8 professions/trades?'
      ]
    };
  }

  if (role === 'homeowner') {
    return {
      id: `unknown-homeowner-${Date.now()}`,
      sender: 'bot',
      text: `I'm not sure about that homeowner question.\n\nI can help with searching verified skilled workers in Pangasinan, submitting booking requests, in-app messaging, tracking job completion, downloading Official E-Receipts, and rating workers.\n\nCould you try asking about one of those topics?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Find a Worker', route: '/search', variant: 'primary' },
        { label: 'My Bookings', route: '/homeowner-bookings', variant: 'outline' },
        { label: 'Contact Homeowner Support', route: '/homeowner-help', variant: 'outline' }
      ],
      quickReplies: [
        'How do I search and request a worker?',
        'How do service requests work?',
        'How do I chat with my booked worker?',
        'How do I view and download my E-Receipt?'
      ]
    };
  }

  // Guest fallback
  return {
    id: `unknown-guest-${Date.now()}`,
    sender: 'bot',
    text: `I'm not sure about that yet.\n\nI can provide general platform information about hiring skilled workers, joining as a skilled tradesperson, account registration, AI worker verification, and Pangasinan coverage.\n\nCould you try asking about one of those topics?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'Explore Workers', route: '/search', variant: 'primary' },
      { label: 'Homeowner Sign Up', route: '/signup', variant: 'outline' },
      { label: 'Worker Sign Up', route: '/worker-signup', variant: 'outline' },
      { label: 'Sign In', route: '/login', variant: 'outline' }
    ],
    quickReplies: [
      'How do I find and hire a worker?',
      'How do I register as a skilled worker?',
      'How does AI ID verification work?',
      'Where is TrabaHome available?'
    ]
  };
}

export function getTroubleshootingMenuResponse(role: UserRole = 'guest', promptText?: string): ChatMessage {
  if (role === 'admin') {
    return {
      id: `troubleshoot-admin-${Date.now()}`,
      sender: 'bot',
      text: `Here are common administrator troubleshooting and operational actions:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' },
        { label: 'Email & OTP Logs', route: '/admin-emaillogs', variant: 'outline' }
      ],
      quickReplies: [
        '🛡️ How do I verify and approve worker accounts?',
        '🎫 How do I handle support tickets & disputes?',
        '📧 How do I monitor email and OTP delivery logs?',
        '📊 How do I monitor dashboard statistics?'
      ]
    };
  }

  if (role === 'worker') {
    return {
      id: `troubleshoot-worker-${Date.now()}`,
      sender: 'bot',
      text: `Here are common skilled worker troubleshooting topics. Please select an issue or describe what you need assistance with:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Open Worker Help', route: '/worker-help', variant: 'primary' },
        { label: 'Go to Jobs Dashboard', route: '/worker-jobs', variant: 'outline' }
      ],
      quickReplies: [
        '📸 How do I upload proof and complete a job?',
        '🕒 How do I change my working hours & days?',
        '📋 How do I accept or decline job requests?',
        '🎫 How do I contact support for worker issues?'
      ]
    };
  }

  if (role === 'homeowner') {
    if (
      promptText &&
      (promptText.toLowerCase().includes("can't find a worker") ||
        promptText.toLowerCase().includes('cannot find a worker') ||
        promptText.toLowerCase().includes('no worker'))
    ) {
      return getCantFindWorkerTroubleshootResponse();
    }

    if (
      promptText &&
      (promptText.toLowerCase().includes('not responding') ||
        promptText.toLowerCase().includes("hasn't responded"))
    ) {
      return getWorkerNotRespondingTroubleshootResponse();
    }

    return {
      id: `troubleshoot-homeowner-${Date.now()}`,
      sender: 'bot',
      text: `Here are common homeowner troubleshooting topics. Please select an issue:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        { label: 'Homeowner Support', route: '/homeowner-help', variant: 'primary' },
        { label: 'My Bookings', route: '/homeowner-bookings', variant: 'outline' }
      ],
      quickReplies: [
        '🔴 I can\'t find an available worker',
        '🔴 My worker isn\'t responding',
        '🧾 How do I view and download my E-Receipt?',
        '🎫 How do I submit a homeowner help ticket?'
      ]
    };
  }

  // Guest troubleshooting
  return {
    id: `troubleshoot-guest-${Date.now()}`,
    sender: 'bot',
    text: `Here are common account and access troubleshooting topics:`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'Sign In', route: '/login', variant: 'primary' },
      { label: 'Create Account', route: '/signup', variant: 'outline' }
    ],
    quickReplies: [
      '🔴 I can\'t log in',
      '🔴 I can\'t register',
      'I forgot my password. What should I do?',
      'Where is TrabaHome available?'
    ]
  };
}

export function getCantFindWorkerTroubleshootResponse(): ChatMessage {
  return {
    id: `troubleshoot-worker-missing-${Date.now()}`,
    sender: 'bot',
    text: `Let's check a few things if you can't find a worker:\n\n1. **Location Permission**: Check if your browser location access is turned on.\n2. **Service Trade**: Make sure you selected the matching trade (e.g., Plumber, Electrician, Carpenter).\n3. **Availability**: Worker counts depend on registered workers in your Pangasinan municipality.\n4. **Broaden Search**: Try clearing the city filter or searching nearby municipalities in Pangasinan.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'View All Workers', route: '/list', variant: 'primary' },
      { label: 'Check Interactive Map', route: '/map', variant: 'outline' }
    ],
    quickReplies: [
      'What types of skilled workers can I find?',
      'How does TrabaHome rank workers?',
      'How do I submit a homeowner help ticket?'
    ]
  };
}

export function getWorkerNotRespondingTroubleshootResponse(): ChatMessage {
  return {
    id: `troubleshoot-no-reply-${Date.now()}`,
    sender: 'bot',
    text: `A skilled worker may need time to review a job request, especially if they are currently active on an on-site job.\n\nIf your request remains unanswered, you can open your Bookings page, cancel the pending request, and send a request to another available skilled worker in your area.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'View My Bookings', route: '/homeowner-bookings', variant: 'primary' },
      { label: 'Find Another Worker', route: '/search', variant: 'outline' }
    ],
    quickReplies: [
      'Can I cancel a request?',
      'How do I search and request a worker?'
    ]
  };
}

export function getServicesOfferedResponse(role: UserRole = 'guest'): ChatMessage {
  return {
    id: `services-offered-${Date.now()}`,
    sender: 'bot',
    text: `TrabaHome connects you to **26 verified service professions and skilled trades** across Pangasinan, organized into 4 main categories:\n\n` +
      `🛠️ **Home Repairs**:\n` +
      `• **Appliance Repair**: Refrigerators, AC, washing machines & microwave maintenance.\n` +
      `• **Carpenter**: Custom woodwork, furniture, cabinetry & structural framing.\n` +
      `• **Electrician**: Circuit troubleshooting, wiring, light fixtures & panel boards.\n` +
      `• **Handyman**: General home repairs, mounting, fixtures & small maintenance.\n` +
      `• **Mason / Concrete**: Hollow block laying, plastering, tiling & concrete paving.\n` +
      `• **Painter**: Interior and exterior wall painting, staining & waterproof coating.\n` +
      `• **Plumber**: Pipe leaks, bathroom fixtures, drain declogging & water lines.\n` +
      `• **Roofer / Tinsmith**: Roof leaks, flashing, metal sheets & gutter installation.\n` +
      `• **Welder**: Metal gate fabrication, steel window grills & iron repairs.\n\n` +
      `🧹 **Cleaning & Yard**:\n` +
      `• **Housekeeper / Cleaner**: Residential deep cleaning, sweeping, mopping & dusting.\n` +
      `• **Window Cleaner**: Glass windows, sliding doors, blinds & exterior screens.\n` +
      `• **Pest Control**: Termite defense, cockroach & rodent treatments.\n` +
      `• **Gardener**: Lawn mowing, tree trimming, garden landscaping & plant care.\n\n` +
      `💆 **Personal & Wellness**:\n` +
      `• **Babysitter**: Trusted childcare, attentive playtime, meal feeding & bedtime routines.\n` +
      `• **Hair Stylist / Barber**: Men's & women's haircuts, styling & hair treatments at home.\n` +
      `• **Makeup Artist**: Bridal, debut, events & graduation glam styling.\n` +
      `• **Massage Therapist**: Relaxing body massage, reflexology & wellness therapy.\n` +
      `• **Tailor / Seamstress**: Clothes alteration, custom sewing, mending & resizing.\n` +
      `• **Pet Groomer / Sitter**: Dog & cat bathing, fur brushing, nail trimming & feeding.\n\n` +
      `🎉 **Events & Food**:\n` +
      `• **Baker / Pastry Chef**: Custom birthday cakes, cupcakes, bread & pastries.\n` +
      `• **Caterer / Cook**: Filipino party dishes, banquet cooking & party buffet food.\n` +
      `• **Event Host / Emcee**: Lively party hosting, program hosting & crowd engagement.\n` +
      `• **Photographer / Videographer**: Event coverage, portraits & photo editing.\n` +
      `• **Graphic Designer / Artist**: Tarpaulins, digital banners, logos & signage design.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'View All 26 Services', route: '/services', variant: 'primary' },
      { label: 'Find a Worker Now', route: '/search', variant: 'outline' }
    ],
    quickReplies: [
      '📋 How do I request a service?',
      '📍 Where is TrabaHome available?',
      '🛡️ Are workers verified?'
    ]
  };
}

export function getHowToRequestServiceResponse(role: UserRole = 'guest'): ChatMessage {
  return {
    id: `how-to-request-${Date.now()}`,
    sender: 'bot',
    text: `Here is the step-by-step guide to requesting a service on TrabaHome:\n\n` +
      `1️⃣ **Search for a Skilled Worker**\n` +
      `Go to the **Search** page and select the service you need (e.g., Plumbing, Carpentry, Electrical) and your municipality in Pangasinan.\n\n` +
      `2️⃣ **Compare Worker Profiles**\n` +
      `Browse nearby verified workers, check their ratings, past reviews, experience, and uploaded proof-of-work photos.\n\n` +
      `3️⃣ **Click "Request Service"**\n` +
      `Open the worker's profile and click the **Request Service** button.\n\n` +
      `4️⃣ **Provide Job Details**\n` +
      `• Select the specific trade/service needed.\n` +
      `• Describe the problem or task clearly.\n` +
      `• Pick your preferred date and time.\n` +
      `• Confirm your exact address in Pangasinan and contact number.\n\n` +
      `5️⃣ **Review & Submit**\n` +
      `Review your booking summary and click **Submit Request**.\n\n` +
      `6️⃣ **Worker Response & Chat**\n` +
      `The worker receives an immediate alert to accept or decline. Once accepted, you can coordinate in real-time via **Messages** (/homeowner-messages) and track progress in **My Bookings**!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actions: [
      { label: 'Find Workers Near You', route: '/search', variant: 'primary' },
      { label: 'Browse All Services', route: '/services', variant: 'outline' },
      { label: 'My Bookings', route: '/homeowner-bookings', variant: 'outline' }
    ],
    quickReplies: [
      '🔍 What services are offered?',
      '💬 How does in-app messaging work?',
      '🧾 What is an Official E-Receipt?'
    ]
  };
}

