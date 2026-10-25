import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminAPI, invalidateAdminRequestCache } from '../services/AdminApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { getAdminAuthToken, clearAdminSession } from '../utils/adminAuth.ts';
import {
  PANGASINAN_PROVINCE,
  getPangasinanBarangays,
  normalizePangasinanBarangay,
  normalizePangasinanMunicipality,
  pangasinanCities,
} from '../constants/SignUpData.ts';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  ShieldCheck,
  Wrench,
  ClipboardList,
  FileText,
  Mail,
  MessageSquare, 
  Megaphone,
  Activity,
  BarChart3,
  Settings,
  User, 
  Search, 
  X, 
  AlertTriangle, 
  ChevronDown,
  CheckCircle2,
  Phone,
  MapPin,
  ArrowRight,
  Edit3,
  Plus,
  Check,
  Loader2,
} from 'lucide-react';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';

const SUSPENSION_REASONS = [
  'Spam / Fake Service Requests',
  'Frequent Cancellations',
  'No-show / Unreachable',
  'Harassment / Abusive Behavior',
  'Inappropriate / Prohibited Requests',
  'Misleading Request Information',
  'Suspected Fraud / Scam Attempts',
  'Other'
];

const HOMEOWNERS_CACHE_TTL_MS = 30_000;
let homeownersCache = null;
let homeownersCacheLoadedAt = 0;
let homeownersCachePromise = null;

const invalidateHomeownersCache = () => {
  homeownersCache = null;
  homeownersCacheLoadedAt = 0;
  homeownersCachePromise = null;
  invalidateAdminRequestCache();
};

function SidebarItem({ label, active, icon, disabled, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { x: 5 }}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-xs font-semibold transition-all relative ${
        active
          ? 'bg-blue-50 text-blue-600 font-bold'
          : disabled
          ? 'text-gray-300 cursor-not-allowed hover:bg-transparent hover:text-gray-300'
          : 'text-slate-400 hover:bg-gray-50 hover:text-slate-600'
      }`}
    >
      {active && <span className="absolute left-0 top-1 bottom-1 w-2 bg-blue-600 rounded-l-full" />}
      <span>{icon}</span>
      <span>{label}</span>
    </motion.button>
  );
}

export default function AdminHomeowners() {
  const navigate = useNavigate();

  const [homeowners, setHomeowners] = useState([]);
  const [activeTab, setActiveTab] = useState('Homeowners');
  const [tableFilterTab, setTableFilterTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedHomeowner, setSelectedHomeowner] = useState(null);
  const [selectedHomeownerRequests, setSelectedHomeownerRequests] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);

  // Form states
  const [suspendReason, setSuspendReason] = useState(SUSPENSION_REASONS[0]);
  const [suspendDetails, setSuspendDetails] = useState('');
  const [reinstateNote, setReinstateNote] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    barangay: '',
    province: PANGASINAN_PROVINCE,
    address: '',
  });
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingEditPayload, setPendingEditPayload] = useState(null);

  const initialAddHomeownerState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: pangasinanCities[0] || 'Dagupan City',
    barangay: '',
    province: PANGASINAN_PROVINCE,
    address: '',
    status: 'Verified',
  };
  const [showAddHomeownerModal, setShowAddHomeownerModal] = useState(false);
  const [addHomeownerForm, setAddHomeownerForm] = useState(initialAddHomeownerState);
  const [isSubmittingHomeowner, setIsSubmittingHomeowner] = useState(false);
  const [addHomeownerError, setAddHomeownerError] = useState('');
  const [addHomeownerSuccess, setAddHomeownerSuccess] = useState('');

  const addHomeownerBarangays = React.useMemo(() => {
    return getPangasinanBarangays(addHomeownerForm.city);
  }, [addHomeownerForm.city]);

  useEffect(() => {
    if (addHomeownerBarangays.length > 0 && !addHomeownerBarangays.includes(addHomeownerForm.barangay)) {
      setAddHomeownerForm((prev) => ({ ...prev, barangay: addHomeownerBarangays[0] }));
    }
  }, [addHomeownerBarangays, addHomeownerForm.city]);

  const handleAddHomeownerSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setAddHomeownerError('');

    const nameRegex = /^[A-Za-z\s-]{2,30}$/;
    if (!nameRegex.test(addHomeownerForm.firstName.trim())) {
      setAddHomeownerError('First name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!nameRegex.test(addHomeownerForm.lastName.trim())) {
      setAddHomeownerError('Last name must contain only letters and spaces (2-30 characters).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addHomeownerForm.email.trim())) {
      setAddHomeownerError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = addHomeownerForm.phone.trim();
    if (!/^09\d{9}$/.test(cleanPhone)) {
      setAddHomeownerError('Phone number must be exactly 11 digits starting with 09 (e.g. 09123456789).');
      return;
    }
    if (!addHomeownerForm.city || !addHomeownerForm.barangay) {
      setAddHomeownerError('City and barangay are required.');
      return;
    }

    setIsSubmittingHomeowner(true);
    try {
      await adminAPI.createHomeowner({
        firstName: addHomeownerForm.firstName.trim(),
        lastName: addHomeownerForm.lastName.trim(),
        email: addHomeownerForm.email.trim(),
        phone: cleanPhone,
        city: addHomeownerForm.city,
        barangay: addHomeownerForm.barangay,
        province: addHomeownerForm.province || 'Pangasinan',
        address: addHomeownerForm.address.trim(),
        status: addHomeownerForm.status,
      });

      setShowAddHomeownerModal(false);
      setAddHomeownerForm(initialAddHomeownerState);
      setAddHomeownerSuccess('Homeowner registered successfully! Activation OTP has been sent via email.');
      setTimeout(() => setAddHomeownerSuccess(''), 5000);
      await loadHomeowners(true);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to add homeowner.';
      setAddHomeownerError(msg);
    } finally {
      setIsSubmittingHomeowner(false);
    }
  };

  // Function to handle sidebar navigation
  const handleNavigation = (label, route) => {
    if (!route) return;
    setActiveTab(label);
    navigate(route);
  };

  const toRecentRequestRow = (request) => {
    const rawStatus = String(request?.status || '').trim().toUpperCase();
    const status =
      rawStatus === 'ONGOING'
        ? 'Ongoing'
        : rawStatus === 'COMPLETED'
        ? 'Completed'
        : rawStatus === 'CANCELLED'
        ? 'Cancelled'
        : rawStatus === 'DECLINED'
        ? 'Declined'
        : 'Pending';
    const requestDate = request?.createdAt || request?.updatedAt || request?.preferredDate || '';
    const parsedDate = requestDate ? new Date(requestDate) : null;

    return {
      service: String(request?.serviceType || 'General Repair'),
      worker: String(request?.workerName || 'Worker'),
      status,
      date:
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleString()
          : String(requestDate || ''),
    };
  };

  const loadHomeowners = async (force = false, silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const now = Date.now();
      if (!force && homeownersCache && now - homeownersCacheLoadedAt < HOMEOWNERS_CACHE_TTL_MS) {
        setHomeowners(homeownersCache);
        return;
      }

      if (force) {
        invalidateHomeownersCache();
      }

      if (!homeownersCachePromise) {
        homeownersCachePromise = adminAPI.listHomeowners()
          .then((result) => {
            homeownersCache = Array.isArray(result?.data) ? result.data : [];
            homeownersCacheLoadedAt = Date.now();
            return homeownersCache;
          })
          .finally(() => {
            homeownersCachePromise = null;
          });
      }

      const cachedResult = await homeownersCachePromise;
      setHomeowners(cachedResult);
    } catch (error) {
      console.error('Unable to load homeowners', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useServiceRequestSync(getAdminAuthToken(), () => {
    loadHomeowners(true, true);
  });

  useEffect(() => {
    loadHomeowners();
    const handleSync = () => {
      loadHomeowners(true, true);
    };

    window.addEventListener('trabahome:user-registered', handleSync);
    window.addEventListener('trabahome:homeowner-changed', handleSync);
    window.addEventListener('trabahome:dashboard-refresh', handleSync);

    const handleStorage = (e) => {
      if (e.key === 'trabahome_sync_homeowner') {
        loadHomeowners(true, true);
      }
    };
    window.addEventListener('storage', handleStorage);

    const intervalId = setInterval(() => {
      loadHomeowners(true, true);
    }, 10000);

    return () => {
      window.removeEventListener('trabahome:user-registered', handleSync);
      window.removeEventListener('trabahome:homeowner-changed', handleSync);
      window.removeEventListener('trabahome:dashboard-refresh', handleSync);
      window.removeEventListener('storage', handleStorage);
      clearInterval(intervalId);
    };
  }, []);

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

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin-login', { replace: true });
  };

  // Action Handlers
  const handleOpenProfile = async (person) => {
    setSelectedHomeowner(person);
    setShowProfileModal(true);

    try {
      const profile = await adminAPI.getHomeownerProfile(person.id);
      const summary = profile?.summary || {};
      const profileData = profile?.homeowner || {};
      const requests = Array.isArray(profile?.requests) ? profile.requests : [];
      const recentRequests = requests.slice(0, 3).map(toRecentRequestRow);
      setSelectedHomeownerRequests(requests);

      setSelectedHomeowner((current) =>
        current && current.id === person.id
          ? {
              ...current,
              firstName: String(profileData.firstName || current.firstName || ''),
              lastName: String(profileData.lastName || current.lastName || ''),
              email: String(profileData.email || current.email || ''),
              phone: String(profileData.mobileNumber || profileData.phone || current.phone || ''),
              city: String(profileData.city || current.city || ''),
              barangay: String(profileData.barangay || current.barangay || ''),
              province: String(profileData.province || current.province || ''),
              address: String(profileData.address || current.address || ''),
              location: String(
                profileData.address ||
                current.address ||
                [
                  String(profileData.barangay || current.barangay || '').trim(),
                  String(profileData.city || current.city || '').trim(),
                  String(profileData.province || current.province || '').trim(),
                ].filter(Boolean).join(', ') ||
                current.location
              ),
              avatar: String(profileData.avatar || profileData.profileImage || current.avatar || ''),
              createdAt: profileData.createdAt || current.createdAt || null,
              stats: {
                total: Number(summary.total ?? requests.length ?? 0),
                pending: Number(summary.pending ?? 0),
                ongoing: Number(summary.ongoing ?? 0),
                completed: Number(summary.completed ?? 0),
                cancelled: Number(summary.cancelled ?? 0),
              },
              recentRequests,
            }
          : current
      );
    } catch (error) {
      console.error('Unable to load homeowner requests', error);
      setSelectedHomeownerRequests([]);
    }
  };

  const handleOpenRequestsModal = () => {
    setShowRequestsModal(true);
  };

  const handleCloseRequestsModal = () => {
    setShowRequestsModal(false);
  };

  const handleStartEdit = () => {
    if (!selectedHomeowner) return;
    const city = normalizePangasinanMunicipality(selectedHomeowner.city);
    setEditForm({
      firstName: selectedHomeowner.firstName || '',
      lastName: selectedHomeowner.lastName || '',
      email: selectedHomeowner.email || '',
      phone: selectedHomeowner.phone || '',
      city,
      barangay: normalizePangasinanBarangay(city, selectedHomeowner.barangay),
      province: PANGASINAN_PROVINCE,
      address: selectedHomeowner.address || '',
    });
    setEditError('');
    setShowProfileModal(false);
    setShowEditModal(true);
  };

  const normalizePhilippineMobile = (value) => {
    let normalized = String(value || '').trim().replace(/[()\-\s]/g, '');
    if (normalized.startsWith('+63')) normalized = `0${normalized.slice(3)}`;
    else if (normalized.startsWith('63')) normalized = `0${normalized.slice(2)}`;
    else if (normalized.startsWith('9')) normalized = `0${normalized}`;
    return /^09\d{9}$/.test(normalized) ? normalized : '';
  };

  const handleSaveInformation = (event) => {
    event.preventDefault();
    if (!selectedHomeowner?.id || isSavingEdit) return;

    const city = normalizePangasinanMunicipality(editForm.city);
    const barangay = normalizePangasinanBarangay(city, editForm.barangay);
    const savedCity = normalizePangasinanMunicipality(selectedHomeowner.city);
    const savedBarangay = normalizePangasinanBarangay(savedCity, selectedHomeowner.barangay);
    const savedProvince = String(selectedHomeowner.province || '').trim().toLocaleLowerCase();
    const locationChanged = city !== savedCity
      || barangay !== savedBarangay
      || savedProvince !== PANGASINAN_PROVINCE.toLocaleLowerCase();
    const locationLabel = [barangay, city, PANGASINAN_PROVINCE].filter(Boolean).join(', ');

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
      setEditError('Phone number must be exactly 11 digits starting with 09 (e.g. 09123456789).');
      return;
    }

    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim().toLowerCase(),
      phone: cleanPhone,
      city,
      barangay,
      province: PANGASINAN_PROVINCE,
      address: locationChanged ? locationLabel : editForm.address.trim() || locationLabel,
    };

    if (!payload.firstName || !payload.lastName || !payload.city || !payload.barangay || !payload.province || !payload.address) {
      setEditError('Full name and complete location information are required.');
      return;
    }
    setEditError('');
    setPendingEditPayload(payload);
    setShowEditConfirmModal(true);
  };

  const handleConfirmSaveInformation = async () => {
    if (!selectedHomeowner?.id || !pendingEditPayload || isSavingEdit) return;

    setIsSavingEdit(true);
    setEditError('');
    try {
      const payload = pendingEditPayload;
      const result = await adminAPI.updateHomeowner(selectedHomeowner.id, payload);
      const updated = result?.data || {};
      const merged = {
        ...selectedHomeowner,
        ...updated,
        ...payload,
        name: String(updated.name || `${payload.firstName} ${payload.lastName}`.trim()),
        location: String(updated.location || payload.address),
      };
      const nextHomeowners = homeowners.map((homeowner) =>
        String(homeowner?.id || homeowner?._id || '') === selectedHomeowner.id
          ? { ...homeowner, ...updated, ...payload }
          : homeowner
      );
      setHomeowners(nextHomeowners);
      homeownersCache = nextHomeowners;
      homeownersCacheLoadedAt = Date.now();
      setSelectedHomeowner(merged);
      setPendingEditPayload(null);
      setShowEditConfirmModal(false);
      setShowEditModal(false);
      setShowProfileModal(true);
    } catch (error) {
      setEditError(error?.response?.data?.message || 'Unable to update Homeowner information.');
      setShowEditConfirmModal(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStartSuspend = () => {
    setShowProfileModal(false);
    setShowSuspendModal(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedHomeowner?.id) return;

    try {
      const result = await adminAPI.updateHomeownerStatus(selectedHomeowner.id, 'Suspended');
      const nextStatus = String(result?.data?.status || 'Suspended');
      const suspendedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      const nextHomeowners = homeowners.map((h) =>
        h.id === selectedHomeowner.id
          ? {
              ...h,
              status: nextStatus,
              suspendedOn,
              suspensionReason: suspendReason,
              suspensionDetails: suspendDetails || 'No details provided.',
              suspendedBy: 'Admin'
            }
          : h
      );
      setHomeowners(nextHomeowners);
      homeownersCache = nextHomeowners;
      homeownersCacheLoadedAt = Date.now();
      setTableFilterTab('Suspended');
      setShowSuspendModal(false);
      setSelectedHomeowner(null);
    } catch (error) {
      console.error('Unable to suspend homeowner', error);
    }
  };

  const handleStartReinstate = () => {
    setShowProfileModal(false);
    setShowReinstateModal(true);
  };

  const handleConfirmReinstate = async () => {
    if (!selectedHomeowner?.id) return;

    try {
      const result = await adminAPI.updateHomeownerStatus(selectedHomeowner.id, 'Active');
      const nextStatus = String(result?.data?.status || 'Verified');
      const nextHomeowners = homeowners.map((h) =>
        h.id === selectedHomeowner.id
          ? { ...h, status: nextStatus, suspendedOn: undefined, suspensionReason: undefined, suspensionDetails: undefined, suspendedBy: undefined }
          : h
      );
      setHomeowners(nextHomeowners);
      homeownersCache = nextHomeowners;
      homeownersCacheLoadedAt = Date.now();
      setTableFilterTab('Active');
      setShowReinstateModal(false);
      setSelectedHomeowner(null);
    } catch (error) {
      console.error('Unable to reinstate homeowner', error);
    }
  };

  const normalizeStatus = (item) => {
    const raw = String(item?.status || '').trim().toLowerCase();
    if (raw === 'suspended' || raw === 'disabled' || raw === 'inactive') return 'Suspended';
    return 'Active';
  };

  const normalizedHomeowners = React.useMemo(() => homeowners.map((item, index) => ({
    id: String(item?.id || item?._id || index),
    name: String(item?.name || `${item?.firstName || ''} ${item?.lastName || ''}`.trim() || 'Homeowner'),
    email: String(item?.email || ''),
    phone: String(item?.phone || ''),
    avatar: String(item?.avatar || item?.profileImage || item?.profilePicture || item?.photoUrl || item?.image || item?.photo || item?.picture || ''),
    firstName: String(item?.firstName || ''),
    lastName: String(item?.lastName || ''),
    city: String(item?.city || ''),
    barangay: String(item?.barangay || ''),
    province: String(item?.province || ''),
    address: String(item?.address || ''),
    location: String(item?.address || item?.location || [item?.barangay, item?.city, item?.province].filter(Boolean).join(', ') || 'N/A'),
    requestsCount: Number(item?.requestsCount ?? item?.stats?.total ?? 0),
    joinedOn: String(item?.joinedOn || item?.createdAt || ''),
    createdAt: item?.createdAt || null,
    isVerified: Boolean(item?.isVerified),
    emailNotifications: typeof item?.emailNotifications === 'boolean' ? item.emailNotifications : true,
    status: normalizeStatus(item),
    stats: item?.stats || { total: 0, pending: 0, ongoing: 0, completed: 0, cancelled: 0 },
    recentRequests: Array.isArray(item?.recentRequests) ? item.recentRequests : [],
    suspendedOn: String(item?.suspendedOn || ''),
    suspensionReason: String(item?.suspensionReason || ''),
    suspensionDetails: String(item?.suspensionDetails || ''),
    suspendedBy: String(item?.suspendedBy || 'Admin'),
  })), [homeowners]);

  const { filteredHomeowners, allCount, activeCount, suspendedCount } = React.useMemo(() => {
    const loweredSearch = searchTerm.toLowerCase();
    const filtered = normalizedHomeowners.filter((h) => {
      const matchesTab =
        tableFilterTab === 'All'
          ? true
          : tableFilterTab === 'Active'
            ? h.status === 'Active'
            : h.status === 'Suspended';
      return (
        matchesTab &&
        (h.name.toLowerCase().includes(loweredSearch) ||
         h.email.toLowerCase().includes(loweredSearch) ||
         h.location.toLowerCase().includes(loweredSearch))
      );
    });
    return {
      filteredHomeowners: filtered,
      allCount: normalizedHomeowners.length,
      activeCount: normalizedHomeowners.filter((h) => h.status === 'Active').length,
      suspendedCount: normalizedHomeowners.filter((h) => h.status === 'Suspended').length,
    };
  }, [normalizedHomeowners, searchTerm, tableFilterTab]);

  const availableEditBarangays = getPangasinanBarangays(editForm.city);
  const editLocationPreview = [editForm.barangay, editForm.city, PANGASINAN_PROVINCE]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden font-sans relative">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm shrink-0">
        <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto" />
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-8 pr-2 h-full"> 
          <aside className="w-64 h-full bg-white border border-gray-100 rounded-[2rem] shadow-sm flex flex-col p-6">
            <div className="flex-1 overflow-y-auto pr-1">
              <nav className="space-y-3">
                {sidebarSections.map((section) => (
                  <div key={section.title} className="space-y-1">
                    <p className="px-4 pt-2 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
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
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <User className="text-gray-400" size={18} />
                </div>
                <span className="font-bold text-gray-800 text-xs">Admin</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 border border-gray-200 rounded-full text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:text-red-500 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </aside>
        </motion.div>

        {/* Main Content Area */}
        <main className="flex-1 p-10 pl-6 overflow-y-auto">
          <h1 className="text-3xl font-black text-slate-800 mb-2">Homeowners</h1>
          <p className="text-gray-500 text-sm font-medium mb-8">Verify homeowner accounts and monitor existing activity.</p>
          {addHomeownerSuccess && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-bold flex items-center gap-2">
              <Check size={16} />
              <span>{addHomeownerSuccess}</span>
            </div>
          )}

          {/* Search Input & Table Filter Tabs */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex gap-3">
              <button
                onClick={() => setTableFilterTab('All')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 ${
                  tableFilterTab === 'All'
                    ? 'bg-[#FCEBA1] border-amber-300 text-gray-900 shadow-sm'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>ALL</span>
                <span className="text-xs font-black">{allCount}</span>
              </button>
              <button
                onClick={() => setTableFilterTab('Active')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 ${
                  tableFilterTab === 'Active'
                    ? 'bg-[#FCEBA1] border-amber-300 text-gray-900 shadow-sm'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>ACTIVE</span>
                <span className="text-xs font-black">{activeCount}</span>
              </button>
              <button
                onClick={() => setTableFilterTab('Suspended')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 ${
                  tableFilterTab === 'Suspended'
                    ? 'bg-[#FCEBA1] border-amber-300 text-gray-900 shadow-sm'
                    : 'bg-white border-gray-100 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>SUSPENDED</span>
                <span className="text-xs font-black">{suspendedCount}</span>
              </button>
            </div>

            {/* Search Box & Add Homeowner Button */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-3.5 py-2 w-64 shadow-sm focus-within:border-blue-400 transition">
                <Search size={15} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search by name, email, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-none outline-none w-full text-xs bg-transparent text-gray-800 placeholder-gray-400 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setAddHomeownerForm(initialAddHomeownerState);
                  setAddHomeownerError('');
                  setShowAddHomeownerModal(true);
                }}
                className="flex items-center gap-2 bg-[#0B3B68] text-white px-5 py-2 rounded-full text-xs font-bold hover:bg-[#082b4c] transition shadow-sm"
              >
                <Plus size={15} />
                <span>Add Homeowner</span>
              </button>
            </div>
          </div>

          {/* Data Table Container */}
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[700px] text-center border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">Homeowner</th>
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">Location</th>
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">Status</th>
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">Requests</th>
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">{tableFilterTab === 'Suspended' ? 'Suspended On' : 'Joined On'}</th>
                  <th className="p-4 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredHomeowners.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 text-xs font-bold text-gray-800 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-8 h-8 rounded-full border border-amber-200 object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                            <User size={16} className="text-amber-700" />
                          </div>
                        )}
                        <div className="text-left">
                          <span>{item.name}</span>
                          <span className="block text-[10px] font-normal text-gray-400">{item.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-500 font-medium text-center">{item.location}</td>
                    <td className="p-4 text-xs text-center font-bold">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-center font-bold text-gray-700">{item.requestsCount}</td>
                    <td className="p-4 text-xs text-gray-500 font-medium text-center">
                      {tableFilterTab === 'Suspended' ? item.suspendedOn || 'N/A' : item.joinedOn || 'N/A'}
                    </td>
                    <td className="p-4 text-xs text-center">
                      <button
                        onClick={() => handleOpenProfile(item)}
                        className="border border-blue-500 text-blue-600 font-bold px-4 py-1 rounded-full text-[11px] hover:bg-blue-600 hover:text-white transition shadow-2xs"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredHomeowners.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-xs uppercase tracking-wider text-gray-400 font-bold">
                      No homeowners found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 text-xs text-gray-500 font-medium">
              <span>Rows per page: 20</span>
              <div className="flex items-center gap-2">
                <span className="cursor-pointer text-gray-400 hover:text-gray-600 transition">&lt; Previous</span>
                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-md font-bold text-gray-800">1</span>
                <span className="w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded-md transition">2</span>
                <span className="w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-50 rounded-md transition">3</span>
                <span className="cursor-pointer hover:text-gray-600 transition">Last &gt;</span>
              </div>
              <span>1-20 of 65</span>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL 1: VIEW PROFILE */}
      {showProfileModal && selectedHomeowner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {selectedHomeowner.status === 'Suspended' ? 'Suspended Homeowner Account' : 'Homeowner Profile Details'}
                </h3>
                <span className="text-xs text-gray-400">
                  {selectedHomeowner.status === 'Suspended' 
                    ? `Suspended on: ${selectedHomeowner.suspendedOn}` 
                    : `Joined on: ${selectedHomeowner.joinedOn}`}
                </span>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowProfileModal(false)} />
            </div>

            <div className="flex items-center gap-4 mt-4">
              {selectedHomeowner.avatar ? (
                <img
                  src={selectedHomeowner.avatar}
                  alt={selectedHomeowner.name}
                  className="w-14 h-14 rounded-full border border-amber-200 object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <User size={30} className="text-amber-700" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{selectedHomeowner.name}</h2>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedHomeowner.status === 'Suspended' ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {selectedHomeowner.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5 font-medium">Homeowner</div>
                <div className="text-xs text-gray-600 mt-1 flex items-center gap-1 font-medium">
                  <MapPin size={13} className="text-blue-600" /> {selectedHomeowner.location}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-gray-50 border border-gray-100 rounded-xl p-3 mt-4 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {selectedHomeowner.email}</div>
              <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {selectedHomeowner.phone}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
              {[
                ['Full Name', selectedHomeowner.name],
                ['Email', selectedHomeowner.email],
                ['Contact Number', selectedHomeowner.phone],
                ['Barangay', selectedHomeowner.barangay || 'Not specified'],
                ['Municipality / City', selectedHomeowner.city || 'Not specified'],
                ['Province', selectedHomeowner.province || 'Not specified'],
                ['Address / Location', selectedHomeowner.address || 'Not specified'],
                ['Account Status', selectedHomeowner.status],
                ['Registration Date', selectedHomeowner.createdAt ? new Date(selectedHomeowner.createdAt).toLocaleString() : selectedHomeowner.joinedOn || 'Not specified'],
                ['Email Notifications', selectedHomeowner.emailNotifications ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} className={`${label === 'Address / Location' ? 'sm:col-span-2' : ''} rounded-xl border border-gray-100 bg-white p-3`}>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-gray-400">{label}</div>
                  <div className="mt-1 font-semibold text-gray-800 break-words">{value || 'Not specified'}</div>
                </div>
              ))}
            </div>

            {selectedHomeowner.status === 'Suspended' && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 mt-4">
                <h4 className="text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">Suspended</h4>
                <p className="text-xs text-gray-800 my-1"><strong>Reason:</strong> {selectedHomeowner.suspensionReason}</p>
                <p className="text-xs text-gray-800 my-1"><strong>Details:</strong> {selectedHomeowner.suspensionDetails}</p>
                <p className="text-xs text-gray-800 my-1"><strong>Suspended by:</strong> {selectedHomeowner.suspendedBy}</p>
                <p className="text-xs text-gray-800 my-1"><strong>Date:</strong> {selectedHomeowner.suspendedOn}</p>
              </div>
            )}

            <div className="grid grid-cols-5 gap-2 mt-4">
              <div className="rounded-xl p-2.5 flex flex-col items-center justify-center bg-gray-900 text-white">
                <span className="text-lg font-bold">{selectedHomeowner.stats.total}</span>
                <span className="text-[10px] font-medium opacity-80">Total</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col items-center justify-center bg-amber-100 text-amber-900">
                <span className="text-lg font-bold">{selectedHomeowner.stats.pending}</span>
                <span className="text-[10px] font-medium">Pending</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col items-center justify-center bg-blue-100 text-blue-900">
                <span className="text-lg font-bold">{selectedHomeowner.stats.ongoing}</span>
                <span className="text-[10px] font-medium">Ongoing</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col items-center justify-center bg-emerald-100 text-emerald-900">
                <span className="text-lg font-bold">{selectedHomeowner.stats.completed}</span>
                <span className="text-[10px] font-medium">Completed</span>
              </div>
              <div className="rounded-xl p-2.5 flex flex-col items-center justify-center bg-rose-100 text-rose-900">
                <span className="text-lg font-bold">{selectedHomeowner.stats.cancelled}</span>
                <span className="text-[10px] font-medium">Cancelled</span>
              </div>
            </div>

            <h4 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Recent Service Requests</h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-2.5 font-bold text-gray-500">Service</th>
                    <th className="p-2.5 font-bold text-gray-500">Worker</th>
                    <th className="p-2.5 font-bold text-gray-500">Status</th>
                    <th className="p-2.5 font-bold text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedHomeowner.recentRequests.map((req, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-gray-800">{req.service}</td>
                      <td className="p-2.5 text-gray-600">{req.worker}</td>
                      <td className="p-2.5 font-medium">{req.status}</td>
                      <td className="p-2.5 text-gray-400">{req.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleOpenRequestsModal}
              disabled={!selectedHomeownerRequests.length}
              className="mt-3 text-xs text-blue-600 font-bold flex items-center gap-1 cursor-pointer hover:underline disabled:cursor-default disabled:hover:no-underline disabled:opacity-70"
            >
              View all requests <ArrowRight size={14} />
            </button>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-5 py-2 border border-blue-200 text-blue-700 rounded-full text-xs font-bold bg-blue-50 hover:bg-blue-100 transition inline-flex items-center gap-1.5"
              >
                <Edit3 size={13} /> Edit Information
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition"
              >
                Close
              </button>
              {selectedHomeowner.status === 'Active' ? (
                <button
                  onClick={handleStartSuspend}
                  className="px-5 py-2 border border-rose-500 text-rose-600 rounded-full text-xs font-bold bg-white hover:bg-rose-50 transition"
                >
                  Suspend Homeowner
                </button>
              ) : (
                <button
                  onClick={handleStartReinstate}
                  className="px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition"
                >
                  Reinstate Homeowner
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1A: EDIT PROTECTED HOMEOWNER INFORMATION */}
      {showEditModal && selectedHomeowner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Edit Homeowner Information</h3>
                <p className="text-xs text-gray-400 mt-1">Updates the same registered Homeowner account.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setShowProfileModal(true); setEditError(''); }}
                disabled={isSavingEdit}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                aria-label="Close edit Homeowner information"
              >
                <X size={18} />
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSaveInformation}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-gray-700">First Name</span>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((current) => ({ ...current, firstName: event.target.value }))}
                    disabled={isSavingEdit}
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
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((current) => ({ ...current, lastName: event.target.value }))}
                    disabled={isSavingEdit}
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
                    value={editForm.email}
                    onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                    disabled={isSavingEdit}
                    required
                    placeholder="email@domain.com"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-gray-700">Contact Number</span>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))}
                    disabled={isSavingEdit}
                    required
                    pattern="09[0-9]{9}"
                    maxLength={11}
                    title="11 digits starting with 09 (e.g. 09123456789)"
                    placeholder="09123456789"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </label>
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
                    value={editForm.city}
                    onChange={(event) => setEditForm((current) => ({
                      ...current,
                      city: event.target.value,
                      barangay: '',
                    }))}
                    disabled={isSavingEdit}
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
                    value={editForm.barangay}
                    onChange={(event) => setEditForm((current) => ({ ...current, barangay: event.target.value }))}
                    disabled={isSavingEdit || !editForm.city}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">{editForm.city ? 'Select Barangay' : 'Select Municipality / City first'}</option>
                    {availableEditBarangays.map((barangay) => (
                      <option key={barangay} value={barangay}>{barangay}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="block text-xs font-bold text-gray-700">Address / Location</span>
                  <input
                    type="text"
                    value={editLocationPreview}
                    readOnly
                    className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-600"
                  />
                  <span className="block text-[10px] text-gray-400">Updated from the selected Barangay, Municipality/City, and Province when the registered location changes.</span>
                </label>
              </div>

              {editError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {editError}
                </div>
              ) : null}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setShowProfileModal(true); setEditError(''); }}
                  disabled={isSavingEdit}
                  className="px-5 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSavingEdit ? 'Saving...' : 'Review and Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditConfirmModal && selectedHomeowner && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-homeowner-edit-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ShieldCheck size={24} />
            </div>
            <h3 id="confirm-homeowner-edit-title" className="mt-4 text-center text-xl font-black text-gray-900">Confirm Changes</h3>
            <p className="mt-3 text-center text-sm leading-6 text-gray-500">
              Are you sure you want to update this Homeowner's protected account information?
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isSavingEdit) return;
                  setShowEditConfirmModal(false);
                  setPendingEditPayload(null);
                }}
                disabled={isSavingEdit}
                className="rounded-full border border-gray-200 px-6 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveInformation}
                disabled={isSavingEdit}
                className="rounded-full bg-blue-600 px-6 py-2.5 text-xs font-black text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSavingEdit ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1B: ALL REQUESTS */}
      {showRequestsModal && selectedHomeowner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">All Service Requests</h3>
                <span className="text-xs text-gray-400">
                  {selectedHomeowner.name} · {selectedHomeownerRequests.length} request{selectedHomeownerRequests.length === 1 ? '' : 's'}
                </span>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={handleCloseRequestsModal} />
            </div>

            <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-3 font-bold text-gray-500">Service</th>
                    <th className="p-3 font-bold text-gray-500">Worker</th>
                    <th className="p-3 font-bold text-gray-500">Status</th>
                    <th className="p-3 font-bold text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedHomeownerRequests.length > 0 ? (
                    selectedHomeownerRequests.map((req, idx) => {
                      const row = toRecentRequestRow(req);
                      return (
                        <tr key={`${req?.id || idx}`}>
                          <td className="p-3 font-semibold text-gray-800">{row.service}</td>
                          <td className="p-3 text-gray-600">{row.worker}</td>
                          <td className="p-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                row.status === 'Ongoing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : row.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : row.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-700'
                                  : row.status === 'Declined'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400">{row.date}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs uppercase tracking-wider text-gray-400 font-bold">
                        No requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={handleCloseRequestsModal}
                className="px-5 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUSPEND CONFIRMATION */}
      {showSuspendModal && selectedHomeowner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="text-rose-500 shrink-0" size={22} />
                <div>
                  <h3 className="text-base font-bold text-gray-900">Suspend Homeowner's Account</h3>
                  <p className="text-xs text-gray-400 mt-0.5">This will temporarily restrict the homeowner from requesting new services.</p>
                </div>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowSuspendModal(false)} />
            </div>

            <div className="flex items-center gap-3 my-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                <User size={22} className="text-amber-700" />
              </div>
              <div>
                <span className="font-bold text-sm text-gray-900">{selectedHomeowner.name}</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 uppercase">Active</span>
                <div className="text-xs text-gray-500 mt-0.5">{selectedHomeowner.location}</div>
              </div>
            </div>

            <div className="my-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Reason for Suspension <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl appearance-none text-xs text-gray-800 font-medium focus:outline-none focus:border-blue-500 pr-8 shadow-2xs"
                >
                  {SUSPENSION_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3 pointer-events-none text-gray-400" />
              </div>
            </div>

            <div className="my-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Additional Details (Required)
              </label>
              <textarea
                rows={3}
                placeholder="Describe the issue or concern (e.g., repeated cancellations, no-show incidents, spam/fake requests)."
                value={suspendDetails}
                onChange={(e) => setSuspendDetails(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 my-2 text-xs">
              <strong className="block text-gray-900 mb-1">What happens when suspended:</strong>
              <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                <CheckCircle2 size={14} className="text-amber-600 shrink-0" /> Homeowner can still view past requests, but cannot create new ones
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 size={14} className="text-amber-600 shrink-0" /> Requests already submitted will not be deleted or modified
              </div>
            </div>

            <p className="text-[11px] text-gray-400 mt-2">The homeowner will be notified about this suspension.</p>

            <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowSuspendModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuspend}
                className="px-5 py-2 bg-rose-600 text-white rounded-full text-xs font-bold hover:bg-rose-700 transition shadow-2xs"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REINSTATE CONFIRMATION */}
      {showReinstateModal && selectedHomeowner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Reinstate Homeowner Account</h3>
                <p className="text-xs text-gray-400 mt-0.5">This will re-enable the homeowner account to submit new service requests.</p>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowReinstateModal(false)} />
            </div>

            <div className="flex items-center gap-3 my-4 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                <User size={22} className="text-amber-700" />
              </div>
              <div>
                <span className="font-bold text-sm text-gray-900">{selectedHomeowner.name}</span>
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 uppercase">Suspended</span>
                <div className="text-xs text-gray-500 mt-0.5">{selectedHomeowner.location}</div>
              </div>
            </div>

            <div className="my-3">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Admin Note
              </label>
              <textarea
                rows={3}
                placeholder="Reason for reinstatement (e.g., reviewed and cleared, issue resolved)."
                value={reinstateNote}
                onChange={(e) => setReinstateNote(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-800 font-medium focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                This will notify the homeowner that their account has been reinstated.
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 my-2 text-xs">
              <strong className="block text-gray-900 mb-1">What happens next:</strong>
              <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Homeowner status becomes <strong className="ml-1 text-gray-800">Active</strong>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Homeowner can create new service requests
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowReinstateModal(false)}
                className="px-5 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReinstate}
                className="px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition shadow-2xs"
              >
                Confirm Reinstatement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD HOMEOWNER */}
      {showAddHomeownerModal && (
        <AddHomeownerModal
          isOpen={showAddHomeownerModal}
          onClose={() => {
            if (isSubmittingHomeowner) return;
            setShowAddHomeownerModal(false);
            setAddHomeownerError('');
          }}
          form={addHomeownerForm}
          setForm={setAddHomeownerForm}
          barangays={addHomeownerBarangays}
          onSubmit={handleAddHomeownerSubmit}
          isSubmitting={isSubmittingHomeowner}
          error={addHomeownerError}
        />
      )}
    </div>
  );
}

// ADD HOMEOWNER MODAL COMPONENT (WITH STEP 2 PROOFREAD)
const AddHomeownerModal = ({
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

  if (!isOpen) return null;

  const handleNextToProofread = (e) => {
    e.preventDefault();
    setLocalError('');

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
    if (!form.city || !form.barangay) {
      setLocalError('City and barangay are required.');
      return;
    }

    setStep(2);
  };

  const handleClose = () => {
    setStep(1);
    setLocalError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-xl bg-white rounded-3xl p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
      >
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
              {step === 1 ? 'Add New Homeowner' : 'Proofread Homeowner Information'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              {step === 1
                ? 'Manually register a homeowner account into the platform'
                : 'Please verify that all homeowner details are correct before account activation'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
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
                  pattern="[A-Za-z\s-]{2,30}"
                  maxLength={30}
                  title="Letters and spaces only (2-30 characters)"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Maria (letters only)"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  pattern="[A-Za-z\s-]{2,30}"
                  maxLength={30}
                  title="Letters and spaces only (2-30 characters)"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Santos (letters only)"
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
                  placeholder="maria.santos@example.com"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone Number (PH format) *</label>
                <input
                  type="tel"
                  required
                  pattern="09[0-9]{9}"
                  maxLength={11}
                  title="11 digits starting with 09 (e.g. 09123456789)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="09123456789"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
              >
                <option value="Verified">Active (Verified)</option>
                <option value="Suspended">Suspended</option>
              </select>
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

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">Street Address / Landmark (Optional)</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. 123 Rizal St., near Town Plaza"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
              />
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
                  Admin accounts cannot set passwords. An activation email with a verification OTP will be automatically dispatched to <strong>{form.email}</strong> allowing the homeowner to set their own secure password.
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
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Initial Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                    form.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {form.status === 'Verified' ? 'Active (Verified)' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Email Address</span>
                  <span className="font-semibold text-gray-800">{form.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Contact Number</span>
                  <span className="font-semibold text-gray-800">{form.phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Municipality / City</span>
                  <span className="font-semibold text-gray-800">{form.city}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-400 block">Barangay</span>
                  <span className="font-semibold text-gray-800">{form.barangay}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block">Street Address / Landmark</span>
                <span className="font-semibold text-gray-800">{form.address || 'None provided'}</span>
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
                    <span>Registering Homeowner...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm &amp; Register Homeowner</span>
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
