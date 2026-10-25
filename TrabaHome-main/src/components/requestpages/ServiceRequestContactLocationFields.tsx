import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  CheckCircle2,
} from "lucide-react";
import { CalendarIcon, ClockIcon } from "../../Icons.jsx";
import {
  PANGASINAN_PROVINCE,
  getPangasinanBarangays,
  pangasinanCities,
} from "../../constants/SignUpData.ts";
import { fetchPublicSkills } from "../../services/AdminApi.ts";

export interface ActiveWorkerBookingSchedule {
  preferredDate: string;
  preferredTime: string;
}

export type ServiceRequestContactLocationFieldsProps = {
  serviceType?: string;
  onServiceTypeChange?: (value: string) => void;
  workerServices?: string[];
  contactNumber: string;
  city: string;
  barangay: string;
  address: string;
  description: string;
  preferredDate: string;
  preferredTime: string;
  showValidationErrors?: boolean;
  priceAgreementChecked?: boolean;
  onPriceAgreementChange?: (checked: boolean) => void;
  onContactNumberChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onBarangayChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPreferredDateChange: (value: string) => void;
  onPreferredTimeChange: (value: string) => void;
  activeWorkerBookings?: ActiveWorkerBookingSchedule[];
};

const fieldClassName =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm outline-none transition-colors focus:border-[#00AF91] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-[#00AF91]";
const disabledFieldClassName =
  "h-11 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-400 shadow-sm outline-none cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500";
const labelClassName = "flex min-w-0 flex-col gap-1.5 text-sm font-bold text-[#111] dark:text-slate-200";
const errorClassName = "text-xs font-medium text-red-600 dark:text-red-400";

export default function ServiceRequestContactLocationFields({
  serviceType = "",
  onServiceTypeChange,
  workerServices = [],
  contactNumber,
  city,
  barangay,
  address,
  description,
  preferredDate,
  preferredTime,
  showValidationErrors = false,
  priceAgreementChecked,
  onPriceAgreementChange,
  onContactNumberChange,
  onCityChange,
  onBarangayChange,
  onAddressChange,
  onDescriptionChange,
  onPreferredDateChange,
  onPreferredTimeChange,
  activeWorkerBookings = [],
}: ServiceRequestContactLocationFieldsProps) {
  const [internalAgreement, setInternalAgreement] = useState(false);
  const agreement = priceAgreementChecked !== undefined ? priceAgreementChecked : internalAgreement;
  const setAgreement = onPriceAgreementChange || setInternalAgreement;

  // Normalize available worker services list
  const availableServices = useMemo(() => {
    if (Array.isArray(workerServices) && workerServices.length > 0) {
      return Array.from(new Set(workerServices.map((s) => String(s || "").trim()).filter(Boolean)));
    }
    if (serviceType && String(serviceType).trim()) {
      return [String(serviceType).trim()];
    }
    return ["General Repair"];
  }, [workerServices, serviceType]);

  // If worker offers only 1 service, automatically fill out the service needed
  useEffect(() => {
    if (availableServices.length === 1 && onServiceTypeChange) {
      if (serviceType !== availableServices[0]) {
        onServiceTypeChange(availableServices[0]);
      }
    }
  }, [availableServices, serviceType, onServiceTypeChange]);

  const barangays = getPangasinanBarangays(city);

  // Load public skills for real-time estimated starting price
  const [skillsList, setSkillsList] = useState<any[]>([]);
  useEffect(() => {
    let isMounted = true;
    fetchPublicSkills()
      .then((res) => {
        if (isMounted && res?.skills && Array.isArray(res.skills)) {
          setSkillsList(res.skills);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const currentSkill = useMemo(() => {
    const target = String(serviceType || availableServices[0] || '').trim().toLowerCase();
    return skillsList.find((s) => String(s.name || '').trim().toLowerCase() === target) || null;
  }, [skillsList, serviceType, availableServices]);

  const estimatedStartingPrice = currentSkill?.startingPrice ?? 500;

  // Manila Timezone Date & Window Logic
  const manilaInfo = useMemo(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(now);

    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || '0';
    const yyyy = getVal('year');
    const mm = getVal('month');
    const dd = getVal('day');
    const hour = parseInt(getVal('hour'), 10);
    const minute = parseInt(getVal('minute'), 10);

    const todayStr = `${yyyy}-${mm}-${dd}`;

    const dTomorrow = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10) + 1));
    const tomY = dTomorrow.getUTCFullYear();
    const tomM = String(dTomorrow.getUTCMonth() + 1).padStart(2, '0');
    const tomD = String(dTomorrow.getUTCDate()).padStart(2, '0');
    const tomorrowStr = `${tomY}-${tomM}-${tomD}`;

    const dMax = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10) + 90));
    const maxY = dMax.getUTCFullYear();
    const maxM = String(dMax.getUTCMonth() + 1).padStart(2, '0');
    const maxD = String(dMax.getUTCDate()).padStart(2, '0');
    const maxDateStr = `${maxY}-${maxM}-${maxD}`;

    // Same-day allowed if 12:00 AM - 10:00 AM (inclusive of 10:00 AM)
    const isSameDayAllowed = hour < 10 || (hour === 10 && minute === 0);
    const minAllowedDate = isSameDayAllowed ? todayStr : tomorrowStr;

    return {
      todayStr,
      tomorrowStr,
      maxDateStr,
      hour,
      minute,
      isSameDayAllowed,
      minAllowedDate,
    };
  }, []);

  const isSameDaySelected = preferredDate === manilaInfo.todayStr;

  const normalizeTo24Hour = (val: string): string => {
    const trimmed = String(val || "").trim();
    if (!trimmed) return "00:00";
    const m24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m24) {
      const h = String(m24[1]).padStart(2, "0");
      const m = String(m24[2]).padStart(2, "0");
      return `${h}:${m}`;
    }
    const m12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (m12) {
      let h = parseInt(m12[1], 10);
      const m = m12[2];
      const isPM = m12[3].toUpperCase() === "PM";
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${m}`;
    }
    return "00:00";
  };

  const isTimeAfternoon = useMemo(() => {
    if (!preferredTime) return false;
    const norm = normalizeTo24Hour(preferredTime);
    const [h, m] = norm.split(':').map((v) => parseInt(v, 10));
    return (h * 60 + (m || 0)) >= (13 * 60);
  }, [preferredTime]);

  const isTimeValid = Boolean(
    preferredTime && String(preferredTime).trim() && (!isSameDaySelected || isTimeAfternoon)
  );

  // Strict sequential step completion checks
  const isServiceTypeValid = Boolean(String(serviceType || "").trim());
  const contactTrimmed = String(contactNumber || "").trim();
  const isContactValid = /^09\d{9}$/.test(contactTrimmed);
  const isCityValid = Boolean(String(city || "").trim());
  const isBarangayValid = Boolean(String(barangay || "").trim());
  const isDescriptionComplete = Boolean(String(description || "").trim());
  const isDateComplete = Boolean(
    preferredDate && preferredDate >= manilaInfo.minAllowedDate && preferredDate <= manilaInfo.maxDateStr
  );
  const isTimeComplete = isTimeValid;
  const isAllPriorInfoComplete =
    isServiceTypeValid &&
    isContactValid &&
    isCityValid &&
    isBarangayValid &&
    isDescriptionComplete &&
    isDateComplete &&
    isTimeComplete;

  // Auto-reset agreement if prior information becomes incomplete
  useEffect(() => {
    if (!isAllPriorInfoComplete && agreement) {
      setAgreement(false);
    }
  }, [isAllPriorInfoComplete, agreement, setAgreement]);

  const contactError = showValidationErrors && !isContactValid
    ? !contactTrimmed
      ? "Contact number is required."
      : "Enter exactly 11 digits starting with 09."
    : "";

  const dateError = showValidationErrors
    ? !preferredDate
      ? "Preferred date is required."
      : preferredDate < manilaInfo.minAllowedDate
        ? manilaInfo.isSameDayAllowed
          ? "Booking date cannot be in the past."
          : "It is past 10:00 AM. Same-day bookings are closed for today; please choose tomorrow or a later date."
        : preferredDate > manilaInfo.maxDateStr
          ? "Booking date cannot exceed 90 days ahead from today. Future dates will unlock as days go by."
          : ""
    : preferredDate && preferredDate < manilaInfo.minAllowedDate
      ? manilaInfo.isSameDayAllowed
        ? "Booking date cannot be in the past."
        : "It is past 10:00 AM. Same-day bookings are closed for today; please choose tomorrow or a later date."
      : preferredDate && preferredDate > manilaInfo.maxDateStr
        ? "Booking date cannot exceed 90 days ahead from today. Future dates will unlock as days go by."
        : "";

  const timeError = isSameDaySelected && !isTimeAfternoon && preferredTime
    ? "Same-day booking requires afternoon schedule (1:00 PM / 13:00 onwards)."
    : showValidationErrors && isDateComplete && !isTimeValid
      ? "Preferred time is required."
      : "";

  const locationSummary = barangay && city
    ? `${barangay}, ${city}, ${PANGASINAN_PROVINCE}`
    : "";

  useEffect(() => {
    if (!preferredTime) {
      onPreferredTimeChange(isSameDaySelected ? "13:00" : "00:00");
    } else if (isSameDaySelected && !isTimeAfternoon) {
      onPreferredTimeChange("13:00");
    }
  }, [preferredTime, isSameDaySelected, isTimeAfternoon, onPreferredTimeChange]);

  // Check duplicate booking schedule with worker
  const isDuplicateSchedule = useMemo(() => {
    if (!preferredDate || !preferredTime || !activeWorkerBookings || activeWorkerBookings.length === 0) {
      return false;
    }
    const reqTime = normalizeTo24Hour(preferredTime);
    return activeWorkerBookings.some((booking) => {
      const bDate = String(booking.preferredDate || "").slice(0, 10);
      const bTime = normalizeTo24Hour(booking.preferredTime);
      return bDate === preferredDate && bTime === reqTime;
    });
  }, [preferredDate, preferredTime, activeWorkerBookings]);

  const handleTimeChange = (val: string) => {
    if (!val) {
      onPreferredTimeChange("00:00");
      return;
    }
    onPreferredTimeChange(val);
  };

  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onPreferredTimeChange("00:00");
      return;
    }
    const parts = val.split(":");
    if (parts.length >= 2) {
      const h = parts[0];
      const mNum = parseInt(parts[1], 10);
      const roundedM = Math.round(mNum / 15) * 15;
      if (roundedM === 60) {
        const nextH = (parseInt(h, 10) + 1) % 24;
        onPreferredTimeChange(`${String(nextH).padStart(2, "0")}:00`);
      } else {
        onPreferredTimeChange(`${h.padStart(2, "0")}:${String(roundedM).padStart(2, "0")}`);
      }
    }
  };

  return (
    <div className="mb-6 space-y-4 text-left">
      {/* ── SECTION 0: SERVICE NEEDED ── */}
      {availableServices.length <= 1 ? (
        <label className={labelClassName}>
          <span className="flex h-5 items-center justify-between gap-2">
            <span>Service Needed <span className="font-normal text-gray-400 dark:text-slate-400">(Auto-filled)</span></span>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#00AF91]">
              <CheckCircle className="w-3 h-3" /> Worker's offered service
            </span>
          </span>
          <div className="relative">
            <input
              type="text"
              readOnly
              className={`${fieldClassName} bg-gray-50 dark:bg-slate-900/60 font-semibold text-[#00AF91] cursor-default`}
              value={availableServices[0] || serviceType || "General Repair"}
            />
          </div>
        </label>
      ) : (
        <label className={labelClassName}>
          <span className="flex h-5 items-center justify-between gap-2">
            <span>Service Needed <span className="text-red-500">*</span></span>
            <span className="text-xs font-normal text-[#00AF91]">Choose from worker's offered services</span>
          </span>
          <select
            className={fieldClassName}
            value={serviceType}
            onChange={(e) => onServiceTypeChange && onServiceTypeChange(e.target.value)}
          >
            <option value="">Select service needed</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
          {showValidationErrors && !serviceType ? (
            <span className={errorClassName}>Please choose the service you need.</span>
          ) : null}
        </label>
      )}

      {/* ── SECTION 1: CONTACT NUMBER & LOCATION ── */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <label className={labelClassName}>
          <span className="flex h-5 items-center justify-between gap-2">
            <span>Contact Number <span className="text-red-500">*</span></span>
            <span className="text-xs font-normal text-gray-400 dark:text-slate-400">11 digits, starts with 09</span>
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="09xxxxxxxxx"
            disabled={!isServiceTypeValid}
            className={!isServiceTypeValid ? disabledFieldClassName : fieldClassName}
            value={contactNumber}
            maxLength={11}
            aria-invalid={Boolean(contactError)}
            onChange={(event) => onContactNumberChange(event.target.value.replace(/\D/g, "").slice(0, 11))}
          />
          {contactError ? (
            <span className={errorClassName}>{contactError}</span>
          ) : isContactValid ? (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Valid Philippine mobile number
            </span>
          ) : contactTrimmed ? (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Must be 11 digits starting with 09 ({contactTrimmed.length}/11)
            </span>
          ) : null}
        </label>

        <label className={labelClassName}>
          <span className="flex h-5 items-center">Province</span>
          <input className={`${disabledFieldClassName} bg-gray-50 dark:bg-slate-900/60 dark:text-slate-400 cursor-default`} value={PANGASINAN_PROVINCE} readOnly />
        </label>

        <label className={labelClassName}>
          <span className="flex h-5 items-center">Municipality / City <span className="text-red-500 ml-1">*</span></span>
          <select
            className={!isContactValid ? disabledFieldClassName : fieldClassName}
            value={city}
            disabled={!isContactValid}
            onChange={(event) => {
              onCityChange(event.target.value);
              onBarangayChange("");
            }}
          >
            <option value="">{isContactValid ? "Select municipality/city" : "Enter contact number first"}</option>
            {pangasinanCities.map((municipality) => (
              <option key={municipality} value={municipality}>{municipality}</option>
            ))}
          </select>
          {showValidationErrors && !city ? <span className={errorClassName}>Select a municipality or city.</span> : null}
        </label>

        <label className={labelClassName}>
          <span className="flex h-5 items-center">Barangay <span className="text-red-500 ml-1">*</span></span>
          <select
            className={!isCityValid ? disabledFieldClassName : fieldClassName}
            value={barangay}
            disabled={!isCityValid}
            onChange={(event) => onBarangayChange(event.target.value)}
          >
            <option value="">{isCityValid ? "Select barangay" : "Select municipality first"}</option>
            {barangays.map((item: string) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          {showValidationErrors && !barangay ? <span className={errorClassName}>Select a barangay.</span> : null}
        </label>
      </div>

      <label className={labelClassName}>
        <span className="flex h-5 items-center gap-1">
          Specific Address / Landmark <span className="font-normal text-gray-400 dark:text-slate-400">(optional)</span>
        </span>
        <input
          type="text"
          disabled={!isBarangayValid}
          className={!isBarangayValid ? disabledFieldClassName : fieldClassName}
          placeholder="Example: Near Barangay Hall, House #123"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
        />
      </label>

      {locationSummary ? (
        <p className="-mt-1 text-xs text-gray-500 dark:text-slate-400">
          {locationSummary}{address.trim() ? ` • ${address.trim()}` : ""}
        </p>
      ) : null}

      {/* ── SECTION 2: PROJECT DESCRIPTION (STRICT SEQUENTIAL LOCK) ── */}
      <div className="space-y-1.5">
        <label className={labelClassName}>
          <span className="flex h-5 items-center">
            <span className="flex items-center gap-1">
              Project Description <span className="text-red-500">*</span>
            </span>
          </span>
          <textarea
            disabled={!isBarangayValid}
            className={
              !isBarangayValid
                ? "min-h-28 w-full resize-none rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500"
                : "min-h-28 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-700 shadow-sm outline-none transition-colors focus:border-[#00AF91] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-[#00AF91]"
            }
            placeholder="Describe your project or the problem you're facing..."
            value={description}
            aria-invalid={showValidationErrors && !description.trim()}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          {showValidationErrors && isBarangayValid && !description.trim() ? (
            <span className={errorClassName}>Project description is required.</span>
          ) : null}
        </label>
      </div>

      {/* ── SECTION 3: PREFERRED DATE & TIME (STRICT SEQUENTIAL LOCK) ── */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
          {/* Preferred Date */}
          <label className={labelClassName}>
            <span className="flex h-5 items-center justify-between gap-1">
              <span>
                Preferred Date <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] font-normal text-[#00AF91]">
                {manilaInfo.isSameDayAllowed ? "Today (1PM+) or future" : "Tomorrow to 90 days"}
              </span>
            </span>
            <span className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
              <input
                type="date"
                min={manilaInfo.minAllowedDate}
                max={manilaInfo.maxDateStr}
                disabled={!isDescriptionComplete}
                className={`${!isDescriptionComplete ? disabledFieldClassName : fieldClassName} pl-10`}
                value={preferredDate}
                aria-invalid={Boolean(dateError)}
                onChange={(event) => onPreferredDateChange(event.target.value)}
              />
            </span>
            {dateError ? (
              <span className={errorClassName}>{dateError}</span>
            ) : manilaInfo.isSameDayAllowed ? (
              <span className="text-[10px] text-teal-600 dark:text-teal-400">
                Same-day afternoon booking open until 10:00 AM (service 1:00 PM onwards).
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 dark:text-slate-500">
                10:00 AM cutoff passed. Bookings start tomorrow.
              </span>
            )}
          </label>

          {/* Preferred Time */}
          <label className={labelClassName}>
            <span className="flex h-5 items-center justify-between gap-1">
              <span>
                Preferred Time <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] font-normal text-[#00AF91]">
                {isSameDaySelected ? "1:00 PM onwards (same-day)" : "15-min intervals"}
              </span>
            </span>
            <span className="relative">
              <ClockIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
              <input
                type="time"
                step="900"
                min={isSameDaySelected ? "13:00" : undefined}
                required
                disabled={!isDateComplete}
                className={`${!isDateComplete ? disabledFieldClassName : fieldClassName} pl-10 font-semibold`}
                value={normalizeTo24Hour(preferredTime)}
                onChange={(e) => handleTimeChange(e.target.value)}
                onBlur={handleTimeBlur}
              />
            </span>
            {timeError ? (
              <span className={errorClassName}>{timeError}</span>
            ) : showValidationErrors && isDateComplete && !preferredTime ? (
              <span className={errorClassName}>Preferred time is required.</span>
            ) : null}
          </label>
        </div>

        {/* Duplicate schedule real-time warning */}
        {isDuplicateSchedule && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>
              Duplicate booking schedule: You already have an active booking with this worker on this date and time. Please choose a different date or time.
            </span>
          </div>
        )}
      </div>

      {/* ── SECTION 3.5: ESTIMATED STARTING COST (PHP) ── */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Estimated Starting Cost
            </span>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              ₱{Number(estimatedStartingPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="sm:text-right max-w-xs">
            <span className="inline-block text-[11px] text-emerald-800 dark:text-emerald-300/90 font-medium leading-tight">
              Baseline estimated rate in Philippine Peso (PHP). Final price will vary depending on actual labor, materials, and on-site inspection.
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 4: PRICE VARIATION AGREEMENT ── */}
      <div className={`rounded-2xl border p-4 transition-colors ${
        !isAllPriorInfoComplete
          ? "border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-900/40 opacity-70"
          : "border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/25"
      }`}>
        <label className={`flex items-start gap-3 select-none ${
          !isAllPriorInfoComplete ? "cursor-not-allowed text-gray-400" : "cursor-pointer"
        }`}>
          <input
            type="checkbox"
            disabled={!isAllPriorInfoComplete}
            checked={Boolean(isAllPriorInfoComplete && agreement)}
            onChange={(e) => {
              if (!isAllPriorInfoComplete) return;
              setAgreement(e.target.checked);
            }}
            className={`mt-0.5 h-4 w-4 rounded border-gray-300 text-[#00AF91] focus:ring-[#00AF91] dark:border-slate-700 dark:bg-slate-800 shrink-0 ${
              !isAllPriorInfoComplete ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            }`}
          />
          <div className="space-y-0.5">
            <span className={`text-xs font-bold block ${
              !isAllPriorInfoComplete ? "text-gray-500 dark:text-slate-400" : "text-amber-950 dark:text-amber-200"
            }`}>
              Price Variation Agreement <span className="text-red-500">*</span>
            </span>
            <p className={`text-[11px] leading-relaxed ${
              !isAllPriorInfoComplete ? "text-gray-400 dark:text-slate-500" : "text-amber-900/90 dark:text-amber-300/80"
            }`}>
              I understand and agree that any stated price or fee is an initial estimate. The final service price may vary depending on actual labor, necessary materials, and actual scope of work determined upon on-site inspection.
            </p>
          </div>
        </label>
        {showValidationErrors && !agreement && (
          <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
            Please acknowledge the price variation agreement to proceed.
          </p>
        )}
      </div>
    </div>
  );
}
