import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Clock, AlertCircle, CheckCircle2, X, ChevronDown, Pencil, Loader2, Sparkles } from 'lucide-react';
import ProfileHeader from '../components/requestpages/ProfileHeader.tsx';
import BasicInfoSection from '../components/workersInfo/BasicInfoSection.tsx';
import ContactInfoSection from '../components/workersInfo/ContactInfoSection.tsx';
import ProofOfWorkSection from '../components/workersInfo/ProofOfWorkSection.tsx';
import WorkerNotificationBell from '../components/workerNotifications/WorkerNotificationBell.tsx';
import MessagesSummaryButton from '../components/chat/MessagesSummaryButton.tsx';
import { Sidebar } from '../components/workersjobs/Index.ts';
import SupportConversation from '../components/support/SupportConversation.tsx';
import { initialProfile } from '../constants/profileData.ts';
import type { WorkerProfile } from '../types/Worker.types.ts';
import { workerAPI } from '../services/WorkerApi.ts';
import { SUPPORT_ISSUE_CATEGORIES, submitSupportTicket } from '../services/SupportApi.ts';
import { clearWorkerSession, getWorkerSession } from '../utils/workerAuth.ts';
import { pangasinanCities, getPangasinanBarangays, professionOptions } from '../constants/SignUpData.ts';
import { fetchPublicSkills } from '../services/AdminApi.ts';

const WORKER_DASHBOARD_ROUTE = '/home-worker';

interface WorkerReview {
  id: string;
  homeownerName: string;
  homeownerAvatar: string;
  serviceType: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  completedOn: string;
}

const workerText = (value: unknown): string => String(value || '').trim();

const workerNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toWorkerProfile = (value: unknown): WorkerProfile => {
  const worker = value && typeof value === 'object' ? (value as Record<string, any>) : {};
  const locationObject = worker.location && typeof worker.location === 'object' ? worker.location : null;
  const location =
    workerText(worker.locationLabel) ||
    workerText(locationObject?.label) ||
    (typeof worker.location === 'string' ? workerText(worker.location) : '') ||
    [worker.barangay, worker.city, worker.province].map(workerText).filter(Boolean).join(', ');
  const status = workerText(worker.status);
  const proofOfWork = Array.isArray(worker.proofOfWork)
    ? worker.proofOfWork.map(workerText).filter(Boolean)
    : [];

  return {
    ...initialProfile,
    firstName: workerText(worker.firstName),
    lastName: workerText(worker.lastName),
    fullName:
      workerText(worker.fullName) ||
      [worker.firstName, worker.lastName].map(workerText).filter(Boolean).join(' ') ||
      workerText(worker.name),
    profession:
      workerText(worker.profession) ||
      workerText(worker.service) ||
      workerText(worker.role) ||
      workerText(worker.category),
    barangay: workerText(worker.barangay),
    city: workerText(worker.city || worker.municipality),
    province: workerText(worker.province),
    locationLabel: workerText(worker.locationLabel) || location,
    location,
    avatar:
      workerText(worker.avatar) ||
      workerText(worker.profileImage) ||
      workerText(worker.photoUrl) ||
      workerText(worker.image) ||
      workerText(worker.photo) ||
      workerText(worker.picture),
    bio: workerText(worker.bio),
    yearsExperience: workerNumber(worker.yearsExperience),
    languages: Array.isArray(worker.languages)
      ? worker.languages.map(workerText).filter(Boolean)
      : workerText(worker.languages).split(',').map((item) => item.trim()).filter(Boolean),
    availabilityStatus: workerText(worker.availabilityStatus || worker.availability?.status),
    workingSchedule: workerText(worker.workingSchedule || worker.availability?.schedule),
    phone: workerText(worker.phone || worker.mobileNumber || worker.contactNumber),
    email: workerText(worker.email),
    facebook: workerText(worker.facebook),
    images: proofOfWork.length > 0
      ? proofOfWork
      : [null, null, null],
    rating: workerNumber(worker.rating),
    ratingsCount: workerNumber(worker.ratingsCount ?? worker.reviews ?? worker.reviewsCount),
    status,
    isVerified:
      Boolean(worker.isVerified) ||
      ['verified', 'approved', 'active'].includes(status.toLowerCase()),
    pendingProfileUpdate: worker.pendingProfileUpdate || null,
  };
};

const WorkerOwnProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const workerSession = getWorkerSession();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [baselineProfile, setBaselineProfile] = useState<WorkerProfile | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [modifiedFields, setModifiedFields] = useState<Array<{ label: string; oldValue: string; newValue: string }>>([]);
  const [profile, setProfile] = useState<WorkerProfile>(initialProfile);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [profileLoadError, setProfileLoadError] = useState<string>('');
  const [workerDocumentId, setWorkerDocumentId] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState<boolean>(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState<boolean>(false);
  const [profileActionFeedback, setProfileActionFeedback] = useState<string>('');
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState<boolean>(false);
  const [isReviewsLoading, setIsReviewsLoading] = useState<boolean>(false);
  const [reviewsLoaded, setReviewsLoaded] = useState<boolean>(false);
  const [reviewsError, setReviewsError] = useState<string>('');
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isSupportSubmitting, setIsSupportSubmitting] = useState<boolean>(false);
  const [supportError, setSupportError] = useState<string>('');
  const [supportStatus, setSupportStatus] = useState<string>('');
  const [supportView, setSupportView] = useState<'new' | 'tickets'>('new');
  const [supportRefreshKey, setSupportRefreshKey] = useState<number>(0);
  const [openSupportTicketId, setOpenSupportTicketId] = useState<string>('');
  const [supportForm, setSupportForm] = useState({
    category: 'Account & Profile',
    customCategory: '',
    message: '',
  });

  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState<boolean>(false);
  const [isSubmittingDetails, setIsSubmittingDetails] = useState<boolean>(false);
  const [editDetailsError, setEditDetailsError] = useState<string>('');
  const [availableSkills, setAvailableSkills] = useState<string[]>(professionOptions);
  const [isProfessionDropdownOpen, setIsProfessionDropdownOpen] = useState<boolean>(false);
  const [detailsForm, setDetailsForm] = useState({
    fullName: '',
    phone: '',
    city: '',
    barangay: '',
    skills: [] as string[],
    notes: '',
  });

  useEffect(() => {
    let isMounted = true;
    fetchPublicSkills()
      .then((res) => {
        if (!isMounted) return;
        if (res?.skills && Array.isArray(res.skills) && res.skills.length > 0) {
          const names = res.skills.map((s: any) => s.name).filter(Boolean);
          const combined = Array.from(new Set([...names, ...professionOptions]));
          setAvailableSkills(combined);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenEditDetails = () => {
    const existingSkills = (profile.pendingProfileUpdate?.fields?.skills?.length
      ? profile.pendingProfileUpdate.fields.skills
      : String(profile.profession || '').split(',').map((s) => s.trim()).filter(Boolean)
    );
    setDetailsForm({
      fullName: profile.pendingProfileUpdate?.fields?.fullName || profile.fullName || '',
      phone: profile.pendingProfileUpdate?.fields?.phone || profile.phone || '',
      city: profile.pendingProfileUpdate?.fields?.city || profile.city || '',
      barangay: profile.pendingProfileUpdate?.fields?.barangay || profile.barangay || '',
      skills: existingSkills,
      notes: profile.pendingProfileUpdate?.notes || '',
    });
    setEditDetailsError('');
    setIsEditDetailsOpen(true);
  };

  const handleToggleDetailSkill = (skill: string) => {
    setDetailsForm((prev) => {
      const exists = prev.skills.includes(skill);
      if (exists) {
        if (prev.skills.length <= 1) return prev;
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) };
      }
      return { ...prev, skills: [...prev.skills, skill] };
    });
  };

  const handleSubmitDetailsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailsForm.fullName.trim()) {
      setEditDetailsError('Full name is required.');
      return;
    }
    if (!detailsForm.phone.trim() || !/^09\d{9}$/.test(detailsForm.phone.trim())) {
      setEditDetailsError('A valid 11-digit Philippine phone number starting with 09 is required.');
      return;
    }
    if (!detailsForm.city.trim()) {
      setEditDetailsError('City / Municipality is required.');
      return;
    }
    if (!detailsForm.barangay.trim()) {
      setEditDetailsError('Barangay is required.');
      return;
    }
    if (detailsForm.skills.length === 0) {
      setEditDetailsError('Please select at least one profession / skill.');
      return;
    }

    setIsSubmittingDetails(true);
    setEditDetailsError('');
    try {
      const res = await workerAPI.requestProfileUpdate({
        fullName: detailsForm.fullName.trim(),
        phone: detailsForm.phone.trim(),
        city: detailsForm.city.trim(),
        barangay: detailsForm.barangay.trim(),
        skills: detailsForm.skills,
        notes: detailsForm.notes.trim(),
      });
      setProfile((prev) => ({
        ...prev,
        pendingProfileUpdate: res.pendingProfileUpdate || {
          status: 'pending',
          requestedAt: new Date().toISOString(),
          fields: {
            fullName: detailsForm.fullName.trim(),
            phone: detailsForm.phone.trim(),
            city: detailsForm.city.trim(),
            barangay: detailsForm.barangay.trim(),
            skills: detailsForm.skills,
          },
          notes: detailsForm.notes.trim(),
        },
      }));
      setIsEditDetailsOpen(false);
      setProfileActionFeedback('Your profile update request has been submitted for administrator review.');
      setTimeout(() => setProfileActionFeedback(''), 5000);
    } catch (err: any) {
      setEditDetailsError(err?.response?.data?.message || 'Failed to submit profile update request. Please try again.');
    } finally {
      setIsSubmittingDetails(false);
    }
  };
  const workerName = workerText(profile.fullName) || 'Worker';
  const workerProfessionLabel = String(profile.profession || '').trim() || 'Profession not set';
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);
  const supportWordCount = supportForm.message.trim().split(/\s+/).filter(Boolean).length;
  const supportCategory = supportForm.category === 'Other'
    ? supportForm.customCategory.trim()
    : supportForm.category;
  const isSupportFormValid = Boolean(
    workerText(profile.fullName) &&
    workerText(profile.email) &&
    supportCategory &&
    supportForm.message.trim() &&
    supportWordCount <= 250 &&
    !isSupportSubmitting
  );

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setIsProfileLoading(true);
      setProfileLoadError('');
      try {
        const response = await workerAPI.me({ summary: true, images: false });
        const responseData = (response as {
          data?: Record<string, unknown> & { worker?: Record<string, unknown> };
        })?.data;
        const worker = response?.worker || responseData?.worker || responseData;
        if (!isMounted) return;
        if (!worker || typeof worker !== 'object') {
          setProfileLoadError('Unable to load the registered Worker information.');
          return;
        }

        setWorkerDocumentId(workerText(worker.id || worker._id));
        setProfile(toWorkerProfile(worker));
        setIsProfileLoading(false);

        try {
          const assetResponse = await workerAPI.me({ assets: 'profile' });
          const assetData = assetResponse?.worker || {};
          if (!isMounted) return;
          const proofOfWork = Array.isArray(assetData.proofOfWork)
            ? assetData.proofOfWork.map(workerText).filter(Boolean)
            : [];
          setProfile((current) => ({
            ...current,
            avatar: workerText(assetData.avatar) || current.avatar,
            images: proofOfWork.length > 0 ? proofOfWork : current.images,
          }));
        } catch (assetError) {
          console.error('Unable to load Worker profile images:', assetError);
        }
      } catch (error) {
        console.error('Failed to load worker profile:', error);
        if (isMounted) setProfileLoadError('Unable to load the registered Worker information.');
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    };

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [workerSession?.token]);

  useEffect(() => {
    const ticketId = String(new URLSearchParams(location.search).get('ticketId') || '').trim();
    if (!ticketId) return;
    setOpenSupportTicketId(ticketId);
    setSupportView('tickets');
    setIsSupportOpen(true);
  }, [location.key, location.search]);

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

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = event.target;
    setProfile((previousProfile) => {
      if (name === 'languages') {
        return {
          ...previousProfile,
          languages: value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        };
      }
      if (name === 'yearsExperience') {
        return { ...previousProfile, yearsExperience: Number(value) || 0 };
      }
      return { ...previousProfile, [name]: value };
    });
  };

  const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const nextImages = [...profile.images];
      nextImages[index] = reader.result as string;
      setProfile((previousProfile) => ({ ...previousProfile, images: nextImages }));
    };
    reader.readAsDataURL(file);
  };

  const handleStatusChange = async (newStatus: string): Promise<void> => {
    setIsStatusUpdating(true);
    setProfileActionFeedback('');
    try {
      setProfile((previousProfile) => ({
        ...previousProfile,
        availabilityStatus: newStatus,
      }));
      const response = await workerAPI.updateMe({ availabilityStatus: newStatus });
      const updatedStatus = String(response?.worker?.availabilityStatus || newStatus);
      setProfile((previousProfile) => ({
        ...previousProfile,
        availabilityStatus: updatedStatus,
      }));
      setProfileActionFeedback(`Work status updated to "${newStatus}"!`);
      setTimeout(() => setProfileActionFeedback(''), 4000);
    } catch (error) {
      console.error('Failed to update status:', error);
      setProfileActionFeedback('Failed to update status. Please try again.');
      setTimeout(() => setProfileActionFeedback(''), 4000);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const avatarUrl = String(reader.result || '');
      if (!avatarUrl) return;

      setProfile((previousProfile) => ({
        ...previousProfile,
        avatar: avatarUrl,
      }));

      setIsAvatarUploading(true);
      setProfileActionFeedback('');
      try {
        const response = await workerAPI.updateMe({ avatar: avatarUrl });
        const updatedAvatar = String(
          response?.worker?.avatar || response?.worker?.profileImage || avatarUrl
        );
        setProfile((previousProfile) => ({
          ...previousProfile,
          avatar: updatedAvatar,
        }));
        setProfileActionFeedback('Profile photo updated successfully!');
        setTimeout(() => setProfileActionFeedback(''), 4000);
      } catch (error) {
        console.error('Failed to update profile photo:', error);
        setProfileActionFeedback('Failed to save profile photo. Please try again.');
        setTimeout(() => setProfileActionFeedback(''), 4000);
      } finally {
        setIsAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSeeReviews = async (): Promise<void> => {
    setIsReviewsOpen(true);
    if (reviewsLoaded || isReviewsLoading) return;
    if (!workerDocumentId) {
      setReviewsError('Worker profile is still loading. Please try again.');
      return;
    }

    setIsReviewsLoading(true);
    setReviewsError('');
    try {
      const response = await workerAPI.getWorkerById(workerDocumentId, {
        includeCompletedJobs: true,
      });
      const worker = response?.data || {};
      const completedJobs = Array.isArray(worker.completedJobs) ? worker.completedJobs : [];
      const loadedReviews = completedJobs
        .filter((job: any) => {
          const rating = Number(job?.reviewRating);
          return (
            String(job?.status || '').trim().toUpperCase() === 'COMPLETED' &&
            Boolean(job?.reviewedAt) &&
            Number.isFinite(rating) &&
            rating >= 1 &&
            rating <= 5
          );
        })
        .map((job: any, index: number): WorkerReview => ({
          id: workerText(job?.id || job?.requestNumber || job?.bookingNumber) || `review-${index}`,
          homeownerName: workerText(job?.homeownerName) || 'Homeowner',
          homeownerAvatar: workerText(job?.homeownerAvatar),
          serviceType: workerText(job?.serviceType) || 'Service',
          rating: workerNumber(job?.reviewRating),
          comment: workerText(job?.reviewText),
          reviewedAt: workerText(job?.reviewedAt || job?.completedOn),
          completedOn: workerText(job?.completedOn),
        }));

      setReviews(loadedReviews);
      setReviewsLoaded(true);
      setProfile((current) => ({
        ...current,
        rating: workerNumber(worker.rating) || current.rating,
        ratingsCount: loadedReviews.length,
      }));
    } catch (error) {
      console.error('Failed to load Worker reviews:', error);
      setReviewsError('Unable to load reviews right now.');
    } finally {
      setIsReviewsLoading(false);
    }
  };

  const handleOpenSupport = (): void => {
    setSupportError('');
    setSupportStatus('');
    setSupportView('new');
    setIsSupportOpen(true);
  };

  const handleSubmitSupport = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isSupportFormValid || !workerSession?.token) return;

    setIsSupportSubmitting(true);
    setSupportError('');
    setSupportStatus('');
    try {
      const result = await submitSupportTicket(workerSession.token, {
        name: workerText(profile.fullName),
        email: workerText(profile.email),
        issueCategory: supportCategory,
        message: supportForm.message.trim(),
      });
      setSupportStatus(`Message sent. Ticket ${result.ticketNumber} was created.`);
      setSupportForm((current) => ({ ...current, message: '' }));
      setOpenSupportTicketId(result.ticketNumber);
      setSupportRefreshKey((current) => current + 1);
      setSupportView('tickets');
    } catch (error) {
      setSupportError(error instanceof Error ? error.message : 'Unable to send message. Please try again.');
    } finally {
      setIsSupportSubmitting(false);
    }
  };

  const handleToggleEdit = async (): Promise<void> => {
    if (!isEditing) {
      setBaselineProfile(JSON.parse(JSON.stringify(profile)));
      setIsEditing(true);
      return;
    }

    // User clicked "Save changes" while in edit mode.
    // Calculate list of modified fields compared to baselineProfile.
    const changes: Array<{ label: string; oldValue: string; newValue: string }> = [];

    // Bio
    const oldBio = String(baselineProfile?.bio || '').trim();
    const newBio = String(profile.bio || '').trim();
    if (oldBio !== newBio) {
      changes.push({
        label: 'Bio / Description',
        oldValue: oldBio || '(Empty)',
        newValue: newBio || '(Empty)',
      });
    }

    // Years of Experience
    const oldExp = Number(baselineProfile?.yearsExperience ?? 0);
    const newExp = Number(profile.yearsExperience ?? 0);
    if (oldExp !== newExp) {
      changes.push({
        label: 'Years of Experience',
        oldValue: `${oldExp} year${oldExp === 1 ? '' : 's'}`,
        newValue: `${newExp} year${newExp === 1 ? '' : 's'}`,
      });
    }

    // Languages
    const oldLangs = Array.isArray(baselineProfile?.languages)
      ? baselineProfile.languages.join(', ')
      : String(baselineProfile?.languages || '');
    const newLangs = Array.isArray(profile.languages)
      ? profile.languages.join(', ')
      : String(profile.languages || '');
    if (oldLangs.trim() !== newLangs.trim()) {
      changes.push({
        label: 'Languages',
        oldValue: oldLangs || '(Empty)',
        newValue: newLangs || '(Empty)',
      });
    }

    // Availability Status
    const oldStatus = String(baselineProfile?.availabilityStatus || '').trim();
    const newStatus = String(profile.availabilityStatus || '').trim();
    if (oldStatus !== newStatus) {
      changes.push({
        label: 'Availability Status',
        oldValue: oldStatus || '(Not set)',
        newValue: newStatus || '(Not set)',
      });
    }

    // Working Schedule
    const oldSched = String(baselineProfile?.workingSchedule || '').trim();
    const newSched = String(profile.workingSchedule || '').trim();
    if (oldSched !== newSched) {
      changes.push({
        label: 'Working Schedule',
        oldValue: oldSched || '(Not set)',
        newValue: newSched || '(Not set)',
      });
    }

    // Portfolio Images
    const oldImgs = (baselineProfile?.images || []).filter(Boolean);
    const newImgs = (profile.images || []).filter(Boolean);
    const isImagesChanged =
      oldImgs.length !== newImgs.length ||
      oldImgs.some((img, idx) => img !== newImgs[idx]);
    if (isImagesChanged) {
      changes.push({
        label: 'Portfolio Images',
        oldValue: `${oldImgs.length} image${oldImgs.length === 1 ? '' : 's'}`,
        newValue: `${newImgs.length} image${newImgs.length === 1 ? '' : 's'}`,
      });
    }

    setModifiedFields(changes);
    setShowConfirmModal(true);
  };

  const confirmAndSaveProfile = async (): Promise<void> => {
    if (isSaving) return;
    setIsSaving(true);
    setShowConfirmModal(false);
    try {
      const response = await workerAPI.updateMe({
        avatar: profile.avatar,
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        languages: Array.isArray(profile.languages) ? profile.languages : String(profile.languages || ''),
        availabilityStatus: profile.availabilityStatus,
        workingSchedule: profile.workingSchedule,
        proofOfWork: profile.images.filter(Boolean),
      });
      const updated = response?.worker || {};
      setProfile((previousProfile) => ({
        ...previousProfile,
        bio: String(updated.bio || previousProfile.bio || ''),
        profession: String(updated.profession || previousProfile.profession || ''),
        yearsExperience: Number.isFinite(Number(updated.yearsExperience)) ? Number(updated.yearsExperience) : previousProfile.yearsExperience,
        languages: Array.isArray(updated.languages)
          ? updated.languages.map(String).filter(Boolean)
          : String(updated.languages || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
        availabilityStatus: String(updated.availabilityStatus || previousProfile.availabilityStatus || ''),
        workingSchedule: String(updated.workingSchedule || previousProfile.workingSchedule || ''),
        fullName: String(updated.fullName || previousProfile.fullName || ''),
        avatar: String(updated.avatar || updated.profileImage || updated.photoUrl || previousProfile.avatar || ''),
        images: Array.isArray(updated.proofOfWork) && updated.proofOfWork.length > 0
          ? [...updated.proofOfWork, null, null, null].slice(0, 3)
          : previousProfile.images,
      }));
      setIsEditing(false);
      setBaselineProfile(null);
      setProfileActionFeedback('The changes saved successfully!');
      setTimeout(() => setProfileActionFeedback(''), 4000);
    } catch (error) {
      console.error('Failed to save worker profile:', error);
      setProfileActionFeedback('Failed to save profile changes. Please try again.');
      setTimeout(() => setProfileActionFeedback(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = (): void => {
    clearWorkerSession();
    navigate('/', { replace: true });
  };

  const sidebarOffset = headerHeight ? headerHeight + 24 : 88;
  const sidebarHeight = headerHeight
    ? `calc(100vh - ${headerHeight + 48}px)`
    : 'calc(100vh - 112px)';

  if (isProfileLoading || profileLoadError) {
    return (
      <div className="min-h-screen bg-[#F9F6F2] font-sans">
        <header className="h-[72px] border-b border-[#E7E2DA] bg-[#F9F5F0] px-6">
          <div className="mx-auto flex h-full max-w-[1280px] items-center">
            <img src="/assets/Logo.png" alt="TrabaHome" className="h-8 w-auto" />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            {isProfileLoading ? (
              <div className="animate-pulse space-y-6" aria-label="Loading registered Worker information">
                <div className="h-8 w-44 rounded-lg bg-gray-200" />
                <div className="h-28 rounded-2xl bg-gray-100" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-xl bg-gray-100" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <h1 className="text-xl font-bold text-[#0B3B68]">Unable to load Worker information</h1>
                <p className="mt-2 text-sm text-gray-500">{profileLoadError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-6 rounded-full bg-[#0B3B68] px-5 py-2.5 text-sm font-semibold text-white"
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
    <div className="min-h-screen bg-[#F9F6F2] font-sans flex flex-col items-center text-left relative">
      <div aria-hidden="true" style={headerHeight ? { height: headerHeight } : undefined} />
      <header
        ref={headerRef}
        className="w-full bg-[#F9F5F0] border-b border-[#E7E2DA] fixed top-0 left-0 right-0 z-50 shadow-sm"
      >
        <div className="max-w-[1280px] mx-auto w-full px-6 py-4 flex justify-between items-center">
          <div
            className="w-[260px] flex items-center cursor-pointer"
            onClick={() => navigate(WORKER_DASHBOARD_ROUTE)}
          >
            <img
              src="/assets/Logo.png"
              alt="TrabaHome"
              className="h-8 w-auto"
            />
          </div>
          <div className="flex-1 flex justify-end items-center gap-2 sm:gap-3">
            <WorkerNotificationBell />
            <MessagesSummaryButton role="worker" />
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-start p-3 sm:p-6 pb-24 lg:pb-6">
        <Sidebar
          location={location}
          navigate={navigate}
          workerName={workerName}
          workerAvatar={profile.avatar}
          workerProfession={workerProfessionLabel}
          workerRating={profile.rating}
          onLogout={handleLogout}
          stickyTop={sidebarOffset}
          stickyHeight={sidebarHeight}
        />

        <main className="flex-1 w-full min-w-0 max-w-[1080px]">
          <header className="flex items-center justify-between gap-3 mb-4 sm:mb-6 px-2">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </header>

          {/* Pending Profile Update Alert Banner */}
          {profile.pendingProfileUpdate?.status === 'pending' && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-2xs">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                    Account Details Update Pending Review
                  </h4>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Under Review
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Your submitted updates are currently being reviewed by the administrator. Once approved, your new profile details will be updated publicly.
                </p>
                {profile.pendingProfileUpdate.fields && (
                  <div className="mt-2.5 text-[11px] text-amber-900 space-y-1 bg-amber-100/70 p-3 rounded-xl border border-amber-200/80">
                    {profile.pendingProfileUpdate.fields.fullName && (
                      <p><span className="font-bold">Proposed Name:</span> {profile.pendingProfileUpdate.fields.fullName}</p>
                    )}
                    {profile.pendingProfileUpdate.fields.phone && (
                      <p><span className="font-bold">Proposed Phone:</span> {profile.pendingProfileUpdate.fields.phone}</p>
                    )}
                    {(profile.pendingProfileUpdate.fields.city || profile.pendingProfileUpdate.fields.barangay) && (
                      <p><span className="font-bold">Proposed Location:</span> {[profile.pendingProfileUpdate.fields.barangay, profile.pendingProfileUpdate.fields.city].filter(Boolean).join(', ')}</p>
                    )}
                    {profile.pendingProfileUpdate.fields.skills && profile.pendingProfileUpdate.fields.skills.length > 0 && (
                      <p><span className="font-bold">Proposed Skills:</span> {profile.pendingProfileUpdate.fields.skills.join(', ')}</p>
                    )}
                    {profile.pendingProfileUpdate.notes && (
                      <p><span className="font-bold">Notes:</span> {profile.pendingProfileUpdate.notes}</p>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleOpenEditDetails}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-700 underline cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Modify Pending Request</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rejected Profile Update Alert Banner */}
          {profile.pendingProfileUpdate?.status === 'rejected' && (
            <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-red-900">
                    Profile Details Update Declined
                  </h4>
                  <span className="text-[10px] font-bold bg-red-200 text-red-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Declined
                  </span>
                </div>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  The administrator declined your recent profile update request: <span className="font-bold">{profile.pendingProfileUpdate.declineReason || 'No reason provided.'}</span>
                </p>
                <button
                  type="button"
                  onClick={handleOpenEditDetails}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Submit Updated Details</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-6 items-start">
            <div>
              {profileActionFeedback && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in">
                  <span>{profileActionFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setProfileActionFeedback('')}
                    className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
              <ProfileHeader
                profile={profile}
                isEditing={isEditing}
                onAvatarUpload={handleAvatarUpload}
                onStatusChange={handleStatusChange}
                isStatusUpdating={isStatusUpdating}
                isAvatarUploading={isAvatarUploading}
                onSeeReviews={handleSeeReviews}
                isReviewsLoading={isReviewsLoading}
              />
              <BasicInfoSection
                profile={profile}
                isEditing={isEditing}
                onToggleEdit={handleToggleEdit}
                onInputChange={handleInputChange}
              />
              <ProofOfWorkSection
                profile={profile}
                isEditing={isEditing}
                onImageUpload={handleImageUpload}
              />
            </div>

            <div className="xl:sticky xl:top-28">
              <ContactInfoSection
                profile={profile}
                onContactSupport={workerText(profile.fullName) && workerText(profile.email) ? handleOpenSupport : undefined}
                onEditDetails={handleOpenEditDetails}
              />
            </div>
          </div>

          {/* Mobile Logout Button Card */}
          <div className="lg:hidden mt-8 mb-4 pt-4 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Worker Account</span>
            </button>
          </div>
        </main>
      </div>

      {isReviewsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="worker-reviews-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsReviewsOpen(false);
          }}
        >
          <div className="w-full max-w-xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 id="worker-reviews-title" className="text-lg font-bold text-gray-900">Worker Reviews</h2>
                <p className="mt-1 text-xs text-gray-500">Feedback from completed TrabaHome requests.</p>
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
              {isReviewsLoading ? (
                <p className="py-10 text-center text-sm text-gray-500">Loading reviews...</p>
              ) : reviewsError ? (
                <p className="py-10 text-center text-sm text-red-500">{reviewsError}</p>
              ) : reviews.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-bold text-[#0B3B68]">
                            {review.homeownerAvatar ? (
                              <img
                                src={review.homeownerAvatar}
                                alt={review.homeownerName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              review.homeownerName.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">{review.homeownerName}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {review.serviceType}
                              {review.completedOn ? ` • ${new Date(review.completedOn).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          Completed
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-bold text-yellow-500" aria-label={`${review.rating.toFixed(1)} out of 5 stars`}>
                        ★ {review.rating.toFixed(1)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {review.comment || 'No written comment.'}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isSupportOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="worker-support-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSupportSubmitting) setIsSupportOpen(false);
          }}
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 id="worker-support-title" className="text-lg font-bold text-[#0B3B68]">Contact Support</h2>
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

            <div className="flex gap-2 border-b border-gray-100 px-6 py-3">
              <button
                type="button"
                onClick={() => setSupportView('new')}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${supportView === 'new' ? 'bg-[#0B3B68] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                New Request
              </button>
              <button
                type="button"
                onClick={() => setSupportView('tickets')}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${supportView === 'tickets' ? 'bg-[#0B3B68] text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                My Tickets
              </button>
            </div>

            {supportView === 'new' ? (
            <form className="space-y-4 p-6" onSubmit={handleSubmitSupport}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">Name</label>
                  <input
                    type="text"
                    value={profile.fullName}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-600">Email</label>
                  <input
                    type="email"
                    value={profile.email}
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

              {supportForm.category === 'Other' ? (
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
                    const message = words.length <= 250 ? event.target.value : words.slice(0, 250).join(' ');
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
                {isSupportSubmitting ? 'Sending...' : 'Send Message'}
              </button>
              {supportError ? <p className="text-xs font-semibold text-red-500">{supportError}</p> : null}
              {supportStatus ? <p className="text-xs font-semibold text-[#0B3B68]">{supportStatus}</p> : null}
            </form>
            ) : (
              <div className="p-6">
                <SupportConversation
                  token={workerSession?.token || ''}
                  currentRole="Worker"
                  initialTicketId={openSupportTicketId}
                  refreshKey={supportRefreshKey}
                  detailRefreshKey={location.key}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-gray-100 animate-in zoom-in-95 text-left">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">Confirm Profile Changes</h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-5">
              Please review the modified fields below before saving. These changes will be visible to homeowners.
            </p>

            {modifiedFields.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 mb-6">
                {modifiedFields.map((field) => (
                  <div key={field.label} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      {field.label}
                    </p>
                    <div className="text-xs space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase w-14 shrink-0">Previous:</span>
                        <span className="text-gray-500 line-through truncate">{field.oldValue}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-semibold text-[#00A651] uppercase w-14 shrink-0">New:</span>
                        <span className="text-gray-900 font-semibold truncate">{field.newValue}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center mb-6">
                <p className="text-xs font-semibold text-gray-600">No modified fields detected.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Your profile details match the previous saved version.</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndSaveProfile}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-full bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Confirm & Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ACCOUNT DETAILS MODAL (ADMIN APPROVAL REQUIRED) ── */}
      {isEditDetailsOpen && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100 flex flex-col my-auto text-left">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-[#004A8C]" />
                  <span>Edit Account Details</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Core changes require administrator approval before taking effect publicly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditDetailsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDetailsUpdate} className="p-6 space-y-4">
              {editDetailsError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editDetailsError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={detailsForm.fullName}
                  onChange={(e) => setDetailsForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#004A8C] focus:ring-2 focus:ring-[#004A8C]/20"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Phone Number (11 digits, starts with 09) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={11}
                  value={detailsForm.phone}
                  onChange={(e) =>
                    setDetailsForm((p) => ({
                      ...p,
                      phone: e.target.value.replace(/\D/g, '').slice(0, 11),
                    }))
                  }
                  placeholder="09123456789"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#004A8C] focus:ring-2 focus:ring-[#004A8C]/20 font-mono"
                />
              </div>

              {/* Location: City and Barangay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Municipality / City *
                  </label>
                  <select
                    value={detailsForm.city}
                    onChange={(e) =>
                      setDetailsForm((p) => ({
                        ...p,
                        city: e.target.value,
                        barangay: '',
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#004A8C]"
                  >
                    <option value="">Select City/Town</option>
                    {pangasinanCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Barangay *
                  </label>
                  <select
                    value={detailsForm.barangay}
                    disabled={!detailsForm.city}
                    onChange={(e) => setDetailsForm((p) => ({ ...p, barangay: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#004A8C] disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {detailsForm.city ? 'Select Barangay' : 'Select City first'}
                    </option>
                    {getPangasinanBarangays(detailsForm.city).map((b: string) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Skills Multi-Select (Uncapped, min 1) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Trade Skills &amp; Professions *
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#004A8C] border border-blue-200">
                    {detailsForm.skills.length} selected (min 1)
                  </span>
                </div>

                {/* Selected Skills Pills */}
                {detailsForm.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200 max-h-28 overflow-y-auto">
                    {detailsForm.skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#004A8C]/10 text-[#004A8C] border border-[#004A8C]/20"
                      >
                        {skill}
                        {detailsForm.skills.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleToggleDetailSkill(skill)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown toggle for skills */}
                <button
                  type="button"
                  onClick={() => setIsProfessionDropdownOpen(!isProfessionDropdownOpen)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-semibold flex items-center justify-between bg-white text-gray-700 hover:border-[#004A8C] transition-colors"
                >
                  <span>Select additional or remove trade skills</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      isProfessionDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isProfessionDropdownOpen && (
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-lg max-h-48 overflow-y-auto space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {availableSkills.map((skill) => {
                        const isChecked = detailsForm.skills.includes(skill);
                        return (
                          <label
                            key={skill}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-blue-50 text-[#004A8C] font-semibold'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleDetailSkill(skill)}
                              className="rounded text-[#004A8C] focus:ring-[#004A8C] h-4 w-4"
                            />
                            <span className="truncate">{skill}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Reason / Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Reason for update / Notes to Admin <span className="font-normal text-gray-400 lowercase">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={detailsForm.notes}
                  onChange={(e) => setDetailsForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Changed mobile number, relocated to new barangay, or added new trade certifications."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs leading-relaxed outline-none focus:border-[#004A8C]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingDetails}
                  onClick={() => setIsEditDetailsOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDetails}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#004A8C] hover:bg-[#00386b] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingDetails ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Submit for Approval</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerOwnProfile;
