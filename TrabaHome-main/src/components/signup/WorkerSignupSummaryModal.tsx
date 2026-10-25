import React from 'react';
import { X, CheckCircle2, User, Briefcase, MapPin, Image as ImageIcon, ArrowLeft, Loader2, ShieldCheck, Camera, FileText } from 'lucide-react';
import type { WorkerSignupFormData } from '../../types/Worker.types.ts';
import { idTypes } from '../../constants/SignUpData.ts';

interface WorkerSignupSummaryModalProps {
  isOpen: boolean;
  formData: WorkerSignupFormData;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEditStep: (stepNumber: number) => void;
}

export const WorkerSignupSummaryModal: React.FC<WorkerSignupSummaryModalProps> = ({
  isOpen,
  formData,
  isLoading,
  onClose,
  onConfirm,
  onEditStep,
}) => {
  if (!isOpen) return null;

  const photoCount = formData.proofOfWorkPreviews?.length || 0;
  const isAiVerified = formData.aiVerificationStatus === 'verified' || formData.aiVerificationResult?.isVerified === true;
  const idTypeObj = idTypes.find(t => t.value === formData.idType);
  const idTypeLabel = idTypeObj?.label || formData.idType || 'Philippine Government ID';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 id="summary-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Review Your Application
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Proofread your details and verified credentials before submitting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close summary modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
          
          {/* Section 1: Account Information */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-300">
                <User size={15} />
                <span>Account Information (Step 1)</span>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onEditStep(1); }}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Edit Step 1
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
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.phone || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Terms &amp; Privacy</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={13} />
                  Agreed to Terms of Service &amp; Privacy Policy
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: ID Verification */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-300">
                <ShieldCheck size={16} />
                <span>ID Verification</span>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onEditStep(2); }}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Change ID
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Document Type</span>
                  <span className="font-bold text-gray-900 dark:text-slate-100">{idTypeLabel}</span>
                </div>
                {isAiVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={12} />
                    Verified
                  </span>
                )}
              </div>

              {/* Photos comparison preview */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <FileText size={12} /> Valid ID (Front)
                  </span>
                  {formData.idFrontPreview ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-24 bg-gray-100 dark:bg-slate-800">
                      <img
                        src={formData.idFrontPreview}
                        alt="Valid ID thumbnail"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 h-24 flex items-center justify-center text-[10px] text-gray-400">
                      No photo attached
                    </div>
                  )}
                </div>

                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Camera size={12} /> Selfie with ID
                  </span>
                  {formData.selfiePreview ? (
                    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-24 bg-gray-100 dark:bg-slate-800">
                      <img
                        src={formData.selfiePreview}
                        alt="Selfie with ID thumbnail"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 h-24 flex items-center justify-center text-[10px] text-gray-400">
                      No selfie attached
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Professional & Location Details */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-300">
                <Briefcase size={15} />
                <span>Trade &amp; Service Area</span>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onEditStep(2); }}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Edit Details
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Profession / Trade</span>
                <span className="inline-block mt-1 font-bold text-sm text-[#004A8C] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900/60">
                  {formData.profession || '—'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Province</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.province || 'Pangasinan'}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">City / Municipality</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">{formData.city || '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-medium text-gray-500 dark:text-slate-400">Barangay &amp; Coverage</span>
                <span className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <MapPin size={14} className="text-red-500 flex-shrink-0" />
                  {formData.barangay ? `${formData.barangay}, ${formData.city}, ${formData.province}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Proof of Work Photos */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-gray-200/70 dark:border-slate-700/80 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-300">
                <ImageIcon size={15} />
                <span>Proof of Work Photos ({photoCount}/4)</span>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onEditStep(2); }}
                disabled={isLoading}
                className="text-xs font-semibold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              >
                Change Photos
              </button>
            </div>
            {photoCount > 0 ? (
              <div className="grid grid-cols-4 gap-2.5">
                {formData.proofOfWorkPreviews.map((preview, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 h-20 bg-gray-100 dark:bg-slate-800">
                    <img
                      src={preview}
                      alt={`Proof of work thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic">
                No proof of work photos uploaded (optional). You can always add work photos from your profile later.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft size={15} />
            <span>Back to Edit</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-[#004A8C] text-white text-xs font-bold hover:bg-[#003666] active:scale-95 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting Application...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Confirm &amp; Submit Application</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerSignupSummaryModal;
