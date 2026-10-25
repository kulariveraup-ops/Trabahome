const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_NO_ZONE_RE = /^(\d{4}-\d{2}-\d{2})([ T])(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/;
const DATE_TIME_12H_RE = /^(\d{4}-\d{2}-\d{2})([ T])(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])$/;
const DEFAULT_LOCALE = "en-US";

const buildLocalDate = (year: number, month: number, day: number) => new Date(year, month - 1, day);

export const parseDateLike = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const dateOnly = raw.match(DATE_ONLY_RE);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = buildLocalDate(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateTimeNoZone = raw.match(DATE_TIME_NO_ZONE_RE);
  if (dateTimeNoZone) {
    const year = Number(dateTimeNoZone[1].slice(0, 4));
    const month = Number(dateTimeNoZone[1].slice(5, 7));
    const day = Number(dateTimeNoZone[1].slice(8, 10));
    const hours = Number(dateTimeNoZone[3]);
    const minutes = Number(dateTimeNoZone[4]);
    const seconds = Number(dateTimeNoZone[5] || 0);
    const date = buildLocalDate(year, month, day);
    date.setHours(hours, minutes, seconds, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dateTime12Hour = raw.match(DATE_TIME_12H_RE);
  if (dateTime12Hour) {
    const year = Number(dateTime12Hour[1].slice(0, 4));
    const month = Number(dateTime12Hour[1].slice(5, 7));
    const day = Number(dateTime12Hour[1].slice(8, 10));
    let hours = Number(dateTime12Hour[3]);
    const minutes = Number(dateTime12Hour[4]);
    const seconds = Number(dateTime12Hour[5] || 0);
    const meridiem = dateTime12Hour[6].toLowerCase();
    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    const date = buildLocalDate(year, month, day);
    date.setHours(hours, minutes, seconds, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (
  value: unknown,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
) => {
  const date = parseDateLike(value);
  if (!date) return String(value || "").trim();
  return date.toLocaleString(DEFAULT_LOCALE, {
    ...options,
    hour12: options.hour12 ?? true,
  });
};

export const formatTime12Hour = (time: unknown): string => {
  const raw = String(time || "").trim();
  if (!raw) return "";

  // Check 12-hour: e.g. "9:30 AM", "09:00 AM", "2:30 pm"
  const match12 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (match12) {
    const hours = Number(match12[1]);
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    return `${hours}:${minutes} ${meridiem}`;
  }

  // Check 24-hour: e.g. "09:00", "14:30", "00:15", "14:30:00"
  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    let hours = Number(match24[1]);
    const minutes = match24[2];
    const meridiem = hours >= 12 ? "PM" : "AM";
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    return `${hours}:${minutes} ${meridiem}`;
  }

  return raw;
};

export const parseScheduleDateTime = (preferredDate: unknown, preferredTime: unknown, fallback?: unknown): Date | null => {
  const dStr = String(preferredDate || "").trim();
  const tStr = String(preferredTime || "").trim();

  let year = 0;
  let month = 0;
  let day = 0;

  if (dStr) {
    const parsed = parseDateLike(dStr);
    if (parsed) {
      year = parsed.getFullYear();
      month = parsed.getMonth();
      day = parsed.getDate();
    }
  }

  if (!year && fallback) {
    const parsedFallback = parseDateLike(fallback);
    if (parsedFallback) return parsedFallback;
  }

  if (!year) return null;

  let hours = 0;
  let minutes = 0;

  if (tStr) {
    const m12 = tStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
    if (m12) {
      hours = Number(m12[1]);
      minutes = Number(m12[2]);
      const meridiem = m12[3].toUpperCase();
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    } else {
      const m24 = tStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (m24) {
        hours = Number(m24[1]);
        minutes = Number(m24[2]);
      }
    }
  }

  const result = new Date(year, month, day, hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
};

export const isScheduledTimeReached = (preferredDate: unknown, preferredTime: unknown, fallback?: unknown): boolean => {
  const target = parseScheduleDateTime(preferredDate, preferredTime, fallback);
  if (!target) return false;
  return Date.now() >= target.getTime();
};

export const formatScheduleDateTime = (preferredDate: unknown, preferredTime: unknown, fallback?: unknown) => {
  const dateValue = String(preferredDate || "").trim();
  const timeValue = String(preferredTime || "").trim();

  let formattedDate = "";
  if (dateValue) {
    const parsed = parseDateLike(dateValue);
    if (parsed) {
      formattedDate = parsed.toLocaleDateString(DEFAULT_LOCALE, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  const formattedTime = timeValue ? formatTime12Hour(timeValue) : "";

  if (formattedDate && formattedTime) {
    return `${formattedDate} • ${formattedTime}`;
  }

  if (formattedDate) {
    // If no explicit preferredTime, check if fallback contains time
    if (fallback) {
      const fbStr = String(fallback).trim();
      const fbFormatted = formatDateTime(fbStr);
      if (fbFormatted && fbFormatted !== formattedDate) {
        return fbFormatted;
      }
    }
    return formattedDate;
  }

  if (fallback) {
    return formatDateTime(fallback);
  }

  return formattedTime || "";
};
