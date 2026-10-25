import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Search,
  Calendar,
  MessageSquare,
  Receipt,
  Star,
  ShieldCheck,
  Briefcase,
  Camera,
  MapPin,
  Sparkles,
  Award,
  Layers,
  Clock
} from 'lucide-react';
import { getHomeownerSession } from '../../utils/homeownerAuth.ts';
import { getWorkerSession } from '../../utils/workerAuth.ts';
import { homeownerAPI } from '../../services/HomeownerApi.ts';
import { workerAPI } from '../../services/WorkerApi.ts';

export interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'homeowner' | 'worker';
  userName?: string;
  onComplete?: () => void;
}

interface StepContent {
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ReactNode;
  iconBg: string;
  description: string;
  highlights: { title: string; desc: string }[];
  proTip: string;
}

export default function WelcomeOnboardingModal({
  isOpen,
  onClose,
  role,
  userName = '',
  onComplete,
}: WelcomeOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  React.useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(`trabahome_onboarding_completed_${role}`, 'true');
      const email =
        role === 'worker'
          ? getWorkerSession()?.email
          : getHomeownerSession()?.email;
      if (email) {
        const cleanEmail = String(email).trim().toLowerCase();
        localStorage.setItem(`trabahome_guide_seen_${cleanEmail}`, 'true');
        localStorage.removeItem(`trabahome_first_login_pending_${cleanEmail}`);
      }
      if (role === 'worker') {
        void workerAPI.markGuideSeen();
      } else {
        void homeownerAPI.markGuideSeen();
      }
    } catch {}
  }, [isOpen, role]);

  if (!isOpen) return null;

  const displayName = userName.trim() ? userName.split(' ')[0] : (role === 'worker' ? 'Partner' : 'Neighbor');

  const homeownerSteps: StepContent[] = [
    {
      title: '1. Discover Verified Skilled Workers',
      subtitle: 'Find verified trades across Pangasinan',
      badge: 'Step 1 of 4 • Discovery',
      icon: <Search className="w-7 h-7 text-[#004A8C] dark:text-blue-400" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900',
      description: 'Search for qualified carpenters, electricians, plumbers, masons, painters, and more across your Pangasinan municipality or barangay.',
      highlights: [
        {
          title: 'AI-Verified Identity',
          desc: 'Workers carry verified badges backed by Philippine government ID and biometric validation.'
        },
        {
          title: 'Smart Proximity Ranking',
          desc: 'Nearby workers are prioritized so you get fast on-site response times.'
        },
        {
          title: 'Past Work Portfolios',
          desc: 'Inspect real photos of past completed projects, ratings, and customer reviews.'
        }
      ],
      proTip: 'Use the interactive Map or List view to browse skilled workers right around your neighborhood.'
    },
    {
      title: '2. Request Service & Pick Your Schedule',
      subtitle: 'Transparent booking with date & time flexibility',
      badge: 'Step 2 of 4 • Booking',
      icon: <Calendar className="w-7 h-7 text-[#00A651]" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900',
      description: 'Send a formal service request specifying your repair or maintenance needs directly to your selected skilled worker.',
      highlights: [
        {
          title: 'Clear Problem Scope',
          desc: 'Describe what needs fixing so the worker understands required tools and materials.'
        },
        {
          title: 'Choose Preferred Date & Time',
          desc: 'Select a convenient schedule that aligns with the worker’s availability.'
        },
        {
          title: 'Privacy Protected',
          desc: 'Your contact number and exact home address remain hidden until the worker accepts.'
        }
      ],
      proTip: 'Workers receive instant email and in-app alerts and can accept or decline promptly.'
    },
    {
      title: '3. Real-Time Chat & Booking Updates',
      subtitle: 'Coordinate directly through built-in messenger',
      badge: 'Step 3 of 4 • Communication',
      icon: <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900',
      description: 'Communicate smoothly with your assigned worker using the integrated Messages tab to coordinate arrival and discuss scope.',
      highlights: [
        {
          title: 'In-App Direct Chat',
          desc: 'Talk directly with your worker without needing external social media or messaging apps.'
        },
        {
          title: 'Send Photos & Details',
          desc: 'Share reference pictures of parts, work areas, or issues right inside the conversation.'
        },
        {
          title: 'Status Notifications',
          desc: 'Receive real-time notifications when your booking moves from Pending to Accepted and Ongoing.'
        }
      ],
      proTip: 'Keep all job-related coordination inside TrabaHome messages for complete transparency.'
    },
    {
      title: '4. Official E-Receipt & Mutual Reviews',
      subtitle: 'Quality proof, official documentation & feedback',
      badge: 'Step 4 of 4 • Completion',
      icon: <Receipt className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900',
      description: 'Once work is completed on-site, the worker uploads photographic evidence and payment proof to generate an official TrabaHome E-Receipt.',
      highlights: [
        {
          title: 'Proof-of-Work Photos',
          desc: 'Inspect 2 to 5 photos uploaded by the worker showing the finished repair or service.'
        },
        {
          title: 'Downloadable E-Receipt',
          desc: 'Get an official, verifiable digital receipt containing service charges, reference numbers, and photos.'
        },
        {
          title: 'Two-Way Community Reviews',
          desc: 'Leave 1 to 5 stars and feedback tags to help maintain high quality and trusted service.'
        }
      ],
      proTip: 'Access all your past completed jobs and official E-Receipts anytime in your Bookings tab.'
    }
  ];

  const workerSteps: StepContent[] = [
    {
      title: '1. Receive & Manage Job Requests',
      subtitle: 'Connect with homeowners looking for your trade',
      badge: 'Step 1 of 4 • Incoming Jobs',
      icon: <Briefcase className="w-7 h-7 text-[#004A8C] dark:text-blue-400" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900',
      description: 'Receive real-time booking requests from homeowners in your Pangasinan area with transparent problem details and schedules.',
      highlights: [
        {
          title: 'Instant Job Alerts',
          desc: 'Get notified via in-app bell alerts and email whenever a homeowner books your service.'
        },
        {
          title: 'Detailed Problem Scope',
          desc: 'Review the customer’s description, requested date, time, and barangay location.'
        },
        {
          title: 'Freedom to Accept or Decline',
          desc: 'Accept requests that match your availability or decline with reason if you are occupied.'
        }
      ],
      proTip: 'Customize your working schedule (1 to 7 days and working hours) in Settings so clients book within your hours.'
    },
    {
      title: '2. In-App Messaging & On-Site Coordination',
      subtitle: 'Clarify details before heading to the job',
      badge: 'Step 2 of 4 • Coordination',
      icon: <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-100 dark:border-indigo-900',
      description: 'When you accept a request, the client’s contact number and address unlock. Coordinate arrival time and materials directly.',
      highlights: [
        {
          title: 'Unlocked Contact & Address',
          desc: 'View the homeowner’s exact service address and phone number upon accepting.'
        },
        {
          title: 'Real-Time In-App Chat',
          desc: 'Message homeowners to clarify material requirements, estimated arrival, and scope.'
        },
        {
          title: 'Photo Exchange',
          desc: 'Send and receive photos of equipment, parts, or worksite conditions.'
        }
      ],
      proTip: 'Confirm all materials and estimated charges via messages before commencing on-site work.'
    },
    {
      title: '3. Complete Jobs & Generate Official E-Receipt',
      subtitle: 'Document your work and finalize payment professionally',
      badge: 'Step 3 of 4 • Proof & E-Receipt',
      icon: <Camera className="w-7 h-7 text-[#00A651]" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900',
      description: 'When finished on-site, upload proof of work and payment to complete the job and generate an official verifiable TrabaHome E-Receipt.',
      highlights: [
        {
          title: '2 to 5 Proof-of-Work Photos',
          desc: 'Upload clear photos of the completed task (automatically optimized and compressed).'
        },
        {
          title: 'Proof of Payment Receipt',
          desc: 'Upload 1 to 3 receipts (cash acknowledgment, GCash screenshot, or bank receipt) with final PHP amount.'
        },
        {
          title: 'Automated Official E-Receipt',
          desc: 'The system automatically generates a formal E-Receipt with evidence for you and the homeowner.'
        }
      ],
      proTip: 'Direct payments (cash, GCash, or bank transfer) are logged through the app to protect your work record.'
    },
    {
      title: '4. Build Reputation & Offer Up to 8 Trades',
      subtitle: 'Rise in Pangasinan skilled rankings',
      badge: 'Step 4 of 4 • Growth & Skills',
      icon: <Award className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-100 dark:border-amber-900',
      description: 'Build a solid reputation with mutual ratings and showcase multiple professions to multiply your job opportunities.',
      highlights: [
        {
          title: 'Multi-Profession Profile',
          desc: 'Offer between 1 and up to 8 professions/trades (e.g. Carpentry, Plumbing, Electrical, Painting).'
        },
        {
          title: 'Two-Way Mutual Rating',
          desc: 'Rate your homeowner with 1 to 5 stars and tags upon job completion.'
        },
        {
          title: 'Higher Visibility & Rank',
          desc: 'Maintaining high ratings and verified badges places you at the top of homeowner searches.'
        }
      ],
      proTip: 'Keep your portfolio updated with fresh work photos to attract premium clients across Pangasinan.'
    }
  ];

  const steps = role === 'worker' ? workerSteps : homeownerSteps;
  const currentStepData = steps[currentStep] || steps[0];
  const isLastStep = currentStep === steps.length - 1;

  const handleFinish = () => {
    try {
      localStorage.setItem(`trabahome_onboarding_completed_${role}`, 'true');
      const email =
        role === 'worker'
          ? getWorkerSession()?.email
          : getHomeownerSession()?.email;
      if (email) {
        const cleanEmail = String(email).trim().toLowerCase();
        localStorage.setItem(`trabahome_guide_seen_${cleanEmail}`, 'true');
        localStorage.removeItem(`trabahome_first_login_pending_${cleanEmail}`);
      }
      if (role === 'worker') {
        void workerAPI.markGuideSeen();
      } else {
        void homeownerAPI.markGuideSeen();
      }
    } catch {}
    if (onComplete) onComplete();
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-[560px] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-left">
        
        {/* Top Header Banner */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white dark:from-slate-850 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#004A8C] text-white flex items-center justify-center font-black text-xs shadow-xs">
              TH
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Welcome to TrabaHome, {displayName}!
                </span>
                <Sparkles size={13} className="text-amber-400" />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-slate-400">
                Quick guide to master the platform in 4 steps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Skip and start using website"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 pt-4 pb-2 bg-gray-50/50 dark:bg-slate-850/50 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 shrink-0">
          <span className="text-[11px] font-bold text-[#004A8C] dark:text-blue-400">
            {currentStepData.badge}
          </span>
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-[#004A8C] dark:bg-blue-500'
                    : idx < currentStep
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-gray-200 dark:bg-slate-700'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Step Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed custom-scrollbar flex-1">
          {/* Main Step Header Card */}
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-850 border border-gray-100 dark:border-slate-750">
            <div className={`p-3 rounded-2xl border ${currentStepData.iconBg} shrink-0 shadow-xs`}>
              {currentStepData.icon}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-slate-100 leading-snug">
                {currentStepData.title}
              </h3>
              <p className="text-[11px] text-[#00A651] font-semibold mt-0.5">
                {currentStepData.subtitle}
              </p>
              <p className="text-xs text-gray-600 dark:text-slate-300 mt-2">
                {currentStepData.description}
              </p>
            </div>
          </div>

          {/* Key Feature Highlights */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 px-1">
              Key Features on This Step
            </h4>
            <div className="space-y-2">
              {currentStepData.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-gray-100 dark:border-slate-750 shadow-2xs"
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 dark:text-slate-100">
                      {h.title}:{' '}
                    </span>
                    <span className="text-gray-600 dark:text-slate-300">
                      {h.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-blue-900 dark:text-blue-200">
            <Sparkles size={15} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="font-bold">Pro Tip:</strong> {currentStepData.proTip}
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold px-2 py-1.5 transition cursor-pointer"
            >
              Skip Guide
            </button>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-750 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer ${
              isLastStep
                ? 'bg-gradient-to-r from-[#00A651] to-emerald-600 hover:from-[#008f45] hover:to-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-[#004A8C] hover:bg-[#003666] text-white shadow-blue-500/20'
            }`}
          >
            <span>{isLastStep ? 'Start Using TrabaHome 🚀' : 'Next Step'}</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
