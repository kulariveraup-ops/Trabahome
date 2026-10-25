type CacheEntry<T> = {
  savedAt: number;
  value: T;
};

const isBrowser = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const readJsonCache = <T,>(key: string, maxAgeMs?: number): T | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T> | T;
    if (parsed && typeof parsed === "object" && "savedAt" in parsed) {
      const entry = parsed as CacheEntry<T>;
      if (typeof entry.savedAt === "number" && maxAgeMs && Date.now() - entry.savedAt > maxAgeMs) {
        return null;
      }
      return entry.value ?? null;
    }
    return (parsed as T) ?? null;
  } catch {
    return null;
  }
};

export const readJsonCacheStale = <T,>(key: string): T | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T> | T;
    if (parsed && typeof parsed === "object" && "savedAt" in parsed) {
      return (parsed as CacheEntry<T>).value ?? null;
    }
    return (parsed as T) ?? null;
  } catch {
    return null;
  }
};

export const writeJsonCache = <T,>(key: string, value: T) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ savedAt: Date.now(), value } satisfies CacheEntry<T>)
    );
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
};
