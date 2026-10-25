import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AcceptJobModal,
  DeclineJobModal,
  Header,
  JobCard,
  JobDetailsModal,
  Sidebar,
  CompleteJobModal,
} from '../components/workersjobs/Index.ts';
import EReceiptModal from '../components/requestpages/EReceiptModal.tsx';
import { declineReasons } from '../constants/DeclineReasons.ts';
import { jobTabs } from '../constants/JobTabs.ts';
import { readJsonCache, writeJsonCache } from '../services/pageCache.ts';
import type { Job, JobStatus } from '../types/Job.types.ts';
import { clearWorkerSession, getWorkerSession } from '../utils/workerAuth.ts';
import { workerAPI } from '../services/WorkerApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { formatDateTime, formatScheduleDateTime, isScheduledTimeReached } from '../utils/formatDateTime.ts';
import BookingChatModal from '../components/chat/BookingChatModal.tsx';

const WORKER_DASHBOARD_ROUTE = '/home-worker';
const JOBS_CACHE_TTL_MS = 5 * 60 * 1000;
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

const normalizeWorkerJobStatus = (
  status: any,
  preferredDate?: unknown,
  preferredTime?: unknown,
  scheduledAt?: unknown,
  isAccepted?: boolean
): JobStatus => {
  const raw = String(status || 'Pending').trim().toUpperCase();
  if (raw === 'COMPLETED') return 'Completed';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'Cancelled';
  if (raw === 'DECLINED') return 'Declined';

  if (raw === 'ONGOING' || raw === 'ACCEPTED' || raw === 'IN_PROGRESS' || isAccepted) {
    const timeReached = isScheduledTimeReached(preferredDate, preferredTime, scheduledAt);
    if (!timeReached) {
      return 'Accepted';
    }
    return 'In Progress';
  }

  return 'Pending';
};

const normalizeJobs = (items: any[]): Job[] =>
  items
    .map((item: any) => {
      const rawStatus = String(item.status || 'PENDING').trim().toUpperCase();
      const isAccepted = Boolean(
        item.acceptedOn ||
        item.acceptedAt ||
        rawStatus === 'ONGOING' ||
        rawStatus === 'ACCEPTED' ||
        rawStatus === 'IN_PROGRESS' ||
        rawStatus === 'COMPLETED'
      );
      const computedStatus = normalizeWorkerJobStatus(
        item.status,
        item.preferredDate,
        item.preferredTime,
        item.scheduledAt || item.scheduledDate,
        isAccepted
      );
      return {
        id: String(item.id || item.bookingNumber || item._id || ''),
        requestNumber: String(item.requestNumber || item.id || item.bookingNumber || item._id || ''),
        homeownerId: String(item.homeownerId || ''),
        rawStatus,
        isAccepted,
        name: item.homeownerName || 'Homeowner',
        location:
          item.location ||
          [item.barangay, item.city, item.province].filter(Boolean).join(', ') ||
          'Location not specified',
        status: computedStatus,
        needs: item.serviceType || 'General Repair',
        time: formatDateTime(item.createdAt || item.requestSentAt || item.createdOn || ''),
        requestSentAt: formatDateTime(item.createdAt || item.requestSentAt || item.createdOn || ''),
        scheduledDate: formatScheduleDateTime(item.preferredDate, item.preferredTime, item.scheduledAt),
      preferredDate: item.preferredDate,
      preferredTime: item.preferredTime,
      address: item.address || '',
      province: item.province || '',
      city: item.city || '',
      barangay: item.barangay || '',
      contactNumber: item.contactNumber || item.phone || '',
      homeownerAvatar:
      item.homeownerAvatar ||
      item.homeownerProfileImage ||
      item.homeownerProfilePicture ||
      item.homeownerPhotoUrl ||
      item.homeownerPhoto ||
      item.homeownerPicture ||
        item.homeownerImage ||
        item.avatar ||
        item.profileImage ||
        item.photoUrl ||
        item.image ||
        resolveHomeownerAvatarLike(item.homeowner) ||
        '',
      description: item.description || '',
      email: item.homeownerEmail || '',
      phone: item.homeownerPhone || '',
      acceptedTime: formatDateTime(item.acceptedOn || item.acceptedAt || ''),
      completionTime: formatDateTime(item.completedOn || item.completedAt || ''),
      cancelledTime: formatDateTime(item.cancelledOn || item.cancelledAt || ''),
      declineReason: item.declineReason || undefined,
      cancelledReason: item.declineReason || undefined,
      hasReview: Boolean(item.reviewText),
      rating: typeof item.reviewRating === 'number' ? item.reviewRating : Number(item.reviewRating || 0),
      reviewText: item.reviewText || '',
      reviewDate: item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '',
      reviewTags: Array.isArray(item.reviewTags) ? item.reviewTags : [],
      completionDetails: item.completionDetails || null,
      homeownerRating: typeof item.homeownerRating === 'number' ? item.homeownerRating : Number(item.homeownerRating || 0),
      homeownerRatingCount: Number(item.homeownerRatingCount || 0),
      homeownerReviews: Array.isArray(item.homeownerReviews) ? item.homeownerReviews : [],
      estimatedStartingCost: item.estimatedStartingCost ?? null,
      rescheduleRequest: item.rescheduleRequest ?? null,
    };
  })
    .filter((job) => Boolean(job.id));

const WorkersJobs: React.FC = () => {
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
  const workerProfession = String(resolvedWorker?.profession || '').trim();
  const workerRating = Number.isFinite(Number(resolvedWorker?.rating)) ? Number(resolvedWorker.rating) : null;
  const workerStatus = String(
    resolvedWorker?.status || (resolvedWorker?.isVerified ? 'verified' : '')
  ).trim().toLowerCase();
  const isVerifiedWorker = workerStatus === 'verified' || Boolean(resolvedWorker?.isVerified);
  const jobsCacheKey = `trabahome_worker_jobs:${String(resolvedWorker?._id || workerSession?.worker?._id || workerSession?.email || '')}`;

  const cachedJobs = normalizeJobs(readJsonCache<any[]>(jobsCacheKey, JOBS_CACHE_TTL_MS) || []);
  const [activeTab, setActiveTab] = useState<JobStatus | 'All'>('Pending');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedDeclineJob, setSelectedDeclineJob] = useState<Job | null>(null);
  const [selectedCancelJob, setSelectedCancelJob] = useState<Job | null>(null);
  const [selectedAcceptJob, setSelectedAcceptJob] = useState<Job | null>(null);
  const [selectedCompleteJob, setSelectedCompleteJob] = useState<Job | null>(null);
  const [eReceiptJob, setEReceiptJob] = useState<Job | null>(null);
  const [chatJob, setChatJob] = useState<Job | null>(null);
  const [selectedRescheduleJob, setSelectedRescheduleJob] = useState<Job | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);
  const [rescheduleError, setRescheduleError] = useState<string>('');
  const [jobs, setJobs] = useState<Job[]>(cachedJobs);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'neutral'; message: string } | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(cachedJobs.length === 0);
  const [showFetchNotice, setShowFetchNotice] = useState<boolean>(cachedJobs.length === 0);
  const bannerTimeoutRef = useRef<number | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const loadJobsRef = useRef<(() => void) | null>(null);
  const fetchGuardRef = useRef<number>(0);

  const handleOpenRescheduleModal = (job: Job) => {
    setSelectedRescheduleJob(job);
    const existingDate = String(job.preferredDate || '').slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrowDefault = d.toISOString().slice(0, 10);
    setRescheduleDate(existingDate || tomorrowDefault);
    setRescheduleTime(String(job.preferredTime || '09:00'));
    setRescheduleReason('');
    setRescheduleError('');
  };

  const handleConfirmReschedule = async () => {
    if (!selectedRescheduleJob?.id) return;
    if (!rescheduleDate) {
      setRescheduleError('Please choose a proposed date.');
      return;
    }
    if (!rescheduleTime) {
      setRescheduleError('Please choose a proposed time.');
      return;
    }

    setIsSubmittingReschedule(true);
    setRescheduleError('');
    try {
      const response = await workerAPI.proposeReschedule(selectedRescheduleJob.id, {
        proposedDate: rescheduleDate,
        proposedTime: rescheduleTime,
        reason: rescheduleReason.trim(),
      });
      const updatedReq = response?.request;
      setJobs((prev) =>
        prev.map((job) =>
          job.id === selectedRescheduleJob.id
            ? {
                ...job,
                rescheduleRequest: updatedReq?.rescheduleRequest || {
                  status: 'pending',
                  proposedDate: rescheduleDate,
                  proposedTime: rescheduleTime,
                  reason: rescheduleReason.trim(),
                  proposedBy: 'worker',
                },
              }
            : job
        )
      );
      if (selectedJob && selectedJob.id === selectedRescheduleJob.id) {
        setSelectedJob((prev) =>
          prev
            ? {
                ...prev,
                rescheduleRequest: updatedReq?.rescheduleRequest || {
                  status: 'pending',
                  proposedDate: rescheduleDate,
                  proposedTime: rescheduleTime,
                  reason: rescheduleReason.trim(),
                  proposedBy: 'worker',
                },
              }
            : prev
        );
      }
      setSelectedRescheduleJob(null);
      setBanner({
        type: 'success',
        message: 'Reschedule request sent to homeowner. Waiting for their confirmation.',
      });
      if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = window.setTimeout(() => setBanner(null), 4500);
    } catch (err: any) {
      setRescheduleError(err?.response?.data?.message || 'Failed to submit reschedule request.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  useServiceRequestSync(workerSession?.token, () => loadJobsRef.current?.());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      const match = jobTabs.find(
        (t) => t.toLowerCase() === tabParam.toLowerCase() || (tabParam.toLowerCase() === 'in progress' && t === 'In Progress')
      );
      if (match) {
        setActiveTab(match);
      }
    }
  }, [location.search]);

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

  useEffect(() => {
    if (jobs.length > 0) {
      setShowFetchNotice(false);
      return;
    }
    const timer = window.setTimeout(() => setShowFetchNotice(false), 1000);
    return () => window.clearTimeout(timer);
  }, [jobs.length]);

  const updateJobsCache = (updater: (current: Job[]) => Job[]) => {
    setJobs((current) => {
      const nextJobs = updater(current);
      writeJsonCache(jobsCacheKey, nextJobs);
      return nextJobs;
    });
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

  const handleAcceptJob = (jobId: string): void => {
    if (!isVerifiedWorker) {
      alert("Only verified workers can accept jobs. Your account is currently pending verification.");
      return;
    }
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // 1. Worker active bookings capacity check: max 50
    const ongoingJobs = jobs.filter((j) =>
      j.id !== jobId &&
      (j.status === 'Accepted' || j.status === 'In Progress' || j.rawStatus === 'ONGOING' || j.rawStatus === 'ACCEPTED')
    );
    if (ongoingJobs.length >= 50) {
      alert("You have reached the maximum limit of 50 active bookings. Please complete existing jobs before accepting new ones.");
      return;
    }

    // 2. Worker active bookings with same homeowner: max 3
    const targetHomeownerKey = String(
      targetJob.homeownerId || (targetJob as any).homeowner?._id || targetJob.customer || targetJob.homeownerName || ""
    ).trim();

    const activeForHomeowner = ongoingJobs.filter((j) => {
      const hKey = String(
        j.homeownerId || (j as any).homeowner?._id || j.customer || j.homeownerName || ""
      ).trim();
      return hKey && hKey === targetHomeownerKey;
    });

    if (activeForHomeowner.length >= 3) {
      alert("You cannot accept more than 3 active bookings from the same homeowner simultaneously.");
      return;
    }

    // 3. Duplicate date and time check with same homeowner
    const targetDate = String(targetJob.preferredDate || targetJob.scheduledDate || "").slice(0, 10);
    const targetTime = String(targetJob.preferredTime || "").trim();
    if (targetDate && targetTime) {
      const isDuplicate = activeForHomeowner.some((j) => {
        const jDate = String(j.preferredDate || j.scheduledDate || "").slice(0, 10);
        const jTime = String(j.preferredTime || "").trim();
        return jDate === targetDate && jTime === targetTime;
      });
      if (isDuplicate) {
        alert("You already have an active booking with this homeowner on the scheduled date and time.");
        return;
      }
    }

    const timeReached = isScheduledTimeReached(
      targetJob?.preferredDate,
      targetJob?.preferredTime,
      targetJob?.scheduledDate
    );
    const nextStatus: JobStatus = timeReached ? 'In Progress' : 'Accepted';

    const previousJobsState = [...jobs];

    updateJobsCache((previousJobs) =>
      previousJobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              isAccepted: true,
              rawStatus: 'ACCEPTED',
              acceptedTime: new Date().toLocaleDateString(),
              status: nextStatus,
            }
          : job
      )
    );
    setSelectedJob(null);
    setSelectedAcceptJob(null);
    if (timeReached) {
      setActiveTab('In Progress');
      setBanner({ type: 'success', message: 'Job accepted. Scheduled time reached — moved to In Progress.' });
    } else {
      setActiveTab('Accepted');
      setBanner({ type: 'success', message: 'Job accepted. Moved to Accepted section.' });
    }
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = window.setTimeout(() => setBanner(null), 3500);

    workerAPI
      .updateServiceRequest(jobId, { status: 'ONGOING' })
      .then((resp) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'trabahome_service_request_changed',
              JSON.stringify({ time: Date.now(), id: resp?.request?.id || jobId })
            );
            window.dispatchEvent(new Event('trabahome:service-request-changed'));
          }
        } catch (error) {
          console.error('Error dispatching booking-updated event', error);
        }
      })
      .catch((error) => {
        console.error('Accept job error:', error);
        updateJobsCache(() => previousJobsState);
        const errorMsg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to accept job. Please try again.";
        setBanner({ type: 'neutral', message: String(errorMsg) });
        alert(String(errorMsg));
      });
  };

  const handleDeclineJob = (jobId: string, reason: string): void => {
    if (!isVerifiedWorker) {
      alert("Only verified workers can decline jobs.");
      return;
    }
    updateJobsCache((previousJobs) =>
      previousJobs.map((job) =>
        job.id === jobId ? { ...job, status: 'Declined' as JobStatus, declineReason: reason || undefined } : job
      )
    );
    setSelectedJob(null);
    setSelectedDeclineJob(null);
    setActiveTab('Declined');
    setBanner({ type: 'neutral', message: 'Job declined. Request removed from your list.' });
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = window.setTimeout(() => setBanner(null), 3500);

    workerAPI
      .updateServiceRequest(jobId, { status: 'DECLINED', declineReason: reason })
      .then((resp) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'trabahome_service_request_changed',
              JSON.stringify({ time: Date.now(), id: resp?.request?.id || jobId })
            );
            window.dispatchEvent(new Event('trabahome:service-request-changed'));
          }
        } catch (error) {
          console.error('Error dispatching booking-updated event', error);
        }
      })
      .catch((error) => console.error('Decline job error:', error));
  };

  const handleCompleteJob = (job: Job): void => {
    if (!isVerifiedWorker) {
      alert("Only verified workers can complete jobs.");
      return;
    }
    setSelectedJob(null);
    setSelectedCompleteJob(job);
  };

  const handleConfirmComplete = async (
    jobId: string,
    completionDetails: {
      proofOfWork: string[];
      proofOfPayment: string[];
      paymentAmount: number;
      jobSummary: string;
    },
    homeownerReview?: {
      rating: number;
      reviewText: string;
      reviewTags: string[];
    }
  ): Promise<void> => {
    if (!isVerifiedWorker) {
      throw new Error("Only verified workers can complete jobs.");
    }

    try {
      const resp = await workerAPI.updateServiceRequest(jobId, {
        status: 'COMPLETED',
        completionDetails,
        homeownerReview,
      });

      // Update local cache and state ONLY after the server confirms success
      updateJobsCache((previousJobs) =>
        previousJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: 'Completed' as JobStatus,
                completionDetails: {
                  ...completionDetails,
                  completedAt: new Date().toISOString(),
                },
              }
            : job
        )
      );
      setSelectedJob(null);
      setSelectedCompleteJob(null);
      setActiveTab('Completed');
      setBanner({ type: 'success', message: 'Job completed, E-Receipt generated, and homeowner review saved.' });
      if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = window.setTimeout(() => setBanner(null), 4000);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'trabahome_service_request_changed',
          JSON.stringify({ time: Date.now(), id: resp?.request?.id || jobId })
        );
        window.dispatchEvent(new Event('trabahome:service-request-changed'));
      }
    } catch (error: any) {
      console.error('Complete job error:', error);
      throw error;
    }
  };

  const handleCancelBooking = (jobId: string, reason: string): void => {
    if (!isVerifiedWorker) return;
    updateJobsCache((previousJobs) =>
      previousJobs.map((job) =>
        job.id === jobId
          ? { ...job, status: 'Cancelled' as JobStatus, cancelledReason: reason || undefined, declineReason: reason || undefined }
          : job
      )
    );
    setSelectedJob(null);
    setSelectedCancelJob(null);
    setActiveTab('Cancelled');
    setBanner({ type: 'neutral', message: 'Booking cancelled. Moved to Cancelled.' });
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = window.setTimeout(() => setBanner(null), 3500);

    workerAPI
      .updateServiceRequest(jobId, { status: 'CANCELLED', declineReason: reason })
      .then((resp) => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              'trabahome_service_request_changed',
              JSON.stringify({ time: Date.now(), id: resp?.request?.id || jobId })
            );
            window.dispatchEvent(new Event('trabahome:service-request-changed'));
          }
        } catch (error) {
          console.error('Error dispatching booking-updated event', error);
        }
      })
      .catch((error) => console.error('Cancel job error:', error));
  };

  const handleOpenEReceiptModal = async (job: Job): Promise<void> => {
    const details = job?.completionDetails;
    const hasFullProof = Array.isArray(details?.proofOfWork) &&
      details.proofOfWork.length > 0 &&
      details.proofOfWork[0] !== '[photo]';
    if (hasFullProof || !job?.id) {
      setEReceiptJob(job);
      return;
    }
    try {
      const response = await workerAPI.getServiceRequest(job.id || job.requestNumber);
      const full = (response as any)?.request || (response as any)?.item || (response as any)?.data || response;
      if (full?.completionDetails) {
        setEReceiptJob({
          ...job,
          completionDetails: full.completionDetails,
        });
        return;
      }
    } catch (err) {
      console.warn("Failed to load full completion details:", err);
    }
    setEReceiptJob(job);
  };

  useEffect(() => {
    let mounted = true;
    const loadJobs = async () => {
      if (!workerSession?.token) {
        if (mounted) setIsLoadingJobs(false);
        return;
      }
      if (Date.now() < fetchGuardRef.current) return;
      if (mounted) setIsLoadingJobs(true);
      if (mounted) setJobsError(null);
      try {
        const result = await workerAPI.listServiceRequests();
        const items = Array.isArray(result?.items) ? result.items : [];
        const mappedJobs = normalizeJobs(items);
        if (mounted) {
          setJobs(mappedJobs);
          writeJsonCache(jobsCacheKey, mappedJobs);
        }
      } catch (error: any) {
        console.error('Failed to load worker bookings', error);
        if (mounted) {
          const status = error?.response?.status;
          setJobsError(
            status === 401 || status === 403
              ? 'Your worker session has expired. Please sign in again.'
              : error?.response?.data?.message || 'Unable to load homeowner requests.'
          );
        }
      } finally {
        if (mounted) setIsLoadingJobs(false);
      }
    };

    loadJobsRef.current = loadJobs;
    void loadJobs();

    const refreshJobs = () => {
      void loadJobs();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'trabahome_service_request_changed') {
        void loadJobs();
      }
    };

    window.addEventListener('trabahome:service-request-changed', refreshJobs);
    window.addEventListener('storage', handleStorage);

    return () => {
      mounted = false;
      loadJobsRef.current = null;
      window.removeEventListener('trabahome:service-request-changed', refreshJobs);
      window.removeEventListener('storage', handleStorage);
    };
  }, [jobsCacheKey, workerSession?.token]);

  useEffect(() => {
    const openJobId = (location.state as any)?.openJobId;
    if (!openJobId || jobs.length === 0) return;
    const matchedJob = jobs.find((job) => String(job.id) === String(openJobId));
    if (matchedJob) {
      setSelectedJob(matchedJob);
      setActiveTab(matchedJob.status);
      navigate('/worker-jobs', { replace: true });
    }
  }, [jobs, location.state, navigate]);

  const handleLogout = (): void => {
    clearWorkerSession();
    navigate('/', { replace: true });
  };

  const filteredJobs = jobs.filter((job) => (activeTab === 'All' ? true : job.status === activeTab));
  const sidebarOffset = headerHeight ? headerHeight + 24 : 88;
  const sidebarHeight = headerHeight ? `calc(100vh - ${headerHeight + 48}px)` : 'calc(100vh - 112px)';

  return (
    <div className="min-h-screen bg-[#F9F6F2] font-sans flex flex-col items-center relative text-left">
      <div aria-hidden="true" style={headerHeight ? { height: headerHeight } : undefined} />
      <Header ref={headerRef} onLogoClick={() => navigate(WORKER_DASHBOARD_ROUTE)} />

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
          <header className="mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Jobs</h1>
          </header>

          {banner && (
            <div className="mb-6 px-2">
              <div
                className={`rounded-xl border px-4 py-3 text-[12px] font-semibold ${
                  banner.type === 'success'
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A]'
                    : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#475569]'
                }`}
              >
                {banner.message}
              </div>
            </div>
          )}

          <section className="mb-6 px-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex p-1 overflow-x-auto no-scrollbar gap-1">
              {jobTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[70px] whitespace-nowrap py-2 sm:py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                    activeTab === tab ? 'bg-[#EFF6FF] text-[#1D4ED8] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          <section className="px-2 space-y-4">
            {jobsError ? (
              <div className="text-sm text-red-600 text-center py-10 border border-red-200 bg-red-50 rounded-2xl">
                {jobsError}
              </div>
            ) : filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPreview={setSelectedJob}
                onViewDetails={setSelectedJob}
                onAccept={isVerifiedWorker ? setSelectedAcceptJob : () => undefined}
                onDecline={isVerifiedWorker ? setSelectedDeclineJob : () => undefined}
                onOpenChat={setChatJob}
                onProposeReschedule={handleOpenRescheduleModal}
              />
            ))
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest italic">
                  {showFetchNotice && isLoadingJobs
                    ? `Fetching ${activeTab.toLowerCase()} jobs...`
                    : `No ${activeTab.toLowerCase()} jobs found.`}
                </p>
              </div>
            )}
          </section>
        </main>
      </div>

      <JobDetailsModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onAccept={setSelectedAcceptJob}
        onDecline={setSelectedDeclineJob}
        onComplete={(job) => handleCompleteJob(job)}
        onCancelBooking={setSelectedCancelJob}
        onOpenChat={(job) => setChatJob(job)}
        onViewEReceipt={(job) => void handleOpenEReceiptModal(job)}
        onProposeReschedule={handleOpenRescheduleModal}
      />

      <CompleteJobModal
        job={selectedCompleteJob}
        isOpen={Boolean(selectedCompleteJob)}
        onClose={() => setSelectedCompleteJob(null)}
        onConfirmComplete={handleConfirmComplete}
      />

      {eReceiptJob && (
        <EReceiptModal
          isOpen={Boolean(eReceiptJob)}
          onClose={() => setEReceiptJob(null)}
          booking={{
            requestNumber: eReceiptJob.requestNumber || eReceiptJob.id,
            id: eReceiptJob.id,
            workerName: workerName,
            homeownerName: eReceiptJob.name,
            serviceType: eReceiptJob.needs,
            completedAt: eReceiptJob.completionTime,
            location: eReceiptJob.location,
            completionDetails: eReceiptJob.completionDetails,
          }}
        />
      )}

      <AcceptJobModal
        job={selectedAcceptJob}
        onConfirm={() => selectedAcceptJob && handleAcceptJob(selectedAcceptJob.id)}
        onCancel={() => setSelectedAcceptJob(null)}
      />

      <DeclineJobModal
        job={selectedDeclineJob}
        declineReasons={declineReasons}
        onDecline={handleDeclineJob}
        onCancel={() => setSelectedDeclineJob(null)}
      />

      <DeclineJobModal
        job={selectedCancelJob}
        declineReasons={declineReasons}
        mode="cancel"
        onDecline={handleCancelBooking}
        onCancel={() => setSelectedCancelJob(null)}
      />

      {chatJob && (
        <BookingChatModal
          isOpen={Boolean(chatJob)}
          onClose={() => setChatJob(null)}
          requestId={chatJob.id || chatJob.requestNumber || ''}
          requestNumber={chatJob.requestNumber || chatJob.id}
          serviceType={chatJob.needs}
          bookingStatus={chatJob.status}
          rawStatus={chatJob.rawStatus}
          isAccepted={chatJob.isAccepted}
          acceptedOn={chatJob.acceptedTime}
          otherPartyName={chatJob.name || 'Homeowner'}
          otherPartyRole="Homeowner"
          otherPartyAvatar={chatJob.homeownerAvatar}
          currentRole="worker"
          readOnly={chatJob.status === 'Completed'}
        />
      )}

      {/* Reschedule Proposal Modal */}
      {selectedRescheduleJob && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Propose New Schedule</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  The homeowner must confirm your suggested date and time before it changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRescheduleJob(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                {rescheduleError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Proposed Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B3B68]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Proposed Time *
                </label>
                <input
                  type="time"
                  step="900"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0B3B68] font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Reason for Rescheduling <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Current job running late, traffic delay, materials pickup delay..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs leading-relaxed outline-none focus:border-[#0B3B68]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingReschedule}
                  onClick={() => setSelectedRescheduleJob(null)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReschedule}
                  onClick={handleConfirmReschedule}
                  className="px-6 py-2.5 rounded-full bg-[#0B3B68] hover:bg-[#082a4d] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReschedule ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkersJobs;
