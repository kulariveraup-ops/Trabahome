// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Clock3, Mail, MapPin, MessageSquare, Phone, Star, X, Receipt, CheckCircle2, AlertCircle, FileText, Loader2, Hash } from "lucide-react";
import Navbar from "../components/requestpages/Navbar";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { readJsonCache, readJsonCacheStale, writeJsonCache } from "../services/pageCache.ts";
import { clearHomeownerSession, getHomeownerAuthToken, getHomeownerSession } from "../utils/homeownerAuth.ts";
import { useServiceRequestSync } from "../services/useServiceRequestSync.ts";
import { formatDateTime, formatScheduleDateTime, isScheduledTimeReached } from "../utils/formatDateTime.ts";
import BookingChatModal from "../components/chat/BookingChatModal.tsx";
import EReceiptModal from "../components/requestpages/EReceiptModal.tsx";
import { submitSupportTicket } from "../services/SupportApi.ts";
import BookingStatusBar from "../components/shared/BookingStatusBar.tsx";

const REVIEW_POSITIVE_TAGS = [
  "Friendly",
  "Good communication",
  "Helpful",
  "Reliable",
  "Responsive",
  "Professional",
  "Highly recommended",
];

const REVIEW_NEGATIVE_TAGS = [
  "Unresponsive",
  "Poor communication",
  "Late arrival",
  "Incomplete work",
  "Unprofessional",
  "Safety concerns",
  "Overpriced",
  "Not recommended",
];

const HOMEOWNER_CANCELLATION_TAGS = [
  "Change of schedule / plans",
  "Found another skilled worker",
  "Booked by mistake",
  "Price / budget constraint",
  "Problem already solved",
  "Worker unresponsive",
  "Other reason",
];

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || "http://localhost:8000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const TABS = ["Upcoming", "Ongoing", "Completed", "Cancelled"];
const BOOKINGS_CACHE_KEY = "trabahome_homeowner_bookings";
const BOOKINGS_CACHE_TTL_MS = 5 * 60 * 1000;

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Accepted: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-purple-50 text-purple-700 border-purple-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  Declined: "bg-rose-50 text-rose-700 border-rose-200",
};

const resolveMediaUrl = (value: unknown) => {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(image)) return image;
  if (image.startsWith("//")) return `https:${image}`;
  if (image.startsWith("/")) return `${API_ORIGIN}${image}`;
  return `${API_ORIGIN}/${image.replace(/^\/+/, "")}`;
};

const resolveBookingWorkerAvatar = (booking: any) => {
  const worker = booking?.worker || {};
  const workerId = String(booking?.workerId || booking?.targetWorkerId || worker?._id || worker?.id || "").trim();
  const avatar = resolveMediaUrl(
    booking?.workerAvatar ||
      booking?.workerProfileImage ||
      worker?.avatar ||
      worker?.profileImage ||
      worker?.profilePicture ||
      worker?.photoUrl ||
      worker?.image ||
      worker?.photo ||
      worker?.picture ||
      ""
  );

  return { workerId, avatar };
};

const normalizeStatus = (
  status: string,
  preferredDate?: unknown,
  preferredTime?: unknown,
  scheduledAt?: unknown
) => {
  const raw = String(status || "Pending").trim();
  const lower = raw.toLowerCase();
  if (lower === "completed") return "Completed";
  if (lower === "cancelled" || lower === "canceled") return "Cancelled";
  if (lower === "declined") return "Declined";
  if (lower === "pending") return "Pending";

  const isAcceptedOrOngoing =
    lower === "accepted" ||
    lower === "confirmed" ||
    lower === "ongoing" ||
    lower === "in progress" ||
    lower === "in_progress" ||
    lower === "inprogress";

  if (isAcceptedOrOngoing) {
    const timeReached = isScheduledTimeReached(preferredDate, preferredTime, scheduledAt);
    if (!timeReached) {
      return "Pending";
    }
    return "In Progress";
  }

  return raw;
};

const isBookingReviewed = (booking: any): boolean => {
  if (!booking) return false;
  return Boolean(
    booking.reviewedAt ||
    booking.isReviewed === true ||
    booking.reviewed === true ||
    (booking.reviewRating !== null && booking.reviewRating !== undefined && Number(booking.reviewRating) > 0) ||
    String(booking.reviewText || "").trim().length > 0 ||
    (Array.isArray(booking.reviewTags) && booking.reviewTags.length > 0)
  );
};

const renderActions = (booking: any) => {
  if (!booking) return [];
  const actions: { label: string; style: "primary" | "secondary"; nextStatus?: "CANCELLED" }[] = [];
  const reviewLocked = isBookingReviewed(booking);
  if (booking.status === "Pending") {
    if (booking.isAccepted) {
      actions.push({ label: "Request Cancellation", style: "secondary" });
    } else {
      actions.push({ label: "Cancel Request", style: "secondary", nextStatus: "CANCELLED" });
    }
  }
  if (booking.status === "Accepted") {
    actions.push({ label: "Request Cancellation", style: "secondary" });
  }
  if (booking.status === "In Progress") {
    actions.push({ label: "Request Cancellation", style: "secondary" });
  }
  if (booking.status === "Completed") {
    if (!reviewLocked) {
      actions.push({ label: "Leave Review (Required)", style: "primary" });
      actions.push({ label: "View E-Receipt & Proof of Work", style: "secondary" });
    } else {
      actions.push({ label: "View E-Receipt & Proof of Work", style: "primary" });
      actions.push({ label: "View Review", style: "secondary" });
    }
  }
  if (booking.status === "Cancelled" || booking.status === "Declined") {
    actions.push({ label: "Book Again", style: "primary" });
  }
  return actions;
};

export default function HomeownerBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const cachedBookings = readJsonCache<any[]>(BOOKINGS_CACHE_KEY, BOOKINGS_CACHE_TTL_MS) || [];
  const hasCachedBookings = cachedBookings.length > 0;
  const [bookings, setBookings] = useState(cachedBookings);
  const [isLoading, setIsLoading] = useState(!hasCachedBookings);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewModalMode, setReviewModalMode] = useState<"edit" | "view">("edit");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [bookingPendingCancellation, setBookingPendingCancellation] = useState<any>(null);
  const [cancelReasonTag, setCancelReasonTag] = useState<string>("");
  const [cancelExplanation, setCancelExplanation] = useState<string>("");
  const [cancelValidationError, setCancelValidationError] = useState<string>("");
  const [eReceiptBooking, setEReceiptBooking] = useState<any | null>(null);
  const [cancellationTicketBooking, setCancellationTicketBooking] = useState<any | null>(null);
  const [isRespondingReschedule, setIsRespondingReschedule] = useState<boolean>(false);

  const handleRescheduleResponse = async (bookingId: string, action: 'accept' | 'decline') => {
    setIsRespondingReschedule(true);
    try {
      const response = await homeownerAPI.respondReschedule(bookingId, action);
      const updatedReq = response?.request;
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id === bookingId) {
            return {
              ...b,
              preferredDate: updatedReq?.preferredDate || b.preferredDate,
              preferredTime: updatedReq?.preferredTime || b.preferredTime,
              scheduledAt: updatedReq?.scheduledAt
                ? formatScheduleDateTime(updatedReq.preferredDate, updatedReq.preferredTime, updatedReq.scheduledAt)
                : b.scheduledAt,
              rescheduleRequest: updatedReq?.rescheduleRequest || {
                ...b.rescheduleRequest,
                status: action === 'accept' ? 'accepted' : 'declined',
              },
            };
          }
          return b;
        })
      );
      if (selectedBooking && selectedBooking.id === bookingId) {
        setSelectedBooking((prev: any) =>
          prev
            ? {
                ...prev,
                preferredDate: updatedReq?.preferredDate || prev.preferredDate,
                preferredTime: updatedReq?.preferredTime || prev.preferredTime,
                scheduledAt: updatedReq?.scheduledAt
                  ? formatScheduleDateTime(updatedReq.preferredDate, updatedReq.preferredTime, updatedReq.scheduledAt)
                  : prev.scheduledAt,
                rescheduleRequest: updatedReq?.rescheduleRequest || {
                  ...prev.rescheduleRequest,
                  status: action === 'accept' ? 'accepted' : 'declined',
                },
              }
            : prev
        );
      }
      setErrorMessage(
        action === 'accept'
          ? 'New schedule confirmed successfully!'
          : 'Reschedule request was declined.'
      );
      setTimeout(() => setErrorMessage(''), 4000);
    } catch (err: any) {
      console.error('Failed to respond to reschedule:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to update schedule response.');
      setTimeout(() => setErrorMessage(''), 4000);
    } finally {
      setIsRespondingReschedule(false);
    }
  };
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancellationTicketSubmitting, setIsCancellationTicketSubmitting] = useState(false);
  const [cancellationTicketSuccess, setCancellationTicketSuccess] = useState(false);
  const [chatBooking, setChatBooking] = useState<any | null>(null);
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadVersionRef = useRef(0);
  const showWorkerContact = activeTab !== "Upcoming";
  useServiceRequestSync(getHomeownerAuthToken(), () => {
    void loadBookings();
  });

  const loadBookings = async () => {
    const loadId = ++loadVersionRef.current;
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const data = await homeownerAPI.listServiceRequests();
      if (loadId !== loadVersionRef.current) return;
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = items.map(normalizeBooking).filter(Boolean);
      if (loadId !== loadVersionRef.current) return;
      setBookings(normalized);
      writeJsonCache(BOOKINGS_CACHE_KEY, normalized);
    } catch (error: any) {
      if (loadId !== loadVersionRef.current) return;
      const status = error?.response?.status;
      if (status === 401) {
        clearHomeownerSession();
        setErrorMessage("Your homeowner session expired. Please sign in again.");
        navigate("/login", { replace: true });
        return;
      }
      setErrorMessage("Unable to load bookings.");
    } finally {
      if (loadId === loadVersionRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const handleOpenCancelModal = (booking: any) => {
    setBookingPendingCancellation(booking);
    setCancelReasonTag("");
    setCancelExplanation("");
    setCancelValidationError("");
  };

  const updateBookingStatus = async (
    booking: any,
    nextStatus: "COMPLETED" | "CANCELLED",
    reason?: string
  ) => {
    if (!booking?.id) return false;
    const resolvedReason = String(reason || "").trim();
    setSelectedBooking((current) =>
      current && current.id === booking.id
        ? {
            ...current,
            status: normalizeStatus(nextStatus),
            declineReason: resolvedReason || current.declineReason,
            cancelReason: resolvedReason || current.cancelReason,
            cancelledBy: "homeowner",
          }
        : current
    );
    setBookings((previous) => {
      const nextBookings = previous.map((item: any) =>
        item.id === booking.id
          ? {
              ...item,
              status: normalizeStatus(nextStatus),
              declineReason: resolvedReason || item.declineReason,
              cancelReason: resolvedReason || item.cancelReason,
              cancelledBy: "homeowner",
            }
          : item
      );
      writeJsonCache(BOOKINGS_CACHE_KEY, nextBookings);
      return nextBookings;
    });
    try {
      await homeownerAPI.updateServiceRequest(booking.id, {
        status: nextStatus,
        cancelReason: resolvedReason,
        declineReason: resolvedReason,
        notes: resolvedReason,
      });
      window.dispatchEvent(new Event('trabahome:service-request-changed'));
      if (nextStatus === "COMPLETED") {
        setActiveTab("Completed");
      }
      if (nextStatus === "CANCELLED") {
        setActiveTab("Cancelled");
      }
      return true;
    } catch (error) {
      console.error("Failed to update booking status", error);
      void loadBookings();
      return false;
    }
  };

  const confirmCancelRequest = async () => {
    if (!bookingPendingCancellation?.id || isCancelSubmitting) return;

    if (!cancelReasonTag) {
      setCancelValidationError("Please select a reason tag for cancellation.");
      return;
    }

    if (!cancelExplanation.trim()) {
      setCancelValidationError("Please provide an explanation for the cancellation.");
      return;
    }

    setCancelValidationError("");
    setIsCancelSubmitting(true);

    const combinedReason = `[${cancelReasonTag}] ${cancelExplanation.trim()}`;

    const wasUpdated = await updateBookingStatus(
      bookingPendingCancellation,
      "CANCELLED",
      combinedReason
    );
    setIsCancelSubmitting(false);
    if (wasUpdated) {
      setBookingPendingCancellation(null);
      setSelectedBooking(null);
    }
  };

  const handleOpenEReceiptModal = async (booking: any) => {
    const details = booking?.completionDetails;
    const hasFullProof = Array.isArray(details?.proofOfWork) &&
      details.proofOfWork.length > 0 &&
      details.proofOfWork[0] !== '[photo]';
    if (hasFullProof || !booking?.id) {
      setEReceiptBooking(booking);
      return;
    }
    try {
      const response = await homeownerAPI.getServiceRequest(booking.id || booking.requestNumber);
      const full = (response as any)?.request || (response as any)?.item || (response as any)?.data || response;
      if (full?.completionDetails) {
        setEReceiptBooking({
          ...booking,
          completionDetails: full.completionDetails,
        });
        return;
      }
    } catch (err) {
      console.warn("Failed to load full completion details:", err);
    }
    setEReceiptBooking(booking);
  };

  const bookAgain = (booking: any) => {
    const workerId = String(booking?.workerId || "").trim();
    if (!/^[0-9a-fA-F]{24}$/.test(workerId)) {
      setErrorMessage("Unable to reuse this booking because its worker is unavailable.");
      return;
    }

    navigate(`/profile/${workerId}`, {
      state: {
        worker: {
          id: workerId,
          name: booking.workerName,
          role: booking.serviceType,
          phone: booking.workerPhone,
          email: booking.workerEmail,
          image: booking.workerAvatar,
          city: booking.workerCity,
          barangay: booking.workerBarangay,
        },
        rebookDraft: {
          sourceRequestId: booking.id,
          targetWorkerId: workerId,
          serviceType: booking.serviceType,
          description: booking.notes || "",
          province: booking.province || "Pangasinan",
          city: booking.city || "",
          barangay: booking.barangay || "",
          location: booking.location || "",
          address: booking.address || "",
          contactNumber: booking.contactNumber || "",
          preferredDate: "",
          preferredTime: booking.preferredTime || "",
        },
      },
    });
  };

  const openReviewModal = (booking: any) => {
    if (!booking?.id) return;
    const locked = isBookingReviewed(booking);
    setSelectedBooking(booking);
    setReviewRating(Number(booking.reviewRating || booking.rating || 5) || 5);
    setReviewText(String(booking.reviewText || ""));
    setReviewTags(Array.isArray(booking.reviewTags) ? booking.reviewTags : []);
    setReviewError("");
    setReviewModalMode(locked ? "view" : "edit");
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedBooking?.id) return;
    setReviewError("");
    const nextRating = Math.min(5, Math.max(1, Number(reviewRating) || 0));
    const nextReview = String(reviewText || "").trim();
    if (!nextRating) {
      setReviewError("Please select a rating.");
      return;
    }
    if (reviewTags.length === 0) {
      setReviewError("Please select at least one tag describing your experience.");
      return;
    }

    setIsReviewSubmitting(true);
    try {
      const response = await homeownerAPI.submitServiceRequestReview(selectedBooking.id, {
        rating: nextRating,
        reviewText: nextReview,
        reviewTags,
      });
      const updated = response?.request;
      setBookings((previous) => {
        const nextBookings = previous.map((item: any) =>
          item.id === selectedBooking.id
            ? {
                ...item,
                reviewRating: updated?.reviewRating ?? nextRating,
                reviewText: updated?.reviewText ?? nextReview,
                reviewTags: updated?.reviewTags ?? reviewTags,
                reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
              }
            : item
        );
        writeJsonCache(BOOKINGS_CACHE_KEY, nextBookings);
        return nextBookings;
      });
      setSelectedBooking((current) =>
        current && current.id === selectedBooking.id
          ? {
              ...current,
              reviewRating: updated?.reviewRating ?? nextRating,
              reviewText: updated?.reviewText ?? nextReview,
              reviewTags: updated?.reviewTags ?? reviewTags,
              reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
            }
          : current
      );
      window.dispatchEvent(new Event('trabahome:service-request-changed'));
      setReviewModalMode("view");
      setIsReviewModalOpen(false);
      setActiveTab("Completed");
      const bookingForReceipt = {
        ...selectedBooking,
        reviewRating: updated?.reviewRating ?? nextRating,
        reviewText: updated?.reviewText ?? nextReview,
        reviewTags: updated?.reviewTags ?? reviewTags,
        reviewedAt: updated?.reviewedAt ?? new Date().toISOString(),
        completionDetails: updated?.completionDetails || selectedBooking.completionDetails,
      };
      void handleOpenEReceiptModal(bookingForReceipt);
    } catch (error: any) {
      console.error("Failed to submit review", error);
      setReviewError(error?.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleRequestCancellation = (booking: any) => {
    setCancellationTicketBooking(booking);
    setCancellationReason("");
    setCancellationTicketSuccess(false);
  };

  const submitCancellationSupportTicket = async () => {
    if (!cancellationTicketBooking?.id || isCancellationTicketSubmitting) return;
    if (!cancellationReason.trim()) return;

    setIsCancellationTicketSubmitting(true);
    try {
      const token = getHomeownerAuthToken();
      const session = getHomeownerSession();
      const homeowner = session?.homeowner || {};
      const resolvedName = [homeowner.firstName, homeowner.lastName].filter(Boolean).join(" ").trim() || homeowner.name || "Homeowner";
      const resolvedEmail = session?.email || homeowner.email || "";

      await submitSupportTicket(token, {
        name: resolvedName,
        email: resolvedEmail,
        issueCategory: "Booking Issue",
        message: `Booking Cancellation Request for Reference: #${cancellationTicketBooking.requestNumber || cancellationTicketBooking.id}\nWorker: ${cancellationTicketBooking.workerName}\nService: ${cancellationTicketBooking.serviceType}\nScheduled: ${cancellationTicketBooking.scheduledAt || "Not specified"}\nLocation: ${cancellationTicketBooking.location || "Not specified"}\n\nReason for Cancellation Request:\n${cancellationReason.trim()}`,
      });

      setCancellationTicketSuccess(true);
    } catch (error) {
      console.error("Failed to submit cancellation ticket:", error);
      alert("Unable to submit cancellation request support ticket. Please try again or contact Help.");
    } finally {
      setIsCancellationTicketSubmitting(false);
    }
  };

  const handleRatingChange = (starValue: number) => {
    const wasLow = reviewRating <= 2;
    const isNowLow = starValue <= 2;
    setReviewRating(starValue);
    if (wasLow !== isNowLow) {
      setReviewTags([]);
    }
  };

  const renderReviewStars = (value: number, interactive = false) =>
    Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= value;

      return (
        <button
          key={starValue}
          type="button"
          disabled={!interactive}
          onClick={() => {
            if (interactive) handleRatingChange(starValue);
          }}
          className={`transition-transform ${interactive ? "hover:scale-110" : "cursor-default"}`}
          aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 ${
              isFilled ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
            }`}
          />
        </button>
      );
    });

  const normalizeBooking = (item: any) => {
    if (!item) return null;
    const id = item.id || item.bookingId || item._id;
    if (!id) return null;
    const worker = item.worker || {};
    const { workerId, avatar: resolvedAvatar } = resolveBookingWorkerAvatar(item);
    const rawStatus = String(item.status || item.bookingStatus || "Pending").trim();
    const isAccepted = Boolean(
      item.acceptedOn ||
      item.acceptedAt ||
      ["accepted", "confirmed", "ongoing", "in progress", "in_progress", "inprogress", "completed"].includes(
        rawStatus.toLowerCase()
      )
    );
    const scheduledAt =
      formatScheduleDateTime(
        item.preferredDate,
        item.preferredTime,
        item.scheduledAt || item.scheduleDate || item.dateTime || item.datetime || item.createdAt
      ) || "";
    const status = normalizeStatus(
      rawStatus,
      item.preferredDate,
      item.preferredTime,
      item.scheduledAt || item.scheduleDate || item.dateTime || item.datetime || item.createdAt
    );
    const requestSentAt = formatDateTime(item.createdAt || item.requestSentAt || "");
    const workerLocation =
      item.workerLocation ||
      [worker.barangay, worker.city].filter(Boolean).join(", ") ||
      "";
  return {
    id,
    requestNumber: String(item.requestNumber || item.id || item.bookingNumber || item._id || ""),
    workerId,
    workerName:
        item.workerName || worker.name || worker.fullName || worker.firstName || "Worker",
      workerPhone: item.workerPhone || worker.phone || worker.mobileNumber || "",
      workerEmail: item.workerEmail || worker.email || "",
      workerAvatar: resolvedAvatar,
      workerCity: item.workerCity || worker.city || "",
      workerBarangay: item.workerBarangay || worker.barangay || "",
      workerLocation,
      rating: typeof item.rating === "number" ? item.rating : Number(item.rating || 0),
      serviceType: item.serviceType || item.service || item.category || "Service",
      preferredDate: item.preferredDate || "",
      preferredTime: item.preferredTime || "",
      scheduledAt,
      requestSentAt,
      contactNumber: item.contactNumber || "",
      province: item.province || "",
      city: item.city || "",
      barangay: item.barangay || "",
      location:
        item.location ||
        [item.barangay, item.city, item.province].filter(Boolean).join(", ") ||
        "",
      address: item.address || item.serviceAddress || "",
      notes: item.notes || item.note || item.description || "",
      photos: Array.isArray(item.photos) ? item.photos : Array.isArray(item.attachments) ? item.attachments : [],
      status,
      rawStatus,
      isAccepted,
      acceptedOn: item.acceptedOn || null,
      cancelledBy: item.cancelledBy || item.cancelled_by || null,
      declineReason: item.declineReason || "",
      reviewRating: item.reviewRating ?? null,
      reviewText: item.reviewText || "",
      reviewTags: Array.isArray(item.reviewTags) ? item.reviewTags : [],
      reviewedAt: item.reviewedAt || null,
      completionDetails: item.completionDetails || null,
      estimatedStartingCost: item.estimatedStartingCost ?? null,
      rescheduleRequest: item.rescheduleRequest ?? null,
      createdAt: requestSentAt,
      updatedAt: item.updatedAt || "",
    };
  };

  useEffect(() => {
    void loadBookings();
    const handleChanged = () => {
      void loadBookings();
    };
    window.addEventListener('trabahome:service-request-changed', handleChanged);
    return () => {
      window.removeEventListener('trabahome:service-request-changed', handleChanged);
    };
  }, [navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const reviewBookingId = searchParams.get("reviewBookingId") || (location.state as any)?.reviewBookingId;

    if (tabParam && TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const openRequestId = reviewBookingId || (location.state as any)?.openRequestId;
    if (!openRequestId || bookings.length === 0) return;
    const targetStr = String(openRequestId).trim();
    const matched = bookings.find(
      (item: any) =>
        String(item.id).trim() === targetStr ||
        String(item.requestNumber || "").trim() === targetStr
    );
    if (matched) {
      setSelectedBooking(matched);
      if (["Accepted", "In Progress"].includes(matched.status)) {
        setActiveTab("Ongoing");
      } else if (matched.status === "Pending") {
        setActiveTab("Upcoming");
      } else if (matched.status === "Completed") {
        setActiveTab("Completed");
        if (reviewBookingId && !isBookingReviewed(matched)) {
          openReviewModal(matched);
        }
      } else if (["Cancelled", "Declined"].includes(matched.status)) {
        setActiveTab("Cancelled");
      }
      navigate(tabParam ? `/homeowner-bookings?tab=${tabParam}` : "/homeowner-bookings", { replace: true, state: {} });
    }
  }, [bookings, location.search, location.state, navigate]);

  const unreviewedCompletedBookings = useMemo(() => {
    return bookings.filter((b: any) => {
      const isCompleted = normalizeStatus(b.status) === "Completed";
      return isCompleted && !isBookingReviewed(b);
    });
  }, [bookings]);

  const activeBooking = selectedBooking
    ? bookings.find((item: any) => String(item.id) === String(selectedBooking.id)) || selectedBooking
    : null;

  useEffect(() => {
    if (!activeBooking) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedBooking(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBooking]);

  const visibleBookings = useMemo(() => {
    return bookings.filter((booking: any) => {
      if (activeTab === "Ongoing") {
        return ["Accepted", "In Progress"].includes(booking.status);
      }
      if (activeTab === "Upcoming") {
        return booking.status === "Pending";
      }
      if (activeTab === "Completed") {
        return booking.status === "Completed";
      }
      if (activeTab === "Cancelled") {
        return ["Cancelled", "Declined"].includes(booking.status);
      }
      return false;
    });
  }, [activeTab, bookings]);

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 md:p-10">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors mb-6 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B3B68]">My Bookings</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Track all your requests and worker appointments.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-[#0B3B68] text-white border-[#0B3B68]"
                    : "bg-white text-[#0B3B68] border-[#0B3B68]/30 hover:bg-[#0B3B68]/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="mb-6 px-4 py-2 rounded-full text-xs font-semibold inline-flex bg-red-50 text-red-600 border border-red-100">
              {errorMessage}
            </div>
          )}

          {unreviewedCompletedBookings.length > 0 && (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      Action Required
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                      Leave a Review
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {unreviewedCompletedBookings.length === 1
                      ? `Your booking with ${unreviewedCompletedBookings[0].workerName} has been completed. Please leave a review to share your feedback.`
                      : `You have ${unreviewedCompletedBookings.length} completed bookings waiting for your review. Please submit your feedback.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("Completed");
                  openReviewModal(unreviewedCompletedBookings[0]);
                }}
                className="px-4 py-2 bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
              >
                Leave Review Now
              </button>
            </div>
          )}

          <div className="space-y-4">
            {isLoading && (
              <div className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                Loading bookings...
              </div>
            )}

            {!isLoading && visibleBookings.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                No bookings in this category yet.
              </div>
            )}

            {visibleBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-100 rounded-2xl p-5 shadow-[0_6px_18px_rgba(11,59,104,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(11,59,104,0.08)]"
              >
                <div className="flex items-start gap-4 min-w-0">
                <div className="h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                    {resolveBookingWorkerAvatar(booking).avatar ? (
                      <img
                        src={resolveBookingWorkerAvatar(booking).avatar}
                        alt={booking.workerName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-[#0B3B68]/5 text-[#0B3B68] font-bold">
                        {(booking.workerName || "W").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
                        Request
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D6EFE8] text-[#00AF91] border border-[#BDE5DB]">
                        {booking.serviceType}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#0B3B68] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                        <Hash className="w-3 h-3 text-blue-500" />
                        #{booking.requestNumber || booking.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0B3B68] truncate">{booking.workerName}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5 text-[#0B3B68]" />
                        <span>{booking.requestSentAt || "Just now"}</span>
                      </span>
                      {booking.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#0B3B68]" />
                          <span className="truncate">
                            {booking.location}
                          </span>
                        </span>
                      )}
                    </div>

                    {(showWorkerContact || booking.isAccepted) && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {booking.workerPhone && (
                          <a
                            href={`tel:${String(booking.workerPhone).replace(/\s+/g, "")}`}
                            className="inline-flex items-center gap-1.5 hover:text-[#0B3B68] hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5 text-[#0B3B68]" />
                            <span>{booking.workerPhone}</span>
                          </a>
                        )}
                        {booking.workerEmail && (
                          <a
                            href={`mailto:${booking.workerEmail}`}
                            className="inline-flex items-center gap-1.5 hover:text-[#0B3B68] hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5 text-[#0B3B68]" />
                            <span className="truncate">{booking.workerEmail}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {booking.scheduledAt && (
                      <p className="text-xs text-gray-400">
                        Scheduled for <span className="font-semibold text-gray-600">{booking.scheduledAt}</span>
                      </p>
                    )}

                    {booking.estimatedStartingCost && (
                      <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <span>Est. Starting Cost:</span>
                        <span className="font-bold">₱{Number(booking.estimatedStartingCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </p>
                    )}

                    {booking.rescheduleRequest?.status === "pending" && (
                      <div className="mt-3 p-3.5 rounded-2xl border border-amber-200 bg-amber-50/90 text-left space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Clock3 className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Worker Proposed New Schedule</span>
                        </div>
                        <p className="text-xs text-amber-900 font-medium">
                          Suggested: <span className="font-bold">{booking.rescheduleRequest.proposedDate} at {booking.rescheduleRequest.proposedTime}</span>
                        </p>
                        {booking.rescheduleRequest.reason && (
                          <p className="text-[11px] text-amber-700 italic">
                            Reason: "{booking.rescheduleRequest.reason}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isRespondingReschedule}
                            onClick={() => handleRescheduleResponse(booking.id, "decline")}
                            className="px-3.5 py-1.5 rounded-full text-xs font-bold border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={isRespondingReschedule}
                            onClick={() => handleRescheduleResponse(booking.id, "accept")}
                            className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#00AF91] text-white hover:bg-[#00967d] shadow-sm transition-colors cursor-pointer"
                          >
                            Accept New Schedule
                          </button>
                        </div>
                      </div>
                    )}

                    {(booking.status === "Cancelled" || booking.status === "Declined") && (
                      <p className="text-xs text-rose-500">
                        {booking.cancelledBy === "homeowner"
                          ? "Cancelled by you"
                          : booking.cancelledBy === "worker"
                          ? "Cancelled by worker"
                          : booking.status === "Declined"
                          ? "Declined by worker"
                          : "Cancelled"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap ${
                      STATUS_STYLES[booking.status] || "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {booking.status}
                  </span>
                  {booking.status === "Completed" && (
                    !isBookingReviewed(booking) ? (
                      <button
                        type="button"
                        onClick={() => openReviewModal(booking)}
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0B3B68] hover:bg-[#082d50] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Leave Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleOpenEReceiptModal(booking)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#00AF91] border border-[#00AF91]/40 hover:bg-[#00AF91] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        E-Receipt
                      </button>
                    )
                  )}
                  {(booking.isAccepted || booking.status !== "Pending") && booking.status !== "Cancelled" && booking.status !== "Declined" && (
                    <button
                      type="button"
                      onClick={() => setChatBooking(booking)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#00AF91] border border-[#00AF91]/40 hover:bg-[#00AF91] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {activeBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white w-full max-w-[94vw] sm:max-w-lg md:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] sm:max-h-[86vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  Booking Details
                  <span className="font-mono text-[10px] font-bold text-[#0B3B68] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 normal-case">
                    #{activeBooking.requestNumber || activeBooking.id}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-[#0B3B68] truncate">
                    {activeBooking.workerName}
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D6EFE8] text-[#00AF91] border border-[#BDE5DB] shrink-0">
                    {activeBooking.serviceType}
                  </span>
                  {Boolean(activeBooking.rating) && (
                    <span className="text-[#0B3B68] font-semibold text-xs flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      {activeBooking.rating?.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-2 -mr-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                title="Close"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="px-5 sm:px-6 py-5 overflow-y-auto flex-1 space-y-5 text-left overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-transparent">
              {activeBooking.status === "Completed" && (
                !isBookingReviewed(activeBooking) ? (
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full mb-1 border border-amber-300">
                          ★ Review Required
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                          This service request is completed
                        </h4>
                        <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                          You are required to submit a review to share feedback and close out your booking.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openReviewModal(activeBooking)}
                      className="px-4 py-2 bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                    >
                      Leave Review Now
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
                      </div>
                      <div>
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mb-1 border border-emerald-300">
                          ✓ Review Submitted
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                          Thank you for your feedback!
                        </h4>
                        <p className="text-[11px] sm:text-xs text-gray-600 mt-0.5">
                          You rated this service {activeBooking.reviewRating ? `${activeBooking.reviewRating} / 5 stars` : 'and submitted a review'}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openReviewModal(activeBooking)}
                      className="px-4 py-2 bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                    >
                      View Review
                    </button>
                  </div>
                )
              )}

              {/* Booking Progress Status Bar */}
              <BookingStatusBar
                status={activeBooking.status}
                rawStatus={activeBooking.rawStatus}
                role="homeowner"
                preferredDate={activeBooking.preferredDate}
                preferredTime={activeBooking.preferredTime}
                scheduledAt={activeBooking.scheduledAt}
                acceptedOn={activeBooking.acceptedOn}
                isAccepted={activeBooking.isAccepted}
                declineReason={activeBooking.declineReason}
              />

              {/* Worker Information */}
              <div className="rounded-2xl border border-[#0B3B68]/10 bg-[#F8FBFF] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Worker Information
                </p>
                {(activeBooking.isAccepted || ["Accepted", "In Progress", "Completed"].includes(activeBooking.status)) ? (
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0 shadow-sm">
                      {resolveBookingWorkerAvatar(activeBooking).avatar ? (
                        <img
                          src={resolveBookingWorkerAvatar(activeBooking).avatar}
                          alt={activeBooking.workerName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-[#0B3B68]/5 text-[#0B3B68] font-bold">
                          {(activeBooking.workerName || "W").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5 text-sm text-gray-600">
                      <p className="font-semibold text-[#0B3B68] text-base">{activeBooking.workerName}</p>
                      <p className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="font-medium text-gray-500">Phone number:</span>
                        {activeBooking.workerPhone ? (
                          <a
                            href={`tel:${String(activeBooking.workerPhone).replace(/\s+/g, "")}`}
                            className="font-semibold text-[#0B3B68] hover:underline"
                          >
                            {activeBooking.workerPhone}
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-700">Not provided</span>
                        )}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <span className="font-medium text-gray-500">Email:</span>
                        {activeBooking.workerEmail ? (
                          <a
                            href={`mailto:${activeBooking.workerEmail}`}
                            className="font-semibold text-[#0B3B68] hover:underline"
                          >
                            {activeBooking.workerEmail}
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-700">Not provided</span>
                        )}
                      </p>
                      {(activeBooking.workerCity || activeBooking.workerBarangay) && (
                        <p className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="font-medium text-gray-500">Location:</span>
                          <span className="font-semibold text-gray-700">
                            {[activeBooking.workerBarangay, activeBooking.workerCity].filter(Boolean).join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">
                    Worker contact details will appear here after the job is accepted.
                  </p>
                )}
              </div>

              {/* Reschedule Proposal Prompt */}
              {activeBooking.rescheduleRequest?.status === "pending" && (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-left space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Clock3 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Worker Requested Schedule Change</span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium">
                    New Proposed Schedule: <span className="font-bold">{activeBooking.rescheduleRequest.proposedDate} at {activeBooking.rescheduleRequest.proposedTime}</span>
                  </p>
                  {activeBooking.rescheduleRequest.reason && (
                    <p className="text-[11px] text-amber-700 italic">
                      Reason: "{activeBooking.rescheduleRequest.reason}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isRespondingReschedule}
                      onClick={() => handleRescheduleResponse(activeBooking.id, "decline")}
                      className="px-4 py-2 rounded-full text-xs font-bold border border-red-300 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      Decline Change
                    </button>
                    <button
                      type="button"
                      disabled={isRespondingReschedule}
                      onClick={() => handleRescheduleResponse(activeBooking.id, "accept")}
                      className="px-5 py-2 rounded-full text-xs font-bold bg-[#00AF91] text-white hover:bg-[#00967d] shadow-sm transition-colors cursor-pointer"
                    >
                      Accept New Schedule
                    </button>
                  </div>
                </div>
              )}

              {/* Booking Attributes */}
              <div className="space-y-2.5 text-xs sm:text-sm text-gray-600 bg-gray-50/60 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span>Booking ID</span>
                  <span className="font-semibold text-[#0B3B68]">{activeBooking.requestNumber || activeBooking.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Date &amp; Time</span>
                  <span className="font-semibold text-[#0B3B68]">
                    {formatScheduleDateTime(activeBooking.preferredDate, activeBooking.preferredTime, activeBooking.scheduledAt) || "Not specified"}
                  </span>
                </div>
                {activeBooking.estimatedStartingCost && (
                  <div className="flex items-center justify-between">
                    <span>Est. Starting Cost</span>
                    <span className="font-bold text-emerald-700">
                      ₱{Number(activeBooking.estimatedStartingCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {activeBooking.location && (
                  <div className="flex items-center justify-between">
                    <span>Service Location</span>
                    <span className="font-semibold text-[#0B3B68]">{activeBooking.location}</span>
                  </div>
                )}
                {activeBooking.address && (
                  <div className="flex items-center justify-between gap-6">
                    <span className="shrink-0">Specific Address</span>
                    <span className="text-right font-semibold text-[#0B3B68]">{activeBooking.address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Contact Number</span>
                  <span className="font-semibold text-[#0B3B68]">{activeBooking.contactNumber || "Not specified"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span
                    className={`inline-flex items-center justify-center px-3 py-0.5 rounded-full text-xs font-semibold border ${
                      STATUS_STYLES[activeBooking.status] ||
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {activeBooking.status}
                  </span>
                </div>
                {["Cancelled", "Declined"].includes(activeBooking.status) &&
                  String(activeBooking.declineReason || "").trim() && (
                    <div className="flex items-start justify-between gap-6">
                      <span className="shrink-0">Reason</span>
                      <span className="max-w-xs text-right font-semibold text-[#0B3B68]">
                        {activeBooking.declineReason}
                      </span>
                    </div>
                  )}
              </div>

              {/* Notes & Attachments */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                    {activeBooking.notes || "No notes provided."}
                  </p>
                </div>
                {activeBooking.photos?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Photos</p>
                    <div className="mt-1.5 flex flex-wrap gap-2.5">
                      {activeBooking.photos.map((photo: string) => (
                        <img
                          key={photo}
                          src={photo}
                          alt="Attachment"
                          className="h-16 w-16 rounded-xl object-cover border border-gray-200 shadow-xs"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {(activeBooking.isAccepted || activeBooking.status !== "Pending") && activeBooking.status !== "Cancelled" && activeBooking.status !== "Declined" && (
                  <button
                    type="button"
                    onClick={() => setChatBooking(activeBooking)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-[#00AF91] text-white hover:bg-[#00967d] shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Chat with Local Skilled Worker
                  </button>
                )}

                {renderActions(activeBooking).map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      if (action.nextStatus) {
                        handleOpenCancelModal(activeBooking);
                        return;
                      }
                      if (action.label === "Request Cancellation") {
                        handleRequestCancellation(activeBooking);
                        return;
                      }
                      if (action.label === "View E-Receipt & Proof of Work") {
                        void handleOpenEReceiptModal(activeBooking);
                        return;
                      }
                      if (action.label === "Book Again") {
                        bookAgain(activeBooking);
                        return;
                      }
                      if (action.label === "Contact Worker") {
                        const phone = String(activeBooking.workerPhone || "").replace(/\s+/g, "");
                        if (phone) {
                          window.location.href = `tel:${phone}`;
                          return;
                        }
                        if (activeBooking.workerEmail) {
                          window.location.href = `mailto:${activeBooking.workerEmail}`;
                        }
                        return;
                      }
                      if (action.label.includes("Review")) {
                        openReviewModal(activeBooking);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      action.style === "primary"
                        ? "bg-[#0B3B68] text-white hover:bg-[#082d50]"
                        : "border border-[#0B3B68]/40 text-[#0B3B68] hover:bg-[#0B3B68] hover:text-white"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="w-full px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-100/70 transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {chatBooking && (
        <BookingChatModal
          isOpen={Boolean(chatBooking)}
          onClose={() => setChatBooking(null)}
          requestId={chatBooking.id || chatBooking.requestNumber}
          requestNumber={chatBooking.requestNumber || chatBooking.id}
          serviceType={chatBooking.serviceType}
          otherPartyName={chatBooking.workerName || "Local Skilled Worker"}
          otherPartyRole="Local Skilled Worker"
          otherPartyAvatar={resolveBookingWorkerAvatar(chatBooking).avatar}
          currentRole="homeowner"
          bookingStatus={chatBooking.status}
          rawStatus={chatBooking.rawStatus}
          isAccepted={chatBooking.isAccepted}
          acceptedOn={chatBooking.acceptedOn}
          readOnly={chatBooking.status === "Completed"}
        />
      )}

      {bookingPendingCancellation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl text-left max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Pending Booking
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                    Cancel Service Request
                  </h3>
                  <p className="text-xs text-gray-500">
                    This request has not yet been accepted by the skilled worker.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingPendingCancellation(null)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Booking Info Card */}
            <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase text-[10px]">Booking Reference</span>
                <span className="font-mono font-bold text-[#0B3B68] bg-white px-2 py-0.5 rounded border border-gray-200">
                  #{bookingPendingCancellation.requestNumber || bookingPendingCancellation.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-gray-400 text-[10px] block">Worker</span>
                  <strong className="text-gray-900">{bookingPendingCancellation.workerName}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Service</span>
                  <strong className="text-[#00AF91]">{bookingPendingCancellation.serviceType}</strong>
                </div>
              </div>
            </div>

            {/* Validation Error Message */}
            {cancelValidationError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{cancelValidationError}</span>
              </div>
            )}

            {/* Section 1: Select Reason Tagging (Mandatory) */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Reason for Cancellation <span className="text-rose-500">* (Select tag)</span>
                </label>
                {cancelReasonTag && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ✓ {cancelReasonTag}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {HOMEOWNER_CANCELLATION_TAGS.map((tag) => {
                  const isSelected = cancelReasonTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setCancelReasonTag(tag);
                        setCancelValidationError("");
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#0B3B68] text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60"
                      }`}
                    >
                      {isSelected ? "✓ " : "+ "}{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Explanation (Mandatory) */}
            <div className="mt-5 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Explanation of Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelExplanation}
                onChange={(e) => {
                  setCancelExplanation(e.target.value);
                  setCancelValidationError("");
                }}
                placeholder="Please describe why you are cancelling this service request..."
                className="w-full p-3 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68] transition"
              />
              <p className="text-[10px] text-gray-400">
                This explanation will be shared with the worker and documented on the cancellation record.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={isCancelSubmitting}
                onClick={() => setBookingPendingCancellation(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Keep Request
              </button>
              <button
                type="button"
                disabled={isCancelSubmitting || !cancelReasonTag || !cancelExplanation.trim()}
                onClick={() => void confirmCancelRequest()}
                className="flex-1 py-3 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCancelSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  "Confirm Cancellation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReviewModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full mb-1 border border-amber-300">
                  {reviewModalMode === "view" ? "Verified Review" : "★ Review Required"}
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {reviewModalMode === "view" ? "Your Review" : "Leave Review"}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">{selectedBooking.workerName}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedBooking.serviceType}</p>
                {reviewModalMode === "edit" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium mt-2">
                    Please submit a rating (1-5 stars) and select at least one experience tag to complete your review.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewModalMode("edit");
                }}
                className="p-1.5 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Your Rating</p>
              <div className="flex items-center gap-2">
                {renderReviewStars(reviewRating, reviewModalMode === "edit")}
              </div>
            </div>

            {/* Tag Selection - Mandatory */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
                  Select Tags {reviewModalMode === "edit" && <span className="text-rose-500">* (At least 1 required)</span>}
                </label>
                {reviewModalMode === "edit" && (
                  <span className="text-[11px] text-gray-400">
                    {reviewTags.length} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(reviewModalMode === "view"
                  ? (reviewTags.length > 0 ? reviewTags : ["No tags selected"])
                  : (reviewRating <= 2 ? REVIEW_NEGATIVE_TAGS : REVIEW_POSITIVE_TAGS)
                ).map((tag) => {
                  const isSelected = reviewTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={reviewModalMode === "view"}
                      onClick={() => {
                        if (reviewModalMode === "view") return;
                        setReviewError("");
                        setReviewTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-[#0B3B68] text-white shadow-xs"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200/60"
                      } ${reviewModalMode === "view" ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {isSelected ? "✓ " : "+ "}{tag}
                    </button>
                  );
                })}
              </div>
              {reviewError && (
                <p className="mt-2 text-xs text-rose-600 font-medium">{reviewError}</p>
              )}
            </div>

            <div className="mt-6">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Feedback / Comments (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                disabled={reviewModalMode === "view"}
                rows={4}
                placeholder="Tell us how the service went (optional)..."
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-[#0B3B68] disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setReviewModalMode("edit");
                }}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                  reviewModalMode === "view"
                    ? "w-full bg-[#0B3B68] text-white hover:bg-[#082d50] border-transparent shadow-xs"
                    : "flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {reviewModalMode === "view" ? "Close" : "Cancel"}
              </button>
              {reviewModalMode === "edit" && (
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={isReviewSubmitting || reviewRating <= 0 || reviewTags.length === 0}
                  className="flex-1 rounded-2xl bg-[#0B3B68] px-4 py-3 text-sm font-semibold text-white hover:bg-[#082d50] disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isReviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Ticket Modal for Accepted Bookings */}
      {cancellationTicketBooking && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 sm:p-8 shadow-2xl text-left animate-in zoom-in-95 duration-200">
            {cancellationTicketSuccess ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Cancellation Request Submitted</h3>
                <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                  Your cancellation request for booking <strong>#{cancellationTicketBooking.requestNumber || cancellationTicketBooking.id}</strong> has been submitted to Trabahome Admin as a support ticket.
                </p>
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 text-xs text-blue-800 text-left">
                  <p className="font-semibold mb-1">What happens next?</p>
                  <p className="text-gray-600 leading-relaxed">
                    Our admin team will review your request and coordinates with the worker. Please allow up to 24 hours for review. You can track this in <strong>Help &gt; Support Tickets</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCancellationTicketBooking(null);
                    setCancellationTicketSuccess(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#0B3B68] text-white text-sm font-bold hover:bg-[#082d50] transition cursor-pointer"
                >
                  Understood
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Requires Admin Approval
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-2">Request Booking Cancellation</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Accepted bookings cannot be directly cancelled. A support ticket will be sent to Admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCancellationTicketBooking(null)}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase font-bold text-[10px]">Booking Ref</span>
                    <span className="font-bold text-[#0B3B68]">#{cancellationTicketBooking.requestNumber || cancellationTicketBooking.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase font-bold text-[10px]">Worker</span>
                    <span className="font-semibold text-gray-800">{cancellationTicketBooking.workerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase font-bold text-[10px]">Service</span>
                    <span className="font-semibold text-[#00AF91]">{cancellationTicketBooking.serviceType}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Reason for Cancellation <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please explain why you need to cancel this accepted booking..."
                    className="w-full p-3 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#0B3B68] focus:ring-1 focus:ring-[#0B3B68]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCancellationTicketSubmitting}
                    onClick={() => setCancellationTicketBooking(null)}
                    className="flex-1 py-3 rounded-2xl border border-gray-200 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isCancellationTicketSubmitting || !cancellationReason.trim()}
                    onClick={() => void submitCancellationSupportTicket()}
                    className="flex-1 py-3 rounded-2xl bg-rose-600 text-white text-xs sm:text-sm font-bold hover:bg-rose-700 transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isCancellationTicketSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* E-Receipt Modal */}
      {eReceiptBooking && (
        <EReceiptModal
          isOpen={Boolean(eReceiptBooking)}
          onClose={() => setEReceiptBooking(null)}
          booking={{
            requestNumber: eReceiptBooking.requestNumber || eReceiptBooking.id,
            id: eReceiptBooking.id,
            workerName: eReceiptBooking.workerName,
            homeownerName: "You",
            serviceType: eReceiptBooking.serviceType,
            completedAt: eReceiptBooking.scheduledAt,
            location: eReceiptBooking.location,
            completionDetails: eReceiptBooking.completionDetails,
          }}
        />
      )}
    </div>
  );
}
