import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, X, ShieldCheck, Mail } from "lucide-react";
import { adminAPI } from "../services/AdminApi.ts";
import { isAdminAuthenticated, saveAdminSession } from "../utils/adminAuth.ts";
import { LOGIN_LOCKOUT_SECONDS, useLoginLockout } from "../hooks/useLoginLockout.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LENGTH = 6;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_EXPIRY_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 3;
const OTP_MAX_RESENDS = 5;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
const INVALID_OTP_MESSAGE = "Invalid or expired code.";
const OTP_TOO_MANY_MESSAGE = "Too many attempts. Request a new code.";
const LOGIN_INVALID_MESSAGE = "Incorrect email or password.";

const maskEmail = (rawEmail) => {
  if (!rawEmail) return "";
  const atIndex = rawEmail.indexOf("@");
  if (atIndex <= 0) return rawEmail;

  const local = rawEmail.slice(0, atIndex);
  const domain = rawEmail.slice(atIndex);

  if (local.length <= 1) return `*${domain}`;
  if (local.length === 2) return `${local[0]}*${domain}`;
  if (local.length === 3) return `${local[0]}*${local[2]}${domain}`;

  const masked = "*".repeat(Math.max(1, local.length - 4));
  return `${local.slice(0, 2)}${masked}${local.slice(-2)}${domain}`;
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Modal State
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingOtpId, setPendingOtpId] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // OTP Timers & Counters
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [otpExpiresLeft, setOtpExpiresLeft] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendWindowStart, setResendWindowStart] = useState(0);
  const [otpShake, setOtpShake] = useState(false);

  const { lockoutSecondsLeft, startLockout, clearLockout, recordAttempt, isLocked } = useLoginLockout("admin", email);
  const submitInFlight = useRef(false);
  const otpRefs = useRef([]);
  const loginTooManyMessage = `Too many attempts. Try again in ${Math.max(1, Math.ceil(LOGIN_LOCKOUT_SECONDS / 60))} minute${Math.ceil(LOGIN_LOCKOUT_SECONDS / 60) === 1 ? "" : "s"}.`;
  const maskedPendingEmail = maskEmail(pendingEmail);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!isOtpModalOpen) return;
    const timer = setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOtpModalOpen]);

  useEffect(() => {
    if (!isOtpModalOpen || otpSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOtpModalOpen, otpSecondsLeft]);

  useEffect(() => {
    if (!isOtpModalOpen || otpExpiresLeft <= 0) return;
    const timer = window.setInterval(() => {
      setOtpExpiresLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOtpModalOpen, otpExpiresLeft]);

  const resetOtpState = () => {
    setOtpDigits(Array(OTP_LENGTH).fill(""));
  };

  const closeOtpModal = () => {
    setIsOtpModalOpen(false);
    resetOtpState();
    setModalError("");
    setInfoMessage("");
    setOtpSecondsLeft(0);
    setOtpExpiresLeft(0);
    setOtpAttempts(0);
    setResendCount(0);
    setResendWindowStart(0);
    setOtpShake(false);
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    if (submitInFlight.current || loading || isLocked) return;
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    submitInFlight.current = true;
    setLoading(true);
    try {
      const result = await adminAPI.login({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const resolvedEmail = (result?.email || trimmedEmail).toLowerCase();

      if (result?.token) {
        clearLockout();
        saveAdminSession({
          token: result.token,
          email: resolvedEmail,
          admin: result.admin ?? null,
        });
        navigate("/admin-dashboard", { replace: true });
        return;
      }

      clearLockout();
      setPendingEmail(resolvedEmail);
      setPendingOtpId(String(result?.otpId || ""));
      setIsOtpModalOpen(true);
      resetOtpState();
      setModalError("");
      setOtpSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
      setOtpExpiresLeft(OTP_EXPIRY_SECONDS);
      setOtpAttempts(0);
      setResendCount(0);
      setResendWindowStart(Date.now());
      setInfoMessage("Verification code sent to your email.");
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to sign in. Please try again.";
      const retryAfterSeconds = Number(requestError?.response?.data?.retryAfterSeconds);
      if (requestError?.response?.status === 429 || /too many|blocked|rate/i.test(String(message))) {
        startLockout(
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? retryAfterSeconds
            : LOGIN_LOCKOUT_SECONDS
        );
        setError(loginTooManyMessage);
      } else if (requestError?.response?.status === 401) {
        const { blocked } = recordAttempt();
        if (blocked) {
          setError(loginTooManyMessage);
        } else {
          setError(typeof message === "string" ? message : LOGIN_INVALID_MESSAGE);
        }
      } else {
        setError(typeof message === "string" ? message : "Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
      submitInFlight.current = false;
    }
  };

  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, "");
    if (modalError) setModalError("");
    if (infoMessage) setInfoMessage("");
    if (!cleaned) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    const next = [...otpDigits];
    if (cleaned.length === 1) {
      next[index] = cleaned;
      setOtpDigits(next);
      if (index < OTP_LENGTH - 1) {
        otpRefs.current[index + 1]?.focus();
      }
      return;
    }

    for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i += 1) {
      next[index + i] = cleaned[i];
    }
    setOtpDigits(next);
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
    setOtpDigits(next);
    const nextIndex = Math.min(cleaned.length, OTP_LENGTH - 1);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    if (submitInFlight.current || modalLoading) return;
    setModalError("");

    if (otpAttempts >= OTP_MAX_ATTEMPTS) {
      setModalError(OTP_TOO_MANY_MESSAGE);
      return;
    }

    const trimmedOtp = otpDigits.join("").trim();
    const targetEmail = pendingEmail || email.trim().toLowerCase();

    if (trimmedOtp.length !== OTP_LENGTH || otpExpiresLeft <= 0) {
      setModalError(INVALID_OTP_MESSAGE);
      setOtpShake(true);
      window.setTimeout(() => setOtpShake(false), 260);
      return;
    }

    if (!targetEmail) {
      setModalError("Admin session is missing. Please sign in again.");
      closeOtpModal();
      return;
    }

    submitInFlight.current = true;
    setModalLoading(true);
    try {
      const result = await adminAPI.verifyLoginOtp({
        email: targetEmail,
        code: trimmedOtp,
        otpId: pendingOtpId || undefined,
      });

      if (!result?.token) {
        setOtpAttempts((prev) => prev + 1);
        setModalError(INVALID_OTP_MESSAGE);
        setOtpShake(true);
        window.setTimeout(() => setOtpShake(false), 260);
        return;
      }

      clearLockout();
      saveAdminSession({
        token: result.token,
        email: (result.email || targetEmail).toLowerCase(),
        admin: result.admin ?? null,
      });
      setIsOtpModalOpen(false);
      navigate("/admin-dashboard", { replace: true });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        INVALID_OTP_MESSAGE;
      const status = requestError?.response?.status;
      setOtpAttempts((prev) => prev + 1);

      if (status === 429 || otpAttempts + 1 >= OTP_MAX_ATTEMPTS) {
        setModalError(OTP_TOO_MANY_MESSAGE);
      } else {
        setModalError(typeof message === "string" ? message : INVALID_OTP_MESSAGE);
      }
      setOtpShake(true);
      window.setTimeout(() => setOtpShake(false), 260);
    } finally {
      setModalLoading(false);
      submitInFlight.current = false;
    }
  };

  const handleResendOtp = () => {
    if (otpSecondsLeft > 0 || submitInFlight.current || modalLoading) return;
    const now = Date.now();
    const windowStart = resendWindowStart && now - resendWindowStart < OTP_RESEND_WINDOW_MS
      ? resendWindowStart
      : now;
    const nextResendCount = windowStart === resendWindowStart ? resendCount : 0;

    if (nextResendCount >= OTP_MAX_RESENDS) {
      setModalError(loginTooManyMessage);
      return;
    }

    const targetEmail = pendingEmail || email.trim().toLowerCase();
    if (!targetEmail) {
      setModalError("Email is missing. Please sign in again.");
      closeOtpModal();
      return;
    }

    submitInFlight.current = true;
    setModalLoading(true);
    adminAPI
      .resendLoginOtp(targetEmail)
      .then((result) => {
        const nextOtpId = String(result?.otpId || "");
        if (nextOtpId) {
          setPendingOtpId(nextOtpId);
        }
        setResendWindowStart(windowStart);
        setResendCount(nextResendCount + 1);
        setOtpSecondsLeft(OTP_RESEND_COOLDOWN_SECONDS);
        setOtpExpiresLeft(OTP_EXPIRY_SECONDS);
        setOtpAttempts(0);
        resetOtpState();
        setModalError("");
        setInfoMessage("Code resent. Check your email.");
      })
      .catch((requestError) => {
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to resend verification code.";
        setModalError(typeof message === "string" ? message : "Unable to resend verification code.");
      })
      .finally(() => {
        setModalLoading(false);
        submitInFlight.current = false;
      });
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-sm p-10 flex flex-col items-center">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/assets/Logo.png"
            alt="TrabaHome"
            className="h-10 w-auto mb-4"
          />
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E8F1F7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B3B68]">
            <span className="h-2 w-2 rounded-full bg-[#0B3B68]" />
            Admin Portal
          </div>
          <h2 className="text-[#0B3B68] text-2xl font-bold text-center">Admin Sign In</h2>
          <p className="text-[#0B3B68] text-[10px] text-center mt-1 opacity-80">
            Sign in to manage platform operations.
          </p>
        </div>

        <form onSubmit={handleCredentialsSubmit} className="w-full space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@gmail.com"
              className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
          </div>

          {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}
          <button
            type="submit"
            disabled={loading || isLocked || !email.trim() || !password}
            className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-4 hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLocked
              ? `Locked ${lockoutSecondsLeft}s`
              : loading
              ? "Sending OTP..."
              : "Sign In"}
          </button>
        </form>
      </div>

      {/* OTP Verification Modal */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={closeOtpModal}
          />

          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 z-10 border border-gray-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={closeOtpModal}
              className="absolute right-5 top-5 h-9 w-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Close OTP Modal"
            >
              <X size={20} />
            </button>

            <div className="h-14 w-14 rounded-2xl bg-[#E8F1F7] text-[#0B3B68] flex items-center justify-center mb-4 shadow-sm">
              <ShieldCheck size={28} />
            </div>

            <h3 className="text-xl font-bold text-[#0B3B68] text-center">Two-Factor Authentication</h3>
            <p className="text-xs text-gray-500 text-center mt-1.5 leading-relaxed">
              We've sent a 6-digit OTP code to your registered email address:
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
              <Mail size={13} className="text-[#0B3B68]" />
              <span>{maskedPendingEmail || pendingEmail}</span>
            </div>

            <form onSubmit={handleOtpSubmit} className="w-full mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-2 text-center uppercase tracking-wider">
                  Enter 6-Digit Code
                </label>
                <div className={`flex items-center justify-center gap-2.5 ${otpShake ? "otp-shake" : ""}`}>
                  {otpDigits.map((digit, index) => {
                    const isFilled = Boolean(digit);
                    const isIncorrectOtp = modalError === INVALID_OTP_MESSAGE || modalError === OTP_TOO_MANY_MESSAGE;
                    const borderClass = isIncorrectOtp
                      ? "border-red-400 focus:border-red-400 focus:ring-red-200/60"
                      : "border-gray-300 focus:border-[#0B3B68] focus:ring-[#0B3B68]/30";
                    return (
                      <input
                        key={`modal-otp-${index}`}
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
                        className={`w-11 h-12 rounded-xl text-center text-base outline-none transition-all ${
                          isFilled ? "bg-[#F3F4F6] font-bold text-gray-900" : "bg-white font-normal text-gray-400"
                        } border ${borderClass} focus:ring-1 focus:shadow-[0_0_0_6px_rgba(11,59,104,0.08)]`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-gray-500">
                <span>
                  {otpExpiresLeft > 0
                    ? `Expires in ${Math.floor(otpExpiresLeft / 60)}:${String(otpExpiresLeft % 60).padStart(2, "0")}`
                    : "Code expired"}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpSecondsLeft > 0 || modalLoading}
                  className="font-bold hover:underline disabled:cursor-not-allowed disabled:text-gray-400 text-[#0B3B68]"
                >
                  {otpSecondsLeft > 0 ? `Resend in ${otpSecondsLeft}s` : "Resend Code"}
                </button>
              </div>

              {infoMessage && (
                <p className="text-xs text-green-600 text-center font-semibold bg-green-50 py-1.5 px-3 rounded-lg">
                  {infoMessage}
                </p>
              )}

              {modalError && (
                <p className="text-xs text-red-500 text-center font-bold bg-red-50 py-1.5 px-3 rounded-lg">
                  {modalError}
                </p>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={modalLoading || otpDigits.some((digit) => !digit) || otpAttempts >= OTP_MAX_ATTEMPTS}
                  className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-md shadow-[#0B3B68]/10"
                >
                  {modalLoading ? "Verifying..." : "Verify & Sign In"}
                </button>

                <button
                  type="button"
                  onClick={closeOtpModal}
                  className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Cancel & Return to Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
