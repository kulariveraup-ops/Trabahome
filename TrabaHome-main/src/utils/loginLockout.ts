import { LOGIN_LOCKOUT_STORAGE_VERSION } from "../config/loginPolicy.ts";

export const normalizeLoginIdentifier = (value: string) =>
  String(value || "").trim().toLowerCase();

const getStorageKey = (scope: string, identifier = "") =>
  `trabahome_login_lockout_${LOGIN_LOCKOUT_STORAGE_VERSION}_${scope}_${normalizeLoginIdentifier(identifier) || "global"}`;
const getAttemptKey = (scope: string, identifier = "") =>
  `trabahome_login_attempts_${LOGIN_LOCKOUT_STORAGE_VERSION}_${scope}_${normalizeLoginIdentifier(identifier) || "global"}`;

export const readLoginLockoutUntil = (scope: string, identifier = ""): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(getStorageKey(scope, identifier));
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const writeLoginLockoutUntil = (scope: string, untilMs: number, identifier = ""): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(scope, identifier), String(untilMs));
};

export const clearLoginLockout = (scope: string, identifier = ""): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStorageKey(scope, identifier));
};

export const readLoginAttemptCount = (scope: string, identifier = ""): number => {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(getAttemptKey(scope, identifier));
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

export const incrementLoginAttemptCount = (scope: string, identifier = ""): number => {
  if (typeof window === "undefined") return 0;
  const next = readLoginAttemptCount(scope, identifier) + 1;
  window.localStorage.setItem(getAttemptKey(scope, identifier), String(next));
  return next;
};

export const clearLoginAttemptCount = (scope: string, identifier = ""): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getAttemptKey(scope, identifier));
};

export const getLoginLockoutSecondsLeft = (untilMs: number): number => {
  if (!untilMs) return 0;
  return Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
};
