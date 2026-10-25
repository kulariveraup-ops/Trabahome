import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Sparkles, X } from 'lucide-react';

interface ChatbotButtonProps {
  isOpen: boolean;
  onClick: () => void;
  hasUnread?: boolean;
}

export const ChatbotButton: React.FC<ChatbotButtonProps> = ({
  isOpen,
  onClick,
  hasUnread = false,
}) => {
  const location = useLocation();
  const isMessagesPage = location.pathname.includes('messages');
  const [isAutoPopped, setIsAutoPopped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAutoPopped(false);
      return;
    }

    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const THIRTY_SECONDS_MS = 30 * 1000;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const intervalId = setInterval(() => {
      setIsAutoPopped(true);
      hideTimer = setTimeout(() => {
        setIsAutoPopped(false);
      }, THIRTY_SECONDS_MS);
    }, TEN_MINUTES_MS);

    return () => {
      clearInterval(intervalId);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isOpen]);

  const handlePillClick = () => {
    setIsAutoPopped(false);
    onClick();
  };

  return (
    <div
      className={`group fixed z-50 flex items-center gap-2 ${
        isMessagesPage ? 'bottom-20 sm:bottom-24 right-4 sm:right-6' : 'bottom-5 right-5'
      }`}
    >
      {/* Tooltip on hover or auto-popped every 10 mins (lasts 30s) */}
      {!isOpen && (
        <div
          onClick={handlePillClick}
          className={`transition-all duration-300 flex items-center gap-1.5 bg-white dark:bg-slate-800 text-[#004A8C] dark:text-blue-400 text-xs font-bold px-3.5 py-2 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-blue-100 dark:border-slate-700 cursor-pointer select-none ${
            isAutoPopped
              ? 'opacity-100 pointer-events-auto translate-x-0 animate-in fade-in slide-in-from-right-2 duration-300'
              : 'pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto translate-x-1 group-hover:translate-x-0 hidden sm:flex'
          }`}
        >
          <Sparkles size={14} className="text-amber-500 animate-pulse shrink-0" />
          <span className="whitespace-nowrap">Need help? Ask TrabaHome</span>
          {isAutoPopped && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutoPopped(false);
              }}
              className="ml-1 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
              aria-label="Dismiss prompt"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Floating Action Button with merged Message + Star icon */}
      <button
        onClick={onClick}
        aria-label={isOpen ? 'Close Assistant' : 'Need help? Ask TrabaHome'}
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_rgba(0,74,140,0.35)] focus:outline-none focus:ring-4 focus:ring-blue-300 cursor-pointer ${
          isOpen
            ? 'bg-gray-700 text-white hover:bg-gray-800 rotate-90 scale-95'
            : 'bg-gradient-to-tr from-[#003666] to-[#0066CC] text-white hover:scale-105 hover:shadow-[0_10px_28px_rgba(0,74,140,0.45)]'
        }`}
      >
        {isOpen ? (
          <X size={24} className="transition-transform duration-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <MessageSquare size={22} className="text-white drop-shadow-xs sm:w-6 sm:h-6" />
            <Sparkles
              size={12}
              className="absolute -top-1 -right-1.5 text-amber-300 fill-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] animate-pulse"
            />
          </div>
        )}

        {/* Unread indicator */}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
        )}
        {!isOpen && hasUnread && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
        )}
      </button>
    </div>
  );
};

export default ChatbotButton;
