// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/requestpages/Navbar";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { clearHomeownerSession, getHomeownerSession } from "../utils/homeownerAuth.ts";

const PASSWORD_RULES = [
  "At least 8 characters",
  "Must include letters and numbers",
];
const OTP_LENGTH = 6;
const CODE_RESEND_COOLDOWN_SECONDS = 30;

const meetsPasswordRules = (value) => {
  if (!value) return false;
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
};

const getStrengthScore = (value) => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  return Math.min(score, 3);
};

export default function HomeownerChangePassword() {
  const navigate = useNavigate();
  const session = getHomeownerSession();
  const codeEmail = String(session?.email || "").toLowerCase();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeDigits, setCodeDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const strengthScore = useMemo(() => getStrengthScore(newPassword), [newPassword]);
  const isFormComplete = Boolean(
    currentPassword &&
      newPassword &&
      confirmPassword
  );

  useEffect(() => {
    if (!session?.token || !codeEmail) {
      navigate("/login", { replace: true });
      return;
    }
  }, [codeEmail, navigate, session?.token]);

  useEffect(() => {
    if (!isCodeSent || codeSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCodeSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isCodeSent, codeSecondsLeft]);

  useEffect(() => {
    if (isCodeSent) {
      window.setTimeout(() => {
        codeRefs.current[0]?.focus();
      }, 0);
    }
  }, [isCodeSent]);

  const validate = () => {
    const nextErrors = {};
    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    }

    if (!meetsPasswordRules(newPassword)) {
      nextErrors.newPassword =
        "Password must be at least 8 characters and include letters and numbers.";
    }

    if (currentPassword && newPassword === currentPassword) {
      nextErrors.newPassword = "New password must be different from the current password.";
    }

    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCodeChange = (index, value) => {
    const cleaned = String(value || "").replace(/\D/g, "");
    setStatusMessage("");
    if (cleaned.length === 0) {
      const next = [...codeDigits];
      next[index] = "";
      setCodeDigits(next);
      return;
    }

    const next = [...codeDigits];
    if (cleaned.length === 1) {
      next[index] = cleaned;
      setCodeDigits(next);
      if (index < OTP_LENGTH - 1) {
        codeRefs.current[index + 1]?.focus();
      }
      return;
    }

    for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i += 1) {
      next[index + i] = cleaned[i];
    }
    setCodeDigits(next);
    const nextIndex = Math.min(index + cleaned.length, OTP_LENGTH - 1);
    codeRefs.current[nextIndex]?.focus();
  };

  const sendVerificationCode = async () => {
    if (!codeEmail) {
      setStatusMessage("Your email is missing. Please log in again.");
      return false;
    }

    setIsSendingCode(true);
    try {
      await homeownerAPI.requestChangePasswordOtp({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setIsCodeSent(true);
      setCodeSecondsLeft(CODE_RESEND_COOLDOWN_SECONDS);
      setStatusMessage("We sent a confirmation code to your Gmail. Enter it to continue.");
      return true;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to send confirmation code. Please try again.";
      if (String(message).toLowerCase().includes("current password")) {
        setErrors((previous) => ({
          ...previous,
          currentPassword: "Current password is incorrect.",
        }));
      }
      setStatusMessage(message);
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handlePasswordStepSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");

    if (!validate()) return;
    if (!session?.token) {
      setStatusMessage("You're not signed in. Please log in again.");
      return;
    }

    const sent = await sendVerificationCode();
    if (!sent) return;
  };

  const handleVerifyCode = async () => {
    const code = codeDigits.join("").trim();
    if (code.length !== OTP_LENGTH) {
      setStatusMessage("Enter the 6-digit confirmation code.");
      return;
    }
    if (!codeEmail) {
      setStatusMessage("Your email is missing. Please log in again.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      await homeownerAPI.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        code,
      });

      setStatusMessage(
        "Password updated successfully. You will be signed out now so you can log back in with your new password."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      clearHomeownerSession();
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Invalid or expired code.";
      if (String(message).toLowerCase().includes("current")) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect.",
        }));
        setStatusMessage("");
        return;
      }
      setStatusMessage(
        message
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (codeSecondsLeft > 0 || isSendingCode) return;
    const sent = await sendVerificationCode();
    if (sent) {
      setCodeDigits(Array(OTP_LENGTH).fill(""));
      codeRefs.current[0]?.focus();
    }
  };

  const handleCancel = () => {
    navigate("/homeowner-settings");
  };

  const strengthLabel = ["Weak", "Fair", "Good", "Strong"][strengthScore] || "Weak";

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <button
            type="button"
            onClick={() => navigate("/homeowner-settings")}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
            aria-label="Back to settings"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="mt-4 mb-8">
            <h1 className="text-2xl font-bold text-[#0B3B68]">Change Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              For security, enter your current password before setting a new one.
            </p>
          </div>

          {statusMessage && (
            <div className="mb-6 px-4 py-3 rounded-2xl text-sm font-semibold text-[#0B3B68] bg-[#E8F1F7] border border-[#D7E6F5]">
              {statusMessage}
            </div>
          )}

          {!isCodeSent ? (
            <form onSubmit={handlePasswordStepSubmit} className="space-y-6">
            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    if (errors.currentPassword) {
                      setErrors((prev) => ({ ...prev, currentPassword: "" }));
                    }
                  }}
                  placeholder="Enter current password"
                  className={`w-full bg-[#EBEBEB] rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-400 pr-12 border ${
                    errors.currentPassword ? "border-red-400 focus:ring-red-200/60" : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0B3B68]"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Required to confirm your identity.</p>
              {errors.currentPassword && (
                <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: "" }));
                    }
                  }}
                  placeholder="Enter new password"
                  className={`w-full bg-[#EBEBEB] rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-400 pr-12 border ${
                    errors.newPassword ? "border-red-400 focus:ring-red-200/60" : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0B3B68]"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-gray-500">
                {PASSWORD_RULES.map((rule) => (
                  <p key={rule}>{rule}</p>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        strengthScore === 0
                          ? "w-0"
                          : strengthScore === 1
                          ? "w-1/3 bg-red-400"
                          : strengthScore === 2
                          ? "w-2/3 bg-amber-400"
                          : "w-full bg-emerald-500"
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-500">{strengthLabel}</span>
                </div>
              </div>
              {errors.newPassword && (
                <p className="text-[10px] text-red-500 mt-2 font-semibold">{errors.newPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }
                  }}
                  placeholder="Re-enter new password"
                  className={`w-full bg-[#EBEBEB] rounded-xl px-4 py-3 text-sm outline-none placeholder:text-gray-400 pr-12 border ${
                    errors.confirmPassword ? "border-red-400 focus:ring-red-200/60" : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0B3B68]"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-500 mt-2 font-semibold">{errors.confirmPassword}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={!isFormComplete || isSendingCode}
                className="px-6 py-3 rounded-full bg-[#0B3B68] text-white text-sm font-semibold hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSendingCode ? "Sending Code..." : "Continue"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-[#FAFAFA] p-5">
                <p className="text-sm font-semibold text-[#0B3B68] mb-3">
                  Confirm it's you with a Gmail code
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  We sent a 6-digit confirmation code to <span className="font-semibold">{codeEmail}</span>.
                </p>
                <div className="flex items-center justify-between gap-2">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={`code-${index}`}
                      ref={(el) => {
                        codeRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleCodeChange(index, event.target.value)}
                      className="w-11 h-12 rounded-xl text-center text-sm outline-none transition-all bg-white border border-gray-300 focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68]/30"
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode || isSendingCode}
                    className="px-5 py-2.5 rounded-full bg-[#0B3B68] text-white text-sm font-semibold hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isVerifyingCode ? "Verifying..." : "Verify & Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isSendingCode || codeSecondsLeft > 0}
                    className="px-5 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSendingCode
                      ? "Sending..."
                      : codeSecondsLeft > 0
                        ? `Resend in ${codeSecondsLeft}s`
                        : "Resend Code"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
