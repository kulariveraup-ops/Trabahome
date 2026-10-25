import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminSession } from "../../utils/adminAuth.ts";
import { clearHomeownerSession, getHomeownerSession } from "../../utils/homeownerAuth.ts";
import { clearWorkerSession, getWorkerSession } from "../../utils/workerAuth.ts";
import {
  IDLE_LOGOUT_MS,
  getLastActivityTime,
  updateLastActivity,
} from "../../utils/idleSession.ts";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

const isBrowser = (): boolean => typeof window !== "undefined";

const getActiveSessionType = (pathname = ""): "homeowner" | "worker" | "admin" | null => {
  const normalizedPath = String(pathname || "").toLowerCase();
  if (normalizedPath.startsWith("/admin") && getAdminSession()?.token) return "admin";
  if (
    (normalizedPath.startsWith("/worker") || normalizedPath === "/home-worker") &&
    getWorkerSession()?.token
  ) return "worker";
  if (getHomeownerSession()?.token) return "homeowner";
  if (getWorkerSession()?.token) return "worker";
  if (getAdminSession()?.token) return "admin";
  return null;
};

export default function IdleLogoutHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<number | null>(null);
  const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);
  const [timedOutRole, setTimedOutRole] = useState<"homeowner" | "worker" | "admin" | null>(null);

  useEffect(() => {
    if (!isBrowser()) return undefined;

    const performIdleLogout = (role: "homeowner" | "worker" | "admin") => {
      setTimedOutRole(role);
      if (role === "worker") clearWorkerSession();
      else if (role === "homeowner") clearHomeownerSession();
      else if (role === "admin") clearAdminSession();
      setIsIdleModalOpen(true);
    };

    const checkInactivity = () => {
      const activeSessionType = getActiveSessionType(location.pathname);
      if (!activeSessionType) return false;

      const elapsed = Date.now() - getLastActivityTime();
      if (elapsed >= IDLE_LOGOUT_MS) {
        performIdleLogout(activeSessionType);
        return true;
      }
      return false;
    };

    const scheduleTimer = () => {
      if (isIdleModalOpen) return;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      const activeSessionType = getActiveSessionType(location.pathname);
      if (!activeSessionType) {
        timerRef.current = null;
        return;
      }

      const elapsed = Date.now() - getLastActivityTime();
      const remaining = Math.max(0, IDLE_LOGOUT_MS - elapsed);

      if (remaining === 0) {
        performIdleLogout(activeSessionType);
      } else {
        timerRef.current = window.setTimeout(() => {
          performIdleLogout(activeSessionType);
        }, remaining);
      }
    };

    const handleUserActivity = () => {
      if (isIdleModalOpen) return;

      const activeSessionType = getActiveSessionType(location.pathname);
      if (!activeSessionType) return;

      const hasTimedOut = checkInactivity();
      if (hasTimedOut) return;

      updateLastActivity();
      scheduleTimer();
    };

    const handleVisibilityChange = () => {
      if (isIdleModalOpen) return;
      if (document.visibilityState === "visible") {
        const hasTimedOut = checkInactivity();
        if (!hasTimedOut) {
          scheduleTimer();
        }
      }
    };

    const handleWindowFocus = () => {
      if (isIdleModalOpen) return;
      const hasTimedOut = checkInactivity();
      if (!hasTimedOut) {
        scheduleTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Initial check on route change
    const isAlreadyExpired = checkInactivity();
    if (!isAlreadyExpired) {
      scheduleTimer();
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isIdleModalOpen, location.pathname]);

  const handleLoginRedirect = () => {
    setIsIdleModalOpen(false);
    updateLastActivity();

    if (timedOutRole === "worker") {
      navigate("/worker-login", { replace: true });
    } else if (timedOutRole === "admin") {
      navigate("/admin-login", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  if (!isIdleModalOpen) return null;

  const roleTitle =
    timedOutRole === "worker"
      ? "Skilled Worker"
      : timedOutRole === "admin"
      ? "Administrator"
      : "Homeowner";

  const targetLoginPath =
    timedOutRole === "worker"
      ? "Worker Login"
      : timedOutRole === "admin"
      ? "Admin Login"
      : "Homeowner Login";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-xs px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-7 text-center animate-in zoom-in-95 duration-200">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#0B3B68]">Session Inactive for 1 Hour</h3>
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          You have been away or inactive for over 1 hour. For security, your{" "}
          <strong className="text-gray-900">{roleTitle}</strong> session has expired. You are required to log in again before accessing the dashboard or service modals.
        </p>
        <button
          type="button"
          onClick={handleLoginRedirect}
          className="mt-6 w-full rounded-xl bg-[#0B3B68] px-4 py-3 text-xs font-bold text-white hover:bg-[#0a3157] transition-all shadow-md active:scale-95 cursor-pointer"
        >
          Go to {targetLoginPath}
        </button>
      </div>
    </div>
  );
}
