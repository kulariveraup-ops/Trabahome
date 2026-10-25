import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearHomeownerSession, isHomeownerAuthenticated } from '../../utils/homeownerAuth.ts';
import { isSessionExpiredByInactivity } from '../../utils/idleSession.ts';

export default function RequireHomeownerAuth() {
  const location = useLocation();

  if (!isHomeownerAuthenticated() || isSessionExpiredByInactivity()) {
    if (isSessionExpiredByInactivity()) {
      clearHomeownerSession();
    }
    return <Navigate to="/login" replace state={{ from: location, sessionTimeout: true }} />;
  }

  return <Outlet />;
}
