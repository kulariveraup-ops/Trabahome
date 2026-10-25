// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/requestpages/Navbar";
import Footer from "../components/heropages/Footer";
import FeaturedServicesSection from "../components/heropages/FeaturedServicesSection.tsx";
import WorkerSearchBar from "../components/search/WorkerSearchBar.tsx";
import { 
  MapPinIcon, SearchIcon, HammerIcon, BrushIcon, LocateIcon,
  WrenchIcon, SproutIcon, TrowelIcon, ZapIcon, DropletIcon,
  ShieldCheckIcon, StarIcon, ArrowRightIcon, PhoneIcon
} from "../Icons";
import { 
  Mail as MailIcon, 
  Calendar as CalendarIcon, 
  Bookmark as BookmarkIcon, 
  ArrowRight as ArrowRightLucide, 
  Clock as ClockIcon, 
  Star as StarLucide 
} from "lucide-react";
import { getHomeownerSession } from "../utils/homeownerAuth.ts";
import { professionOptions } from "../constants/SignUpData.ts";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import WelcomeOnboardingModal from "../components/onboarding/WelcomeOnboardingModal.tsx";

export default function HomeownerHome({
  navActions = null,
  logoRoute = "/home",
  showNotifications = true,
  showLogout = true,
  heroTitleClassName = "leading-[1.1]",
  searchBarVariant = "dashboard",
  searchScrollOnNavigate = true,
  showWhySection = true,
  showHowItWorks = true,
  showFooter = true,
  useContentScroll = false,
} = {}) {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [detectedCoords, setDetectedCoords] = useState(null);

  const homeownerSession = getHomeownerSession();
  const BOOKINGS_CACHE_KEY = "trabahome_homeowner_bookings";
  const SAVED_WORKERS_CACHE_KEY = "trabahome_homeowner_saved_workers";
  const [dashboardBookings, setDashboardBookings] = useState(() => {
    return readJsonCache(BOOKINGS_CACHE_KEY, 5 * 60 * 1000) || [];
  });
  const [dashboardSavedWorkers, setDashboardSavedWorkers] = useState(() => {
    return readJsonCache(SAVED_WORKERS_CACHE_KEY, 5 * 60 * 1000) || [];
  });
  const savedWorkers = dashboardSavedWorkers;
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const email = String(homeownerSession?.email || "").trim().toLowerCase();
      if (email && localStorage.getItem("trabahome_guide_seen_" + email) === "true") {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        return false;
      }
      if (Boolean((homeownerSession?.homeowner as any)?.hasSeenGuide)) {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        return false;
      }
      const shouldShow = sessionStorage.getItem("trabahome_show_first_time_guide") === "true";
      if (shouldShow) {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        localStorage.setItem("trabahome_onboarding_completed_homeowner", "true");
        if (email) {
          localStorage.setItem("trabahome_guide_seen_" + email, "true");
          localStorage.removeItem("trabahome_first_login_pending_" + email);
        }
        void homeownerAPI.markGuideSeen();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!homeownerSession?.token) return;
    let mounted = true;
    const fetchDashboardData = async () => {
      try {
        const [bookingsRes, savedRes] = await Promise.allSettled([
          homeownerAPI.listServiceRequests(),
          homeownerAPI.listSavedWorkers(),
        ]);
        if (!mounted) return;
        if (bookingsRes.status === "fulfilled") {
          const items = Array.isArray(bookingsRes.value?.items) ? bookingsRes.value.items : [];
          setDashboardBookings(items);
          writeJsonCache(BOOKINGS_CACHE_KEY, items);
        }
        if (savedRes.status === "fulfilled") {
          const items = Array.isArray(savedRes.value?.items) ? savedRes.value.items : [];
          setDashboardSavedWorkers(items);
          writeJsonCache(SAVED_WORKERS_CACHE_KEY, items);
        }
      } catch (err) {
        console.error("Failed to load dashboard data on HomeownerHome", err);
      }
    };
    fetchDashboardData();
    return () => {
      mounted = false;
    };
  }, [homeownerSession?.token]);

  const activeBookings = useMemo(() => {
    return dashboardBookings.filter((b) => {
      const status = String(b.status || "").toLowerCase();
      return status === "pending" || status === "ongoing" || status === "in progress" || status === "accepted";
    });
  }, [dashboardBookings]);

  const pendingReviewBooking = useMemo(() => {
    return dashboardBookings.find((b) => {
      const status = String(b.status || "").toLowerCase();
      const isCompleted = status === "completed";
      const isReviewed = Boolean(
        b.reviewedAt ||
        String(b.reviewText || "").trim() ||
        (Array.isArray(b.reviewTags) && b.reviewTags.length > 0)
      );
      return isCompleted && !isReviewed;
    });
  }, [dashboardBookings]);

  const latestBooking = activeBookings[0] || dashboardBookings[0] || null;

  const availableServices = professionOptions;
  const availableLocations = ["Dagupan City", "Mangaldan", "San Fabian", "Lingayen", "Calasiao", "Binmaley"];

  const handleSearch = () => {
    const params = new URLSearchParams();
    const trimmedService = service.trim();
    const trimmedLocation = location.trim();

    if (trimmedService) params.set("service", trimmedService);
    if (trimmedLocation) {
      const normalizedLocation = trimmedLocation.toLowerCase();
      const isNearMe = ["near me", "near-me", "nearme"].includes(normalizedLocation);
      params.set("location", isNearMe ? "near-me" : trimmedLocation);
      if (isNearMe && detectedCoords) {
        params.set("lat", String(detectedCoords.lat));
        params.set("lng", String(detectedCoords.lng));
      }
    }

    const query = params.toString();
    const targetUrl = query ? `/search?${query}` : "/search";
    const navigationOptions = searchScrollOnNavigate
      ? { state: { fromDashboardSearch: true } }
      : undefined;
    navigate(targetUrl, navigationOptions);
  };

  const handleDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location isn't supported on this browser.");
      return;
    }
    if (isLocating) return;

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setDetectedCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocation("Near me");
      },
      () => {
        setIsLocating(false);
        setLocationError("Couldn't access your location. Please type it in instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const useDashboardSearchBar = searchBarVariant === "dashboard";
  const showMarketingDivider = showWhySection || showHowItWorks;
  const wrapperClassName = useContentScroll
    ? "w-full h-screen overflow-y-auto no-scrollbar bg-[#FDFBF7] text-[#0B3B68] overflow-x-hidden font-sans relative"
    : "w-full min-h-screen bg-[#FDFBF7] text-[#0B3B68] overflow-x-hidden font-sans relative";

  useEffect(() => {
    if (!useContentScroll || typeof document === "undefined") return;
    const { body, documentElement } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = documentElement.style.overflow;
    documentElement.classList.add("home-scrollbars-hidden");
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      documentElement.classList.remove("home-scrollbars-hidden");
      body.style.overflow = prevBodyOverflow;
      documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [useContentScroll]);

  return (
    <div
      ref={scrollContainerRef}
      id={useContentScroll ? "home-scroll" : undefined}
      className={wrapperClassName}
    >
      
      {/* --- REAL PNG BACKGROUND LAYER --- */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <img 
          src="/assets/Group 4.png"
          className="hidden sm:block absolute top-24 left-[-50px] h-[500px] w-auto object-contain opacity-80" 
          alt="" 
        />
        <img 
          src="/assets/Group 20.png" 
          className="hidden sm:block absolute top-16 right-[-50px] h-[550px] w-auto object-contain opacity-80" 
          alt="" 
        />
        
        {/* --- GROUP 18: MOVED TO MIDDLE OF PAGE --- */}
        <img 
          src="/assets/Group 18.png" 
          className="hidden sm:block absolute top-1/2 left-[-30px] transform -translate-y-1/2 h-[350px] w-auto object-contain z-0" 
          alt="" 
        />

        {/* --- ASSETS IN THE CARDS SECTION --- */}
        <div className="hidden sm:block absolute top-[1200px] w-full h-[600px]">
           <img 
             src="/assets/Ellipse 7.png" 
             className="absolute top-0 right-[-30px] h-[400px] w-auto object-contain" 
             alt="" 
           />
           <img 
             src="/assets/shopee 1.png" 
             className="absolute bottom-10 right-5 w-[180px] opacity-30" 
             alt="" 
           />
        </div>
      </div>

      <Navbar
        actions={navActions}
        logoRoute={logoRoute}
        showNotifications={showNotifications}
        showLogout={showLogout}
        scrollContainerRef={useContentScroll ? scrollContainerRef : null}
      />

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-16 pb-6 sm:pb-10 text-center flex flex-col items-center">
        <h2 className={`text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#0B3B68] tracking-tight leading-tight sm:leading-snug ${heroTitleClassName}`}>
          Trusted workers, right at <br className="hidden sm:inline" /> your doorstep.
        </h2>
        <p className="mt-3 sm:mt-6 text-sm sm:text-base text-gray-500 font-medium max-w-xl px-2">
          Find trusted local plumbers, electricians, carpenters, cleaners, and verified specialists for all your home and personal care needs.
        </p>

        {useDashboardSearchBar ? (
          <WorkerSearchBar
            className="mt-6 w-full max-w-5xl mb-0"
            service={service}
            location={location}
            serviceOptions={availableServices}
            locationOptions={availableLocations}
            onServiceChange={setService}
            onLocationChange={(nextValue) => {
              setLocation(nextValue);
              if (detectedCoords && nextValue.trim().toLowerCase() !== "near me") {
                setDetectedCoords(null);
              }
            }}
            onDetectLocation={handleDetectLocation}
            isLocating={isLocating}
            onSearch={handleSearch}
            size="compact"
          />
        ) : (
          <div className="mt-6 w-full max-w-3xl bg-white rounded-2xl md:rounded-full p-2 md:p-1 flex flex-col md:flex-row items-center shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-gray-100 transition-transform duration-500 hover:scale-[1.01]">
            <div className="flex-1 flex items-center px-4 sm:px-6 py-2 w-full md:w-auto relative">
              <input
                className={`w-full bg-transparent outline-none font-semibold cursor-text py-1 placeholder:text-gray-400 ${
                  service ? "text-[#0B3B68]" : "text-gray-600"
                }`}
                placeholder="What service do you need?"
                value={service}
                onChange={(e) => setService(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex-1 flex items-center px-4 sm:px-6 py-2 w-full md:w-auto relative border-t md:border-t-0 md:border-l border-gray-200/70">
              <MapPinIcon className="w-5 h-5 text-blue-500 mr-2" />
              <input
                className={`w-full bg-transparent outline-none font-semibold cursor-text py-1 placeholder:text-gray-400 ${
                  location ? "text-[#0B3B68]" : "text-gray-600"
                }`}
                placeholder="Enter your location"
                value={location}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setLocation(nextValue);
                  if (detectedCoords && nextValue.trim().toLowerCase() !== "near me") {
                    setDetectedCoords(null);
                  }
                }}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="ml-3 p-1.5 rounded-full text-[#0B3B68] hover:text-[#082d50] hover:bg-black/5 transition-colors disabled:opacity-50"
                aria-label="Detect location"
                title="Detect location"
              >
                <LocateIcon className={`w-4 h-4 ${isLocating ? "animate-pulse" : ""}`} />
              </button>
            </div>

            <button onClick={handleSearch} className="bg-[#0B3B68] text-white px-8 sm:px-10 py-3 sm:py-3.5 rounded-xl md:rounded-full hover:bg-[#082d50] transition-all w-full md:w-auto mt-2 md:mt-0 font-bold shadow-lg active:scale-95 cursor-pointer">
              Search
            </button>
          </div>
        )}
        {locationError && (
          <p className="mt-2 text-xs text-red-500 font-medium">{locationError}</p>
        )}
      </section>

      {/* --- FEATURED & OFFERED SERVICES --- */}
      <FeaturedServicesSection initialCategory="Carpenter" />

      {/* --- DASHBOARD SUMMARY: MY BOOKINGS & SAVED WORKERS (TRANSFERRED TO BOTTOM OF TRANSITIONING PHOTO) --- */}
      {homeownerSession && (
        <section className="px-4 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto relative z-10 w-full text-left">
          {pendingReviewBooking && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200/90 dark:border-amber-700/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <StarLucide className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full mb-1 border border-amber-300 dark:border-amber-700">
                    ★ Review Required
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Your booking with {pendingReviewBooking.workerName || "worker"} is complete!
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-amber-100/80">
                    Please leave a review and rating to complete your feedback for this job.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/homeowner-bookings?tab=Completed&reviewBookingId=${encodeURIComponent(
                      pendingReviewBooking.id || pendingReviewBooking.requestNumber
                    )}`
                  )
                }
                className="px-5 py-2.5 bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
              >
                Leave Review Now →
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* My Bookings Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.07)] transition-all flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0B3B68]">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0B3B68]">My Bookings</h3>
                      <p className="text-xs text-gray-400">Track and manage your requested services</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                    {activeBookings.length > 0 ? `${activeBookings.length} Active` : `${dashboardBookings.length} Total`}
                  </span>
                </div>

                {latestBooking ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const targetId = latestBooking.id || latestBooking.requestNumber;
                      if (targetId) {
                        navigate("/homeowner-bookings", { state: { openRequestId: targetId } });
                      } else {
                        navigate("/homeowner-bookings");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const targetId = latestBooking.id || latestBooking.requestNumber;
                        if (targetId) {
                          navigate("/homeowner-bookings", { state: { openRequestId: targetId } });
                        } else {
                          navigate("/homeowner-bookings");
                        }
                      }
                    }}
                    className="bg-gray-50/80 hover:bg-blue-50/60 transition-all cursor-pointer rounded-2xl p-4 border border-gray-100 mb-4 group ring-1 ring-transparent hover:ring-blue-200"
                    title="Click to open booking details"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-[#0B3B68] transition-colors">
                          {latestBooking.workerName || latestBooking.worker?.name || "Assigned Worker"}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">
                          {latestBooking.serviceType || latestBooking.service || "Service Request"}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          String(latestBooking.status).toLowerCase() === "pending"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : String(latestBooking.status).toLowerCase() === "ongoing" ||
                              String(latestBooking.status).toLowerCase() === "in progress" ||
                              String(latestBooking.status).toLowerCase() === "accepted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {latestBooking.status || "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span>
                          {latestBooking.scheduledDate ||
                            latestBooking.preferredDate ||
                            latestBooking.time ||
                            "Scheduled"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[#1D4ED8] group-hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate("/homeowner-bookings")}
                    className="bg-gray-50/80 hover:bg-gray-100/80 transition-colors cursor-pointer rounded-2xl p-4 border border-gray-100 mb-4 text-center"
                  >
                    <p className="text-xs font-semibold text-gray-600">No active bookings right now</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Need a repair or maintenance? Book a local skilled worker anytime.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate("/homeowner-bookings")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold bg-[#0B3B68] text-white hover:bg-[#082d50] transition-all shadow-sm group cursor-pointer"
              >
                <span>View All Bookings</span>
                <ArrowRightLucide className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Saved Workers Card */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.07)] transition-all flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <BookmarkIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#0B3B68]">Saved Workers</h3>
                      <p className="text-xs text-gray-400">Your bookmarked trusted professionals</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {savedWorkers.length} Saved
                  </span>
                </div>

                {savedWorkers.length > 0 ? (
                  <div className="space-y-2.5 mb-4">
                    {savedWorkers.slice(0, 2).map((worker, idx) => {
                      const wName = worker.name || worker.workerName || worker.fullName || "Worker";
                      const wService = worker.service || worker.serviceType || worker.profession || "Skilled Worker";
                      const wPhoto = worker.photo || worker.avatar || worker.image || worker.profileImage;
                      const wRating = worker.rating ? Number(worker.rating).toFixed(1) : null;
                      return (
                        <div
                          key={worker.id || worker._id || idx}
                          onClick={() => {
                            const id = worker.id || worker._id || worker.workerId;
                            if (id) navigate(`/profile/${id}`);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80 transition cursor-pointer border border-gray-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {wPhoto ? (
                              <img
                                src={wPhoto}
                                alt={wName}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0B3B68] flex items-center justify-center font-bold text-xs shrink-0">
                                {wName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 truncate">{wName}</h4>
                              <p className="text-[11px] text-gray-500 truncate">{wService}</p>
                            </div>
                          </div>
                          {wRating && (
                            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 shrink-0 ml-2">
                              <StarLucide className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{wRating}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 mb-4 text-center">
                    <p className="text-xs font-semibold text-gray-600">No saved workers yet</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Save workers you like while searching so you can quickly rehire them.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate("/homeowner-saved-workers")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold bg-[#0B3B68] text-white hover:bg-[#082d50] transition-all shadow-sm group cursor-pointer"
              >
                <span>View All Saved Workers</span>
                <ArrowRightLucide className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* --- UPDATED GRADIENT DIVISION (BIG & PROFESSIONAL) --- */}
      {showMarketingDivider && (
        <div className="w-full h-48 relative my-16 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E1F2F7] to-transparent opacity-70"></div>
          {/* Decorative horizontal lines */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent absolute top-0"></div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent absolute bottom-0"></div>
          {/* Professional Glow Blur */}
          <div className="w-[80%] h-32 bg-blue-100/40 blur-[100px] rounded-full"></div>
        </div>
      )}

      {/* --- WHY TRABAHOME SECTION --- */}
      {showWhySection && (
        <section id="about" className="py-12 sm:py-16 px-4 sm:px-6 relative">
          <span id="safety-trust" className="block scroll-mt-24" />
          <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-16 relative z-10">
             <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0B3B68] mb-3 sm:mb-4">Why TrabaHome is Safe</h2>
             <p className="text-sm sm:text-base text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">We built TrabaHome to protect both homeowners and workers—so every job feels safe, fair, and reliable.</p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative z-10">
            {[
              { icon: ShieldCheckIcon, title: "Verified Workers", desc: "Every worker is reviewed and approved before joining." },
              { icon: StarIcon, title: "Real Ratings & Reviews", desc: "See feedback from real homeowners in your area." },
              { icon: MapPinIcon, title: "Local & Nearby", desc: "Find help from people who actually work near you." },
              { icon: MailIcon, title: "Instant Email Alerts", desc: "Workers get your booking requests immediately via email." }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:px-8 sm:py-9 flex items-center gap-4 sm:gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-default group">
                <div className="bg-blue-50 p-3.5 sm:p-5 rounded-2xl text-[#0B3B68] shrink-0 transition-colors duration-300 group-hover:bg-[#0B3B68] group-hover:text-white"><item.icon className="w-6 h-6 sm:w-10 sm:h-10" /></div>
                <div className="text-left">
                  <h3 className="font-black text-[#0B3B68] text-base sm:text-xl">{item.title}</h3>
                  <p className="text-xs sm:text-[14px] text-gray-500 mt-1 sm:mt-2 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- HOW IT WORKS (MATCHING IMAGE UI) --- */}
      {showHowItWorks && (
        <section id="how-it-works" className="py-12 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto relative">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0B3B68] text-center mb-10 sm:mb-20 relative z-10">How It Works</h2>
          <div className="flex flex-col md:flex-row items-center gap-10 sm:gap-16 lg:gap-24 relative z-10">
            
            {/* Left Side: Featured Image with Blue Backdrop */}
            <div className="w-full md:w-1/2 relative">
              <div className="absolute top-6 sm:top-10 -left-4 sm:-left-8 w-full h-full bg-[#0B3B68] rounded-2xl sm:rounded-[3.5rem] -z-10 shadow-xl"></div>
              <img 
                src="https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=600" 
                alt="Home service professional at work" 
                className="w-full h-[260px] sm:h-[420px] md:h-[550px] object-cover rounded-2xl sm:rounded-[3.5rem] border-4 sm:border-[14px] border-white shadow-2xl transition-transform duration-700 hover:scale-[1.02]" 
              />
            </div>
            
            {/* Right Side: Step-by-Step UI Cards */}
            <div className="w-full md:w-1/2 relative">
              {/* Dashed Line and Green Overlay as seen in image */}
              <div className="hidden sm:block absolute left-[2.2rem] top-10 bottom-32 w-px border-l-2 border-dashed border-gray-300 -z-0"></div>
              <div className="hidden sm:block absolute left-[2.2rem] top-12 bottom-32 w-16 bg-gradient-to-r from-green-100/40 to-transparent -z-10 blur-sm rounded-r-full"></div>
              
              <div className="space-y-6 sm:space-y-12">
                {[
                  { step: 1, icon: SearchIcon, title: "Find a Service", desc: "Choose a service and your location", color: "#FFDBC2", text: "#E65F2A" },
                  { step: 2, icon: MapPinIcon, title: "Compare Workers", desc: "Browse nearby workers with ratings", color: "#C2E0FF", text: "#0066CC" },
                  { step: 3, icon: PhoneIcon, title: "Book & Review", desc: "A worker accepts your request and fixes the problem. Share feedback if you'd like.", color: "#EBC2FF", text: "#9900CC" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 sm:gap-8 group relative z-10">
                    {/* Circle Badge Section */}
                    <div className="flex-shrink-0 relative">
                      <div className="w-12 h-12 sm:w-18 sm:h-18 bg-white rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300" style={{ minWidth: '3rem', minHeight: '3rem' }}>
                        <item.icon className="w-5 h-5 sm:w-8 sm:h-8" style={{ color: item.text }} />
                      </div>
                      {/* The Numbered Badge as seen in UI image */}
                      <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-md" style={{ backgroundColor: item.color, color: item.text }}>
                        {item.step}
                      </div>
                    </div>
                    
                    {/* Content Card */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-50 flex-1 transition-all duration-300 hover:shadow-xl hover:bg-[#fafafa]">
                      <h3 className="font-black text-base sm:text-xl text-[#0B3B68]">{item.title}</h3>
                      <p className="text-xs sm:text-[14px] text-gray-500 mt-1 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="mt-8 sm:mt-20 ml-0 sm:ml-28 flex justify-center sm:block">
                 <button onClick={handleSearch} className="bg-[#0B3B68] text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl font-black text-base sm:text-lg shadow-2xl hover:bg-[#154575] transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto cursor-pointer">
                   Find Workers Near Me
                 </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {showFooter && <Footer />}

      {/* Welcome & Onboarding Walkthrough */}
      <WelcomeOnboardingModal
        isOpen={isOnboardingOpen}
        role="homeowner"
        userName={homeownerSession?.homeowner?.firstName || homeownerSession?.homeowner?.name || ""}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
