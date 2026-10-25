import React, { useEffect, useState } from 'react';
import type { Job } from '../../types/Job.types.ts';

interface DeclineJobModalProps {
  job: Job | null;
  declineReasons: string[];
  onDecline: (jobId: string, reason: string) => void;
  onCancel: () => void;
  mode?: 'decline' | 'cancel';
}

const DeclineJobModal: React.FC<DeclineJobModalProps> = ({ 
  job, 
  declineReasons, 
  onDecline, 
  onCancel,
  mode = 'decline',
}) => {
  const [declineReason, setDeclineReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");

  useEffect(() => {
    setDeclineReason('');
    setOtherReason('');
  }, [job?.id]);

  if (!job) return null;

  const handleSubmit = () => {
    const finalReason = declineReason === 'Other'
      ? otherReason.trim()
      : declineReason;
    onDecline(job.id, finalReason || '');
  };
  const isCancellation = mode === 'cancel';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] w-full max-w-[480px] shadow-2xl relative overflow-hidden text-left border border-gray-100">
        <header className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-[#FEF3C7] border border-[#F59E0B] flex items-center justify-center text-[12px] leading-none text-[#92400E] font-black">
              !
            </div>
            <h2 className="font-bold text-gray-900 text-lg">
              {isCancellation ? 'Cancel this booking?' : 'Decline this request?'}
            </h2>
          </div>
          <button onClick={onCancel} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
        </header>
        
        <div className="p-8">
          <p className="text-[11px] text-gray-500 leading-relaxed mb-6 font-medium">
            This will notify the homeowner and move the {isCancellation ? 'booking' : 'request'} out of your active list.
          </p>

          <div className="mb-8">
            <h4 className="text-[12px] font-bold text-gray-800 mb-4">Reason (optional)</h4>
            <div className="space-y-3">
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] focus:outline-none focus:border-red-400 shadow-sm"
              >
                <option value="">Select a reason (optional)</option>
                {declineReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
              {declineReason === 'Other' && (
                <input 
                  type="text" 
                  placeholder="Add a quick note (optional)" 
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-[12px] focus:outline-none focus:border-red-400 shadow-sm"
                />
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleSubmit} 
              className="flex-1 py-3.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all bg-[#D93F3F] text-white shadow-lg hover:bg-red-600"
            >
              {isCancellation ? 'Cancel Booking' : 'Decline'}
            </button>
            <button 
              onClick={onCancel} 
              className="flex-1 py-3.5 border border-[#00A651] text-[#00A651] rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-green-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeclineJobModal;
