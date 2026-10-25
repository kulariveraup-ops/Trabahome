import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, User, ArrowRight } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ChatbotAction } from '../../types/chatbot.types.ts';
import QuickReplies from './QuickReplies.tsx';

interface ChatMessageProps {
  message: ChatMessageType;
  onQuickReplySelect?: (reply: string) => void;
  onCloseChat?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onQuickReplySelect,
  onCloseChat,
}) => {
  const navigate = useNavigate();
  const isBot = message.sender === 'bot';

  const handleActionClick = (action: ChatbotAction) => {
    if (action.route) {
      navigate(action.route);
      // Optional: close or keep open based on preference
    } else if (action.externalUrl) {
      window.open(action.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Helper to render bold markdown and linebreaks
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      // Parse markdown bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIdx} className="font-semibold text-gray-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  if (!isBot) {
    return (
      <div className="flex justify-end my-2">
        <div className="max-w-[82%] bg-[#004A8C] text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 shadow-sm text-xs leading-relaxed">
          <p>{message.text}</p>
          <span className="block text-[10px] text-blue-200/80 text-right mt-1 font-light">
            {message.timestamp}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 my-2.5">
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#004A8C] to-[#0066CC] text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
        <Bot size={17} />
      </div>

      {/* Bot Bubble */}
      <div className="max-w-[85%] space-y-2">
        <div className="bg-white border border-gray-150 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs text-xs text-gray-800 leading-relaxed">
          {renderFormattedText(message.text)}

          {/* Action Buttons (CTAs routing to real pages) */}
          {message.actions && message.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-2.5 border-t border-gray-100">
              {message.actions.map((action, idx) => (
                <button
                  key={`${action.label}-${idx}`}
                  onClick={() => handleActionClick(action)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer ${
                    action.variant === 'primary'
                      ? 'bg-[#004A8C] text-white hover:bg-[#003666] shadow-xs'
                      : 'bg-white text-[#004A8C] border border-[#004A8C]/30 hover:bg-blue-50'
                  }`}
                >
                  <span>{action.label}</span>
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          )}

          <span className="block text-[10px] text-gray-400 mt-2 font-light text-right">
            {message.timestamp}
          </span>
        </div>

        {/* Quick reply follow-up chips */}
        {message.quickReplies && message.quickReplies.length > 0 && onQuickReplySelect && (
          <QuickReplies
            replies={message.quickReplies}
            onSelect={onQuickReplySelect}
          />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
