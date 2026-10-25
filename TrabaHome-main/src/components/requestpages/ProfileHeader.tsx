import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, HammerIcon, Loader2 } from 'lucide-react';
import type { ProfileHeaderProps } from '../../types/Worker.types.ts';
import { getWorkerAvailabilityStyle } from '../../utils/workerAvailability.ts';

const STATUS_OPTIONS = [
  { value: 'Online', label: 'Online', desc: 'Available for new service requests' },
  { value: 'Busy', label: 'Busy', desc: 'Currently working on requests' },
  { value: 'On Vacation', label: 'On Vacation', desc: 'Away on vacation' },
  { value: 'Day Off', label: 'Day Off', desc: 'Off-duty for the day' },
  { value: 'Offline', label: 'Offline', desc: 'Not taking requests' },
];

const getInitials = (name: string) => {
  const parts = String(name || "").split(" ").filter(Boolean);
  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
};

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isEditing = false,
  onAvatarUpload,
  onStatusChange,
  isStatusUpdating = false,
  isAvatarUploading = false,
  onSeeReviews,
  isReviewsLoading = false,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => getInitials(profile.fullName), [profile.fullName]);
  const avatarSrc = String(profile.avatar || "").trim();
  const showImage = Boolean(avatarSrc) && !avatarError;

  const currentStatus = String(profile.availabilityStatus || 'Online').trim();
  const statusStyle = getWorkerAvailabilityStyle(currentStatus);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarSrc]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };
    if (isStatusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusMenuOpen]);

  const handleSelectStatus = (statusValue: string) => {
    setIsStatusMenuOpen(false);
    if (onStatusChange && statusValue !== currentStatus) {
      onStatusChange(statusValue);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
      <div className="flex items-center gap-3.5 sm:gap-5">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full overflow-hidden shrink-0 ring-4 ring-[#F0F9F6] flex items-center justify-center">
            {showImage ? (
              <img
                src={avatarSrc}
                alt={profile.fullName}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <span className="text-base sm:text-lg font-bold text-[#00A651]">{initials || "?"}</span>
            )}
          </div>
          {onAvatarUpload ? (
            <>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isAvatarUploading}
                className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#00A651] text-white shadow-md hover:bg-[#008f45] transition-all disabled:opacity-75"
                aria-label="Upload profile photo"
                title="Upload profile photo"
              >
                {isAvatarUploading ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onAvatarUpload}
              />
            </>
          ) : null}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{profile.fullName}</h2>
            {profile.isVerified ? (
              <div className="w-4 h-4 bg-[#0085FF] rounded-full flex items-center justify-center">
                <span className="text-[8px] text-white font-bold">✓</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="bg-[#EBF7F3] text-[#00A651] px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <HammerIcon className="w-3 h-3" /> {profile.profession}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
              <span className="text-yellow-400 text-sm">★</span> 
              <span className="font-bold text-gray-700">{profile.rating}</span> | {profile.ratingsCount} Ratings 
              <button
                type="button"
                onClick={onSeeReviews}
                disabled={!onSeeReviews || isReviewsLoading}
                className="text-[#0085FF] hover:underline ml-1 disabled:cursor-wait disabled:opacity-60"
              >
                {isReviewsLoading ? ' (Loading...)' : ' (See Reviews)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Selector Section */}
      <div className="relative self-start sm:self-center" ref={statusMenuRef}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">My Status:</span>
          {onStatusChange ? (
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              disabled={isStatusUpdating}
              className={`${statusStyle.pillClassName} cursor-pointer hover:shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2 py-1.5 px-3.5`}
              title="Click to change your work availability status"
            >
              <span className={`w-2 h-2 rounded-full ${statusStyle.dotClassName}`} />
              <span className="font-bold text-xs">{currentStatus}</span>
              {isStatusUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          ) : (
            <span className={statusStyle.pillClassName}>
              <span className={`w-2 h-2 rounded-full ${statusStyle.dotClassName}`} />
              {currentStatus}
            </span>
          )}
        </div>

        {/* Status Dropdown Menu */}
        {isStatusMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Set Availability Status</p>
            </div>
            <div className="py-1">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = currentStatus.toLowerCase() === opt.value.toLowerCase();
                const optStyle = getWorkerAvailabilityStyle(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectStatus(opt.value)}
                    className={`w-full px-3 py-2 text-left flex items-start gap-2.5 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${optStyle.dotClassName}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-[#00A651]' : 'text-gray-800'}`}>
                          {opt.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#00A651]" />}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
