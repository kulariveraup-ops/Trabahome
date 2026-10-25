import React from 'react';
import { Upload } from 'lucide-react';
import type { ProofOfWorkSectionProps } from '../../types/Worker.types.ts';

const ProofOfWorkSection: React.FC<ProofOfWorkSectionProps> = ({
  profile,
  isEditing,
  onImageUpload,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-800">Proof of Work / Portfolio</h3>
        <p className="text-xs text-gray-500 mt-1">
          These images appear on your public profile. Keep them clear and recent.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {profile.images.map((img, idx) => (
          <label
            key={idx}
            className={`group relative aspect-square rounded-2xl border-2 border-dashed overflow-hidden transition-all ${
              isEditing
                ? 'cursor-pointer border-gray-200 bg-gray-50 hover:border-[#00A651] hover:bg-[#F6FCF8]'
                : 'cursor-default border-gray-100 bg-gray-50'
            }`}
          >
            {img ? (
              <img
                src={img}
                className="w-full h-full object-cover"
                alt={`Proof ${idx + 1}`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-300 text-2xl font-light">
                  +
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-3">
                  {isEditing ? 'Add photo' : 'No photo uploaded'}
                </p>
              </div>
            )}
            {isEditing ? (
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => onImageUpload(idx, e)}
              />
            ) : null}
          </label>
        ))}
      </div>
    </div>
  );
};

export default ProofOfWorkSection;
