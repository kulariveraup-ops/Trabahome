import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  MessageSquare,
  Send,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  getOwnSupportTicket,
  listOwnSupportTickets,
  replyToOwnSupportTicket,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from "../../services/SupportApi.ts";

type SupportConversationProps = {
  token: string;
  currentRole: "Homeowner" | "Worker";
  initialTicketId?: string;
  refreshKey?: number;
  detailRefreshKey?: string;
};

const getStatusBadge = (status?: string) => {
  const norm = String(status || "").toLowerCase();
  if (norm === "open") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (norm === "resolved" || norm === "closed") {
    return "bg-gray-100 text-gray-700 border border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
  return "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
};

const SupportConversation: React.FC<SupportConversationProps> = ({
  token,
  currentRole,
  initialTicketId = "",
  refreshKey = 0,
  detailRefreshKey = "",
}) => {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isTicketLoading, setIsTicketLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [ticketError, setTicketError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastOpenedTicketRef = useRef<string>("");

  useEffect(() => {
    let active = true;
    if (!token) {
      setTickets([]);
      setIsListLoading(false);
      return () => {
        active = false;
      };
    }

    setIsListLoading(true);
    setError("");
    void listOwnSupportTickets(token)
      .then((result) => {
        if (active) setTickets(Array.isArray(result.items) ? result.items : []);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load tickets."
          );
      })
      .finally(() => {
        if (active) setIsListLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  useEffect(() => {
    const requestedTicketId = String(initialTicketId || "").trim();
    if (requestedTicketId && requestedTicketId !== lastOpenedTicketRef.current) {
      lastOpenedTicketRef.current = requestedTicketId;
      setSelectedTicketId(requestedTicketId);
      setIsModalOpen(true);
    }
  }, [initialTicketId]);

  useEffect(() => {
    let active = true;
    if (!token || !selectedTicketId || !isModalOpen) {
      return () => {
        active = false;
      };
    }

    setTicket(null);
    setReply("");
    setTicketError("");
    setIsTicketLoading(true);
    void getOwnSupportTicket(token, selectedTicketId)
      .then((result) => {
        if (active) setTicket(result.ticket);
      })
      .catch((requestError) => {
        if (active)
          setTicketError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to open ticket."
          );
      })
      .finally(() => {
        if (active) setIsTicketLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detailRefreshKey, selectedTicketId, token, isModalOpen]);

  // Auto-scroll messages to bottom when modal opens or messages update
  useEffect(() => {
    if (isModalOpen && ticket?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isModalOpen, ticket?.messages]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  const handleOpenTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    lastOpenedTicketRef.current = ticketId;
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReply("");
    setTicketError("");
  };

  const activeSummary = useMemo(() => {
    return (
      tickets.find(
        (t) => t.id === selectedTicketId || t.ticketNumber === selectedTicketId
      ) || null
    );
  }, [tickets, selectedTicketId]);

  const replyWordCount = useMemo(
    () => reply.trim().split(/\s+/).filter(Boolean).length,
    [reply]
  );

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = reply.trim();
    const activeTicket = ticket || activeSummary;
    if (!activeTicket || !message || replyWordCount > 250 || isSending) return;

    setIsSending(true);
    setTicketError("");
    try {
      const result = await replyToOwnSupportTicket(token, activeTicket.id, message);
      setTicket(result.ticket);
      setTickets((current) =>
        current
          .map((item) =>
            item.id === result.ticket.id ? { ...item, ...result.ticket } : item
          )
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime()
          )
      );
      setReply("");
    } catch (requestError) {
      setTicketError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send reply."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-slate-700 dark:bg-slate-850"
      aria-label="My support tickets"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#0B3B68] dark:text-blue-300">
          My Support Requests
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">
          Open a ticket to view and reply to its conversation.
        </p>
      </div>

      {isListLoading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-500 dark:text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B3B68] dark:text-blue-400" />
          <span>Loading tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-500 dark:text-slate-400">
          No support requests yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tickets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenTicket(item.id)}
              className="group flex flex-col justify-between p-3.5 rounded-xl border border-gray-200 bg-white hover:border-[#0B3B68]/40 hover:shadow-sm transition-all text-left cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-100 group-hover:text-[#0B3B68] dark:group-hover:text-blue-400 transition-colors">
                    {item.ticketNumber}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-600 dark:text-slate-300">
                  {item.category || item.issueCategory}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-400">
                <span>
                  {item.updatedAt
                    ? new Date(item.updatedAt).toLocaleDateString()
                    : item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : ""}
                </span>
                <span className="font-semibold text-[#0B3B68] dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  View <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>
      ) : null}

      {/* Pop-up Modal for Support Ticket View & Action */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#0B3B68] dark:text-blue-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2
                      id="ticket-modal-title"
                      className="text-sm md:text-base font-bold text-gray-900 dark:text-white"
                    >
                      {ticket?.ticketNumber ||
                        activeSummary?.ticketNumber ||
                        selectedTicketId}
                    </h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(
                        ticket?.status || activeSummary?.status
                      )}`}
                    >
                      {ticket?.status || activeSummary?.status || "Open"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {ticket?.category ||
                      ticket?.issueCategory ||
                      activeSummary?.category ||
                      activeSummary?.issueCategory ||
                      "Support Request"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="Close ticket conversation"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Conversation */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 bg-gray-50/50 dark:bg-slate-900/50">
              {isTicketLoading && !ticket ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-[#0B3B68] dark:text-blue-400" />
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    Loading conversation...
                  </p>
                </div>
              ) : ticketError && !ticket ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-xs font-semibold text-red-500">{ticketError}</p>
                </div>
              ) : (
                <>
                  {(ticket?.messages || []).length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400 dark:text-slate-500">
                      No messages in this ticket yet.
                    </div>
                  ) : (
                    (ticket?.messages || []).map((entry) => {
                      const isCurrentUser = entry.senderRole === currentRole;
                      const isAdmin = entry.senderRole === "Admin";
                      return (
                        <article
                          key={entry.id || `${entry.senderRole}-${entry.createdAt}`}
                          className={`rounded-2xl p-4 shadow-sm border transition-all ${
                            isCurrentUser
                              ? "ml-auto max-w-[85%] border-blue-200 bg-[#0B3B68] text-white dark:border-blue-700 dark:bg-blue-600"
                              : isAdmin
                              ? "mr-auto max-w-[85%] border-blue-100 bg-white text-gray-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              : "mr-auto max-w-[85%] border-gray-200 bg-white text-gray-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isCurrentUser
                                  ? "bg-white/20 text-white"
                                  : isAdmin
                                  ? "bg-blue-50 text-[#0B3B68] dark:bg-blue-900/60 dark:text-blue-300 font-extrabold"
                                  : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {entry.senderRole}
                            </span>
                            <time
                              className={`text-[10px] ${
                                isCurrentUser
                                  ? "text-blue-100"
                                  : "text-gray-400 dark:text-slate-400"
                              }`}
                            >
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleString()
                                : ""}
                            </time>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {entry.message}
                          </p>
                        </article>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Modal Footer / Closed Notice or Reply Box */}
            {ticket?.status === "Resolved" || ticket?.status === "Closed" || activeSummary?.status === "Resolved" || activeSummary?.status === "Closed" ? (
              <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/60 flex items-center justify-center gap-3 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-800 dark:text-slate-100">
                    This support ticket has been resolved and closed.
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">
                    No further messages can be sent. If you have another issue, please submit a new support ticket.
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={sendReply}
                className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
              >
                <div className="relative">
                  <textarea
                    value={reply}
                    onChange={(event) => {
                      const words = event.target.value
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);
                      setReply(
                        words.length <= 250
                          ? event.target.value
                          : words.slice(0, 250).join(" ")
                      );
                    }}
                    rows={3}
                    placeholder={`Reply as ${currentRole}...`}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 resize-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 dark:text-slate-400 font-medium">
                    {replyWordCount}/250 words
                  </span>
                  <button
                    type="submit"
                    disabled={!reply.trim() || isSending || (!ticket && !activeSummary)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0B3B68] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#082d50] disabled:cursor-not-allowed disabled:opacity-50 transition-all dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </button>
                </div>
                {ticketError && (
                  <p className="text-xs font-semibold text-red-500">{ticketError}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default SupportConversation;
