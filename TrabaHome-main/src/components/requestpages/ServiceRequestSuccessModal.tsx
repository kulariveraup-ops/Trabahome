import React from "react";
import { ShieldCheckIcon, XIcon } from "../../Icons.jsx";

type ServiceRequestSuccessModalProps = {
  isOpen: boolean;
  location: string;
  contactNumber: string;
  onClose: () => void;
  onViewRequests: () => void;
};

export default function ServiceRequestSuccessModal({
  isOpen,
  location,
  contactNumber,
  onClose,
  onViewRequests,
}: ServiceRequestSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-500"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-[340px] rounded-2xl shadow-2xl p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500 border border-gray-100 dark:border-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300 transition-colors active:scale-90"
          aria-label="Close"
        >
          <XIcon className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 bg-green-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-4 animate-in slide-in-from-bottom-2 duration-700">
          <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-emerald-400" />
        </div>

        <h2 className="text-[22px] font-bold text-[#111] dark:text-white mb-2">Request Sent!</h2>
        <p className="text-gray-600 dark:text-slate-300 text-[12px] mb-8 leading-relaxed">
          We&apos;ve notified the worker via email. You&apos;ll be updated once they accept.
        </p>

        <div className="w-full rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 p-4 mb-6 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-400">Location / Address</p>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-slate-200">{location}</p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-400">Contact Number</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-200">{contactNumber}</p>
        </div>

        <button
          className="w-full bg-[#003C71] text-white py-3 rounded-[30px] font-bold text-sm hover:bg-[#002a50] transition-all active:scale-95 shadow-lg shadow-blue-900/10 cursor-pointer"
          onClick={onViewRequests}
        >
          View My Requests
        </button>
      </div>
    </div>
  );
}
