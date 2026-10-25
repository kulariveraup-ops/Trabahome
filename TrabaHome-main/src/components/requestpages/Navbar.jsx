import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { homeownerAPI } from "../../services/HomeownerApi.ts";
import { workerAPI } from "../../services/WorkerApi.ts";
import { clearHomeownerSession, getHomeownerSession, saveHomeownerSession } from "../../utils/homeownerAuth.ts";
import { clearWorkerSession, getWorkerSession } from "../../utils/workerAuth.ts";
import HomeownerNotificationBell from "../homeownerNotifications/HomeownerNotificationBell.tsx";
import WorkerNotificationBell from "../workerNotifications/WorkerNotificationBell.tsx";
import MessagesSummaryButton from "../chat/MessagesSummaryButton.tsx";
import WelcomeOnboardingModal from "../onboarding/WelcomeOnboardingModal.tsx";

const HEADER_HEIGHT = 72;

export default function Navbar({
  logoRoute = "/home",
  actions = null,
  showNotifications = true,
  showLogout = true,
  scrollContainerRef = null,
  homeownerProfile = null,
  } = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const safeNavigate = (targetPath) => {
    setIsProfileOpen(false);
    if (location.pathname === targetPath) return;
    const isSubPage = (path) =>
      path.startsWith("/homeowner-") ||
      path.startsWith("/worker-") ||
      path === "/home-worker" ||
      path === "/home";
    const shouldReplace = isSubPage(location.pathname) && isSubPage(targetPath);
    navigate(targetPath, { replace: shouldReplace });
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);
  const profileRef = useRef(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [profileName, setProfileName] = useState("Profile");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [profileEmail, setProfileEmail] = useState("user@email.com");
  const [loadedHomeownerProfile, setLoadedHomeownerProfile] = useState(null);

  const homeownerSession = getHomeownerSession();
  const workerSession = getWorkerSession();
  const hasWorkerSession = Boolean(workerSession?.token);
  const hasHomeownerSession = Boolean(homeownerSession?.token);
  const pathname = String(location.pathname || "").toLowerCase();
  const isWorkerRoute = pathname.startsWith("/worker") || pathname === "/home-worker";
  const isHomeownerRoute =
    pathname === "/home" ||
    pathname.startsWith("/homeowner") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/list") ||
    pathname.startsWith("/map") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/my-requests");
  const isWorkerMode = isWorkerRoute ? true : isHomeownerRoute ? false : hasWorkerSession && !hasHomeownerSession;
  const activeSession = isWorkerMode ? workerSession : homeownerSession;
  const sessionToken = activeSession?.token || "";
  const sessionEmail = activeSession?.email || "";
  const storedHomeownerProfile = homeownerSession?.homeowner || null;
  const hasStoredHomeownerProfile = Boolean(
    storedHomeownerProfile && Object.keys(storedHomeownerProfile).length > 0
  );
  const hasProvidedHomeownerProfile = Boolean(
    homeownerProfile && typeof homeownerProfile === "object" && Object.keys(homeownerProfile).length > 0
  );
  const profileSource = isWorkerMode
    ? activeSession?.worker || {}
    : hasProvidedHomeownerProfile
      ? homeownerProfile
      : hasStoredHomeownerProfile
        ? storedHomeownerProfile
        : loadedHomeownerProfile || {};
  const profileFirstName = String(profileSource.firstName || profileSource.firstname || profileSource.givenName || "").trim();
  const profileLastName = String(profileSource.lastName || profileSource.lastname || profileSource.surname || "").trim();
  const profileAvatarSource = String(
    profileSource.avatar ||
      profileSource.profileImage ||
      profileSource.photoUrl ||
      profileSource.image ||
      profileSource.photo ||
      ""
  ).trim();
  const profileAccountEmail = String(profileSource.email || sessionEmail || "").trim();

  useEffect(() => {
    const scrollTarget = scrollContainerRef?.current || window;
    const getScrollTop = () => (scrollTarget === window ? window.scrollY : scrollTarget.scrollTop);
    const handleScroll = () => {
      setIsScrolled(getScrollTop() > 4);
    };

    handleScroll();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!sessionToken) return;
    const resolvedName = [profileFirstName, profileLastName].filter(Boolean).join(" ").trim() || sessionEmail || "Profile";

    setProfileName(resolvedName);
    setProfileEmail(profileAccountEmail || "user@email.com");

    if (profileAvatarSource) {
      setProfileAvatar(profileAvatarSource);
    } else {
      setProfileAvatar("");
    }
  }, [sessionToken, profileAccountEmail, profileFirstName, profileLastName, profileAvatarSource]);

  useEffect(() => {
    if (isWorkerMode || !sessionToken || hasProvidedHomeownerProfile || hasStoredHomeownerProfile) return;

    let isActive = true;
    const loadHomeownerProfile = async () => {
      try {
        const response = await homeownerAPI.me();
        const homeowner = response?.homeowner;
        if (!isActive || !homeowner || typeof homeowner !== "object") return;

        setLoadedHomeownerProfile(homeowner);
        saveHomeownerSession({
          token: sessionToken,
          email: String(homeowner.email || sessionEmail || "").trim().toLowerCase(),
          homeowner,
        });
      } catch {
        // Keep the existing default avatar when profile hydration is unavailable.
      }
    };

    const loadTimer = window.setTimeout(() => {
      void loadHomeownerProfile();
    }, 500);
    return () => {
      isActive = false;
      window.clearTimeout(loadTimer);
    };
  }, [hasProvidedHomeownerProfile, hasStoredHomeownerProfile, isWorkerMode, sessionEmail, sessionToken]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const node = headerRef.current;
    const update = () => {
      setHeaderHeight(node.getBoundingClientRect().height);
    };

    update();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      if (isWorkerMode) {
        await workerAPI.logout().catch(() => {});
      } else {
        await homeownerAPI.logout().catch(() => {});
      }
    } finally {
      if (isWorkerMode) {
        clearWorkerSession();
      } else {
        clearHomeownerSession();
      }
      navigate("/", { replace: true });
      setIsLoggingOut(false);
      setIsProfileOpen(false);
    }
  };

  return (
    <>
      <div aria-hidden="true" style={{ height: headerHeight }} />
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 w-full h-[72px] bg-[#F9F5F0] transition-all duration-300 border-b border-[#E7E2DA] ${
          isScrolled ? "shadow-[0_6px_18px_rgba(11,59,104,0.08)]" : ""
        }`}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 md:px-10">
          <img
            src="/assets/Logo.png"
            alt="TrabaHome"
            className="h-7 sm:h-8 w-auto cursor-pointer md:h-9"
            onClick={() => safeNavigate(logoRoute)}
          />

          <div className="flex items-center gap-1.5 sm:gap-3">
            {actions ? (
              actions
            ) : sessionToken ? (
              <>
                {showNotifications && (
                  isWorkerMode ? (
                    <WorkerNotificationBell />
                  ) : (
                    <HomeownerNotificationBell onOpen={() => setIsProfileOpen(false)} />
                  )
                )}

                {/* Message summary button between Notification and Profile icons */}
                <MessagesSummaryButton
                  role={isWorkerMode ? "worker" : "homeowner"}
                  onOpen={() => setIsProfileOpen(false)}
                />

                {showLogout && (
                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen((prev) => !prev);
                      }}
                      aria-haspopup="menu"
                      aria-expanded={isProfileOpen}
                      className="rounded-full p-2 transition-colors hover:bg-black/5"
                    >
                      {profileAvatar ? (
                        <img
                          src={profileAvatar}
                          alt={profileName}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-700" />
                      )}
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F3F4F6]">
                              {profileAvatar ? (
                                <img
                                  src={profileAvatar}
                                  alt={profileName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-6 w-6 text-gray-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#0B3B68]">
                                {profileName}
                              </p>
                              <p className="truncate text-xs text-gray-400">{profileEmail}</p>
                            </div>
                          </div>
                        </div>

                        <div className="my-2 border-t border-gray-100" />

                        <button
                          type="button"
                          onClick={() => safeNavigate(isWorkerMode ? "/worker-own-profile" : "/homeowner-profile")}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                        >
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => safeNavigate(isWorkerMode ? "/worker-jobs" : "/homeowner-bookings")}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                        >
                          My Bookings
                        </button>
                        {isWorkerMode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => safeNavigate("/home-worker")}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                            >
                              Dashboard
                            </button>
                            <button
                              type="button"
                              onClick={() => safeNavigate("/worker-settings")}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                            >
                              Worker Settings
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => safeNavigate("/homeowner-saved-workers")}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                            >
                              Saved Workers
                            </button>
                            <button
                              type="button"
                              onClick={() => safeNavigate("/homeowner-settings")}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                            >
                              Settings
                            </button>
                            <button
                              type="button"
                              onClick={() => safeNavigate("/homeowner-help")}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8]"
                            >
                              Help &amp; Support
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            setIsGuideOpen(true);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[#F5F6F8] flex items-center justify-between"
                        >
                          <span>How TrabaHome Works</span>
                          <span className="text-[10px] bg-blue-50 text-[#004A8C] font-bold px-2 py-0.5 rounded-full border border-blue-200">Guide</span>
                        </button>

                        <div className="my-2 border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full px-4 py-2 text-left text-sm font-semibold text-[#0B3B68] transition-colors hover:bg-[#F5F6F8] disabled:opacity-50"
                        >
                          {isLoggingOut ? "Signing out..." : "Log Out"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => safeNavigate("/login")}
                  className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0B3B68] border-2 border-[#0B3B68] rounded-xl shadow-md transition-all duration-200 hover:bg-[#154875] active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Hire Workers
                </button>
                <button
                  type="button"
                  onClick={() => safeNavigate("/worker-login")}
                  className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold text-[#0B3B68] bg-[#F9F5F0] border-2 border-[#1B75D0] rounded-xl shadow-md transition-all duration-200 hover:bg-[#1B75D0] hover:text-white active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  Find Jobs
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Guide Walkthrough Modal */}
      <WelcomeOnboardingModal
        isOpen={isGuideOpen}
        role={isWorkerMode ? "worker" : "homeowner"}
        userName={profileFirstName || profileName}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    </>
  );
}
