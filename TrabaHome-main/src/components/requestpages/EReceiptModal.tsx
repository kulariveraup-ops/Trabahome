import React, { useState } from "react";
import {
  Receipt,
  CheckCircle2,
  Calendar,
  DollarSign,
  FileText,
  User,
  Wrench,
  X,
  Printer,
  ExternalLink,
  ZoomIn,
  ShieldCheck,
} from "lucide-react";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const resolveMediaUrl = (value: unknown): string => {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(image)) return image;
  if (image.startsWith("//")) return `https:${image}`;
  if (image.startsWith("/")) return `${API_ORIGIN}${image}`;
  return `${API_ORIGIN}/${image.replace(/^\/+/, "")}`;
};

export interface EReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    requestNumber?: string;
    id?: string;
    workerName?: string;
    homeownerName?: string;
    serviceType?: string;
    completedAt?: string | null;
    completedOn?: string | null;
    scheduledAt?: string | null;
    location?: string;
    completionDetails?: {
      proofOfWork?: string[];
      proofOfPayment?: string[];
      paymentAmount?: number;
      jobSummary?: string;
      completedAt?: string | null;
    } | null;
  } | null;
}

export default function EReceiptModal({ isOpen, onClose, booking }: EReceiptModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const details = booking.completionDetails || {};
  const proofImages = Array.isArray(details.proofOfWork) ? details.proofOfWork : [];
  const paymentImages = Array.isArray(details.proofOfPayment) ? details.proofOfPayment : [];
  const amount = typeof details.paymentAmount === "number" ? details.paymentAmount : Number(details.paymentAmount || 0);
  const formattedAmount = amount > 0
    ? `₱ ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₱ 0.00";
  const completedDate =
    details.completedAt ||
    booking.completedAt ||
    booking.completedOn ||
    new Date().toLocaleDateString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-left animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-blue-950/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00AF91]/10 dark:bg-emerald-950 flex items-center justify-center text-[#00AF91] dark:text-emerald-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">Official E-Receipt</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Completed
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Proof of Work &amp; Payment Confirmation</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2 rounded-full text-gray-500 dark:text-slate-400 hover:text-[#0B3B68] dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Print Receipt"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Receipt Summary Card */}
            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-850/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-700 gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Booking Reference</p>
                  <p className="text-sm font-black text-[#0B3B68] dark:text-blue-400 font-mono">
                    {booking.requestNumber || booking.id || "N/A"}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Date Completed</p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">{completedDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Homeowner</p>
                  <p className="font-bold text-gray-900 dark:text-slate-100 mt-0.5">{booking.homeownerName || "Homeowner"}</p>
                  {booking.location && (
                    <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-0.5">{booking.location}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">Skilled Worker</p>
                  <p className="font-bold text-[#0B3B68] dark:text-blue-400 mt-0.5">{booking.workerName || "Local Skilled Worker"}</p>
                  <p className="text-[#00AF91] dark:text-emerald-400 font-semibold text-[11px] mt-0.5">{booking.serviceType || "Service"}</p>
                </div>
              </div>

              {/* Total Payment Amount */}
              <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-gray-100 dark:border-slate-700 shadow-xs">
                <div>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Total Amount Paid</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-400">Philippine Peso (PHP)</p>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formattedAmount}
                </div>
              </div>
            </div>

            {/* Job Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                <FileText className="w-3.5 h-3.5 text-[#0B3B68] dark:text-blue-400" />
                Job Summary &amp; Scope of Work Completed
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 text-xs sm:text-sm text-gray-700 dark:text-slate-200 leading-relaxed font-normal">
                {details.jobSummary ? (
                  details.jobSummary
                ) : (
                  <span className="italic text-gray-400 dark:text-slate-500">No written summary recorded for this completed job.</span>
                )}
              </div>
            </div>

            {/* Proof of Work Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00AF91]" />
                  PROOF OF WORK ({proofImages.length} attached)
                </div>
                {proofImages.length >= 2 && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                    Verified Proof Requirement Met
                  </span>
                )}
              </div>

              {proofImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {proofImages.map((imgUrl, index) => {
                    const resolved = resolveMediaUrl(imgUrl);
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedPhoto(resolved)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 cursor-pointer shadow-xs hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                      >
                        <img
                          src={resolved}
                          alt={`Proof of work ${index + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-center text-xs text-gray-400 dark:text-slate-500">
                  No proof-of-work images uploaded.
                </div>
              )}
            </div>

            {/* Proof of Payment Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">
                  <Receipt className="w-3.5 h-3.5 text-[#00AF91]" />
                  PROOF OF PAYMENT ({paymentImages.length} attached)
                </div>
                {paymentImages.length >= 1 && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                    Payment Verified
                  </span>
                )}
              </div>

              {paymentImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {paymentImages.map((imgUrl, index) => {
                    const resolved = resolveMediaUrl(imgUrl);
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedPhoto(resolved)}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 cursor-pointer shadow-xs hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                      >
                        <img
                          src={resolved}
                          alt={`Proof of payment ${index + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <ZoomIn className="w-5 h-5" />
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          #{index + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-center text-xs text-gray-400 dark:text-slate-500">
                  No proof-of-payment images recorded.
                </div>
              )}
            </div>

            {/* Trust badge */}
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-100/80 dark:border-emerald-900 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Verified and certified by <strong>Trabahome Service Platform</strong>. Both parties have verified the completion of this service.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-slate-850/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close E-Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[88vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 cursor-pointer p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Expanded proof of work"
              className="max-h-[82vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
