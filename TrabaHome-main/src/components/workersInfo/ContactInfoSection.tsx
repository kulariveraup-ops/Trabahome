import React from 'react';
import { LockIcon, Mail, MapPin, Phone, UserRound, Briefcase, Pencil } from 'lucide-react';
import type { ContactInfoSectionProps } from '../../types/Worker.types.ts';

const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({ 
  profile,
  onContactSupport,
  onEditDetails,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-800">Account Details</h3>
          {profile.pendingProfileUpdate?.status === 'pending' && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
              Edits Pending Approval
            </span>
          )}
        </div>
        {onEditDetails && (
          <button
            type="button"
            onClick={onEditDetails}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#004A8C] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
              <UserRound className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.fullName || 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Profession</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.profession || 'Not set'}</p>
            </div>
          </div>
        </div>

        {[
          ['Barangay', profile.barangay],
          ['Municipality / City', profile.city],
          ['Province', profile.province],
          ['Address / Location', profile.locationLabel || profile.location],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 break-words">{value || 'Not set'}</p>
              </div>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone Number</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{profile.phone || 'Not set'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{profile.email || 'Not set'}</p>
            </div>
          </div>
        </div>

        {profile.facebook ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[#00A651]">
                <span className="text-xs font-bold">f</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Facebook</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{profile.facebook}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-2 text-gray-400">
        <div className="flex items-center gap-2">
          <LockIcon className="w-3.5 h-3.5 shrink-0" />
          <p className="text-[10px] font-medium italic">
            You can request changes to your name, trade, phone, or location directly using the "Edit Details" button. Updates take effect once approved by the administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoSection;
