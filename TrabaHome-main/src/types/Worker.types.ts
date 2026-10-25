import type { ReactNode } from 'react';

export interface NavItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export interface Stat {
  label: string;
  value: number;
  icon: ReactNode;
}

export interface Request {
  id: number | string;
  requestNumber?: string;
  homeownerId?: string;
  name: string;
  location: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  needs: string;
  schedule: string;
  time: string;
  description: string;
  avatar: string;
  status?: string;
  rawStatus?: string;
  isAccepted?: boolean;
  acceptedOn?: string;
  homeownerRating?: number;
  homeownerRatingCount?: number;
  homeownerReviews?: any[];
  preferredDate?: string;
  preferredTime?: string;
  declineReason?: string;
}

export interface RequestCardProps {
  request: Request;
  onViewDetails: (request: Request) => void;
  onAccept?: (request: Request) => void;
  onDecline?: (request: Request) => void;
}

export interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
}

// NEW TYPES FOR WORKER PROFILE
export interface WorkerProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  profession: string;
  barangay: string;
  city: string;
  province: string;
  locationLabel: string;
  location: string;
  avatar: string;
  bio: string;
  yearsExperience: number;
  languages: string[];
  availabilityStatus: string;
  workingSchedule: string;
  phone: string;
  email: string;
  facebook: string;
  images: (string | null)[];
  rating: number;
  ratingsCount: number;
  status: string;
  isVerified: boolean;
  pendingProfileUpdate?: {
    status?: 'pending' | 'approved' | 'rejected';
    requestedAt?: string;
    reviewedAt?: string;
    declineReason?: string;
    fields?: {
      fullName?: string;
      phone?: string;
      city?: string;
      barangay?: string;
      skills?: string[];
    };
    notes?: string;
  } | null;
}

export interface ProfileHeaderProps {
  profile: WorkerProfile;
  isEditing?: boolean;
  onAvatarUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange?: (status: string) => void;
  isStatusUpdating?: boolean;
  isAvatarUploading?: boolean;
  onSeeReviews?: () => void;
  isReviewsLoading?: boolean;
}

export interface AccountVerificationProps {
  isExpanded?: boolean;
  status?: string;
  isVerified?: boolean;
}

export interface VerificationDocument {
  label: string;
  verified: boolean;
}

export interface BasicInfoSectionProps {
  profile: WorkerProfile;
  isEditing: boolean;
  onToggleEdit: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

export interface ProofOfWorkSectionProps {
  profile: WorkerProfile;
  isEditing: boolean;
  onImageUpload: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export interface ContactInfoSectionProps {
  profile: WorkerProfile;
  onContactSupport?: (() => void) | undefined;
  onEditDetails?: () => void;
}

//TYPES FOR WORKER SIGNUP
export interface WorkerSignupFormData {
  // Step 1 Fields
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;

  // Step 2 Fields
  idType: string;
  idFront: File | null;
  idFrontPreview: string | null;
  idBack: File | null;
  idBackPreview: string | null;
  selfie: File | null;
  selfiePreview: string | null;
  idNumber: string;
  surname: string;
  givenName: string;
  middleName: string;
  dateOfBirth: string;
  nationality: string;
  nationalityOther: string; 
  sex: string;
  placeOfBirth: string;
  dateOfIssue: string;
  expiryDate: string;
  issuingAuthority: string;

  // Step 3 Fields
  profession: string;
  province: string;
  city: string;
  barangay: string;
  proofOfWork: File[];
  proofOfWorkPreviews: string[];

  // AI Verification State
  aiVerificationStatus?: 'idle' | 'verifying' | 'verified' | 'failed';
  aiVerificationError?: string | null;
  aiVerificationResult?: AiVerificationResult | null;
}

export interface AiVerificationResult {
  isVerified: boolean;
  status: 'Approved' | 'Failed';
  confidence: number;
  message?: string;
  reason?: string;
  details?: {
    ocr?: {
      passed: boolean;
      idType?: string;
      idNumber?: string;
      extractedName?: string;
      nameMatchScore?: number;
      issuingAgency?: string;
      extractedDob?: string;
      extractedExpiry?: string;
      reason?: string;
    };
    facialComparison?: {
      passed: boolean;
      matchScore?: number;
      reason?: string;
    };
    liveness?: {
      passed: boolean;
      livenessScore?: number;
      physicallyPresent?: boolean;
      antiSpoofingPassed?: boolean;
      reason?: string;
    };
  };
}

export interface SignupErrors {
  firstName?: string;
  lastName?: string;
  email?: string; 
  phone?: string;
  password?: string;
  confirmPassword?: string;
  agreements?: string;
  idUpload?: string;
  idType?: string;
  selfieUpload?: string;
  aiVerification?: string;
  [key: string]: string | undefined; 
}

export interface StepperProps {
  currentStep: number;
}

export interface StepOneProps {
  formData: WorkerSignupFormData;
  errors: SignupErrors;
  showPassword: boolean;
  showConfirmPassword: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTogglePassword: (field: 'password' | 'confirmPassword') => void;
  onNext: () => void;
}

export interface StepTwoProps {
  formData: WorkerSignupFormData;
  errors: SignupErrors;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: keyof WorkerSignupFormData) => void;
  onNext: () => void;
}

export interface StepThreeProps {
  formData: WorkerSignupFormData;
  errors?: SignupErrors;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onIdCardUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelfieUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveIdCard: () => void;
  onRemoveSelfie: () => void;
  onVerifyWithAi?: () => Promise<void>;
  isAiVerifying: boolean;
  aiVerificationError: string | null;
  onProofOfWorkUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onBack?: () => void;
  isLoading: boolean;
}

export interface SubmittedModalProps {
  isOpen: boolean;
  firstName: string;
  isImmediatelyApproved?: boolean;
  onClose: () => void;
  onGoToDashboard: () => void;
}

export interface IDType {
  value: string;
  label: string;
}
