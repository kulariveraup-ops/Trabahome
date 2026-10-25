import React, { useState, useMemo, useEffect } from 'react';
import { Eye, EyeOff, Check, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StepOneProps } from '../../types/Worker.types.ts';
import {
  validateName,
  validateEmail,
  validatePhilippineMobile,
  checkPasswordStrength
} from '../../utils/Validation.ts';
import { workerAPI } from '../../services/WorkerApi.ts';
import TermsAndPrivacyModal from './TermsAndPrivacyModal.tsx';

const StepOne: React.FC<StepOneProps> = ({ 
  formData, 
  errors, 
  showPassword, 
  showConfirmPassword, 
  onInputChange, 
  onTogglePassword, 
  onNext 
}) => {
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);

  // Real-time email availability states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState<string | null>(null);
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);

  // Real-time debounced email availability check
  useEffect(() => {
    const rawEmail = (formData.email || '').trim();
    if (!rawEmail) {
      setEmailTakenError(null);
      setIsEmailAvailable(false);
      setIsCheckingEmail(false);
      return;
    }

    const formatError = validateEmail(rawEmail);
    if (formatError) {
      setEmailTakenError(null);
      setIsEmailAvailable(false);
      setIsCheckingEmail(false);
      return;
    }

    let isMounted = true;
    setIsCheckingEmail(true);
    setEmailTakenError(null);
    setIsEmailAvailable(false);

    const timer = setTimeout(async () => {
      try {
        const res = await workerAPI.checkEmailAvailability(rawEmail);
        if (!isMounted) return;
        if (!res?.available) {
          setEmailTakenError(res?.message || 'This email is already registered as a skilled worker.');
          setIsEmailAvailable(false);
        } else {
          setEmailTakenError(null);
          setIsEmailAvailable(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.response?.status === 409 || err?.response?.data?.available === false) {
          setEmailTakenError(err?.response?.data?.message || 'This email is already registered as a skilled worker.');
          setIsEmailAvailable(false);
        } else {
          setEmailTakenError(null);
          setIsEmailAvailable(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingEmail(false);
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.email]);

  // Real-time validation evaluations
  const firstNameError = useMemo(() => {
    if (!formData.firstName) return null;
    return validateName(formData.firstName, 'First name');
  }, [formData.firstName]);

  const lastNameError = useMemo(() => {
    if (!formData.lastName) return null;
    return validateName(formData.lastName, 'Last name');
  }, [formData.lastName]);

  const emailError = useMemo(() => {
    if (!formData.email) return null;
    return validateEmail(formData.email);
  }, [formData.email]);

  const phoneError = useMemo(() => {
    if (!formData.phone) return null;
    return validatePhilippineMobile(formData.phone);
  }, [formData.phone]);

  const pwdAnalysis = useMemo(() => {
    return checkPasswordStrength(formData.password);
  }, [formData.password]);

  const confirmPasswordError = useMemo(() => {
    if (!formData.confirmPassword) return null;
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  }, [formData.password, formData.confirmPassword]);

  // Form validity check
  const isAllInformationFilled = Boolean(
    formData.firstName &&
    formData.lastName &&
    !firstNameError &&
    !lastNameError &&
    formData.email &&
    !emailError &&
    !emailTakenError &&
    !isCheckingEmail &&
    formData.phone &&
    !phoneError &&
    formData.password &&
    !pwdAnalysis.error &&
    formData.confirmPassword &&
    !confirmPasswordError
  );

  const isFormValid = Boolean(
    isAllInformationFilled &&
    formData.agreeToTerms &&
    formData.agreeToPrivacy
  );

  // Auto-reset terms agreement if any required information is incomplete or invalid
  useEffect(() => {
    if (!isAllInformationFilled && (formData.agreeToTerms || formData.agreeToPrivacy)) {
      const makeEvent = (name: string) =>
        ({
          target: { name, type: 'checkbox', checked: false }
        } as React.ChangeEvent<HTMLInputElement>);
      onInputChange(makeEvent('agreeToTerms'));
      onInputChange(makeEvent('agreeToPrivacy'));
    }
  }, [isAllInformationFilled]);

  // Custom sanitizer for Name: letters only, single space between words, max 30
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'firstName' | 'lastName') => {
    const raw = e.target.value;
    const sanitized = raw
      .replace(/[^a-zA-ZñÑ\s]/g, '')
      .replace(/^\s+/, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 30);

    const fakeEvent = {
      target: {
        name: field,
        value: sanitized,
        type: 'text',
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(fakeEvent);
  };

  // Custom sanitizer for Mobile: strictly digits only, max 11
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/\D/g, '').slice(0, 11);
    const fakeEvent = {
      target: {
        name: 'phone',
        value: sanitized,
        type: 'text',
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(fakeEvent);
  };

  // Terms Agreement callback from Modal
  const handleTermsAgreed = () => {
    setHasOpenedTerms(true);
    const makeEvent = (name: string) =>
      ({
        target: { name, type: 'checkbox', checked: true }
      } as React.ChangeEvent<HTMLInputElement>);
    onInputChange(makeEvent('agreeToTerms'));
    onInputChange(makeEvent('agreeToPrivacy'));
  };

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Create your Worker Account</h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          Step 1: Fill in your account details.
        </p>
      </div>

      {/* ── 1. FIRST NAME & LAST NAME ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* First Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
            First Name *
          </label>
          <input 
            type="text" 
            name="firstName"
            value={formData.firstName}
            onChange={(e) => handleNameChange(e, 'firstName')}
            placeholder="First Name" 
            maxLength={30}
            className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
              firstNameError || errors.firstName 
                ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                : formData.firstName && !firstNameError
                ? 'border-emerald-500 dark:border-emerald-600'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
            }`} 
          />
          {(firstNameError || errors.firstName) && (
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              <span>{firstNameError || errors.firstName}</span>
            </p>
          )}
        </div>

        {/* Last Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
            Last Name *
          </label>
          <input 
            type="text" 
            name="lastName"
            value={formData.lastName}
            onChange={(e) => handleNameChange(e, 'lastName')}
            placeholder="Last Name" 
            maxLength={30}
            className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
              lastNameError || errors.lastName 
                ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                : formData.lastName && !lastNameError
                ? 'border-emerald-500 dark:border-emerald-600'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
            }`} 
          />
          {(lastNameError || errors.lastName) && (
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              <span>{lastNameError || errors.lastName}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── 2. EMAIL ADDRESS ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
          Email Address *
        </label>
        <div className="relative">
          <input 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={(e) => {
              setEmailTakenError(null);
              setIsEmailAvailable(false);
              onInputChange(e);
            }} 
            placeholder="example@gmail.com" 
            className={`w-full p-3 pr-10 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
              emailError || errors.email || emailTakenError
                ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                : isEmailAvailable && !emailError && !emailTakenError
                ? 'border-emerald-500 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30'
                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
            }`} 
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {isCheckingEmail && (
              <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
            )}
            {!isCheckingEmail && isEmailAvailable && !emailError && !emailTakenError && (
              <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
            )}
            {!isCheckingEmail && (emailError || errors.email || emailTakenError) && (
              <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
            )}
          </div>
        </div>

        {/* Real-time Email Taken Error Banner with Login Link */}
        {emailTakenError && (
          <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1.5 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/40 animate-in fade-in duration-150">
            <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0 text-red-500" />
              <span>{emailTakenError}</span>
            </p>
            <Link
              to="/worker-login"
              className="text-[11px] font-bold text-[#004A8C] dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              Sign in instead →
            </Link>
          </div>
        )}

        {/* Email format error */}
        {!emailTakenError && (emailError || errors.email) && (
          <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
            <AlertCircle size={11} className="shrink-0" />
            <span>{emailError || errors.email}</span>
          </p>
        )}

        {/* Email available confirmation */}
        {!emailTakenError && !emailError && isEmailAvailable && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            <Check size={11} className="shrink-0" />
            <span>Email is available</span>
          </p>
        )}
      </div>

      {/* ── 3. MOBILE NUMBER (FIXED TO 11 DIGITS) ────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
          Mobile Number *
        </label>
        <input 
          type="text" 
          name="phone" 
          maxLength={11}
          value={formData.phone}
          onChange={handlePhoneChange} 
          placeholder="09XXXXXXXXX" 
          className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors font-mono dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
            phoneError || errors.phone 
              ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
              : formData.phone && !phoneError
              ? 'border-emerald-500 dark:border-emerald-600'
              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
          }`} 
        />
        {(phoneError || errors.phone) && (
          <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
            <AlertCircle size={11} className="shrink-0" />
            <span>{phoneError || errors.phone}</span>
          </p>
        )}
      </div>

      {/* ── 4. PASSWORD & CONFIRM PASSWORD ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
            Password *
          </label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              value={formData.password}
              onChange={onInputChange}
              maxLength={24}
              placeholder="Enter password" 
              className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none pr-10 border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                formData.password && pwdAnalysis.error 
                  ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                  : formData.password && !pwdAnalysis.error
                  ? 'border-emerald-500 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`} 
            />
            <button 
              type="button"
              onClick={() => onTogglePassword('password')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
            Confirm Password *
          </label>
          <div className="relative">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={onInputChange}
              maxLength={24}
              placeholder="Confirm password" 
              className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none pr-10 border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                confirmPasswordError || errors.confirmPassword 
                  ? 'border-red-500 focus:ring-2 focus:ring-red-200' 
                  : formData.confirmPassword && !confirmPasswordError
                  ? 'border-emerald-500 dark:border-emerald-600'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`} 
            />
            <button 
              type="button"
              onClick={() => onTogglePassword('confirmPassword')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {(confirmPasswordError || errors.confirmPassword) && (
            <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              <span>{confirmPasswordError || errors.confirmPassword}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── PASSWORD STRENGTH METER & REQUIREMENT CHECKLIST ────────── */}
      {formData.password && (
        <div className="rounded-xl p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 space-y-2 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">Password Strength:</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              pwdAnalysis.strength === 'Extremely Weak'
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                : pwdAnalysis.strength === 'Weak'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : pwdAnalysis.strength === 'Strong'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
              {pwdAnalysis.strength}
            </span>
          </div>

          {/* Strength visual bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${pwdAnalysis.color}`} 
              style={{ width: `${(pwdAnalysis.score / 4) * 100}%` }}
            />
          </div>

          {/* Error explanation if not met */}
          {pwdAnalysis.error && (
            <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 pt-0.5">
              <AlertCircle size={12} className="shrink-0" />
              <span>{pwdAnalysis.error}</span>
            </p>
          )}

          {/* Requirements checklist (repetitive/guessable check is enforced but hidden from view) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[10px]">
            <div className={`flex items-center gap-1.5 ${pwdAnalysis.checks.length && pwdAnalysis.checks.noSpaces ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
              {pwdAnalysis.checks.length && pwdAnalysis.checks.noSpaces ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
              <span>8–24 characters (no spaces)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwdAnalysis.checks.uppercase && pwdAnalysis.checks.lowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
              {pwdAnalysis.checks.uppercase && pwdAnalysis.checks.lowercase ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
              <span>Uppercase (A-Z) &amp; Lowercase (a-z)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwdAnalysis.checks.number ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
              {pwdAnalysis.checks.number ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
              <span>At least 1 number (0-9)</span>
            </div>
            <div className={`flex items-center gap-1.5 ${pwdAnalysis.checks.special ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-500'}`}>
              {pwdAnalysis.checks.special ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
              <span>Special char (! @ # $ % ^ * ( ) - _ + = ?)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. TERMS & PRIVACY (SINGLE BUTTON ONLY) ────────────────── */}
      <div className="pt-2">
        <div className="flex items-start gap-2.5">
          <input 
            type="checkbox" 
            id="agreeTermsCheckbox"
            name="agreeAll"
            disabled={!isAllInformationFilled}
            checked={Boolean(isAllInformationFilled && formData.agreeToTerms && formData.agreeToPrivacy)}
            onChange={(e) => {
              if (!isAllInformationFilled) return;
              if (!hasOpenedTerms) {
                // Must open modal and scroll to end to review
                setIsTermsModalOpen(true);
              } else {
                const checked = e.target.checked;
                const makeEvent = (name: string) =>
                  ({
                    target: { name, type: 'checkbox', checked }
                  } as React.ChangeEvent<HTMLInputElement>);
                onInputChange(makeEvent('agreeToTerms'));
                onInputChange(makeEvent('agreeToPrivacy'));
              }
            }}
            className={`w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-slate-700 text-[#004A8C] dark:text-blue-500 focus:ring-[#004A8C]/30 ${
              !isAllInformationFilled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          />
          <label
            htmlFor={isAllInformationFilled ? "agreeTermsCheckbox" : undefined}
            className={`text-xs text-gray-700 dark:text-slate-300 leading-snug select-none ${
              !isAllInformationFilled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            I have read and agree to the{" "}
            <button
              type="button"
              disabled={!isAllInformationFilled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isAllInformationFilled) return;
                setIsTermsModalOpen(true);
              }}
              className={`font-bold inline transition-colors ${
                !isAllInformationFilled
                  ? "text-gray-400 dark:text-slate-500 cursor-not-allowed"
                  : "text-[#004A8C] dark:text-blue-400 hover:underline cursor-pointer"
              }`}
            >
              Terms &amp; Conditions and Privacy Policy
            </button>
          </label>
        </div>

        {errors.agreements && (
          <p className="text-[10px] text-red-500 dark:text-red-400 font-bold mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} className="shrink-0" />
            <span>{errors.agreements}</span>
          </p>
        )}
      </div>

      {/* ── 6. CONTINUE BUTTON & SIGN IN LINK ──────────────────────── */}
      <button 
        type="button"
        onClick={onNext}
        disabled={!isFormValid}
        className={`w-full py-3.5 rounded-xl font-bold text-sm mt-3 transition-all cursor-pointer ${
          isFormValid
            ? 'bg-[#004A8C] hover:bg-blue-900 text-white shadow-lg shadow-blue-500/20 active:scale-[0.99]'
            : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700'
        }`}
      >
        Continue to Step 2
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-2">
        Already have an account?{" "}
        <Link 
          to="/worker-login" 
          className="font-bold text-[#004A8C] dark:text-blue-400 hover:underline transition-colors"
        >
          Sign In
        </Link>
      </p>

      {/* Terms and Privacy Modal */}
      <TermsAndPrivacyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAgree={handleTermsAgreed}
      />
    </div>
  );
};

export default StepOne;
