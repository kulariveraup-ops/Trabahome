// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, Check, X, AlertCircle, ShieldCheck } from "lucide-react";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { saveHomeownerSession, clearHomeownerSession } from "../utils/homeownerAuth.ts";
import { flushPendingServiceRequest } from "../services/pendingServiceRequest.ts";
import { LOGIN_LOCKOUT_SECONDS, useLoginLockout } from "../hooks/useLoginLockout.ts";
import { checkPasswordStrength } from "../utils/Validation.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 5 * 60;
const OTP_EXPIRY_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 3;
const OTP_MAX_RESENDS = 5;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
const INVALID_OTP_MESSAGE = "Invalid or expired code.";
const OTP_TOO_MANY_MESSAGE = "Too many attempts. Request a new code.";
const LOGIN_INVALID_MESSAGE = "Incorrect email or password.";

const formatSecondsDisplay = (seconds: number): string => {
  if (seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }
  return `${secs}s`;
};

const maskEmail = (email) => {
  if (!email) return "";
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (local.length <= 1) return `*${domain}`;
  if (local.length === 2) return `${local[0]}*${domain}`;
  if (local.length === 3) return `${local[0]}*${local[2]}${domain}`;

  const masked = "*".repeat(local.length - 4);
  return `${local.slice(0, 2)}${masked}${local.slice(-2)}${domain}`;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpDigits, setOtpDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingOtpId, setPendingOtpId] = useState("");
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isMustChangePasswordStep, setIsMustChangePasswordStep] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpExpiresLeft, setOtpExpiresLeft] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendWindowStart, setResendWindowStart] = useState(0);
  const [otpShake, setOtpShake] = useState(false);
  const maskedPendingEmail = maskEmail(pendingEmail);
  const otpRefs = useRef([]);
  const submitInFlight = useRef(false);
  const issuedOtpIdRef = useRef("");
  const { lockoutSecondsLeft, startLockout, clearLockout, recordAttempt, isLocked } = useLoginLockout("homeowner", email);
  const loginTooManyMessage = `Too many attempts. Try again in ${Math.max(1, Math.ceil(LOGIN_LOCKOUT_SECONDS / 60))} minute${Math.max(1, Math.ceil(LOGIN_LOCKOUT_SECONDS / 60)) === 1 ? "" : "s"}.`;

  useEffect(() => {
    if (!isOtpStep) return;
    window.setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 0);
  }, [isOtpStep]);

  useEffect(() => {
    if (!pendingOtpId) return;
    console.info("[HOMEOWNER_LOGIN_OTP] frontend stored", {
      otpId: pendingOtpId,
      matchesLatestIssued: pendingOtpId === issuedOtpIdRef.current,
    });
  }, [pendingOtpId]);

  useEffect(() => {
    if (!isOtpStep || otpSecondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOtpStep, otpSecondsLeft]);

  useEffect(() => {
    if (!isOtpStep || otpExpiresLeft <= 0) return;

    const timer = window.setInterval(() => {
      setOtpExpiresLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOtpStep, otpExpiresLeft]);

  const resetOtpState = () => {
    setOtpCode("");
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  };

  const resetToLogin = () => {
    setIsOtpStep(false);
    setIsMustChangePasswordStep(false);
    setNewPassword("");
    setConfirmPassword("");
    resetOtpState();
    setPendingEmail("");
    setPendingOtpId("");
    issuedOtpIdRef.current = "";
    setInfoMessage("");
    setError("");
    setOtpSecondsLeft(0);
    setOtpExpiresLeft(0);
    setOtpAttempts(0);
    setResendCount(0);
    setResendWindowStart(0);
    setOtpShake(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitInFlight.current || loading || isLocked) return;
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (!trimmedPassword) {
      setError("Password is required.");
      return;
    }

    submitInFlight.current = true;
    setLoading(true);
    try {
      const result = await homeownerAPI.login({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const resolvedEmail = (result?.email || trimmedEmail).toLowerCase();
      const otpRequired = Boolean(result?.otpRequired ?? result?.requiresOtp);

      if (result?.token) {
        clearLockout();
        saveHomeownerSession({
          token: result.token,
          email: resolvedEmail,
          homeowner: result.homeowner ?? null,
        });
        if (result.mustChangePassword) {
          setIsOtpStep(false);
          setIsMustChangePasswordStep(true);
          setError("");
          setInfoMessage("");
          return;
        }
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        if (resolvedEmail) {
          localStorage.setItem("trabahome_guide_seen_" + resolvedEmail, "true");
          localStorage.removeItem("trabahome_first_login_pending_" + resolvedEmail);
        }
        const pendingRequest = await flushPendingServiceRequest().catch(() => null);
        navigate(pendingRequest ? "/homeowner-bookings" : "/home", { replace: true });
        return;
      }

      if (otpRequired) {
        const nextOtpId = String(result?.otpId || "");
        if (!nextOtpId) {
          setError("Unable to start OTP verification. Please sign in again.");
          return;
        }

        clearLockout();
        setPendingEmail(resolvedEmail);
        issuedOtpIdRef.current = nextOtpId;
        setPendingOtpId(nextOtpId);
        console.info("[HOMEOWNER_LOGIN_OTP] signin response", {
          otpId: nextOtpId,
          role: "homeowner",
          purpose: "login",
          emailMatch: resolvedEmail === trimmedEmail,
        });
        setIsOtpStep(true);
        setPassword("");
        resetOtpState();
        setOtpSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
        setOtpExpiresLeft(OTP_EXPIRY_SECONDS);
        setOtpAttempts(0);
        setResendCount(0);
        setResendWindowStart(Date.now());
        return;
      }

      setError(LOGIN_INVALID_MESSAGE);
      return;
    } catch (requestError) {
      const status = requestError?.response?.status;
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "";
      const normalized = String(message).toLowerCase();
      if (status === 403) {
        setError(typeof message === "string" && message ? message : "Your homeowner account is waiting for verification.");
      } else if (status === 429 || normalized.includes("too many") || normalized.includes("rate")) {
        const retryAfterSeconds = Number(requestError?.response?.data?.retryAfterSeconds);
        startLockout(
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds
            : LOGIN_LOCKOUT_SECONDS
        );
        setError(loginTooManyMessage);
      } else if (status === 401) {
        const { blocked } = recordAttempt();
        if (blocked) {
          setError(loginTooManyMessage);
        } else {
          setError(LOGIN_INVALID_MESSAGE);
        }
      } else {
        setError(typeof message === "string" && message ? message : "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
      submitInFlight.current = false;
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (submitInFlight.current || loading) return;
    setError("");

    if (otpAttempts >= OTP_MAX_ATTEMPTS) {
      setError(OTP_TOO_MANY_MESSAGE);
      return;
    }

    const trimmedOtp = otpDigits.join("").trim();

    if (trimmedOtp.length !== OTP_LENGTH || otpExpiresLeft <= 0) {
      setError(INVALID_OTP_MESSAGE);
      setOtpShake(true);
      window.setTimeout(() => setOtpShake(false), 260);
      return;
    }

    if (!pendingEmail || !pendingOtpId) {
      setError("OTP session is missing. Please sign in again.");
      resetToLogin();
      return;
    }

    submitInFlight.current = true;
    setLoading(true);
    console.info("[HOMEOWNER_LOGIN_OTP] verify submitted", {
      otpId: pendingOtpId,
      submittedOtpIdMatchesLatest: pendingOtpId === issuedOtpIdRef.current,
      emailMatch: pendingEmail === pendingEmail.trim().toLowerCase(),
      codeLength: trimmedOtp.length,
    });
    homeownerAPI
      .verifyLoginOtp({
        email: pendingEmail,
        code: trimmedOtp,
        otpId: pendingOtpId,
      })
      .then(async (result) => {
        console.info("[HOMEOWNER_LOGIN_OTP] frontend received", {
          success: Boolean(result?.token),
        });
        if (!result?.token) {
          setError(INVALID_OTP_MESSAGE);
          return;
        }

        const resolvedEmail = (result?.email || pendingEmail).toLowerCase();
        try {
          clearLockout();
          saveHomeownerSession({
            token: result.token,
            email: resolvedEmail,
            homeowner: null,
          });
          if (result.mustChangePassword) {
            setIsOtpStep(false);
            setIsMustChangePasswordStep(true);
            setError("");
            setInfoMessage("");
            return;
          }
          sessionStorage.removeItem("trabahome_show_first_time_guide");
          if (resolvedEmail) {
            localStorage.setItem("trabahome_guide_seen_" + resolvedEmail, "true");
            localStorage.removeItem("trabahome_first_login_pending_" + resolvedEmail);
          }
          const pendingRequest = await flushPendingServiceRequest().catch(() => null);
          navigate(pendingRequest ? "/homeowner-bookings" : "/home", { replace: true });
          console.info("[HOMEOWNER_LOGIN_OTP] navigation", {
            executed: true,
          });
        } catch {
          console.info("[HOMEOWNER_LOGIN_OTP] navigation", {
            executed: false,
          });
          setError("Code verified, but the browser could not save your login. Please clear this site's stored data and sign in again.");
        }
      })
      .catch((requestError) => {
        const status = requestError?.response?.status;
        console.info("[HOMEOWNER_LOGIN_OTP] frontend received", {
          success: false,
          status: Number.isFinite(Number(status)) ? Number(status) : null,
        });
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "";
        const normalized = String(message).toLowerCase();
        if (status === 429 || normalized.includes("too many") || normalized.includes("rate")) {
          setError(OTP_TOO_MANY_MESSAGE);
          setOtpAttempts(OTP_MAX_ATTEMPTS);
          return;
        }
        setOtpAttempts((prev) => {
          const next = prev + 1;
          if (next >= OTP_MAX_ATTEMPTS) {
            setError(OTP_TOO_MANY_MESSAGE);
          } else {
            setError(INVALID_OTP_MESSAGE);
          }
          return next;
        });
        setOtpShake(true);
        window.setTimeout(() => setOtpShake(false), 260);
      })
      .finally(() => {
        setLoading(false);
        submitInFlight.current = false;
      });
  };

  const handleUpdateInitialPassword = async (e) => {
    e.preventDefault();
    if (isUpdatingPassword) return;
    setError("");

    const pwdAnalysis = checkPasswordStrength(newPassword);
    if (pwdAnalysis.error) {
      setError(pwdAnalysis.error);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await homeownerAPI.updateInitialPassword(newPassword, confirmPassword);
      clearHomeownerSession();
      setIsMustChangePasswordStep(false);
      setIsOtpStep(false);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setInfoMessage("Password created successfully! You can now log in using your new password.");
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update password.";
      setError(typeof message === "string" ? message : "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const updateOtpDigits = (nextDigits) => {
    setOtpDigits(nextDigits);
    setOtpCode(nextDigits.join(""));
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (error) setError("");
    if (infoMessage) setInfoMessage("");
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = "";
      updateOtpDigits(next);
      return;
    }

    const next = [...otpDigits];
    if (cleaned.length === 1) {
      next[index] = cleaned;
      updateOtpDigits(next);
      if (index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
      return;
    }

    for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i += 1) {
      next[index + i] = cleaned[i];
    }
    updateOtpDigits(next);
    const nextIndex = Math.min(index + cleaned.length, OTP_LENGTH - 1);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    const cleaned = pasted.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!cleaned) return;

    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < cleaned.length; i += 1) {
      next[i] = cleaned[i];
    }
    updateOtpDigits(next);
    const nextIndex = Math.min(cleaned.length, OTP_LENGTH - 1);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleResendOtp = () => {
    if (otpSecondsLeft > 0 || submitInFlight.current || loading) return;
    const now = Date.now();
    const windowStart = resendWindowStart && now - resendWindowStart < OTP_RESEND_WINDOW_MS
      ? resendWindowStart
      : now;
    const nextResendCount = windowStart === resendWindowStart ? resendCount : 0;

    if (nextResendCount >= OTP_MAX_RESENDS) {
      setError("Too many OTP resend attempts. Request a new code.");
      return;
    }

    const targetEmail = pendingEmail || email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Email is missing. Please sign in again.");
      resetToLogin();
      return;
    }

    submitInFlight.current = true;
    setLoading(true);
    homeownerAPI
      .resendLoginOtp(targetEmail)
      .then((result) => {
        const nextOtpId = String(result?.otpId || "");
        if (!nextOtpId) {
          throw new Error("Unable to replace the OTP session. Please sign in again.");
        }

        issuedOtpIdRef.current = nextOtpId;
        setPendingOtpId(nextOtpId);
        setResendWindowStart(windowStart);
        setResendCount(nextResendCount + 1);
        setOtpSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
        setOtpExpiresLeft(OTP_EXPIRY_SECONDS);
        setOtpAttempts(0);
        resetOtpState();
        setError("");
        setInfoMessage("Code resent. Check your email.");
      })
      .catch((requestError) => {
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to resend verification code.";
        setError(typeof message === "string" ? message : "Unable to resend verification code.");
      })
      .finally(() => {
        setLoading(false);
        submitInFlight.current = false;
      });
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      
      {/* Main Container */}
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-sm p-10 flex flex-col items-center">
        <div className="w-full mb-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
            aria-label="Back to role selection"
          >
            <ChevronLeft size={20} />
          </Link>
        </div>
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/assets/Logo.png"
            alt="TrabaHome"
            className="h-10 w-auto mb-4"
          />
          
          <h2 className="text-[#0B3B68] text-2xl font-bold text-center">
            {isMustChangePasswordStep
              ? "Set New Password"
              : isOtpStep
              ? "Enter OTP"
              : "Welcome Back!"}
          </h2>
          <p className="text-[#0B3B68] text-[10px] text-center mt-1 opacity-80">
            {isMustChangePasswordStep
              ? "Create your permanent password to complete your account setup."
              : isOtpStep
              ? "Use the newest email with the subject “Your login code”."
              : "Sign in to manage your home services and active requests."}
          </p>
        </div>

        {!isOtpStep && !isMustChangePasswordStep && (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {infoMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-xs text-emerald-700 font-bold">{infoMessage}</p>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0B3B68]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-1">
                <Link to="/homeowner-forgot-password" className="text-[10px] text-gray-500 font-semibold hover:text-[#0B3B68]">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}

            <button
              type="submit"
              disabled={loading || isLocked || !email.trim() || !password}
              className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-4 hover:bg-[#082d50] transition-colors"
            >
              {isLocked
                ? `Locked ${lockoutSecondsLeft}s`
                : loading
                ? "Signing In..."
                : "Sign In"}
            </button>
          </form>
        )}

        {isOtpStep && !isMustChangePasswordStep && (
          <form onSubmit={handleOtpSubmit} className="w-full space-y-4">
            <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">Email</label>
              <input
                type="email"
                value={maskedPendingEmail}
                readOnly
                className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-2 text-sm text-gray-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">OTP Code</label>
              <div className={`flex items-center justify-between gap-2 ${otpShake ? "otp-shake" : ""}`}>
                {otpDigits.map((digit, index) => (
                  (() => {
                    const isFilled = Boolean(digit);
                    const isIncorrectOtp = error === INVALID_OTP_MESSAGE || error === OTP_TOO_MANY_MESSAGE;
                    const borderClass = isIncorrectOtp
                      ? "border-red-400 focus:border-red-400 focus:ring-red-200/60"
                      : "border-gray-300 focus:border-[#0B3B68] focus:ring-[#0B3B68]/30";
                    return (
                  <input
                    key={`otp-${index}`}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    aria-label={`OTP digit ${index + 1}`}
                    className={`w-11 h-12 rounded-xl text-center text-sm outline-none transition-all ${
                      isFilled ? "bg-[#F3F4F6] font-semibold text-gray-900" : "bg-white font-normal text-gray-400"
                    } border ${borderClass} focus:ring-1 focus:shadow-[0_0_0_6px_rgba(11,59,104,0.08)]`}
                  />
                    );
                  })()
                ))}
              </div>
            </div>

            <div className="text-[10px] text-gray-500">
              <span>Didn't receive it? </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpSecondsLeft > 0 || loading}
                className="font-bold hover:underline disabled:cursor-not-allowed disabled:text-gray-400 text-[#082D50]"
              >
                {otpSecondsLeft > 0 ? `Resend in ${formatSecondsDisplay(otpSecondsLeft)}` : "Resend Code"}
              </button>
            </div>

            {infoMessage && (
              <p className="text-[10px] text-green-600 text-center font-semibold">
                {infoMessage}
              </p>
            )}

            {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}

            <button
              type="submit"
              disabled={loading || otpDigits.some((digit) => !digit) || otpAttempts >= OTP_MAX_ATTEMPTS}
              className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-4 hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Verify Code
            </button>
          </form>
        )}

        {isMustChangePasswordStep && (
          <form onSubmit={handleUpdateInitialPassword} className="w-full space-y-3.5">
            {/* New Password */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={24}
                  placeholder="Enter new password"
                  className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  maxLength={24}
                  placeholder="Confirm new password"
                  className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1 ml-1">
                  <AlertCircle size={11} />
                  <span>Passwords do not match</span>
                </p>
              )}
            </div>

            {/* Password Strength Meter & Requirement Checklist */}
            {(() => {
              const analysis = checkPasswordStrength(newPassword);
              return (
                <div className="rounded-xl p-3 bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-600">Password Strength:</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        analysis.strength === "Extremely Weak"
                          ? "bg-red-100 text-red-700"
                          : analysis.strength === "Weak"
                          ? "bg-amber-100 text-amber-700"
                          : analysis.strength === "Strong"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {newPassword ? analysis.strength : "Not Entered"}
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${analysis.color}`}
                      style={{ width: `${(analysis.score / 4) * 100}%` }}
                    />
                  </div>

                  {newPassword && analysis.error && (
                    <p className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={11} className="shrink-0" />
                      <span>{analysis.error}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-1 pt-1 text-[10px]">
                    <div className={`flex items-center gap-1.5 ${analysis.checks.length && analysis.checks.noSpaces ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                      {analysis.checks.length && analysis.checks.noSpaces ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
                      <span>8–24 characters (no spaces)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${analysis.checks.uppercase && analysis.checks.lowercase ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                      {analysis.checks.uppercase && analysis.checks.lowercase ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
                      <span>Uppercase (A-Z) &amp; Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${analysis.checks.number ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                      {analysis.checks.number ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
                      <span>At least 1 number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${analysis.checks.special ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                      {analysis.checks.special ? <Check size={11} className="shrink-0 font-bold" /> : <X size={11} className="shrink-0" />}
                      <span>Special character (!@#$%^*()-_+=?)</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}

            <button
              type="submit"
              disabled={
                isUpdatingPassword ||
                Boolean(checkPasswordStrength(newPassword).error) ||
                !confirmPassword ||
                newPassword !== confirmPassword
              }
              className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-2 hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUpdatingPassword ? "Saving Password..." : "Save New Password"}
            </button>
          </form>
        )}

        {/* Footer Links */}
        {!isOtpStep && !isMustChangePasswordStep && (
          <div className="mt-6 text-center">
          <p className="text-[10px] text-gray-600 font-semibold">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#004A8C] font-bold hover:underline">
              Sign Up
            </Link>
          </p>
          </div>
        )}
      </div>
    </div>
  );
}
