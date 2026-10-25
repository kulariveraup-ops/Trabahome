import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeownerAPI } from "../../services/HomeownerApi.ts";
import { workerAPI } from "../../services/WorkerApi.ts";

type PasswordResetRole = "homeowner" | "worker";

interface PasswordResetFlowProps {
  userType: PasswordResetRole;
}

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return String(response.data.message);
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message || fallback);
  }
  return fallback;
};

export default function PasswordResetFlow({ userType }: PasswordResetFlowProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryEmail = new URLSearchParams(location.search).get("email") || "";
  const isHomeowner = userType === "homeowner";
  const storageKey = isHomeowner ? "homeownerResetEmail" : "workerResetEmail";
  const loginPath = isHomeowner ? "/login" : "/worker-login";
  const forgotPath = isHomeowner
    ? "/homeowner-forgot-password"
    : "/worker-forgot-password";
  const successPath = isHomeowner
    ? "/homeowner-reset-success"
    : "/worker-reset-success";

  const [step, setStep] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState(queryEmail.trim().toLowerCase());
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const [otpDigits, setOtpDigits] = useState<string[]>(() =>
    Array(OTP_LENGTH).fill("")
  );
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (secondsLeft <= 0 || step !== "otp") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft, step]);

  useEffect(() => {
    const normalizedQueryEmail = queryEmail.trim().toLowerCase();
    if (normalizedQueryEmail) {
      setEmail(normalizedQueryEmail);
      window.localStorage.setItem(storageKey, normalizedQueryEmail);
      return;
    }

    const storedEmail = window.localStorage.getItem(storageKey);
    if (storedEmail) {
      setEmail(storedEmail.trim().toLowerCase());
      return;
    }

    navigate(forgotPath, { replace: true });
  }, [forgotPath, navigate, queryEmail, storageKey]);

  useEffect(() => {
    if (step !== "otp") return;
    window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
  }, [step]);

  const requestOtp = async () => {
    if (isHomeowner) return homeownerAPI.forgotPassword(email);
    return workerAPI.forgotPassword(email);
  };

  const verifyOtp = async (code: string) => {
    if (isHomeowner) {
      return homeownerAPI.verifyForgotPasswordOtp({
        email,
        code,
        userType: "homeowner",
        purpose: "forgot_password",
      });
    }
    return workerAPI.verifyForgotPasswordOtp({
      email,
      code,
      userType: "worker",
      purpose: "forgot_password",
    });
  };

  const resetPassword = async () => {
    const payload = { resetToken, newPassword: password, confirmPassword };
    if (isHomeowner) return homeownerAPI.resetPassword(payload);
    return workerAPI.resetPassword(payload);
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !email || isResending) return;
    setError("");
    setIsResending(true);
    try {
      await requestOtp();
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setResetToken("");
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch (resendError) {
      setError(getErrorMessage(resendError, "Unable to resend code. Please try again."));
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    setError("");
    const next = [...otpDigits];

    if (!cleaned) {
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    for (let offset = 0; offset < cleaned.length && index + offset < OTP_LENGTH; offset += 1) {
      next[index + offset] = cleaned[offset];
    }
    setOtpDigits(next);
    otpRefs.current[Math.min(index + cleaned.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
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

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const cleaned = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!cleaned) return;

    const next = Array(OTP_LENGTH).fill("");
    cleaned.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtpDigits(next);
    otpRefs.current[Math.min(cleaned.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join("");
    if (!email) {
      navigate(forgotPath, { replace: true });
      return;
    }
    if (code.length !== OTP_LENGTH) {
      setError("Enter the 6-digit code.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const response = await verifyOtp(code);
      if (!response.resetToken) throw new Error("Unable to verify reset code.");
      setResetToken(response.resetToken);
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setStep("password");
    } catch (verifyError) {
      setError(getErrorMessage(verifyError, "Invalid or expired OTP."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setPasswordError("");
    setConfirmError("");
    setError("");

    if (!resetToken) {
      setStep("otp");
      setError("Verify a new OTP before entering a new password.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setPasswordError("Password must be at least 8 characters and include letters and numbers.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await resetPassword();
      if (!response.success) throw new Error(response.message || "Unable to reset password.");
      window.localStorage.removeItem(storageKey);
      navigate(successPath, { replace: true });
    } catch (resetError) {
      const message = getErrorMessage(resetError, "Unable to reset password. Please try again.");
      setError(message);
      if (message.toLowerCase().includes("reset token")) {
        setResetToken("");
        setPassword("");
        setConfirmPassword("");
        setOtpDigits(Array(OTP_LENGTH).fill(""));
        setStep("otp");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-sm p-10 flex flex-col items-center">
        <div className="w-full mb-6">
          <Link
            to={loginPath}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
            aria-label="Back to login"
          >
            <ChevronLeft size={20} />
          </Link>
        </div>

        <div className="flex flex-col items-center mb-6">
          <img src="/assets/Logo.png" alt="TrabaHome" className="h-10 w-auto mb-4" />
          <h2 className="text-[#0B3B68] text-2xl font-bold text-center">
            {step === "otp" ? "Verify Reset Code" : "Create New Password"}
          </h2>
          <p className="text-[#0B3B68] text-[10px] text-center mt-2 opacity-80">
            {step === "otp"
              ? "Enter the Gmail code sent to your registered email."
              : "Your code is verified. You can now choose a new password."}
          </p>
        </div>

        <div className="w-full space-y-4">
          {step === "otp" ? (
            <>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">
                  OTP Code
                </label>
                <div className="flex items-center justify-between gap-2">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={`otp-${index}`}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      onPaste={handleOtpPaste}
                      aria-label={`OTP digit ${index + 1}`}
                      className="w-11 h-12 rounded-xl text-center text-sm outline-none transition-all bg-white border border-gray-300 focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68]/30"
                    />
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-gray-500">
                {secondsLeft > 0 ? (
                  <span>{`Resend available in 00:${String(secondsLeft).padStart(2, "0")}`}</span>
                ) : (
                  <>
                    <span>Didn't receive it? </span>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-[#082D50] font-bold hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isResending ? "Resending..." : "Resend Code"}
                    </button>
                  </>
                )}
              </div>

              {email && (
                <p className="text-[10px] text-gray-600 text-center">
                  Code sent to <span className="font-semibold">{email}</span>
                </p>
              )}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpDigits.some((digit) => !digit) || isSubmitting}
                className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordError("");
                    }}
                    className="w-full bg-[#EEEEEE] rounded-xl px-4 py-3 pr-12 text-sm outline-none border border-transparent focus:ring-2 focus:ring-[#0B3B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[9px] text-gray-500 mt-2 ml-1">
                  At least 8 characters, including letters and numbers.
                </p>
                {passwordError && <p className="text-[9px] text-red-500 mt-1">{passwordError}</p>}
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setConfirmError("");
                    }}
                    className="w-full bg-[#EEEEEE] rounded-xl px-4 py-3 pr-12 text-sm outline-none border border-transparent focus:ring-2 focus:ring-[#0B3B68]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmError && <p className="text-[9px] text-red-500 mt-1">{confirmError}</p>}
              </div>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={!password || !confirmPassword || isSubmitting}
                className="w-full bg-[#0B3B68] text-white font-bold py-3 rounded-xl hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}

          {error && <p className="text-red-500 text-[10px] text-center font-bold">{error}</p>}
        </div>
      </div>
    </div>
  );
}
