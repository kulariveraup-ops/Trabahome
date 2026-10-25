import { updateLastActivity } from './idleSession.ts';

const HOMEOWNER_AUTH_STORAGE_KEY = 'trabahome_homeowner_auth';

export interface HomeownerSessionProfile {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface HomeownerAuthSession {
  token: string;
  email: string;
  homeowner: HomeownerSessionProfile | null;
  signedInAt: string;
}

interface SaveHomeownerSessionInput {
  token: string;
  email: string;
  homeowner?: HomeownerSessionProfile | null;
}

const isBrowser = (): boolean => typeof window !== 'undefined';

const parseStoredSession = (rawSession: string | null): HomeownerAuthSession | null => {
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as Partial<HomeownerAuthSession>;
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token.trim()) return null;

    return {
      token: parsed.token,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      homeowner:
        parsed.homeowner && typeof parsed.homeowner === 'object'
          ? (parsed.homeowner as HomeownerSessionProfile)
          : null,
      signedInAt: typeof parsed.signedInAt === 'string' ? parsed.signedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveHomeownerSession = ({ token, email, homeowner = null }: SaveHomeownerSessionInput): void => {
  if (!isBrowser()) return;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const session: HomeownerAuthSession = {
    token,
    email: normalizedEmail,
    homeowner,
    signedInAt: new Date().toISOString(),
  };

  try {
    updateLastActivity();
    window.localStorage.setItem(HOMEOWNER_AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    try {
      window.localStorage.setItem(
        HOMEOWNER_AUTH_STORAGE_KEY,
        JSON.stringify({
          token,
          email: normalizedEmail,
          homeowner: null,
          signedInAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.error('Critical: unable to save homeowner session', e);
      throw e;
    }
  }
};

export const getHomeownerSession = (): HomeownerAuthSession | null => {
  if (!isBrowser()) return null;

  const rawSession = window.localStorage.getItem(HOMEOWNER_AUTH_STORAGE_KEY);
  const parsedSession = parseStoredSession(rawSession);

  if (!parsedSession) {
    window.localStorage.removeItem(HOMEOWNER_AUTH_STORAGE_KEY);
    return null;
  }

  return parsedSession;
};

export const getHomeownerAuthToken = (): string | null => {
  return getHomeownerSession()?.token ?? null;
};

export const isHomeownerAuthenticated = (): boolean => {
  return Boolean(getHomeownerAuthToken());
};

export const clearHomeownerSession = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(HOMEOWNER_AUTH_STORAGE_KEY);
  window.localStorage.removeItem("trabahome_homeowner_bookings");
  window.localStorage.removeItem("trabahome_homeowner_saved_workers");
};

export { HOMEOWNER_AUTH_STORAGE_KEY };
