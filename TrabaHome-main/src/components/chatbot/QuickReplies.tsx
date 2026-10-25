import React from 'react';

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  replies,
  onSelect,
  disabled = false,
}) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2 pb-1">
      {replies.map((reply, idx) => (
        <button
          key={`${reply}-${idx}`}
          disabled={disabled}
          onClick={() => onSelect(reply)}
          className="text-[11px] font-medium text-[#004A8C] bg-blue-50/80 hover:bg-blue-100 hover:text-[#003666] active:scale-95 border border-blue-200/60 rounded-full px-2.5 py-1 transition-all duration-150 text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;
