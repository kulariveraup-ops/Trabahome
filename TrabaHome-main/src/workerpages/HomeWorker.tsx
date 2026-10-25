import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CheckCircle,
  Clock,
  Star,
  Users,
  ChevronRight
} from 'lucide-react';
import RequestCard from '../components/requestpages/RequestCard.tsx';
import RequestDetailsModal from '../components/requestpages/RequestsModal.tsx';
import WorkerNotificationBell from '../components/workerNotifications/WorkerNotificationBell.tsx';
import MessagesSummaryButton from '../components/chat/MessagesSummaryButton.tsx';
import { AcceptJobModal, DeclineJobModal, Sidebar } from '../components/workersjobs/Index.ts';
import { declineReasons } from '../constants/DeclineReasons.ts';
import { readJsonCache, writeJsonCache } from '../services/pageCache.ts';
import type { Request, Stat } from '../types/Worker.types.ts';
import { clearWorkerSession, getWorkerSession } from '../utils/workerAuth.ts';
import { workerAPI } from '../services/WorkerApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { formatDateTime, formatScheduleDateTime, isScheduledTimeReached } from '../utils/formatDateTime.ts';
import WelcomeOnboardingModal from '../components/onboarding/WelcomeOnboardingModal.tsx';
import WorkerScheduleCalendar from '../components/workersjobs/WorkerScheduleCalendar.tsx';

const WORKER_DASHBOARD_ROUTE = '/home-worker';
const REQUESTS_CACHE_TTL_MS = 5 * 60 * 1000;
const resolveHomeownerAvatarLike = (value: any): string => {
  return String(
    value?.avatar ||
      value?.profileImage ||
      value?.profilePicture ||
      value?.photoUrl ||
      value?.image ||
      value?.photo ||
      value?.picture ||
      ""
  ).trim();
};

const normalizeRequestItem = (item: any): Request => {
  const rawStatus = String(item.status || 'Pending').trim();
  const isAccepted = Boolean(
    item.acceptedOn ||
    item.acceptedAt ||
    ["accepted", "confirmed", "ongoing", "in progress", "in_progress", "inprogress", "completed"].includes(
      rawStatus.toLowerCase()
    )
  );
  const timeReached = isScheduledTimeReached(item.preferredDate, item.preferredTime, item.scheduledAt);
  let computedStatus = 'Pending';
  const upper = rawStatus.toUpperCase();
  if (upper === 'COMPLETED') computedStatus = 'Completed';
  else if (upper === 'CANCELLED' || upper === 'CANCELED') computedStatus = 'Cancelled';
  else if (upper === 'DECLINED') computedStatus = 'Declined';
  else if (isAccepted && timeReached) computedStatus = 'In Progress';
  else if (isAccepted) computedStatus = 'Accepted';
  else computedStatus = 'Pending';

  return {
    id: String(item.id || item.bookingNumber || item._id || ''),
    requestNumber: String(item.requestNumber || item.id || item.bookingNumber || item._id || ''),
    name: item.homeownerName || 'Homeowner',
    location: item.location || item.address || 'Location',
    address: item.address || item.location || item.serviceAddress || '',
    contactNumber: item.contactNumber || item.phone || item.homeownerPhone || item.homeowner?.phone || '',
    email: item.homeownerEmail || item.email || item.homeowner?.email || '',
    needs: item.serviceType || 'General Repair',
    schedule: formatScheduleDateTime(item.preferredDate, item.preferredTime, item.scheduledAt),
    time: formatDateTime(item.createdAt || item.requestSentAt || item.createdOn || ''),
    description: item.description || item.notes || '',
    avatar:
      item.homeownerAvatar ||
      item.homeownerProfileImage ||
      item.homeownerProfilePicture ||
      item.homeownerPhotoUrl ||
      item.homeownerPhoto ||
      item.homeownerPicture ||
      item.homeownerImage ||
      resolveHomeownerAvatarLike(item.homeowner) ||
      '',
    status: computedStatus,
    rawStatus,
    isAccepted,
    acceptedOn: item.acceptedOn || null,
    homeownerId: String(item.homeownerId || item.homeowner?._id || item.homeowner?.id || ''),
    homeownerRating: typeof item.homeownerRating === 'number' ? item.homeownerRating : Number(item.homeownerRating || 0),
    homeownerRatingCount: Number(item.homeownerRatingCount || 0),
    homeownerReviews: Array.isArray(item.homeownerReviews) ? item.homeownerReviews : [],
    preferredDate: item.preferredDate || '',
    preferredTime: item.preferredTime || '',
    declineReason: item.declineReason || '',
  };
};

const normalizeRequests = (items: any[]) => items.map(normalizeRequestItem).filter(Boolean);

const HomeWorker: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const workerSession = getWorkerSession();
  const [workerProfile, setWorkerProfile] = useState<Record<string, any> | null>(() => workerSession?.worker || null);
  const resolvedWorker = workerProfile || workerSession?.worker;
  const workerName =
    [resolvedWorker?.firstName, resolvedWorker?.lastName].filter(Boolean).join(' ').trim() ||
    String(resolvedWorker?.name || resolvedWorker?.fullName || 'Worker');
  const workerAvatar = String(
    resolvedWorker?.avatar ||
      resolvedWorker?.profileImage ||
      resolvedWorker?.photoUrl ||
      resolvedWorker?.image ||
      resolvedWorker?.photo ||
      resolvedWorker?.picture ||
      ''
  ).trim();
  const workerProfession = String(resolvedWorker?.profession || '').trim() || 'Profession not set';
  const workerRating = Number.isFinite(Number(resolvedWorker?.rating))
    ? Number(resolvedWorker?.rating)
    : null;
  const workerStatus = String(
    resolvedWorker?.status || (resolvedWorker?.isVerified ? 'verified' : '')
  ).trim().toLowerCase();
  const isVerifiedWorker = workerStatus === 'verified' || Boolean(resolvedWorker?.isVerified);
  const accountNotice = workerStatus === 'pending'
    ? {
        title: 'Waiting for Verification',
        message: 'Your worker account is pending admin verification. You can sign in, but homeowner visibility and job actions stay disabled until your account is approved.',
      }
    : workerStatus === 'suspended'
      ? {
          title: 'Account Suspended',
          message: 'Your worker account is suspended. Please contact an admin to restore access before continuing with job actions.',
        }
      : null;
  const [showAccountNotice, setShowAccountNotice] = useState<boolean>(Boolean(accountNotice));
  const requestsCacheKey = `trabahome_worker_requests:${String(resolvedWorker?._id || workerSession?.worker?._id || workerSession?.email || '')}`;
  const cachedRequests = normalizeRequests(readJsonCache<any[]>(requestsCacheKey, REQUESTS_CACHE_TTL_MS) || []);
  const hasCachedRequests = cachedRequests.length > 0;

  const [showModal, setShowModal] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const email = String(workerSession?.email || "").trim().toLowerCase();
      if (email && localStorage.getItem("trabahome_guide_seen_" + email) === "true") {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        return false;
      }
      if (Boolean((workerSession?.worker as any)?.hasSeenGuide)) {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        return false;
      }
      const shouldShow = sessionStorage.getItem("trabahome_show_first_time_guide") === "true";
      if (shouldShow) {
        sessionStorage.removeItem("trabahome_show_first_time_guide");
        localStorage.setItem("trabahome_onboarding_completed_worker", "true");
        if (email) {
          localStorage.setItem("trabahome_guide_seen_" + email, "true");
          localStorage.removeItem("trabahome_first_login_pending_" + email);
        }
        void workerAPI.markGuideSeen();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedAcceptRequest, setSelectedAcceptRequest] = useState<Request | null>(null);
  const [selectedDeclineRequest, setSelectedDeclineRequest] = useState<Request | null>(null);
  const [requests, setRequests] = useState<Request[]>(cachedRequests);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(cachedRequests.length === 0);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState<string | null>(null);
  const loadRequestsRef = useRef<(() => void) | null>(null);
  useServiceRequestSync(workerSession?.token, () => loadRequestsRef.current?.());

  useEffect(() => {
    setShowAccountNotice(Boolean(accountNotice));
  }, [workerStatus]);

  useEffect(() => {
    setWorkerProfile(workerSession?.worker || null);

    if (!workerSession?.token) return;

    let active = true;
    const hydrateWorkerProfile = async () => {
      try {
        const response = await workerAPI.me({ summary: true, images: false });
        if (!active) return;
        const loadedWorker = response?.worker || response?.data || {};
        setWorkerProfile(loadedWorker);
        try {
          const avatarResponse = await workerAPI.me({ assets: 'avatar' });
          const avatarWorker = avatarResponse?.worker || {};
          if (active) {
            setWorkerProfile((current) => ({ ...(current || {}), avatar: avatarWorker.avatar || '' }));
          }
        } catch (avatarError) {
          console.error('Failed to load worker avatar:', avatarError);
        }
      } catch (error) {
        console.error('Failed to load worker session profile:', error);
      }
    };

    void hydrateWorkerProfile();

    return () => {
      active = false;
    };
  }, [workerSession?.token]);

  const loadRequests = async () => {
    if (!workerSession?.token) {
      setRequests([]);
      setIsLoadingRequests(false);
      return;
    }

    setRequestsError(null);
    setIsLoadingRequests(true);
    try {
      const result = await workerAPI.listServiceRequests();
      const items = Array.isArray(result?.items) ? result.items : [];
      const normalized = normalizeRequests(items);
      setRequests(normalized);
      writeJsonCache(requestsCacheKey, normalized);
    } catch (error: any) {
      console.error('Failed to load worker requests', error);
      const status = error?.response?.status;
      setRequestsError(
        status === 401 || status === 403
          ? 'Your worker session has expired. Please sign in again.'
          : error?.response?.data?.message || 'Unable to load homeowner requests.'
      );
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const node = headerRef.current;
    const update = () => setHeaderHeight(node.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleViewDetails = (request: Request): void => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const pendingRequests = useMemo(
    () =>
      requests.filter((item) => {
        const s = String(item.status || '').toUpperCase();
        return s === 'PENDING' && !item.isAccepted && !item.acceptedOn;
      }),
    [requests]
  );

  const acceptedJobs = useMemo(
    () =>
      requests.filter((item) => {
        const s = String(item.status || '').toUpperCase();
        const raw = String(item.rawStatus || '').toUpperCase();
        return (
          (item.isAccepted || item.acceptedOn || s === 'ACCEPTED' || raw === 'ACCEPTED') &&
          s !== 'COMPLETED' &&
          s !== 'CANCELLED' &&
          s !== 'CANCELED' &&
          s !== 'DECLINED'
        );
      }),
    [requests]
  );

  const requestStats = useMemo(() => {
    const pending = requests.filter(
      (item) => String(item.status || '').toUpperCase() === 'PENDING' && !item.isAccepted && !item.acceptedOn
    ).length;
    const accepted = requests.filter((item) => {
      const s = String(item.status || '').toUpperCase();
      const raw = String(item.rawStatus || '').toUpperCase();
      return (
        (item.isAccepted || item.acceptedOn || s === 'ACCEPTED' || raw === 'ACCEPTED' || ['IN PROGRESS', 'ONGOING'].includes(raw)) &&
        !['COMPLETED', 'CANCELLED', 'CANCELED', 'DECLINED'].includes(s)
      );
    }).length;
    const completed = requests.filter((item) => String(item.status || '').toUpperCase() === 'COMPLETED').length;
    const averageRating = Number.isFinite(Number(resolvedWorker?.rating))
      ? Number(resolvedWorker?.rating)
      : 0;
    return { pending, accepted, completed, averageRating };
  }, [requests, resolvedWorker?.rating]);

  const updateRequestLocally = (requestId: string, nextStatus: string) => {
    setRequests((current) => {
      const next = current
        .map((item) => (item.id === requestId ? { ...item, status: nextStatus } : item))
        .filter((item) => item.id !== requestId || nextStatus !== 'Declined');
      writeJsonCache(requestsCacheKey, next);
      return next;
    });
  };

  const handleAcceptRequest = async (request: Request) => {
    const requestId = String(request?.id || '').trim();
    if (!requestId || isUpdatingRequest) return;
    if (!isVerifiedWorker) {
      alert("Only verified workers can accept job requests. Your account is currently pending verification.");
      return;
    }
    setIsUpdatingRequest(requestId);
    updateRequestLocally(requestId, 'Accepted');
    setSelectedRequest((current) => (current && String(current.id) === requestId ? { ...current, status: 'Accepted' } : current));
    setSelectedAcceptRequest(null);
    setSelectedDeclineRequest(null);
    setShowModal(false);
    try {
      const resp = await workerAPI.updateServiceRequest(requestId, { status: 'ONGOING' });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'trabahome_service_request_changed',
          JSON.stringify({ time: Date.now(), id: resp?.request?.id || requestId })
        );
      }
      window.dispatchEvent(new Event('trabahome:service-request-changed'));
      navigate('/worker-jobs?tab=Accepted');
    } catch (error: any) {
      console.error('Accept request error:', error);
      alert(error?.response?.data?.message || 'Failed to accept job request. Please try again.');
      await loadRequests();
    } finally {
      setIsUpdatingRequest(null);
    }
  };

  const handleDeclineRequest = async (request: Request, reason: string = '') => {
    const requestId = String(request?.id || '').trim();
    if (!requestId || isUpdatingRequest) return;
    if (!isVerifiedWorker) {
      alert("Only verified workers can decline job requests.");
      return;
    }
    setIsUpdatingRequest(requestId);
    updateRequestLocally(requestId, 'Declined');
    setSelectedRequest(null);
    setSelectedAcceptRequest(null);
    setSelectedDeclineRequest(null);
    setShowModal(false);
    try {
      const resp = await workerAPI.updateServiceRequest(requestId, {
        status: 'DECLINED',
        declineReason: reason,
      });
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'trabahome_service_request_changed',
          JSON.stringify({ time: Date.now(), id: resp?.request?.id || requestId })
        );
      }
      window.dispatchEvent(new Event('trabahome:service-request-changed'));
      await loadRequests();
    } catch (error: any) {
      console.error('Decline request error:', error);
      alert(error?.response?.data?.message || 'Failed to decline request. Please try again.');
      await loadRequests();
    } finally {
      setIsUpdatingRequest(null);
    }
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
  };

  useEffect(() => {
    loadRequestsRef.current = loadRequests;
    loadRequests();
    const handleBookingUpdate = () => loadRequests();
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === 'trabahome_service_request_changed' ||
        event.key === 'trabahome_booking_created' ||
        event.key === 'trabahome_booking_updated'
      ) {
        loadRequests();
      }
    };

    window.addEventListener('trabahome:service-request-changed', handleBookingUpdate);
    window.addEventListener('trabahome:booking-created', handleBookingUpdate);
    window.addEventListener('trabahome:booking-updated', handleBookingUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      loadRequestsRef.current = null;
      window.removeEventListener('trabahome:service-request-changed', handleBookingUpdate);
      window.removeEventListener('trabahome:booking-created', handleBookingUpdate);
      window.removeEventListener('trabahome:booking-updated', handleBookingUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [workerSession?.token]);

  const handleLogout = (): void => {
    clearWorkerSession();
    navigate('/', { replace: true });
  };

  const sidebarOffset = headerHeight ? headerHeight + 24 : 88;
  const sidebarHeight = headerHeight
    ? `calc(100vh - ${headerHeight + 48}px)`
    : 'calc(100vh - 112px)';

  return (
    <div className="min-h-screen bg-[#F9F6F2] font-sans flex flex-col items-center relative">
      <div aria-hidden="true" style={headerHeight ? { height: headerHeight } : undefined} />
      <header
        ref={headerRef}
        className="w-full bg-[#F9F5F0] border-b border-[#E7E2DA] fixed top-0 left-0 right-0 z-50 shadow-sm"
      >
        <div className="max-w-[1280px] mx-auto w-full px-6 py-4 flex justify-between items-center">
          <div className="w-[260px] flex items-center cursor-pointer" onClick={() => navigate(WORKER_DASHBOARD_ROUTE)}>
            <img
              src="/assets/Logo.png"
              alt="TrabaHome"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex-1 flex justify-end items-center gap-3">
            <WorkerNotificationBell />
            <MessagesSummaryButton role="worker" />
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-start p-3 sm:p-6 pb-24 lg:pb-6">
        <Sidebar
          location={location}
          navigate={navigate}
          workerName={workerName}
          workerAvatar={workerAvatar}
          workerProfession={workerProfession}
          workerRating={workerRating}
          onLogout={handleLogout}
          stickyTop={sidebarOffset}
          stickyHeight={sidebarHeight}
        />

        <main className="flex-1 w-full min-w-0">
          <header className="flex justify-between items-start mb-6 sm:mb-8 px-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-1 sm:mb-2">Welcome, {workerName}</h1>
              <p className="text-xs sm:text-sm text-gray-500">Here is what is happening with your service bookings today.</p>
            </div>
          </header>

          {/* Performance Overview Cards */}
          <section className="mb-10">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-2">
              Performance Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pending Requests */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Requests</span>
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{requestStats.pending}</div>
                  <p className="text-xs text-gray-500">Awaiting your response</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/worker-jobs?tab=Pending')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Accepted Jobs */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Accepted Jobs</span>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0B3B68] flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{requestStats.accepted}</div>
                  <p className="text-xs text-gray-500">Upcoming &amp; in progress</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/worker-jobs?tab=Accepted')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Completed Jobs */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Jobs</span>
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{requestStats.completed}</div>
                  <p className="text-xs text-gray-500">Successfully completed</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/worker-jobs?tab=Completed')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Average Rating */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Rating</span>
                    <div className="w-8 h-8 rounded-full bg-yellow-50 text-amber-500 flex items-center justify-center">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1 flex items-baseline gap-1">
                    {requestStats.averageRating > 0 ? requestStats.averageRating.toFixed(1) : '0.0'}
                    <span className="text-sm font-normal text-gray-400">/ 5.0</span>
                  </div>
                  <p className="text-xs text-gray-500">Homeowner evaluation</p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/worker-own-profile')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Schedule Calendar & Live Clock Feature */}
          <WorkerScheduleCalendar
            requests={requests}
            onViewDetails={handleViewDetails}
          />

          {/* Accepted Upcoming Jobs */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Accepted Upcoming Jobs
              </h2>
              {acceptedJobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/worker-jobs?tab=Accepted')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {isLoadingRequests ? (
                <div className="col-span-full text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                  Loading accepted jobs...
                </div>
              ) : acceptedJobs.length > 0 ? (
                acceptedJobs.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={handleViewDetails}
                    onAccept={isVerifiedWorker ? (item) => setSelectedAcceptRequest(item) : () => undefined}
                    onDecline={isVerifiedWorker ? (item) => setSelectedDeclineRequest(item) : () => undefined}
                  />
                ))
              ) : (
                <div className="col-span-full text-sm text-gray-500 text-center py-8 border border-dashed border-gray-200 rounded-2xl">
                  No accepted upcoming jobs yet.
                </div>
              )}
            </div>
          </section>

          {/* Pending Request */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Pending Request
              </h2>
              {pendingRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/worker-jobs?tab=Pending')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B3B68] hover:text-[#082d50] transition-colors"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {isLoadingRequests ? (
                <div className="col-span-full text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                  Loading requests...
                </div>
              ) : requestsError ? (
                <div className="col-span-full text-sm text-red-600 text-center py-10 border border-red-200 bg-red-50 rounded-2xl">
                  {requestsError}
                </div>
              ) : pendingRequests.length > 0 ? (
                pendingRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onViewDetails={handleViewDetails}
                    onAccept={isVerifiedWorker ? (item) => setSelectedAcceptRequest(item) : () => undefined}
                    onDecline={isVerifiedWorker ? (item) => setSelectedDeclineRequest(item) : () => undefined}
                  />
                ))
              ) : (
                <div className="col-span-full text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                  No current pending requests.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <RequestDetailsModal
        isOpen={showModal}
        onClose={handleCloseModal}
        request={selectedRequest}
        onAccept={(request) => setSelectedAcceptRequest(request as any)}
        onDecline={(request) => setSelectedDeclineRequest(request as any)}
      />
      <AcceptJobModal
        job={selectedAcceptRequest ? ({
          id: String(selectedAcceptRequest.id),
          name: selectedAcceptRequest.name,
          location: selectedAcceptRequest.location,
          address: selectedAcceptRequest.address || selectedAcceptRequest.location,
          contactNumber: selectedAcceptRequest.contactNumber,
          needs: selectedAcceptRequest.needs,
          schedule: selectedAcceptRequest.schedule,
          time: selectedAcceptRequest.time,
          description: selectedAcceptRequest.description,
          status: 'Pending',
          avatar: selectedAcceptRequest.avatar,
        } as any) : null}
        isLoading={Boolean(isUpdatingRequest)}
        onConfirm={() => selectedAcceptRequest && void handleAcceptRequest(selectedAcceptRequest)}
        onCancel={() => !isUpdatingRequest && setSelectedAcceptRequest(null)}
      />
      <DeclineJobModal
        job={selectedDeclineRequest ? ({
          id: String(selectedDeclineRequest.id),
          name: selectedDeclineRequest.name,
          location: selectedDeclineRequest.location,
          address: selectedDeclineRequest.address || selectedDeclineRequest.location,
          contactNumber: selectedDeclineRequest.contactNumber,
          needs: selectedDeclineRequest.needs,
          schedule: selectedDeclineRequest.schedule,
          time: selectedDeclineRequest.time,
          description: selectedDeclineRequest.description,
          status: 'Pending',
          avatar: selectedDeclineRequest.avatar,
        } as any) : null}
        declineReasons={declineReasons}
      onDecline={(jobId: string, reason: string) => {
          const matched = selectedDeclineRequest && String(selectedDeclineRequest.id) === String(jobId)
            ? selectedDeclineRequest
            : null;
          if (matched) {
            void handleDeclineRequest(matched, reason);
          }
        }}
        onCancel={() => {
          setSelectedDeclineRequest(null);
        }}
      />

      {showAccountNotice && accountNotice && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setShowAccountNotice(false)}
          />
          <div className="relative w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl border border-gray-100 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#0B3B68]">Worker Status</p>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">{accountNotice.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{accountNotice.message}</p>
            <button
              type="button"
              onClick={() => setShowAccountNotice(false)}
              className="mt-8 w-full rounded-full bg-[#0B3B68] px-5 py-3 text-sm font-bold text-white hover:bg-[#082d50] transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Welcome & Onboarding Walkthrough */}
      <WelcomeOnboardingModal
        isOpen={isOnboardingOpen}
        role="worker"
        userName={workerName}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};

export default HomeWorker;
