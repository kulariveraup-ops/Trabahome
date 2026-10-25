// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ImageOff,
  Info,
  User,
} from "lucide-react";
import HomeownerNotificationBell from "../components/homeownerNotifications/HomeownerNotificationBell.tsx";
import ServiceRequestSuccessModal from "../components/requestpages/ServiceRequestSuccessModal.tsx";
import ServiceRequestProofreadModal from "../components/requestpages/ServiceRequestProofreadModal.tsx";
import ServiceRequestContactLocationFields from "../components/requestpages/ServiceRequestContactLocationFields.tsx";
import {
  homeownerAPI,
  SUSPENDED_HOMEOWNER_REQUEST_MESSAGE,
  isSuspendedHomeownerAccount,
} from "../services/HomeownerApi.ts";
import { workerAPI } from "../services/WorkerApi.ts";
import { getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import { useMinuteTicker } from "../hooks/useMinuteTicker.ts";
import { savePendingServiceRequest } from "../services/pendingServiceRequest.ts";
import { clearHomeownerSession } from "../utils/homeownerAuth.ts";
import { getHomeownerAuthToken, getHomeownerSession } from "../utils/homeownerAuth.ts";
import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import { normalizePangasinanMunicipality } from "../constants/SignUpData.ts";
import { formatServiceRequestAddress, parseWorkerServices, validateServiceRequestLocation } from "../utils/serviceRequestForm.ts";
import {
  HammerIcon,
  MapPinIcon,
  StarIcon,
  ShieldCheckIcon,
  TrowelIcon,
  DropletIcon,
  ZapIcon,
  BrushIcon,
  SproutIcon,
  WrenchIcon,
  ArrowRightIcon,
  XIcon,
  SearchIcon,
  LockIcon
} from "../Icons";

const NOTIFICATION_LIMIT = 20;
const NOTIFICATION_CACHE_TTL_MS = 60_000;
const viteEnv = import.meta.env || {};
const API_BASE_URL = viteEnv.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_PREFIXES = [`${API_BASE_URL}/homeowner`, `${API_BASE_URL}/homeowners`];
const SOCKET_BASE_URL = API_BASE_URL.startsWith("http")
  ? API_BASE_URL.replace(/\/api\/?$/, "")
  : (typeof window !== "undefined" ? window.location.origin : "");

const formatTimeAgo = (isoString?: string): string => {
  if (!isoString) return "";
  const timestamp = new Date(isoString).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 45) return "just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
};

const mergeNotifications = (current: any[], incoming: any[]) => {
  const next = [...current];
  incoming.forEach((item) => {
    const index = next.findIndex((existing) => String(existing?.id || existing?._id || "") === String(item?.id || item?._id || ""));
    if (index === -1) {
      next.unshift(item);
      return;
    }
    next[index] = { ...next[index], ...item };
  });
  return next;
};

const getHomeownerNotificationCacheKey = () =>
  `trabahome_notifications:homeowner:${String(getHomeownerSession()?.email || "").toLowerCase()}`;

const REVIEW_PAGE_SIZE = 6;
const FEEDBACK_INITIAL_VISIBLE_COUNT = 4;
const FEEDBACK_PAGE_SIZE = 6;

const formatShortDate = (date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
};

const getRoleIcon = (role) => {
  switch (role) {
    case "Mason":
      return <TrowelIcon className="w-5 h-5" />;
    case "Plumber":
      return <DropletIcon className="w-5 h-5" />;
    case "Electrician":
      return <ZapIcon className="w-5 h-5" />;
    case "Cleaner":
      return <BrushIcon className="w-5 h-5" />;
    case "Gardener":
      return <SproutIcon className="w-5 h-5" />;
    case "General Repair":
      return <WrenchIcon className="w-5 h-5" />;
    default:
      return <HammerIcon className="w-5 h-5" />;
  }
};

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return `${first}${second}`.toUpperCase();
};

const asText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
};

const asAvailabilityText = (value) => {
  if (!value) return "Offline";
  if (typeof value === "string") return value;
  if (typeof value === "object") return asText(value.status, "Offline");
  return asText(value, "Offline");
};

const normalizeWorkerLocation = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => asText(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return asText(value.label || value.location || value.city || value.barangay || value.name);
  }
  return asText(value);
};

const PLACEHOLDER_FEEDBACK_TEXT =
  "This completed job has been recorded and will show homeowner feedback once a review is submitted.";

const isPlaceholderFeedback = (value) => {
  const text = String(value || "").trim().toLowerCase();
  return (
    !text ||
    text === PLACEHOLDER_FEEDBACK_TEXT.toLowerCase() ||
    text.includes("will show homeowner feedback once a review is submitted")
  );
};


const getVerificationTone = (status) => {
  switch (status) {
    case "Verified":
      return {
        label: "Verified",
        icon: "text-emerald-600",
        badge: "text-emerald-700 bg-emerald-50 border-emerald-100",
      };
    case "Pending":
      return {
        label: "Pending",
        icon: "text-amber-600",
        badge: "text-amber-700 bg-amber-50 border-amber-100",
      };
    default:
      return {
        label: "Not Verified",
        icon: "text-gray-500",
        badge: "text-gray-600 bg-gray-100 border-gray-200",
      };
  }
};

const getAvailabilityTone = (status) => {
  switch (status) {
    case "Online":
    case "Available":
      return {
        dot: "bg-emerald-500",
        badge: "text-emerald-700 bg-emerald-50 border border-emerald-200",
      };
    case "On Vacation":
      return {
        dot: "bg-amber-500",
        badge: "text-amber-700 bg-amber-50 border border-amber-200",
      };
    case "Day Off":
      return {
        dot: "bg-blue-500",
        badge: "text-blue-700 bg-blue-50 border border-blue-200",
      };
    case "Busy":
      return {
        dot: "bg-rose-500",
        badge: "text-rose-700 bg-rose-50 border border-rose-200",
      };
    case "Offline":
    default:
      return {
        dot: "bg-gray-400",
        badge: "text-gray-600 bg-gray-100 border border-gray-200",
      };
  }
};

const formatRating = (rating) => (rating ? rating.toFixed(1) : "0.0");

const isRenderableImageSrc = (value) =>
  typeof value === "string" && /^(https?:\/\/|\/|data:image\/|blob:)/i.test(value.trim());

const SafeImage = ({
  src,
  alt,
  className = "",
  fallbackClassName = "",
  placeholder = "Image unavailable",
}) => {
  const [hasError, setHasError] = useState(false);
  const shouldRenderImage = isRenderableImageSrc(src) && !hasError;

  if (!shouldRenderImage) {
    return (
      <div className={`relative flex h-full w-full items-center justify-center bg-[#F3F4F6] text-gray-400 ${fallbackClassName}`}>
        <div className="flex flex-col items-center gap-2 px-3 text-center">
          <ImageOff className="h-5 w-5" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">{placeholder}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default function WorkerProfile() {
  useMinuteTicker();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const reviewSectionRef = useRef(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const homeownerSession = getHomeownerSession();
  const homeownerAccountName =
    homeownerSession?.homeowner?.firstName ||
    homeownerSession?.homeowner?.name ||
    homeownerSession?.homeowner?.fullName ||
    homeownerSession?.email ||
    "Profile";
  const homeownerAvatar =
    homeownerSession?.homeowner?.avatar ||
    homeownerSession?.homeowner?.profileImage ||
    homeownerSession?.homeowner?.photoUrl ||
    "";
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);
  const [preparedRequestLocation, setPreparedRequestLocation] = useState<any>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceBarangay, setServiceBarangay] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("00:00");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedWorkerName, setSelectedWorkerName] = useState("");
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [activeWorkerBookings, setActiveWorkerBookings] = useState<Array<{ preferredDate: string; preferredTime: string }>>([]);
  const [isBookingSending, setIsBookingSending] = useState(false);
  const bookingSendingRef = useRef(false);
  const [showRequestValidation, setShowRequestValidation] = useState(false);
  const [priceAgreementChecked, setPriceAgreementChecked] = useState(false);
  const [submittedServiceLocation, setSubmittedServiceLocation] = useState("");
  const [submittedContactNumber, setSubmittedContactNumber] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSavePending, setIsSavePending] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [reviewsVisibleCount, setReviewsVisibleCount] = useState(REVIEW_PAGE_SIZE);
  const [reviewsSort, setReviewsSort] = useState("newest");
  const [expandedReviews, setExpandedReviews] = useState([]);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [isPortfolioExpanded, setIsPortfolioExpanded] = useState(false);
  const [isCompletedJobsExpanded, setIsCompletedJobsExpanded] = useState(false);
  const [liveWorker, setLiveWorker] = useState<any>(null);
  const [isWorkerLoading, setIsWorkerLoading] = useState(true);
  const openedRebookRef = useRef("");

  const normalizeNotification = (item: any) => {
    if (!item) return null;
    const resolvedId = item.id || item._id;
    return resolvedId ? { ...item, id: resolvedId } : item;
  };

  const fetchWithFallback = async (path: string, options: RequestInit = {}) => {
    let lastError: unknown = null;
    for (let index = 0; index < API_PREFIXES.length; index += 1) {
      const prefix = API_PREFIXES[index];
      try {
        const response = await fetch(`${prefix}${path}`, options);
        if (response.status === 404) {
          lastError = new Error("Not found");
          continue;
        }
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Request failed");
        }
        if (response.status === 204) return null;
        return response.json();
      } catch (error) {
        lastError = error;
        throw error;
      }
    }
    throw lastError;
  };

  const resolveNotificationDestination = (notification: any) => {
    const meta = notification?.meta || {};
    const route = String((meta as any).route || (notification as any).route || "");
    const requestId = String((meta as any).requestId || (meta as any).bookingId || (notification as any).requestId || "").trim();
    if (route) {
      if (route === "/homeowner-bookings" && requestId) {
        return { path: route, state: { openRequestId: requestId } };
      }
      return { path: route, state: meta || undefined };
    }
    const title = String(notification?.title || "").toLowerCase();
    const message = String(notification?.message || "").toLowerCase();
    if (title.includes("booking") || title.includes("request") || message.includes("homeowner")) {
      return { path: "/homeowner-bookings", state: requestId ? { openRequestId: requestId } : undefined };
    }
    return { path: "/homeowner-bookings", state: requestId ? { openRequestId: requestId } : undefined };
  };

  const fetchNotificationsPage = async ({ cursor, append }: { cursor?: string | null; append?: boolean } = {}) => {
    const token = getHomeownerAuthToken();
    if (!token) {
      setNotifications([]);
      setNextCursor(null);
      return;
    }

    const cacheKey = getHomeownerNotificationCacheKey();
    if (!append && !cursor) {
      const cached = readJsonCache<{ items?: any[]; nextCursor?: string | null }>(cacheKey, NOTIFICATION_CACHE_TTL_MS);
      if (cached?.items?.length) {
        setNotifications(cached.items.map(normalizeNotification).filter(Boolean));
        setNextCursor(cached.nextCursor ?? null);
      }
    }

    const params = new URLSearchParams();
    params.set("limit", String(NOTIFICATION_LIMIT));
    if (cursor) params.set("cursor", cursor);

    const options: RequestInit = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    };

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingNotifications(true);
    }

    try {
      const data = await fetchWithFallback(`/notifications?${params.toString()}`, options);
      const items = Array.isArray(data?.items) ? data.items.map(normalizeNotification).filter(Boolean) : [];
      setNotifications((prev) => mergeNotifications(prev, items));
      setNextCursor(data?.nextCursor ?? null);
      if (!append) {
        const current = readJsonCache<{ items?: any[]; nextCursor?: string | null }>(cacheKey, NOTIFICATION_CACHE_TTL_MS);
        const merged = mergeNotifications(current?.items?.map(normalizeNotification).filter(Boolean) || [], items);
        writeJsonCache(cacheKey, { items: merged, nextCursor: data?.nextCursor ?? null });
      }
    } finally {
      setIsLoadingNotifications(false);
      setIsLoadingMore(false);
    }
  };

  const handleNotificationRead = async (notification: any) => {
    if (!notification || notification.readAt || !notification.id) return;
    const token = getHomeownerAuthToken();
    if (!token) return;
    const destination = resolveNotificationDestination(notification);

    const options: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    setNotifications((prev) => {
      const readAt = new Date().toISOString();
      const updated = prev.map((item) =>
        item.id === notification.id ? { ...item, readAt: item.readAt || readAt } : item
      );
      writeJsonCache(getHomeownerNotificationCacheKey(), {
        items: updated,
        nextCursor,
      });
      return updated;
    });

    try {
      await fetchWithFallback(`/notifications/${notification.id}/read`, options);
    } catch {
      // optimistic update already applied
    }

    setIsNotificationsOpen(false);
    navigate(destination.path, { state: destination.state });
  };

  const handleMarkAllRead = async () => {
    const token = getHomeownerAuthToken();
    if (!token) return;
    const options: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const readAt = new Date().toISOString();
    setNotifications((prev) => {
      const updated = prev.map((item) => ({ ...item, readAt }));
      writeJsonCache(getHomeownerNotificationCacheKey(), {
        items: updated,
        nextCursor,
      });
      return updated;
    });
    try {
      await fetchWithFallback("/notifications/read-all", options);
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    clearHomeownerSession();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((item: any) => !item.readAt).length);
  }, [notifications]);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    fetchNotificationsPage({ append: false });
  }, [isNotificationsOpen]);

  const handleBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  const handleScrollToReviews = () => {
    if (!reviewSectionRef.current) return;
    reviewSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleOpenReviews = () => {
    if (!hasReviews) return;
    setReviewsVisibleCount(REVIEW_PAGE_SIZE);
    setReviewsSort("newest");
    setIsReviewsOpen(true);
  };

  const handleCloseReviews = () => {
    setIsReviewsOpen(false);
  };

  const isReviewExpandable = (comment) => comment && comment.length > 120;

  const toggleReview = (review) => {
    if (!isReviewExpandable(review.comment)) return;
    setExpandedReviews((prev) =>
      prev.includes(review.id)
        ? prev.filter((idValue) => idValue !== review.id)
        : [...prev, review.id]
    );
  };

  const loadMoreReviews = () => {
    setReviewsVisibleCount((prev) =>
      Math.min(prev + REVIEW_PAGE_SIZE, sortedReviews.length)
    );
  };

  const stateWorker =
    location?.state?.worker && typeof location.state.worker === "object"
      ? location.state.worker
      : location?.state && typeof location.state === "object"
        ? location.state
        : null;

  const resolvedWorker =
    liveWorker ||
    (stateWorker
      ? {
          id: stateWorker.id || id,
          name: stateWorker.name || "Service Provider",
          role: stateWorker.role || "General Repair",
          location: stateWorker.location || "Location not set",
          rating: Number.isFinite(stateWorker.rating) ? stateWorker.rating : 0,
          reviews: Number.isFinite(stateWorker.reviews) ? stateWorker.reviews : 0,
          bio: String(stateWorker.bio || ""),
          image: String(
            stateWorker.image ||
              stateWorker.photoUrl ||
              stateWorker.profilePhotoUrl ||
              ""
          ).trim(),
          proofOfWork: Array.isArray(stateWorker.proofOfWork) ? stateWorker.proofOfWork : [],
          yearsExperience: stateWorker.yearsExperience,
          languages: stateWorker.languages,
          availabilityStatus: stateWorker.availabilityStatus || stateWorker.availability?.status || "",
          workingSchedule: stateWorker.workingSchedule || stateWorker.availability?.schedule || "",
          serviceArea: stateWorker.serviceArea,
          verificationStatus: stateWorker.verificationStatus,
          completedJobsCount: stateWorker.completedJobsCount,
          completedJobs: Array.isArray(stateWorker.completedJobs) ? stateWorker.completedJobs : [],
        }
      : null);
  const worker = resolvedWorker || {};

  useEffect(() => {
    let active = true;
    if (!id) {
      setIsWorkerLoading(false);
      return;
    }
    const loadWorker = async () => {
      try {
        setIsWorkerLoading(true);
        const res = await workerAPI.getWorkerById(id, { includeCompletedJobs: true });
        const fetched = res?.data || (res as any)?.worker;
        if (active && fetched) {
          const firstName = String(fetched.firstName || "").trim();
          const lastName = String(fetched.lastName || "").trim();
          const name = [firstName, lastName].filter(Boolean).join(" ") || fetched.name || fetched.fullName || "Service Provider";
          const role = fetched.profession || fetched.role || fetched.service || "General Repair";
          const location = fetched.city || fetched.location || fetched.barangay || "Location not set";
          setLiveWorker({
            ...fetched,
            id: fetched._id || fetched.id || id,
            name,
            role,
            location,
            rating: Number(fetched.rating || fetched.averageRating || 0),
            reviews: Number(fetched.reviews || fetched.reviewsCount || 0),
            image: fetched.avatar || fetched.profileImage || fetched.profilePhotoUrl || fetched.image || "",
          });
        }
      } catch (err) {
        console.error("Failed to load worker profile by id:", err);
      } finally {
        if (active) setIsWorkerLoading(false);
      }
    };
    loadWorker();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const draft = location?.state?.rebookDraft;
    if (!draft || typeof draft !== "object" || !resolvedWorker) return;

    const sourceRequestId = String(draft.sourceRequestId || "").trim();
    const targetWorkerId = String(draft.targetWorkerId || "").trim();
    const profileWorkerId = String(resolvedWorker?._id || resolvedWorker?.id || id || "").trim();
    const draftKey = `${sourceRequestId}:${targetWorkerId}`;
    if (!sourceRequestId || !targetWorkerId || targetWorkerId !== profileWorkerId || openedRebookRef.current === draftKey) {
      return;
    }

    let active = true;
    const openRebookForm = async () => {
      try {
        const currentHomeowner = await homeownerAPI.me({ fresh: true });
        if (isSuspendedHomeownerAccount(currentHomeowner?.homeowner)) {
          if (!active) return;
          setAlertMessage(SUSPENDED_HOMEOWNER_REQUEST_MESSAGE);
          setIsAlertOpen(true);
          return;
        }
      } catch (error) {
        console.error("Homeowner status check failed:", error);
      }

      if (!active) return;
      openedRebookRef.current = draftKey;
      setSelectedWorkerId(targetWorkerId);
      setSelectedWorkerName(String(resolvedWorker?.name || draft.workerName || "Worker"));
      setSelectedServiceType(String(draft.serviceType || resolvedWorker?.role || "General Repair"));
      setServiceCity(normalizePangasinanMunicipality(draft.city));
      setServiceBarangay(String(draft.barangay || ""));
      setServiceAddress(String(draft.address || ""));
      setContactNumber(String(draft.contactNumber || ""));
      setRequestDescription(String(draft.description || ""));
      setPreferredDate(String(draft.preferredDate || ""));
      setPreferredTime(String(draft.preferredTime || ""));
      setShowRequestValidation(false);
      setIsModalOpen(true);
    };

    void openRebookForm();
    return () => {
      active = false;
    };
  }, [id, location.state, resolvedWorker]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const loadWorker = async () => {
      if (!id) {
        if (isMounted) setIsWorkerLoading(false);
        return;
      }
      if (isMounted) setIsWorkerLoading(true);
      try {
        const response = await workerAPI.getWorkerById(String(id), { includeCompletedJobs: true });
        if (!isMounted) return;
        setLiveWorker(response?.data || null);
      } catch (error) {
        console.error("Failed to load worker profile:", error);
      } finally {
        if (isMounted) setIsWorkerLoading(false);
      }
    };
    void loadWorker();

    const handleProfileUpdate = () => {
      void loadWorker();
    };
    window.addEventListener('trabahome:worker-profile-updated', handleProfileUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('trabahome:worker-profile-updated', handleProfileUpdate);
    };
  }, [id]);

  useEffect(() => {
    if (isReviewsOpen) {
      setReviewsVisibleCount(REVIEW_PAGE_SIZE);
    }
  }, [isReviewsOpen, reviewsSort]);

  useEffect(() => {
    let isMounted = true;

    const loadSavedState = async () => {
      const token = getHomeownerAuthToken();
      if (!token || !worker?.id) {
        if (isMounted) setIsSaved(false);
        return;
      }

      try {
        const response = await homeownerAPI.listSavedWorkers();
        const items = Array.isArray(response?.items) ? response.items : [];
        const saved = items.some((item: any) => String(item?.id || item?.workerId || item?._id) === String(worker.id));
        if (isMounted) setIsSaved(saved);
      } catch {
        if (isMounted) setIsSaved(false);
      }
    };

    loadSavedState();

    return () => {
      isMounted = false;
    };
  }, [worker?.id]);

  const shortBio = String(worker.bio || "").trim();
  const aboutText = shortBio;
  const yearsExperience = Number.isFinite(Number(worker.yearsExperience)) ? Number(worker.yearsExperience) : 0;
  const languages = Array.isArray(worker.languages)
    ? worker.languages
    : String(worker.languages || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const availabilityStatus = String(worker.availabilityStatus || worker.availability?.status || "").trim();
  const workingSchedule = String(worker.workingSchedule || worker.availability?.schedule || "").trim();
  const liveAvailability = getWorkerLiveStatus(workingSchedule, availabilityStatus);
  const serviceArea = worker.serviceArea ?? null;
  const verificationStatus = worker.verificationStatus || "Verified";
  const reviewCount = Number.isFinite(worker.reviews) ? worker.reviews : 0;
  const completedJobs = Array.isArray(worker.completedJobs) ? worker.completedJobs : [];
  const feedbackJobs = completedJobs.filter((job) => {
    const reviewRating = Number(job?.reviewRating);
    const reviewedAt = String(job?.reviewedAt || "").trim();
    return (
      Boolean(reviewedAt) &&
      Number.isFinite(reviewRating) &&
      reviewRating >= 1 &&
      reviewRating <= 5
    );
  });
  const hasReviews = feedbackJobs.length > 0;
  const completedJobsCount = worker.completedJobsCount || 0;
  const portfolioImages = Array.isArray(worker.proofOfWork) ? worker.proofOfWork.filter(Boolean) : [];
  const visiblePortfolio = isPortfolioExpanded
    ? portfolioImages
    : portfolioImages.slice(0, 6);
  const hasMorePortfolio = portfolioImages.length > 6;
  const verificationTone = getVerificationTone(verificationStatus);
  const availabilityTone = getAvailabilityTone(liveAvailability.label);
  const locationLabel = normalizeWorkerLocation(worker.location) || "Location not set";
  const serviceAreaLabel = serviceArea?.label || locationLabel;
  const workerImage = String(
    worker.image ||
      worker.avatar ||
      worker.profileImage ||
      worker.photoUrl ||
      worker.profilePhotoUrl ||
      ""
  ).trim();
  const reviewEntries = useMemo(() => {
    const items = feedbackJobs
      .map((job, index) => {
        const rating = Number(job?.reviewRating);
        const reviewedAt = String(job?.reviewedAt || job?.completedOn || job?.updatedAt || job?.createdAt || "").trim();
        const timestamp = reviewedAt ? new Date(reviewedAt).getTime() : 0;
        const comment = String(job?.reviewText || "").trim();
        const avatar = String(
          job?.homeownerAvatar ||
            job?.homeowner?.avatar ||
            job?.homeowner?.profileImage ||
            job?.homeownerProfileImage ||
            ""
        ).trim();
        return {
          id: String(job?.id || job?.bookingNumber || job?.requestNumber || `${index}`),
          name:
            String(job?.homeownerName || job?.homeowner?.name || job?.homeowner?.email || "Homeowner").trim() ||
            "Homeowner",
          avatar,
          rating: Number.isFinite(rating) && rating > 0 ? rating : 0,
          comment,
          date: reviewedAt ? new Date(reviewedAt).toLocaleDateString() : "",
          timestamp,
        };
      })
      .filter((item) => item.rating >= 1 && item.rating <= 5);

    const sorted = [...items];
    if (reviewsSort === "highest") {
      sorted.sort((a, b) => b.rating - a.rating || b.timestamp - a.timestamp || a.name.localeCompare(b.name));
    } else if (reviewsSort === "lowest") {
      sorted.sort((a, b) => a.rating - b.rating || b.timestamp - a.timestamp || a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.timestamp - a.timestamp || b.rating - a.rating || a.name.localeCompare(b.name));
    }

    return sorted;
  }, [feedbackJobs, reviewsSort]);

  const averageReviewRating = useMemo(() => {
    if (reviewEntries.length === 0) return 0;
    return reviewEntries.reduce((sum, review) => sum + review.rating, 0) / reviewEntries.length;
  }, [reviewEntries]);
  const ratingValue = Number.isFinite(worker.rating) && worker.rating > 0 ? worker.rating : averageReviewRating;
  const isNewWorker = reviewEntries.length === 0 || ratingValue <= 0;
  const reviewCountDisplay = reviewEntries.length;

  const reviewSummary = useMemo(
    () => [
      { label: "Average rating", value: ratingValue ? formatRating(ratingValue) : "0.0" },
      { label: "Reviews", value: String(reviewCountDisplay || 0) },
      { label: "Completed jobs", value: String(completedJobsCount || 0) },
    ],
    [completedJobsCount, ratingValue, reviewCountDisplay]
  );

  const feedbackTotalPages = Math.max(1, Math.ceil(feedbackJobs.length / FEEDBACK_PAGE_SIZE));
  const visibleFeedbackJobs = isFeedbackExpanded
    ? feedbackJobs.slice((Math.max(1, feedbackPage) - 1) * FEEDBACK_PAGE_SIZE, Math.max(1, feedbackPage) * FEEDBACK_PAGE_SIZE)
    : feedbackJobs.slice(0, FEEDBACK_INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    setIsFeedbackExpanded(false);
    setFeedbackPage(1);
  }, [feedbackJobs.length]);

  useEffect(() => {
    setFeedbackPage((current) => Math.min(Math.max(1, current), feedbackTotalPages));
  }, [feedbackTotalPages]);

  const fullReviews = reviewEntries;
  const sortedReviews = reviewEntries;
  const previewReviews = useMemo(() => reviewEntries.slice(0, 3), [reviewEntries]);
  const ratingBreakdown = useMemo(() => {
    return reviewEntries.reduce(
      (acc, review) => {
        const star = Math.max(1, Math.min(5, Math.round(review.rating)));
        acc[star] += 1;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    );
  }, [reviewEntries]);
  const visibleReviews = useMemo(
    () => reviewEntries.slice(0, Math.max(0, reviewsVisibleCount)),
    [reviewEntries, reviewsVisibleCount]
  );

  if (!resolvedWorker) {
    return (
      <div className="p-20 text-center font-bold">
        {isWorkerLoading ? (
          "Loading worker profile..."
        ) : (
          <>Worker not found. <button onClick={() => navigate(-1)}>Go Back</button></>
        )}
      </div>
    );
  }

  const openRequestModal = async () => {
    try {
      const currentHomeowner = await homeownerAPI.me({ fresh: true });
      if (isSuspendedHomeownerAccount(currentHomeowner?.homeowner)) {
        setAlertMessage(SUSPENDED_HOMEOWNER_REQUEST_MESSAGE);
        setIsAlertOpen(true);
        return;
      }
    } catch (error) {
      console.error("Homeowner status check failed:", error);
    }

    const targetWorkerId = String(worker._id || worker.id || "");

    // Pre-check active booking limits for homeowner
    try {
      const res = await homeownerAPI.listServiceRequests();
      const allRequests = Array.isArray(res?.items) ? res.items : [];
      const activeRequests = allRequests.filter((item: any) =>
        ["PENDING", "ONGOING", "ACCEPTED", "IN_PROGRESS"].includes(String(item?.status || "").toUpperCase())
      );

      if (activeRequests.length >= 10) {
        setAlertMessage("You have reached the maximum limit of 10 active bookings across skilled workers. You can only request new bookings once current active bookings are completed or done.");
        setIsAlertOpen(true);
        return;
      }

      const activeWithTarget = activeRequests.filter((item: any) => {
        const wId = String(item?.targetWorkerId?._id || item?.targetWorkerId || item?.worker?.id || item?.worker?._id || "");
        return wId === targetWorkerId;
      });

      if (activeWithTarget.length >= 3) {
        setAlertMessage("You can only have up to 3 active bookings with this worker. Please wait until existing bookings are completed.");
        setIsAlertOpen(true);
        return;
      }

      const activeSchedules = activeWithTarget.map((item: any) => ({
        preferredDate: String(item?.preferredDate || item?.scheduledAt || "").slice(0, 10),
        preferredTime: String(item?.preferredTime || "").trim(),
      }));
      setActiveWorkerBookings(activeSchedules);
    } catch (err) {
      console.warn("Could not pre-check active booking limits:", err);
    }

    const services = parseWorkerServices(worker);
    setSelectedWorkerId(targetWorkerId);
    setSelectedWorkerName(worker.name);
    if (services.length === 1) {
      setSelectedServiceType(services[0]);
    } else {
      setSelectedServiceType("");
    }
    setServiceCity("");
    setServiceBarangay("");
    setServiceAddress("");
    setContactNumber("");
    setRequestDescription("");
    setPreferredDate("");
    setPreferredTime("00:00");
    setShowRequestValidation(false);
    setIsModalOpen(true);
  };

  const handleSaveWorker = async () => {
    const workerId = String(worker._id || worker.id || "").trim();
    if (!workerId) return;
    if (isSavePending) return;

    setIsSavePending(true);
    try {
      if (!isSaved) {
        const result = await homeownerAPI.saveWorker(workerId);
        if (result?.saved === false) {
          setIsSaved(false);
          return;
        }
        setIsSaved(true);
      } else {
        await homeownerAPI.removeSavedWorker(workerId);
        setIsSaved(false);
      }
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(
            "trabahome_saved_workers_changed",
            JSON.stringify({ time: Date.now(), workerId, saved: !isSaved })
          );
          window.dispatchEvent(new Event("trabahome:saved-workers-changed"));
        }
      } catch {
        // ignore browser storage issues
      }
    } catch (error) {
      console.error("Save worker error:", error);
      setAlertMessage("Unable to save this worker right now. Please try again.");
      setIsAlertOpen(true);
    } finally {
      setIsSavePending(false);
    }
  };

  const handleSendRequest = () => {
    if (bookingSendingRef.current || isBookingSending) return;
    setShowRequestValidation(true);
    if (!String(requestDescription || "").trim()) {
      setAlertMessage("Please add a short description before sending.");
      setIsAlertOpen(true);
      return;
    }
    const locationValidation = validateServiceRequestLocation({
      contactNumber,
      city: serviceCity,
      barangay: serviceBarangay,
      address: serviceAddress,
    });
    if (locationValidation.error) {
      setAlertMessage(locationValidation.error);
      setIsAlertOpen(true);
      return;
    }
    const requestLocation = locationValidation.value;
    const services = parseWorkerServices(worker);
    if (services.length > 1 && !selectedServiceType) {
      setAlertMessage("Please choose the service you need before continuing.");
      setIsAlertOpen(true);
      return;
    }
    if (!preferredDate) {
      setAlertMessage("Please select a date for the service.");
      setIsAlertOpen(true);
      return;
    }
    if (!preferredTime) {
      setAlertMessage("Please select a time for the service.");
      setIsAlertOpen(true);
      return;
    }

    if (activeWorkerBookings && activeWorkerBookings.length > 0) {
      const isDup = activeWorkerBookings.some((b) => {
        const bDate = String(b.preferredDate || "").slice(0, 10);
        const bTime = String(b.preferredTime || "").trim();
        return bDate === preferredDate && bTime === preferredTime;
      });
      if (isDup) {
        setAlertMessage("You already have an active booking with this worker on this date and time. Please select another date or time.");
        setIsAlertOpen(true);
        return;
      }
    }
    const selected = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(today.getDate() + 90);

    if (selected <= today) {
      setAlertMessage("Invalid Date: Service requests must be scheduled at least 1 day in advance (tomorrow onwards). Same-day bookings are not supported.");
      setIsAlertOpen(true);
      return;
    }
    if (selected > maxBookingDate) {
      setAlertMessage("Invalid Date: Bookings can only be scheduled up to 90 days in advance. Dates beyond 90 days are locked and will unlock as days go by.");
      setIsAlertOpen(true);
      return;
    }

    if (!priceAgreementChecked) {
      setAlertMessage("Please agree to the price variation terms before submitting your request.");
      setIsAlertOpen(true);
      return;
    }

    if (!selectedWorkerId || !/^[0-9a-fA-F]{24}$/.test(selectedWorkerId)) {
      setAlertMessage("Invalid worker selected. Please choose a worker again.");
      setIsAlertOpen(true);
      return;
    }

    setPreparedRequestLocation(requestLocation);
    setIsProofreadOpen(true);
  };

  const handleConfirmBookingSubmit = async () => {
    if (bookingSendingRef.current || isBookingSending) return;
    const requestLocation = preparedRequestLocation || validateServiceRequestLocation({
      contactNumber,
      city: serviceCity,
      barangay: serviceBarangay,
      address: serviceAddress,
    }).value;

    bookingSendingRef.current = true;
    setIsBookingSending(true);
    try {
      const resp = await homeownerAPI.createServiceRequest({
        targetWorkerId: selectedWorkerId,
        description: requestDescription.trim(),
        preferredDate,
        preferredTime,
        serviceType: selectedServiceType || worker.role || "General Repair",
        ...requestLocation,
      });

      setSubmittedServiceLocation(formatServiceRequestAddress(
        resp?.request?.location || requestLocation.location,
        resp?.request?.address || requestLocation.address
      ));
      setSubmittedContactNumber(String(resp?.request?.contactNumber || requestLocation.contactNumber));
      setIsProofreadOpen(false);
      setIsModalOpen(false);
      setIsSuccessOpen(true);
      setServiceAddress("");
      setContactNumber("");
      setRequestDescription("");
      setPreferredDate("");
      setPreferredTime("00:00");
      setSelectedServiceType("");
      setShowRequestValidation(false);
    } catch (error) {
      const status = error && typeof error === 'object' && 'response' in error ? error.response?.status : null;
      if (status === 401) {
        clearHomeownerSession();
        savePendingServiceRequest({
          targetWorkerId: selectedWorkerId,
          description: requestDescription.trim(),
          preferredDate,
          preferredTime,
          serviceType: selectedServiceType || worker.role || "General Repair",
          ...requestLocation,
        });
        setAlertMessage("Your homeowner session expired. We saved this request draft. Please sign in again to send it.");
        setIsAlertOpen(true);
        setIsProofreadOpen(false);
        navigate("/login", { replace: true });
        return;
      }
      const message =
        (error && typeof error === 'object' && 'response' in error && error.response?.data?.message) ||
        (error && typeof error === 'object' && 'message' in error && error.message) ||
        "Unable to send request. Please try again later.";
      setAlertMessage(String(message));
      setIsAlertOpen(true);
      console.error("Service request create error:", error);
    } finally {
      bookingSendingRef.current = false;
      setIsBookingSending(false);
    }
  };

  return (
    <div
      className={`w-full min-h-screen bg-[#F9F6F2] text-[#0B3B68] font-sans flex flex-col relative animate-in fade-in duration-700 ${
        isModalOpen || isSuccessOpen || isAlertOpen ? "overflow-hidden" : ""
      }`}
    >
      <div className="w-full bg-[#F9F6F2] border-b border-gray-200/50 flex-shrink-0 sticky top-0 z-[60] backdrop-blur-md">
        <header className="flex items-center justify-between px-6 md:px-10 py-4 max-w-7xl mx-auto w-full">
          <img
            src="/assets/Logo.png"
            alt="TrabaHome"
            className="h-8 w-auto cursor-pointer hover:opacity-80 transition-all active:scale-95"
            onClick={() => navigate("/home")}
          />
          <div className="flex items-center gap-3">
            <HomeownerNotificationBell onOpen={() => setIsProfileOpen(false)} />

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsNotificationsOpen(false);
                }}
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={isProfileOpen}
                aria-label="Profile menu"
              >
                {homeownerAvatar ? (
                  <img src={homeownerAvatar} alt={homeownerAccountName} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-[#0B3B68]" />
                )}
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-100 bg-white shadow-lg py-2">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-[#F3F4F6] border border-[#E2E8F0] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {homeownerAvatar ? (
                          <img src={homeownerAvatar} alt={homeownerAccountName} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0B3B68] truncate">{homeownerAccountName}</p>
                        <p className="text-xs text-gray-400 truncate">{homeownerSession?.email || "user@email.com"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="my-2 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/homeowner-profile");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F6F8] transition-colors"
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/homeowner-bookings");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F6F8] transition-colors"
                  >
                    My Bookings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/homeowner-saved-workers");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F6F8] transition-colors"
                  >
                    Saved Workers
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/homeowner-settings");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F6F8] transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate("/homeowner-help");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F6F8] transition-colors"
                  >
                    Help &amp; Support
                  </button>
                  <div className="my-2 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-16">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full border border-gray-200 bg-white text-[#0B3B68] flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_360px] gap-8 items-start">
          <div className="space-y-8">
            <section className="bg-white rounded-[30px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-8">
                <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                  <div className="shrink-0">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] overflow-hidden bg-gray-100 border border-gray-100 shadow-[0_10px_30px_rgba(11,59,104,0.08)]">
                      <SafeImage
                        src={workerImage}
                        alt={worker.name}
                        className="w-full h-full object-cover"
                        placeholder="No photo"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3B68] tracking-tight">
                        {asText(worker.name, "Service Provider")}
                      </h1>
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${verificationTone.badge}`}>
                        <ShieldCheckIcon className={`w-4 h-4 ${verificationTone.icon}`} />
                        {verificationTone.label}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F6FAFF] border border-blue-100 text-[#0B3B68] font-semibold">
                        {getRoleIcon(asText(worker.role, "General Repair"))}
                        {asText(worker.role, "General Repair")}
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F9FAFB] border border-gray-200">
                        <MapPinIcon className="w-4 h-4 text-[#0B3B68]" />
                        {asText(locationLabel, "Location not set")}
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFF8E7] border border-[#F6DE9E] text-[#A86E00] font-semibold">
                        <StarIcon className="w-4 h-4" />
                        {formatRating(ratingValue)} rating
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {yearsExperience ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8F3FF] text-[#0B3B68] border border-blue-100">
                          {yearsExperience} {yearsExperience === 1 ? "year" : "years"} experience
                        </span>
                      ) : null}
                      {languages?.length ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-gray-700 border border-gray-200">
                          {languages.join(", ")}
                        </span>
                      ) : null}
                      {completedJobsCount > 0 ? (
                        <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {completedJobsCount} completed jobs
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-row lg:flex-col gap-3 lg:min-w-[220px]">
                    <button
                      onClick={() => { void openRequestModal(); }}
                      className="flex-1 lg:flex-none w-full bg-[#00AF91] text-white py-3.5 rounded-full font-bold text-sm hover:bg-[#009b80] hover:shadow-lg hover:shadow-[#00AF91]/30 transition-all active:scale-95 shadow-md"
                    >
                      Request Service
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveWorker}
                      disabled={isSavePending}
                      className={`flex-1 lg:flex-none w-full border-2 rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        isSavePending
                          ? "border-gray-300 text-gray-400 bg-gray-50 cursor-wait"
                          : isSaved
                          ? "border-yellow-400 text-yellow-700 bg-yellow-50"
                          : "border-[#0B3B68] text-[#0B3B68] hover:bg-[#0B3B68] hover:text-white"
                      }`}
                      aria-pressed={isSaved}
                    >
                      <StarIcon className={`w-4 h-4 ${isSaved ? "text-yellow-500" : "text-current"}`} />
                      {isSavePending ? "Saving..." : isSaved ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[30px] p-5 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">About</p>
                  <h2 className="text-xl font-bold text-[#0B3B68] mt-1">Worker bio</h2>
                </div>
              </div>

              <p className="text-gray-600 leading-7 text-[15px]">
                {aboutText || "Bio not set."}
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F9FAFB] border border-gray-100 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Experience</p>
                  <p className="mt-2 text-sm font-semibold text-[#0B3B68]">
                    {yearsExperience ? `${yearsExperience} ${yearsExperience === 1 ? "year" : "years"}` : "Not set"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F9FAFB] border border-gray-100 p-4">
                  <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Languages</p>
                  <p className="mt-2 text-sm font-semibold text-[#0B3B68]">
                    {languages?.length ? languages.join(", ") : "Not set"}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[30px] p-5 sm:p-8 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Proof of Work</p>
                  <h2 className="text-xl font-bold text-[#0B3B68] mt-1">Portfolio</h2>
                </div>
                {hasMorePortfolio && (
                  <button
                    type="button"
                    onClick={() => setIsPortfolioExpanded((prev) => !prev)}
                    className="text-xs font-semibold text-[#0B3B68] hover:text-[#00AF91] transition-colors"
                  >
                    {isPortfolioExpanded ? "View less" : "View more"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {visiblePortfolio.length ? (
                  visiblePortfolio.map((img, idx) => (
                    <div
                      key={`${img}-${idx}`}
                      className="group aspect-square overflow-hidden rounded-2xl bg-gray-100 border border-gray-100 shadow-sm"
                    >
                      <SafeImage
                        src={img}
                        alt={`Proof of work ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="No photo"
                      />
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 md:col-span-3 rounded-2xl border border-dashed border-gray-200 bg-[#F9FAFB] p-8 text-sm text-gray-500 text-center">
                    No proof of work has been uploaded yet.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-[30px] p-5 sm:p-8 shadow-sm border border-gray-100" ref={reviewSectionRef}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Reviews</p>
                  <h2 className="text-xl font-bold text-[#0B3B68] mt-1">Customer feedback</h2>
                </div>
                <div className="rounded-2xl bg-[#F9FAFB] border border-gray-100 px-4 py-3 text-right">
                  <p className="text-2xl font-bold text-[#0B3B68] leading-none">{formatRating(ratingValue)}</p>
                  <p className="text-xs text-gray-500 mt-1">{reviewCountDisplay} reviews</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {reviewSummary.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-[#F9FAFB] border border-gray-100 p-4">
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-[#0B3B68]">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-5">
                {feedbackJobs.length ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleFeedbackJobs.map((job, idx) => {
                        const completedDate = job.completedOn
                          ? new Date(job.completedOn).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently completed";
                        const rating = Number.isFinite(Number(job.reviewRating))
                          ? formatRating(Number(job.reviewRating))
                          : "";
                        const jobPhotos = Array.isArray(job.photos) ? job.photos.filter(Boolean) : [];

                        return (
                          <div key={job.id || `${job.bookingNumber || "feedback"}-${idx}`} className="rounded-2xl border border-gray-100 bg-[#F9FAFB] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-[#0B3B68]">
                                  {job.homeownerName || "Homeowner"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {job.serviceType || "Completed job"} • {completedDate}
                                </p>
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                Completed
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {rating ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E7] border border-[#F6DE9E] px-2.5 py-1 text-[10px] font-bold text-[#A86E00]">
                                  ★ {rating}
                                </span>
                              ) : null}
                              {jobPhotos.length ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                                  {jobPhotos.length} photo{jobPhotos.length === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </div>

                            {job.reviewText && !isPlaceholderFeedback(job.reviewText) ? (
                              <p className="mt-3 text-sm text-gray-600 leading-7 italic">
                                "{job.reviewText}"
                              </p>
                            ) : (
                              <p className="mt-3 text-sm text-gray-500 leading-7">
                                No written comment.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {feedbackJobs.length > FEEDBACK_INITIAL_VISIBLE_COUNT ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        {!isFeedbackExpanded ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsFeedbackExpanded(true);
                              setFeedbackPage(1);
                            }}
                            className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-[#0B3B68] hover:bg-[#F9FAFB] transition-colors"
                          >
                            View more
                          </button>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFeedbackPage((current) => Math.max(1, current - 1))}
                                disabled={feedbackPage <= 1}
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-[#0B3B68] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={() => setFeedbackPage((current) => Math.min(feedbackTotalPages, current + 1))}
                                disabled={feedbackPage >= feedbackTotalPages}
                                className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-[#0B3B68] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F9FAFB] transition-colors"
                              >
                                Next
                              </button>
                            </div>
                            <p className="text-xs font-semibold text-gray-500">
                              Page {Math.min(feedbackPage, feedbackTotalPages)} of {feedbackTotalPages}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsFeedbackExpanded(false);
                                setFeedbackPage(1);
                              }}
                              className="inline-flex items-center justify-center rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-[#0B3B68] hover:bg-[#F9FAFB] transition-colors"
                            >
                              View less
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-7">
                    {hasReviews
                      ? "Completed jobs are available above, but no written customer feedback has been added yet."
                      : "No completed jobs or reviews have been recorded yet."}
                  </p>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-28">
            <section className="bg-white rounded-[30px] p-5 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Availability</p>
                  <h2 className="text-lg font-bold text-[#0B3B68] mt-1">Live Status</h2>
                </div>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${availabilityTone.badge}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${availabilityTone.dot}`} />
                  {liveAvailability.label}
                </span>
              </div>
              <div className="mt-5 rounded-2xl bg-[#F9FAFB] border border-gray-100 p-4">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">Working Schedule</p>
                <p className="mt-2 text-sm font-semibold text-[#0B3B68]">
                  {workingSchedule || "Schedule not set"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {availabilityStatus || "Availability not set"}
                </p>
              </div>
            </section>

            <section className="bg-white rounded-[30px] p-5 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-gray-400">Service Area</p>
                  <h2 className="text-lg font-bold text-[#0B3B68] mt-1">Coverage</h2>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#0B3B68]">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{serviceArea?.label || locationLabel || "Area not set"}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {serviceArea?.radiusKm
                    ? `Serves within ${serviceArea.radiusKm}km of this area`
                    : "Coverage radius not set"}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {isReviewsOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCloseReviews}
          ></div>
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#F9F6F2] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#0B3B68]">All Reviews</h2>
                <p className="text-xs text-gray-500">Showing {visibleReviews.length} of {fullReviews.length}</p>
              </div>
              <button
                onClick={handleCloseReviews}
                className="text-gray-400 hover:text-gray-600 transition-colors active:scale-90"
                aria-label="Close reviews"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 h-fit">
                  <h3 className="text-sm font-bold text-[#0B3B68] mb-3">Rating Breakdown</h3>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{"⭐".repeat(star)}</span>
                      <span className="font-semibold text-[#0B3B68]">{ratingBreakdown[star]}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-500">Sort by</p>
                    <select
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#0B3B68] font-semibold bg-white"
                      value={reviewsSort}
                      onChange={(e) => setReviewsSort(e.target.value)}
                    >
                      <option value="newest">Newest</option>
                      <option value="highest">Highest rating</option>
                      <option value="lowest">Lowest rating</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    {visibleReviews.map((review) => {
                      const isExpanded = expandedReviews.includes(review.id);
                      const canExpand = isReviewExpandable(review.comment);
                      return (
                        <div
                          key={review.id}
                          className={`flex items-start gap-4 border border-gray-100 rounded-2xl p-4 bg-white ${
                            canExpand ? "cursor-pointer hover:shadow-sm transition-all" : ""
                          }`}
                          onClick={() => toggleReview(review)}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-50 text-[#0B3B68] flex items-center justify-center font-bold shrink-0">
                            {review.avatar ? (
                              <img
                                src={review.avatar}
                                alt={review.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(review.name)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-[#0B3B68]">{review.name}</p>
                              <span className="text-xs text-gray-400">{review.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-yellow-600 text-xs font-bold mt-1">
                              <StarIcon className="w-4 h-4" /> {review.rating}
                            </div>
                            <p
                              className={`text-sm text-gray-600 mt-2 ${
                                canExpand && !isExpanded ? "line-clamp-2" : ""
                              }`}
                            >
                              {review.comment}
                            </p>
                            {canExpand && (
                              <span className="text-[11px] text-[#00AF91] font-semibold mt-2 inline-block">
                                {isExpanded ? "Show less" : "Read more"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visibleReviews.length < sortedReviews.length && (
                    <button
                      type="button"
                      onClick={loadMoreReviews}
                      className="w-full py-2.5 rounded-full border border-gray-200 text-sm font-bold text-[#0B3B68] hover:bg-white transition-all"
                    >
                      Load more
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors active:scale-90"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[#111] dark:text-white mb-2">Request Service</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-sm">
              Fill in details for <span className="text-[#00AF91] font-bold">{selectedWorkerName}</span>
            </p>

            <ServiceRequestContactLocationFields
              serviceType={selectedServiceType}
              onServiceTypeChange={setSelectedServiceType}
              workerServices={parseWorkerServices(worker)}
              contactNumber={contactNumber}
              city={serviceCity}
              barangay={serviceBarangay}
              address={serviceAddress}
              description={requestDescription}
              preferredDate={preferredDate}
              preferredTime={preferredTime}
              showValidationErrors={showRequestValidation}
              priceAgreementChecked={priceAgreementChecked}
              onPriceAgreementChange={setPriceAgreementChecked}
              onContactNumberChange={setContactNumber}
              onCityChange={setServiceCity}
              onBarangayChange={setServiceBarangay}
              onAddressChange={setServiceAddress}
              onDescriptionChange={setRequestDescription}
              onPreferredDateChange={setPreferredDate}
              onPreferredTimeChange={setPreferredTime}
              activeWorkerBookings={activeWorkerBookings}
            />

            <button
              className="w-full bg-[#00AF91] text-white py-3.5 rounded-full font-bold text-lg hover:bg-[#009b80] transition-all active:scale-[0.98] shadow-md shadow-[#00AF91]/20 flex items-center justify-center gap-2 group disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleSendRequest}
              disabled={isBookingSending}
            >
              {isBookingSending ? "Sending Request..." : "Send Request"}
              {!isBookingSending && <SearchIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="flex gap-2 items-start text-[11px] text-gray-500 dark:text-slate-400 mt-4 italic">
              <LockIcon className="w-3 h-3 mt-0.5" /> Security Tip: Contact details shared after worker confirms availability.
            </div>
          </div>
        </div>
      )}

      {isAlertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => setIsAlertOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 w-full max-w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-90 duration-300">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <LockIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wait a moment</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">{alertMessage}</p>
            <button
              className="w-full bg-[#0B3B68] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#154875] transition-all active:scale-95 shadow-lg shadow-blue-900/10 cursor-pointer"
              onClick={() => setIsAlertOpen(false)}
            >
              Okay, I will check
            </button>
          </div>
        </div>
      )}

      <ServiceRequestProofreadModal
        isOpen={isProofreadOpen}
        workerName={selectedWorkerName || worker.name}
        workerRole={selectedServiceType || worker.role}
        workerAvatar={worker.avatar}
        serviceType={selectedServiceType || worker.role}
        description={requestDescription}
        preferredDate={preferredDate}
        preferredTime={preferredTime}
        contactNumber={contactNumber}
        city={serviceCity}
        barangay={serviceBarangay}
        address={serviceAddress}
        isSubmitting={isBookingSending}
        onConfirm={() => void handleConfirmBookingSubmit()}
        onEdit={() => setIsProofreadOpen(false)}
        onClose={() => setIsProofreadOpen(false)}
      />

      <ServiceRequestSuccessModal
        isOpen={isSuccessOpen}
        location={submittedServiceLocation}
        contactNumber={submittedContactNumber}
        onClose={() => setIsSuccessOpen(false)}
        onViewRequests={() => {
          setIsSuccessOpen(false);
          navigate("/homeowner-bookings", { replace: true });
        }}
      />
    </div>
  );
}
