import React from 'react';
import { MapPinIcon, HammerIcon, CalendarIcon, LockIcon, PhoneIcon, MessageSquare, Hash } from 'lucide-react';
import HomeownerAvatar from '../shared/HomeownerAvatar.tsx';
import type { Job } from '../../types/Job.types.ts';

interface JobCardProps {
  job: Job;
  onPreview: (job: Job) => void;
  onViewDetails: (job: Job) => void;
  onAccept: (job: Job) => void;
  onDecline: (job: Job) => void;
  onOpenChat?: (job: Job) => void;
  onProposeReschedule?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({
  job,
  onPreview,
  onViewDetails,
  onAccept,
  onDecline,
  onOpenChat,
  onProposeReschedule,
}) => {
  const statusClassName =
    job.status === 'Pending'
      ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
      : job.status === 'Accepted'
      ? 'bg-blue-50 text-[#0B3B68] border border-blue-200'
      : job.status === 'Declined'
      ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
      : job.status === 'Cancelled'
      ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
      : job.status === 'In Progress'
      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
      : 'bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]';

  const preferredSchedule = String(job.scheduledDate || '').trim() || 'Not specified';
  return (
    <div className="bg-white p-7 rounded-2xl border border-gray-100 transition-all shadow-sm relative text-left hover:shadow-md">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onPreview(job)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onPreview(job);
          }
        }}
        className="cursor-pointer"
      >
        <div className="flex items-start gap-4 mb-4">
          <HomeownerAvatar
            src={job.homeownerAvatar}
            name={job.name}
            className="w-12 h-12 border border-pink-100 shadow-sm cursor-default"
            fallbackClassName="bg-gradient-to-br from-[#FFEAF3] to-[#FFF8FB] text-[#0B3B68]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-left font-bold text-gray-900 text-sm truncate cursor-default">
                {job.name}
              </div>
              <span className="font-mono text-[10px] font-bold text-[#0B3B68] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                #{job.requestNumber || job.id}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
              {job.location || 'Homeowner request'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`${statusClassName} inline-flex w-fit items-center justify-center whitespace-nowrap leading-none text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-[0.14em]`}
            >
              {job.status}
            </span>
          </div>
        </div>

        {job.status === 'Pending' && !job.isAccepted && !job.acceptedTime && (
          <div className="flex items-start gap-2 text-gray-400 mb-4 pl-1">
            <LockIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[10px] leading-tight font-medium italic">
              After you accept, both of you will be able to see each other's contact details so you can
              coordinate directly.
            </p>
          </div>
        )}

        {(job.status === 'In Progress' || job.status === 'Accepted' || job.isAccepted || job.acceptedTime) && (
          <div className="flex items-start gap-2 text-gray-700 mb-4 pl-1">
            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center shrink-0">
              <span className="text-white text-[10px]">OK</span>
            </div>
            <p className="text-[11px] font-medium italic">
              Good news! You can now contact the homeowner. Click <span className="font-bold">'View Details'</span>.
            </p>
          </div>
        )}

        {job.status === 'Cancelled' && (
          <p className="text-[11px] text-gray-700 font-bold mb-4 pl-1">
            Reason: <span className="font-medium text-gray-600">{job.cancelledReason}</span>
          </p>
        )}

        {job.status === 'Declined' && job.declineReason && (
          <p className="text-[11px] text-gray-700 font-bold mb-4 pl-1">
            Your reason: <span className="font-medium text-gray-600">{job.declineReason}</span>
          </p>
        )}

        {job.status === 'Completed' && (
          <div className="mb-4 pl-1">
            {job.hasReview ? (
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-sm">*</span>
                <span className="text-[11px] font-bold text-gray-700">{job.rating?.toFixed(1)} Ratings</span>
              </div>
            ) : (
              <p className="text-[12px] text-gray-400 font-medium italic">Hasn't left a review yet.</p>
            )}
          </div>
        )}

        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Service Type:</span>
            <span className="bg-[#DDEBFF] text-[#0057FF] px-3.5 py-1 rounded-full text-[11px] font-bold italic flex items-center gap-1.5 transition-all duration-300">
              <HammerIcon className="w-3.5 h-3.5" /> {job.needs}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase">
              Preferred Schedule: <span className="text-gray-500 font-medium italic normal-case">{preferredSchedule}</span>
            </p>
            <p className="text-[11px] text-gray-500 flex items-center gap-1.5 font-medium">
              <CalendarIcon className="w-4 h-4 text-gray-200" />
              {job.status === 'Completed'
                ? `Completed: ${job.completionTime || job.time}`
                : job.status === 'Cancelled'
                ? `Cancelled: ${job.cancelledTime || job.time}`
                : (job.status === 'In Progress' || job.status === 'Accepted')
                ? `Accepted: ${job.acceptedTime || job.time}`
                : job.status === 'Declined'
                ? `Declined: ${job.requestSentAt || job.time}`
                : `Request sent: ${job.time}`}
            </p>
          </div>
        </div>

        {job.status === 'In Progress' && (
          <div className="flex items-center gap-2 text-blue-500 pl-1">
            <span className="text-sm">@</span>
            <p className="text-[11px] font-medium italic">
              The job is active. Open details to mark it completed once the work is done.
            </p>
          </div>
        )}
      </div>

      {job.status === 'Pending' && !job.isAccepted && !job.acceptedTime && (
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors cursor-pointer"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={() => onDecline(job)}
            className="px-8 py-2.5 border border-[#FF4D4D] text-[#FF4D4D] rounded-[8px] text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all cursor-pointer"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => onAccept(job)}
            className="px-8 py-2.5 bg-[#00A651] text-white rounded-[8px] text-[11px] font-bold uppercase tracking-widest shadow-md hover:bg-green-600 transition-all cursor-pointer"
          >
            Accept
          </button>
        </div>
      )}

      {(job.status === 'Accepted' || (job.status === 'Pending' && (job.isAccepted || job.acceptedTime))) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#0B3B68] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              ✓ Accepted • Waiting for scheduled date
            </span>
            {job.rescheduleRequest?.status === 'pending' && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                Reschedule Pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onProposeReschedule && job.rescheduleRequest?.status !== 'pending' && (
              <button
                type="button"
                onClick={() => onProposeReschedule(job)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/30 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Reschedule
              </button>
            )}
            {onOpenChat && (
              <button
                type="button"
                onClick={() => onOpenChat(job)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#00AF91] border border-[#00AF91]/40 hover:bg-[#00AF91] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors cursor-pointer"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {job.status === 'In Progress' && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
            ● In Progress • Service is ongoing
          </span>
          <div className="flex items-center gap-2">
            {onOpenChat && (
              <button
                type="button"
                onClick={() => onOpenChat(job)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#00AF91] border border-[#00AF91]/40 hover:bg-[#00AF91] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
            )}
            <button
              type="button"
              onClick={() => onViewDetails(job)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors cursor-pointer"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {(job.status === 'Completed' || job.status === 'Declined' || job.status === 'Cancelled') && (
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors cursor-pointer"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default JobCard;
