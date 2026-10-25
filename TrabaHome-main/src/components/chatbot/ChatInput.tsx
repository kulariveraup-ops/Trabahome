import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your question...',
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 bg-white border-t border-gray-150 flex items-center gap-2"
    >
      <input
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-full px-4 py-2.5 outline-none transition-all focus:border-[#004A8C] focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
        className="w-9 h-9 rounded-full bg-[#004A8C] text-white flex items-center justify-center hover:bg-[#003666] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 cursor-pointer shadow-xs"
      >
        <Send size={15} className="translate-x-0.5" />
      </button>
    </form>
  );
};

export default ChatInput;
