import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminAPI, invalidateAdminRequestCache } from '../services/AdminApi.ts';
import { useServiceRequestSync } from '../services/useServiceRequestSync.ts';
import { getAdminAuthToken, clearAdminSession } from '../utils/adminAuth.ts';
import {
  Activity,
  BarChart3,
  ClipboardList,
  Home,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wrench,
  FileText,
  X,
  CheckCircle2,
} from 'lucide-react';
import AdminNotificationBell from '../components/adminNotifications/AdminNotificationBell.tsx';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];
const ROLE_OPTIONS = ['All', 'Homeowner', 'Worker'];
const CATEGORY_OPTIONS = ['All', 'Booking', 'Payment', 'Account', 'Other'];
const SORT_OPTIONS = ['Newest first', 'Oldest first'];

const STATUS_STYLES = {
  Open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-100',
  Resolved: 'bg-blue-50 text-blue-700 border-blue-100',
  Closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const INITIAL_TICKETS = [];

const AdminHelpRequests = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Support Request');
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest first');
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState(null);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const openedTicketIdRef = React.useRef('');

  const handleNavigation = (label, route) => {
    if (!route) return;
    setActiveTab(label);
    navigate(route);
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin-login', { replace: true });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicketId('');
    setSelectedTicketDetail(null);
    setReplyText('');
    setConversationError('');
  };

  const fetchSupportTickets = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const result = await adminAPI.listSupportTickets();
      if (result?.success && Array.isArray(result.items)) {
        setTickets(result.items);

        // If a ticket is currently open in modal, silently refresh its conversation details
        if (selectedTicketId && result.items.some((ticket) => ticket.id === selectedTicketId)) {
          adminAPI.getSupportTicket(selectedTicketId).then((res) => {
            if (res?.success && res.ticket) {
              setSelectedTicketDetail(res.ticket);
            }
          }).catch(() => {});
        } else if (selectedTicketId && !result.items.some((ticket) => ticket.id === selectedTicketId)) {
          setSelectedTicketId('');
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      console.error('Unable to load support tickets', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useServiceRequestSync(getAdminAuthToken(), () => {
    invalidateAdminRequestCache();
    fetchSupportTickets(true);
  });

  useEffect(() => {
    fetchSupportTickets();
    const handleSync = () => {
      invalidateAdminRequestCache();
      fetchSupportTickets(true);
    };
    window.addEventListener('trabahome:support-ticket-changed', handleSync);
    window.addEventListener('trabahome:dashboard-refresh', handleSync);

    const intervalId = setInterval(() => {
      invalidateAdminRequestCache();
      fetchSupportTickets(true);
    }, 10000);

    return () => {
      window.removeEventListener('trabahome:support-ticket-changed', handleSync);
      window.removeEventListener('trabahome:dashboard-refresh', handleSync);
      clearInterval(intervalId);
    };
  }, [selectedTicketId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticketId = String(params.get('ticketId') || params.get('openTicketId') || '').trim();
    if (!ticketId || !tickets.length) return;
    if (openedTicketIdRef.current === ticketId) return;
    const match = tickets.find((ticket) =>
      String(ticket.id || '') === ticketId || String(ticket.ticketNumber || '') === ticketId
    );
    if (!match) return;

    openedTicketIdRef.current = ticketId;
    setSelectedTicketId(match.id);
    setIsModalOpen(true);
  }, [location.search, tickets]);

  useEffect(() => {
    let active = true;
    if (!selectedTicketId) {
      setSelectedTicketDetail(null);
      return () => { active = false; };
    }

    setSelectedTicketDetail(null);
    setReplyText('');
    setConversationError('');
    setIsConversationLoading(true);
    adminAPI.getSupportTicket(selectedTicketId)
      .then((result) => {
        if (active && result?.success) setSelectedTicketDetail(result.ticket);
      })
      .catch((error) => {
        console.error('Unable to load support conversation', error);
        if (active) setConversationError('Unable to load this conversation.');
      })
      .finally(() => {
        if (active) setIsConversationLoading(false);
      });

    return () => { active = false; };
  }, [location.key, selectedTicketId]);


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

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = [...tickets];
    if (term) {
      filtered = filtered.filter((ticket) =>
        (ticket.id && ticket.id.toLowerCase().includes(term)) ||
        (ticket.ticketNumber && ticket.ticketNumber.toLowerCase().includes(term)) ||
        (ticket.name && ticket.name.toLowerCase().includes(term)) ||
        (ticket.email && ticket.email.toLowerCase().includes(term)) ||
        (ticket.issueCategory && ticket.issueCategory.toLowerCase().includes(term))
      );
    }
    if (statusFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }
    if (roleFilter !== 'All') {
      filtered = filtered.filter((ticket) => ticket.role === roleFilter);
    }
    if (categoryFilter !== 'All') {
      const filterLower = categoryFilter.toLowerCase();
      filtered = filtered.filter((ticket) => {
        const cat = String(ticket.category || ticket.issueCategory || '').toLowerCase();
        if (filterLower === 'other') {
          return !cat.includes('booking') && !cat.includes('payment') && !cat.includes('account');
        }
        return cat.includes(filterLower);
      });
    }
    filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return sortOrder === 'Newest first' ? bDate - aDate : aDate - bDate;
    });
    return filtered;
  }, [tickets, searchTerm, statusFilter, roleFilter, categoryFilter, sortOrder]);

  const selectedTicketSummary = tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const selectedTicket = selectedTicketDetail || selectedTicketSummary;

  const updateTicket = (ticketId, updates) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updates, updatedAt: new Date().toISOString() }
          : ticket
      )
    );
    setSelectedTicketDetail((current) =>
      current?.id === ticketId ? { ...current, ...updates, updatedAt: new Date().toISOString() } : current
    );
  };

  const handleStatusChange = async (ticketId, status) => {
    try {
      const result = await adminAPI.updateSupportTicketStatus(ticketId, status);
      if (result?.success) {
        updateTicket(ticketId, { status });
      }
    } catch (error) {
      console.error('Unable to update ticket status', error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicketDetail || !replyText.trim() || isReplying) return;
    setIsReplying(true);
    setConversationError('');
    try {
      const result = await adminAPI.replyToSupportTicket(selectedTicketDetail.id, replyText.trim());
      if (result?.success) {
        setSelectedTicketDetail(result.ticket);
        updateTicket(result.ticket.id, { status: result.ticket.status });
        setReplyText('');
      }
    } catch (error) {
      console.error('Unable to send support reply', error);
      setConversationError('Unable to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedTicket) return;
    await handleStatusChange(selectedTicket.id, 'Resolved');
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F5F2] overflow-hidden font-sans relative">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-12 z-20 shadow-sm shrink-0">
        <img src="/assets/Logo.png" alt="TrabaHome" className="h-12 w-auto" />
        <AdminNotificationBell />
      </header>

      <div className="flex flex-1 overflow-hidden">
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
                  <User className="text-gray-400" size={20} />
                </div>
                <span className="font-bold text-gray-700 text-sm">Admin</span>
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

        <main className="flex-1 overflow-y-auto p-10 pl-6">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Support Requests</h1>
            <p className="text-gray-500 text-sm font-medium">Manage and respond to user concerns.</p>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 flex-1 min-w-[240px]">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search ticket ID, email, or name"
                  className="bg-transparent w-full text-sm outline-none text-gray-600"
                />
              </div>

              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={['All', ...STATUS_OPTIONS]}
              />
              <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
              <FilterSelect
                label="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={CATEGORY_OPTIONS}
              />
              <FilterSelect label="Sort by" value={sortOrder} onChange={setSortOrder} options={SORT_OPTIONS} />
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Ticket ID</th>
                  <th className="px-8 py-6">User Name</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Category</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Date Created</th>
                  <th className="px-8 py-6">Last Updated</th>
                  <th className="px-8 py-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-8 py-16 text-center text-gray-400 font-bold text-xs uppercase">
                      Loading support requests...
                    </td>
                  </tr>
                )}
                {!isLoading && filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50/50">
                    <td className="px-8 py-5 text-[11px] font-black text-gray-800">{ticket.ticketNumber || ticket.id}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-gray-600">{ticket.name}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-gray-600">{ticket.role}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-gray-600">{ticket.category}</td>
                    <td className="px-8 py-5">
                      <span
                        className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${STATUS_STYLES[ticket.status]}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-[11px] font-bold text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-[11px] font-bold text-gray-500">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicketId(ticket.id);
                          setIsModalOpen(true);
                        }}
                        className="border-2 border-blue-400 text-blue-500 px-4 py-1.5 rounded-full text-[10px] font-black hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-8 py-16 text-center text-gray-400 font-bold text-xs uppercase">
                      No support requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Support Ticket Modal Pop-up */}
          {isModalOpen && selectedTicket && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={handleCloseModal}
              />
              <div className="relative w-full max-w-4xl bg-white rounded-[28px] shadow-2xl border border-gray-100 z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Mail size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-gray-900">
                          {selectedTicket.ticketNumber || selectedTicket.id}
                        </h2>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[selectedTicket.status]}`}>
                          {selectedTicket.status}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {selectedTicket.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        From <span className="font-semibold text-gray-700">{selectedTicket.name}</span> ({selectedTicket.role}) &bull; {selectedTicket.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-gray-500 hidden sm:inline">Status:</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(event) => handleStatusChange(selectedTicket.id, event.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="h-9 w-9 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Close modal"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Ticket Metadata Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">User Name</span>
                      <span className="font-bold text-gray-800">{selectedTicket.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Email</span>
                      <span className="font-bold text-gray-800 truncate block">{selectedTicket.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Category</span>
                      <span className="font-bold text-gray-800">{selectedTicket.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">Created</span>
                      <span className="font-bold text-gray-800">{new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Conversation Thread */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Conversation History</p>
                    {isConversationLoading ? (
                      <div className="py-16 text-center text-xs text-gray-400 font-bold uppercase">
                        Loading conversation...
                      </div>
                    ) : selectedTicketDetail ? (
                      <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                        {(selectedTicketDetail.messages || []).map((entry) => {
                          const isAdmin = entry.senderRole === 'Admin';
                          return (
                            <article
                              key={entry.id || `${entry.senderRole}-${entry.createdAt}`}
                              className={`rounded-2xl border p-4 transition-all ${
                                isAdmin
                                  ? 'ml-8 bg-blue-50/70 border-blue-100 text-blue-900'
                                  : 'mr-8 bg-gray-50 border-gray-100 text-gray-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isAdmin ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {entry.senderRole}
                                </span>
                                <time className="text-[10px] text-gray-400 font-medium">
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                                </time>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed mt-2">{entry.message}</p>
                            </article>
                          );
                        })}
                      </div>
                    ) : conversationError ? (
                      <div className="py-8 text-center text-xs text-red-500 font-bold">
                        {conversationError}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-gray-400">
                        No messages found.
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer / Reply Box */}
                {selectedTicket?.status === 'Resolved' || selectedTicket?.status === 'Closed' ? (
                  <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-emerald-700">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">This support ticket is marked as resolved and closed.</p>
                        <p className="text-[11px] text-gray-500">The conversation is locked. No further messages can be sent.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedTicket.id, 'In Progress')}
                      className="px-3.5 py-1.5 rounded-full border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Reopen Ticket
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendReply();
                    }}
                    className="p-5 border-t border-gray-100 bg-white space-y-3"
                  >
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(event) => {
                          const words = event.target.value.trim().split(/\s+/).filter(Boolean);
                          setReplyText(words.length <= 250 ? event.target.value : words.slice(0, 250).join(' '));
                        }}
                        placeholder="Type an admin reply to the user..."
                        className="w-full rounded-2xl border border-gray-200 p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 font-medium">
                          {replyText.trim().split(/\s+/).filter(Boolean).length}/250 words
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleMarkResolved}
                            className="px-4 py-2 rounded-full border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition-colors cursor-pointer"
                          >
                            Mark as Resolved
                          </button>
                          <button
                            type="submit"
                            disabled={!selectedTicketDetail || !replyText.trim() || isReplying}
                            className="px-6 py-2 rounded-full bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#0B3B68]/10 cursor-pointer"
                          >
                            {isReplying ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </div>
                      {conversationError && <p className="text-xs font-semibold text-red-500">{conversationError}</p>}
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

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

const FilterSelect = ({ label, value, onChange, options }) => (
  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-3 py-2">
    <span className="text-[10px] font-bold uppercase text-gray-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="bg-transparent text-[11px] font-bold text-gray-600 outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

export default AdminHelpRequests;
