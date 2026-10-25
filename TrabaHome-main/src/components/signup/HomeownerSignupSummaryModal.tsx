import React from 'react';
import { X, CheckCircle2, User, MapPin, ArrowRight, Loader2, Mail, AlertCircle, LogIn, Edit3 } from 'lucide-react';

export interface HomeownerSummaryData {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  province: string;
  city: string;
  barangay: string;
  address?: string;
}

interface HomeownerSignupSummaryModalProps {
  isOpen: boolean;
  formData: HomeownerSummaryData;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onProceed: () => void;
}

export const HomeownerSignupSummaryModal: React.FC<HomeownerSignupSummaryModalProps> = ({
  isOpen,
  formData,
  isLoading,
  error,
  onClose,
  onProceed,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homeowner-summary-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 id="homeowner-summary-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Review Your Information
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Proofread your details before proceeding to email verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close review modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
          
          {/* Submission or Conflict Error Banner */}
          {error && (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                    Registration Could Not Proceed
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-red-200/60 dark:border-red-900/40 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 flex items-center gap-1 cursor-pointer underline"
                >
                  <Edit3 size={13} />
                  <span>Edit your details</span>
                </button>

                {(error.toLowerCase().includes('already registered') || error.toLowerCase().includes('exist')) && (
                  <a
                    href="/login"
                    className="text-xs font-bold text-[#004A8C] dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <LogIn size={13} />
                    <span>Go to Sign In</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Account Information */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-400">
                <User size={15} />
                <span>Account Information</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">First Name</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.firstName || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Last Name</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.lastName || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Email Address</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200 break-all">{formData.email || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Mobile Phone</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200 font-mono">{formData.mobileNumber || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Location & Residence */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-400">
                <MapPin size={15} />
                <span>Service Location &amp; Address</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Province</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.province || 'Pangasinan'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">City / Municipality</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.city || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Barangay</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.barangay || '—'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">House / Street / Subdivision</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">
                  {formData.address ? formData.address : <span className="text-gray-400 dark:text-slate-500 italic">Not provided (Optional)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Email verification notice */}
          <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Mail size={16} className="text-[#004A8C] dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Email Verification Required</span>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                Clicking <strong className="font-semibold">Proceed &amp; Send Code</strong> will send a 6-digit verification code to <span className="font-semibold">{formData.email}</span>. You will enter this code to create your account.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gray-50/60 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Edit Information
          </button>

          <button
            type="button"
            onClick={onProceed}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-[#004A8C] hover:bg-[#003666] active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Proceed &amp; Send Code</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default HomeownerSignupSummaryModal;
