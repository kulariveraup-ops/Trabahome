import React, { useRef, useEffect } from 'react';
import { Bot, X, RotateCcw, ShieldCheck } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ChatbotContext } from '../../types/chatbot.types.ts';
import ChatMessage from './ChatMessage.tsx';
import ChatInput from './ChatInput.tsx';
import TypingIndicator from './TypingIndicator.tsx';

interface ChatbotWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  messages: ChatMessageType[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  context: ChatbotContext;
}

export const ChatbotWindow: React.FC<ChatbotWindowProps> = ({
  isOpen,
  onClose,
  onRestart,
  messages,
  isTyping,
  onSendMessage,
  context,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 flex flex-col w-full sm:w-[410px] h-full sm:h-[620px] max-h-full sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-gray-200 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-200">
      {/* ── Chatbot Header ────────────────────────────────────── */}
      <div className={`px-4 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm select-none text-white ${
        context.role === 'admin'
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-800/40'
          : context.role === 'worker'
          ? 'bg-gradient-to-r from-[#003666] via-[#0B4F8A] to-[#057A55]'
          : context.role === 'homeowner'
          ? 'bg-gradient-to-r from-[#003666] via-[#004A8C] to-[#005CA9]'
          : 'bg-gradient-to-r from-[#1A365D] via-[#2B6CB0] to-[#3182CE]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight">
                {context.role === 'admin'
                  ? 'TrabaHome Admin Assistant'
                  : context.role === 'worker'
                  ? 'TrabaHome Worker Assistant'
                  : context.role === 'homeowner'
                  ? 'TrabaHome Homeowner Assistant'
                  : 'TrabaHome Assistant'}
              </h3>
              <ShieldCheck
                size={14}
                className={
                  context.role === 'admin'
                    ? 'text-indigo-300'
                    : context.role === 'worker'
                    ? 'text-emerald-300'
                    : context.role === 'homeowner'
                    ? 'text-sky-300'
                    : 'text-blue-200'
                }
              />
            </div>
            <p className="text-[11px] text-blue-100/90 font-medium">
              {context.role === 'admin'
                ? 'Admin Operations • Online'
                : context.role === 'homeowner'
                ? 'Homeowner Services • Online'
                : context.role === 'worker'
                ? 'Skilled Worker Support • Online'
                : 'TrabaHome Assistant • Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onRestart}
            title="Restart conversation"
            aria-label="Restart conversation"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            aria-label="Close Assistant"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Message Area ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] space-y-2">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onQuickReplySelect={onSendMessage}
            onCloseChat={onClose}
          />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Fixed Chat Input ─────────────────────────────────── */}
      <ChatInput onSend={onSendMessage} disabled={isTyping} />
    </div>
  );
};

export default ChatbotWindow;
