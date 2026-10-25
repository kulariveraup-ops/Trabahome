const DAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const DAY_SEQUENCE = [0, 1, 2, 3, 4, 5, 6];

const normalizeSchedule = (value: string): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");

const minutesFromTime = (hour: string, minute: string | undefined, meridiem: string | undefined): number => {
  let hours = Number(hour);
  const minutes = Number(minute || 0);
  const suffix = String(meridiem || "").toLowerCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;

  if (suffix === "am" || suffix === "pm") {
    if (hours === 12) hours = 0;
    if (suffix === "pm") hours += 12;
  }

  return (hours * 60) + minutes;
};

const isTwentyFourSevenSchedule = (value: string): boolean =>
  /(24\s*\/\s*7|24\s*-\s*7|24\/7|always|anytime|all day|everyday|daily)/i.test(value);

const parseTimeRange = (schedule: string): { start: number; end: number } | null => {
  const value = normalizeSchedule(schedule);
  if (!value) return null;

  if (isTwentyFourSevenSchedule(value)) {
    return { start: 0, end: 24 * 60 };
  }

  const match = value.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/
  );
  if (!match) return null;

  const start = minutesFromTime(match[1], match[2], match[3]);
  let end = minutesFromTime(match[4], match[5], match[6]);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const startMeridiem = String(match[3] || "").toLowerCase();
  const endMeridiem = String(match[6] || "").toLowerCase();

  if (!endMeridiem && startMeridiem && end < start) {
    end += 12 * 60;
  }

  if (end < start) {
    return null;
  }

  return { start, end };
};

const dayTokenToIndex = (token: string): number | null => {
  const normalized = String(token || "").trim().toLowerCase();
  if (!normalized) return null;
  if (DAY_INDEX[normalized] !== undefined) return DAY_INDEX[normalized];
  return DAY_INDEX[normalized.slice(0, 3)] ?? null;
};

const parseDaySet = (schedule: string): Set<number> | null => {
  const value = normalizeSchedule(schedule);
  if (!value) return null;

  if (/(24\s*\/\s*7|24\s*-\s*7|always|anytime|all day|everyday|daily)/i.test(value)) {
    return new Set(DAY_SEQUENCE);
  }

  const days = new Set<number>();
  const tokenRegex = /\b(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/g;
  const tokens = [...value.matchAll(tokenRegex)].map((match) => ({
    token: match[1],
    index: match.index ?? 0,
  }));

  if (tokens.length === 0) return null;

  const betweenFirstAndSecond = tokens.length >= 2
    ? value.slice(tokens[0].index + tokens[0].token.length, tokens[1].index)
    : "";
  if (tokens.length >= 2 && /-|to/.test(betweenFirstAndSecond)) {
    const startIndex = dayTokenToIndex(tokens[0].token);
    const endIndex = dayTokenToIndex(tokens[tokens.length - 1].token);
    if (startIndex !== null && endIndex !== null) {
      let cursor = startIndex;
      while (true) {
        days.add(cursor);
        if (cursor === endIndex) break;
        cursor = (cursor + 1) % 7;
        if (days.size > 7) break;
      }
      return days;
    }
  }

  tokens.forEach(({ token }) => {
    const index = dayTokenToIndex(token);
    if (index !== null) days.add(index);
  });

  return days.size ? days : null;
};

export const getWorkerLiveStatus = (
  workingSchedule: string,
  availabilityStatus = ""
): { label: "Online" | "Offline" | "On Vacation" | "Day Off" | "Busy"; isOnline: boolean; workingHours?: string } => {
  const schedule = String(workingSchedule || "").trim();
  const rawStatus = String(availabilityStatus || "").trim();
  const lower = rawStatus.toLowerCase();

  // If worker explicitly set a special status, honor it directly
  if (lower.includes("vacation")) {
    return { label: "On Vacation", isOnline: false, workingHours: schedule };
  }
  if (lower.includes("day off") || lower.includes("dayoff") || lower.includes("leave")) {
    return { label: "Day Off", isOnline: false, workingHours: schedule };
  }
  if (lower.includes("busy")) {
    return { label: "Busy", isOnline: false, workingHours: schedule };
  }
  if (lower === "offline") {
    return { label: "Offline", isOnline: false, workingHours: schedule };
  }
  if (lower === "online" || lower === "available") {
    return { label: "Online", isOnline: true, workingHours: schedule };
  }

  // Fallback to schedule-based logic if available
  if (!schedule) {
    const isOnline = Boolean(
      rawStatus &&
        (lower.includes("online") ||
          lower.includes("available") ||
          lower.includes("open") ||
          lower.includes("active"))
    );
    return { label: isOnline ? "Online" : "Offline", isOnline };
  }

  const daySet = parseDaySet(schedule);
  const timeRange = parseTimeRange(schedule);
  if (!daySet || !timeRange) {
    const isOnline = Boolean(
      rawStatus &&
        (lower.includes("online") ||
          lower.includes("available") ||
          lower.includes("open") ||
          lower.includes("active"))
    );
    return { label: isOnline ? "Online" : "Offline", isOnline, workingHours: schedule };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayAllowed = daySet.has(now.getDay());
  const timeAllowed = currentMinutes >= timeRange.start && currentMinutes < timeRange.end;
  const isOnline = todayAllowed && timeAllowed;

  return {
    label: isOnline ? "Online" : "Offline",
    isOnline,
    workingHours: schedule,
  };
};

export const getWorkerAvailabilityStyle = (statusOrIsOnline: boolean | string) => {
  const statusStr =
    typeof statusOrIsOnline === "string"
      ? statusOrIsOnline.toLowerCase()
      : statusOrIsOnline
      ? "online"
      : "offline";

  if (statusStr.includes("vacation")) {
    return {
      pillClassName:
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200",
      dotClassName: "bg-amber-500",
      markerBackground: "#FFFBEB",
      markerBorder: "#F59E0B",
      markerText: "#B45309",
      markerDot: "#F59E0B",
    };
  }

  if (statusStr.includes("day off") || statusStr.includes("dayoff") || statusStr.includes("leave")) {
    return {
      pillClassName:
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200",
      dotClassName: "bg-blue-500",
      markerBackground: "#EFF6FF",
      markerBorder: "#3B82F6",
      markerText: "#1D4ED8",
      markerDot: "#3B82F6",
    };
  }

  if (statusStr.includes("busy")) {
    return {
      pillClassName:
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200",
      dotClassName: "bg-rose-500",
      markerBackground: "#FFF1F2",
      markerBorder: "#F43F5E",
      markerText: "#BE123C",
      markerDot: "#F43F5E",
    };
  }

  if (statusStr.includes("online") || statusStr.includes("available")) {
    return {
      pillClassName:
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100",
      dotClassName: "bg-emerald-500",
      markerBackground: "#ECFDF5",
      markerBorder: "#10B981",
      markerText: "#047857",
      markerDot: "#10B981",
    };
  }

  return {
    pillClassName:
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold border border-gray-200",
    dotClassName: "bg-gray-400",
    markerBackground: "#F3F4F6",
    markerBorder: "#9CA3AF",
    markerText: "#4B5563",
    markerDot: "#9CA3AF",
  };
};
