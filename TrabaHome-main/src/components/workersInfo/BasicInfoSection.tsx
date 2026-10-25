import React from 'react';
import type { BasicInfoSectionProps } from '../../types/Worker.types.ts';

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ 
  profile, 
  isEditing, 
  onToggleEdit, 
  onInputChange, 
  onImageUpload 
}) => {
  const languagesValue = Array.isArray(profile.languages) ? profile.languages.join(', ') : String(profile.languages || '');
  const availabilityOptions = ['Online', 'Offline', 'On Vacation', 'Day Off', 'Busy', 'Available'];
  const scheduleOptions = [
    'Mon-Fri, 7AM-5PM',
    'Mon-Fri, 8AM-5PM',
    'Mon-Sat, 7AM-5PM',
    'Mon-Sat, 8AM-6PM',
    'Mon-Sun, 7AM-5PM',
    '24/7',
  ];
  const selectedAvailability = profile.availabilityStatus || 'Available';
  const selectedSchedule = profile.workingSchedule || 'Mon-Fri, 7AM-5PM';

  const renderedAvailabilityOptions = availabilityOptions.includes(selectedAvailability)
    ? availabilityOptions
    : [selectedAvailability, ...availabilityOptions];
  const renderedScheduleOptions = scheduleOptions.includes(selectedSchedule)
    ? scheduleOptions
    : [selectedSchedule, ...scheduleOptions];

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Profile Details</h3>
          <p className="text-xs text-gray-500 mt-1">
            Update your profile details here. This will be visible in Homeowners.
          </p>
        </div>
        <button
          onClick={onToggleEdit}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-[0.18em] border transition-all ${
            isEditing
              ? 'bg-[#00A651] text-white border-[#00A651]'
              : 'text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {isEditing ? 'Save changes' : 'Edit details'}
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Bio / Description
          </label>
          <textarea
            name="bio"
            disabled={!isEditing}
            value={profile.bio}
            onChange={onInputChange}
            placeholder="Tell homeowners what you do, how you work, and what makes you reliable."
            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl h-28 text-sm resize-none focus:outline-none focus:border-[#00A651] disabled:cursor-default disabled:bg-gray-50"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Years of Experience
            </label>
            <input
              name="yearsExperience"
              type="number"
              min="0"
              disabled={!isEditing}
              value={profile.yearsExperience}
              onChange={onInputChange}
              placeholder="Example: 3"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl h-11 text-sm focus:outline-none focus:border-[#00A651] disabled:cursor-default disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Languages
            </label>
            <input
              name="languages"
              disabled={!isEditing}
              value={languagesValue}
              onChange={onInputChange}
              placeholder="English, Filipino"
              className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl h-11 text-sm focus:outline-none focus:border-[#00A651] disabled:cursor-default disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Availability Status
            </label>
            <div className="relative">
            <select
              name="availabilityStatus"
              disabled={!isEditing}
              value={selectedAvailability}
              onChange={onInputChange}
              className="w-full appearance-none p-3 pr-10 bg-gray-50 border border-gray-100 rounded-xl h-11 text-sm focus:outline-none focus:border-[#00A651] disabled:cursor-default disabled:bg-gray-50"
            >
              <option value="" disabled>
                Select availability
              </option>
              {renderedAvailabilityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
              Working Schedule
            </label>
            <div className="relative">
            <select
              name="workingSchedule"
              disabled={!isEditing}
              value={selectedSchedule}
              onChange={onInputChange}
              className="w-full appearance-none p-3 pr-10 bg-gray-50 border border-gray-100 rounded-xl h-11 text-sm focus:outline-none focus:border-[#00A651] disabled:cursor-default disabled:bg-gray-50"
            >
              <option value="" disabled>
                Select schedule
              </option>
              {renderedScheduleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;
