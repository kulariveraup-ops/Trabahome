import React from 'react';
import { Briefcase, Hash, MapPin, Phone, Hammer, Calendar, X, Star, Mail } from 'lucide-react';
import HomeownerAvatar from '../shared/HomeownerAvatar.tsx';
import BookingStatusBar from '../shared/BookingStatusBar.tsx';
import { formatScheduleDateTime } from '../../utils/formatDateTime.ts';
import type { Request } from '../../types/Worker.types.ts';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
  onAccept?: (request: Request) => void;
  onDecline?: (request: Request) => void;
}

const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ isOpen, onClose, request, onAccept, onDecline }) => {
  if (!isOpen || !request) return null;

  const isAccepted = Boolean(
    request.isAccepted ||
    request.acceptedOn ||
    ["accepted", "ongoing", "in_progress", "completed"].includes(
      String(request.rawStatus || request.status || "").trim().toLowerCase()
    )
  );
  const homeownerRating = typeof request.homeownerRating === 'number' ? request.homeownerRating : 0;
  const homeownerRatingCount = request.homeownerRatingCount || 0;
  const homeownerReviews = Array.isArray(request.homeownerReviews) ? request.homeownerReviews : [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 text-left flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 z-10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-6 border-b border-gray-50 flex items-center gap-3 shrink-0">
          <div className="bg-gray-50 p-2 rounded-lg">
            <Briefcase className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Request Details</h2>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Status Bar */}
          <BookingStatusBar
            status={request.status}
            rawStatus={request.rawStatus}
            role="worker"
            preferredDate={request.preferredDate}
            preferredTime={request.preferredTime}
            scheduledAt={request.schedule}
            acceptedOn={request.acceptedOn}
            isAccepted={isAccepted}
            declineReason={request.declineReason}
          />

          <div className="flex items-center gap-4 mb-6">
            <HomeownerAvatar
              src={request.avatar}
              name={request.name}
              className="w-14 h-14 border border-pink-100 shadow-sm"
              fallbackClassName="bg-gradient-to-br from-[#FFEAF3] to-[#FFF8FB] text-[#0B3B68]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">{request.name || "Homeowner"}</h3>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                  isAccepted ? 'bg-emerald-600 text-white' : 'bg-[#FFB800] text-white'
                }`}>
                  {request.status || "Pending"}
                </span>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#0085FF]" /> {request.location}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center text-amber-500 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                  <span className="font-bold text-gray-900">{homeownerRating > 0 ? homeownerRating.toFixed(1) : 'New'}</span>
                </div>
                {homeownerRatingCount > 0 && (
                  <span className="text-[10px] text-gray-400">({homeownerRatingCount} {homeownerRatingCount === 1 ? 'review' : 'reviews'} from workers)</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1 font-medium">
                <Hash className="w-3 h-3 text-gray-300" /> Request #{request.requestNumber || request.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase">Needs:</span>
            <span className="bg-[#DDEBFF] text-[#0057FF] px-3 py-1.5 rounded-md text-[11px] font-bold italic flex items-center gap-1.5">
              <Hammer className="w-3.5 h-3.5" /> {request.needs}
            </span>
          </div>

          {/* Contact Information (Hidden until accepted) */}
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#00AF91]" />
                Contact Information
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAccepted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isAccepted ? '✓ Available' : '🔒 Hidden until accepted'}
              </span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-gray-400" /> Phone:
                </span>
                <span className="font-semibold text-gray-800">
                  {isAccepted
                    ? (request.contactNumber || 'Not provided')
                    : (request.contactNumber ? `${request.contactNumber.slice(0, 4)}•••••••` : '•••••••••••')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-gray-400" /> Email:
                </span>
                <span className="font-semibold text-gray-800">
                  {isAccepted
                    ? (request.email || 'Not provided')
                    : (request.email ? `${request.email.slice(0, 3)}••••@••••.com` : '••••••••@••••.com')}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-900 mb-2">Problem Description</h4>
            <div className="bg-gray-50 rounded-xl p-4 min-h-[100px]">
              <p className="text-sm text-gray-600 italic">"{request.description}"</p>
            </div>
          </div>

          {/* Homeowner Reviews from Workers */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-gray-900 mb-2">
              Homeowner Reviews from Workers ({homeownerReviews.length})
            </h4>
            {homeownerReviews.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {homeownerReviews.map((rev: any, idx: number) => (
                  <div key={rev._id || idx} className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {rev.workerAvatar ? (
                          <img src={rev.workerAvatar} alt={rev.workerName} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-[#0B3B68] text-[9px] font-bold flex items-center justify-center">
                            {(rev.workerName || 'W')[0]}
                          </div>
                        )}
                        <span className="text-xs font-bold text-gray-800">{rev.workerName || 'Worker'}</span>
                        {rev.workerProfession && (
                          <span className="text-[10px] text-gray-400">({rev.workerProfession})</span>
                        )}
                      </div>
                      <span className="text-amber-500 text-xs font-bold">★ {Number(rev.rating || 0).toFixed(1)}</span>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-gray-600 italic">"{rev.comment}"</p>
                    )}
                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
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
              <div className="bg-gray-50 rounded-xl p-2.5 text-[11px] text-gray-400 italic text-center">
                No worker reviews for this homeowner yet.
              </div>
            )}
          </div>

          <div className="space-y-2 mb-8 text-xs text-gray-500">
            <p>Preferred Schedule: <span className="italic font-bold text-gray-700">{formatScheduleDateTime(request.preferredDate, request.preferredTime, request.schedule) || request.schedule}</span></p>
            <p className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" /> Request sent: {request.time}
            </p>
          </div>

          {!isAccepted && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => onDecline?.(request)}
                className="py-3 border border-[#FF4D4D] text-[#FF4D4D] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => onAccept?.(request)}
                className="py-3 bg-[#00A651] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 shadow-lg transition-colors"
              >
                Accept
              </button>
            </div>
          )}

          {isAccepted && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/80 p-3.5 text-xs text-[#0B3B68]">
              <p className="font-bold flex items-center gap-1.5">
                ✓ Booking Request Accepted
              </p>
              <p className="mt-1 text-[11px] text-gray-600 leading-relaxed">
                You have accepted this request. Contact details are now available above.
              </p>
            </div>
          )}

          {!isAccepted && (
            <div className="flex items-center gap-2 justify-center py-2 text-center">
              <span className="text-[10px] text-gray-400">🔒 After you accept, both can see contact details.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsModal;
