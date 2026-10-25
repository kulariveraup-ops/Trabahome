import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Loader2,
  ExternalLink,
  MessageSquare,
  Receipt,
} from 'lucide-react';
import { homeownerAPI } from '../../services/HomeownerApi.ts';
import { workerAPI } from '../../services/WorkerApi.ts';
import { adminAPI } from '../../services/AdminApi.ts';

export interface ChatAttachment {
  url: string;
  name?: string;
  fileType?: string;
}

export interface ChatMessage {
  _id?: string;
  senderId: string;
  senderRole: 'homeowner' | 'worker' | 'admin';
  senderName: string;
  message: string;
  attachments?: ChatAttachment[];
  createdAt: string | Date;
}

interface BookingChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestNumber?: string;
  serviceType?: string;
  bookingStatus?: string;
  rawStatus?: string;
  isAccepted?: boolean;
  acceptedOn?: unknown;
  otherPartyName: string;
  otherPartyRole: string;
  otherPartyAvatar?: string;
  currentRole: 'homeowner' | 'worker' | 'admin';
  readOnly?: boolean;
  onViewEReceipt?: () => void;
}

const formatMessageTime = (dateValue: string | Date): string => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isImageAttachment = (att: ChatAttachment): boolean => {
  const url = String(att.url || '').toLowerCase();
  const name = String(att.name || '').toLowerCase();
  const type = String(att.fileType || '').toLowerCase();
  return (
    type.includes('image') ||
    url.startsWith('data:image/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(url) ||
    /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(name)
  );
};

export const BookingChatModal: React.FC<BookingChatModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requestNumber,
  serviceType,
  bookingStatus,
  rawStatus,
  isAccepted,
  acceptedOn,
  otherPartyName,
  otherPartyRole,
  otherPartyAvatar,
  currentRole,
  readOnly = false,
  onViewEReceipt,
}) => {
  const effectiveRaw = String(rawStatus || bookingStatus || '').trim().toUpperCase();
  const effectiveStatus = String(bookingStatus || '').trim().toUpperCase();

  const isCompleted = effectiveRaw === 'COMPLETED' || effectiveStatus === 'COMPLETED';
  const isCancelled = ['CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED'].includes(effectiveRaw) ||
    ['CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED'].includes(effectiveStatus);

  const accepted = Boolean(
    isAccepted ||
    acceptedOn ||
    ['ONGOING', 'ACCEPTED', 'IN_PROGRESS', 'IN PROGRESS', 'COMPLETED'].includes(effectiveRaw)
  );

  const isPendingAcceptance = !accepted && !isCompleted && !isCancelled;
  const isPendingSchedule = accepted && !isCompleted && !isCancelled && effectiveStatus === 'PENDING';
  const isAuditOnly = readOnly || currentRole === 'admin';
  const isChatDisabled = isAuditOnly || isCompleted || isPendingAcceptance || isCancelled;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = async (silent = false) => {
    if (!requestId) return;
    if (!silent) setIsLoading(true);
    try {
      let result: { success?: boolean; messages?: any[] } | null = null;
      if (currentRole === 'homeowner') {
        result = await homeownerAPI.getServiceRequestMessages(requestId);
      } else if (currentRole === 'worker') {
        result = await workerAPI.getServiceRequestMessages(requestId);
      } else {
        result = await adminAPI.getServiceRequestMessages(requestId);
      }

      if (result && Array.isArray(result.messages)) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !requestId) return;
    void loadMessages(false);

    // Auto-poll messages every 4 seconds while modal is open
    const pollInterval = setInterval(() => {
      void loadMessages(true);
    }, 4000);

    // Also listen for socket custom event
    const handleSocketMessage = (event: Event) => {
      const custom = event as CustomEvent<{ requestId?: string; requestNumber?: string; message?: ChatMessage }>;
      const detail = custom.detail;
      if (!detail) return;
      const targetIds = [requestId, requestNumber].filter(Boolean).map(String);
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
          void loadMessages(true);
        }
      }
    };

    window.addEventListener('trabahome:service-request-message', handleSocketMessage);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('trabahome:service-request-message', handleSocketMessage);
    };
  }, [isOpen, requestId, requestNumber]);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages.length]);

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isSending || isChatDisabled) return;

    const textToSend = inputText.trim();
    const attachmentsToSend = [...attachments];

    setIsSending(true);
    setInputText('');
    setAttachments([]);

    try {
      let result: { success?: boolean; message?: ChatMessage } | null = null;
      if (currentRole === 'homeowner') {
        result = await homeownerAPI.sendServiceRequestMessage(requestId, {
          message: textToSend,
          attachments: attachmentsToSend,
        });
      } else if (currentRole === 'worker') {
        result = await workerAPI.sendServiceRequestMessage(requestId, {
          message: textToSend,
          attachments: attachmentsToSend,
        });
      } else {
        result = await adminAPI.sendServiceRequestMessage(requestId, {
          message: textToSend,
          attachments: attachmentsToSend,
        });
      }

      if (result && result.message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => m._id && result?.message?._id && String(m._id) === String(result.message?._id)
          );
          if (exists) return prev;
          return [...prev, result.message!];
        });
      } else {
        await loadMessages(true);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on failure
      setInputText(textToSend);
      setAttachments(attachmentsToSend);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[92vh] border border-gray-100 animate-in zoom-in-95 duration-150 text-left">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                {otherPartyAvatar ? (
                  <img src={otherPartyAvatar} alt={otherPartyName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm text-[#0B3B68]">
                    {otherPartyName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-gray-900 truncate">{otherPartyName}</h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  {otherPartyRole}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {requestNumber || (requestId?.startsWith('SR-') ? requestId : `Request #${requestId?.slice(-6)}`)}
                {serviceType ? ` • ${serviceType}` : ''}
                {isPendingSchedule ? ' • Accepted (Waiting for date)' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onViewEReceipt && (
              <button
                type="button"
                onClick={onViewEReceipt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="View Official E-Receipt & Proof of Work for Dispute Review"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>E-Receipt</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F9FAFC] custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#0B3B68]" />
              <p className="text-xs font-medium">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7 text-[#00AF91]" />
              </div>
              <h4 className="font-bold text-sm text-gray-700">No messages yet</h4>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Start the conversation regarding the job details, schedule, or location.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMine = msg.senderRole === currentRole;
              const hasAttachments = Array.isArray(msg.attachments) && msg.attachments.length > 0;

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className="text-[10px] font-bold text-gray-500">
                      {isMine ? 'You' : msg.senderName || (msg.senderRole === 'worker' ? 'Worker' : msg.senderRole === 'homeowner' ? 'Homeowner' : 'Admin')}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed break-words ${
                      isMine
                        ? 'bg-[#0B3B68] text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                    }`}
                  >
                    {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                    {/* Attachments */}
                    {hasAttachments && (
                      <div className={`space-y-2 ${msg.message ? 'mt-2.5' : ''}`}>
                        {msg.attachments!.map((att, attIdx) => {
                          const isImg = isImageAttachment(att);

                          if (isImg) {
                            return (
                              <div
                                key={attIdx}
                                onClick={() => setExpandedImage(att.url)}
                                className="cursor-pointer group relative rounded-xl overflow-hidden border border-black/10 bg-black/5"
                              >
                                <img
                                  src={att.url}
                                  alt={att.name || 'Attachment'}
                                  className="max-h-48 w-full object-cover hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                  <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full font-medium flex items-center gap-1 transition-opacity">
                                    <ExternalLink className="w-3 h-3" /> Click to expand
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <a
                              key={attIdx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold hover:underline ${
                                isMine
                                  ? 'bg-white/10 text-white border-white/20'
                                  : 'bg-gray-50 text-[#0B3B68] border-gray-200'
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate max-w-[180px]">{att.name || 'Document'}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Selected Attachment Previews */}
        {attachments.length > 0 && (
          <div className="p-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 shadow-2xs"
              >
                {att.fileType === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[#00AF91]" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span className="truncate max-w-[120px] font-medium">{att.name || 'File'}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="text-gray-400 hover:text-red-500 font-bold ml-1 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Footer */}
        {isCancelled ? (
          <div className="p-4 bg-red-50 border-t border-red-100 flex items-center justify-center gap-2 text-center text-xs text-red-700 font-semibold">
            <span>This booking has been cancelled. Conversation is closed and messaging is disabled.</span>
          </div>
        ) : isCompleted ? (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-2 text-center text-xs text-gray-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
            <span>This booking is marked as Completed. Conversation is closed and no further messages can be sent.</span>
          </div>
        ) : isAuditOnly ? (
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
            This conversation is viewed in dispute & audit mode (view-only). Replying is disabled.
          </div>
        ) : isPendingAcceptance ? (
          <div className="p-4 bg-amber-50/80 border-t border-amber-100 flex items-center justify-center gap-2 text-center text-xs text-amber-700 font-medium">
            <span>Chat is disabled. Messaging will activate once the skilled worker accepts this booking.</span>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-white border-t border-gray-100 flex items-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full text-gray-400 hover:text-[#0B3B68] hover:bg-gray-50 transition-colors"
              title="Attach photos or files"
              aria-label="Attach photos or files"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#00AF91] focus:bg-white transition-all"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && attachments.length === 0) || isSending}
              className="p-2.5 rounded-full bg-[#00AF91] text-white hover:bg-[#00967d] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
              title="Send message"
              aria-label="Send message"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        )}
      </div>

      {/* Expanded Image Viewer Overlay */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]">
            <img
              src={expandedImage}
              alt="Expanded preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingChatModal;
