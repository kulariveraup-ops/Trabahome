import React, { useState, useEffect } from 'react';
import {
  Upload,
  CheckCircle,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronDown,
  Loader2,
  ShieldCheck,
  AlertCircle,
  FileText,
  Camera,
} from 'lucide-react';
import type { StepThreeProps } from '../../types/Worker.types.ts';
import {
  PANGASINAN_PROVINCE,
  getPangasinanBarangays,
  professionOptions,
  pangasinanCities,
  idTypes,
} from '../../constants/SignUpData.ts';
import { fetchPublicSkills } from '../../services/AdminApi.ts';

const StepThree: React.FC<StepThreeProps> = ({
  formData,
  errors,
  onInputChange,
  onIdCardUpload,
  onSelfieUpload,
  onRemoveIdCard,
  onRemoveSelfie,
  isAiVerifying,
  aiVerificationError,
  onProofOfWorkUpload,
  onSubmit,
  onBack,
  isLoading,
}) => {
  const [isProfessionOpen, setIsProfessionOpen] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>(professionOptions);

  useEffect(() => {
    let isMounted = true;
    fetchPublicSkills()
      .then((res) => {
        if (!isMounted) return;
        if (res?.skills && Array.isArray(res.skills) && res.skills.length > 0) {
          const names = res.skills.map((s: any) => s.name).filter(Boolean);
          // Combine dynamic skills with existing default options to guarantee broad list
          const combined = Array.from(new Set([...names, ...professionOptions]));
          setAvailableSkills(combined);
        }
      })
      .catch(() => {
        // Fallback to static list
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedProfessions = (formData.profession || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const handleToggleProfession = (prof: string) => {
    let next: string[];
    if (selectedProfessions.includes(prof)) {
      if (selectedProfessions.length <= 1) return;
      next = selectedProfessions.filter((p) => p !== prof);
    } else {
      next = [...selectedProfessions, prof];
    }
    onInputChange({
      target: {
        name: 'profession',
        value: next.join(', '),
      },
    } as React.ChangeEvent<any>);
  };

  const availableBarangays = getPangasinanBarangays(formData.city);
  const isCityValid = !!formData.city && formData.city !== 'Select your City / Municipality' && formData.city !== 'City or Municipality';
  const isAiVerified = formData.aiVerificationStatus === 'verified' || formData.aiVerificationResult?.isVerified === true;
  const isProfessionValid = selectedProfessions.length >= 1;
  const isSubmitDisabled = isLoading || isAiVerifying || !isProfessionValid || !isCityValid || !formData.barangay || !isAiVerified;

  return (
    <div className="space-y-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading || isAiVerifying}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#004A8C] dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Step 1 (Account Details)</span>
        </button>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          Step 2: Professional Details &amp; ID Verification
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Select your trade, service area, and upload your Philippine valid government ID.
        </p>
      </div>

      {/* ── SECTION 1: PROFESSIONAL & SERVICE AREA ────────────────── */}
      <div className="space-y-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/50 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-400 flex items-center gap-1.5">
          <FileText size={15} />
          <span>Trade &amp; Service Location</span>
        </h3>

        <div className="space-y-3">
          {/* Profession Multi-select (1 or more, no limit) */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
                Profession / Primary Trade *
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedProfessions.length >= 1
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                }`}
              >
                {selectedProfessions.length} selected (min 1)
              </span>
            </div>

            {/* Selected Pills */}
            {selectedProfessions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                {selectedProfessions.map((prof) => (
                  <span
                    key={prof}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-300 border border-[#004A8C]/20"
                  >
                    {prof}
                    {selectedProfessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProfession(prof);
                        }}
                        className="hover:text-red-500 transition-colors cursor-pointer"
                        title="Remove profession"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Dropdown toggle button */}
            <button
              type="button"
              onClick={() => setIsProfessionOpen(!isProfessionOpen)}
              className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm outline-none bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 flex items-center justify-between cursor-pointer hover:border-[#004A8C] dark:hover:border-blue-500 transition-colors"
            >
              <span>
                {selectedProfessions.length === 0
                  ? 'Choose skills / professions'
                  : `${selectedProfessions.length} profession${selectedProfessions.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-gray-400 ${isProfessionOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Options List */}
            {isProfessionOpen && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl max-h-56 overflow-y-auto space-y-1.5 z-20">
                <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">
                  Choose your trade skills (select all that apply):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {availableSkills.map((prof) => {
                    const isChecked = selectedProfessions.includes(prof);
                    return (
                      <label
                        key={prof}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[#004A8C]/10 dark:bg-blue-900/30 text-[#004A8C] dark:text-blue-300 font-semibold'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-750 text-gray-700 dark:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleProfession(prof)}
                          className="rounded text-[#004A8C] focus:ring-[#004A8C] h-4 w-4"
                        />
                        <span className="truncate">{prof}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            {errors?.profession && (
              <p className="text-[10px] text-red-500 px-1">{errors.profession}</p>
            )}
          </div>

          {/* Province (display only) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-tight">Service Coverage Province</label>
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
              <div className="px-4 py-3 text-xs text-gray-400 dark:text-slate-400 font-medium border-r border-gray-200 dark:border-slate-700">Province</div>
              <div className="px-4 py-3 text-xs text-gray-700 dark:text-slate-200 font-semibold">{PANGASINAN_PROVINCE}</div>
            </div>
            <p className="text-[9px] text-gray-400 dark:text-slate-500 italic px-1">Currently serving selected municipalities and cities within Pangasinan.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* City */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 tracking-tight">City or Municipality *</label>
              <select
                name="city"
                value={formData.city || ''}
                onChange={(e) => {
                  onInputChange(e);
                  const barangayEvent = {
                    target: {
                      name: 'barangay',
                      value: ''
                    }
                  } as React.ChangeEvent<HTMLSelectElement>;
                  onInputChange(barangayEvent);
                }}
                className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg text-sm outline-none bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="" disabled hidden>Select City / Municipality</option>
                {pangasinanCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors?.city && (
                <p className="text-[10px] text-red-500 px-1">{errors.city}</p>
              )}
            </div>

            {/* Barangay */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-700 dark:text-slate-300 tracking-tight">Barangay *</label>
              <select
                name="barangay"
                value={formData.barangay || ''}
                onChange={onInputChange}
                disabled={!formData.city}
                className={`w-full p-3 rounded-lg text-sm outline-none ${
                  formData.city
                    ? 'border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100'
                    : 'bg-gray-100 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700'
                }`}
              >
                <option value="" disabled hidden>Select Barangay</option>
                {availableBarangays.map(barangay => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
              {!formData.city && (
                <p className="text-[9px] text-gray-400 dark:text-slate-500 italic px-1">Select a city or municipality first</p>
              )}
              {formData.city && availableBarangays.length === 0 && (
                <p className="text-[9px] text-orange-500 italic px-1">Barangay data not yet available for this city</p>
              )}
              {errors?.barangay && (
                <p className="text-[10px] text-red-500 px-1">{errors.barangay}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: ID VERIFICATION ────────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-850/50 p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#004A8C] dark:text-blue-400" size={20} />
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">
              ID Verification
            </h3>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
            Upload a valid Philippine Government ID and a selfie holding the ID.
          </p>
        </div>

        {/* 1. Select Philippine Government-Issued ID * */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
            1. Select Philippine Government-Issued ID *
          </label>
          <select
            name="idType"
            value={formData.idType || ''}
            onChange={onInputChange}
            disabled={isAiVerifying}
            className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-xl text-sm outline-none bg-white dark:bg-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#004A8C]/20"
          >
            {idTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors?.idType && (
            <p className="text-[10px] text-red-500 px-1">{errors.idType}</p>
          )}
        </div>

        {/* 2-Column Upload Cards: 2. Upload Valid ID (Front) * & 3. Upload Selfie with the ID * */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Column A: 2. Upload Valid ID (Front) * */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText size={14} className="text-[#004A8C] dark:text-blue-400" />
                <span>2. Upload Valid ID (Front) *</span>
              </label>
              {formData.idFront && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> Attached
                </span>
              )}
            </div>

            {formData.idFrontPreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-slate-700 bg-black/5 h-44 group shadow-sm">
                <img
                  src={formData.idFrontPreview}
                  alt="Philippine Valid ID preview"
                  className="w-full h-full object-contain bg-slate-900/10 dark:bg-slate-950/60"
                />
                <button
                  type="button"
                  onClick={onRemoveIdCard}
                  disabled={isAiVerifying}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-all shadow-md cursor-pointer"
                  title="Remove and re-upload ID photo"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md">
                  Philippine Government ID
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl h-44 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-[#004A8C] hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-all text-center group bg-white/70 dark:bg-slate-800/40">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onIdCardUpload}
                  disabled={isAiVerifying}
                />
                <div className="w-11 h-11 rounded-2xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Upload size={20} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200">Click to Upload ID Photo</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">
                  PNG, JPG, or WEBP. Ensure all 4 corners and details are clearly readable.
                </span>
              </label>
            )}
          </div>

          {/* Column B: 3. Upload Selfie with the ID * */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera size={14} className="text-[#004A8C] dark:text-blue-400" />
                <span>3. Upload Selfie with the ID *</span>
              </label>
              {formData.selfie && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 size={12} /> Attached
                </span>
              )}
            </div>

            {formData.selfiePreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-slate-700 bg-black/5 h-44 group shadow-sm">
                <img
                  src={formData.selfiePreview}
                  alt="Selfie with ID preview"
                  className="w-full h-full object-contain bg-slate-900/10 dark:bg-slate-950/60"
                />
                <button
                  type="button"
                  onClick={onRemoveSelfie}
                  disabled={isAiVerifying}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition-all shadow-md cursor-pointer"
                  title="Remove and re-upload selfie"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md">
                  Selfie with ID
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl h-44 flex flex-col items-center justify-center p-4 cursor-pointer hover:border-[#004A8C] hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-all text-center group bg-white/70 dark:bg-slate-800/40">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={onSelfieUpload}
                  disabled={isAiVerifying}
                />
                <div className="w-11 h-11 rounded-2xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Camera size={20} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-slate-200">Click to Upload Selfie with ID</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5 leading-tight">
                  Hold your ID card next to your face in a well-lit area. Ensure your face is not covered.
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Automatic Verification Feedback */}
        <div className="pt-2">
          {isAiVerifying && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3.5 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300 animate-pulse">
              <Loader2 size={18} className="animate-spin text-[#004A8C] dark:text-blue-400 shrink-0" />
              <span>Checking uploaded ID and selfie automatically... Please wait.</span>
            </div>
          )}

          {aiVerificationError && !isAiVerifying && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3.5 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300 animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold block">ID Verification Error</strong>
                <p className="mt-0.5 leading-relaxed">{aiVerificationError}</p>
                <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-semibold">
                  Please re-upload a clear, valid Philippine Government ID and selfie holding the ID.
                </p>
              </div>
            </div>
          )}

          {isAiVerified && !isAiVerifying && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-3 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
              <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">ID Verified Successfully</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Your Philippine Government ID and selfie have been verified.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: PROOF OF WORK (OPTIONAL) ────────────────────── */}
      <div className="space-y-2 mt-4">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-tight">
            Proof of Work / Past Projects (Optional)
          </label>
          <span className="text-[10px] text-gray-400 dark:text-slate-500">Up to 4 photos</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative">
              {formData.proofOfWorkPreviews && formData.proofOfWorkPreviews[i] ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-slate-700 h-20 group bg-gray-100 dark:bg-slate-800">
                  <img
                    src={formData.proofOfWorkPreviews[i]}
                    alt={`Proof of work ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fakeEvent = {
                        target: {
                          files: null,
                          dataset: { index: i.toString() }
                        }
                      } as any;
                      onProofOfWorkUpload(fakeEvent);
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5">
                    <CheckCircle size={8} />
                    <span>{i + 1}</span>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl h-20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors relative overflow-hidden hover:border-[#004A8C]">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    data-index={i}
                    onChange={onProofOfWorkUpload}
                  />
                  <Upload size={16} className="text-gray-400 mb-0.5" />
                  <span className="text-[8px] text-gray-400 font-bold">Photo {i + 1}</span>
                </label>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTION BUTTONS: BACK & REVIEW / SUBMIT ────────────────── */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading || isAiVerifying}
              className="px-5 py-3.5 rounded-xl font-semibold text-sm border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft size={18} />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitDisabled}
            className={`
              relative flex-1 py-3.5 px-6 rounded-xl font-bold text-sm
              flex items-center justify-center gap-2
              transition-all duration-200 ease-in-out
              overflow-hidden group cursor-pointer
              ${
                isSubmitDisabled
                  ? 'bg-[#004A8C]/60 cursor-not-allowed text-white/80'
                  : 'bg-[#004A8C] text-white shadow-lg hover:bg-[#003666] active:scale-[0.99]'
              }
            `}
          >
            {!isSubmitDisabled && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            )}

            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting Registration...</span>
              </>
            ) : (
              <>
                <span>Review &amp; Submit Application</span>
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        {!isAiVerified && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center font-medium flex items-center justify-center gap-1 mt-1">
            <AlertCircle size={13} />
            <span>Please upload a valid Philippine ID and selfie to complete ID verification.</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default StepThree;
