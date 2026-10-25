import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, invalidateAdminRequestCache } from '../services/AdminApi.ts';
import { clearAdminSession, getAdminAuthToken } from '../utils/adminAuth.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  ClipboardList,
  Mail,
  Wrench,
  FileText,
  User, 
  Search, 
  X, 
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  MapPin,
  ArrowRight,
  MessageSquare,
  Receipt,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ShieldAlert,
  Ban,
  AlertCircle,
} from 'lucide-react';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';
import BookingChatModal from '../components/chat/BookingChatModal.tsx';
import EReceiptModal from '../components/requestpages/EReceiptModal.tsx';
import BookingStatusBar from '../components/shared/BookingStatusBar.tsx';
import { formatScheduleDateTime, isScheduledTimeReached } from '../utils/formatDateTime.ts';

const normalizeAdminRequestStatus = (status, preferredDate, preferredTime, schedule) => {
  const raw = String(status || '').trim().toUpperCase();
  if (raw === 'COMPLETED') return 'Completed';
  if (raw === 'CANCELLED' || raw === 'CANCELED') return 'Cancelled';
  if (raw === 'DECLINED' || raw === 'REJECTED') return 'Declined';
  if (raw === 'PENDING') return 'Pending';

  if (raw === 'ONGOING' || raw === 'IN_PROGRESS' || raw === 'IN PROGRESS' || raw === 'ACCEPTED') {
    const timeReached = isScheduledTimeReached(preferredDate, preferredTime, schedule);
    if (!timeReached) {
      return 'Pending';
    }
    return 'Ongoing';
  }

  return 'Pending';
};

const formatRequestLocation = (item) => {
  if (!item) return 'Pangasinan';
  if (typeof item.location === 'string' && item.location.trim()) return item.location.trim();
  const parts = [item.barangay, item.city, item.province].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (typeof item.address === 'string' && item.address.trim()) return item.address.trim();
  if (typeof item.location === 'object' && item.location !== null) {
    return item.location.address || item.location.name || item.location.label || 'Pangasinan';
  }
  return 'Pangasinan';
};

function SidebarItem({ label, active, icon, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all relative ${
        active
          ? 'bg-[#0B3B68] text-white font-bold shadow-sm'
          : disabled
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#00AF91] rounded-r-full" />
      )}
      <span className={active ? 'text-white' : 'text-gray-400'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function AdminRequest() {
  const navigate = useNavigate();

  // Navigation state
  const [activeSidebarTab, setActiveSidebarTab] = useState('Request');
  const [activeTab, setActiveTab] = useState('All');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('All Dates');

  // Groups and modal state
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showEReceiptModal, setShowEReceiptModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Admin cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState('input'); // 'input' | 'proofread'
  const [cancelSupportNumber, setCancelSupportNumber] = useState('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleGenerateAiSummary = async () => {
    if (!selectedRequest || isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    setCopiedSummary(false);

    try {
      let messages = [];
      const reqId = selectedRequest.rawId || selectedRequest.id;
      if (reqId) {
        try {
          const res = await adminAPI.getServiceRequestMessages(reqId);
          if (res?.messages && Array.isArray(res.messages)) {
            messages = res.messages;
          }
        } catch {
          messages = Array.isArray(selectedRequest.messages) ? selectedRequest.messages : [];
        }
      }

      await new Promise((r) => setTimeout(r, 500));

      const hName = typeof selectedRequest.homeownerName === 'string' ? selectedRequest.homeownerName : selectedRequest.homeowner?.name || 'Homeowner';
      const wName = typeof selectedRequest.worker === 'string' ? selectedRequest.worker : selectedRequest.worker?.name || selectedRequest.workerName || 'Worker';
      const status = selectedRequest.status || 'Pending';
      const paymentAmount = selectedRequest.completionDetails?.paymentAmount
        ? `₱ ${Number(selectedRequest.completionDetails.paymentAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
        : 'Pending confirmation';
      const proofCount = selectedRequest.completionDetails?.proofOfWork?.length || 0;
      const paymentProofCount = selectedRequest.completionDetails?.proofOfPayment?.length || 0;

      let messageSummary = '';
      let sentiment = 'Professional & Cooperative';
      let disputeRisk = 'Low';

      if (messages.length > 0) {
        const totalMsgs = messages.length;
        const homeownerMsgs = messages.filter((m) => m.senderRole === 'homeowner').length;
        const workerMsgs = messages.filter((m) => m.senderRole === 'worker').length;
        const hasPriceMention = messages.some((m) => /₱|peso|price|cost|pay|rate|charge|dagdag/i.test(m.message || ''));
        const hasDelayMention = messages.some((m) => /late|delay|oras|traffic|tagal|wait|reschedule/i.test(m.message || ''));
        const hasIssueMention = messages.some((m) => /sira|mali|reklamo|problema|hindi|damaged|wrong|incomplete/i.test(m.message || ''));

        if (hasIssueMention || selectedRequest.cancelReason || selectedRequest.declineReason) {
          sentiment = 'Disputed / Contentious';
          disputeRisk = 'High';
        } else if (hasDelayMention || hasPriceMention) {
          sentiment = 'Active Negotiation / Inquiries';
          disputeRisk = 'Medium';
        }

        messageSummary = `${totalMsgs} messages exchanged (${homeownerMsgs} from homeowner, ${workerMsgs} from worker). Communication tone is assessed as ${sentiment.toLowerCase()}.`;
      } else {
        messageSummary = 'No in-app chat messages were exchanged between the homeowner and worker.';
      }

      const caseOverview = `${selectedRequest.service} requested by ${hName} and assigned to ${wName}. Status is currently marked as ${status}.`;
      const evidenceAudit = selectedRequest.status === 'Completed'
        ? `Work completed. ${proofCount} proof of work image(s) uploaded. Payment recorded: ${paymentAmount} (${paymentProofCount} payment receipt upload(s)).`
        : selectedRequest.status === 'Cancelled'
        ? `Request cancelled by ${selectedRequest.cancelledBy || 'User'}. Reason: ${selectedRequest.cancelReason || 'Not stated'}.`
        : selectedRequest.status === 'Declined'
        ? `Request declined by ${selectedRequest.declinedBy || 'Worker'}. Reason: ${selectedRequest.declineReason || 'Not stated'}.`
        : `Active service request scheduled for ${selectedRequest.schedule}.`;
      const communicationInsights = messageSummary;
      const recommendation = disputeRisk === 'High'
        ? 'Recommended: Review full chat messages and reach out to both parties if a formal dispute is lodged.'
        : selectedRequest.status === 'Completed'
        ? 'No further admin action required. Booking completed successfully with verified work proof.'
        : 'Monitor booking progression until completion.';

      setAiSummary({
        caseOverview,
        overview: caseOverview,
        evidenceAudit,
        completionSummary: evidenceAudit,
        communicationInsights,
        messageSummary,
        recommendation,
        recommendedAction: recommendation,
        timeline: selectedRequest.requestedOn || selectedRequest.date || 'Recent',
        sentiment,
        disputeRisk,
        generatedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const sidebarSections = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, route: '/admin-dashboard' },
        { label: 'Workers', icon: Users, route: '/admin-workers' },
        { label: 'Homeowners', icon: Home, route: '/admin-homeowners' },
        { label: 'Request', icon: ClipboardList, route: '/admin-requests' },
        { label: 'Support Request', icon: Mail, route: '/admin-help-requests' },
        { label: 'Skill Manager', icon: Wrench, route: '/admin-skills' },
        { label: 'Email Logs', icon: FileText, route: '/admin-emaillogs' },
      ],
    },
  ];

  const handleOpenEReceiptModal = async (req, homeownerName) => {
    const resolvedWorker =
      typeof req?.worker === 'string' && req.worker.trim()
        ? req.worker
        : req?.workerName ||
          req?.worker?.name ||
          [req?.worker?.firstName, req?.worker?.lastName].filter(Boolean).join(' ') ||
          req?.targetWorkerId?.name ||
          'Local Skilled Worker';

    const resolvedHomeowner =
      typeof homeownerName === 'string' && homeownerName.trim()
        ? homeownerName
        : typeof req?.homeownerName === 'string' && req.homeownerName.trim()
        ? req.homeownerName
        : req?.homeowner?.name ||
          [req?.homeowner?.firstName, req?.homeowner?.lastName].filter(Boolean).join(' ') ||
          'Homeowner';

    const resolvedService = req?.serviceType || req?.service || 'Service';
    const resolvedCompletedAt = req?.completionDetails?.completedAt || req?.completedOn || req?.completedAt;

    const base = {
      ...req,
      homeownerName: resolvedHomeowner,
      workerName: resolvedWorker,
      worker: resolvedWorker,
      service: resolvedService,
      serviceType: resolvedService,
      completedOn: resolvedCompletedAt,
      completedAt: resolvedCompletedAt,
    };
    setSelectedRequest(base);
    setShowEReceiptModal(true);

    const reqId = req?.rawId || req?.id || req?.requestNumber;
    if (reqId) {
      try {
        const full = await adminAPI.getServiceRequest(reqId);
        const fullData = full?.item || full?.request || full?.data;
        if (fullData) {
          setSelectedRequest((prev) => {
            if (!prev) return prev;
            const fullWorkerName =
              (typeof fullData.worker === 'string' && fullData.worker.trim())
                ? fullData.worker
                : fullData.workerName ||
                  fullData.worker?.name ||
                  [fullData.worker?.firstName, fullData.worker?.lastName].filter(Boolean).join(' ') ||
                  prev.workerName ||
                  prev.worker ||
                  'Local Skilled Worker';

            const fullHomeownerName =
              (typeof fullData.homeowner === 'string' && fullData.homeowner.trim())
                ? fullData.homeowner
                : fullData.homeownerName ||
                  fullData.homeowner?.name ||
                  [fullData.homeowner?.firstName, fullData.homeowner?.lastName].filter(Boolean).join(' ') ||
                  prev.homeownerName ||
                  'Homeowner';

            return {
              ...prev,
              completionDetails: fullData.completionDetails || prev.completionDetails,
              homeownerName: fullHomeownerName,
              workerName: fullWorkerName,
              worker: fullWorkerName,
              serviceType: fullData.serviceType || prev.serviceType,
              location: prev.location || fullData.location,
            };
          });
        }
      } catch (err) {
        console.warn('Failed to load full completion details for E-Receipt:', err);
      }
    }
  };

  // Load real service requests from MongoDB via admin API
  const fetchBookings = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const res = await adminAPI.listServiceRequests();
      const data = res?.items || res?.bookings || res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(data)) {
        const grouped = {};
        data.forEach((item) => {
          const hName =
            item.homeownerName ||
            item.homeowner?.name ||
            [item.homeowner?.firstName, item.homeowner?.lastName].filter(Boolean).join(' ') ||
            item.homeownerEmail ||
            'Homeowner Client';

          if (!grouped[hName]) {
            const avatarColorList = [
              'bg-emerald-100 text-emerald-700 border-emerald-200',
              'bg-blue-100 text-blue-700 border-blue-200',
              'bg-purple-100 text-purple-700 border-purple-200',
              'bg-amber-100 text-amber-700 border-amber-200',
              'bg-rose-100 text-rose-700 border-rose-200',
            ];
            const colorIdx =
              Math.abs(hName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) %
              avatarColorList.length;

            grouped[hName] = {
              homeowner: {
                name: hName,
                role: 'Homeowner',
                avatarColor: avatarColorList[colorIdx],
              },
              requests: [],
            };
          }

          const reqId = item.requestNumber || item.id || (item._id ? String(item._id) : 'SR-000000');

          const scheduleStr =
            formatScheduleDateTime(item.preferredDate, item.preferredTime, item.schedule) ||
            item.schedule ||
            'Scheduled';

          const createdDate = item.createdAt ? new Date(item.createdAt) : null;
          const displayDate =
            createdDate && !Number.isNaN(createdDate.getTime())
              ? createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recent';
          const displayFullDate =
            createdDate && !Number.isNaN(createdDate.getTime())
              ? createdDate.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              : '';

          grouped[hName].requests.push({
            id: reqId,
            requestNumber: item.requestNumber || reqId,
            rawId: item.rawId || item.id || item._id || reqId,
            service: item.serviceType || item.service || item.category || 'General Service',
            worker:
              item.workerName ||
              item.worker?.name ||
              [item.worker?.firstName, item.worker?.lastName].filter(Boolean).join(' ') ||
              item.workerEmail ||
              'Unassigned Worker',
            location: formatRequestLocation(item),
            date: displayDate,
            fullDate: displayFullDate,
            status: normalizeAdminRequestStatus(item.status, item.preferredDate, item.preferredTime, scheduleStr),
            statusDetail: item.statusDetail || item.status || '',
            rawStatus: item.statusDetail || item.status || '',
            isAccepted: Boolean(
              item.acceptedOn ||
              ['accepted', 'confirmed', 'ongoing', 'in progress', 'in_progress', 'inprogress', 'completed'].includes(
                String(item.statusDetail || item.status || '').toLowerCase().trim()
              )
            ),
            description: item.description || item.notes || '',
            schedule: scheduleStr,
            preferredDate: item.preferredDate,
            preferredTime: item.preferredTime,
            requestedOn: displayFullDate,
            rating: item.reviewRating ? `${item.reviewRating} / 5` : item.rating ? `${item.rating} / 5` : 'N/A',
            reviewText: item.reviewText || '',
            reviewTags: Array.isArray(item.reviewTags) ? item.reviewTags : [],
            reviewedAt: item.reviewedAt
              ? new Date(item.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '',
            workerReviewRating: item.workerReviewRating ? `${item.workerReviewRating} / 5` : null,
            workerReviewText: item.workerReviewText || '',
            workerReviewTags: Array.isArray(item.workerReviewTags) ? item.workerReviewTags : [],
            workerReviewedAt: item.workerReviewedAt
              ? new Date(item.workerReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '',
            completedOn: item.completedOn
              ? new Date(item.completedOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '',
            completionTime: item.completionTime || '',
            acceptedOn: item.acceptedOn
              ? new Date(item.acceptedOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : '',
            cancelledBy: item.cancelledBy || '',
            cancelReason: item.declineReason || item.cancelReason || '',
            declinedBy: item.declinedBy || '',
            declineReason: item.declineReason || '',
            emailStatus: item.emailStatus || 'Sent',
            internalNote: item.adminNote || item.internalNote || '',
            messages: Array.isArray(item.messages) ? item.messages : [],
            completionDetails: item.completionDetails || null,
            homeownerName: hName,
          });
        });
        setGroups(Object.values(grouped));
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error('Failed to load service requests in Admin-Request:', err);
      setError('Unable to load service requests from database. Please ensure you are logged in as admin.');
      setGroups([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useServiceRequestSync(getAdminAuthToken(), () => {
    invalidateAdminRequestCache();
    fetchBookings(false);
  });

  useEffect(() => {
    fetchBookings(true);

    const handleSync = () => {
      invalidateAdminRequestCache();
      fetchBookings(false);
    };

    window.addEventListener('trabahome:service-request-changed', handleSync);
    window.addEventListener('trabahome:dashboard-refresh', handleSync);

    return () => {
      window.removeEventListener('trabahome:service-request-changed', handleSync);
      window.removeEventListener('trabahome:dashboard-refresh', handleSync);
    };
  }, []);

  const handleNavigation = (label, route) => {
    if (!route) return;
    setActiveSidebarTab(label);
    navigate(route);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDate('All Dates');
    setActiveTab('All');
  };

  // Flatten all requests for tab counters
  const allRequests = useMemo(() => {
    return groups.flatMap((g) => g.requests.map((r) => ({ ...r, homeownerName: g.homeowner.name })));
  }, [groups]);

  // Available dates dynamically derived from actual MongoDB requests
  const availableDates = useMemo(() => {
    const dates = new Set();
    allRequests.forEach((r) => {
      if (r.date && r.date !== 'Recent' && r.date !== 'Scheduled') {
        dates.add(r.date);
      }
    });
    return Array.from(dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [allRequests]);

  const tabCounts = useMemo(() => {
    const counts = { All: allRequests.length, Pending: 0, Ongoing: 0, Completed: 0, Cancelled: 0, Declined: 0 };
    allRequests.forEach((r) => {
      const normalized = normalizeAdminRequestStatus(r.status);
      if (counts[normalized] !== undefined) {
        counts[normalized] += 1;
      }
    });
    return counts;
  }, [allRequests]);

  // Filter requests based on tab, search query, date
  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => {
        const matchingRequests = g.requests.filter((r) => {
          const reqStatus = normalizeAdminRequestStatus(r.status);
          if (activeTab !== 'All' && reqStatus !== activeTab) {
            return false;
          }

          if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase().trim();
            const matchesId = r.id.toLowerCase().includes(q);
            const matchesService = r.service.toLowerCase().includes(q);
            const matchesWorker = r.worker.toLowerCase().includes(q);
            const matchesHomeowner = g.homeowner.name.toLowerCase().includes(q);
            if (!matchesId && !matchesService && !matchesWorker && !matchesHomeowner) {
              return false;
            }
          }

          if (selectedDate !== 'All Dates' && !r.date.includes(selectedDate)) {
            return false;
          }

          return true;
        });

        return { ...g, requests: matchingRequests };
      })
      .filter((g) => g.requests.length > 0);
  }, [groups, activeTab, searchQuery, selectedDate]);

  const handleOpenModal = async (req, homeownerName) => {
    const resolvedWorker =
      typeof req?.worker === 'string' && req.worker.trim()
        ? req.worker
        : req?.workerName ||
          req?.worker?.name ||
          [req?.worker?.firstName, req?.worker?.lastName].filter(Boolean).join(' ') ||
          req?.targetWorkerId?.name ||
          'Local Skilled Worker';

    const resolvedHomeowner =
      typeof homeownerName === 'string' && homeownerName.trim()
        ? homeownerName
        : typeof req?.homeownerName === 'string' && req.homeownerName.trim()
        ? req.homeownerName
        : req?.homeowner?.name ||
          [req?.homeowner?.firstName, req?.homeowner?.lastName].filter(Boolean).join(' ') ||
          'Homeowner';

    const resolvedService = req?.serviceType || req?.service || 'Service';
    const resolvedCompletedAt = req?.completionDetails?.completedAt || req?.completedOn || req?.completedAt;

    setSelectedRequest({
      ...req,
      homeownerName: resolvedHomeowner,
      workerName: resolvedWorker,
      worker: resolvedWorker,
      service: resolvedService,
      serviceType: resolvedService,
      completedOn: resolvedCompletedAt,
      completedAt: resolvedCompletedAt,
    });
    setNoteText(req.internalNote || req.adminNote || '');
    setAiSummary(null);
    setCopiedSummary(false);
    setShowModal(true);

    const reqId = req?.rawId || req?.id || req?.requestNumber;
    if (reqId) {
      try {
        const full = await adminAPI.getServiceRequest(reqId);
        const fullData = full?.item || full?.request || full?.data;
        if (fullData) {
          setSelectedRequest((prev) => {
            if (!prev) return prev;
            const fullWorkerName =
              (typeof fullData.worker === 'string' && fullData.worker.trim())
                ? fullData.worker
                : fullData.workerName ||
                  fullData.worker?.name ||
                  [fullData.worker?.firstName, fullData.worker?.lastName].filter(Boolean).join(' ') ||
                  prev.workerName ||
                  prev.worker ||
                  'Local Skilled Worker';

            const fullHomeownerName =
              (typeof fullData.homeowner === 'string' && fullData.homeowner.trim())
                ? fullData.homeowner
                : fullData.homeownerName ||
                  fullData.homeowner?.name ||
                  [fullData.homeowner?.firstName, fullData.homeowner?.lastName].filter(Boolean).join(' ') ||
                  prev.homeownerName ||
                  'Homeowner';

            const fullService =
              fullData.serviceType ||
              fullData.service ||
              prev.serviceType ||
              prev.service ||
              'Service';

            const fullLocation =
              formatRequestLocation(fullData) ||
              prev.location ||
              'Pangasinan';

            return {
              ...prev,
              completionDetails: fullData.completionDetails || prev.completionDetails,
              messages: Array.isArray(fullData.messages) ? fullData.messages : prev.messages,
              adminNote: fullData.adminNote || prev.adminNote,
              internalNote: fullData.adminNote || prev.internalNote,
              reviewRating: fullData.reviewRating ?? prev.reviewRating,
              reviewText: fullData.reviewText || prev.reviewText,
              reviewTags: Array.isArray(fullData.reviewTags) ? fullData.reviewTags : prev.reviewTags,
              reviewedAt: fullData.reviewedAt
                ? new Date(fullData.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : prev.reviewedAt,
              workerReviewRating: fullData.workerReviewRating ?? prev.workerReviewRating,
              workerReviewText: fullData.workerReviewText || prev.workerReviewText,
              workerReviewTags: Array.isArray(fullData.workerReviewTags) ? fullData.workerReviewTags : prev.workerReviewTags,
              workerReviewedAt: fullData.workerReviewedAt
                ? new Date(fullData.workerReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : prev.workerReviewedAt,
              homeownerName: fullHomeownerName,
              workerName: fullWorkerName,
              worker: fullWorkerName,
              service: fullService,
              serviceType: fullService,
              location: fullLocation,
              description: fullData.description || prev.description,
              supportRequestId: fullData.supportRequestId || prev.supportRequestId,
              rawStatus: fullData.status || prev.rawStatus,
              statusDetail: fullData.status || prev.statusDetail,
            };
          });
        }
      } catch (err) {
        console.warn('Failed to load full request details in modal:', err);
      }
    }
  };

  const handleSaveNote = async () => {
    if (!selectedRequest || isSavingNote) return;
    setIsSavingNote(true);
    try {
      const targetId = selectedRequest.rawId || selectedRequest.id;
      await adminAPI.updateServiceRequest(targetId, { adminNote: noteText });

      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          requests: g.requests.map((r) =>
            r.id === selectedRequest.id || r.rawId === selectedRequest.rawId
              ? { ...r, internalNote: noteText }
              : r
          ),
        }))
      );
      setSelectedRequest((prev) => (prev ? { ...prev, internalNote: noteText } : null));
      alert('Internal note updated and saved to database successfully.');
    } catch (err) {
      console.error('Failed to update admin note:', err);
      alert('Failed to save note to database. Please check your connection.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleOpenCancelModal = () => {
    setCancelStep('input');
    setCancelSupportNumber('');
    setCancelNotes('');
    setCancelError('');
    setShowCancelModal(true);
  };

  const handleProceedToProofread = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!cancelSupportNumber.trim()) {
      setCancelError('Support Request Number is required to document the cancellation.');
      return;
    }
    if (!cancelNotes.trim()) {
      setCancelError('Documentation notes explaining the cancellation reason are required.');
      return;
    }
    setCancelError('');
    setCancelStep('proofread');
  };

  const handleExecuteCancel = async () => {
    if (!selectedRequest || isSubmittingCancel) return;
    setIsSubmittingCancel(true);
    setCancelError('');

    try {
      const targetId = selectedRequest.rawId || selectedRequest.id;
      const srNum = cancelSupportNumber.trim();
      const notes = cancelNotes.trim();
      const combinedReason = `Support Request #${srNum}: ${notes}`;

      await adminAPI.updateServiceRequest(targetId, {
        status: 'CANCELLED',
        supportRequestId: srNum,
        cancelReason: notes,
        declineReason: combinedReason,
        notes: notes,
      });

      // Invalidate cache and emit sync events
      invalidateAdminRequestCache();
      window.dispatchEvent(
        new CustomEvent('trabahome:service-request-changed', {
          detail: { id: targetId, status: 'CANCELLED' },
        })
      );

      // Update current selectedRequest state
      const updatedReq = {
        ...selectedRequest,
        status: 'Cancelled',
        rawStatus: 'CANCELLED',
        statusDetail: 'CANCELLED',
        cancelledBy: 'admin',
        cancelReason: combinedReason,
        declineReason: combinedReason,
        supportRequestId: srNum,
      };
      setSelectedRequest(updatedReq);

      // Update groups state
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          requests: g.requests.map((r) =>
            r.id === selectedRequest.id || r.rawId === selectedRequest.rawId
              ? {
                  ...r,
                  status: 'Cancelled',
                  rawStatus: 'CANCELLED',
                  cancelledBy: 'admin',
                  cancelReason: combinedReason,
                  declineReason: combinedReason,
                  supportRequestId: srNum,
                }
              : r
          ),
        }))
      );

      setShowCancelModal(false);
      fetchBookings(false);
    } catch (err) {
      console.error('Failed to cancel service request as admin:', err);
      setCancelError(err?.message || 'Failed to cancel the booking. Please check your connection and try again.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <Clock size={11} /> Pending
          </span>
        );
      case 'Ongoing':
      case 'Accepted':
        return (
          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <Clock size={11} /> Ongoing
          </span>
        );
      case 'Completed':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <X size={11} /> Cancelled
          </span>
        );
      case 'Declined':
        return (
          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <AlertTriangle size={11} /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9F7F4] overflow-hidden font-sans relative">
      {/* Top Header */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm shrink-0">
        <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto" />
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-8 pr-2 h-full"> 
          <aside className="w-64 h-full bg-white border border-gray-100 rounded-[2rem] shadow-sm flex flex-col p-6">
            <div className="flex-1 overflow-y-auto pr-1">
              <nav className="space-y-4">
                {sidebarSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      {section.title}
                    </p>
                    {section.items.map((item) => (
                      <SidebarItem
                        key={item.label}
                        label={item.label}
                        active={activeSidebarTab === item.label}
                        icon={<item.icon size={17} />}
                        disabled={!item.route}
                        onClick={() => handleNavigation(item.label, item.route)}
                      />
                    ))}
                  </div>
                ))}
              </nav>
            </div>
            <div className="pt-4 border-t border-gray-100 text-center space-y-2">
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xs">
                  <User className="text-gray-400" size={18} />
                </div>
                <span className="font-bold text-gray-800 text-xs">Admin</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAdminSession();
                  navigate('/admin-login', { replace: true });
                }}
                className="w-full py-2 border border-gray-200 rounded-full text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:text-red-500 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </aside>
        </motion.div>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <h1 className="text-3xl font-extrabold mb-1 text-gray-900 tracking-tight">Admin Service Requests</h1>
          <p className="text-gray-500 text-xs mb-6 font-medium">Monitor homeowner bookings, assigned workers, scheduling, and email notifications.</p>

          {/* Status Tabs Header */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {Object.keys(tabCounts).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 ${
                  activeTab === tab
                    ? 'bg-[#1B4D7E] text-white border-[#143B61] shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[11px] font-black ${activeTab === tab ? 'text-white' : 'text-gray-500'}`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search input */}
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-3.5 py-1.5 w-64 shadow-2xs focus-within:border-blue-500 transition">
                <Search size={14} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search Request ID, service, worker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none outline-none w-full text-xs bg-transparent text-gray-800 placeholder-gray-400 font-medium"
                />
                {searchQuery && (
                  <X
                    size={13}
                    className="text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>

              {/* Date Filter */}
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 font-medium outline-none shadow-2xs cursor-pointer hover:border-gray-300 transition"
              >
                <option value="All Dates">All Dates</option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  invalidateAdminRequestCache();
                  fetchBookings(false);
                }}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer disabled:opacity-50"
                title="Reload service requests from MongoDB"
              >
                <RotateCcw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Main Content Body */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-xs flex flex-col items-center justify-center">
              <Loader2 size={36} className="animate-spin text-[#1B4D7E] mb-3" />
              <h4 className="text-sm font-bold text-gray-800">Loading Service Requests...</h4>
              <p className="text-xs text-gray-400 mt-1">Fetching live bookings and service records from MongoDB database.</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-100 p-12 text-center shadow-xs flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-3 border border-red-100">
                <AlertTriangle size={24} />
              </div>
              <h4 className="text-sm font-bold text-gray-800">Unable to Load Service Requests</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => {
                  invalidateAdminRequestCache();
                  fetchBookings(true);
                }}
                className="mt-4 px-5 py-2 bg-[#1B4D7E] hover:bg-[#143B61] text-white text-xs font-bold rounded-full transition shadow-xs cursor-pointer flex items-center gap-2"
              >
                <RotateCcw size={13} />
                Try Again
              </button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
              <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
              <h4 className="text-sm font-bold text-gray-700">
                {allRequests.length === 0 ? 'No Service Requests in Database' : 'No Matching Requests Found'}
              </h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {allRequests.length === 0
                  ? 'There are currently no service requests recorded in MongoDB. When homeowners submit booking requests, they will appear here in real time.'
                  : 'No service requests matched your current tab, search query, or date filter.'}
              </p>
              {allRequests.length === 0 ? (
                <button
                  onClick={() => {
                    invalidateAdminRequestCache();
                    fetchBookings(false);
                  }}
                  disabled={isRefreshing}
                  className="mt-4 px-4 py-1.5 bg-[#1B4D7E] hover:bg-[#143B61] text-white text-xs font-bold rounded-full transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RotateCcw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>{isRefreshing ? 'Checking Database...' : 'Refresh Database'}</span>
                </button>
              ) : (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredGroups.map((group) => (
                <div key={group.homeowner.name} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  {/* Homeowner Header Bar */}
                  <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${group.homeowner.avatarColor}`}>
                        {group.homeowner.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900">{group.homeowner.name}</h3>
                        <span className="text-[10px] text-gray-500 font-medium">Homeowner Client</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                      {group.requests.length} {group.requests.length === 1 ? 'Request' : 'Requests'}
                    </span>
                  </div>

                  {/* Requests Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-center border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 bg-gray-50/30">
                          <th className="p-3.5 text-center">Request ID</th>
                          <th className="p-3.5 text-center">Service</th>
                          <th className="p-3.5 text-center">Assigned Worker</th>
                          <th className="p-3.5 text-center">Location</th>
                          <th className="p-3.5 text-center">Schedule</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.requests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50/60 transition">
                            <td className="p-3.5 text-center">
                              <span className="inline-block font-bold text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                                {req.id}
                              </span>
                            </td>
                            <td className="p-3.5 text-xs font-bold text-gray-800 text-center">{req.service}</td>
                            <td className="p-3.5 text-xs text-gray-700 font-medium text-center">{req.worker}</td>
                            <td className="p-3.5 text-xs text-gray-500 font-medium text-center">{req.location}</td>
                            <td className="p-3.5 text-xs text-gray-600 font-medium text-center">{req.schedule}</td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center">
                                {getStatusBadge(req.status)}
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {(req.status === 'Completed' || req.rawStatus === 'COMPLETED' || req.completionDetails?.completedAt || Number(req.completionDetails?.paymentAmount || 0) > 0 || (req.completionDetails?.proofOfWork && req.completionDetails.proofOfWork.length > 0)) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEReceiptModal(req, group.homeowner.name)}
                                    className="border border-[#00A651]/40 text-[#00A651] hover:bg-[#00A651] hover:text-white font-bold px-2.5 py-1 rounded-full text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                                    title="View E-Receipt & Proof of Work"
                                  >
                                    <Receipt size={11} />
                                    E-Receipt
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenModal(req, group.homeowner.name)}
                                  className="border border-blue-500 text-blue-600 font-bold px-4 py-1 rounded-full text-[11px] hover:bg-blue-600 hover:text-white transition shadow-2xs cursor-pointer shrink-0"
                                >
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* REQUEST DETAIL MODAL */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900">
                    Request Details
                  </h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                    {selectedRequest.id}
                  </span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selectedRequest.service} • Requested on {selectedRequest.requestedOn || selectedRequest.date}</p>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)} />
            </div>

            {/* Status Progress Bar */}
            <div className="mt-4">
              <BookingStatusBar
                status={selectedRequest.status}
                rawStatus={selectedRequest.statusDetail}
                role="admin"
                preferredDate={selectedRequest.preferredDate}
                preferredTime={selectedRequest.preferredTime}
                scheduledAt={selectedRequest.schedule}
                acceptedOn={selectedRequest.acceptedOn}
                declineReason={selectedRequest.declineReason || selectedRequest.cancelReason}
              />
            </div>

            {/* Homeowner & Worker Cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Homeowner</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">
                  {typeof selectedRequest.homeownerName === 'string'
                    ? selectedRequest.homeownerName
                    : selectedRequest.homeowner?.name || 'Homeowner'}
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin size={11} /> {typeof selectedRequest.location === 'string' ? selectedRequest.location : formatRequestLocation(selectedRequest)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Assigned Worker</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5">
                  {typeof selectedRequest.worker === 'string'
                    ? selectedRequest.worker
                    : selectedRequest.worker?.name || selectedRequest.workerName || 'Local Skilled Worker'}
                </p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar size={11} /> {typeof selectedRequest.schedule === 'string' ? selectedRequest.schedule : 'Scheduled'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-800 mb-1">Service Description</h5>
              <div className="bg-gray-100/70 border border-gray-200/60 rounded-xl p-3 text-xs text-gray-700 leading-relaxed">
                {selectedRequest.description || 'No specific description provided for this request.'}
              </div>
            </div>

            {/* Email Notification Status & Link */}
            <div className="mt-4 p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-gray-900">Email Notification</div>
                  <div className="text-[11px] text-gray-500">Status: <strong className="text-emerald-700">{selectedRequest.emailStatus || 'Sent'}</strong> via SMTP</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  navigate('/admin-emaillogs');
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Open Email Logs →
              </button>
            </div>

            {/* Conversation / Dispute Resolution Section */}
            <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                      Dispute & Conversation History
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                        Audit View
                      </span>
                    </h5>
                    <p className="text-[11px] text-gray-500">
                      Review messages, photos, and dispute records exchanged between parties.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-100/80">
                  <button
                    type="button"
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingSummary}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-amber-300" />
                        <span>AI Conversation Summary</span>
                      </>
                    )}
                  </button>
                  {selectedRequest.status !== 'Cancelled' && selectedRequest.status !== 'Declined' && (
                    <button
                      type="button"
                      onClick={() => setShowChatModal(true)}
                      className="px-3 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      <MessageSquare size={13} />
                      Open Chat Viewer
                    </button>
                  )}
                </div>
              </div>

              {/* AI Dispute & Conversation Summary Card */}
              {aiSummary && (
                <div className="p-4 bg-white/95 rounded-2xl border border-blue-200/80 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-200 text-xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-blue-100 text-blue-700">
                        <Sparkles size={14} />
                      </div>
                      <span className="font-bold text-gray-900 text-xs">AI Dispute &amp; Conversation Summary</span>
                      <span className="text-[10px] text-gray-400">Generated {aiSummary.generatedAt}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        aiSummary.disputeRisk === 'High'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : aiSummary.disputeRisk === 'Medium'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        Dispute Risk: {aiSummary.disputeRisk}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = `AI Dispute Summary (${selectedRequest.requestNumber || selectedRequest.id}):\n• Overview: ${aiSummary.caseOverview}\n• Sentiment: ${aiSummary.sentiment}\n• Timeline: ${aiSummary.timeline}\n• Evidence: ${aiSummary.evidenceAudit}\n• Messages: ${aiSummary.communicationInsights}\n• Recommendation: ${aiSummary.recommendation}`;
                          navigator.clipboard?.writeText(text);
                          setCopiedSummary(true);
                          setTimeout(() => setCopiedSummary(false), 2500);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                      >
                        {copiedSummary ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Case Overview</span>
                      <p className="text-gray-800 leading-relaxed font-medium">{aiSummary.caseOverview}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <span className="text-[10px] font-black uppercase text-gray-400 block">Evidence &amp; E-Receipt</span>
                      <p className="text-gray-800 leading-relaxed font-medium">{aiSummary.evidenceAudit}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                    <span className="text-[10px] font-black uppercase text-blue-700 block">Chat Communication Analysis</span>
                    <p className="text-gray-800 leading-relaxed">{aiSummary.communicationInsights}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                    <span className="text-[10px] font-black uppercase text-emerald-800 block flex items-center gap-1">
                      <CheckCircle2 size={12} /> AI Administrative Recommendation
                    </span>
                    <p className="text-emerald-950 font-medium leading-relaxed">{aiSummary.recommendation}</p>
                  </div>
                </div>
              )}

              {/* Dispute E-Receipt Evidence Card */}
              {(selectedRequest.status === 'Completed' || selectedRequest.rawStatus === 'COMPLETED' || selectedRequest.completionDetails?.completedAt || Number(selectedRequest.completionDetails?.paymentAmount || 0) > 0 || (selectedRequest.completionDetails?.proofOfWork && selectedRequest.completionDetails.proofOfWork.length > 0)) && (
                <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-between bg-white/80 p-3 rounded-xl border border-emerald-100/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0B3B68]/10 flex items-center justify-center text-[#0B3B68] shrink-0">
                      <Receipt size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0B3B68]">E-Receipt &amp; Work Evidence</p>
                      <p className="text-[11px] text-gray-500">
                        {selectedRequest.completionDetails?.proofOfWork?.length || 0} proof photos • Amount: ₱ {Number(selectedRequest.completionDetails?.paymentAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEReceiptModal(selectedRequest, selectedRequest.homeownerName)}
                    className="px-3 py-1.5 bg-[#0B3B68] hover:bg-[#082d50] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                  >
                    <Receipt size={12} />
                    Review E-Receipt
                  </button>
                </div>
              )}
            </div>

            {/* DUAL PARTY REVIEWS SECTION (HOMEOWNER & WORKER SIDE-BY-SIDE) */}
            {(selectedRequest.status === 'Completed' || selectedRequest.rating || selectedRequest.workerReviewRating || selectedRequest.reviewText || selectedRequest.workerReviewText) && (
              <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    Mutual Reviews &amp; Evaluations
                  </h5>
                  <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                    Dual Party Feedback
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Homeowner's Review of Worker */}
                  <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-900">Homeowner's Review</span>
                      <span className="text-[10px] font-medium text-gray-400">of Worker</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={13} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-700">
                        {selectedRequest.rating || 'No rating'}
                      </span>
                      {selectedRequest.reviewedAt && (
                        <span className="text-[10px] text-gray-400">• {selectedRequest.reviewedAt}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 italic bg-white/80 p-2.5 rounded-xl border border-blue-100/70">
                      "{selectedRequest.reviewText || 'No written comments submitted by homeowner.'}"
                    </p>
                    {Array.isArray(selectedRequest.reviewTags) && selectedRequest.reviewTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedRequest.reviewTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Worker's Review of Homeowner */}
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900">Worker's Review</span>
                      <span className="text-[10px] font-medium text-gray-400">of Homeowner</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star size={13} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-700">
                        {selectedRequest.workerReviewRating || 'No rating'}
                      </span>
                      {selectedRequest.workerReviewedAt && (
                        <span className="text-[10px] text-gray-400">• {selectedRequest.workerReviewedAt}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 italic bg-white/80 p-2.5 rounded-xl border border-emerald-100/70">
                      "{selectedRequest.workerReviewText || 'No written comments submitted by worker.'}"
                    </p>
                    {Array.isArray(selectedRequest.workerReviewTags) && selectedRequest.workerReviewTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedRequest.workerReviewTags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(selectedRequest.status === 'Cancelled' || selectedRequest.status === 'Declined') && (
              <div className="mt-4 border-t border-gray-100 pt-3 space-y-1 text-xs">
                <h5 className="font-bold text-rose-800">
                  {selectedRequest.status === 'Cancelled' ? 'Cancellation' : 'Decline'} Reason
                </h5>
                <p className="text-gray-600">
                  By: <strong>{selectedRequest.cancelledBy || selectedRequest.declinedBy || 'System'}</strong>
                </p>
                <p className="text-rose-600 font-medium">
                  Reason: {selectedRequest.cancelReason || selectedRequest.declineReason || 'Not specified'}
                </p>
              </div>
            )}

            {/* Internal Admin Note */}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <h5 className="text-xs font-bold text-gray-800 mb-1">Admin Internal Note</h5>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add internal administrative notes regarding this request..."
                rows={3}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50/50"
              />
              <button
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="mt-2 px-4 py-1.5 bg-[#1B4D7E] text-white rounded-full text-xs font-bold hover:bg-[#143B61] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isSavingNote && <Loader2 size={12} className="animate-spin" />}
                <span>{isSavingNote ? 'Saving to Database...' : 'Save Internal Note'}</span>
              </button>
            </div>

            {/* Modal Actions Footer */}
            <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                {selectedRequest.status !== 'Cancelled' && selectedRequest.status !== 'Declined' && (
                  <button
                    type="button"
                    onClick={handleOpenCancelModal}
                    className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Ban size={14} className="text-rose-600" />
                    Cancel Booking Request
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN CANCELLATION MODAL (WITH PROOFREAD STEP) */}
      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                    {cancelStep === 'proofread' ? 'Proofread & Confirm Cancellation' : 'Cancel Booking Request'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {cancelStep === 'proofread'
                      ? 'Review all documented information carefully before final execution.'
                      : 'Admin cancellation documentation & justification'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingCancel) setShowCancelModal(false);
                }}
                disabled={isSubmittingCancel}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {cancelError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* STEP 1: INPUT SUPPORT REQUEST # & NOTES */}
            {cancelStep === 'input' && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    Administrative Action Required
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    To maintain strict platform accountability, you must specify the corresponding <strong>Support Request / Ticket number</strong> and detailed cancellation notes before proceeding.
                  </p>
                </div>

                {/* Target Booking Quick Card */}
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-500 text-[10px] uppercase">Target Booking</span>
                    <span className="font-mono font-bold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {selectedRequest.requestNumber || selectedRequest.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 pt-1">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Homeowner</span>
                      <strong className="text-gray-900">
                        {typeof selectedRequest.homeownerName === 'string'
                          ? selectedRequest.homeownerName
                          : selectedRequest.homeowner?.name || 'Homeowner'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Worker</span>
                      <strong className="text-gray-900">
                        {typeof selectedRequest.worker === 'string'
                          ? selectedRequest.worker
                          : selectedRequest.worker?.name || selectedRequest.workerName || 'Local Skilled Worker'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Support Request Number Field */}
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Support Request Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cancelSupportNumber}
                    onChange={(e) => setCancelSupportNumber(e.target.value)}
                    placeholder="e.g. SR-10492 or Ticket #123"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white text-xs font-semibold text-gray-900 transition"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Reference ID of the support ticket, inquiry, or dispute initiating this cancellation.
                  </p>
                </div>

                {/* Cancellation Notes Field */}
                <div>
                  <label className="block font-bold text-gray-800 mb-1">
                    Cancellation Notes &amp; Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    placeholder="Explain the findings, reason for cancellation, mutual agreement, or administrative resolution..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-rose-500 focus:bg-white text-xs text-gray-800 leading-relaxed transition"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    These notes will be permanently documented in the audit log and visible on the booking record.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToProofread}
                    disabled={!cancelSupportNumber.trim() || !cancelNotes.trim()}
                    className="px-5 py-2 bg-[#0B3B68] text-white hover:bg-[#082d50] rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Proceed to Proofread</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PROOFREAD REVIEW */}
            {cancelStep === 'proofread' && (
              <div className="mt-4 space-y-4 text-xs">
                {/* Proofread Summary Card */}
                <div className="rounded-2xl border border-rose-200 bg-gradient-to-b from-rose-50/40 to-white p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-rose-100 border-b">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-200">
                      Proofread Summary
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Target #{selectedRequest.requestNumber || selectedRequest.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Service Type</span>
                      <strong className="text-gray-900">{selectedRequest.service}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Scheduled Time</span>
                      <strong className="text-gray-900">{selectedRequest.schedule}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Homeowner Client</span>
                      <p className="text-gray-900 font-semibold">
                        {typeof selectedRequest.homeownerName === 'string'
                          ? selectedRequest.homeownerName
                          : selectedRequest.homeowner?.name || 'Homeowner'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Assigned Worker</span>
                      <p className="text-gray-900 font-semibold">
                        {typeof selectedRequest.worker === 'string'
                          ? selectedRequest.worker
                          : selectedRequest.worker?.name || selectedRequest.workerName || 'Local Skilled Worker'}
                      </p>
                    </div>
                  </div>

                  {/* Documented Support Number */}
                  <div className="pt-2.5 border-t border-rose-100/80">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                      Documented Support Request #
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 font-extrabold text-xs shadow-2xs">
                      <FileText size={13} className="text-rose-600" />
                      {cancelSupportNumber.trim()}
                    </div>
                  </div>

                  {/* Documented Reason & Notes */}
                  <div className="pt-1">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                      Official Cancellation Reason &amp; Notes
                    </span>
                    <div className="p-3 bg-white border border-rose-200 rounded-xl text-xs text-gray-800 font-medium whitespace-pre-wrap leading-relaxed shadow-2xs">
                      "{cancelNotes.trim()}"
                    </div>
                  </div>
                </div>

                {/* Consequence Warning Notice */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                    Irreversible Platform Action:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-900/90 text-[10.5px]">
                    <li>Booking status will immediately switch to <strong>CANCELLED</strong>.</li>
                    <li>Status progress bar will display Cancelled milestone to all parties.</li>
                    <li>Chat messaging between homeowner and worker will be permanently closed.</li>
                    <li>Both parties will receive immediate cancellation push/socket alerts.</li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCancelStep('input')}
                    disabled={isSubmittingCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
                  >
                    ← Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCancel}
                    disabled={isSubmittingCancel}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {isSubmittingCancel ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Executing Cancellation...</span>
                      </>
                    ) : (
                      <>
                        <Ban size={14} />
                        <span>Confirm &amp; Execute Cancellation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHAT / DISPUTE RESOLUTION MODAL */}
      {showChatModal && selectedRequest && (
        <BookingChatModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          requestId={selectedRequest.rawId || selectedRequest.id}
          requestNumber={selectedRequest.requestNumber || selectedRequest.id}
          serviceType={selectedRequest.service}
          bookingStatus={selectedRequest.status}
          rawStatus={selectedRequest.rawStatus || selectedRequest.statusDetail}
          isAccepted={selectedRequest.isAccepted || Boolean(selectedRequest.acceptedOn)}
          acceptedOn={selectedRequest.acceptedOn}
          otherPartyName={`${typeof selectedRequest.homeownerName === 'string' ? selectedRequest.homeownerName : selectedRequest.homeowner?.name || 'Homeowner'} & ${typeof selectedRequest.worker === 'string' ? selectedRequest.worker : selectedRequest.worker?.name || selectedRequest.workerName || 'Worker'}`}
          otherPartyRole="Parties"
          currentRole="admin"
          readOnly={true}
          onViewEReceipt={(selectedRequest.completionDetails?.proofOfWork?.length > 0 || selectedRequest.completionDetails?.paymentAmount > 0 || selectedRequest.status === 'Completed') ? () => handleOpenEReceiptModal(selectedRequest) : undefined}
        />
      )}

      {/* E-RECEIPT & PROOF OF WORK MODAL */}
      {showEReceiptModal && selectedRequest && (
        <EReceiptModal
          isOpen={showEReceiptModal}
          onClose={() => setShowEReceiptModal(false)}
          booking={{
            requestNumber: selectedRequest.requestNumber || selectedRequest.id,
            id: selectedRequest.rawId || selectedRequest.id,
            workerName: selectedRequest.workerName || selectedRequest.worker || selectedRequest.targetWorkerId?.name || "Local Skilled Worker",
            homeownerName: selectedRequest.homeownerName || selectedRequest.homeowner?.name || "Homeowner",
            serviceType: selectedRequest.serviceType || selectedRequest.service || "Service",
            completedAt: selectedRequest.completionDetails?.completedAt || selectedRequest.completedOn || selectedRequest.completedAt,
            location: selectedRequest.location,
            completionDetails: selectedRequest.completionDetails,
          }}
        />
      )}
    </div>
  );
}
