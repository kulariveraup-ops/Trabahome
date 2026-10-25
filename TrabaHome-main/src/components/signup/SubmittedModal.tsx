import React from 'react';
import { X, CheckCircle, ClipboardCheck, BadgeCheck, ShieldCheck, ArrowRight } from 'lucide-react';
import type { SubmittedModalProps } from '../../types/Worker.types.ts';

const SubmittedModal: React.FC<SubmittedModalProps> = ({ 
  isOpen, 
  firstName, 
  isImmediatelyApproved = true,
  onClose, 
  onGoToDashboard 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-[440px] overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Decorative Header Area */}
        <div className={`h-32 flex items-center justify-center relative ${isImmediatelyApproved ? 'bg-emerald-500/10 dark:bg-emerald-950/40' : 'bg-[#004A8C]/5'}`}>
          <div className="absolute top-4 right-4">
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={20}/>
            </button>
          </div>
          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-md flex items-center justify-center">
            {isImmediatelyApproved ? (
              <BadgeCheck className="text-emerald-600 dark:text-emerald-400" size={44} />
            ) : (
              <ClipboardCheck className="text-[#004A8C] dark:text-blue-400" size={40} />
            )}
          </div>
        </div>

        <div className="p-8 pt-6 flex flex-col items-center text-center">
          {isImmediatelyApproved ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4">
                <CheckCircle size={13} />
                Application Approved
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Registration Complete
              </h3>
              <p className="text-[12px] text-gray-600 dark:text-slate-300 leading-relaxed mb-6 px-1">
                Congratulations, <span className="font-bold text-gray-900 dark:text-slate-100">{firstName}</span>! Your ID has been verified and your worker account is now active.
              </p>

              <div className="w-full bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3.5 mb-6 text-left text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>ID verification completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>Verified worker profile active</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>Now visible to homeowners for bookings</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                <CheckCircle size={12} />
                Submission Received
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
                Application Under Review
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-slate-400 leading-relaxed mb-8 px-2">
                Thank you for applying, <span className="text-gray-900 dark:text-slate-100 font-bold">{firstName}</span>! 
                Our team is currently verifying your identity and work details.
              </p>
            </>
          )}

          <div className="w-full space-y-3">
            <button 
              className="w-full bg-[#004A8C] text-white py-3.5 rounded-xl text-sm font-bold hover:bg-[#003a6e] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer" 
              onClick={onGoToDashboard}
            >
              <span>Sign In to Your Account</span>
              <ArrowRight size={16} />
            </button>
            
            <button 
              className="w-full bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 py-3 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer border border-gray-200 dark:border-slate-700"
              onClick={onClose}
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmittedModal;
