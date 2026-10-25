import React from 'react';
import { Bot } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-2.5 my-2">
      <div className="w-8 h-8 rounded-full bg-[#004A8C] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
        <Bot size={18} />
      </div>
      <div className="bg-white border border-gray-150 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium mr-1.5">
            TrabaHome Assistant is typing
          </span>
          <span className="w-1.5 h-1.5 bg-[#004A8C] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-[#004A8C] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-[#004A8C] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
