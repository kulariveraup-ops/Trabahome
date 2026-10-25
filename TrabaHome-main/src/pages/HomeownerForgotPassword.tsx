import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { homeownerAPI } from "../services/HomeownerApi.ts";

export default function HomeownerForgotPassword() {
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
      await homeownerAPI.forgotPassword(normalizedEmail);
      localStorage.setItem("homeownerResetEmail", normalizedEmail);
      setSuccessMessage("A reset code has been sent to your email.");
      navigate(`/homeowner-reset-password?email=${encodeURIComponent(normalizedEmail)}`);
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
    <div className="min-h-screen bg-[#F9F5F0] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-sm px-10 pb-10 pt-8 flex flex-col items-center">
        <div className="w-full mb-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
            aria-label="Back to Login"
          >
            <ChevronLeft size={20} />
          </Link>
        </div>

        <div className="flex flex-col items-center mb-6">
          <img src="/assets/Logo.png" alt="TrabaHome" className="h-10 w-auto mb-4" />
          <h2 className="text-[#0B3B68] text-2xl font-bold text-center">Forgot Password</h2>
          <p className="text-[#0B3B68] text-[10px] text-center mt-2 opacity-80">
            Enter your registered email address and we’ll send you a reset code to verify your account.
          </p>
        </div>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-gray-700 mb-1 ml-1">Email</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-[#EEEEEE] border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0B3B68] outline-none placeholder:text-gray-400"
            />
            <p className="text-[9px] text-gray-500 mt-2 ml-1">
              Make sure this is the email linked to your account.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {successMessage && <p className="text-green-600 text-sm">{successMessage}</p>}

          <button
            type="button"
            disabled={!isEmailValid || isSending}
            onClick={handleSendResetCode}
            className="w-full text-center block bg-[#0B3B68] text-white font-bold py-3 rounded-xl mt-2 hover:bg-[#082d50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#0B3B68]"
          >
            {isSending ? "Sending..." : "Send Reset Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
