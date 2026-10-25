import { updateLastActivity } from './idleSession.ts';

const ADMIN_AUTH_STORAGE_KEY = 'trabahome_admin_auth';

export interface AdminSessionProfile {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface AdminAuthSession {
  token: string;
  email: string;
  admin: AdminSessionProfile | null;
  signedInAt: string;
}

interface SaveAdminSessionInput {
  token: string;
  email: string;
  admin?: AdminSessionProfile | null;
}

const isBrowser = (): boolean => typeof window !== 'undefined';

const parseStoredSession = (rawSession: string | null): AdminAuthSession | null => {
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as Partial<AdminAuthSession>;
    if (!parsed || typeof parsed.token !== 'string' || !parsed.token.trim()) return null;

    return {
      token: parsed.token,
      email: typeof parsed.email === 'string' ? parsed.email : '',
      admin: parsed.admin && typeof parsed.admin === 'object' ? (parsed.admin as AdminSessionProfile) : null,
      signedInAt: typeof parsed.signedInAt === 'string' ? parsed.signedInAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveAdminSession = ({ token, email, admin = null }: SaveAdminSessionInput): void => {
  if (!isBrowser()) return;

  const session: AdminAuthSession = {
    token,
    email,
    admin,
    signedInAt: new Date().toISOString(),
  };

  updateLastActivity();
  window.localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const getAdminSession = (): AdminAuthSession | null => {
  if (!isBrowser()) return null;

  const rawSession = window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
  const parsedSession = parseStoredSession(rawSession);

  if (!parsedSession) {
    window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    return null;
  }

  return parsedSession;
};

export const getAdminAuthToken = (): string | null => {
  return getAdminSession()?.token ?? null;
};

export const isAdminAuthenticated = (): boolean => {
  return Boolean(getAdminAuthToken());
};

export const clearAdminSession = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
};

export { ADMIN_AUTH_STORAGE_KEY };
