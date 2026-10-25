import React, { useEffect, useMemo, useRef, useState } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Megaphone,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import { adminAPI, invalidateAdminRequestCache } from '../services/AdminApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { getAdminAuthToken, clearAdminSession } from '../utils/adminAuth.ts';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';

const buildFallbackRequestPerDay = () => {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

  return Array.from({ length: 7 }, (_value, index) => {
    const day = new Date(utcToday);
    day.setUTCDate(utcToday.getUTCDate() - (6 - index));
    return {
      key: day.toISOString().slice(0, 10),
      label: formatter.format(day),
      count: 0,
    };
  });
};

function SidebarItem({ label, active, icon, disabled, onClick }) {
  return (
    <motion.button
      type="button"
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

const AdminDashboard = () => {
  const navigate = useNavigate(); 
  const [activeTab, setActiveTab] = useState('Dashboard'); 
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalWorkers: 0,
    pendingVerifications: 0,
    pendingRequests: 0,
    totalHomeowners: 0,
    supportTickets: 0,
    requestPerDay: [],
  });
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const loadDashboardStats = async (silent = false) => {
    if (!silent) setIsDashboardLoading(true);
    try {
      const result = await adminAPI.getDashboardStats();
      if (!result?.success) return;

      setDashboardStats({
        totalWorkers: Number(result.totalWorkers ?? 0),
        pendingVerifications: Number(result.pendingVerifications ?? 0),
        pendingRequests: Number(result.pendingRequests ?? 0),
        totalHomeowners: Number(result.totalHomeowners ?? 0),
        supportTickets: Number(result.supportTickets ?? 0),
        requestPerDay: Array.isArray(result.requestPerDay) ? result.requestPerDay : [],
      });
    } catch (error) {
      console.error('Failed to load admin dashboard stats:', error);
    } finally {
      if (!silent) setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
    const handleSync = () => {
      invalidateAdminRequestCache();
      loadDashboardStats(true);
    };

    window.addEventListener('trabahome:booking-created', handleSync);
    window.addEventListener('trabahome:booking-updated', handleSync);
    window.addEventListener('trabahome:service-request-changed', handleSync);
    window.addEventListener('trabahome:support-ticket-changed', handleSync);
    window.addEventListener('trabahome:user-registered', handleSync);
    window.addEventListener('trabahome:homeowner-changed', handleSync);
    window.addEventListener('trabahome:worker-changed', handleSync);
    window.addEventListener('trabahome:dashboard-refresh', handleSync);

    const intervalId = setInterval(() => {
      invalidateAdminRequestCache();
      loadDashboardStats(true);
    }, 10000);

    return () => {
      window.removeEventListener('trabahome:booking-created', handleSync);
      window.removeEventListener('trabahome:booking-updated', handleSync);
      window.removeEventListener('trabahome:service-request-changed', handleSync);
      window.removeEventListener('trabahome:support-ticket-changed', handleSync);
      window.removeEventListener('trabahome:user-registered', handleSync);
      window.removeEventListener('trabahome:homeowner-changed', handleSync);
      window.removeEventListener('trabahome:worker-changed', handleSync);
      window.removeEventListener('trabahome:dashboard-refresh', handleSync);
      clearInterval(intervalId);
    };
  }, []);

  useServiceRequestSync(getAdminAuthToken(), () => {
    invalidateAdminRequestCache();
    loadDashboardStats(true);
  });

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notificationGroups = useMemo(
    () => [
      {
        id: 'critical',
        label: 'Critical',
        badge: 'Immediate',
        dotClass: 'bg-red-500',
        badgeClass: 'text-red-600',
        items: [
          {
            id: 'critical-verify',
            icon: ClipboardList,
            title: 'Worker verification pending',
            meta: 'Worker ID #104',
            time: '5 mins ago',
            severity: 'Critical',
            route: '/admin-workers',
            unread: true,
          },
          {
            id: 'critical-report',
            icon: AlertTriangle,
            title: 'User report filed',
            meta: 'Homeowner #882',
            time: '25 mins ago',
            severity: 'Critical',
            route: '/admin-homeowners',
            unread: true,
          },
          {
            id: 'critical-dispute',
            icon: MessageSquare,
            title: 'Job dispute reported',
            meta: 'Job #3342',
            time: '1 hour ago',
            severity: 'Critical',
            route: '/admin-requests',
            unread: true,
          },
          {
            id: 'critical-email',
            icon: Mail,
            title: 'Email notification delivery logs',
            meta: 'SMTP Gateway status',
            time: '2 hours ago',
            severity: 'Info',
            route: '/admin-emaillogs',
            unread: true,
          },
        ],
      },
      {
        id: 'operational',
        label: 'Operational',
        badge: 'Daily',
        dotClass: 'bg-amber-500',
        badgeClass: 'text-amber-700',
        items: [
          {
            id: 'ops-signups',
            icon: Users,
            title: '12 new users registered today',
            meta: 'Today · Summary',
            time: 'Today',
            severity: 'Operational',
            route: '/admin-homeowners',
            unread: false,
          },
          {
            id: 'ops-completed',
            icon: CheckCircle2,
            title: '8 jobs marked completed',
            meta: 'Last 24 hours',
            time: 'Today',
            severity: 'Operational',
            route: '/admin-requests',
            unread: false,
          },
          {
            id: 'ops-payments',
            icon: CheckCircle2,
            title: 'Payments batch processed',
            meta: 'Batch #85',
            time: '3 hours ago',
            severity: 'Operational',
            route: '/admin-requests',
            unread: false,
          },
        ],
      },
      {
        id: 'info',
        label: 'Info',
        badge: 'Informational',
        dotClass: 'bg-blue-500',
        badgeClass: 'text-blue-600',
        items: [
          {
            id: 'info-summary',
            icon: Info,
            title: 'Weekly summary ready',
            meta: 'Open dashboard report',
            time: 'Yesterday',
            severity: 'Info',
            route: '/admin-dashboard',
            unread: false,
          },
          {
            id: 'info-maintenance',
            icon: Info,
            title: 'Maintenance notice',
            meta: 'Feb 26 · 1:00 AM',
            time: 'Tomorrow',
            severity: 'Info',
            route: '/admin-dashboard',
            unread: false,
          },
        ],
      },
    ],
    []
  );

  const hasUnreadNotifications = useMemo(
    () => notificationGroups.some((group) => group.items.some((item) => item.unread)),
    [notificationGroups]
  );

  const handleNotificationClick = (route) => {
    setIsNotificationsOpen(false);
    navigate(route);
  };

  const severityStyles = {
    Critical: 'bg-red-100 text-red-600',
    Operational: 'bg-amber-100 text-amber-700',
    Info: 'bg-blue-100 text-blue-600',
  };

  const iconWrapStyles = {
    Critical: 'bg-red-50 text-red-500',
    Operational: 'bg-amber-50 text-amber-600',
    Info: 'bg-blue-50 text-blue-500',
  };

  const stats = [
    {
      label: "Total Workers",
      value: (Number(dashboardStats.totalWorkers) || 0).toLocaleString(),
      icon: <Users className="text-blue-500" size={20} />,
    },
    {
      label: "Total Homeowners",
      value: (Number(dashboardStats.totalHomeowners) || 0).toLocaleString(),
      icon: <Home className="text-amber-500" size={20} />,
    },
    {
      label: "Pending Requests",
      value: (Number(dashboardStats.pendingRequests) || 0).toLocaleString(),
      icon: <ClipboardList className="text-green-600" size={20} />,
    },
    {
      label: "Pending Verifications",
      value: (Number(dashboardStats.pendingVerifications) || 0).toLocaleString(),
      icon: <ClipboardList className="text-blue-900" size={20} />,
    },
    {
      label: "Support Tickets",
      value: (Number(dashboardStats.supportTickets) || 0).toLocaleString(),
      icon: <MessageSquare className="text-red-500" size={20} />,
    },
  ];

  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const requestPerDay = dashboardStats.requestPerDay.length > 0 ? dashboardStats.requestPerDay : buildFallbackRequestPerDay();
  const maxRequestCount = Math.max(1, ...requestPerDay.map((item) => Number(item.count || 0)));
  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin-login', { replace: true });
  };
  const totalRequestsLast7Days = requestPerDay.reduce((sum, item) => sum + Number(item.count || 0), 0);

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden">
      {/* Top Bar */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/Logo.png" 
            alt="TrabaHome" 
            className="h-12 w-auto" 
          />
        </div>
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Animated Sidebar */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-64 h-full bg-white border-r border-gray-100 p-6 flex flex-col justify-between shadow-sm z-10"
        >
          <aside className="h-full flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="mb-6">
                <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Dashboard</span>
              </div>
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

            <div className="pt-4 border-t border-gray-50">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
                <div className="w-10 h-10 bg-white shadow-inner rounded-full flex items-center justify-center">
                  <User className="text-slate-400" size={20} />
                </div>
                <span className="font-bold text-slate-800 text-sm">Admin</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 px-4 border border-gray-200 rounded-full text-slate-500 text-xs font-semibold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </aside>
        </motion.div>

        {/* Main Content Area */}
        <motion.main 
          variants={containerVars}
          initial="hidden"
          animate="visible"
          className="flex-1 overflow-y-auto p-10 pl-6"
        >
          <motion.h1 variants={itemVars} className="text-3xl font-black text-slate-800 mb-2">
            Welcome, Admin
          </motion.h1>
          
          <motion.h2 variants={itemVars} className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-8 mt-6">
            Platform's Activity Summary
          </motion.h2>
          
          <motion.div variants={containerVars} className="grid grid-cols-5 gap-4 mb-12">
            {stats.map((stat, idx) => (
              <motion.div 
                key={idx} 
                variants={itemVars}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col items-center text-center"
              >
                <div className="mb-4">{stat.icon}</div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-800">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* UPGRADED BAR CHART SECTION */}
          <motion.div variants={itemVars} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-50">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Request Per Day</h3>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  Total requests in the last 7 days: <span className="text-slate-800">{totalRequestsLast7Days}</span>
                </p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Last 7 Days</span>
            </div>
            
            <div className="h-64 flex items-end justify-between px-6 relative border-b border-gray-100 border-dashed">
                {requestPerDay.map((day, i) => {
                  const value = Number(day.count || 0);
                  const height = value > 0 ? Math.max(4, (value / maxRequestCount) * 180) : 0;
                  return (
                  <div key={day.key || i} className="flex flex-col items-center w-full group relative">
                    <span className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded mb-2 z-10 pointer-events-none">
                      {value} Requests
                    </span>

                    <motion.div 
                     initial={{ height: 0 }}
                     animate={{ height: `${height}px` }}
                     transition={{ 
                        delay: 0.2 + (i * 0.1), 
                        duration: 1, 
                        ease: [0.4, 0, 0.2, 1] // Professional cubic-bezier easing
                     }}
                     whileHover={{ scaleX: 1.1 }}
                     // Added Gradient and shadow for professional look
                     className="relative w-12 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg shadow-md group-hover:from-blue-700 group-hover:to-blue-500 transition-all cursor-pointer"
                    >
                      {/* Glossy overlay effect */}
                      <div className="absolute inset-0 bg-white/10 w-1/2 rounded-t-lg"></div>
                    </motion.div>
                    
                    <span className="text-[10px] text-slate-400 mt-4 font-bold uppercase transition-colors group-hover:text-slate-800">
                      {day.label}
                    </span>
                  </div>
                );})}
            </div>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
};

export default AdminDashboard;
