import React from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  FileText,
  User,
  Wrench,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatTime12Hour } from "../../utils/formatDateTime.ts";

export interface ServiceRequestProofreadModalProps {
  isOpen: boolean;
  workerName: string;
  workerRole?: string;
  workerAvatar?: string;
  serviceType: string;
  description: string;
  preferredDate: string;
  preferredTime: string;
  contactNumber: string;
  city: string;
  barangay: string;
  address?: string;
  estimatedStartingCost?: number | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export default function ServiceRequestProofreadModal({
  isOpen,
  workerName,
  workerRole,
  workerAvatar,
  serviceType,
  description,
  preferredDate,
  preferredTime,
  contactNumber,
  city,
  barangay,
  address,
  estimatedStartingCost,
  isSubmitting = false,
  onConfirm,
  onEdit,
  onClose,
}: ServiceRequestProofreadModalProps) {
  if (!isOpen) return null;

  const fullLocation = [address, barangay, city].filter(Boolean).join(", ") || "Location not specified";

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white dark:from-slate-800/80 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0B3B68]/10 dark:bg-blue-900/40 flex items-center justify-center text-[#0B3B68] dark:text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Summary of Booking Details</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Please proofread before submitting your request.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Summary Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Worker summary pill */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-[#0B3B68] dark:text-blue-300 shrink-0">
              {workerAvatar ? (
                <img src={workerAvatar} alt={workerName} className="w-full h-full object-cover" />
              ) : (
                workerName.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-slate-400">Selected Professional</p>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{workerName}</h4>
              <p className="text-xs text-[#00AF91] dark:text-[#2dd4bf] font-semibold">{serviceType || workerRole || "General Repair"}</p>
            </div>
          </div>

          {/* Estimated Starting Cost Card */}
          {estimatedStartingCost ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Estimated Starting Cost
                </span>
                <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  ₱{Number(estimatedStartingCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300/90 font-medium max-w-[200px] text-right leading-tight">
                Baseline starting rate in PHP. Price may vary based on on-site inspection.
              </span>
            </div>
          ) : null}

          {/* Details list */}
          <div className="rounded-2xl border border-gray-100 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800/60">
            {/* Description */}
            <div className="p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                <Wrench className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                Problem / Service Needed
              </span>
              <p className="text-xs text-gray-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed bg-gray-50/70 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                {description || "No description provided."}
              </p>
            </div>

            {/* Schedule */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#00AF91]" />
                  Preferred Date
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{preferredDate || "Not selected"}</p>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#00AF91]" />
                  Preferred Time
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">
                  {preferredTime ? `${formatTime12Hour(preferredTime)} (${preferredTime})` : "Not selected"}
                </p>
              </div>
            </div>

            {/* Location & Contact */}
            <div className="p-4 space-y-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Service Location & Address
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-relaxed">{fullLocation}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Contact Number
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{contactNumber || "Not specified"}</p>
              </div>
            </div>
          </div>

          {/* Platform notice */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-100/80 dark:border-slate-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#0B3B68] dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[#0B3B68]/90 dark:text-sky-300 font-medium">
              After submission, the skilled worker will receive your booking. Chat messaging activates as soon as they accept.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onEdit}
            className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-xs font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Back to Edit
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00AF91] hover:bg-[#00967d] text-white text-xs font-bold transition-all shadow-md shadow-[#00AF91]/20 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting Booking...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirm & Submit Booking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
