// @ts-nocheck
import React, { useMemo, useState } from "react";
import Navbar from "../components/requestpages/Navbar";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { getHomeownerSession, saveHomeownerSession } from "../utils/homeownerAuth.ts";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import ThemeToggle from "../components/common/ThemeToggle.tsx";

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onChange}
    className={`w-12 h-6 rounded-full p-1 transition-colors ${
      checked ? "bg-[#0B3B68]" : "bg-gray-200"
    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    aria-pressed={checked}
    aria-disabled={disabled}
  >
    <span
      className={`block w-4 h-4 bg-white rounded-full transition-transform ${
        checked ? "translate-x-6" : "translate-x-0"
      }`}
    />
  </button>
);

export default function HomeownerSettings() {
  const navigate = useNavigate();
  const session = getHomeownerSession();
  const homeowner = session?.homeowner || {};
  const initialEmailNotifications = useMemo(() => {
    if (typeof homeowner.emailNotifications === "boolean") return homeowner.emailNotifications;
    if (typeof homeowner.email_notifications === "boolean") return homeowner.email_notifications;
    return true;
  }, [homeowner]);

  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications);
  const [bookingEmailAlerts, setBookingEmailAlerts] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  const showToast = (message, tone = "success") => {
    setToastMessage(message);
    setToastTone(tone);
    window.setTimeout(() => {
      setToastMessage("");
    }, 2000);
  };

  const handleEmailToggle = async () => {
    if (!session?.token || isSavingEmail) return;
    const nextValue = !emailNotifications;
    setEmailNotifications(nextValue);
    showToast(nextValue ? "Email notifications enabled." : "Email notifications disabled.");
    setIsSavingEmail(true);

    try {
      const response = await homeownerAPI.updateMe({
        emailNotifications: nextValue,
        email_notifications: nextValue,
      });

      const updated = response?.homeowner || {};
      saveHomeownerSession({
        token: session.token,
        email: session.email || updated.email || "",
        homeowner: {
          ...homeowner,
          ...updated,
          emailNotifications: nextValue,
          email_notifications: nextValue,
        },
      });
    } catch (error) {
      setEmailNotifications(!nextValue);
      showToast("Unable to update email notifications.", "error");
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors mb-6 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0B3B68]">Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your notifications and security preferences.
            </p>
          </div>
          {toastMessage && (
            <div
              className={`mb-6 px-4 py-2 rounded-full text-xs font-semibold inline-flex ${
                toastTone === "error"
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-[#E8F1F7] text-[#0B3B68] border border-[#D7E6F5]"
              }`}
            >
              {toastMessage}
            </div>
          )}

          <div className="space-y-8">
            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0B3B68]">Email Notifications</p>
                    <p className="text-xs text-gray-500">
                      Receive booking updates, reminders, announcements, and support replies.
                    </p>
                    <p className="text-[11px] text-gray-400 mt-2">
                      Security emails (OTP, password reset, login alerts) are always sent.
                    </p>
                  </div>
                  <Toggle
                    checked={emailNotifications}
                    onChange={handleEmailToggle}
                    disabled={isSavingEmail}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0B3B68]">Booking Email Alerts</p>
                    <p className="text-xs text-gray-500">Get important alerts via email when workers accept or update requests.</p>
                  </div>
                  <Toggle checked={bookingEmailAlerts} onChange={() => setBookingEmailAlerts((prev) => !prev)} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-4">Appearance &amp; Theme</h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-100 rounded-2xl p-4">
                <div>
                  <p className="text-sm font-semibold text-[#0B3B68]">Interface Theme</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customize your browsing experience with Light or Dark mode, or match your device system settings.
                  </p>
                </div>
                <ThemeToggle variant="selector" />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-700 mb-4">Security</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 border border-gray-100 rounded-2xl p-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0B3B68]">Change Password</p>
                    <p className="text-xs text-gray-500">Update your password regularly for better security.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/homeowner-change-password")}
                    className="px-4 py-2 rounded-full text-sm font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
