// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  Mail,
  MapPin,
  Phone,
  Briefcase,
  Calendar,
  Star,
  Lock,
  User,
} from "lucide-react";
import { getHomeownerSession, saveHomeownerSession } from "../utils/homeownerAuth.ts";
import { getWorkerSession } from "../utils/workerAuth.ts";
import { getAdminSession } from "../utils/adminAuth.ts";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { workerAPI } from "../services/WorkerApi.ts";
import { adminAPI } from "../services/AdminApi.ts";
import { SUPPORT_ISSUE_CATEGORIES, submitSupportTicket } from "../services/SupportApi.ts";
import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import Navbar from "../components/requestpages/Navbar";

const buildSnapshot = (values: {
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  city?: string;
  barangay?: string;
  photoPreview?: string;
}) => ({
  firstName: String(values.firstName ?? "").trim(),
  lastName: String(values.lastName ?? "").trim(),
  mobileNumber: String(values.mobileNumber ?? "").trim(),
  city: String(values.city ?? "").trim(),
  barangay: String(values.barangay ?? "").trim(),
  photoPreview: String(values.photoPreview ?? "").trim(),
});

const formatDate = (value) => {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

const normalizeRequests = (items = []) =>
  items.map((item) => ({
    id: String(item?.id || item?.requestNumber || item?._id || ""),
    requestNumber: String(item?.requestNumber || item?.id || item?._id || ""),
    serviceType: String(item?.serviceType || "General Repair"),
    status: String(item?.status || "PENDING"),
    description: String(item?.description || ""),
    preferredDate: item?.preferredDate || null,
    preferredTime: String(item?.preferredTime || ""),
    contactNumber: String(item?.contactNumber || ""),
    location: String(item?.location || ""),
    address: String(item?.address || ""),
    workerName: String(item?.workerName || "Worker"),
    workerEmail: String(item?.workerEmail || ""),
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    acceptedOn: item?.acceptedOn || null,
    completedOn: item?.completedOn || null,
    cancelledOn: item?.cancelledOn || null,
    reviewRating: item?.reviewRating ?? null,
    reviewText: String(item?.reviewText || ""),
  }));

const statusTone = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "COMPLETED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (value === "ONGOING") return "bg-sky-100 text-sky-800 border-sky-200";
  if (value === "CANCELLED") return "bg-rose-100 text-rose-800 border-rose-200";
  if (value === "DECLINED") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
};

export default function HomeownerProfile() {
  const navigate = useNavigate();
  const { id: routeHomeownerId } = useParams();
  const homeownerSession = getHomeownerSession();
  const workerSession = getWorkerSession();
  const adminSession = getAdminSession();

  const viewerRole = useMemo(() => {
    if (homeownerSession?.token) return "homeowner";
    if (workerSession?.token) return "worker";
    if (adminSession?.token) return "admin";
    return null;
  }, [adminSession?.token, homeownerSession?.token, workerSession?.token]);

  const currentHomeownerId = String(
    homeownerSession?.homeowner?._id ||
      homeownerSession?.homeowner?.id ||
      homeownerSession?.homeowner?.homeownerId ||
      ""
  );
  const routeId = String(routeHomeownerId || "");
  const isSharedView = Boolean(routeId) && routeId !== currentHomeownerId;
  const canEdit = !routeId || routeId === currentHomeownerId;
  const sharedProfileCacheKey = isSharedView && routeId ? `trabahome_homeowner_profile:${routeId}` : "";
  const cachedSharedProfile = useMemo(
    () => (sharedProfileCacheKey ? readJsonCache(sharedProfileCacheKey, 5 * 60 * 1000) : null),
    [sharedProfileCacheKey]
  );

  const initialHomeowner = homeownerSession?.homeowner || {};
  const [firstName, setFirstName] = useState(String(initialHomeowner.firstName || initialHomeowner.firstname || ""));
  const [lastName, setLastName] = useState(String(initialHomeowner.lastName || initialHomeowner.lastname || ""));
  const [email, setEmail] = useState(String(homeownerSession?.email || initialHomeowner.email || ""));
  const [mobileNumber, setMobileNumber] = useState(String(initialHomeowner.mobileNumber || initialHomeowner.phone || ""));
  const [city, setCity] = useState(String(initialHomeowner.city || ""));
  const [barangay, setBarangay] = useState(String(initialHomeowner.barangay || ""));
  const [province, setProvince] = useState(String(initialHomeowner.province || ""));
  const [address, setAddress] = useState(String(initialHomeowner.address || ""));
  const [photoPreview, setPhotoPreview] = useState(
    String(
      initialHomeowner.avatar ||
        initialHomeowner.profileImage ||
        initialHomeowner.profilePicture ||
        initialHomeowner.photoUrl ||
        initialHomeowner.image ||
        ""
    )
  );
  const [initialSnapshot, setInitialSnapshot] = useState(() =>
    buildSnapshot({
      firstName: initialHomeowner.firstName || initialHomeowner.firstname || "",
      lastName: initialHomeowner.lastName || initialHomeowner.lastname || "",
      mobileNumber: initialHomeowner.mobileNumber || initialHomeowner.phone || "",
      city: initialHomeowner.city || "",
      barangay: initialHomeowner.barangay || "",
      photoPreview:
        initialHomeowner.avatar ||
        initialHomeowner.profileImage ||
        initialHomeowner.profilePicture ||
        initialHomeowner.photoUrl ||
        initialHomeowner.image ||
        "",
    })
  );

  const [sharedProfile, setSharedProfile] = useState(cachedSharedProfile?.homeowner || null);
  const [sharedSummary, setSharedSummary] = useState({
    total: 0,
    pending: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    declined: 0,
  });
  const [sharedRequests, setSharedRequests] = useState(cachedSharedProfile?.requests || []);
  const [loadingShared, setLoadingShared] = useState(Boolean(isSharedView && !cachedSharedProfile));
  const [ownProfileLoadState, setOwnProfileLoadState] = useState(canEdit ? "loading" : "ready");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [workerReviews, setWorkerReviews] = useState<any[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSupportSubmitting, setIsSupportSubmitting] = useState(false);
  const [supportError, setSupportError] = useState("");
  const [supportStatus, setSupportStatus] = useState("");
  const [supportForm, setSupportForm] = useState({
    category: "Account & Profile",
    customCategory: "",
    message: "",
  });

  useEffect(() => {
    if (!canEdit) return;

    let mounted = true;
    const loadOwnProfile = async () => {
      if (!homeownerSession?.token) {
        if (mounted) setOwnProfileLoadState("error");
        return;
      }

      try {
        setOwnProfileLoadState("loading");
        setErrorMessage("");
        const response = await homeownerAPI.me({ fresh: true, images: false });
        const data = response?.homeowner || {};
        if (!mounted) return;

        const resolvedFirstName = data.firstName ?? data.firstname ?? "";
        const resolvedLastName = data.lastName ?? data.lastname ?? "";
        const resolvedEmail = data.email ?? "";
        const resolvedMobile = data.mobileNumber ?? data.phone ?? "";
        const resolvedCity = data.city ?? "";
        const resolvedBarangay = data.barangay ?? "";
        const resolvedProvince = data.province ?? "";
        const resolvedAddress = data.address ?? "";
        const resolvedPhoto =
          data.avatar ?? data.profileImage ?? data.profilePicture ?? data.photoUrl ?? data.image ?? "";

        setFirstName(String(resolvedFirstName));
        setLastName(String(resolvedLastName));
        setEmail(String(resolvedEmail));
        setMobileNumber(String(resolvedMobile));
        setCity(String(resolvedCity));
        setBarangay(String(resolvedBarangay));
        setProvince(String(resolvedProvince));
        setAddress(String(resolvedAddress));
        setPhotoPreview(String(resolvedPhoto));

        setInitialSnapshot(
          buildSnapshot({
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            mobileNumber: resolvedMobile,
            city: resolvedCity,
            barangay: resolvedBarangay,
            province: resolvedProvince,
            address: resolvedAddress,
            photoPreview: resolvedPhoto,
          })
        );

        setRating(typeof data.rating === "number" ? data.rating : 5);
        setRatingCount(typeof data.ratingCount === "number" ? data.ratingCount : (data.workerReviews?.length || 0));
        setWorkerReviews(Array.isArray(data.workerReviews) ? data.workerReviews : Array.isArray(data.reviews) ? data.reviews : []);

        setOwnProfileLoadState("ready");

        try {
          const imageResponse = await homeownerAPI.me({ fresh: true, asset: 'avatar' });
          const latestPhoto = String(imageResponse?.homeowner?.avatar || '').trim();
          if (mounted && latestPhoto) {
            setPhotoPreview(latestPhoto);
            setInitialSnapshot((snapshot) => ({ ...snapshot, photoPreview: latestPhoto }));
          }
        } catch (imageError) {
          console.error('Unable to load Homeowner profile photo:', imageError);
        }
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(
          error?.response?.data?.message || "Unable to refresh the registered Homeowner information."
        );
        setOwnProfileLoadState("error");
      }
    };

    loadOwnProfile();
    return () => {
      mounted = false;
    };
  }, [canEdit, homeownerSession?.token]);

  useEffect(() => {
    if (!isSharedView || !routeId || !viewerRole) return;

    let mounted = true;
    const loadSharedProfile = async () => {
      if (!cachedSharedProfile) setLoadingShared(true);
      setErrorMessage("");
      try {
        let response;
        if (viewerRole === "worker") {
          response = await workerAPI.getHomeownerProfile(routeId);
        } else if (viewerRole === "admin") {
          response = await adminAPI.getHomeownerProfile(routeId);
        } else {
          response = await homeownerAPI.getSharedHomeownerProfile(routeId);
        }

        if (!mounted) return;

        setSharedProfile(response?.homeowner || null);
        const sharedHomeowner = response?.homeowner || {};
        setRating(typeof sharedHomeowner.rating === "number" ? sharedHomeowner.rating : 5);
        setRatingCount(typeof sharedHomeowner.ratingCount === "number" ? sharedHomeowner.ratingCount : (response?.workerReviews?.length || 0));
        setWorkerReviews(Array.isArray(response?.workerReviews) ? response.workerReviews : Array.isArray(sharedHomeowner.workerReviews) ? sharedHomeowner.workerReviews : []);
        setSharedSummary(response?.summary || sharedSummary);
        setSharedRequests(normalizeRequests(response?.requests || []));
        writeJsonCache(sharedProfileCacheKey, {
          homeowner: response?.homeowner || null,
          summary: response?.summary || sharedSummary,
          requests: normalizeRequests(response?.requests || []),
        });
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to load homeowner profile.";
        if (mounted) setErrorMessage(message);
      } finally {
        if (mounted) setLoadingShared(false);
      }
    };

    loadSharedProfile();
    window.addEventListener("trabahome:service-request-changed", loadSharedProfile);
    return () => {
      mounted = false;
      window.removeEventListener("trabahome:service-request-changed", loadSharedProfile);
    };
  }, [isSharedView, routeId, viewerRole, sharedProfileCacheKey, cachedSharedProfile]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!homeownerSession?.token || isSaving) return;
    setStatusMessage("");
    setErrorMessage("");

    const payload = {
      avatar: photoPreview,
      profileImage: photoPreview,
    };

    setIsSaving(true);
    try {
      const response = await homeownerAPI.updateMe(payload);
      const data = response?.homeowner || {};
      const resolvedEmail = data.email || email || homeownerSession.email || "";

      saveHomeownerSession({
        token: homeownerSession.token,
        email: resolvedEmail,
        homeowner: {
          ...initialHomeowner,
          ...data,
        },
      });

      setInitialSnapshot(
        buildSnapshot({
          firstName,
          lastName,
          mobileNumber,
          city,
          barangay,
          photoPreview,
        })
      );

      setStatusMessage("Profile photo saved.");
      window.setTimeout(() => setStatusMessage(""), 2000);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to save changes. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const supportName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Homeowner";
  const supportCategory = supportForm.category === "Other"
    ? supportForm.customCategory.trim()
    : supportForm.category.trim();
  const supportWordCount = supportForm.message.trim().split(/\s+/).filter(Boolean).length;
  const isSupportFormValid = Boolean(
    homeownerSession?.token &&
      supportName &&
      email.trim() &&
      supportCategory &&
      supportForm.message.trim() &&
      supportWordCount <= 250 &&
      !isSupportSubmitting
  );

  const handleOpenSupport = () => {
    setSupportError("");
    setSupportStatus("");
    setIsSupportOpen(true);
  };

  const handleSubmitSupport = async (event) => {
    event.preventDefault();
    if (!isSupportFormValid) return;

    setIsSupportSubmitting(true);
    setSupportError("");
    setSupportStatus("");
    try {
      const result = await submitSupportTicket(homeownerSession.token, {
        name: supportName,
        email: email.trim(),
        issueCategory: supportCategory,
        message: supportForm.message.trim(),
      });
      setSupportStatus(`Message sent. Ticket ${result.ticketNumber} was created.`);
      setSupportForm((current) => ({ ...current, message: "" }));
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : "Unable to send message. Please try again.");
    } finally {
      setIsSupportSubmitting(false);
    }
  };

  const currentSnapshot = buildSnapshot({
    firstName,
    lastName,
    mobileNumber,
    city,
    barangay,
    photoPreview,
  });
  const isDirty = currentSnapshot.photoPreview !== initialSnapshot.photoPreview;

  const displayProfile = sharedProfile || {};
  const displayName = canEdit
    ? [firstName, lastName].filter(Boolean).join(" ").trim() || "Homeowner"
    : [displayProfile.firstName, displayProfile.lastName].filter(Boolean).join(" ").trim() || "Homeowner";
  const displayEmail = canEdit ? email : String(displayProfile.email || "");
  const displayPhone = canEdit ? mobileNumber : String(displayProfile.mobileNumber || "");
  const displayCity = canEdit ? city : String(displayProfile.city || "");
  const displayBarangay = canEdit ? barangay : String(displayProfile.barangay || "");
  const displayPhoto = canEdit ? photoPreview : String(displayProfile.avatar || displayProfile.profileImage || "");
  const backPath = viewerRole === "worker" ? "/worker-jobs" : viewerRole === "admin" ? "/admin-requests" : "/homeowner-bookings";

  if (canEdit && ownProfileLoadState !== "ready") {
    return (
      <div className="min-h-screen bg-[#F9F5F0]">
        <div className="h-[72px] border-b border-[#E7E2DA] bg-[#F9F5F0]">
          <div className="mx-auto flex h-full max-w-7xl items-center px-6 md:px-10">
            <img src="/assets/Logo.png" alt="TrabaHome" className="h-8 w-auto md:h-9" />
          </div>
        </div>
        <main className="mx-auto max-w-4xl px-3 sm:px-6 py-4 sm:py-10">
          <div className="rounded-2xl sm:rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm md:p-10" aria-busy={ownProfileLoadState === "loading"}>
            {ownProfileLoadState === "loading" ? (
              <div aria-label="Loading latest Homeowner profile" className="animate-pulse space-y-8">
                <div className="h-8 w-40 rounded-lg bg-gray-200" />
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-full bg-gray-200" />
                  <div className="space-y-3">
                    <div className="h-4 w-32 rounded bg-gray-200" />
                    <div className="h-3 w-56 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Array.from({ length: 7 }).map((_item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-3 w-24 rounded bg-gray-200" />
                      <div className="h-11 rounded-lg bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <h1 className="text-xl font-bold text-[#0B3B68]">Unable to load the latest profile</h1>
                <p className="mt-2 text-sm text-gray-500">{errorMessage || "Please try again."}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-6 rounded-full bg-[#0B3B68] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#082d50]"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      {canEdit ? (
        <Navbar
          homeownerProfile={{
            firstName,
            lastName,
            email,
            avatar: photoPreview,
            profileImage: photoPreview,
          }}
        />
      ) : (
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="inline-flex items-center gap-2 text-[#0B3B68] font-semibold hover:opacity-80 transition-colors"
            >
              <ChevronLeft size={18} />
              Back
            </button>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Homeowner Profile</p>
              <p className="text-sm text-gray-500">
                {viewerRole === "worker"
                  ? "Visible because you have a transaction with this homeowner."
                  : viewerRole === "admin"
                    ? "Admin transaction view."
                    : "Profile view."}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 md:p-10">
          <button
            type="button"
            onClick={() => navigate(canEdit ? "/home" : backPath)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0B3B68]">
                {canEdit ? "My Profile" : "Homeowner Profile"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {canEdit
                  ? "Registered account information from your Homeowner record."
                  : "Shared profile details for this transaction."}
              </p>
            </div>
            {errorMessage ? (
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                {errorMessage}
              </span>
            ) : statusMessage ? (
              <span className="text-sm font-semibold text-[#0B3B68] bg-[#E8F1F7] px-3 py-1 rounded-full">
                {statusMessage}
              </span>
            ) : null}
          </div>

          {canEdit ? (
            <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:items-center">
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#F1F3F6] border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-gray-900">{displayName}</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-1 text-[13px] font-medium text-gray-600">
                      <span className="text-yellow-400 text-sm">★</span>
                      <span className="font-bold text-gray-800">{ratingCount > 0 ? rating.toFixed(1) : "5.0"}</span>
                      <span className="text-gray-400">| {ratingCount} Ratings from Workers</span>
                      <button
                        type="button"
                        onClick={() => setIsReviewsOpen(true)}
                        className="text-[#0085FF] hover:underline ml-1 font-semibold text-xs cursor-pointer"
                      >
                        (See Reviews)
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Upload a clear photo so workers can recognize you.
                  </p>
                  <div className="mt-3">
                    <label
                      htmlFor="homeowner-photo"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#0B3B68] border border-[#0B3B68]/30 rounded-full hover:bg-[#F5F6F8] transition-colors cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      Upload Photo
                    </label>
                    <input
                      id="homeowner-photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", value: [firstName, lastName].filter(Boolean).join(" ") },
                    { label: "Email Address", value: email },
                    { label: "Contact Number", value: mobileNumber },
                    { label: "Barangay", value: barangay },
                    { label: "Municipality / City", value: city },
                    { label: "Province", value: province },
                    { label: "Address / Location", value: address },
                  ].map((field) => (
                    <div key={field.label} className={field.label === "Address / Location" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                      <label className="block text-[12px] font-bold text-gray-800 ml-1">{field.label}</label>
                      <input
                        type="text"
                        value={field.value || "Not specified"}
                        readOnly
                        className="w-full bg-[#EBEBEB] border-2 border-transparent rounded-lg px-4 py-2.5 text-[13px] text-gray-600 cursor-default"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 text-gray-500">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <p className="text-[11px] font-medium italic">
                    If any of these details are wrong,{' '}
                    <button
                      type="button"
                      onClick={handleOpenSupport}
                      className="font-semibold text-[#0085FF] hover:underline"
                      aria-label="Contact support about locked Homeowner account details"
                    >
                      contact support.
                    </button>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={!isDirty || isSaving}
                  className={`px-6 py-3 rounded-full text-sm font-semibold transition-colors ${
                    !isDirty || isSaving
                      ? "bg-[#0B3B68]/60 text-white cursor-not-allowed"
                      : "bg-[#0B3B68] text-white hover:bg-[#082d50]"
                  }`}
                >
                  {isSaving ? "Saving..." : "Save Profile Photo"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              {loadingShared ? (
                <div className="py-16 text-center text-gray-500">Loading homeowner profile...</div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#F1F3F6] border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-[#0B3B68]">{displayName}</h2>
                        <span className="px-3 py-1 rounded-full text-xs font-bold border bg-[#F5F8FB] text-[#0B3B68] border-[#DCE6EF]">
                          {viewerRole?.toUpperCase() || "VIEWER"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex items-center gap-1 text-[13px] font-medium text-gray-600">
                          <span className="text-yellow-400 text-sm">★</span>
                          <span className="font-bold text-gray-800">{ratingCount > 0 ? rating.toFixed(1) : "5.0"}</span>
                          <span className="text-gray-400">| {ratingCount} Ratings from Workers</span>
                          <button
                            type="button"
                            onClick={() => setIsReviewsOpen(true)}
                            className="text-[#0085FF] hover:underline ml-1 font-semibold text-xs cursor-pointer"
                          >
                            (See Reviews)
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail size={15} className="text-gray-400" />
                          <span>{displayEmail || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={15} className="text-gray-400" />
                          <span>{displayPhone || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-gray-400" />
                          <span>
                            {[displayBarangay, displayCity].filter(Boolean).join(", ") || "Location not specified"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {[
                      { label: "Total", value: sharedSummary.total },
                      { label: "Pending", value: sharedSummary.pending },
                      { label: "Ongoing", value: sharedSummary.ongoing },
                      { label: "Completed", value: sharedSummary.completed },
                      { label: "Cancelled", value: sharedSummary.cancelled },
                      { label: "Declined", value: sharedSummary.declined },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-gray-100 bg-[#FAFBFC] p-4">
                        <p className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">{item.label}</p>
                        <p className="text-2xl font-bold text-[#0B3B68] mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-[#0B3B68]" />
                      <h3 className="text-lg font-bold text-[#0B3B68]">Transactions</h3>
                    </div>
                    {sharedRequests.length > 0 ? (
                      <div className="space-y-3">
                        {sharedRequests.map((request) => (
                          <div key={request.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-gray-900">
                                    {request.requestNumber}
                                  </span>
                                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase ${statusTone(request.status)}`}>
                                    {request.status}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {request.serviceType} • {request.workerName}
                                </p>
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(request.createdAt)}
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                              <div className="space-y-2">
                                <p className="flex items-center gap-2 text-gray-700">
                                  <Calendar size={14} className="text-gray-400" />
                                  <span>{request.preferredDate ? formatDate(request.preferredDate) : "Not specified"}</span>
                                </p>
                                <p className="flex items-center gap-2 text-gray-700">
                                  <Lock size={14} className="text-gray-400" />
                                  <span>{request.preferredTime || "Not specified"}</span>
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="flex items-center gap-2 text-gray-700">
                                  <MapPin size={14} className="text-gray-400" />
                                  <span>{request.address || request.location || "Location not specified"}</span>
                                </p>
                                <p className="flex items-center gap-2 text-gray-700">
                                  <Phone size={14} className="text-gray-400" />
                                  <span>{request.contactNumber || "Not specified"}</span>
                                </p>
                              </div>
                            </div>

                            {request.description ? (
                              <p className="mt-4 text-sm text-gray-600 bg-[#F8FAFC] border border-gray-100 rounded-xl p-3">
                                {request.description}
                              </p>
                            ) : null}

                            {request.reviewRating ? (
                              <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                <span className="font-semibold">{Number(request.reviewRating).toFixed(1)} / 5</span>
                                {request.reviewText ? <span className="text-gray-500">• {request.reviewText}</span> : null}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-[#FAFBFC] py-12 text-center text-gray-400">
                        No transaction history available yet.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {canEdit && isSupportOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="homeowner-support-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSupportSubmitting) setIsSupportOpen(false);
          }}
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 id="homeowner-support-title" className="text-lg font-bold text-[#0B3B68]">Contact Support</h2>
                <p className="mt-1 text-xs text-gray-500"></p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportOpen(false)}
                disabled={isSupportSubmitting}
                className="h-9 w-9 rounded-full text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close support"
              >
                ×
              </button>
            </div>

            <form className="space-y-4 p-6" onSubmit={handleSubmitSupport}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">Name</label>
                  <input
                    type="text"
                    value={supportName}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">Issue Category</label>
                <select
                  value={supportForm.category}
                  onChange={(event) => setSupportForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30"
                >
                  {SUPPORT_ISSUE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              {supportForm.category === "Other" ? (
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">Specify Issue</label>
                  <input
                    type="text"
                    value={supportForm.customCategory}
                    onChange={(event) => setSupportForm((current) => ({ ...current, customCategory: event.target.value }))}
                    placeholder="Type your issue"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-600">Message</label>
                <textarea
                  value={supportForm.message}
                  onChange={(event) => {
                    const words = event.target.value.trim().split(/\s+/).filter(Boolean);
                    const message = words.length <= 250 ? event.target.value : words.slice(0, 250).join(" ");
                    setSupportForm((current) => ({ ...current, message }));
                  }}
                  rows={5}
                  placeholder="Tell us about your concern..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30"
                />
                <p className="mt-1 text-[10px] text-gray-400">{supportWordCount}/250 words</p>
              </div>

              <button
                type="submit"
                disabled={!isSupportFormValid}
                className="rounded-full bg-[#0B3B68] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#082d50] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSupportSubmitting ? "Sending..." : "Send Message"}
              </button>
              {supportError ? <p className="text-xs font-semibold text-red-500">{supportError}</p> : null}
              {supportStatus ? <p className="text-xs font-semibold text-[#0B3B68]">{supportStatus}</p> : null}
            </form>
          </div>
        </div>
      ) : null}

      {isReviewsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="homeowner-worker-reviews-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsReviewsOpen(false);
          }}
        >
          <div className="w-full max-w-xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 id="homeowner-worker-reviews-title" className="text-lg font-bold text-gray-900">Worker Reviews</h2>
                <p className="mt-1 text-xs text-gray-500">Feedback and ratings from skilled workers you have booked.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewsOpen(false)}
                className="h-9 w-9 rounded-full text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close reviews"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(80vh-84px)] overflow-y-auto p-6">
              {workerReviews.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No worker reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {workerReviews.map((review, idx) => (
                    <article key={review.id || idx} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-[#0B3B68]">
                            {review.workerAvatar ? (
                              <img src={review.workerAvatar} alt={review.workerName} className="h-full w-full object-cover" />
                            ) : (
                              <span>{(review.workerName || "W")[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{review.workerName || "Skilled Worker"}</p>
                            <p className="text-xs text-gray-500">{review.workerProfession || "Worker"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                          <span>★</span>
                          <span>{Number(review.rating || 5).toFixed(1)}</span>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-xs text-gray-700 bg-white border border-gray-100 rounded-lg p-3 italic">
                          "{review.comment}"
                        </p>
                      )}
                      {Array.isArray(review.tags) && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {review.tags.map((tag: string, tidx: number) => (
                            <span key={tidx} className="text-[10px] bg-blue-50 text-[#0B3B68] px-2 py-0.5 rounded-full font-medium">
                              ✓ {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {review.reviewedAt && (
                        <p className="mt-2 text-[10px] text-gray-400 text-right">
                          {new Date(review.reviewedAt).toLocaleDateString()}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
