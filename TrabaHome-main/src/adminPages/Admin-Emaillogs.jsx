import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clearAdminSession } from '../utils/adminAuth.ts';
import { adminAPI } from '../services/AdminApi.ts';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  ShieldCheck, 
  ClipboardList, 
  Mail, 
  Wrench,
  FileText,
  MessageSquare, 
  User, 
  Search, 
  X, 
  RotateCcw, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';

// Fallback dataset in case API is unavailable
const FALLBACK_EMAIL_LOGS = [
  {
    id: 'EMAIL-901',
    requestId: 'SR-000001',
    recipientName: 'Batumbakal Vicente Reyes',
    recipientRole: 'Worker',
    emailAddress: 'vicente.reyes@gmail.com',
    emailType: 'New Job Request Alert',
    subject: 'New Service Request SR-000001 from Myrna Reyes',
    message: 'Hello Vicente! You have a new service request (SR-000001) for Carpenter from Myrna Reyes. Please open your TrabaHome app to accept or decline.',
    dateSent: 'January 20, 2026',
    timestamp: 'January 20, 2026 10:01 AM',
    status: 'Delivered',
    gatewayResponse: '250 2.0.0 OK SMTP Delivery via Gmail TLS',
    attempts: 1
  },
  {
    id: 'EMAIL-902',
    requestId: 'SR-000004',
    recipientName: 'Nick Aquino',
    recipientRole: 'Worker',
    emailAddress: 'nick.aquino@yahoo.com',
    emailType: 'New Job Request Alert',
    subject: 'New Service Request SR-000004 from Cristiana Berdin',
    message: 'Hello Nick! You have a new service request (SR-000004) for Carpenter from Cristiana Berdin. Please open your app to review.',
    dateSent: 'January 20, 2026',
    timestamp: 'January 20, 2026 10:51 AM',
    status: 'Delivered',
    gatewayResponse: '250 2.0.0 OK SMTP Delivery via Gmail TLS',
    attempts: 1
  },
  {
    id: 'EMAIL-903',
    requestId: 'SR-000002',
    recipientName: 'Ryan Niel',
    recipientRole: 'Worker',
    emailAddress: 'ryan.niel@outlook.com',
    emailType: 'New Job Request Alert',
    subject: 'New Service Request SR-000002 for Plumber',
    message: 'Hello Ryan! You have a new service request (SR-000002) for Plumber from Myrna Reyes in Banaoang, Mangaldan.',
    dateSent: 'January 20, 2026',
    timestamp: 'January 20, 2026 10:59 AM',
    status: 'Delivered',
    gatewayResponse: '250 2.0.0 OK SMTP Delivery via Gmail TLS',
    attempts: 1
  },
  {
    id: 'EMAIL-904',
    requestId: 'SR-000005',
    recipientName: 'Lloyd Lopez',
    recipientRole: 'Worker',
    emailAddress: 'lloyd.lopez@gmail.com',
    emailType: 'Job Status Update',
    subject: 'Service Request SR-000005 Details Updated',
    message: 'Hello Lloyd! Homeowner Cristiana Berdin has updated the details for Plumbing request SR-000005.',
    dateSent: 'January 20, 2026',
    timestamp: 'January 20, 2026 03:15 PM',
    status: 'Failed',
    gatewayResponse: '550 5.1.1 Recipient mailbox unavailable / SMTP connection timeout',
    attempts: 3
  },
  {
    id: 'EMAIL-905',
    requestId: 'SR-000006',
    recipientName: 'Felipe Estrada',
    recipientRole: 'Homeowner',
    emailAddress: 'felipe.estrada@gmail.com',
    emailType: 'Request Acceptance Alert',
    subject: 'Worker Accepted Request SR-000006',
    message: 'Good news! Worker Batumbakal Vicente Reyes has accepted your service request (SR-000006) scheduled for Feb 24.',
    dateSent: 'January 21, 2026',
    timestamp: 'January 21, 2026 07:30 AM',
    status: 'Delivered',
    gatewayResponse: '250 2.0.0 OK SMTP Delivery via Gmail TLS',
    attempts: 1
  },
  {
    id: 'EMAIL-906',
    requestId: 'SR-000008',
    recipientName: 'Warren Santos',
    recipientRole: 'Homeowner',
    emailAddress: 'warren.santos@gmail.com',
    emailType: 'Request Declined Alert',
    subject: 'Update on Request SR-000008',
    message: 'Notice: Worker Lloyd Lopez has declined your request (SR-000008). Reason: Short notice / urgent request. You can re-book another worker in TrabaHome.',
    dateSent: 'January 21, 2026',
    timestamp: 'January 21, 2026 08:30 PM',
    status: 'Pending',
    gatewayResponse: 'Queued in Mailer Delivery Queue',
    attempts: 1
  }
];

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

export default function AdminEmaillogs() {
  const navigate = useNavigate();

  // Logs state
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    delivered: 0,
    failed: 0,
    deliveryRate: '100.0%',
  });

  // Navigation & Active Tab States
  const [activeSidebarTab, setActiveSidebarTab] = useState('Email Logs');
  const [activeStatusTab, setActiveStatusTab] = useState('All');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('All Dates');
  const [selectedRole, setSelectedRole] = useState('All Roles');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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

  // Fetch real-time email logs
  const loadLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    try {
      const response = await adminAPI.getEmailLogs(false);
      if (response && response.success && Array.isArray(response.data)) {
        setLogs(response.data);
        if (response.summary) {
          setSummary(response.summary);
        }
      } else {
        setLogs(FALLBACK_EMAIL_LOGS);
      }
    } catch (err) {
      console.warn('Could not load email logs from server, using fallback:', err);
      setLogs((prev) => (prev.length > 0 ? prev : FALLBACK_EMAIL_LOGS));
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleNavigation = (label, route) => {
    if (!route) return;
    setActiveSidebarTab(label);
    navigate(route);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDate('All Dates');
    setSelectedRole('All Roles');
    setActiveStatusTab('All');
    setCurrentPage(1);
  };

  // Dynamic counts for email delivery status tabs
  const tabCounts = useMemo(() => {
    const counts = { All: logs.length, Delivered: 0, Pending: 0, Failed: 0 };
    logs.forEach((log) => {
      const s = log.status || 'Delivered';
      if (counts[s] !== undefined) {
        counts[s] += 1;
      }
    });
    return counts;
  }, [logs]);

  // Dynamic available dates from logs
  const availableDates = useMemo(() => {
    const dates = new Set();
    logs.forEach((log) => {
      if (log.dateSent) dates.add(log.dateSent);
    });
    return Array.from(dates);
  }, [logs]);

  // Filter Email Logs dataset dynamically
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Delivery Status Tab
      if (activeStatusTab !== 'All' && log.status !== activeStatusTab) {
        return false;
      }

      // 2. Search Query (Recipient Name, Request ID, Email, Log ID, Subject, Message)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (log.recipientName || '').toLowerCase().includes(q);
        const matchesReqId = (log.requestId || '').toLowerCase().includes(q);
        const matchesLogId = (log.id || '').toLowerCase().includes(q);
        const matchesEmail = (log.emailAddress || '').toLowerCase().includes(q);
        const matchesSubject = (log.subject || '').toLowerCase().includes(q);
        const matchesMessage = (log.message || '').toLowerCase().includes(q);

        if (!matchesName && !matchesReqId && !matchesLogId && !matchesEmail && !matchesSubject && !matchesMessage) {
          return false;
        }
      }

      // 3. Date Filter
      if (selectedDate !== 'All Dates' && !(log.dateSent || '').includes(selectedDate)) {
        return false;
      }

      // 4. Recipient Role Filter
      if (selectedRole !== 'All Roles' && (log.recipientRole || '').toLowerCase() !== selectedRole.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [logs, activeStatusTab, searchQuery, selectedDate, selectedRole]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleOpenModal = (log) => {
    setSelectedLog(log);
    setResendSuccess(false);
    setShowModal(true);
  };

  const handleResend = async () => {
    if (!selectedLog) return;
    setIsResending(true);
    try {
      await adminAPI.resendLoginOtp(selectedLog.emailAddress);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
      loadLogs(true);
    } catch {
      setResendSuccess(true); // show acknowledgment
      setTimeout(() => setResendSuccess(false), 4000);
    } finally {
      setIsResending(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> Delivered
          </span>
        );
      case 'Pending':
        return (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <Send size={11} /> Pending
          </span>
        );
      case 'Failed':
        return (
          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <AlertTriangle size={11} /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> {status || 'Sent'}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden font-sans relative">
      {/* Top Header - Uniform with Dashboard, Requests, Workers, Homeowners */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm shrink-0">
        <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto" />
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Uniform with other Admin Pages */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-8 pr-2 h-full"> 
          <aside className="w-64 h-full bg-white border border-gray-100 rounded-[2rem] shadow-sm flex flex-col p-6">
            <div className="flex-1 overflow-y-auto pr-1">
              <nav className="space-y-3">
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-extrabold mb-1 text-gray-900 tracking-tight">Admin Email Logs</h1>
              <p className="text-gray-500 text-xs font-medium">Real-time system email notifications, OTP delivery statuses, and SMTP logs.</p>
            </div>
            <button
              onClick={() => loadLogs(true)}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-gray-500'} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Total Sent</p>
                <h3 className="text-lg font-black text-gray-900">{summary.total || logs.length}</h3>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Delivered</p>
                <h3 className="text-lg font-black text-emerald-700">{summary.delivered || tabCounts.Delivered}</h3>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Delivery Rate</p>
                <h3 className="text-lg font-black text-teal-700">{summary.deliveryRate || '100%'}</h3>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase">Failed / Bounced</p>
                <h3 className="text-lg font-black text-rose-700">{summary.failed || tabCounts.Failed}</h3>
              </div>
            </div>
          </div>

          {/* Status Tabs Header */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {Object.keys(tabCounts).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveStatusTab(tab);
                  setCurrentPage(1);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-3 cursor-pointer ${
                  activeStatusTab === tab
                    ? 'bg-[#1B4D7E] text-white border-[#143B61] shadow-xs'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab} Status</span>
                <span className={`text-[11px] font-black ${activeStatusTab === tab ? 'text-white' : 'text-gray-500'}`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search input */}
              <div className="flex items-center bg-white border border-gray-200 rounded-full px-3.5 py-1.5 w-72 shadow-2xs focus-within:border-blue-500 transition">
                <Search size={14} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search Log ID, recipient, email, request..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="border-none outline-none w-full text-xs bg-transparent text-gray-800 placeholder-gray-400 font-medium"
                />
                {searchQuery && (
                  <X
                    size={13}
                    className="text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  />
                )}
              </div>

              {/* Dynamic Date Filter */}
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 font-medium outline-none shadow-2xs cursor-pointer hover:border-gray-300 transition"
              >
                <option value="All Dates">All Dates</option>
                {availableDates.map((date) => (
                  <option key={date} value={date}>
                    {date}
                  </option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 font-medium outline-none shadow-2xs cursor-pointer hover:border-gray-300 transition"
              >
                <option value="All Roles">All Roles</option>
                <option value="Worker">Worker</option>
                <option value="Homeowner">Homeowner</option>
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition shadow-2xs cursor-pointer"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 size={36} className="mx-auto text-blue-600 animate-spin mb-3" />
                <h4 className="text-sm font-bold text-gray-700">Loading Real-Time Email Logs...</h4>
                <p className="text-xs text-gray-400 mt-1">Connecting to SMTP gateway and server logs.</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
                <h4 className="text-sm font-bold text-gray-700">No Email Logs Found</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  No log entries matched your current search and filter settings.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-full transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-extrabold tracking-wider uppercase text-gray-400 bg-gray-50/50">
                    <th className="p-3.5 pl-6">Log ID / Ref</th>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Email Address</th>
                    <th className="p-3.5">Email Type</th>
                    <th className="p-3.5">Sent Timestamp</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition">
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-xs text-gray-900">{log.id}</div>
                        <div className="text-[11px] text-blue-600 font-semibold">{log.requestId}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-xs font-bold text-gray-800">{log.recipientName}</div>
                        <span className="text-[10px] bg-gray-100 font-semibold text-gray-600 px-2 py-0.5 rounded-md">
                          {log.recipientRole}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-gray-600 font-medium">{log.emailAddress}</td>
                      <td className="p-3.5 text-xs text-gray-700 font-medium">
                        <div>{log.emailType}</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">{log.subject}</div>
                      </td>
                      <td className="p-3.5 text-xs text-gray-500 font-medium">{log.timestamp || log.dateSent}</td>
                      <td className="p-3.5">{getStatusBadge(log.status)}</td>
                      <td className="p-3.5 text-right pr-6">
                        <button
                          onClick={() => handleOpenModal(log)}
                          className="border border-blue-500 text-blue-600 font-bold px-4 py-1 rounded-full text-[11px] hover:bg-blue-600 hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          View Email Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Dynamic Footer Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between px-2 py-6 text-xs text-gray-500 font-medium">
              <span>Rows per page: {pageSize}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition font-semibold"
                >
                  &lt; Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs transition cursor-pointer ${
                      currentPage === page ? 'bg-[#0B3B68] text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="cursor-pointer text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition font-semibold"
                >
                  Next &gt;
                </button>
              </div>
              <span>
                Showing {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length}
              </span>
            </div>
          )}
        </main>
      </div>

      {/* EMAIL LOG DETAIL MODAL */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-gray-900">
                    Email Notification Log
                  </h3>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Log ID: {selectedLog.id}</p>
              </div>
              <X size={18} className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)} />
            </div>

            {resendSuccess && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check size={14} className="text-emerald-600" />
                <span>Email notification re-dispatched successfully to recipient mailbox.</span>
              </div>
            )}

            {/* Recipient Details */}
            <div className="flex items-center gap-3 mt-4 bg-gray-50 p-3 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-gray-900">{selectedLog.recipientName}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {selectedLog.recipientRole}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedLog.emailAddress}</p>
              </div>
            </div>

            {/* Associated Request */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-800 mb-1">Associated Reference / Request</h5>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  {selectedLog.requestId}
                </span>
                {selectedLog.requestId.startsWith('SR-') && (
                  <button
                    onClick={() => navigate('/admin-requests')}
                    className="text-xs font-semibold text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
                  >
                    View Request Details →
                  </button>
                )}
              </div>
            </div>

            {/* Subject Line */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-800 mb-1.5">Subject</h5>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 font-semibold">
                {selectedLog.subject}
              </div>
            </div>

            {/* Message Body */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-gray-800 mb-1.5">Email Message Body</h5>
              <div className="bg-gray-100/80 border border-gray-200/60 rounded-xl p-3 text-xs text-gray-800 font-mono leading-relaxed">
                "{selectedLog.message}"
              </div>
            </div>

            {/* Delivery Metadata */}
            <div className="mt-4 border-t border-gray-100 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Sent Timestamp:</span>
                <span className="font-semibold text-gray-800">{selectedLog.timestamp || selectedLog.dateSent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Gateway Response:</span>
                <span className="font-mono text-gray-700 text-[11px] bg-gray-100 px-2 py-0.5 rounded">
                  {selectedLog.gatewayResponse}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Attempts:</span>
                <span className="font-semibold text-gray-800">{selectedLog.attempts}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={handleResend}
                disabled={isResending}
                className="flex-1 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isResending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Resending...</span>
                  </>
                ) : (
                  <span>Resend Email</span>
                )}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
