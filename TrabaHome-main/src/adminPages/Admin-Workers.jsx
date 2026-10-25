import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, invalidateAdminRequestCache } from '../services/AdminApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { getAdminAuthToken, clearAdminSession } from '../utils/adminAuth.ts';
import {
  PANGASINAN_PROVINCE,
  getPangasinanBarangays,
  normalizePangasinanBarangay,
  normalizePangasinanMunicipality,
  pangasinanCities,
  professionOptions,
} from '../constants/SignUpData.ts';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Users,
  Home,
  ClipboardList,
  MessageSquare,
  User,
  X,
  MapPin,
  Mail,
  Phone,
  Search,
  AlertTriangle,
  Ban,
  Megaphone,
  Settings,
  ShieldCheck,
  Wrench,
  FileText,
  Plus,
  Check,
  Loader2,
  Upload,
  Camera,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

const formatWorkerLocation = (value) => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value.trim() || 'N/A';
  if (Array.isArray(value)) {
    return value.map((item) => formatWorkerLocation(item)).filter(Boolean).join(', ') || 'N/A';
  }
  if (typeof value === 'object') {
    const label = [value.label, value.address, value.name].find(
      (item) => typeof item === 'string' && item.trim()
    );
    if (label) return String(label);

    const lat = value.lat ?? value.latitude;
    const lng = value.lng ?? value.longitude;
    if (lat != null && lng != null) {
      return `${lat}, ${lng}`;
    }

    if (Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
      const [coordinateLng, coordinateLat] = value.coordinates;
      if (Number.isFinite(Number(coordinateLat)) && Number.isFinite(Number(coordinateLng))) {
        return `${coordinateLat}, ${coordinateLng}`;
      }
    }

    return 'N/A';
  }
  return String(value);
};

const getWorkerLocationDisplay = (worker) => {
  if (!worker || typeof worker !== 'object') return 'N/A';

  const savedLabel = [worker.locationLabel, worker.address].find(
    (value) => typeof value === 'string' && value.trim()
  );
  if (savedLabel) return savedLabel.trim();

  const savedArea = [worker.barangay, worker.city || worker.municipality, worker.province]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
    .join(', ');
  if (savedArea) return savedArea;

  return formatWorkerLocation(worker.location);
};

const API_ORIGIN = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');

const resolveWorkerAvatar = (worker) => {
  const image = String(
    worker?.avatar ||
      worker?.profileImage ||
      worker?.photoUrl ||
      worker?.image ||
      worker?.photo ||
      worker?.picture ||
      ''
  ).trim();

  if (!image) return '';
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(image)) return image;
  if (image.startsWith('//')) return `https:${image}`;
  if (image.startsWith('/')) return `${API_ORIGIN}${image}`;
  return `${API_ORIGIN}/${image.replace(/^\/+/, '')}`;
};

const normalizeAdminWorker = (value) => {
  const worker = value && typeof value === 'object' ? value : {};
  const firstName = String(worker.firstName || '').trim();
  const lastName = String(worker.lastName || '').trim();
  const barangay = String(worker.barangay || '').trim();
  const city = String(worker.city || worker.municipality || '').trim();
  const province = String(worker.province || '').trim();
  const locationLabel = [barangay, city, province].filter(Boolean).join(', ') || String(worker.locationLabel || '').trim();

  return {
    ...worker,
    id: String(worker.id || worker._id || ''),
    firstName,
    lastName,
    name: String(worker.name || [firstName, lastName].filter(Boolean).join(' ') || worker.email || 'Worker'),
    email: String(worker.email || '').trim(),
    phone: String(worker.phone || worker.mobileNumber || worker.contactNumber || '').trim(),
    profession: String(worker.profession || worker.skill || worker.service || '').trim(),
    skill: String(worker.profession || worker.skill || worker.service || '').trim(),
    availabilityStatus: String(worker.availabilityStatus || worker.availability?.status || 'Online').trim(),
    workingSchedule: String(worker.workingSchedule || worker.availability?.schedule || '').trim(),
    barangay,
    city,
    province,
    locationLabel,
    address: locationLabel,
    proofOfWork: Array.isArray(worker.proofOfWork) ? worker.proofOfWork.filter(Boolean) : [],
    validId: worker.validId || worker.idCardImage || '',
    idCardImage: worker.idCardImage || worker.validId || '',
    idType: worker.idType || 'Government ID',
  };
};

const getAdminAvailabilityBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('vacation')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s.includes('day off') || s.includes('dayoff') || s.includes('leave')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('busy')) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (s.includes('offline')) return 'bg-gray-100 text-gray-600 border-gray-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
};

const AdminWorkers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const openedWorkerIdRef = useRef('');
  const [activeTab, setActiveTab] = useState('Workers');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmEditModal, setShowConfirmEditModal] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingEditPayload, setPendingEditPayload] = useState(null);
  const [reviewingUpdateWorker, setReviewingUpdateWorker] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [isRejectInputOpen, setIsRejectInputOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profession: '',
    barangay: '',
    city: '',
    province: PANGASINAN_PROVINCE,
  });

  const initialAddWorkerState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profession: professionOptions[0] || 'Appliance Repair',
    city: pangasinanCities[0] || 'Dagupan City',
    barangay: '',
    status: 'Verified',
    yearsExperience: 1,
    workingSchedule: 'Monday to Saturday, 8:00 AM - 5:00 PM',
    availabilityStatus: 'Available',
    bio: '',
    validId: '',
    idType: "Driver's License",
    proofOfWork: [],
  };
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [addWorkerForm, setAddWorkerForm] = useState(initialAddWorkerState);
  const [isSubmittingWorker, setIsSubmittingWorker] = useState(false);
  const [addWorkerError, setAddWorkerError] = useState('');
  const [addWorkerSuccess, setAddWorkerSuccess] = useState('');

  const addWorkerBarangays = React.useMemo(() => {
    return getPangasinanBarangays(addWorkerForm.city);
  }, [addWorkerForm.city]);

  useEffect(() => {
    if (addWorkerBarangays.length > 0 && !addWorkerBarangays.includes(addWorkerForm.barangay)) {
      setAddWorkerForm((prev) => ({ ...prev, barangay: addWorkerBarangays[0] }));
    }
  }, [addWorkerBarangays, addWorkerForm.city]);

  const handleAddWorkerSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setAddWorkerError('');

    const nameRegex = /^[A-Za-z\s-]{2,30}$/;
    if (!nameRegex.test(addWorkerForm.firstName.trim())) {
      setAddWorkerError('First name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!nameRegex.test(addWorkerForm.lastName.trim())) {
      setAddWorkerError('Last name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addWorkerForm.email.trim())) {
      setAddWorkerError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = addWorkerForm.phone.trim();
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setAddWorkerError('Phone number must be exactly 11 digits starting with 09 (e.g. 09123456789).');
      return;
    }
    const profs = (addWorkerForm.profession || '').split(',').map((p) => p.trim()).filter(Boolean);
    if (profs.length < 1) {
      setAddWorkerError('Please select at least one profession.');
      return;
    }
    if (!addWorkerForm.city || !addWorkerForm.barangay) {
      setAddWorkerError('City and barangay are required.');
      return;
    }
    if (!addWorkerForm.validId) {
      setAddWorkerError('Valid ID upload is required for identity verification.');
      return;
    }

    setIsSubmittingWorker(true);
    try {
      await adminAPI.createWorker({
        firstName: addWorkerForm.firstName.trim(),
        lastName: addWorkerForm.lastName.trim(),
        email: addWorkerForm.email.trim(),
        phone: cleanPhone,
        profession: profs.join(', '),
        city: addWorkerForm.city,
        barangay: addWorkerForm.barangay,
        province: 'Pangasinan',
        status: addWorkerForm.status,
        yearsExperience: Number(addWorkerForm.yearsExperience) || 0,
        workingSchedule: addWorkerForm.workingSchedule,
        availabilityStatus: addWorkerForm.availabilityStatus,
        bio: addWorkerForm.bio.trim(),
        validId: addWorkerForm.validId,
        idCardImage: addWorkerForm.validId,
        idType: addWorkerForm.idType || "Driver's License",
        proofOfWork: addWorkerForm.proofOfWork || [],
      });

      setShowAddWorkerModal(false);
      setAddWorkerForm(initialAddWorkerState);
      setAddWorkerSuccess('Worker registered successfully! An activation email with code has been sent to the worker.');
      setTimeout(() => setAddWorkerSuccess(''), 5000);
      await loadWorkers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add worker.';
      setAddWorkerError(msg);
    } finally {
      setIsSubmittingWorker(false);
    }
  };
  const loadWorkers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await adminAPI.getWorkers();
      if (!result?.success) {
        setErrorMessage(result?.message || 'Unable to load workers.');
        setWorkers([]);
      } else {
        setWorkers(Array.isArray(result.data) ? result.data.map(normalizeAdminWorker) : []);
      }
    } catch (error) {
      setErrorMessage('Unable to load workers. Please try again.');
      setWorkers([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useServiceRequestSync(getAdminAuthToken(), () => {
    invalidateAdminRequestCache();
    loadWorkers(true);
  });

  useEffect(() => {
    loadWorkers();
    const handleSync = () => {
      invalidateAdminRequestCache();
      loadWorkers(true);
    };

    window.addEventListener('trabahome:user-registered', handleSync);
    window.addEventListener('trabahome:worker-changed', handleSync);
    window.addEventListener('trabahome:dashboard-refresh', handleSync);

    const intervalId = setInterval(() => {
      invalidateAdminRequestCache();
      loadWorkers(true);
    }, 10000);

    return () => {
      window.removeEventListener('trabahome:user-registered', handleSync);
      window.removeEventListener('trabahome:worker-changed', handleSync);
      window.removeEventListener('trabahome:dashboard-refresh', handleSync);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const workerId = String(params.get('workerId') || '').trim();
    if (!workerId || !workers.length) return;
    if (openedWorkerIdRef.current === workerId) return;

    const match = workers.find((worker) => String(worker._id || worker.id || '') === workerId);
    if (!match) return;

    openedWorkerIdRef.current = workerId;
    setFilterStatus(String(match.status || 'Pending'));
    handleSelectWorker(match);
  }, [location.search, workers]);

  const getWorkerId = (worker) => String(worker?._id || worker?.id || '');

  const handleSelectWorker = async (worker) => {
    const id = getWorkerId(worker);
    setSelectedWorker({ ...worker, id });
    if (!worker.idCardImage && !worker.validId) {
      try {
        const full = await adminAPI.getWorker(id);
        const fullData = full?.data || full?.worker;
        if (fullData) {
          setSelectedWorker((prev) => {
            if (!prev || getWorkerId(prev) !== id) return prev;
            return normalizeAdminWorker({ ...prev, ...fullData });
          });
        }
      } catch (_) {}
    }
  };

  const updateWorkerStatus = async (id, newStatus) => {
    setErrorMessage('');
    const normalizedId = String(id || '').trim();
    if (!normalizedId) {
      setErrorMessage('Unable to update status: missing worker id.');
      return;
    }

    try {
      const result = await adminAPI.updateWorkerStatus(normalizedId, newStatus);
      if (!result?.success) {
        setErrorMessage(result?.message || 'Unable to update status.');
        return;
      }

      setWorkers((prev) =>
        prev.map((worker) =>
          String(worker._id || worker.id) === normalizedId
            ? {
                ...worker,
                status: newStatus,
                isVerified: newStatus === 'Verified',
                verified: newStatus === 'Verified',
                emailVerified: newStatus === 'Verified' ? true : worker.emailVerified,
              }
          : worker
        )
      );
      setSelectedWorker(null);
      setShowRejectModal(false);
    } catch (error) {
      setErrorMessage('Unable to update status. Please try again.');
      console.error('Worker status update failed:', error);
    }
  };

  const normalizePhilippineMobile = (value) => {
    let normalized = String(value || '').trim().replace(/[()\-\s]/g, '');
    if (normalized.startsWith('+63')) normalized = `0${normalized.slice(3)}`;
    else if (normalized.startsWith('63')) normalized = `0${normalized.slice(2)}`;
    else if (normalized.startsWith('9')) normalized = `0${normalized}`;
    return /^09\d{9}$/.test(normalized) ? normalized : '';
  };

  const handleStartEdit = (worker) => {
    const normalized = normalizeAdminWorker(worker);
    const city = normalizePangasinanMunicipality(normalized.city);
    setSelectedWorker(normalized);
    setEditForm({
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      phone: normalized.phone,
      profession: normalized.profession,
      barangay: normalizePangasinanBarangay(city, normalized.barangay),
      city,
      province: PANGASINAN_PROVINCE,
    });
    setEditError('');
    setPendingEditPayload(null);
    setShowEditModal(true);
  };

  const handleReviewWorkerEdit = (event) => {
    event.preventDefault();
    if (!selectedWorker || isSavingEdit) return;

    const nameRegex = /^[A-Za-z\s-]{2,30}$/;
    if (!nameRegex.test(editForm.firstName.trim())) {
      setEditError('First name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!nameRegex.test(editForm.lastName.trim())) {
      setEditError('Last name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      setEditError('Enter a valid email address.');
      return;
    }
    const cleanPhone = normalizePhilippineMobile(editForm.phone);
    if (!cleanPhone || !/^09\d{9}$/.test(cleanPhone)) {
      setEditError('Phone number must be exactly 11 digits starting with 09.');
      return;
    }
    const profs = (editForm.profession || '').split(',').map((p) => p.trim()).filter(Boolean);
    if (profs.length < 1) {
      setEditError('Please select at least one profession.');
      return;
    }

    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: cleanPhone,
      profession: profs.join(', '),
      barangay: normalizePangasinanBarangay(editForm.city, editForm.barangay),
      city: normalizePangasinanMunicipality(editForm.city),
      province: PANGASINAN_PROVINCE,
    };

    if (!payload.barangay || !payload.city) {
      setEditError('City and barangay are required.');
      return;
    }

    setEditError('');
    setPendingEditPayload(payload);
    setShowConfirmEditModal(true);
  };

  const handleConfirmWorkerEdit = async () => {
    const workerId = getWorkerId(selectedWorker);
    if (!workerId || !pendingEditPayload || isSavingEdit) return;

    setIsSavingEdit(true);
    setEditError('');
    try {
      const result = await adminAPI.updateWorker(workerId, pendingEditPayload);
      const updatedWorker = normalizeAdminWorker({
        ...selectedWorker,
        ...pendingEditPayload,
        ...(result?.data || {}),
      });
      setWorkers((current) =>
        current.map((worker) => getWorkerId(worker) === workerId ? updatedWorker : worker)
      );
      setSelectedWorker(updatedWorker);
      setPendingEditPayload(null);
      setShowConfirmEditModal(false);
      setShowEditModal(false);
    } catch (error) {
      setEditError(error?.response?.data?.message || 'Unable to update Worker information.');
      setShowConfirmEditModal(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleApproveWorkerEdit = async (worker) => {
    const workerId = getWorkerId(worker);
    if (!workerId || isReviewSubmitting) return;
    setIsReviewSubmitting(true);
    try {
      const resp = await adminAPI.reviewWorkerProfileUpdate(workerId, { action: 'approve' });
      const updated = resp?.worker ? normalizeAdminWorker(resp.worker) : null;
      setWorkers((prev) =>
        prev.map((w) =>
          getWorkerId(w) === workerId
            ? { ...w, ...(updated || {}), pendingProfileUpdate: { status: 'approved' } }
            : w
        )
      );
      setReviewingUpdateWorker(null);
      setIsRejectInputOpen(false);
      setRejectionReasonInput('');
      fetchWorkers();
    } catch (err) {
      console.error('Failed to approve worker edit:', err);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleRejectWorkerEdit = async (worker) => {
    const workerId = getWorkerId(worker);
    if (!workerId || isReviewSubmitting) return;
    if (!rejectionReasonInput.trim()) {
      setIsRejectInputOpen(true);
      return;
    }
    setIsReviewSubmitting(true);
    try {
      await adminAPI.reviewWorkerProfileUpdate(workerId, {
        action: 'reject',
        rejectionReason: rejectionReasonInput.trim(),
      });
      setWorkers((prev) =>
        prev.map((w) =>
          getWorkerId(w) === workerId
            ? {
                ...w,
                pendingProfileUpdate: {
                  status: 'rejected',
                  rejectionReason: rejectionReasonInput.trim(),
                },
              }
            : w
        )
      );
      setReviewingUpdateWorker(null);
      setIsRejectInputOpen(false);
      setRejectionReasonInput('');
      fetchWorkers();
    } catch (err) {
      console.error('Failed to decline worker edit:', err);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const stats = [
    { label: 'All', count: workers.length },
    { label: 'Pending', count: workers.filter((w) => (w.status || 'Pending') === 'Pending').length },
    { label: 'Verified', count: workers.filter((w) => w.status === 'Verified').length },
    { label: 'Rejected', count: workers.filter((w) => w.status === 'Rejected').length },
    { label: 'Suspended', count: workers.filter((w) => w.status === 'Suspended').length },
    { label: 'Pending Edits', count: workers.filter((w) => w.pendingProfileUpdate?.status === 'pending').length },
  ];

  const filteredWorkers = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return workers.filter((worker) => {
      if (filterStatus === 'Pending Edits') {
        if (worker.pendingProfileUpdate?.status !== 'pending') return false;
      } else {
        const matchesStatus = filterStatus === 'All' || (worker.status || 'Pending') === filterStatus;
        if (!matchesStatus) return false;
      }
      if (!term) return true;
      const name = String(worker.name || `${worker.firstName || ''} ${worker.lastName || ''}`.trim()).toLowerCase();
      const skill = String(worker.skill || worker.profession || '').toLowerCase();
      const email = String(worker.email || '').toLowerCase();
      const location = String(getWorkerLocationDisplay(worker) || '').toLowerCase();
      return name.includes(term) || skill.includes(term) || email.includes(term) || location.includes(term);
    });
  }, [workers, filterStatus, searchTerm]);

  const handleNavigation = (label, route) => {
    if (!route) return;
    setActiveTab(label);
    navigate(route);
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
  

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden font-sans relative">
        {/* Top Bar */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm shrink-0">
          <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto" />
          <AdminNotificationBell />
        </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-8 pr-2 h-full"> 
          <aside className="w-64 h-full bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col p-6">
            <div className="flex-1 overflow-y-auto pr-1">
              <nav className="space-y-3">
                {sidebarSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="px-4 pt-2 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {section.title}
                    </p>
                    {section.items.map((item) => (
                      <SidebarItem
                        key={item.label}
                        label={item.label}
                        active={activeTab === item.label}
                        icon={<item.icon size={18} />}
                        disabled={!item.route}
                        onClick={() => handleNavigation(item.label, item.route)}
                      />
                    ))}
                  </div>
                ))}
              </nav>
            </div>
            <div className="pt-4 border-t border-gray-100 text-center space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><User className="text-gray-400" size={20} /></div>
                <span className="font-bold text-gray-700 text-sm">Admin</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAdminSession();
                  navigate('/admin-login', { replace: true });
                }}
                className="w-full py-2.5 border border-gray-200 rounded-full text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:text-red-500 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </aside>
        </motion.div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-10 pl-6">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Workers</h1>
            <p className="text-gray-500 text-sm font-medium">Verify new workers and monitor existing accounts.</p>
            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}
            {addWorkerSuccess && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-bold flex items-center gap-2">
                <Check size={16} />
                <span>{addWorkerSuccess}</span>
              </div>
            )}
          </div>
          
          {/* Status Badges & Search Box */}
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div className="flex gap-3 flex-wrap">
              {stats.map((stat) => (
                <motion.div 
                  key={stat.label}
                  onClick={() => setFilterStatus(stat.label)}
                  whileHover={{ y: -2 }}
                  className={`cursor-pointer px-6 py-2.5 rounded-xl border transition-all flex items-center gap-3 
                    ${filterStatus === stat.label ? 'bg-[#F3D991] border-[#Ebc36a] shadow-sm font-bold' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                  <span className="text-[11px] font-black text-gray-800 uppercase">{stat.label}</span>
                  <span className="text-xs font-black text-gray-900">{stat.count}</span>
                </motion.div>
              ))}
            </div>

            {/* Search Box & Add Worker Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-3.5 py-2 w-64 shadow-sm focus-within:border-blue-400 transition">
                <Search size={15} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search workers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-none font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddWorkerForm(initialAddWorkerState);
                  setAddWorkerError('');
                  setShowAddWorkerModal(true);
                }}
                className="flex items-center gap-2 bg-[#0B3B68] text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-[#082b4c] transition shadow-sm"
              >
                <Plus size={15} />
                <span>Add Worker</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <motion.div layout className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Worker</th>
                  <th className="px-8 py-6">Skill</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Availability</th>
                  <th className="px-8 py-6">Location</th>
                  <th className="px-8 py-6">Submitted</th>
                  <th className="px-8 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout">
                  {filteredWorkers.map((worker) => {
                    const id = String(worker._id || worker.id || '');
                    const name = worker.name || [worker.firstName, worker.lastName].filter(Boolean).join(' ') || worker.email || 'Worker';
                    const skill = worker.skill || worker.profession || 'N/A';
                    const location = getWorkerLocationDisplay(worker);
                    const submitted =
                      worker.submitted ||
                      (worker.createdAt ? new Date(worker.createdAt).toLocaleString() : 'Unknown');
                    const status = worker.status || 'Pending';
                    const avatarUrl = resolveWorkerAvatar(worker);

                    return (
                      <motion.tr key={id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-gray-50/50">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 rounded-full border border-blue-100 overflow-hidden flex items-center justify-center shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={`${name} avatar`} className="w-full h-full object-cover" />
                              ) : (
                                <User size={16} className="text-blue-300" />
                              )}
                            </div>
                            <span className="text-[11px] font-black text-gray-800 leading-tight">{name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-[11px] font-bold text-gray-500">{skill}</td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            status === 'Suspended' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${getAdminAvailabilityBadge(worker.availabilityStatus)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {worker.availabilityStatus || 'Online'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-[11px] font-bold text-gray-500">{location}</td>
                        <td className="px-8 py-5 text-[11px] font-bold text-gray-500">{submitted}</td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {worker.pendingProfileUpdate?.status === 'pending' && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setReviewingUpdateWorker(worker);
                                  setIsRejectInputOpen(false);
                                  setRejectionReasonInput('');
                                }}
                                className="bg-purple-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black hover:bg-purple-700 transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Review Worker Submitted Profile Changes"
                              >
                                Review Edits
                              </button>
                            )}
                            <button 
                              onClick={() => handleSelectWorker(worker)}
                              className="border-2 border-blue-400 text-blue-500 px-5 py-1.5 rounded-full text-[10px] font-black hover:bg-blue-50 transition-all cursor-pointer"
                            >
                              View Docs
                            </button>
                            {status === 'Verified' && (
                              <button 
                                onClick={() => updateWorkerStatus(getWorkerId(worker), 'Suspended')}
                                className="p-2 text-orange-400 hover:bg-orange-50 rounded-full transition-all"
                                title="Suspend Worker"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {filteredWorkers.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan="7" className="px-8 py-20 text-center text-gray-400 font-bold text-xs uppercase">No {filterStatus === 'All' ? '' : `${filterStatus} `}workers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </motion.div>
        </main>
      </div>

      {/* MODAL OVERLAY */}
      <AnimatePresence>
        {selectedWorker && (
          <WorkerModal 
            worker={selectedWorker} 
            onClose={() => setSelectedWorker(null)} 
            onReject={() => setShowRejectModal(true)} // Opens second modal
            onApprove={() => updateWorkerStatus(getWorkerId(selectedWorker), 'Verified')} // Updates to verified
            onSuspend={() => updateWorkerStatus(getWorkerId(selectedWorker), 'Suspended')}
            onEdit={() => handleStartEdit(selectedWorker)}
          />
        )}
      </AnimatePresence>

      {/* REJECTION REASON MODAL */}
      <AnimatePresence>
        {showRejectModal && (
          <RejectModal 
            worker={selectedWorker} 
            onClose={() => setShowRejectModal(false)} 
            onConfirmReject={() => updateWorkerStatus(getWorkerId(selectedWorker), 'Rejected')} // Updates to rejected
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && selectedWorker && (
          <WorkerEditModal
            form={editForm}
            error={editError}
            isSaving={isSavingEdit}
            onChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
            onClose={() => {
              if (isSavingEdit) return;
              setShowEditModal(false);
              setEditError('');
            }}
            onSubmit={handleReviewWorkerEdit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmEditModal && selectedWorker && (
          <WorkerEditConfirmationModal
            isSaving={isSavingEdit}
            onCancel={() => {
              if (isSavingEdit) return;
              setShowConfirmEditModal(false);
              setPendingEditPayload(null);
            }}
            onConfirm={handleConfirmWorkerEdit}
          />
        )}
      </AnimatePresence>

      {/* ADD WORKER MODAL */}
      <AnimatePresence>
        {showAddWorkerModal && (
          <AddWorkerModal
            isOpen={showAddWorkerModal}
            onClose={() => {
              if (isSubmittingWorker) return;
              setShowAddWorkerModal(false);
              setAddWorkerError('');
            }}
            form={addWorkerForm}
            setForm={setAddWorkerForm}
            barangays={addWorkerBarangays}
            onSubmit={handleAddWorkerSubmit}
            isSubmitting={isSubmittingWorker}
            error={addWorkerError}
          />
        )}
      </AnimatePresence>

      {/* REVIEW WORKER PROFILE UPDATE MODAL */}
      <AnimatePresence>
        {reviewingUpdateWorker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-left relative max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => {
                  setReviewingUpdateWorker(null);
                  setIsRejectInputOpen(false);
                  setRejectionReasonInput('');
                }}
                className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">
                    Review Profile Changes Request
                  </h2>
                  <p className="text-xs text-gray-500">
                    {reviewingUpdateWorker.name || `${reviewingUpdateWorker.firstName} ${reviewingUpdateWorker.lastName}`} submitted updates for review.
                  </p>
                </div>
              </div>

              {/* Side-by-side diff comparison */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden mt-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                      <th className="py-2.5 px-4 text-left">Field</th>
                      <th className="py-2.5 px-4 text-left text-gray-500">Current Details</th>
                      <th className="py-2.5 px-4 text-left text-purple-700 bg-purple-50/50">Proposed Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      {
                        label: 'Full Name',
                        current: reviewingUpdateWorker.name || `${reviewingUpdateWorker.firstName || ''} ${reviewingUpdateWorker.lastName || ''}`.trim(),
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.fullName || `${reviewingUpdateWorker.pendingProfileUpdate?.changes?.firstName || ''} ${reviewingUpdateWorker.pendingProfileUpdate?.changes?.lastName || ''}`.trim(),
                      },
                      {
                        label: 'Phone Number',
                        current: reviewingUpdateWorker.phone,
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.phone,
                      },
                      {
                        label: 'Professions / Skills',
                        current: reviewingUpdateWorker.profession || reviewingUpdateWorker.skill,
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.profession,
                      },
                      {
                        label: 'Municipality / City',
                        current: reviewingUpdateWorker.city,
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.city,
                      },
                      {
                        label: 'Barangay',
                        current: reviewingUpdateWorker.barangay,
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.barangay,
                      },
                      {
                        label: 'Service Address / Location',
                        current: reviewingUpdateWorker.locationLabel || getWorkerLocationDisplay(reviewingUpdateWorker),
                        proposed: reviewingUpdateWorker.pendingProfileUpdate?.changes?.location || reviewingUpdateWorker.pendingProfileUpdate?.changes?.address,
                      },
                    ].map((row) => {
                      const isChanged = String(row.current || '').trim() !== String(row.proposed || '').trim();
                      return (
                        <tr key={row.label} className={isChanged ? 'bg-purple-50/20' : ''}>
                          <td className="py-3 px-4 font-bold text-gray-700">{row.label}</td>
                          <td className="py-3 px-4 text-gray-500">{row.current || '(Not set)'}</td>
                          <td className={`py-3 px-4 font-semibold ${isChanged ? 'text-purple-700 font-bold bg-purple-50/40' : 'text-gray-400'}`}>
                            {row.proposed || row.current || '(Unchanged)'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Decline Reason Input if Decline was clicked */}
              {isRejectInputOpen && (
                <div className="mt-4 p-4 rounded-2xl bg-red-50/70 border border-red-200">
                  <label className="block text-xs font-bold text-red-800 mb-1">
                    Decline Reason (will be sent to the worker):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="e.g. Phone number could not be verified; submitted skills do not match trade credentials."
                    className="w-full p-2.5 rounded-xl border border-red-300 text-xs font-normal focus:outline-none focus:border-red-500 bg-white"
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsRejectInputOpen(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isReviewSubmitting || !rejectionReasonInput.trim()}
                      onClick={() => handleRejectWorkerEdit(reviewingUpdateWorker)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isReviewSubmitting ? 'Submitting...' : 'Confirm Decline'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isRejectInputOpen && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingUpdateWorker(null);
                      setIsRejectInputOpen(false);
                      setRejectionReasonInput('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100"
                  >
                    Close
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRejectInputOpen(true)}
                      disabled={isReviewSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    >
                      Decline Request
                    </button>
                    <button
                      type="button"
                      disabled={isReviewSubmitting}
                      onClick={() => handleApproveWorkerEdit(reviewingUpdateWorker)}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
                    >
                      {isReviewSubmitting && <Loader2 size={13} className="animate-spin" />}
                      <span>Approve &amp; Make Live</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// MULTI-PROFESSION SELECTOR (1 to 8 PROFESSIONS)
const ProfessionMultiSelect = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = (value || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const toggle = (prof) => {
    let next;
    if (selected.includes(prof)) {
      if (selected.length <= 1) return;
      next = selected.filter((p) => p !== prof);
    } else {
      next = [...selected, prof];
    }
    onChange(next.join(', '));
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-500">
          {selected.length} selected (min 1)
        </span>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-xl border border-gray-200">
          {selected.map((prof) => (
            <span
              key={prof}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            >
              {prof}
              {selected.length > 1 && !disabled && (
                <button
                  type="button"
                  onClick={() => toggle(prof)}
                  className="hover:text-red-500 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center justify-between cursor-pointer hover:bg-white focus:bg-white focus:border-blue-500 transition"
      >
        <span>
          {selected.length === 0 ? 'Select professions (min 1)' : `${selected.length} profession(s) selected`}
        </span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-xl max-h-52 overflow-y-auto space-y-1 z-30">
          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Select professions (min 1):</p>
          <div className="grid grid-cols-2 gap-1">
            {professionOptions.map((prof) => {
              const isChecked = selected.includes(prof);
              return (
                <label
                  key={prof}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => toggle(prof)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span className="truncate">{prof}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ALL_SCHEDULE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ADD WORKER MODAL COMPONENT (WITH STEP 2 PROOFREAD)
const AddWorkerModal = ({
  isOpen,
  onClose,
  form,
  setForm,
  barangays,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [step, setStep] = useState(1);
  const [localError, setLocalError] = useState('');

  const [selectedDays, setSelectedDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  const formatTime12 = (t24) => {
    if (!t24) return '8:00 AM';
    const [hStr, mStr] = t24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const updateScheduleString = (days, start, end) => {
    let daysStr = '';
    if (days.length === 7) {
      daysStr = 'Monday to Sunday';
    } else if (
      days.length === 6 &&
      days.includes('Monday') &&
      days.includes('Tuesday') &&
      days.includes('Wednesday') &&
      days.includes('Thursday') &&
      days.includes('Friday') &&
      days.includes('Saturday')
    ) {
      daysStr = 'Monday to Saturday';
    } else if (
      days.length === 5 &&
      days.includes('Monday') &&
      days.includes('Tuesday') &&
      days.includes('Wednesday') &&
      days.includes('Thursday') &&
      days.includes('Friday')
    ) {
      daysStr = 'Monday to Friday';
    } else {
      daysStr = days.join(', ');
    }
    const scheduleStr = `${daysStr}, ${formatTime12(start)} - ${formatTime12(end)}`;
    setForm((prev) => ({ ...prev, workingSchedule: scheduleStr }));
  };

  const handleDayToggle = (day) => {
    let next;
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        setLocalError('Please select at least 1 working day (minimum 1, maximum 7).');
        return;
      }
      next = selectedDays.filter((d) => d !== day);
    } else {
      if (selectedDays.length >= 7) {
        setLocalError('Maximum 7 working days allowed.');
        return;
      }
      next = ALL_SCHEDULE_DAYS.filter((d) => selectedDays.includes(d) || d === day);
    }
    setLocalError('');
    setSelectedDays(next);
    updateScheduleString(next, startTime, endTime);
  };

  const handleStartTimeChange = (newStart) => {
    setStartTime(newStart);
    updateScheduleString(selectedDays, newStart, endTime);
  };

  const handleEndTimeChange = (newEnd) => {
    setEndTime(newEnd);
    updateScheduleString(selectedDays, startTime, newEnd);
  };

  if (!isOpen) return null;

  const handleNextToProofread = (e) => {
    e.preventDefault();
    setLocalError('');

    if (selectedDays.length < 1 || selectedDays.length > 7) {
      setLocalError('Please select between 1 and 7 working days.');
      return;
    }

    const nameRegex = /^[A-Za-z\s-]{2,30}$/;
    if (!nameRegex.test(form.firstName.trim())) {
      setLocalError('First name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!nameRegex.test(form.lastName.trim())) {
      setLocalError('Last name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = form.phone.trim();
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setLocalError('Phone number must be exactly 11 digits starting with 09 (e.g. 09123456789).');
      return;
    }
    const profs = (form.profession || '').split(',').map((p) => p.trim()).filter(Boolean);
    if (profs.length < 1 || profs.length > 8) {
      setLocalError('Please select between 1 and 8 professions.');
      return;
    }
    if (!form.city || !form.barangay) {
      setLocalError('City and barangay are required.');
      return;
    }
    if (!form.validId) {
      setLocalError('Valid ID upload is required for identity verification.');
      return;
    }

    setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setLocalError('');
    onClose();
  };

  const selectedProfessions = (form.profession || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                Step {step} of 2
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                {step === 1 ? 'Enter Information' : 'Proofread & Confirm'}
              </span>
            </div>
            <h2 className="text-xl font-black text-[#0B3B68]">
              {step === 1 ? 'Add New Worker' : 'Proofread Worker Information'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              {step === 1
                ? 'Manually register a skilled worker into the platform'
                : 'Please verify that all worker details are correct before account activation'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {(error || localError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error || localError}</span>
          </div>
        )}

        {step === 1 ? (
          /* STEP 1: FORM INPUT */
          <form onSubmit={handleNextToProofread} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Juan (letters only)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Dela Cruz (letters only)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="juan.delacruz@example.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Contact Number (11 digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="09123456789"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            {/* Multi-profession selector */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Profession / Trade Services *</label>
              <ProfessionMultiSelect
                value={form.profession}
                onChange={(profString) => setForm({ ...form, profession: profString })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">City / Municipality (Pangasinan) *</label>
                <select
                  required
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  {pangasinanCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Barangay *</label>
                <select
                  required
                  value={form.barangay}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  {barangays.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Initial Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  <option value="Verified">Verified (Active)</option>
                  <option value="Pending">Pending Verification</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.yearsExperience}
                  onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Availability</label>
                <select
                  value={form.availabilityStatus}
                  onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700">Working Schedule *</label>
                  <p className="text-[10px] text-gray-500">Select working days (1-7) and service hours</p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                  {selectedDays.length} / 7 Days Selected
                </span>
              </div>

              {/* Day Checkboxes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Working Days (Min 1, Max 7)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_SCHEDULE_DAYS.map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleDayToggle(day)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="truncate">{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-white px-3 py-2 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-[11px] text-gray-500 font-medium">Preview:</span>
                <span className="font-bold text-gray-800 truncate ml-2">{form.workingSchedule || 'Not set'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Bio / Profile Summary (Optional)</label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Brief description of skills and background..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition resize-none"
              />
            </div>

            {/* Valid ID Section */}
            <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-800">Valid ID (Identity Verification) *</label>
                  <p className="text-[10px] text-gray-500">Required to verify worker identity</p>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">ID Type *</label>
                  <select
                    value={form.idType || "Driver's License"}
                    onChange={(e) => setForm({ ...form, idType: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none"
                  >
                    <option value="Driver's License">Driver's License</option>
                    <option value="Philippine Passport">Philippine Passport</option>
                    <option value="National ID (PhilSys)">National ID (PhilSys)</option>
                    <option value="SSS / UMID Card">SSS / UMID Card</option>
                    <option value="PhilHealth ID">PhilHealth ID</option>
                    <option value="Voter's ID">Voter's ID</option>
                    <option value="Postal ID">Postal ID</option>
                    <option value="PRC ID">PRC ID</option>
                    <option value="Barangay ID">Barangay ID</option>
                    <option value="Other Government ID">Other Government ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Upload ID Document *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (loadEvt) => {
                        if (typeof loadEvt.target?.result === 'string') {
                          setForm((prev) => ({ ...prev, validId: loadEvt.target.result }));
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>

              {form.validId && (
                <div className="relative w-40 aspect-[16/10] rounded-xl overflow-hidden border border-blue-200 bg-white">
                  <img src={form.validId} alt="Valid ID preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, validId: '' }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition text-xs"
                    title="Remove ID"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Proof of Work Section - Optional */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-800">Proof of Work Photos (Optional)</label>
                  <p className="text-[10px] text-gray-500">Upload past work/project photos (up to 5 images)</p>
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    files.slice(0, 5 - (form.proofOfWork?.length || 0)).forEach((file) => {
                      const reader = new FileReader();
                      reader.onload = (loadEvt) => {
                        if (typeof loadEvt.target?.result === 'string') {
                          setForm((prev) => ({
                            ...prev,
                            proofOfWork: [...(prev.proofOfWork || []), loadEvt.target.result].slice(0, 5),
                          }));
                        }
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                  disabled={(form.proofOfWork?.length || 0) >= 5}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-800 cursor-pointer disabled:opacity-50"
                />
              </div>

              {Array.isArray(form.proofOfWork) && form.proofOfWork.length > 0 && (
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {form.proofOfWork.map((src, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white">
                      <img src={src} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            proofOfWork: prev.proofOfWork.filter((_, i) => i !== index),
                          }))
                        }
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition text-xs"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-7 py-2.5 bg-[#0B3B68] text-white rounded-full text-xs font-bold hover:bg-[#082b4c] transition shadow-md cursor-pointer"
              >
                <span>Next: Proofread Information</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: PROOFREAD DETAILS */
          <div className="mt-6 space-y-5">
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800">
              <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">Password Security Policy</strong>
                <span>
                  Admin accounts cannot set passwords. An activation email with a verification OTP will be automatically dispatched to <strong>{form.email}</strong> allowing the worker to set their own secure password.
                </span>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-5 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Full Name</span>
                  <span className="font-bold text-gray-900 text-sm">{form.firstName} {form.lastName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Email Address</span>
                  <span className="font-bold text-gray-900">{form.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Phone Number</span>
                  <span className="font-bold text-gray-900">{form.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Initial Status</span>
                  <span className="inline-block font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                    {form.status}
                  </span>
                </div>
              </div>

              <div className="pb-3 border-b border-gray-200">
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  Selected Professions ({selectedProfessions.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfessions.map((prof) => (
                    <span key={prof} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {prof}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Location</span>
                  <span className="font-bold text-gray-800">{form.barangay}, {form.city}, Pangasinan</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Experience &amp; Schedule</span>
                  <span className="font-semibold text-gray-700">{form.yearsExperience} yrs • {form.workingSchedule}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1.5">
                  Identity Verification ID ({form.idType || "Driver's License"})
                </span>
                {form.validId && (
                  <div className="w-36 aspect-[16/10] rounded-xl overflow-hidden border border-gray-200 bg-white">
                    <img src={form.validId} alt="Valid ID" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(1)}
                className="px-6 py-2.5 border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onSubmit}
                className="flex items-center gap-2 px-7 py-2.5 bg-[#00A651] text-white rounded-full text-xs font-bold hover:bg-[#008f45] transition shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Registering Worker...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm &amp; Register Worker</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// REJECTION MODAL COMPONENT
const RejectModal = ({ worker, onClose, onConfirmReject }) => {
  const [reason, setReason] = useState("");

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[500px] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-1.5 rounded-lg">
              <AlertTriangle className="text-red-500" size={20} fill="currentColor" fillOpacity={0.2} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Reject Worker Application</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
            You are about to reject this worker's application. Please provide a reason. 
          </p>

          <div className="space-y-2">
            <label className="text-[13px] font-bold text-gray-800">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea 
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason here..."
              className="w-full h-32 p-4 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-100 focus:border-red-400 outline-none transition-all resize-none text-sm text-gray-700"
            />
          </div>
        </div>

        <div className="px-8 pb-8 pt-2 flex justify-center gap-3">
          <button onClick={onClose} className="px-10 py-2.5 border border-gray-300 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button 
            disabled={!reason.trim()}
            onClick={onConfirmReject}
            className="px-10 py-2.5 bg-[#B33A3A] text-white rounded-full text-sm font-bold hover:bg-[#962d2d] transition-colors shadow-md shadow-red-100 disabled:opacity-50"
          >
            Confirm Rejection
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const WorkerEditModal = ({ form, error, isSaving, onChange, onClose, onSubmit }) => {
  const availableBarangays = getPangasinanBarangays(form.city);
  const locationPreview = [form.barangay, form.city, form.province]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Edit Worker Information</h3>
            <p className="mt-1 text-xs font-medium text-gray-400">Updates the same registered Worker account.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">First Name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => onChange('firstName', event.target.value)}
                disabled={isSaving}
                required
                pattern="[A-Za-z\s-]{2,30}"
                maxLength={30}
                title="Letters and spaces only (2-30 characters)"
                placeholder="First Name (letters only)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Last Name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => onChange('lastName', event.target.value)}
                disabled={isSaving}
                required
                pattern="[A-Za-z\s-]{2,30}"
                maxLength={30}
                title="Letters and spaces only (2-30 characters)"
                placeholder="Last Name (letters only)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => onChange('email', event.target.value)}
                disabled={isSaving}
                required
                placeholder="email@domain.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Contact Number</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => onChange('phone', event.target.value)}
                disabled={isSaving}
                required
                pattern="09[0-9]{9}"
                maxLength={11}
                title="11 digits starting with 09 (e.g. 09123456789)"
                placeholder="09123456789"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </label>
            <div className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-bold text-gray-700">Profession / Service</span>
              <ProfessionMultiSelect
                value={form.profession}
                onChange={(val) => onChange('profession', val)}
                disabled={isSaving}
              />
            </div>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Province</span>
              <input
                type="text"
                value={PANGASINAN_PROVINCE}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-600"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Municipality / City</span>
              <select
                value={form.city}
                onChange={(event) => {
                  onChange('city', event.target.value);
                  onChange('barangay', '');
                }}
                disabled={isSaving}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
              >
                <option value="">Select Municipality / City</option>
                {pangasinanCities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-bold text-gray-700">Barangay</span>
              <select
                value={form.barangay}
                onChange={(event) => onChange('barangay', event.target.value)}
                disabled={isSaving || !form.city}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">{form.city ? 'Select Barangay' : 'Select Municipality / City first'}</option>
                {availableBarangays.map((barangay) => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-bold text-gray-700">Address / Location</span>
              <input
                type="text"
                value={locationPreview}
                readOnly
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
              />
              <span className="block text-[10px] text-gray-400">Built from the registered Barangay, Municipality/City, and Province fields.</span>
            </label>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} disabled={isSaving} className="rounded-full border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="rounded-full bg-blue-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-60">
              Review and Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const WorkerEditConfirmationModal = ({ isSaving, onCancel, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-worker-edit-title"
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <ShieldCheck size={24} />
      </div>
      <h3 id="confirm-worker-edit-title" className="mt-4 text-center text-xl font-black text-gray-900">Confirm Changes</h3>
      <p className="mt-3 text-center text-sm leading-6 text-gray-500">
        Are you sure you want to update this Worker's protected account information?
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-full border border-gray-200 px-6 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={isSaving} className="rounded-full bg-blue-600 px-6 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
          {isSaving ? 'Updating...' : 'Confirm Update'}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// MODAL COMPONENT (MAIN DOCS VIEW)
const WorkerModal = ({ worker, onClose, onReject, onApprove, onSuspend, onEdit }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
      className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
    >
      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-black text-gray-900">Worker Profile Details</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Registered on: {worker.createdAt ? new Date(worker.createdAt).toLocaleString() : worker.submitted || 'Not specified'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="rounded-full border border-blue-200 px-4 py-2 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50">
            Edit Information
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-50 rounded-full border-2 border-blue-100 overflow-hidden shrink-0 flex items-center justify-center">
            {resolveWorkerAvatar(worker) ? (
              <img
                src={resolveWorkerAvatar(worker)}
                alt={`${worker.name} avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={28} className="text-blue-300" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-gray-900">{worker.name}</h3>
            <p className="text-sm font-bold text-gray-500">{worker.skill}</p>
            <div className="flex items-center gap-1 text-blue-500 font-bold text-xs">
              <MapPin size={14} /> <span>{getWorkerLocationDisplay(worker)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {worker.status !== 'Pending' && (
                <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-md ${
                  worker.status === 'Verified' ? 'bg-green-100 text-green-600' : 
                  worker.status === 'Suspended' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                }`}>
                  Account: {worker.status}
                </span>
              )}
              <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${getAdminAvailabilityBadge(worker.availabilityStatus)}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Work Status: {worker.availabilityStatus || 'Online'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <Mail size={16} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-600">{worker.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <Phone size={16} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-600">{worker.phone || 'N/A'}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Registered Information</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['Full Name', worker.name],
              ['Email', worker.email],
              ['Contact Number', worker.phone],
              ['Profession / Service', worker.profession || worker.skill],
              ['Barangay', worker.barangay],
              ['Municipality / City', worker.city],
              ['Province', worker.province],
              ['Address / Location', getWorkerLocationDisplay(worker)],
              ['Account Status', worker.status],
              ['Verification', worker.isVerified ? 'Verified' : 'Not verified'],
              ['Years of Experience', Number.isFinite(Number(worker.yearsExperience)) ? String(worker.yearsExperience) : '0'],
              ['Languages', Array.isArray(worker.languages) && worker.languages.length ? worker.languages.join(', ') : 'Not specified'],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-xl border border-gray-100 bg-gray-50 p-3 ${label === 'Address / Location' ? 'sm:col-span-2' : ''}`}>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{label}</p>
                <p className="mt-1 break-words text-xs font-bold text-gray-700">{value || 'Not specified'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Valid ID Display */}
        <div className="space-y-2">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Valid ID / Identity Verification</h4>
          {worker.idCardImage || worker.validId ? (
            <div className="max-w-xs rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 p-2.5 space-y-1.5">
              <img
                src={worker.idCardImage || worker.validId}
                alt="Valid ID"
                className="w-full h-auto max-h-56 rounded-xl object-contain bg-white"
              />
              <p className="text-[10px] font-bold text-gray-500 uppercase text-center">
                {worker.idType || 'Government ID'}
              </p>
            </div>
          ) : (
            <p className="text-xs font-bold text-gray-400 italic">No Valid ID attached.</p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Proof of Work</h4>
          {Array.isArray(worker.proofOfWork) && worker.proofOfWork.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {worker.proofOfWork.map((image, index) => (
                <img key={`${index}-${image.slice(0, 24)}`} src={image} alt={`Proof of work ${index + 1}`} className="aspect-square w-full rounded-xl border border-gray-100 object-cover" />
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-gray-400 italic">No Proof of Work submitted.</p>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 bg-white">
        <button onClick={onEdit} className="flex-1 min-w-[150px] py-3 border-2 border-blue-400 text-blue-600 rounded-full font-black text-xs uppercase hover:bg-blue-50 transition-all">
          Edit Information
        </button>
        {worker.status === 'Pending' ? (
          <>
            <button onClick={onReject} className="flex-1 py-3 border-2 border-red-400 text-red-500 rounded-full font-black text-xs uppercase hover:bg-red-50 transition-all">Reject Application</button>
            <button onClick={onApprove} className="flex-1 py-3 bg-[#59B28D] text-white rounded-full font-black text-xs uppercase hover:bg-[#4a9a7a] shadow-lg shadow-green-100 transition-all">Approve Worker</button>
          </>
        ) : worker.status === 'Verified' ? (
          <button onClick={onSuspend} className="flex-1 py-3 bg-orange-500 text-white rounded-full font-black text-xs uppercase hover:bg-orange-600 transition-all">Suspend Account</button>
        ) : (
          <button onClick={onApprove} className="flex-1 py-3 bg-blue-500 text-white rounded-full font-black text-xs uppercase hover:bg-blue-600 transition-all">Re-Verify Worker</button>
        )}
      </div>
    </motion.div>
  </motion.div>
);

const IDCard = ({ label }) => (
  <div className="space-y-2 text-center">
    <div className="aspect-[16/10] bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group cursor-zoom-in">
        <img src="https://via.placeholder.com/300x180" alt="document" className="object-cover w-full h-full opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all">
           <Search className="text-white opacity-0 group-hover:opacity-100" />
        </div>
    </div>
    <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
  </div>
);

const DetailField = ({ label }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{label}</label>
    <div className="h-9 bg-white border border-gray-200 rounded-lg shadow-sm"></div>
  </div>
);

const SidebarItem = ({ icon, label, active, onClick, disabled }) => {
  const baseStyles = active
    ? 'bg-blue-50 text-blue-600 border-l-[6px] border-blue-600 shadow-sm'
    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600';
  const disabledStyles = 'text-gray-300 cursor-not-allowed hover:bg-transparent hover:text-gray-300';

  return (
    <motion.div
      onClick={disabled ? undefined : onClick}
      whileHover={disabled ? undefined : { x: 5 }}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${
        disabled ? disabledStyles : baseStyles
      }`}
    >
      {icon}
      <span className="text-[13px] font-bold">{label}</span>
    </motion.div>
  );
};

export default AdminWorkers;
