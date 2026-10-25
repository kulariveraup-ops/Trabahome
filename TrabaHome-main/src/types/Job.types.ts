// types/job.ts
export type JobStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Declined' | 'Cancelled';

export interface Job {
  id: string;
  requestNumber?: string;
  name: string;
  location: string;
  status: JobStatus;
  needs: string;
  time: string;
  cancelledReason?: string;
  declineReason?: string;
  hasReview?: boolean;
  rating?: number;
  description?: string;
  rawStatus?: string;
  isAccepted?: boolean;
  
  // Contact information (visible after acceptance)
  email?: string;
  facebook?: string;
  phone?: string;
  contactNumber?: string;
  
  // Review data
  reviewDate?: string;
  reviewText?: string;
  
  // Additional fields
  homeownerId?: string;
  homeownerAvatar?: string;
  requestSentAt?: string;
  acceptedTime?: string;
  completionTime?: string;
  cancelledTime?: string;
  address?: string;
  province?: string;
  barangay?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  price?: number;
  currency?: string;
  scheduledDate?: Date | string;
  preferredDate?: unknown;
  preferredTime?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  completedAt?: string;
  completionDetails?: {
    proofOfWork?: string[];
    proofOfPayment?: string[];
    paymentAmount?: number;
    jobSummary?: string;
    completedAt?: string | null;
  } | null;
  reviewTags?: string[];
  images?: string[];
  urgency?: 'low' | 'medium' | 'high';
  notes?: string;
  homeownerRating?: number;
  homeownerRatingCount?: number;
  homeownerReviews?: any[];
  estimatedStartingCost?: number | null;
  rescheduleRequest?: {
    status?: 'none' | 'pending' | 'accepted' | 'declined';
    proposedDate?: string;
    proposedTime?: string;
    reason?: string;
    proposedBy?: 'worker' | 'homeowner';
    proposedAt?: string;
    respondedAt?: string;
  } | null;
}

export interface JobDetailsModalProps {
  job: Job | null;
  onClose: () => void;
  onAccept: (job: Job) => void;
  onDecline: (job: Job) => void;
  onComplete: (job: Job) => void;
  onCancelBooking: (job: Job) => void;
  onOpenChat?: (job: Job) => void;
  onViewEReceipt?: (job: Job) => void;
  onProposeReschedule?: (job: Job) => void;
}

export interface JobCardProps {
  job: Job;
  onPreview: (job: Job) => void;
  onViewDetails: (job: Job) => void;
  onAccept: (job: Job) => void;
  onDecline: (job: Job) => void;
  onOpenHomeownerProfile?: (job: Job) => void;
  onClick: () => void;
}

export interface SidebarProps {
  location: {
    pathname: string;
  };
  navigate: (path: string) => void;
}

export interface HeaderProps {
  onLogoClick: () => void;
}

export interface AcceptJobModalProps {
  job: Job | null;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface DeclineJobModalProps {
  job: Job | null;
  declineReasons: string[];
  onDecline: (jobId: string, reason: string) => void;
  onCancel: () => void;
}

export interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}
