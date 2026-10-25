import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  AlertCircle,
  ChevronLeft,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  FileText,
  Loader2,
} from "lucide-react";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import {
  PANGASINAN_PROVINCE,
  pangasinanCities,
  getPangasinanBarangays,
} from "../constants/SignUpData.ts";
import {
  validateName,
  validateEmail,
  validatePhilippineMobile,
  checkPasswordStrength,
} from "../utils/Validation.ts";
import TermsAndPrivacyModal from "../components/signup/TermsAndPrivacyModal.tsx";
import HomeownerSignupSummaryModal from "../components/signup/HomeownerSignupSummaryModal.tsx";
import HomeownerRegistrationOtpModal from "../components/signup/HomeownerRegistrationOtpModal.tsx";
import { saveHomeownerSession } from "../utils/homeownerAuth.ts";

interface HomeownerFormData {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  city: string;
  barangay: string;
  province: string;
  address: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

export default function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<HomeownerFormData>({
    firstName: "",
    lastName: "",
    email: "",
    mobileNumber: "",
    city: "",
    barangay: "",
    province: PANGASINAN_PROVINCE,
    address: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    agreePrivacy: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Modals state
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  // OTP and submission loading/error states
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [activeOtpId, setActiveOtpId] = useState<string | undefined>(undefined);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [summaryModalError, setSummaryModalError] = useState<string | null>(null);

  // Real-time email availability states
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState<string | null>(null);
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);

  // Real-time debounced email availability check
  useEffect(() => {
    const rawEmail = (formData.email || "").trim();
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
        const res = await homeownerAPI.checkEmailAvailability(rawEmail);
        if (!isMounted) return;
        if (!res?.available) {
          setEmailTakenError(res?.message || "This email is already registered as a homeowner.");
          setIsEmailAvailable(false);
        } else {
          setEmailTakenError(null);
          setIsEmailAvailable(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        if (err?.response?.status === 409 || err?.response?.data?.available === false) {
          setEmailTakenError(err?.response?.data?.message || "This email is already registered as a homeowner.");
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

  // Dynamic barangays for selected city
  const availableBarangays = useMemo(() => {
    if (!formData.city) return [];
    return getPangasinanBarangays(formData.city);
  }, [formData.city]);

  // Real-time validations
  const firstNameError = useMemo(() => {
    if (!formData.firstName) return null;
    return validateName(formData.firstName, "First name", 24);
  }, [formData.firstName]);

  const lastNameError = useMemo(() => {
    if (!formData.lastName) return null;
    return validateName(formData.lastName, "Last name", 24);
  }, [formData.lastName]);

  const emailError = useMemo(() => {
    if (!formData.email) return null;
    return validateEmail(formData.email);
  }, [formData.email]);

  const phoneError = useMemo(() => {
    if (!formData.mobileNumber) return null;
    return validatePhilippineMobile(formData.mobileNumber);
  }, [formData.mobileNumber]);

  const pwdAnalysis = useMemo(() => {
    return checkPasswordStrength(formData.password);
  }, [formData.password]);

  const confirmPasswordError = useMemo(() => {
    if (!formData.confirmPassword) return null;
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  }, [formData.password, formData.confirmPassword]);

  // Sanitized Name Handlers: letters and spaces only, max 24, single space between words
  const handleNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "firstName" | "lastName"
  ) => {
    const raw = e.target.value;
    const sanitized = raw
      .replace(/[^a-zA-ZñÑ\s]/g, "")
      .replace(/^\s+/, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 24);

    setFormData((prev) => ({
      ...prev,
      [field]: sanitized,
    }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Sanitized Mobile Number: digits only, max 11 (09XXXXXXXXX)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/\D/g, "").slice(0, 11);

    setFormData((prev) => ({
      ...prev,
      mobileNumber: sanitized,
    }));

    if (errors.mobileNumber) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.mobileNumber;
        return next;
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // When city changes, reset barangay
      if (name === "city") {
        updated.barangay = "";
      }
      return updated;
    });

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Terms Agreement callback from Modal
  const handleTermsAgreed = () => {
    setHasOpenedTerms(true);
    setFormData((prev) => ({
      ...prev,
      agreeTerms: true,
      agreePrivacy: true,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.agreements;
      return next;
    });
  };

  // Form Validation prior to Review Modal
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const fnErr = validateName(formData.firstName, "First name", 24);
    if (fnErr) newErrors.firstName = fnErr;

    const lnErr = validateName(formData.lastName, "Last name", 24);
    if (lnErr) newErrors.lastName = lnErr;

    const emErr = validateEmail(formData.email);
    if (emErr) {
      newErrors.email = emErr;
    } else if (emailTakenError) {
      newErrors.email = emailTakenError;
    }

    const phErr = validatePhilippineMobile(formData.mobileNumber);
    if (phErr) newErrors.mobileNumber = phErr;

    if (!formData.city) newErrors.city = "Please select a city or municipality";
    if (!formData.barangay) newErrors.barangay = "Please select a barangay";

    if (pwdAnalysis.error) {
      newErrors.password = pwdAnalysis.error;
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.agreeTerms || !formData.agreePrivacy) {
      newErrors.agreements =
        "You must read and agree to the Terms & Conditions and Privacy Policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Trigger Review Modal
  const handleOpenReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSummaryModalError(null);

    if (!validateForm()) {
      setGeneralError("Please review and fix the highlighted fields above.");
      return;
    }

    if (emailTakenError) {
      setGeneralError(emailTakenError);
      return;
    }

    // Direct check before proceeding to review modal
    setIsCheckingEmail(true);
    try {
      const res = await homeownerAPI.checkEmailAvailability(formData.email.trim());
      if (!res?.available) {
        const msg = res?.message || "This email is already registered as a homeowner.";
        setEmailTakenError(msg);
        setErrors((prev) => ({ ...prev, email: msg }));
        setGeneralError(msg);
        return;
      }
      setEmailTakenError(null);
      setIsEmailAvailable(true);
    } catch {
      // Allow fallback to submission verification if network error
    } finally {
      setIsCheckingEmail(false);
    }

    setIsSummaryModalOpen(true);
  };

  // Request OTP from backend and open OTP modal
  const handleProceedToOtp = async () => {
    setIsRequestingOtp(true);
    setGeneralError(null);
    setSummaryModalError(null);
    setOtpError(null);

    try {
      const res = await homeownerAPI.requestRegistrationOtp({
        email: formData.email.trim().toLowerCase(),
        mobileNumber: formData.mobileNumber.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      });

      if (res?.otpId) {
        setActiveOtpId(res.otpId);
      }

      setIsSummaryModalOpen(false);
      setIsOtpModalOpen(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to send verification code. Please try again.";
      const errorText = typeof msg === "string" ? msg : "Unable to send verification code.";
      setGeneralError(errorText);
      setSummaryModalError(errorText);

      // Highlight corresponding form input so the homeowner knows what to change
      const lower = errorText.toLowerCase();
      if (lower.includes("email")) {
        setErrors((prev) => ({ ...prev, email: errorText }));
      } else if (lower.includes("mobile") || lower.includes("phone")) {
        setErrors((prev) => ({ ...prev, mobileNumber: errorText }));
      }
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Resend OTP handler inside OTP modal
  const handleResendOtp = async () => {
    const res = await homeownerAPI.requestRegistrationOtp({
      email: formData.email.trim().toLowerCase(),
      mobileNumber: formData.mobileNumber.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    });
    if (res?.otpId) {
      setActiveOtpId(res.otpId);
    }
  };

  // Submit registration with OTP code
  const handleVerifyOtpAndCreate = async (code: string) => {
    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobileNumber: formData.mobileNumber.trim(),
        city: formData.city,
        barangay: formData.barangay,
        province: PANGASINAN_PROVINCE,
        address: formData.address.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        agreeToTerms: true,
        agreeToPrivacy: true,
        agreeTerms: true,
        agreePrivacy: true,
        code,
        otpId: activeOtpId,
      };

      const res = await homeownerAPI.register(payload);

      if (res?.token) {
        saveHomeownerSession({
          token: res.token,
          email: res.email || payload.email,
          homeowner: (res.homeowner || res.data) as any,
        });
      }

      try {
        localStorage.removeItem("trabahome_first_login_pending_" + payload.email.toLowerCase());
        sessionStorage.setItem("trabahome_show_first_time_guide", "true");
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trabahome:user-registered", { detail: { role: "homeowner" } }));
        window.dispatchEvent(new CustomEvent("trabahome:homeowner-changed"));
        window.dispatchEvent(new CustomEvent("trabahome:dashboard-refresh"));
        try {
          localStorage.setItem("trabahome_sync_homeowner", String(Date.now()));
        } catch {}
      }

      setIsOtpModalOpen(false);
      navigate("/home", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Verification failed. Please check the code and try again.";
      setOtpError(typeof msg === "string" ? msg : "Verification failed. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const isAllInformationFilled = Boolean(
    formData.firstName &&
    formData.lastName &&
    !firstNameError &&
    !lastNameError &&
    formData.email &&
    !emailError &&
    !emailTakenError &&
    !isCheckingEmail &&
    formData.mobileNumber &&
    !phoneError &&
    formData.city &&
    formData.barangay &&
    formData.password &&
    !pwdAnalysis.error &&
    formData.confirmPassword &&
    !confirmPasswordError
  );

  const isFormFilled = Boolean(
    isAllInformationFilled &&
    formData.agreeTerms &&
    formData.agreePrivacy
  );

  // Auto-reset terms agreement if any required information is incomplete or invalid
  useEffect(() => {
    if (!isAllInformationFilled && (formData.agreeTerms || formData.agreePrivacy)) {
      setFormData((prev) => ({
        ...prev,
        agreeTerms: false,
        agreePrivacy: false,
      }));
    }
  }, [isAllInformationFilled]);

  return (
    <div className="min-h-screen w-full bg-[#F5F7FB] dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[520px] rounded-[28px] shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-6 sm:p-9 flex flex-col items-center relative border border-gray-100 dark:border-slate-800">
        
        {/* Back Link */}
        <Link
          to="/"
          aria-label="Back to home"
          className="absolute left-4 top-4 p-2 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </Link>

        {/* Logo */}
        <div className="flex flex-col items-center mb-3">
          <Link to="/" className="transition-opacity hover:opacity-85 active:scale-95">
            <img src="/assets/Logo.png" alt="TrabaHome Logo" className="h-11 w-auto" />
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h2 className="text-xl font-bold text-[#004A8C] dark:text-blue-400">
            Create your Homeowner Account
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Find reliable, verified skilled home service providers across Pangasinan.
          </p>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div
            className="w-full flex items-center gap-2 px-3.5 py-2.5 mb-4 rounded-xl text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/60 animate-in fade-in duration-200"
            role="alert"
          >
            <AlertCircle size={15} className="shrink-0 text-red-600 dark:text-red-400" />
            <span className="font-medium leading-relaxed">{generalError}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleOpenReview} className="w-full space-y-4 text-left">
          
          {/* 1. FIRST NAME & LAST NAME */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* First Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={(e) => handleNameChange(e, "firstName")}
                placeholder="First Name"
                maxLength={24}
                className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                  firstNameError || errors.firstName
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : formData.firstName && !firstNameError
                    ? "border-emerald-500 dark:border-emerald-600"
                    : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
                }`}
              />
              {(firstNameError || errors.firstName) && (
                <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} className="shrink-0" />
                  <span>{firstNameError || errors.firstName}</span>
                </p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={(e) => handleNameChange(e, "lastName")}
                placeholder="Last Name"
                maxLength={24}
                className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                  lastNameError || errors.lastName
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : formData.lastName && !lastNameError
                    ? "border-emerald-500 dark:border-emerald-600"
                    : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
                }`}
              />
              {(lastNameError || errors.lastName) && (
                <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} className="shrink-0" />
                  <span>{lastNameError || errors.lastName}</span>
                </p>
              )}
            </div>
          </div>

          {/* 2. EMAIL ADDRESS */}
          <div className="space-y-1">
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
                  handleInputChange(e);
                }}
                placeholder="example@gmail.com"
                className={`w-full p-3 pr-10 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                  emailError || errors.email || emailTakenError
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : isEmailAvailable && !emailError && !emailTakenError
                    ? "border-emerald-500 dark:border-emerald-600 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30"
                    : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
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
                  to="/login"
                  className="text-[11px] font-bold text-[#004A8C] dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Sign in instead →
                </Link>
              </div>
            )}

            {/* Email format validation error */}
            {!emailTakenError && (emailError || errors.email) && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
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

          {/* 3. MOBILE NUMBER (FIXED 11 DIGITS - EXPLICIT DARK MODE OUTLINE) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
              Mobile Number *
            </label>
            <input
              type="text"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handlePhoneChange}
              placeholder="09XXXXXXXXX"
              maxLength={11}
              className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none border transition-colors font-mono dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                phoneError || errors.mobileNumber
                  ? "border-red-500 focus:ring-2 focus:ring-red-200"
                  : formData.mobileNumber && !phoneError
                  ? "border-emerald-500 dark:border-emerald-600"
                  : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
              }`}
            />
            {(phoneError || errors.mobileNumber) && (
              <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle size={11} className="shrink-0" />
                <span>{phoneError || errors.mobileNumber}</span>
              </p>
            )}
          </div>

          {/* 4. LOCATION: PROVINCE (FIXED), CITY, BARANGAY, STREET (OPTIONAL) */}
          <div className="space-y-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-850/60 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#004A8C] dark:text-blue-400 uppercase tracking-wider border-b border-gray-200/70 dark:border-slate-700 pb-2">
              <MapPin size={14} />
              <span>Coverage &amp; Residence Location</span>
            </div>

            {/* Province - Fixed to Pangasinan */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
                Province (Fixed)
              </label>
              <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-700">
                <div className="px-3.5 py-2.5 text-xs text-gray-400 dark:text-slate-400 font-medium border-r border-gray-200 dark:border-slate-700">
                  Province
                </div>
                <div className="px-3.5 py-2.5 text-xs text-gray-800 dark:text-slate-200 font-bold">
                  {PANGASINAN_PROVINCE}
                </div>
              </div>
            </div>

            {/* City & Municipality dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
                City / Municipality *
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-xl text-sm outline-none border transition-colors bg-white dark:bg-slate-800 dark:text-slate-100 ${
                  errors.city
                    ? "border-red-500"
                    : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
                }`}
              >
                <option value="" disabled hidden>
                  Select City or Municipality
                </option>
                {pangasinanCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              {errors.city && (
                <p className="text-[10px] text-red-500 px-1">{errors.city}</p>
              )}
            </div>

            {/* Barangay dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
                Barangay *
              </label>
              <select
                name="barangay"
                value={formData.barangay}
                onChange={handleInputChange}
                disabled={!formData.city}
                className={`w-full p-3 rounded-xl text-sm outline-none border transition-colors ${
                  formData.city
                    ? "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 focus:border-[#004A8C] dark:focus:border-blue-500"
                    : "bg-gray-100 dark:bg-slate-800/60 text-gray-400 dark:text-slate-500 cursor-not-allowed border-gray-200 dark:border-slate-800"
                } ${errors.barangay ? "border-red-500" : ""}`}
              >
                <option value="" disabled hidden>
                  {formData.city ? "Select Barangay" : "Select a city first"}
                </option>
                {availableBarangays.map((bgy) => (
                  <option key={bgy} value={bgy}>
                    {bgy}
                  </option>
                ))}
              </select>
              {!formData.city && (
                <p className="text-[10px] text-gray-400 dark:text-slate-500 italic px-1">
                  Select a city or municipality first to load its barangays
                </p>
              )}
              {errors.barangay && (
                <p className="text-[10px] text-red-500 px-1">{errors.barangay}</p>
              )}
            </div>

            {/* House / Street / Subdivision (Optional) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight flex items-center justify-between">
                <span>House / Street / Subdivision</span>
                <span className="text-[10px] lowercase text-gray-400 font-normal">
                  (optional)
                </span>
              </label>
              <input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g. Unit 4, Rizal Street, Greenfields Subd."
                className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm outline-none border border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* 5. PASSWORD & CONFIRM PASSWORD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  maxLength={24}
                  placeholder="Enter password"
                  className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none pr-10 border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                    formData.password && pwdAnalysis.error
                      ? "border-red-500 focus:ring-2 focus:ring-red-200"
                      : formData.password && !pwdAnalysis.error
                      ? "border-emerald-500 dark:border-emerald-600"
                      : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  maxLength={24}
                  placeholder="Confirm password"
                  className={`w-full p-3 bg-[#F8F9FB] dark:bg-slate-800 rounded-xl text-sm outline-none pr-10 border transition-colors dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 ${
                    confirmPasswordError || errors.confirmPassword
                      ? "border-red-500 focus:ring-2 focus:ring-red-200"
                      : formData.confirmPassword && !confirmPasswordError
                      ? "border-emerald-500 dark:border-emerald-600"
                      : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 focus:border-[#004A8C] dark:focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(confirmPasswordError || errors.confirmPassword) && (
                <p className="text-[10px] text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} className="shrink-0" />
                  <span>{confirmPasswordError || errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>

          {/* 6. PASSWORD STRENGTH METER & CHECKLIST */}
          {formData.password && (
            <div className="rounded-xl p-3 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 space-y-2 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-600 dark:text-slate-400">
                  Password Strength:
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    pwdAnalysis.strength === "Extremely Weak"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                      : pwdAnalysis.strength === "Weak"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      : pwdAnalysis.strength === "Strong"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  {pwdAnalysis.strength}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${pwdAnalysis.color}`}
                  style={{ width: `${(pwdAnalysis.score / 4) * 100}%` }}
                />
              </div>

              {pwdAnalysis.error && (
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{pwdAnalysis.error}</span>
                </p>
              )}

              {/* Requirements 4-item checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[10px]">
                <div
                  className={`flex items-center gap-1.5 ${
                    pwdAnalysis.checks.length && pwdAnalysis.checks.noSpaces
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {pwdAnalysis.checks.length && pwdAnalysis.checks.noSpaces ? (
                    <Check size={11} className="shrink-0 font-bold" />
                  ) : (
                    <X size={11} className="shrink-0" />
                  )}
                  <span>8–24 characters (no spaces)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    pwdAnalysis.checks.uppercase && pwdAnalysis.checks.lowercase
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {pwdAnalysis.checks.uppercase && pwdAnalysis.checks.lowercase ? (
                    <Check size={11} className="shrink-0 font-bold" />
                  ) : (
                    <X size={11} className="shrink-0" />
                  )}
                  <span>Uppercase (A-Z) &amp; Lowercase (a-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    pwdAnalysis.checks.number
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {pwdAnalysis.checks.number ? (
                    <Check size={11} className="shrink-0 font-bold" />
                  ) : (
                    <X size={11} className="shrink-0" />
                  )}
                  <span>At least 1 number (0-9)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    pwdAnalysis.checks.special
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-slate-500"
                  }`}
                >
                  {pwdAnalysis.checks.special ? (
                    <Check size={11} className="shrink-0 font-bold" />
                  ) : (
                    <X size={11} className="shrink-0" />
                  )}
                  <span>Special char (! @ # $ % ^ * ( ) - _ + = ?)</span>
                </div>
              </div>
            </div>
          )}

          {/* 7. TERMS & PRIVACY (SINGLE BUTTON ONLY) */}
          <div className="pt-1">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="homeownerAgreeTermsCheckbox"
                name="agreeAll"
                disabled={!isAllInformationFilled}
                checked={Boolean(isAllInformationFilled && formData.agreeTerms && formData.agreePrivacy)}
                onChange={(e) => {
                  if (!isAllInformationFilled) return;
                  if (!hasOpenedTerms) {
                    setIsTermsModalOpen(true);
                  } else {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      agreeTerms: checked,
                      agreePrivacy: checked,
                    }));
                    if (checked && errors.agreements) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.agreements;
                        return next;
                      });
                    }
                  }
                }}
                className={`w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-slate-700 text-[#004A8C] dark:text-blue-500 focus:ring-[#004A8C]/30 ${
                  !isAllInformationFilled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              />
              <label
                htmlFor={isAllInformationFilled ? "homeownerAgreeTermsCheckbox" : undefined}
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

          {/* 8. SUBMIT BUTTON (OPENS REVIEW MODAL FIRST) */}
          <button
            type="submit"
            disabled={!isFormFilled}
            className={`w-full py-3.5 rounded-xl font-bold text-sm mt-3 transition-all cursor-pointer ${
              isFormFilled
                ? "bg-[#004A8C] hover:bg-[#003666] text-white shadow-lg shadow-blue-500/20 active:scale-[0.99]"
                : "bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700"
            }`}
          >
            Review &amp; Create Account
          </button>

          {/* Sign In Link */}
          <p className="text-center text-xs text-gray-500 dark:text-slate-400 mt-2">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-[#004A8C] dark:text-blue-400 hover:underline transition-colors"
            >
              Sign In
            </Link>
          </p>
        </form>

      </div>

      {/* Terms and Privacy Modal */}
      <TermsAndPrivacyModal
        isOpen={isTermsModalOpen}
        userRole="homeowner"
        onClose={() => setIsTermsModalOpen(false)}
        onAgree={handleTermsAgreed}
      />

      {/* Review & Proofreading Summary Modal */}
      <HomeownerSignupSummaryModal
        isOpen={isSummaryModalOpen}
        formData={formData}
        isLoading={isRequestingOtp}
        error={summaryModalError}
        onClose={() => {
          setIsSummaryModalOpen(false);
          setSummaryModalError(null);
        }}
        onProceed={handleProceedToOtp}
      />

      {/* Email Registration OTP Modal */}
      <HomeownerRegistrationOtpModal
        isOpen={isOtpModalOpen}
        email={formData.email}
        isLoading={isVerifyingOtp}
        error={otpError}
        onClose={() => {
          setIsOtpModalOpen(false);
          setIsSummaryModalOpen(true);
        }}
        onVerify={handleVerifyOtpAndCreate}
        onResendOtp={handleResendOtp}
      />
    </div>
  );
}
