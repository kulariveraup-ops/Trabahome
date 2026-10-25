export const IDLE_LOGOUT_MINUTES = 60; // 1 hour
export const IDLE_LOGOUT_MS = IDLE_LOGOUT_MINUTES * 60 * 1000;
export const LAST_ACTIVITY_KEY = "trabahome_last_activity_time";

export const updateLastActivity = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {}
};

export const getLastActivityTime = (): number => {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  } catch {
    return Date.now();
  }
};

export const isSessionExpiredByInactivity = (): boolean => {
  if (typeof window === "undefined") return false;
  const lastTime = getLastActivityTime();
  return Date.now() - lastTime >= IDLE_LOGOUT_MS;
};
