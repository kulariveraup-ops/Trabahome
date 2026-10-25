import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, ShieldCheck, Loader2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface HomeownerRegistrationOtpModalProps {
  isOpen: boolean;
  email: string;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onVerify: (code: string) => void;
  onResendOtp: () => Promise<void>;
}

export const HomeownerRegistrationOtpModal: React.FC<HomeownerRegistrationOtpModalProps> = ({
  isOpen,
  email,
  isLoading,
  error,
  onClose,
  onVerify,
  onResendOtp,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setResendSuccess(null);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Handle single character
    const lastChar = cleaned[cleaned.length - 1];
    const nextDigits = [...digits];
    nextDigits[index] = lastChar;
    setDigits(nextDigits);

    // Auto focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || '';
    }
    setDigits(nextDigits);

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const fullCode = digits.join('');
  const isComplete = fullCode.length === 6;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete || isLoading) return;
    onVerify(fullCode);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess(null);
    try {
      await onResendOtp();
      setResendCooldown(60);
      setResendSuccess('A new verification code has been sent.');
    } catch {
      // Error handled by parent or displayed in error prop
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="otp-modal-title" className="text-base font-bold text-gray-900 dark:text-slate-100">
                Email Verification
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Enter your 6-digit code to finish
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close OTP modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-center">
          
          <div className="space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#004A8C] dark:text-blue-400 flex items-center justify-center mx-auto mb-2 border border-blue-100 dark:border-blue-900/40">
              <Mail size={22} />
            </div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">
              Check your registered email
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed px-2">
              We sent a 6-digit verification code to <span className="font-semibold text-gray-800 dark:text-slate-200 break-all">{email}</span>.
            </p>
          </div>

          {/* 6-Digit PIN Boxes */}
          <div className="flex justify-center gap-2 sm:gap-3 py-1" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={isLoading}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border-2 outline-none transition-all dark:text-slate-100 bg-white dark:bg-slate-800 ${
                  digit
                    ? 'border-[#004A8C] dark:border-blue-500 shadow-sm shadow-blue-500/10'
                    : 'border-gray-200 dark:border-slate-700 focus:border-[#004A8C] dark:focus:border-blue-400'
                }`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 text-left animate-in fade-in duration-200">
              <AlertCircle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Resend Success */}
          {resendSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {resendSuccess}
            </p>
          )}

          {/* Resend Option with Timer */}
          <div className="text-xs text-gray-500 dark:text-slate-400 pt-1">
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="font-semibold text-gray-700 dark:text-slate-300">
                Resend in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || isLoading}
                className="font-bold text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors"
              >
                {isResending && <Loader2 size={12} className="animate-spin" />}
                <span>Resend Code</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Back to Review
            </button>

            <button
              type="submit"
              disabled={!isComplete || isLoading}
              className="flex-1 py-3 rounded-xl bg-[#004A8C] hover:bg-[#003666] active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify &amp; Create</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default HomeownerRegistrationOtpModal;
