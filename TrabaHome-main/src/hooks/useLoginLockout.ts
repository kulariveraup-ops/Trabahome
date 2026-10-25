import { useEffect, useRef, useState } from "react";
import {
  LOGIN_LOCKOUT_SECONDS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCKOUT_STORAGE_VERSION,
} from "../config/loginPolicy.ts";
import {
  clearLoginLockout,
  clearLoginAttemptCount,
  getLoginLockoutSecondsLeft,
  incrementLoginAttemptCount,
  normalizeLoginIdentifier,
  readLoginLockoutUntil,
  writeLoginLockoutUntil,
} from "../utils/loginLockout.ts";

export { LOGIN_LOCKOUT_SECONDS, LOGIN_MAX_ATTEMPTS } from "../config/loginPolicy.ts";

export const useLoginLockout = (scope: string, identifier = "") => {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier) || "global";
  const [lockoutUntil, setLockoutUntil] = useState(() =>
    readLoginLockoutUntil(scope, normalizedIdentifier)
  );
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(() =>
    getLoginLockoutSecondsLeft(readLoginLockoutUntil(scope, normalizedIdentifier))
  );
  const lockoutUntilRef = useRef(lockoutUntil);

  useEffect(() => {
    lockoutUntilRef.current = lockoutUntil;
  }, [lockoutUntil]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const timer = window.setInterval(() => {
      const secondsLeft = getLoginLockoutSecondsLeft(lockoutUntil);
      setLockoutSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        clearLoginLockout(scope, normalizedIdentifier);
        clearLoginAttemptCount(scope, normalizedIdentifier);
        setLockoutUntil(0);
        setLockoutSecondsLeft(0);
        window.clearInterval(timer);
      }
    }, 1000);

    setLockoutSecondsLeft(getLoginLockoutSecondsLeft(lockoutUntil));
    return () => window.clearInterval(timer);
  }, [lockoutUntil, scope, normalizedIdentifier]);

  useEffect(() => {
    const nextUntil = readLoginLockoutUntil(scope, normalizedIdentifier);
    setLockoutUntil(nextUntil);
    setLockoutSecondsLeft(getLoginLockoutSecondsLeft(nextUntil));
  }, [scope, normalizedIdentifier]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== `trabahome_login_lockout_${LOGIN_LOCKOUT_STORAGE_VERSION}_${scope}_${normalizedIdentifier}`) return;

      const nextUntil = readLoginLockoutUntil(scope, normalizedIdentifier);
      setLockoutUntil(nextUntil);
      setLockoutSecondsLeft(getLoginLockoutSecondsLeft(nextUntil));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [scope, normalizedIdentifier]);

  const startLockout = (seconds = LOGIN_LOCKOUT_SECONDS) => {
    const untilMs = Date.now() + seconds * 1000;
    writeLoginLockoutUntil(scope, untilMs, normalizedIdentifier);
    setLockoutUntil(untilMs);
    setLockoutSecondsLeft(seconds);
  };

  const clearLockout = () => {
    clearLoginLockout(scope, normalizedIdentifier);
    clearLoginAttemptCount(scope, normalizedIdentifier);
    setLockoutUntil(0);
    setLockoutSecondsLeft(0);
  };

  const recordAttempt = () => {
    const next = incrementLoginAttemptCount(scope, normalizedIdentifier);
    if (next >= LOGIN_MAX_ATTEMPTS) {
      startLockout(LOGIN_LOCKOUT_SECONDS);
      return { attempts: next, blocked: true };
    }
    return { attempts: next, blocked: false };
  };

  return {
    lockoutUntil,
    lockoutSecondsLeft,
    startLockout,
    clearLockout,
    recordAttempt,
    isLocked: lockoutSecondsLeft > 0,
  };
};
