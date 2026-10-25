import React from 'react';
import {
  CalendarIcon,
  HammerIcon,
  MapPinIcon,
  X
} from 'lucide-react';
import HomeownerAvatar from '../shared/HomeownerAvatar.tsx';
import type { Job } from '../../types/Job.types.ts';

interface JobPreviewModalProps {
  job: Job | null;
  onClose: () => void;
  onViewDetails?: (job: Job) => void;
}

const JobPreviewModal: React.FC<JobPreviewModalProps> = ({ job, onClose, onViewDetails }) => {
  if (!job) return null;

  const resolvedAddress = [job.location, job.address].filter(Boolean).join('\n') || 'Not specified';
  const schedule =
    String(job.scheduledDate || '').trim() || 'Not specified';
  const budget =
    typeof job.price === 'number'
      ? `${job.currency || 'PHP'} ${job.price}`
      : 'Not specified';

  return (
    <div className="fixed inset-0 z-[105]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-2xl flex flex-col">
        <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Job Preview</p>
            <h2 className="text-lg font-bold text-gray-900">Request details</h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-3">
            <HomeownerAvatar
              src={job.homeownerAvatar}
              name={job.name}
              className="w-12 h-12 border border-pink-100 shadow-sm"
              fallbackClassName="bg-gradient-to-br from-[#FFEAF3] to-[#FFF8FB] text-[#0B3B68]"
            />
            <div>
              <p className="text-sm font-bold text-gray-900">{job.name}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <MapPinIcon className="w-3.5 h-3.5 text-[#0085FF]" />
                {job.location}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Job Type:</span>
              <span className="bg-[#DDEBFF] text-[#0057FF] px-3.5 py-1 rounded text-[11px] font-bold italic flex items-center gap-1.5">
                <HammerIcon className="w-3.5 h-3.5" /> {job.needs}
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
              <div className="bg-[#F6F6F6] rounded-xl p-4 text-[12px] text-gray-600 leading-relaxed font-medium">
                {job.description || 'No description provided.'}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Location</p>
              <div className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-4">
                <div className="flex items-center gap-2 text-[12px] text-gray-600 font-medium">
                  <MapPinIcon className="w-4 h-4 text-[#0085FF]" />
                  <span className="whitespace-pre-line">{resolvedAddress}</span>
                </div>
                <div className="mt-3 h-24 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-100 flex items-center justify-center text-[11px] text-blue-400 font-semibold">
                  Map preview
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Schedule</p>
              <p className="text-[12px] text-gray-600 font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-300" />
                Preferred: {schedule}
              </p>
              <p className="text-[11px] text-gray-400 font-medium mt-1">Request sent: {job.requestSentAt || job.time}</p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Budget</p>
              <p className="text-[12px] text-gray-600 font-medium">{budget}</p>
            </div>
          </div>
        </div>

        {onViewDetails && (
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={() => onViewDetails(job)}
              className="w-full py-3 rounded-full bg-[#0B3B68] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#154575] transition-all"
            >
              View Full Details
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default JobPreviewModal;
