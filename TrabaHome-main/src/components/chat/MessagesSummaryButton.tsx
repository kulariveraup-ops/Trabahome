import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, ChevronRight, Loader2, User } from 'lucide-react';
import { homeownerAPI } from '../../services/HomeownerApi.ts';
import { workerAPI } from '../../services/WorkerApi.ts';
import { getHomeownerSession } from '../../utils/homeownerAuth.ts';
import { getWorkerSession } from '../../utils/workerAuth.ts';
import BookingChatModal from './BookingChatModal.tsx';

export interface MessagesSummaryButtonProps {
  role: 'homeowner' | 'worker';
  onOpen?: () => void;
}

interface ConversationItem {
  id: string;
  requestNumber: string;
  serviceType: string;
  status: string;
  rawStatus?: string;
  isAccepted?: boolean;
  acceptedOn?: unknown;
  otherPartyName: string;
  otherPartyRole: 'homeowner' | 'worker';
  otherPartyAvatar?: string;
  lastMessageText: string;
  lastMessageTime: string | null;
  lastMessageSenderRole?: string;
  hasUnread: boolean;
  messages: any[];
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

export const MessagesSummaryButton: React.FC<MessagesSummaryButtonProps> = ({ role, onOpen }) => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatBooking, setActiveChatBooking] = useState<ConversationItem | null>(null);
  const [, setLastReadTick] = useState(0);

  const session = role === 'worker' ? getWorkerSession() : getHomeownerSession();
  const token = session?.token;

  const loadConversations = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setIsLoading(true);
      let items: any[] = [];
      if (role === 'worker') {
        const res = await workerAPI.listServiceRequests();
        items = Array.isArray(res?.items) ? res.items : [];
      } else {
        const res = await homeownerAPI.listServiceRequests();
        items = Array.isArray(res?.items) ? res.items : [];
      }

      const activeStatuses = ['ACCEPTED', 'ONGOING', 'IN_PROGRESS', 'COMPLETED'];
      const filtered = items.filter((item) => {
        const st = String(item.status || '').trim().toUpperCase();
        const isAccepted = Boolean(
          item.acceptedOn ||
          item.acceptedAt ||
          activeStatuses.includes(st)
        );
        const hasMessages = Array.isArray(item.messages) && item.messages.length > 0;
        return isAccepted || hasMessages;
      });

      const parsed: ConversationItem[] = filtered.map((item) => {
        const id = String(item.id || item._id || item.requestNumber || '');
        const requestNumber = String(item.requestNumber || id);
        const serviceType = String(item.serviceType || 'Service');
        const status = String(item.status || 'Ongoing');
        const isAccepted = Boolean(
          item.acceptedOn ||
          item.acceptedAt ||
          activeStatuses.includes(String(item.status || '').trim().toUpperCase())
        );
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
            rawStatus: item.status,
            isAccepted,
            acceptedOn: item.acceptedOn || item.acceptedAt,
            otherPartyName: item.homeownerName || item.homeowner?.name || 'Homeowner',
            otherPartyRole: 'homeowner',
            otherPartyAvatar: item.homeownerAvatar || item.homeowner?.avatar || '',
            lastMessageText,
            lastMessageTime,
            lastMessageSenderRole,
            hasUnread,
            messages: msgs,
          };
        } else {
          return {
            id,
            requestNumber,
            serviceType,
            status,
            rawStatus: item.status,
            isAccepted,
            acceptedOn: item.acceptedOn || item.acceptedAt,
            otherPartyName: item.workerName || item.worker?.name || 'Skilled Worker',
            otherPartyRole: 'worker',
            otherPartyAvatar: item.workerAvatar || item.worker?.avatar || '',
            lastMessageText,
            lastMessageTime,
            lastMessageSenderRole,
            hasUnread,
            messages: msgs,
          };
        }
      });

      // Sort with newest messages first
      parsed.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(parsed);
    } catch (err) {
      console.error('Failed to load message summary conversations:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void loadConversations();

    const handleUpdate = () => void loadConversations(true);
    window.addEventListener('trabahome:service-request-changed', handleUpdate);
    window.addEventListener('trabahome:booking-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('trabahome:service-request-changed', handleUpdate);
      window.removeEventListener('trabahome:booking-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [token, role]);

  // Handle outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return conversations.filter((c) => c.hasUnread).length;
  }, [conversations]);

  const handleOpenConversation = (conv: ConversationItem) => {
    // Mark as read in local storage
    const readKey = `trabahome_chat_read_${conv.id}`;
    localStorage.setItem(readKey, String(Date.now()));
    setLastReadTick((t) => t + 1);

    // Update conversation local read flag
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, hasUnread: false } : c))
    );

    setIsOpen(false);
    navigate(
      role === 'worker'
        ? `/worker-messages?bookingId=${encodeURIComponent(conv.id)}`
        : `/homeowner-messages?bookingId=${encodeURIComponent(conv.id)}`
    );
  };

  if (!token) return null;

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
              onOpen?.();
              void loadConversations(true);
            }
          }}
          className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-black/5 hover:text-gray-900"
          aria-label="Active Messages and Conversations"
          aria-expanded={isOpen}
          title="Messages & Chat"
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-12 z-[80] w-96 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#F9F5F0] px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#0B3B68]">Messages</h3>
                  <span className="rounded-full bg-[#0B3B68]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0B3B68]">
                    {conversations.length} {conversations.length === 1 ? 'Booking' : 'Bookings'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">Live conversations for active bookings</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-black/5 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
              {isLoading && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mb-2 text-[#0B3B68]" />
                  <p className="text-xs">Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="mb-3 rounded-full bg-[#0B3B68]/5 p-3 text-[#0B3B68]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">No active conversations</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Once a booking is accepted, direct messaging with the {role === 'worker' ? 'homeowner' : 'skilled worker'} will activate here.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isAccepted = conv.status.toUpperCase() === 'ACCEPTED' || conv.status.toUpperCase() === 'ONGOING' || conv.status.toUpperCase() === 'IN_PROGRESS';
                  const isDone = conv.status.toUpperCase() === 'COMPLETED';

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleOpenConversation(conv)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-blue-50/40 ${
                        conv.hasUnread ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        {conv.otherPartyAvatar ? (
                          <img
                            src={conv.otherPartyAvatar}
                            alt={conv.otherPartyName}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B3B68]/10 text-[#0B3B68] font-bold text-sm">
                            {conv.otherPartyName ? conv.otherPartyName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                          </div>
                        )}
                        {conv.hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-600 border-2 border-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* PRIMARY TITLE: Booking ID */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-xs truncate font-bold ${conv.hasUnread ? 'font-black text-[#0B3B68]' : 'text-gray-900'}`}>
                            Booking #{conv.requestNumber}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0 font-medium">
                            {formatRelativeTime(conv.lastMessageTime)}
                          </span>
                        </div>

                        {/* SECONDARY INFO: Other party name & trade/service */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[130px]">
                            {conv.otherPartyName}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-medium text-[#0B3B68] bg-[#0B3B68]/5 px-1.5 py-0.5 rounded">
                            {conv.serviceType}
                          </span>
                          <span
                            className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                              isAccepted
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isDone
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {conv.status}
                          </span>
                        </div>

                        <p
                          className={`text-xs truncate ${
                            conv.hasUnread
                              ? 'font-bold text-gray-900'
                              : 'text-gray-500'
                          }`}
                        >
                          {conv.lastMessageSenderRole === role ? 'You: ' : ''}
                          {conv.lastMessageText}
                        </p>
                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-300 self-center flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer: See All in Messages Button */}
            <div className="border-t border-gray-100 bg-gray-50/90 p-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(role === 'worker' ? '/worker-messages' : '/homeowner-messages');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
              >
                <MessageSquare className="w-4 h-4" />
                <span>See all in Messages</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Directly Open Chat Modal */}
      {activeChatBooking && (
        <BookingChatModal
          isOpen={Boolean(activeChatBooking)}
          onClose={() => {
            setActiveChatBooking(null);
            void loadConversations(true);
          }}
          requestId={activeChatBooking.id}
          requestNumber={activeChatBooking.requestNumber}
          serviceType={activeChatBooking.serviceType}
          bookingStatus={activeChatBooking.status}
          rawStatus={activeChatBooking.rawStatus}
          isAccepted={activeChatBooking.isAccepted}
          acceptedOn={activeChatBooking.acceptedOn}
          otherPartyName={activeChatBooking.otherPartyName}
          otherPartyRole={activeChatBooking.otherPartyRole}
          otherPartyAvatar={activeChatBooking.otherPartyAvatar}
          currentRole={role}
        />
      )}
    </>
  );
};

export default MessagesSummaryButton;
