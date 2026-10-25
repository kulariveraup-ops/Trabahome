import type { FAQItem } from '../../types/chatbot.types.ts';

export const FAQ_KNOWLEDGE_BASE: FAQItem[] = [
  // ── CATEGORY A: Getting Started ─────────────────────────────────
  {
    id: 'what-is-trabahome',
    category: 'Getting Started',
    question: 'What is TrabaHome?',
    keywords: ['what is', 'about', 'overview', 'platform', 'purpose', 'system', 'intro'],
    answer: 'TrabaHome is a web-based platform designed to connect homeowners with local skilled workers. It helps homeowners find suitable workers based on location, skills, and ratings, while helping skilled workers discover and respond to local job opportunities.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'Who can use TrabaHome?',
      'Where is TrabaHome available?',
      'How do I create an account?'
    ],
    actions: [
      { label: 'Explore Services', route: '/search', variant: 'primary' },
      { label: 'Create an Account', route: '/signup', variant: 'outline' }
    ]
  },
  {
    id: 'who-can-use',
    category: 'Getting Started',
    question: 'Who can use TrabaHome?',
    keywords: ['who can use', 'target users', 'user types', 'homeowner', 'worker', 'roles', 'clients'],
    answer: 'TrabaHome is designed for two main user groups: 1) Homeowners who want to search for skilled workers, submit job requests, and rate completed services; and 2) Skilled Workers (carpenters, plumbers, electricians, etc.) who can create a profile, showcase proof of work, receive job requests, and accept or decline jobs.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'Should I register as a homeowner or worker?',
      'How do I create an account?'
    ],
    actions: [
      { label: 'Register as Homeowner', route: '/signup', variant: 'primary' },
      { label: 'Register as Worker', route: '/worker-signup', variant: 'outline' }
    ]
  },
  {
    id: 'is-mobile-app',
    category: 'Getting Started',
    question: 'Is TrabaHome a mobile application?',
    keywords: ['mobile app', 'app store', 'play store', 'download', 'android', 'ios', 'apk', 'install'],
    answer: 'TrabaHome is currently being developed as a web-based platform. The pilot implementation does not include a dedicated mobile application, but the website is fully accessible via desktop and mobile web browsers.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'What is TrabaHome?',
      'Where is TrabaHome available?'
    ]
  },
  {
    id: 'where-available',
    category: 'Getting Started',
    question: 'Where is TrabaHome available?',
    keywords: ['where', 'location', 'coverage', 'pangasinan', 'dagupan', 'availability', 'cities', 'municipalities'],
    answer: 'TrabaHome is designed for a pilot implementation in selected municipalities within the Province of Pangasinan, Philippines (including Dagupan City, Lingayen, San Carlos, Urdaneta, Calasiao, and Binmaley).',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How does location affect worker matching?',
      'How do I find a skilled worker?'
    ],
    actions: [
      { label: 'View Interactive Map', route: '/map', variant: 'primary' }
    ]
  },

  // ── CATEGORY B: Account Creation ────────────────────────────────
  {
    id: 'create-account',
    category: 'Account Creation',
    question: 'How do I create an account?',
    keywords: ['create account', 'register', 'sign up', 'join', 'registration', 'new account'],
    answer: 'To create a TrabaHome account:\n1. Choose your account type (Homeowner or Skilled Worker).\n2. Fill in your personal details, Philippine mobile number, and Pangasinan location.\n3. Create a secure password (at least 8 characters with uppercase and number).\n4. Agree to the Terms & Conditions and Privacy Policy.\n5. Complete registration and sign in.',
    role: ['guest'],
    relatedQuestions: [
      'Should I register as a homeowner or worker?',
      'What information is required to register?'
    ],
    actions: [
      { label: 'Register as Homeowner', route: '/signup', variant: 'primary' },
      { label: 'Register as Skilled Worker', route: '/worker-signup', variant: 'outline' }
    ]
  },
  {
    id: 'homeowner-or-worker',
    category: 'Account Creation',
    question: 'Should I register as a homeowner or worker?',
    keywords: ['homeowner or worker', 'which account', 'choose role', 'difference', 'account type'],
    answer: 'Are you looking for someone to perform home repairs, electrical work, plumbing, or cleaning? → Choose **Homeowner**.\n\nDo you provide skilled trades or repair services and want to receive job requests from clients? → Choose **Skilled Worker**.',
    role: ['guest'],
    relatedQuestions: [
      'What information is required to register?',
      'How do I create an account?'
    ],
    actions: [
      { label: 'Homeowner Sign Up', route: '/signup', variant: 'primary' },
      { label: 'Worker Sign Up', route: '/worker-signup', variant: 'outline' }
    ]
  },
  {
    id: 'required-information',
    category: 'Account Creation',
    question: 'What information is required to register?',
    keywords: ['required info', 'requirements', 'documents', 'fields', 'signup info', 'form fields'],
    answer: 'For **Homeowners**: Name, email, Philippine mobile (09XXXXXXXXX), province, city, barangay, address, and password.\n\nFor **Skilled Workers**: Personal contact info, profession/service category, city, barangay in Pangasinan, and Proof of Work image uploads showcasing your past work.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How are workers verified?',
      'How do I create an account?'
    ],
    actions: [
      { label: 'Register as Homeowner', route: '/signup', variant: 'primary' },
      { label: 'Register as Worker', route: '/worker-signup', variant: 'outline' }
    ]
  },

  // ── CATEGORY C: Login & Account Access ──────────────────────────
  {
    id: 'how-to-login',
    category: 'Login & Access',
    question: 'How do I log in?',
    keywords: ['log in', 'login', 'sign in', 'access account', 'portal'],
    answer: 'Click Login on the navigation bar, choose your portal (Homeowner or Worker), and enter your registered email and password. Workers are required to complete OTP email verification for security.',
    role: ['guest'],
    relatedQuestions: [
      'I forgot my password. What should I do?',
      'How do I create an account?'
    ],
    actions: [
      { label: 'Homeowner Login', route: '/login', variant: 'primary' },
      { label: 'Worker Login', route: '/worker-login', variant: 'outline' }
    ]
  },
  {
    id: 'forgot-password',
    category: 'Login & Access',
    question: 'I forgot my password. What should I do?',
    keywords: ['forgot password', 'reset password', 'recover account', 'lost password', 'otp password'],
    answer: 'To reset your password:\n1. Go to the login page and click "Forgot Password".\n2. Enter your registered email address.\n3. Check your email inbox for a 6-digit verification OTP code.\n4. Enter the code and set your new password.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How do I log in?',
      'How can I protect my account?'
    ],
    actions: [
      { label: 'Homeowner Password Reset', route: '/homeowner-forgot-password', variant: 'primary' },
      { label: 'Worker Password Reset', route: '/worker-forgot-password', variant: 'outline' }
    ]
  },

  // ── CATEGORY D: Finding a Skilled Worker ────────────────────────
  {
    id: 'find-worker',
    category: 'Finding Workers',
    question: 'How do I find a skilled worker?',
    keywords: ['find worker', 'search worker', 'look for', 'plumber', 'electrician', 'carpenter', 'handyman', 'browse workers'],
    answer: 'To find a skilled worker:\n1. Log in to your Homeowner account.\n2. Open the Search or Worker List section.\n3. Enter or select the service you need and filter by municipality.\n4. Compare worker profiles, experience, ratings, and location.\n5. Select a worker and click "Book Service" or "Request Service".',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'What types of workers are available?',
      'How does TrabaHome rank workers?',
      'How do I hire a worker?'
    ],
    actions: [
      { label: 'Search Workers', route: '/search', variant: 'primary' },
      { label: 'View Worker List', route: '/list', variant: 'outline' },
      { label: 'Interactive Map', route: '/map', variant: 'outline' }
    ]
  },
  {
    id: 'worker-types',
    category: 'Finding Workers',
    question: 'What types of skilled workers can I find?',
    keywords: ['types of workers', 'skills', 'categories', 'services', 'trades', 'professions'],
    answer: 'TrabaHome supports various skilled trades including: Electrician, Plumber, Carpenter, Mason, Painter, Welder, HVAC Technician, Roofer, Landscaper, Cleaner/Housekeeper, Appliance Repair, and General Handyman.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'How do I find a skilled worker?',
      'How does TrabaHome rank workers?'
    ],
    actions: [
      { label: 'Browse Workers', route: '/search', variant: 'primary' }
    ]
  },

  // ── CATEGORY E: Worker Matching & Ranking ───────────────────────
  {
    id: 'worker-ranking',
    category: 'Matching & Ranking',
    question: 'How does TrabaHome rank workers?',
    keywords: ['rank workers', 'ranking', 'recommend', 'matching', 'algorithm', 'weighted score', 'distance'],
    answer: 'TrabaHome uses a weighted ranking approach considering:\n1. **Proximity**: Worker distance relative to your location using geospatial coordinates.\n2. **Skill Relevance**: How closely the worker\'s trade matches your request.\n3. **Ratings & Reviews**: Historical ratings from completed service requests.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'Does TrabaHome automatically choose a worker for me?',
      'How does location affect worker matching?'
    ],
    actions: [
      { label: 'View Ranked Workers', route: '/search', variant: 'primary' }
    ]
  },
  {
    id: 'auto-choose-worker',
    category: 'Matching & Ranking',
    question: 'Does TrabaHome automatically choose a worker for me?',
    keywords: ['auto choose', 'automatic booking', 'algorithm decision', 'pick worker'],
    answer: 'No. TrabaHome assists with worker discovery and ranking, but the homeowner retains full control to review available workers, inspect their profiles, and decide which worker to request.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'How does TrabaHome rank workers?',
      'How do I hire a worker?'
    ]
  },

  // ── CATEGORY F: Geolocation ─────────────────────────────────────
  {
    id: 'why-location',
    category: 'Geolocation',
    question: 'Why does TrabaHome use location?',
    keywords: ['why location', 'gps', 'coordinates', 'map', 'nearby', 'proximity'],
    answer: 'Location data helps TrabaHome identify nearby skilled workers and calculate travel distance, enabling faster response times and reliable home service delivery in Pangasinan.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How does location affect worker matching?',
      'Why can\'t I find a nearby worker?'
    ],
    actions: [
      { label: 'Open Map', route: '/map', variant: 'primary' }
    ]
  },
  {
    id: 'location-affect-ranking',
    category: 'Geolocation',
    question: 'Does location affect worker ranking?',
    keywords: ['location ranking', 'distance score', 'proximity effect'],
    answer: 'Yes. Proximity is a primary factor. Workers closer to your municipality or address are prioritized in default search results to minimize travel delays.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'Why can\'t I find a nearby worker?',
      'How does TrabaHome rank workers?'
    ]
  },
  {
    id: 'cannot-find-nearby-worker',
    category: 'Geolocation',
    question: 'Why can\'t I find a nearby worker?',
    keywords: ['cant find', 'no workers', 'empty search', 'nearby worker missing', 'no results'],
    answer: 'If no nearby workers appear:\n1. Check if browser location permission is enabled.\n2. Confirm you have selected the correct service trade.\n3. Try expanding the search radius or selecting an adjacent municipality.\n4. Some registered workers may currently be offline or occupied with other jobs.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'How do I find a skilled worker?',
      'What types of workers are available?'
    ],
    actions: [
      { label: 'View All Workers', route: '/list', variant: 'primary' },
      { label: 'Check Map', route: '/map', variant: 'outline' }
    ]
  },

  // ── CATEGORY G: Hiring / Booking ────────────────────────────────
  {
    id: 'offered-services-list',
    category: 'Services & Trades',
    question: 'What services and professions are offered on TrabaHome?',
    keywords: [
      'services',
      'professions',
      'offered services',
      'available services',
      'list of services',
      'trades',
      'what can i hire',
      'what services do you offer',
      'categories of services'
    ],
    answer:
      'TrabaHome offers 26 verified skilled professions across Pangasinan:\n\n' +
      '• **Home Repairs**: Appliance Repair, Carpenter, Electrician, Handyman, Mason / Concrete, Painter, Plumber, Roofer / Tinsmith, Welder.\n' +
      '• **Cleaning & Yard**: Housekeeper / Cleaner, Window Cleaner, Pest Control, Gardener.\n' +
      '• **Personal & Wellness**: Babysitter, Hair Stylist / Barber, Makeup Artist, Massage Therapist, Tailor / Seamstress, Pet Groomer / Sitter.\n' +
      '• **Events & Food**: Baker / Pastry Chef, Caterer / Cook, Event Host / Emcee, Photographer / Videographer, Graphic Designer / Artist.\n\n' +
      'Each service has verified background checks, client reviews, and direct booking.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How do I request a service on TrabaHome?',
      'How do I find a skilled worker?',
      'Where is TrabaHome available?'
    ],
    actions: [
      { label: 'View All 26 Services', route: '/services', variant: 'primary' },
      { label: 'Find a Worker', route: '/search', variant: 'outline' }
    ]
  },
  {
    id: 'how-to-request-service',
    category: 'Hiring & Booking',
    question: 'How do I request a service on TrabaHome?',
    keywords: [
      'how to request a service',
      'request service',
      'steps to request a service',
      'instructions to request a service',
      'how to book a service',
      'booking steps',
      'service request instructions',
      'hire worker',
      'book'
    ],
    answer:
      'Here are the step-by-step instructions to request a service on TrabaHome:\n\n' +
      '1. **Search**: Go to Search (/search), choose your required service and Pangasinan location.\n' +
      '2. **Compare**: Browse verified workers, rating scores, past reviews, and proof-of-work photos.\n' +
      '3. **Request**: On the worker\'s profile, click "Request Service".\n' +
      '4. **Fill Details**: Select the trade, describe the task, pick preferred date/time, and enter your address.\n' +
      '5. **Submit**: Proofread and confirm your request.\n' +
      '6. **Coordinate**: Once the worker accepts, chat via Messages (/homeowner-messages) and track in My Bookings.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'What services and professions are offered on TrabaHome?',
      'Is the booking automatically confirmed?',
      'Can I cancel a request?'
    ],
    actions: [
      { label: 'Find a Worker', route: '/search', variant: 'primary' },
      { label: 'View All Services', route: '/services', variant: 'outline' },
      { label: 'My Bookings', route: '/homeowner-bookings', variant: 'outline' }
    ]
  },
  {
    id: 'hire-worker',
    category: 'Hiring & Booking',
    question: 'How do I hire a skilled worker?',
    keywords: ['hire', 'book', 'hire worker', 'booking', 'hire process', 'request service'],
    answer: 'To hire a skilled worker:\n1. Search for a worker in your area and open their profile.\n2. Click "Book Service".\n3. Specify the service type, description of work, preferred date, time, and service address.\n4. Submit the request. The worker receives an alert and can Accept or Decline.',
    role: ['guest', 'homeowner'],
    relatedQuestions: [
      'What services and professions are offered on TrabaHome?',
      'Is the booking automatically confirmed?',
      'Can I cancel a request?',
      'What is a job request?'
    ],
    actions: [
      { label: 'Find a Worker', route: '/search', variant: 'primary' },
      { label: 'My Bookings', route: '/homeowner-bookings', variant: 'outline' }
    ]
  },
  {
    id: 'booking-auto-confirmed',
    category: 'Hiring & Booking',
    question: 'Is the booking automatically confirmed?',
    keywords: ['auto confirm', 'instant booking', 'automatic confirmation'],
    answer: 'No. A job request is submitted with status **PENDING**. The selected skilled worker must review your job details and availability before accepting or declining the request.',
    role: ['homeowner', 'guest'],
    relatedQuestions: [
      'How do I hire a skilled worker?',
      'What happens if a worker doesn\'t respond?'
    ],
    actions: [
      { label: 'View My Bookings', route: '/homeowner-bookings', variant: 'primary' }
    ]
  },

  // ── CATEGORY H: Job Requests ────────────────────────────────────
  {
    id: 'what-is-job-request',
    category: 'Job Requests',
    question: 'What is a job request?',
    keywords: ['job request', 'service ticket', 'request details', 'what is request'],
    answer: 'A job request is a formal service proposal submitted by a homeowner to a skilled worker detailing the problem, location, contact number, and requested date/time.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'What information should I include in a job request?',
      'Can I cancel a request?'
    ],
    actions: [
      { label: 'My Bookings', route: '/homeowner-bookings', variant: 'primary' }
    ]
  },
  {
    id: 'job-request-info',
    category: 'Job Requests',
    question: 'What information should I include in a job request?',
    keywords: ['job request fields', 'what to include', 'job details', 'request form'],
    answer: 'When submitting a request, include: 1) Service category (e.g., Plumbing, Electrical), 2) Clear description of the problem, 3) Preferred date and time, 4) Complete service address (house/street, barangay, city), and 5) Contact phone number.',
    role: ['homeowner'],
    relatedQuestions: [
      'How do I hire a skilled worker?',
      'Can I cancel a request?'
    ]
  },
  {
    id: 'cancel-request',
    category: 'Job Requests',
    question: 'Can I cancel a request?',
    keywords: ['cancel request', 'cancellation', 'cancel booking', 'stop job'],
    answer: 'Yes. Both homeowners and workers can cancel a pending or ongoing job request directly from their dashboard (Homeowner Bookings or Worker Jobs). The status will be marked as Cancelled.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'What is a job request?',
      'What happens if a worker doesn\'t respond?'
    ],
    actions: [
      { label: 'Manage Bookings', route: '/homeowner-bookings', variant: 'primary' }
    ]
  },

  // ── CATEGORY I: Worker Side ─────────────────────────────────────
  {
    id: 'worker-registration',
    category: 'For Skilled Workers',
    question: 'How do I register as a skilled worker?',
    keywords: ['register worker', 'worker registration', 'apply as worker', 'become a worker'],
    answer: 'Click "Register as Worker", provide your personal information, contact number, profession/trade, and Pangasinan location, and upload photos of your past work (Proof of Work). Once submitted, your profile enters verification to confirm your service details and ensure trust with homeowners.',
    role: ['guest', 'worker'],
    relatedQuestions: [
      'How are workers verified?',
      'How do I receive jobs?'
    ],
    actions: [
      { label: 'Register as Worker', route: '/worker-signup', variant: 'primary' }
    ]
  },
  {
    id: 'worker-receive-jobs',
    category: 'For Skilled Workers',
    question: 'How do I receive jobs?',
    keywords: ['receive jobs', 'get jobs', 'job alerts', 'incoming requests'],
    answer: 'Homeowners find your profile through the worker directory or map and send you job requests. You will see incoming requests on your **Worker Jobs** dashboard and receive an email notification alert.',
    role: ['worker'],
    relatedQuestions: [
      'How does a worker accept a job?',
      'How does a worker decline a job?'
    ],
    actions: [
      { label: 'View Worker Jobs', route: '/worker-jobs', variant: 'primary' }
    ]
  },
  {
    id: 'worker-accept-job',
    category: 'For Skilled Workers',
    question: 'How does a worker accept a job?',
    keywords: ['accept job', 'confirm job', 'take job'],
    answer: 'Open your **Worker Jobs** page, review the customer\'s job description, scheduled date/time, and address, then click **Accept**. The status updates to Ongoing and the customer is notified.',
    role: ['worker'],
    relatedQuestions: [
      'How does a worker decline a job?',
      'How do email notifications work?'
    ],
    actions: [
      { label: 'Go to Jobs Dashboard', route: '/worker-jobs', variant: 'primary' }
    ]
  },
  {
    id: 'worker-decline-job',
    category: 'For Skilled Workers',
    question: 'How does a worker decline a job?',
    keywords: ['decline job', 'reject job', 'cannot take job'],
    answer: 'If you are unavailable or cannot fulfill the job, open the request in your **Worker Jobs** dashboard, click **Decline**, and select a reason. The homeowner will be informed so they can find another provider.',
    role: ['worker'],
    relatedQuestions: [
      'How does a worker accept a job?',
      'How do I receive jobs?'
    ],
    actions: [
      { label: 'Go to Jobs Dashboard', route: '/worker-jobs', variant: 'primary' }
    ]
  },

  // ── CATEGORY J: Worker Verification ─────────────────────────────
  {
    id: 'worker-verification',
    category: 'Worker Verification',
    question: 'How are workers verified?',
    keywords: ['verified', 'verification', 'background check', 'legit', 'proof of work', 'vetting', 'ai verification', 'valid id'],
    answer: 'TrabaHome utilizes an advanced AI identity verification system. Skilled workers submit an official Philippine Government ID (PhilSys ID, Driver\'s License, Passport, UMID, Postal ID, SSS, Voter\'s ID) and a live selfie. The system runs OCR extraction, facial biometrics matching, and liveness checks to grant immediate Verified Worker status.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'Why is verification important?',
      'Can workers have multiple professions?'
    ],
    actions: [
      { label: 'Find Verified Workers', route: '/search', variant: 'primary' }
    ]
  },
  {
    id: 'why-verification-important',
    category: 'Worker Verification',
    question: 'Why is verification important?',
    keywords: ['why verification', 'trust', 'safety', 'security', 'verified badge'],
    answer: 'Worker verification promotes safety, accountability, and reliability on the platform. It helps homeowners feel confident when hiring and ensures skilled tradespersons are genuine practitioners.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How are workers verified?',
      'Should I trust every worker?'
    ]
  },

  // ── CATEGORY K: Ratings & Reviews ───────────────────────────────
  {
    id: 'ratings-reviews',
    category: 'Ratings & Reviews',
    question: 'How do ratings and reviews work?',
    keywords: ['ratings', 'reviews', 'stars', 'feedback', 'rate worker', 'mutual review'],
    answer: 'TrabaHome features a two-way mutual review system. Once a job is completed and the Official E-Receipt is generated, the homeowner rates the worker (1 to 5 stars with feedback tags and comments). Likewise, the worker provides a mutual rating for the homeowner. This fosters trust and accountability across the community.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'Why are ratings important?',
      'How does the Official E-Receipt work?'
    ],
    actions: [
      { label: 'View Bookings', route: '/homeowner-bookings', variant: 'primary' }
    ]
  },
  {
    id: 'why-ratings-important',
    category: 'Ratings & Reviews',
    question: 'Why are ratings important?',
    keywords: ['why ratings', 'rating score', 'reputation', 'review benefits'],
    answer: 'Ratings reward reliable workers with higher platform visibility and build confidence for homeowners seeking high-quality craftsmanship.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'How do ratings and reviews work?',
      'How does TrabaHome rank workers?'
    ]
  },

  // ── CATEGORY L: Email Notifications ──────────────────────────────
  {
    id: 'how-email-notifications-work',
    category: 'Email Notifications',
    question: 'How do email notifications work?',
    keywords: ['email notification', 'email alert', 'how email works', 'booking email', 'inbox alert'],
    answer: 'TrabaHome utilizes secure email notifications to deliver critical job updates (new service requests, acceptances, and booking confirmations) directly to your registered email inbox.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'What notifications do I receive by email?',
      'Why haven\'t I received an email notification?'
    ]
  },
  {
    id: 'email-notifications-list',
    category: 'Email Notifications',
    question: 'What notifications do I receive by email?',
    keywords: ['what emails', 'email types', 'email alerts list'],
    answer: 'You receive email alerts for new service requests, worker acceptances/declines, booking schedule confirmations, security OTPs, and password reset instructions.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How do email notifications work?'
    ]
  },

  // ── CATEGORY M: Safety, Payments, E-Receipts & Disputes ──────────
  {
    id: 'how-ereceipt-works',
    category: 'E-Receipts & Payments',
    question: 'How does the Official E-Receipt work?',
    keywords: ['e-receipt', 'ereceipt', 'official receipt', 'receipt', 'proof of payment', 'receipt download'],
    answer: 'Upon completing work on-site, the worker uploads 2–5 proof-of-work photos, 1–3 proof-of-payment receipts, the final service charge in PHP, and a job summary. TrabaHome automatically generates an Official E-Receipt detailing the job reference, date, breakdown, and photo evidence. Both homeowner and worker can view and download this receipt anytime under Bookings.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How does a worker complete a job?',
      'Does TrabaHome support online payments?'
    ],
    actions: [
      { label: 'View My Bookings', route: '/homeowner-bookings', variant: 'primary' }
    ]
  },
  {
    id: 'how-worker-completes-job',
    category: 'E-Receipts & Payments',
    question: 'How does a skilled worker complete a job?',
    keywords: ['complete job', 'finish job', 'mark completed', 'upload proof of work', 'upload proof of payment'],
    answer: 'To complete a job:\n1. Open your **Worker Jobs** dashboard and click "Complete Job" on an active request.\n2. Upload 2 to 5 proof-of-work photos showing your completed task.\n3. Enter the agreed service payment amount in PHP.\n4. Upload 1 to 3 proof-of-payment receipts (cash acknowledgement, GCash screenshot, or bank receipt).\n5. Enter a brief job summary and rate your experience with the homeowner.\n6. Submit to instantly generate the Official E-Receipt and notify the homeowner.',
    role: ['worker'],
    relatedQuestions: [
      'How does the Official E-Receipt work?',
      'How do ratings and reviews work?'
    ],
    actions: [
      { label: 'Go to Jobs Dashboard', route: '/worker-jobs', variant: 'primary' }
    ]
  },
  {
    id: 'online-payments',
    category: 'Payments',
    question: 'Does TrabaHome support online payments?',
    keywords: ['payment', 'online payment', 'gcash', 'credit card', 'paymaya', 'wallet', 'bank transfer', 'how to pay'],
    answer: 'Service payments are arranged directly between the homeowner and the skilled worker (via cash on-site, personal GCash, or bank transfer). When marking the job completed, the worker submits the proof of payment receipt and agreed amount to generate a verified Official TrabaHome E-Receipt.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How does the Official E-Receipt work?',
      'How do I hire a skilled worker?'
    ]
  },
  {
    id: 'how-messaging-works',
    category: 'Messaging & Communication',
    question: 'How does in-app messaging work?',
    keywords: ['message', 'chat', 'messaging', 'talk to worker', 'chat with homeowner', 'booking chat'],
    answer: 'TrabaHome provides built-in real-time messaging for active bookings. Homeowners and assigned workers can communicate directly, clarify task specifications, attach photos or documents, and coordinate arrival times through the Messages tab without leaving the platform.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'How do I hire a skilled worker?',
      'What happens if a worker doesn\'t respond?'
    ],
    actions: [
      { label: 'Open Homeowner Messages', route: '/homeowner-messages', variant: 'primary' },
      { label: 'Open Worker Messages', route: '/worker-messages', variant: 'outline' }
    ]
  },
  {
    id: 'worker-multi-professions',
    category: 'For Skilled Workers',
    question: 'Can workers offer more than one profession or trade?',
    keywords: ['multi-profession', 'multiple professions', 'skills', 'trades', 'up to 8', 'carpenter and plumber'],
    answer: 'Yes! TrabaHome supports multi-skilled workers. Skilled workers can select between 1 and up to 8 professions/trades (e.g., Carpentry, Plumbing, Electrical, Painting, Appliance Repair, Masonry, Cleaning, and General Handyman). This enables workers to receive booking requests across all their qualified skills.',
    role: ['guest', 'worker', 'homeowner'],
    relatedQuestions: [
      'How do I register as a skilled worker?',
      'How are workers verified?'
    ],
    actions: [
      { label: 'Worker Profile', route: '/worker-own-profile', variant: 'primary' },
      { label: 'Browse Workers', route: '/list', variant: 'outline' }
    ]
  },
  {
    id: 'worker-working-schedule',
    category: 'For Skilled Workers',
    question: 'How do workers set their working schedule?',
    keywords: ['working schedule', 'schedule', 'work days', 'working hours', 'availability'],
    answer: 'Workers can set their weekly working availability by choosing active days (minimum 1 to maximum 7 days, Monday through Sunday) and specifying their exact start and end working hours. Homeowners can view this schedule when booking a service.',
    role: ['worker', 'homeowner'],
    relatedQuestions: [
      'How does a worker accept a job?',
      'Can workers offer more than one profession or trade?'
    ],
    actions: [
      { label: 'Update Profile Schedule', route: '/worker-settings', variant: 'primary' }
    ]
  },
  {
    id: 'dispute-resolution',
    category: 'Disputes & Support',
    question: 'How does dispute resolution work on TrabaHome?',
    keywords: ['dispute', 'refund', 'complaint', 'argument', 'conflict', 'mediation', 'support ticket'],
    answer: 'If you encounter any booking conflict, service concern, or cancellation dispute, submit a support ticket via the Help & Support page. Administrators review message history, photo evidence, and AI conversation summaries to ensure fair, transparent mediation.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'How do support tickets work?',
      'How can I protect my account?'
    ],
    actions: [
      { label: 'Homeowner Help & Support', route: '/homeowner-help', variant: 'primary' },
      { label: 'Worker Help & Support', route: '/worker-help', variant: 'outline' }
    ]
  },
  {
    id: 'support-ticket-system',
    category: 'Disputes & Support',
    question: 'How do support tickets work?',
    keywords: ['support ticket', 'helpdesk', 'submit ticket', 'contact support', 'customer service'],
    answer: 'Under Help & Support (/homeowner-help or /worker-help), you can open a new support ticket by selecting a category (e.g. Account, Booking, Payment, Technical, or Dispute) and describing your issue. Administrators respond directly in your ticket thread, and you receive notification alerts upon reply.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'How does dispute resolution work on TrabaHome?',
      'Can I cancel a request?'
    ],
    actions: [
      { label: 'Submit Ticket', route: '/homeowner-help', variant: 'primary' }
    ]
  },
  {
    id: 'protect-account',
    category: 'Account Safety',
    question: 'How can I protect my account?',
    keywords: ['protect account', 'security', 'safety', 'privacy', 'password tips'],
    answer: 'Keep your login credentials private, never share your OTP verification codes, use a strong password with letters and numbers, and always verify service details directly through the platform.',
    role: ['homeowner', 'worker'],
    relatedQuestions: [
      'I forgot my password. What should I do?'
    ]
  },

  // ── CATEGORY N: Troubleshooting ─────────────────────────────────
  {
    id: 'troubleshoot-worker-not-responding',
    category: 'Troubleshooting',
    question: 'What happens if a worker doesn\'t respond?',
    keywords: ['worker not responding', 'no reply', 'unanswered request', 'pending request ignored'],
    answer: 'Skilled workers may be currently on a job or away from their phones. If a request remains unanswered for a reasonable period, you may cancel the pending request and send a request to another available worker.',
    role: ['homeowner'],
    relatedQuestions: [
      'Can I cancel a request?',
      'How do I find a skilled worker?'
    ],
    actions: [
      { label: 'Find Another Worker', route: '/search', variant: 'primary' },
      { label: 'Check Bookings', route: '/homeowner-bookings', variant: 'outline' }
    ]
  },
  {
    id: 'troubleshoot-login-problem',
    category: 'Troubleshooting',
    question: 'I cannot log in to my account.',
    keywords: ['cannot login', 'login failed', 'login error', 'locked out', 'invalid credentials'],
    answer: '1. Verify you are using the correct login page (Homeowner vs Worker).\n2. Ensure your email and password are typed correctly.\n3. If your account was locked due to too many failed attempts, please wait 15 minutes.\n4. If needed, click "Forgot Password" to reset your credentials.',
    role: ['guest', 'homeowner', 'worker'],
    relatedQuestions: [
      'I forgot my password. What should I do?',
      'How do I log in?'
    ],
    actions: [
      { label: 'Forgot Password', route: '/homeowner-forgot-password', variant: 'primary' },
      { label: 'Try Logging In', route: '/login', variant: 'outline' }
    ]
  },

  // ── CATEGORY O: Admin Operations & Platform Supervision ──────────
  {
    id: 'admin-dashboard-overview',
    category: 'Admin Operations',
    question: 'How do I use the Admin Dashboard?',
    keywords: ['admin dashboard', 'dashboard', 'metrics', 'statistics', 'platform analytics', 'kpi', 'system overview', 'how do i monitor dashboard statistics'],
    answer: 'The Admin Dashboard provides a real-time overview of platform operations in Pangasinan:\n1. **Core Metrics**: View total registered workers, homeowners, active jobs, and completed bookings.\n2. **Pending Actions**: Monitor worker accounts awaiting ID or biometric approval.\n3. **Recent Activity**: Inspect newly created service requests and system alerts.\n4. **Quick Navigation**: Use the sidebar to jump directly into Workers, Homeowners, Requests, Helpdesk, or Logs.',
    role: ['admin'],
    relatedQuestions: [
      'How do I manage registered skilled workers?',
      'How do I supervise service booking requests across Pangasinan?'
    ],
    actions: [
      { label: 'Go to Dashboard', route: '/admin-dashboard', variant: 'primary' },
      { label: 'Service Requests', route: '/admin-requests', variant: 'outline' }
    ]
  },
  {
    id: 'admin-manage-workers',
    category: 'Admin Operations',
    question: 'How do I manage registered skilled workers?',
    keywords: ['manage workers', 'worker list', 'worker management', 'worker directory', 'edit worker', 'skilled workers list', 'how do i verify and approve worker accounts'],
    answer: 'Navigate to **Manage Workers** (/admin-workers) to view all registered workers across Pangasinan:\n1. Filter by municipality and trade (e.g. Carpentry, Plumbing, Electrical).\n2. View verification status badges, contact numbers, and rating scores.\n3. Inspect uploaded Proof of Work portfolios.\n4. Suspend or reactivate worker profiles as needed.\n5. Click "Add Worker" to manually onboard a skilled tradesperson.',
    role: ['admin'],
    relatedQuestions: [
      'How does worker ID and biometric verification approval work?',
      'How do I suspend or activate a worker account?'
    ],
    actions: [
      { label: 'Manage Workers', route: '/admin-workers', variant: 'primary' }
    ]
  },
  {
    id: 'admin-worker-verification',
    category: 'Admin Operations',
    question: 'How does worker ID and biometric verification approval work?',
    keywords: ['verify worker', 'worker approval', 'approve worker', 'id verification', 'biometrics', 'ocr', 'ai verification approval', 'reject worker', 'how do i verify worker accounts'],
    answer: 'Workers submit a Philippine Government ID (PhilSys ID, Driver\'s License, Passport, UMID, Postal ID, SSS, Voter\'s ID) and a live selfie. The platform runs automated OCR data extraction and facial biometrics comparison.\n\nFrom **Manage Workers** (/admin-workers), administrators can review the verification confidence score, cross-check the ID photos, and confirm or revoke Verified status.',
    role: ['admin'],
    relatedQuestions: [
      'How do I manage registered skilled workers?',
      'How do I suspend or activate a worker account?'
    ],
    actions: [
      { label: 'Worker Approvals', route: '/admin-workers', variant: 'primary' }
    ]
  },
  {
    id: 'admin-suspend-worker',
    category: 'Admin Operations',
    question: 'How do I suspend or activate a worker account?',
    keywords: ['suspend worker', 'deactivate worker', 'ban worker', 'reactivate worker', 'worker account status'],
    answer: 'To modify worker status:\n1. Open **Manage Workers** (/admin-workers).\n2. Locate the worker record and toggle their status to **Suspended** or **Active**.\n3. Suspended workers cannot receive new booking requests or appear in search rankings until reactivated.\n4. An automated notification alert is recorded for audit purposes.',
    role: ['admin'],
    relatedQuestions: [
      'How do I manage registered skilled workers?',
      'How do I handle user support tickets and dispute mediation?'
    ],
    actions: [
      { label: 'Worker Management', route: '/admin-workers', variant: 'primary' }
    ]
  },
  {
    id: 'admin-manage-homeowners',
    category: 'Admin Operations',
    question: 'How do I manage homeowner accounts?',
    keywords: ['manage homeowners', 'homeowner list', 'homeowner management', 'homeowners directory', 'suspend homeowner', 'deactivate homeowner', 'how do i manage homeowner accounts'],
    answer: 'Go to **Manage Homeowners** (/admin-homeowners) to supervise homeowner profiles:\n1. View all registered homeowners, mobile numbers, and Pangasinan municipalities.\n2. Review their booking history and account status.\n3. Suspend accounts that violate community rules or reactivate existing users.\n4. Click "Add Homeowner" to manually register a client on their behalf.',
    role: ['admin'],
    relatedQuestions: [
      'How do I supervise service booking requests across Pangasinan?',
      'How do I handle user support tickets and dispute mediation?'
    ],
    actions: [
      { label: 'Manage Homeowners', route: '/admin-homeowners', variant: 'primary' }
    ]
  },
  {
    id: 'admin-service-requests',
    category: 'Admin Operations',
    question: 'How do I supervise service booking requests across Pangasinan?',
    keywords: ['service requests', 'manage bookings', 'all bookings', 'booking supervision', 'job requests admin', 'monitor jobs', 'how do i inspect service requests'],
    answer: 'In **Service Requests** (/admin-requests), administrators have complete visibility over jobs across Pangasinan:\n1. Filter bookings by status: **Pending**, **Accepted**, **In Progress**, **Completed**, or **Cancelled**.\n2. Review schedule dates, job scopes, and assigned worker-homeowner pairs.\n3. Monitor potential bottlenecks or delayed responses.\n4. Inspect proof-of-work evidence for completed tasks.',
    role: ['admin'],
    relatedQuestions: [
      'How do I inspect proof-of-work photos, payment receipts, and Official E-Receipts?',
      'How do I handle user support tickets and dispute mediation?'
    ],
    actions: [
      { label: 'View Service Requests', route: '/admin-requests', variant: 'primary' }
    ]
  },
  {
    id: 'admin-inspect-ereceipt',
    category: 'Admin Operations',
    question: 'How do I inspect proof-of-work photos, payment receipts, and Official E-Receipts?',
    keywords: ['inspect ereceipt', 'verify receipt', 'proof of work audit', 'payment proof audit', 'ereceipt admin', 'official receipt check'],
    answer: 'Under **Service Requests** (/admin-requests), select any completed request to review its completion audit bundle:\n1. **Proof of Work**: 2 to 5 full-resolution photos of the completed job.\n2. **Proof of Payment**: 1 to 3 receipts (cash acknowledgment or GCash transaction screenshots).\n3. **Agreed Charge**: The exact service fee in PHP declared by the worker.\n4. **Official E-Receipt**: The system-generated receipt timestamped with verification details.',
    role: ['admin'],
    relatedQuestions: [
      'How do I supervise service booking requests across Pangasinan?',
      'How do I handle user support tickets and dispute mediation?'
    ],
    actions: [
      { label: 'Inspect Requests', route: '/admin-requests', variant: 'primary' }
    ]
  },
  {
    id: 'admin-support-tickets',
    category: 'Admin Operations',
    question: 'How do I handle user support tickets and dispute mediation?',
    keywords: ['support tickets', 'help requests', 'helpdesk', 'disputes', 'ticket mediation', 'user complaints', 'resolve ticket', 'how do i handle support tickets'],
    answer: 'Open **Support & Helpdesk** (/admin-help-requests) to manage customer inquiries and disputes:\n1. Review incoming tickets categorized by Account, Booking, Payment, Technical, or Dispute.\n2. Read user explanations, screenshots, and attached documents.\n3. Reply directly to the user within the ticket conversation thread.\n4. Mediate disagreements and mark tickets as **Resolved** when concluded.',
    role: ['admin'],
    relatedQuestions: [
      'How do AI conversation summaries work on support tickets?',
      'How do I supervise service booking requests across Pangasinan?'
    ],
    actions: [
      { label: 'Open Helpdesk', route: '/admin-help-requests', variant: 'primary' }
    ]
  },
  {
    id: 'admin-ai-ticket-summary',
    category: 'Admin Operations',
    question: 'How do AI conversation summaries work on support tickets?',
    keywords: ['ai ticket summary', 'ai summary', 'dispute summary', 'conversation summary', 'ticket analysis'],
    answer: 'When mediating dispute tickets in the Helpdesk (/admin-help-requests), the built-in AI summarizes long booking chat transcripts between homeowner and worker. It highlights key milestones, agreed terms, and points of contention, allowing administrators to make rapid, objective mediation determinations.',
    role: ['admin'],
    relatedQuestions: [
      'How do I handle user support tickets and dispute mediation?'
    ],
    actions: [
      { label: 'Go to Helpdesk', route: '/admin-help-requests', variant: 'primary' }
    ]
  },
  {
    id: 'admin-email-logs',
    category: 'Admin Operations',
    question: 'How do I monitor system email delivery and OTP logs?',
    keywords: ['email logs', 'otp logs', 'email delivery', 'otp audit', 'sms logs', 'notification audit', 'how do i monitor email and otp logs'],
    answer: 'Navigate to **Email Logs** (/admin-emaillogs) to inspect automated emails dispatched by TrabaHome:\n1. Audit 6-digit login OTPs and registration confirmation codes.\n2. Review booking notifications sent to workers and homeowners.\n3. Verify email delivery timestamps and error diagnostics.\n4. Ensure compliance and reliable system notifications.',
    role: ['admin'],
    relatedQuestions: [
      'How do I use the Admin Dashboard?'
    ],
    actions: [
      { label: 'Open Email Logs', route: '/admin-emaillogs', variant: 'primary' }
    ]
  },
  {
    id: 'admin-manual-registration',
    category: 'Admin Operations',
    question: 'Can an administrator manually register a homeowner or worker?',
    keywords: ['manual registration', 'add worker manually', 'add homeowner manually', 'create user as admin', 'manually register'],
    answer: 'Yes! Administrators can manually register users:\n- **Skilled Workers**: From Manage Workers (/admin-workers), click "Add Worker" to register a tradesperson with their skills and location.\n- **Homeowners**: From Manage Homeowners (/admin-homeowners), click "Add Homeowner" to register a client profile.\nActivation and login instructions are sent to the registered email.',
    role: ['admin'],
    relatedQuestions: [
      'How do I manage registered skilled workers?',
      'How do I manage homeowner accounts?'
    ],
    actions: [
      { label: 'Add Worker', route: '/admin-workers', variant: 'primary' },
      { label: 'Add Homeowner', route: '/admin-homeowners', variant: 'outline' }
    ]
  },
  {
    id: 'admin-security',
    category: 'Admin Operations',
    question: 'How do I secure the Admin portal and credentials?',
    keywords: ['admin security', 'admin password', 'admin account', 'two factor', 'otp protection'],
    answer: 'Administrator accounts require two-factor email OTP authentication during sign-in and operate under strict session security. Always sign out from shared computers and monitor unauthorized access attempts through the system email logs.',
    role: ['admin'],
    relatedQuestions: [
      'How do I monitor system email delivery and OTP logs?'
    ],
    actions: [
      { label: 'Admin Dashboard', route: '/admin-dashboard', variant: 'primary' }
    ]
  }
];

export const INITIAL_WELCOME_QUICK_ACTIONS = [
  '🏠 Hire a Skilled Worker',
  '👤 Create an Account',
  '🔎 Find a Worker',
  '📋 Create a Job Request',
  '🛡️ Worker Verification',
  '⭐ Ratings & Reviews',
  '✉️ Email Notifications',
  '❓ More Questions'
];

export const TROUBLESHOOTING_PROMPTS = [
  '🔴 I can\'t log in',
  '🔴 I can\'t register',
  '🔴 I can\'t find a worker',
  '🔴 My worker isn\'t responding',
  '🔴 I didn\'t receive an email',
  '🔴 My location is incorrect',
  '🔴 My verification isn\'t complete',
  '🔴 I can\'t submit a job request'
];
