import React from 'react';
import { BriefcaseIcon, MapPinIcon, HammerIcon, CalendarIcon, LockIcon, PhoneIcon, MessageSquare, Receipt, Star, Check } from 'lucide-react';
import HomeownerAvatar from '../shared/HomeownerAvatar.tsx';
import BookingStatusBar from '../shared/BookingStatusBar.tsx';
import { formatScheduleDateTime } from '../../utils/formatDateTime.ts';
import type { Job, JobDetailsModalProps } from '../../types/Job.types.ts';

const maskPhone = (phone: string): string => {
  if (!phone || phone === 'Not provided') return phone;
  const trimmed = phone.trim();
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 2) + '*'.repeat(Math.max(trimmed.length - 2, 8));
};

const maskEmail = (email: string): string => {
  if (!email || email === 'Not provided') return email;
  const parts = email.split('@');
  if (parts.length !== 2) {
    return email.slice(0, 2) + '****';
  }
  const [name, domain] = parts;
  const maskedName = name.length > 2 ? name.slice(0, 2) + '*'.repeat(name.length - 2) : name + '**';
  return `${maskedName}@${domain}`;
};

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onAccept,
  onDecline,
  onComplete,
  onCancelBooking,
  onOpenChat,
  onViewEReceipt,
  onProposeReschedule,
}) => {
  if (!job) return null;

  const isAccepted = Boolean(
    job.isAccepted ||
    job.acceptedTime ||
    ['Accepted', 'In Progress', 'Completed'].includes(job.status)
  );
  const isPendingNotAccepted = job.status === 'Pending' && !isAccepted;
  const rawEmail = job.email || 'Not provided';
  const rawPhone = job.contactNumber || job.phone || 'Not provided';
  const displayEmail = isPendingNotAccepted ? maskEmail(rawEmail) : rawEmail;
  const displayPhone = isPendingNotAccepted ? maskPhone(rawPhone) : rawPhone;
  const homeownerRating = typeof job.homeownerRating === 'number' ? job.homeownerRating : 0;
  const homeownerRatingCount = job.homeownerRatingCount || 0;
  const homeownerReviews = Array.isArray(job.homeownerReviews) ? job.homeownerReviews : [];

  const statusClassName =
    job.status === 'Pending'
      ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
      : job.status === 'Accepted'
      ? 'bg-blue-50 text-[#0B3B68] border border-blue-200'
      : job.status === 'Cancelled'
      ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA]'
      : job.status === 'Declined'
      ? 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
      : job.status === 'In Progress'
      ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
      : 'bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]';

  const budget =
    typeof job.price === 'number'
      ? `${job.currency || 'PHP'} ${job.price}`
      : 'Not specified';
  const preferredSchedule =
    formatScheduleDateTime(job.preferredDate, job.preferredTime, job.scheduledDate) ||
    String(job.scheduledDate || '').trim() ||
    'Not specified';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] w-full max-w-[440px] shadow-2xl relative overflow-hidden text-left flex flex-col max-h-[90vh]">
        <header className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-gray-800">
            <BriefcaseIcon className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-base">Request Details</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>

        <div className="p-8 overflow-y-auto custom-scrollbar">
          {/* Booking ID */}
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2.5 mb-6">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Booking ID</span>
            <span className="text-xs font-black text-[#0B3B68] font-mono">{job.requestNumber || job.id}</span>
          </div>

          {/* Request Status Bar */}
          <BookingStatusBar
            status={job.status}
            rawStatus={job.rawStatus}
            role="worker"
            preferredDate={job.preferredDate || job.scheduledDate}
            preferredTime={job.preferredTime}
            scheduledAt={job.scheduledDate}
            acceptedOn={job.acceptedTime}
            isAccepted={isAccepted}
            declineReason={job.declineReason}
            cancelledReason={job.cancelledReason}
          />

          <div className="flex gap-4 mb-6">
            <HomeownerAvatar
              src={job.homeownerAvatar}
              name={job.name}
              className="w-14 h-14 border border-pink-100 shadow-sm"
              fallbackClassName="bg-gradient-to-br from-[#FFEAF3] to-[#FFF8FB] text-[#0B3B68]"
            />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-gray-900 text-lg">{job.name}</h3>
              <span className={`${statusClassName} inline-flex w-fit items-center justify-center whitespace-nowrap leading-none text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-[0.14em]`}>
                  {job.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                <MapPinIcon className="w-3.5 h-3.5 text-[#0085FF]" /> {job.location}
              </p>
              {job.address && (
                <p className="mt-1 text-[11px] text-gray-500">Landmark: {job.address}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center text-amber-500 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                  <span className="font-bold text-gray-900">{homeownerRating > 0 ? homeownerRating.toFixed(1) : 'New'}</span>
                </div>
                {homeownerRatingCount > 0 && (
                  <span className="text-[10px] text-gray-400">({homeownerRatingCount} {homeownerRatingCount === 1 ? 'review' : 'reviews'} from workers)</span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mt-1">
                <PhoneIcon className="w-3.5 h-3.5 text-gray-300" /> {displayPhone}
              </p>
            </div>
          </div>

          {job.status === 'Cancelled' && job.cancelledReason && (
            <p className="text-[11px] text-gray-700 font-bold mb-6">
              Reason: <span className="font-medium text-gray-600">{job.cancelledReason}</span>
            </p>
          )}

          {job.status === 'Declined' && (
            <p className="text-[11px] text-gray-700 font-bold mb-6">
              Reason: <span className="font-medium text-gray-600">{job.declineReason || 'No reason provided.'}</span>
            </p>
          )}

          <div className="flex items-center gap-2 mb-6">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Service Type:</span>
            <span className="bg-[#DDEBFF] text-[#0057FF] px-4 py-1 rounded-full text-[11px] font-bold italic flex items-center gap-1.5 transition-all duration-300">
              <HammerIcon className="w-3.5 h-3.5" /> {job.needs}
            </span>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-gray-900 uppercase tracking-tight">Contact Information:</label>
            </div>
            <div className="space-y-1.5 pl-1">
              <p className="text-[11px] text-gray-600 flex items-center gap-2 font-medium">
                <span className="w-4">📧</span> {displayEmail}
              </p>
              <p className="text-[11px] text-gray-600 flex items-center gap-2 font-medium">
                <PhoneIcon className="w-4 h-4 text-gray-400" /> {displayPhone}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[11px] font-bold text-gray-900 mb-2 block uppercase tracking-tight">Problem Description</label>
            <div className="bg-[#F3F3F3] rounded-xl p-4 min-h-[100px] text-[12px] text-gray-600 font-medium leading-relaxed">
              {job.description || "No description provided."}
            </div>
          </div>

          {/* Worker Reviews on Homeowner */}
          <div className="mb-6">
            <label className="text-[11px] font-bold text-gray-900 mb-2 block uppercase tracking-tight">
              Homeowner Reviews from Workers ({homeownerReviews.length})
            </label>
            {homeownerReviews.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {homeownerReviews.map((rev: any, idx: number) => (
                  <div key={rev._id || idx} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {rev.workerAvatar ? (
                          <img src={rev.workerAvatar} alt={rev.workerName} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0B3B68] text-[10px] font-bold flex items-center justify-center">
                            {(rev.workerName || 'W')[0]}
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-gray-800">{rev.workerName || 'Worker'}</span>
                          {rev.workerProfession && (
                            <span className="text-[10px] text-gray-400 ml-1">({rev.workerProfession})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-amber-500 text-xs font-bold">
                        ★ {Number(rev.rating || 0).toFixed(1)}
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-gray-600 italic mt-1">"{rev.comment}"</p>
                    )}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {rev.tags.map((t: string, tidx: number) => (
                          <span key={tidx} className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-[11px] text-gray-400 italic text-center">
                No worker reviews for this homeowner yet.
              </div>
            )}
          </div>

          {job.estimatedStartingCost && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Estimated Starting Cost
                </span>
                <p className="text-sm font-black text-emerald-700">
                  ₱{Number(job.estimatedStartingCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium text-right max-w-[170px] leading-tight">
                Baseline starting rate in PHP. Price may vary based on on-site inspection.
              </span>
            </div>
          )}

          <div className="space-y-1 mb-6">
            <p className="text-[10px] text-gray-400 font-bold uppercase">
              Preferred Schedule: <span className="text-gray-500 font-medium italic normal-case">{preferredSchedule}</span>
            </p>
            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 uppercase">
              <CalendarIcon className="w-3.5 h-3.5" /> 
              {job.status === 'Completed' ? `Completed: ${job.completionTime || job.time}` : 
               job.status === 'Cancelled' ? `Cancelled: ${job.cancelledTime || job.time}` :
               (job.status === 'In Progress' || job.status === 'Accepted') ? `Accepted: ${job.acceptedTime || job.time}` :
               job.status === 'Declined' ? `Declined: ${job.requestSentAt || job.time}` :
               `Request sent: ${job.requestSentAt || job.time}`}
            </p>
          </div>

          {job.status === 'Completed' && job.hasReview && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <label className="text-[11px] font-bold text-gray-900 mb-4 block uppercase tracking-tighter">Review</label>
              <div className="bg-[#F8F8F8] rounded-2xl p-5 border border-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <HomeownerAvatar
                      src={job.homeownerAvatar}
                      name={job.name}
                      className="w-9 h-9 border border-pink-100 shadow-sm"
                      fallbackClassName="bg-gradient-to-br from-[#FFEAF3] to-[#FFF8FB] text-[#0B3B68]"
                      initialsClassName="text-[9px] font-bold"
                    />
                    <div>
                      <h4 className="text-[12px] font-bold text-gray-900 leading-none mb-1">{job.name}</h4>
                      <div className="flex text-yellow-400 text-[10px] items-center">
                        {'★'.repeat(Math.floor(job.rating || 0))}
                        <span className="text-gray-400 ml-1.5 font-bold">{job.rating?.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold">{job.reviewDate}</span>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] text-gray-600 leading-relaxed font-medium italic">
                    "{job.reviewText}"
                  </p>
                </div>
                {Array.isArray(job.reviewTags) && job.reviewTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.reviewTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8F8F5] text-[#00AF91] border border-[#BDE5DB]"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {job.status === 'Completed' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  if (onViewEReceipt) onViewEReceipt(job);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest bg-[#0B3B68] text-white hover:bg-[#082d50] shadow-md transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                View E-Receipt &amp; Proof of Work
              </button>
            </div>
          )}

          {onOpenChat && (isAccepted || job.status !== 'Pending') && job.status !== 'Cancelled' && job.status !== 'Declined' && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => onOpenChat(job)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest bg-[#00AF91] text-white hover:bg-[#00967d] shadow-md transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Homeowner
              </button>
            </div>
          )}

          {job.status === 'Pending' && !isAccepted && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button 
                  onClick={() => { onClose(); onDecline(job); }} 
                  className="flex-1 py-3 border border-[#FF4D4D] text-[#FF4D4D] rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                >
                  Decline
                </button>
                <button 
                  onClick={() => onAccept(job)} 
                  className="flex-1 py-3 bg-[#00A651] text-white rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg transition-all"
                >
                  Accept
                </button>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <LockIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-tight font-medium italic">
                  After you accept, both of you will be able to see each other's contact details so you can coordinate directly.
                </p>
              </div>
            </div>
          )}

          {(job.status === 'Accepted' || (job.status === 'Pending' && isAccepted)) && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3.5 text-xs text-[#0B3B68]">
                <p className="font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Booking Request Accepted
                </p>
                <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                  You have accepted this request. It will move to In Progress on the scheduled date ({preferredSchedule}).
                </p>
              </div>

              {job.rescheduleRequest?.status === 'pending' ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800">
                    Reschedule Request Pending
                  </p>
                  <p className="text-[11px] mt-1 text-amber-900">
                    Proposed: <span className="font-semibold">{job.rescheduleRequest.proposedDate} at {job.rescheduleRequest.proposedTime}</span>
                  </p>
                  {job.rescheduleRequest.reason && (
                    <p className="text-[10px] text-amber-700 italic mt-0.5">
                      Reason: "{job.rescheduleRequest.reason}"
                    </p>
                  )}
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    Waiting for homeowner confirmation.
                  </p>
                </div>
              ) : (
                onProposeReschedule && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onProposeReschedule(job);
                    }}
                    className="w-full py-2.5 rounded-full border border-[#0B3B68] text-[#0B3B68] hover:bg-blue-50 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Propose New Date / Time
                  </button>
                )
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); onCancelBooking(job); }}
                  className="flex-1 py-3 border border-[#FF4D4D] text-[#FF4D4D] rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all cursor-pointer"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          )}

          {job.status === 'In Progress' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); onCancelBooking(job); }}
                  className="flex-1 py-3 border border-[#FF4D4D] text-[#FF4D4D] rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                >
                  Cancel Booking
                </button>
                <button
                  onClick={() => { onClose(); onComplete(job); }}
                  className="flex-1 py-3 bg-[#00A651] text-white rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg transition-all"
                >
                  Mark Completed
                </button>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <LockIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-[10px] leading-tight font-medium italic">
                  Once the work is finished, use Mark Completed to close the transaction for both sides.
                </p>
              </div>
            </div>
          )}

          {(job.status === 'Cancelled' || job.status === 'Declined') && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">
                  {job.status === 'Cancelled' ? 'Cancelled Request' : 'Declined Request'}
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {job.status === 'Cancelled'
                    ? 'This booking is no longer active. You can review it here, but no more actions are available.'
                    : 'This request was declined and removed from your active queue.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
