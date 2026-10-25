import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  X,
  ChevronLeft,
  Loader2,
  User,
  ExternalLink,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Calendar,
} from 'lucide-react';
import Navbar from '../components/requestpages/Navbar.jsx';
import Header from '../components/workersjobs/Header.tsx';
import Sidebar from '../components/workersjobs/SideBar.tsx';
import EReceiptModal from '../components/requestpages/EReceiptModal.tsx';
import { homeownerAPI } from '../services/HomeownerApi.ts';
import { workerAPI } from '../services/WorkerApi.ts';
import { getHomeownerSession, clearHomeownerSession } from '../utils/homeownerAuth.ts';
import { getWorkerSession, clearWorkerSession } from '../utils/workerAuth.ts';

export interface BookingMessagesPageProps {
  role: 'homeowner' | 'worker';
}

interface ChatAttachment {
  url: string;
  name?: string;
  fileType?: string;
}

interface ChatMessage {
  _id?: string;
  senderId: string;
  senderRole: 'homeowner' | 'worker' | 'admin';
  senderName: string;
  message: string;
  attachments?: ChatAttachment[];
  createdAt: string | Date;
}

interface ConversationItem {
  id: string;
  requestNumber: string;
  serviceType: string;
  status: string;
  otherPartyName: string;
  otherPartyRole: 'homeowner' | 'worker';
  otherPartyAvatar?: string;
  otherPartyPhone?: string;
  scheduledDate?: string;
  location?: string;
  lastMessageText: string;
  lastMessageTime: string | null;
  lastMessageSenderRole?: string;
  hasUnread: boolean;
  messages: any[];
  rawItem: any;
}

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatBubbleTime = (dateValue: string | Date): string => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function BookingMessagesPage({ role }: BookingMessagesPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') || searchParams.get('id') || '';

  const homeownerSession = getHomeownerSession();
  const workerSession = getWorkerSession();
  const session = role === 'worker' ? workerSession : homeownerSession;
  const token = session?.token;

  // Conversations & selected conversation state
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialBookingId);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [isMobileChatOpen, setIsMobileChatOpen] = useState<boolean>(Boolean(initialBookingId));

  // Chat message thread state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showEReceipt, setShowEReceipt] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load all conversations for this user
  const loadConversations = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setIsLoadingConversations(true);
      let items: any[] = [];
      if (role === 'worker') {
        const res = await workerAPI.listServiceRequests();
        items = Array.isArray(res?.items) ? res.items : [];
      } else {
        const res = await homeownerAPI.listServiceRequests();
        items = Array.isArray(res?.items) ? res.items : [];
      }

      const activeStatuses = ['ACCEPTED', 'ONGOING', 'IN_PROGRESS', 'COMPLETED', 'PENDING'];
      const filtered = items.filter((item) => {
        const st = String(item.status || '').trim().toUpperCase();
        const hasMessages = Array.isArray(item.messages) && item.messages.length > 0;
        return activeStatuses.includes(st) || hasMessages;
      });

      const parsed: ConversationItem[] = filtered.map((item) => {
        const id = String(item.id || item._id || item.requestNumber || '');
        const requestNumber = String(item.requestNumber || id);
        const serviceType = String(item.serviceType || 'Service');
        const status = String(item.status || 'Pending');
        const msgs = Array.isArray(item.messages) ? item.messages : [];
        const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

        let lastMessageText = 'No messages yet. Tap to start chatting.';
        let lastMessageTime: string | null = item.updatedAt || item.createdAt || null;
        let lastMessageSenderRole: string | undefined = undefined;

        if (lastMsg) {
          lastMessageSenderRole = lastMsg.senderRole;
          if (lastMsg.message && String(lastMsg.message).trim()) {
            lastMessageText = String(lastMsg.message).trim();
          } else if (lastMsg.attachments && lastMsg.attachments.length > 0) {
            lastMessageText = '📷 Sent an attachment';
          }
          lastMessageTime = lastMsg.createdAt || null;
        }

        const readKey = `trabahome_chat_read_${id}`;
        const lastReadTimestamp = Number(localStorage.getItem(readKey) || '0');
        const msgTime = lastMessageTime ? new Date(lastMessageTime).getTime() : 0;
        const hasUnread = Boolean(
          lastMsg &&
          lastMessageSenderRole !== role &&
          msgTime > lastReadTimestamp
        );

        if (role === 'worker') {
          return {
            id,
            requestNumber,
            serviceType,
            status,
            otherPartyName: item.homeownerName || item.homeowner?.name || 'Homeowner',
            otherPartyRole: 'homeowner',
            otherPartyAvatar: item.homeownerAvatar || item.homeowner?.avatar || '',
            otherPartyPhone: item.contactNumber || item.phone || '',
            scheduledDate: item.preferredDate || item.scheduledAt || '',
            location: item.location || [item.barangay, item.city, item.province].filter(Boolean).join(', '),
            lastMessageText,
            lastMessageTime,
            lastMessageSenderRole,
            hasUnread,
            messages: msgs,
            rawItem: item,
          };
        } else {
          return {
            id,
            requestNumber,
            serviceType,
            status,
            otherPartyName: item.workerName || item.worker?.name || 'Skilled Worker',
            otherPartyRole: 'worker',
            otherPartyAvatar: item.workerAvatar || item.worker?.avatar || '',
            otherPartyPhone: item.workerPhone || item.worker?.phone || '',
            scheduledDate: item.preferredDate || item.scheduledAt || '',
            location: item.location || [item.barangay, item.city, item.province].filter(Boolean).join(', '),
            lastMessageText,
            lastMessageTime,
            lastMessageSenderRole,
            hasUnread,
            messages: msgs,
            rawItem: item,
          };
        }
      });

      // Sort newest messages first
      parsed.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(parsed);

      // Auto-select first conversation if none selected yet or requested by URL
      setSelectedId((curr) => {
        if (curr && parsed.some((c) => c.id === curr || c.requestNumber === curr)) {
          return curr;
        }
        if (initialBookingId && parsed.some((c) => c.id === initialBookingId || c.requestNumber === initialBookingId)) {
          const match = parsed.find((c) => c.id === initialBookingId || c.requestNumber === initialBookingId);
          return match ? match.id : parsed[0]?.id || '';
        }
        return parsed[0]?.id || '';
      });
    } catch (err) {
      console.error('Failed to load conversations in BookingMessagesPage:', err);
    } finally {
      if (!silent) setIsLoadingConversations(false);
    }
  };

  // Initial fetch and real-time listeners
  useEffect(() => {
    if (!token) return;
    void loadConversations();

    const handleUpdate = () => void loadConversations(true);
    window.addEventListener('trabahome:service-request-changed', handleUpdate);
    window.addEventListener('trabahome:booking-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const pollInterval = setInterval(() => {
      void loadConversations(true);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('trabahome:service-request-changed', handleUpdate);
      window.removeEventListener('trabahome:booking-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [token, role]);

  // Find active selected conversation
  const selectedBooking = useMemo(() => {
    if (!selectedId) return null;
    return conversations.find(
      (c) => c.id === selectedId || c.requestNumber === selectedId
    ) || null;
  }, [conversations, selectedId]);

  // Load message thread for active selected conversation
  const loadActiveMessages = async (silent = false) => {
    if (!selectedBooking?.id) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      let result: { success?: boolean; messages?: any[] } | null = null;
      if (role === 'homeowner') {
        result = await homeownerAPI.getServiceRequestMessages(selectedBooking.id);
      } else {
        result = await workerAPI.getServiceRequestMessages(selectedBooking.id);
      }

      if (result && Array.isArray(result.messages)) {
        setMessages(result.messages);
      }
    } catch (err) {
      console.error('Failed to load active messages:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!selectedBooking?.id) {
      setMessages([]);
      return;
    }

    // Mark as read in local storage
    const readKey = `trabahome_chat_read_${selectedBooking.id}`;
    localStorage.setItem(readKey, String(Date.now()));
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedBooking.id ? { ...c, hasUnread: false } : c))
    );

    void loadActiveMessages(false);

    // Live message polling every 3 seconds for active chat
    const pollInterval = setInterval(() => {
      void loadActiveMessages(true);
    }, 3000);

    const handleSocketMessage = (event: Event) => {
      const custom = event as CustomEvent<{ requestId?: string; requestNumber?: string; message?: ChatMessage }>;
      const detail = custom.detail;
      if (!detail) return;
      const targetIds = [selectedBooking.id, selectedBooking.requestNumber].filter(Boolean).map(String);
      const incomingIds = [detail.requestId, detail.requestNumber].filter(Boolean).map(String);
      const isMatch = targetIds.some((id) => incomingIds.includes(id));
      if (isMatch) {
        if (detail.message) {
          setMessages((prev) => {
            const exists = prev.some(
              (m) => m._id && detail.message?._id && String(m._id) === String(detail.message?._id)
            );
            if (exists) return prev;
            return [...prev, detail.message!];
          });
        } else {
          void loadActiveMessages(true);
        }
      }
    };

    window.addEventListener('trabahome:service-request-message', handleSocketMessage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('trabahome:service-request-message', handleSocketMessage);
    };
  }, [selectedBooking?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      // Tab filter
      const st = c.status.toUpperCase();
      const isCompleted = st === 'COMPLETED';
      const isActive = st === 'ACCEPTED' || st === 'ONGOING' || st === 'IN_PROGRESS' || st === 'PENDING';
      if (filterTab === 'active' && !isActive) return false;
      if (filterTab === 'completed' && !isCompleted) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchId = c.requestNumber.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      const matchName = c.otherPartyName.toLowerCase().includes(q);
      const matchService = c.serviceType.toLowerCase().includes(q);
      return matchId || matchName || matchService;
    });
  }, [conversations, filterTab, searchQuery]);

  // Handle image upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      reader.onloadend = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl) return;
        setAttachments((prev) => [
          ...prev,
          {
            url: dataUrl,
            name: file.name,
            fileType: isImg ? 'image' : file.type || 'document',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBooking?.id || isCancelled || isCompleted) return;
    if ((!inputText.trim() && attachments.length === 0) || isSending) return;

    const textToSend = inputText.trim();
    const attachmentsToSend = [...attachments];

    setIsSending(true);
    setInputText('');
    setAttachments([]);

    try {
      let result: { success?: boolean; message?: ChatMessage } | null = null;
      if (role === 'homeowner') {
        result = await homeownerAPI.sendServiceRequestMessage(selectedBooking.id, {
          message: textToSend,
          attachments: attachmentsToSend,
        });
      } else {
        result = await workerAPI.sendServiceRequestMessage(selectedBooking.id, {
          message: textToSend,
          attachments: attachmentsToSend,
        });
      }

      if (result?.message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m._id && result?.message?._id && String(m._id) === String(result.message?._id)
          );
          if (exists) return prev;
          return [...prev, result.message!];
        });
      } else {
        await loadActiveMessages(true);
      }

      // Also refresh sidebar conversation preview
      void loadConversations(true);
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(textToSend);
      setAttachments(attachmentsToSend);
    } finally {
      setIsSending(false);
    }
  };

  const selectedRawStatus = String(selectedBooking?.rawItem?.status || selectedBooking?.status || '').toUpperCase();
  const isCancelled =
    selectedBooking?.status?.toUpperCase() === 'CANCELLED' ||
    selectedBooking?.status?.toUpperCase() === 'CANCELED' ||
    selectedBooking?.status?.toUpperCase() === 'DECLINED' ||
    selectedBooking?.status?.toUpperCase() === 'REJECTED';
  const isCompleted = selectedBooking?.status?.toUpperCase() === 'COMPLETED' || selectedRawStatus === 'COMPLETED';
  const isAccepted =
    Boolean(selectedBooking?.rawItem?.acceptedOn || selectedBooking?.rawItem?.acceptedAt) ||
    selectedRawStatus === 'ACCEPTED' ||
    selectedRawStatus === 'ONGOING' ||
    selectedRawStatus === 'IN_PROGRESS';
  const isPending = !isAccepted && !isCompleted && !isCancelled;

  return (
    <div className="h-screen w-screen overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-sans flex flex-col">
      {/* Role Navigation */}
      {role === 'homeowner' ? (
        <Navbar />
      ) : (
        <>
          <Header onLogoClick={() => navigate('/home-worker')} />
          <div className="h-[66px] shrink-0" aria-hidden="true" />
        </>
      )}

      {/* Main Facebook Messenger Interface Container: Full Screen Edge-to-Edge flush with navigation header */}
      <div className="flex-1 w-full flex overflow-hidden relative text-left">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: CONVERSATION LIST (MESSENGER SIDEBAR) */}
          {/* ========================================================================= */}
          <div
            className={`w-full md:w-96 md:min-w-[340px] md:max-w-[380px] border-r border-gray-100 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0 ${
              isMobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Sidebar Header */}
            <div className="p-4 pb-3 border-b border-gray-100 dark:border-slate-800 bg-[#F9F5F0]/60 dark:bg-slate-800/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#0B3B68] dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-[#0B3B68] dark:text-blue-400 tracking-tight">Messages</h1>
                    <p className="text-[11px] text-gray-400 dark:text-slate-400 font-medium">Booking Conversations</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0B3B68]/10 dark:bg-blue-950 text-[#0B3B68] dark:text-blue-300">
                  {conversations.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search booking ID, name, or service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100/90 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-xs text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 font-medium outline-none focus:ring-2 focus:ring-[#0B3B68]/20 focus:bg-white dark:focus:bg-slate-800 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 mt-3">
                {(['all', 'active', 'completed'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                      filterTab === tab
                        ? 'bg-[#0B3B68] dark:bg-blue-600 text-white shadow-2xs'
                        : 'bg-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
              {isLoadingConversations ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Loader2 className="w-7 h-7 animate-spin mb-2 text-[#0B3B68] dark:text-blue-400" />
                  <p className="text-xs font-semibold">Loading messages...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-slate-200">No conversations found</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-[220px]">
                    {searchQuery
                      ? 'No booking matches your search filter.'
                      : 'Conversations for active or completed bookings will appear here.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedBooking?.id === conv.id;
                  const itemRawStatus = String(conv.rawItem?.status || conv.status || '').toUpperCase();
                  const isItemAccepted =
                    Boolean(conv.rawItem?.acceptedOn || conv.rawItem?.acceptedAt) ||
                    itemRawStatus === 'ACCEPTED' ||
                    itemRawStatus === 'ONGOING' ||
                    itemRawStatus === 'IN_PROGRESS';
                  const isItemDone = conv.status.toUpperCase() === 'COMPLETED' || itemRawStatus === 'COMPLETED';

                  return (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedId(conv.id);
                        setIsMobileChatOpen(true);
                      }}
                      className={`w-full px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left border-l-4 ${
                        isSelected
                          ? 'bg-[#EBF5FF] dark:bg-blue-950/60 border-[#0B3B68] dark:border-blue-400'
                          : conv.hasUnread
                          ? 'bg-blue-50/30 dark:bg-blue-900/20 border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/30'
                          : 'bg-white dark:bg-slate-900 border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        {conv.otherPartyAvatar ? (
                          <img
                            src={conv.otherPartyAvatar}
                            alt={conv.otherPartyName}
                            className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#0B3B68]/10 dark:bg-blue-900/30 text-[#0B3B68] dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                            {conv.otherPartyName ? conv.otherPartyName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                          </div>
                        )}
                        {/* Active / Unread indicator badge */}
                        {conv.hasUnread ? (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 ring-2 ring-blue-200 dark:ring-blue-900" />
                        ) : isItemAccepted ? (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        ) : null}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* PRIMARY TITLE: BOOKING ID (Requested by user) */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs truncate font-black ${
                            isSelected ? 'text-[#0B3B68] dark:text-blue-400' : conv.hasUnread ? 'text-blue-900 dark:text-blue-200' : 'text-gray-900 dark:text-slate-100'
                          }`}>
                            Booking #{conv.requestNumber}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 font-medium">
                            {formatRelativeTime(conv.lastMessageTime)}
                          </span>
                        </div>

                        {/* Secondary line: Other party name & trade/service */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-slate-200 truncate max-w-[130px]">
                            {conv.otherPartyName}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-semibold text-[#0B3B68] dark:text-blue-300 bg-[#0B3B68]/5 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                            {conv.serviceType}
                          </span>
                          <span
                            className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                              isItemAccepted
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : isItemDone
                                ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {conv.status}
                          </span>
                        </div>

                        {/* Last Message Preview */}
                        <p className={`text-xs truncate ${
                          conv.hasUnread ? 'font-bold text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'
                        }`}>
                          {conv.lastMessageSenderRole === role ? 'You: ' : ''}
                          {conv.lastMessageText}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer Link */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-850/70 flex items-center justify-between text-xs">
              <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">Manage Bookings:</span>
              <button
                type="button"
                onClick={() => navigate(role === 'worker' ? '/worker-jobs' : '/homeowner-bookings')}
                className="font-bold text-[#0B3B68] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{role === 'worker' ? 'My Jobs' : 'My Bookings'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: FACEBOOK MESSENGER CHAT PANE */}
          {/* ========================================================================= */}
          <div
            className={`flex-1 flex flex-col bg-[#F9F9FA] dark:bg-slate-950 relative ${
              !isMobileChatOpen ? 'hidden md:flex' : 'flex'
            }`}
          >
            {selectedBooking ? (
              <>
                {/* Messenger Header Bar */}
                <div className="px-2.5 sm:px-6 py-2.5 sm:py-3.5 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shadow-2xs z-10 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileChatOpen(false)}
                      className="md:hidden p-1 -ml-0.5 text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full cursor-pointer shrink-0"
                      title="Back to conversation list"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {selectedBooking.otherPartyAvatar ? (
                        <img
                          src={selectedBooking.otherPartyAvatar}
                          alt={selectedBooking.otherPartyName}
                          className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover border border-gray-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#0B3B68]/10 dark:bg-blue-900/30 text-[#0B3B68] dark:text-blue-400 flex items-center justify-center font-bold text-xs sm:text-sm">
                          {selectedBooking.otherPartyName ? selectedBooking.otherPartyName.charAt(0).toUpperCase() : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </div>
                      )}
                      {isAccepted && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                      )}
                    </div>

                    {/* Header Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {/* Primary Booking ID Badge */}
                        <span className="text-[10px] sm:text-xs font-black text-[#0B3B68] dark:text-blue-300 bg-[#0B3B68]/10 dark:bg-blue-950/60 px-1.5 sm:px-2 py-0.5 rounded-md border border-[#0B3B68]/15 dark:border-blue-800/40">
                          Booking #{selectedBooking.requestNumber}
                        </span>
                        <h2 className="text-xs sm:text-base font-bold text-gray-900 dark:text-slate-100 truncate">
                          {selectedBooking.otherPartyName}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        <span className="font-semibold text-gray-700 dark:text-slate-300">{selectedBooking.serviceType}</span>
                        <span>•</span>
                        <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isCancelled
                            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : isAccepted
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : isCompleted
                            ? 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {selectedBooking.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* E-Receipt button for completed bookings */}
                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => setShowEReceipt(true)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        title="View Official E-Receipt"
                      >
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">E-Receipt</span>
                      </button>
                    )}

                    {/* View Booking Details Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const targetPath = role === 'worker' ? '/worker-jobs' : '/homeowner-bookings';
                        navigate(targetPath, {
                          state: role === 'worker' ? { openJobId: selectedBooking.id } : { openRequestId: selectedBooking.id },
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Open full booking in bookings manager"
                    >
                      <span>Booking Info</span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Messenger Message Thread Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {/* System Header Card (Messenger Information Pill) */}
                  <div className="max-w-md mx-auto my-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 shadow-xs text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0B3B68] dark:text-blue-400 mb-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                      Service Booking #{selectedBooking.requestNumber}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                      Connected with <span className="font-semibold text-gray-800 dark:text-slate-200">{selectedBooking.otherPartyName}</span> for <span className="font-semibold text-[#0B3B68] dark:text-blue-400">{selectedBooking.serviceType}</span>
                    </p>
                    {selectedBooking.location && (
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">📍 {selectedBooking.location}</p>
                    )}
                  </div>

                  {isLoadingMessages ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#0B3B68] dark:text-blue-400" />
                      <p className="text-xs">Loading conversation history...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 dark:text-slate-500">
                      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 mb-3">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-bold text-gray-700 dark:text-slate-300">No messages yet</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm">
                        Say hello to {selectedBooking.otherPartyName} and discuss arrival details, equipment, or questions about the booking.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.senderRole === role;
                      const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;

                      return (
                        <div
                          key={msg._id || index}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Other party avatar */}
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 shrink-0 mb-1">
                              {selectedBooking.otherPartyAvatar ? (
                                <img
                                  src={selectedBooking.otherPartyAvatar}
                                  alt={msg.senderName || selectedBooking.otherPartyName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700">
                                  {selectedBooking.otherPartyName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed break-words shadow-2xs ${
                                isMe
                                  ? 'bg-[#0B3B68] dark:bg-blue-600 text-white rounded-br-xs'
                                  : 'bg-[#E4E6EB] dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-bl-xs'
                              }`}
                            >
                              {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                              {/* Attachment thumbnails */}
                              {hasAttachments && (
                                <div className={`mt-2 grid gap-1.5 ${msg.attachments!.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {msg.attachments!.map((att, attIdx) => (
                                    <div
                                      key={attIdx}
                                      onClick={() => setExpandedImage(att.url)}
                                      className="relative rounded-xl overflow-hidden cursor-pointer group max-h-48 border border-black/10 dark:border-white/10"
                                    >
                                      <img
                                        src={att.url}
                                        alt={att.name || 'Attachment'}
                                        className="w-full h-full object-cover transition group-hover:scale-105"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 px-1">
                              {formatBubbleTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Previews Bar (Before Sending) */}
                {attachments.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shrink-0">
                        <img src={att.url} alt="upload preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full text-white flex items-center justify-center hover:bg-black"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Messenger Input Composer Bar */}
                <div className="p-2 sm:p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 shrink-0">
                  {isCancelled ? (
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-center text-xs text-red-700 dark:text-red-300 font-semibold flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>This booking has been cancelled. The conversation is closed and messaging is disabled.</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="p-2.5 sm:p-3 rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-center text-xs text-gray-500 dark:text-slate-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>This booking is completed and the conversation is archived.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-3">
                      {/* Photo Attachment Button */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 sm:p-2.5 text-gray-500 dark:text-slate-400 hover:text-[#0B3B68] dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
                        title="Attach Photo"
                      >
                        <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>

                      {/* Messenger Input Pill */}
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSendMessage();
                            }
                          }}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100/90 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-xs sm:text-sm text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 font-medium outline-none focus:ring-2 focus:ring-[#0B3B68]/20 focus:bg-white dark:focus:bg-slate-800 transition"
                        />
                      </div>

                      {/* Send Button */}
                      <button
                        type="submit"
                        disabled={(!inputText.trim() && attachments.length === 0) || isSending}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0B3B68] hover:bg-[#082d50] dark:bg-blue-600 dark:hover:bg-blue-500 text-white flex items-center justify-center transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                        title="Send Message"
                      >
                        {isSending ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              /* No Conversation Selected State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/60 dark:bg-slate-950">
                <div className="w-16 h-16 rounded-full bg-[#0B3B68]/10 dark:bg-blue-900/30 text-[#0B3B68] dark:text-blue-400 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-slate-200 mb-1">No conversation selected</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 max-w-sm">
                  Select a booking conversation from the left sidebar to view message history and discuss service details.
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Full Size Image Lightbox Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[120] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={expandedImage} alt="Enlarged preview" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* E-Receipt Modal */}
      {showEReceipt && selectedBooking && (
        <EReceiptModal
          isOpen={showEReceipt}
          onClose={() => setShowEReceipt(false)}
          booking={{
            requestNumber: selectedBooking.requestNumber,
            id: selectedBooking.id,
            workerName: selectedBooking.otherPartyRole === 'worker' ? selectedBooking.otherPartyName : 'Skilled Worker',
            homeownerName: selectedBooking.otherPartyRole === 'homeowner' ? selectedBooking.otherPartyName : 'Homeowner',
            serviceType: selectedBooking.serviceType,
            completedAt: selectedBooking.scheduledDate,
            location: selectedBooking.location,
            completionDetails: selectedBooking.rawItem?.completionDetails || null,
          }}
        />
      )}
    </div>
  );
}