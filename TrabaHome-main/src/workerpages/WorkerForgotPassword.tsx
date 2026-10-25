import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { workerAPI } from "../services/WorkerApi.ts";

export default function WorkerForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const normalizedEmail = email.trim().toLowerCase();
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail);

  const handleSendResetCode = async () => {
    if (!isEmailValid) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setIsSending(true);

    try {
      await workerAPI.forgotPassword(normalizedEmail);
      localStorage.setItem("workerResetEmail", normalizedEmail);
      setSuccessMessage("A reset code has been sent to your email.");
      navigate(`/worker-reset-password?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (sendError) {
      const message =
        sendError && typeof sendError === "object" && "response" in sendError
          ? String((sendError as { response?: { data?: { message?: string } } }).response?.data?.message || "")
          : sendError && typeof sendError === "object" && "message" in sendError
            ? String((sendError as { message?: string }).message)
          : "Unable to send reset code. Please try again.";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD700]/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <div className="mb-6">
            <Link
              to="/worker-login"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
              aria-label="Back to Login"
            >
              <ChevronLeft size={20} />
            </Link>
          </div>

          <div className="text-center mb-6">
            <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-[#0B3B68]">Forgot Password</h1>
            <p className="text-sm text-gray-500 mt-2">
              Enter your registered email address and we'll send you a reset code.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="worker-forgot-email" className="block text-gray-700 font-semibold mb-2">
                Email Address
              </label>
              <input
                id="worker-forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68]/30 focus:shadow-[0_0_0_6px_rgba(11,59,104,0.12)] transition"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

            <button
              type="button"
              onClick={handleSendResetCode}
              disabled={!isEmailValid || isSending}
              className="w-full text-center block bg-[#0B3B68] text-white font-bold py-3 rounded-lg hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : "Send Reset Code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
