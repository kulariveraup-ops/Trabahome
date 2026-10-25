import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import { updateLastActivity } from "./idleSession.ts";

const WORKER_AUTH_STORAGE_KEY = "trabahome_worker_auth";
const LEGACY_TEMP_WORKER_SESSION_KEY = "trabahome_worker_session";
const WORKER_PROFILE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface WorkerSessionProfile {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profession?: string;
  rating?: number | null;
  status?: string;
  isVerified?: boolean;
  availabilityStatus?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface WorkerAuthSession {
  token: string;
  email: string;
  worker: WorkerSessionProfile | null;
  signedInAt: string;
}

interface SaveWorkerSessionInput {
  token: string;
  email: string;
  worker?: WorkerSessionProfile | null;
}

const isBrowser = (): boolean => typeof window !== "undefined";

const sanitizeWorkerProfile = (
  worker: WorkerSessionProfile | null | undefined
): WorkerSessionProfile | null => {
  if (!worker || typeof worker !== "object") return null;

  const safeStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  // Guard against giant base64 data URIs or image payloads in session storage (exceeding localStorage quota)
  const isTooLarge = (v: unknown): boolean => typeof v === "string" && v.length > 2048;
  const rawAvatar = worker.avatar || worker.profileImage || worker.photoUrl || worker.image || "";
  const safeAvatar = !isTooLarge(rawAvatar) ? safeStr(rawAvatar) : "";

  return {
    _id: safeStr(worker._id || worker.id),
    id: safeStr(worker.id || worker._id),
    firstName: safeStr(worker.firstName || worker.firstname),
    lastName: safeStr(worker.lastName || worker.lastname),
    fullName: safeStr(worker.fullName || worker.name),
    email: safeStr(worker.email),
    profession: safeStr(worker.profession),
    rating:
      typeof worker.rating === "number" && Number.isFinite(worker.rating)
        ? worker.rating
        : null,
    status: safeStr(worker.status),
    isVerified: Boolean(worker.isVerified),
    availabilityStatus: safeStr(worker.availabilityStatus),
    avatar: safeAvatar,
  };
};

const cleanStaleCaches = () => {
  if (!isBrowser()) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith("trabahome_worker_requests:") ||
          key.startsWith("trabahome_worker_profile:") ||
          key.startsWith("trabahome_homeowner_bookings") ||
          key.startsWith("trabahome_sync_") ||
          key.startsWith("trabahome_page_cache_") ||
          key.startsWith("get:") ||
          key.startsWith("post:"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore cleanup errors
  }
};

const getWorkerProfileCacheKey = (email?: string | null): string => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail ? `trabahome_worker_profile:${normalizedEmail}` : "";
};

const mergeCachedWorkerProfile = (session: WorkerAuthSession | null): WorkerAuthSession | null => {
  if (!session) return null;

  const cacheKey = getWorkerProfileCacheKey(session.email);
  if (!cacheKey) return session;

  const cachedWorker = readJsonCache<WorkerSessionProfile>(cacheKey, WORKER_PROFILE_CACHE_TTL_MS);
  if (!cachedWorker || typeof cachedWorker !== "object") return session;

  return {
    ...session,
    worker: sanitizeWorkerProfile({
      ...(cachedWorker as WorkerSessionProfile),
      ...(session.worker || {}),
    }),
  };
};

const parseStoredSession = (rawSession: string | null): WorkerAuthSession | null => {
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as Partial<WorkerAuthSession>;
    if (!parsed || typeof parsed.token !== "string" || !parsed.token.trim()) return null;

    return {
      token: parsed.token,
      email: typeof parsed.email === "string" ? parsed.email : "",
      worker: parsed.worker && typeof parsed.worker === "object" ? sanitizeWorkerProfile(parsed.worker as WorkerSessionProfile) : null,
      signedInAt: typeof parsed.signedInAt === "string" ? parsed.signedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveWorkerSession = ({ token, email, worker = null }: SaveWorkerSessionInput): void => {
  if (!isBrowser()) return;

  const sanitizedWorker = sanitizeWorkerProfile(worker);
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const session: WorkerAuthSession = {
    token,
    email: normalizedEmail,
    worker: sanitizedWorker,
    signedInAt: new Date().toISOString(),
  };

  try {
    updateLastActivity();
    window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // If quota exceeded or storage write fails, clean non-essential caches and retry
    try {
      cleanStaleCaches();
      window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // If still failing, drop worker payload completely and save only critical token and email
      try {
        const minimalSession: WorkerAuthSession = {
          token,
          email: normalizedEmail,
          worker: null,
          signedInAt: new Date().toISOString(),
        };
        window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(minimalSession));
      } catch (finalErr) {
        console.error("Critical: unable to save worker session to localStorage", finalErr);
        throw finalErr;
      }
    }
  }

  if (sanitizedWorker) {
    const cacheKey = getWorkerProfileCacheKey(normalizedEmail);
    if (cacheKey) {
      writeJsonCache(cacheKey, sanitizedWorker);
    }
  }
  try {
    window.localStorage.removeItem(LEGACY_TEMP_WORKER_SESSION_KEY);
  } catch {}
};

export const updateWorkerSession = (worker: WorkerSessionProfile | null): void => {
  if (!isBrowser()) return;

  const currentSession = getWorkerSession();
  if (!currentSession) return;

  const sanitizedWorker = sanitizeWorkerProfile(worker);
  const session: WorkerAuthSession = {
    ...currentSession,
    worker: sanitizedWorker,
  };

  try {
    window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    try {
      cleanStaleCaches();
      window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore non-critical profile update quota failures
    }
  }

  if (sanitizedWorker) {
    const cacheKey = getWorkerProfileCacheKey(currentSession.email);
    if (cacheKey) {
      writeJsonCache(cacheKey, sanitizedWorker);
    }
  }
  try {
    window.localStorage.removeItem(LEGACY_TEMP_WORKER_SESSION_KEY);
  } catch {}
};

export const getWorkerSession = (): WorkerAuthSession | null => {
  if (!isBrowser()) return null;

  const rawSession = window.localStorage.getItem(WORKER_AUTH_STORAGE_KEY);
  const parsedSession = parseStoredSession(rawSession);

  if (!parsedSession) {
    try {
      window.localStorage.removeItem(WORKER_AUTH_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_TEMP_WORKER_SESSION_KEY);
    } catch {}
    return null;
  }

  const hydratedSession = mergeCachedWorkerProfile(parsedSession);
  if (hydratedSession) {
    try {
      window.localStorage.setItem(WORKER_AUTH_STORAGE_KEY, JSON.stringify(hydratedSession));
    } catch {}
  }
  return hydratedSession;
};

export const getWorkerAuthToken = (): string | null => {
  return getWorkerSession()?.token ?? null;
};

export const isWorkerAuthenticated = (): boolean => {
  return Boolean(getWorkerAuthToken());
};

export const clearWorkerSession = (): void => {
  if (!isBrowser()) return;

  const currentSession = getWorkerSession();
  const cacheKey = currentSession ? getWorkerProfileCacheKey(currentSession.email) : "";

  try {
    window.localStorage.removeItem(WORKER_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_TEMP_WORKER_SESSION_KEY);
    if (cacheKey) {
      window.localStorage.removeItem(cacheKey);
    }
  } catch {}
};
