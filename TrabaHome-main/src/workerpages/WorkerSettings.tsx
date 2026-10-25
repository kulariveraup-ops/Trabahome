// @ts-nocheck
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, Sidebar } from "../components/workersjobs/Index.ts";
import { workerAPI } from "../services/WorkerApi.ts";
import { getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import { clearWorkerSession, getWorkerSession } from "../utils/workerAuth.ts";
import ThemeToggle from "../components/common/ThemeToggle.tsx";

const SETTINGS_STORAGE_PREFIX = "trabahome_worker_settings";

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

const getSettingsKey = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail ? `${SETTINGS_STORAGE_PREFIX}:${normalizedEmail}` : "";
};

const readStoredSettings = (email) => {
  const defaults = { emailNotifications: true, bookingEmailAlerts: true };
  const storageKey = getSettingsKey(email);
  if (!storageKey || typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      emailNotifications:
        typeof parsed?.emailNotifications === "boolean" ? parsed.emailNotifications : defaults.emailNotifications,
      bookingEmailAlerts:
        typeof parsed?.bookingEmailAlerts === "boolean"
          ? parsed.bookingEmailAlerts
          : typeof parsed?.smsAlerts === "boolean"
          ? parsed.smsAlerts
          : defaults.bookingEmailAlerts,
    };
  } catch {
    return defaults;
  }
};

export default function WorkerSettings() {
  const navigate = useNavigate();
  const session = getWorkerSession();
  const workerEmail = String(session?.email || session?.worker?.email || "").trim().toLowerCase();
  const initialSettings = useMemo(() => readStoredSettings(workerEmail), [workerEmail]);
  const [workerProfile, setWorkerProfile] = useState<Record<string, any> | null>(null);
  const worker = workerProfile || {};
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

  const [emailNotifications, setEmailNotifications] = useState(initialSettings.emailNotifications);
  const [bookingEmailAlerts, setBookingEmailAlerts] = useState(initialSettings.bookingEmailAlerts);
  const [toastMessage, setToastMessage] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    let active = true;

    const loadWorkerProfile = async () => {
      try {
        const response = await workerAPI.me({ summary: true, images: false });
        if (!active) return;
        const loadedWorker = response?.worker || response?.data || null;
        if (loadedWorker && typeof loadedWorker === "object") {
          setWorkerProfile(loadedWorker);
        }
        try {
          const avatarResponse = await workerAPI.me({ assets: 'avatar' });
          const avatarWorker = avatarResponse?.worker || {};
          if (active) {
            setWorkerProfile((current) => ({ ...(current || {}), avatar: avatarWorker.avatar || '' }));
          }
        } catch (avatarError) {
          console.error("Failed to load Worker settings avatar:", avatarError);
        }
      } catch (error) {
        console.error("Failed to load Worker settings profile:", error);
      }
    };

    void loadWorkerProfile();
    return () => {
      active = false;
    };
  }, [session?.token]);

  useEffect(() => {
    setEmailNotifications(initialSettings.emailNotifications);
    setBookingEmailAlerts(initialSettings.bookingEmailAlerts);
  }, [initialSettings.emailNotifications, initialSettings.bookingEmailAlerts]);

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

  const showToast = (message, tone = "success") => {
    setToastMessage(message);
    setToastTone(tone);
    window.setTimeout(() => {
      setToastMessage("");
    }, 2000);
  };

  const persistSettings = (nextSettings) => {
    const storageKey = getSettingsKey(workerEmail);
    if (!storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(nextSettings));
  };

  const handleEmailToggle = () => {
    if (isSavingEmail) return;
    const nextValue = !emailNotifications;
    setEmailNotifications(nextValue);
    persistSettings({ emailNotifications: nextValue, bookingEmailAlerts });
    showToast(nextValue ? "Email notifications enabled." : "Email notifications disabled.");
  };

  const handleBookingAlertsToggle = () => {
    const nextValue = !bookingEmailAlerts;
    setBookingEmailAlerts(nextValue);
    persistSettings({ emailNotifications, bookingEmailAlerts: nextValue });
    showToast(nextValue ? "Booking email alerts enabled." : "Booking email alerts disabled.");
  };

  const handleLogout = () => {
    clearWorkerSession();
    navigate("/", { replace: true });
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
          <header className="flex justify-between items-start mb-6 sm:mb-8 px-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1 sm:mb-2">Settings</h1>
              <p className="text-xs sm:text-sm text-gray-500">Manage your notifications and security preferences.</p>
            </div>
            <div
              className={`hidden md:inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                liveStatus.isOnline ? "bg-[#EBF7F3] text-[#00A651]" : "bg-gray-100 text-gray-400"
              }`}
            >
              {liveStatus.isOnline ? "Online" : "Offline"}
            </div>
          </header>

          {toastMessage && (
            <div
              className={`mb-6 inline-flex rounded-full border px-4 py-2 text-xs font-semibold ${
                toastTone === "error"
                  ? "border-red-100 bg-red-50 text-red-600"
                  : "border-[#D7E6F5] bg-[#E8F1F7] text-[#0B3B68]"
              }`}
            >
              {toastMessage}
            </div>
          )}

          <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:p-10">
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 text-sm font-bold text-gray-700">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-[#0B3B68]">Email Notifications</p>
                      <p className="text-xs text-gray-500">
                        Receive booking updates, reminders, announcements, and support replies.
                      </p>
                      <p className="mt-2 text-[11px] text-gray-400">
                        Security emails (OTP, password reset, login alerts) are always sent.
                      </p>
                    </div>
                    <Toggle checked={emailNotifications} onChange={handleEmailToggle} disabled={isSavingEmail} />
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-[#0B3B68]">Booking Email Alerts</p>
                      <p className="text-xs text-gray-500">Get immediate email alerts for new job bookings and homeowner updates.</p>
                    </div>
                    <Toggle checked={bookingEmailAlerts} onChange={handleBookingAlertsToggle} />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-sm font-bold text-gray-700">Appearance &amp; Theme</h2>
                <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-[#0B3B68]">Interface Theme</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Customize your worker portal with Light or Dark mode, or follow your device settings.
                    </p>
                  </div>
                  <ThemeToggle variant="selector" />
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-sm font-bold text-gray-700">Security</h2>
                <div className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-[#0B3B68]">Change Password</p>
                      <p className="text-xs text-gray-500">Update your password regularly for better security.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/worker-change-password")}
                      className="rounded-full border border-[#0B3B68]/40 px-5 py-2.5 text-sm font-semibold text-[#0B3B68] transition-colors hover:bg-[#0B3B68] hover:text-white"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
