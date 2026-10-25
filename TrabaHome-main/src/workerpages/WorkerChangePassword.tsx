// @ts-nocheck
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../components/workersjobs/Index.ts";
import { workerAPI } from "../services/WorkerApi.ts";
import { getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import { clearWorkerSession, getWorkerSession } from "../utils/workerAuth.ts";

const PASSWORD_RULES = ["At least 8 characters", "Must include letters and numbers"];
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

export default function WorkerChangePassword() {
  const navigate = useNavigate();
  const session = getWorkerSession();
  const worker = session?.worker || {};
  const codeEmail = String(session?.email || worker.email || "").trim().toLowerCase();
  const workerName =
    String(
      [worker.firstName, worker.lastName].filter(Boolean).join(" ").trim() ||
        worker.name ||
        worker.fullName ||
        "Worker"
    ).trim();
  const workerAvatar = String(worker.avatar || worker.profileImage || worker.photoUrl || worker.image || worker.photo || "").trim();
  const workerProfession = String(worker.profession || "").trim() || "Profession not set";
  const workerRating =
    Number.isFinite(Number(worker.rating)) && Number(worker.rating) > 0 ? Number(worker.rating) : null;
  const liveStatus = getWorkerLiveStatus(worker.workingSchedule, worker.availabilityStatus);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [codeDigits, setCodeDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const strengthScore = useMemo(() => getStrengthScore(newPassword), [newPassword]);
  const strengthLabel = ["Weak", "Fair", "Good", "Strong"][strengthScore] || "Weak";
  const isFormComplete = Boolean(currentPassword && newPassword && confirmPassword);

  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const node = headerRef.current;
    const update = () => setHeaderHeight(node.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!session?.token || !codeEmail) {
      navigate("/worker-login", { replace: true });
    }
  }, [codeEmail, navigate, session?.token]);

  useEffect(() => {
    if (!isCodeSent || codeSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCodeSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [codeSecondsLeft, isCodeSent]);

  useEffect(() => {
    if (!isCodeSent) return;
    window.setTimeout(() => codeRefs.current[0]?.focus(), 0);
  }, [isCodeSent]);

  const validate = () => {
    const nextErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    }

    if (!meetsPasswordRules(newPassword)) {
      nextErrors.newPassword = "Password must be at least 8 characters and include letters and numbers.";
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

  const handleCancel = () => {
    navigate("/worker-settings");
  };

  const handleLogout = () => {
    clearWorkerSession();
    navigate("/", { replace: true });
  };

  const handleCodeChange = (index, value) => {
    const cleaned = String(value || "").replace(/\D/g, "");
    setStatusMessage("");
    const next = [...codeDigits];

    if (!cleaned) {
      next[index] = "";
      setCodeDigits(next);
      return;
    }

    for (let offset = 0; offset < cleaned.length && index + offset < OTP_LENGTH; offset += 1) {
      next[index + offset] = cleaned[offset];
    }
    setCodeDigits(next);
    codeRefs.current[Math.min(index + cleaned.length, OTP_LENGTH - 1)]?.focus();
  };

  const sendVerificationCode = async () => {
    if (!codeEmail) {
      setStatusMessage("Your email is missing. Please log in again.");
      return false;
    }

    setIsSendingCode(true);
    try {
      await workerAPI.requestChangePasswordOtp({
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage("");

    if (!session?.token) {
      setStatusMessage("You're not signed in. Please log in again.");
      return;
    }

    if (!validate()) return;

    await sendVerificationCode();
  };

  const handleVerifyCode = async () => {
    const code = codeDigits.join("");
    if (code.length !== OTP_LENGTH) {
      setStatusMessage("Enter the 6-digit confirmation code.");
      return;
    }

    setIsVerifyingCode(true);
    try {
      await workerAPI.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        code,
      });
      setStatusMessage("Password updated successfully. You will be signed out now so you can log back in.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCodeDigits(Array(OTP_LENGTH).fill(""));
      setErrors({});
      clearWorkerSession();
      window.setTimeout(() => navigate("/worker-login", { replace: true }), 1200);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to update your password.";
      setStatusMessage(message);
      if (String(message).toLowerCase().includes("current")) {
        setErrors((prev) => ({
          ...prev,
          currentPassword: "Current password is incorrect.",
        }));
      }
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

  const sidebarOffset = headerHeight ? headerHeight + 24 : 88;
  const sidebarHeight = headerHeight ? `calc(100vh - ${headerHeight + 48}px)` : "calc(100vh - 112px)";

  return (
    <div className="min-h-screen bg-[#F9F6F2] font-sans flex flex-col items-center relative text-left">
      <div aria-hidden="true" style={headerHeight ? { height: headerHeight } : undefined} />
      <Header ref={headerRef} onLogoClick={() => navigate("/home-worker")} />

      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-start p-3 sm:p-6 pb-24 lg:pb-6">
        <Sidebar
          location={{ pathname: "/worker-settings" }}
          navigate={navigate}
          workerName={workerName}
          workerAvatar={workerAvatar}
          workerProfession={workerProfession}
          workerRating={workerRating}
          onLogout={handleLogout}
          stickyTop={sidebarOffset}
          stickyHeight={sidebarHeight}
        />

        <main className="flex-1 w-full min-w-0 max-w-[1080px]">
          <header className="flex justify-between items-start mb-8 px-2">
            <div>
              <button
                type="button"
                onClick={() => navigate("/worker-settings")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#0B3B68]"
                aria-label="Back to settings"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="mt-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Change Password</h1>
                <p className="text-sm text-gray-500">
                  For security, enter your current password before setting a new one.
                </p>
              </div>
            </div>
            <div
              className={`hidden md:inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                liveStatus.isOnline ? "bg-[#EBF7F3] text-[#00A651]" : "bg-gray-100 text-gray-400"
              }`}
            >
              {liveStatus.isOnline ? "Online" : "Offline"}
            </div>
          </header>

          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            {statusMessage && (
              <div className="mb-6 rounded-2xl border border-[#D7E6F5] bg-[#E8F1F7] px-4 py-3 text-sm font-semibold text-[#0B3B68]">
                {statusMessage}
              </div>
            )}

            {!isCodeSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-[12px] font-bold text-gray-700">Current Password</label>
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
                    className={`w-full rounded-xl border bg-[#EBEBEB] px-4 py-3 pr-12 text-sm outline-none placeholder:text-gray-400 ${
                      errors.currentPassword
                        ? "border-red-400 focus:ring-red-200/60"
                        : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
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
                <p className="mt-2 text-[10px] text-gray-500">Required to confirm your identity.</p>
                {errors.currentPassword && <p className="mt-1 text-[10px] font-semibold text-red-500">{errors.currentPassword}</p>}
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold text-gray-700">New Password</label>
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
                    className={`w-full rounded-xl border bg-[#EBEBEB] px-4 py-3 pr-12 text-sm outline-none placeholder:text-gray-400 ${
                      errors.newPassword
                        ? "border-red-400 focus:ring-red-200/60"
                        : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
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
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
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
                {errors.newPassword && <p className="mt-2 text-[10px] font-semibold text-red-500">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-bold text-gray-700">Confirm New Password</label>
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
                    className={`w-full rounded-xl border bg-[#EBEBEB] px-4 py-3 pr-12 text-sm outline-none placeholder:text-gray-400 ${
                      errors.confirmPassword
                        ? "border-red-400 focus:ring-red-200/60"
                        : "border-transparent focus:ring-2 focus:ring-[#0B3B68]"
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
                  <p className="mt-2 text-[10px] font-semibold text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!isFormComplete || isSendingCode}
                  className="rounded-full bg-[#0B3B68] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#082d50] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSendingCode ? "Sending Code..." : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
            ) : (
              <div className="space-y-6 rounded-2xl border border-gray-200 bg-[#FAFAFA] p-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-[#0B3B68]">
                    Confirm it's you with a Gmail code
                  </p>
                  <p className="mb-4 text-xs text-gray-500">
                    We sent a 6-digit confirmation code to <span className="font-semibold">{codeEmail}</span>.
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {codeDigits.map((digit, index) => (
                      <input
                        key={`code-${index}`}
                        ref={(element) => {
                          codeRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={digit}
                        onChange={(event) => handleCodeChange(index, event.target.value)}
                        aria-label={`OTP digit ${index + 1}`}
                        className="h-12 w-11 rounded-xl border border-gray-300 bg-white text-center text-sm outline-none transition-all focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68]/30"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode || codeDigits.some((digit) => !digit)}
                    className="rounded-full bg-[#0B3B68] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#082d50] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isVerifyingCode ? "Verifying..." : "Verify & Save"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isSendingCode || codeSecondsLeft > 0}
                    className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingCode
                      ? "Sending..."
                      : codeSecondsLeft > 0
                        ? `Resend in ${codeSecondsLeft}s`
                        : "Resend Code"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
