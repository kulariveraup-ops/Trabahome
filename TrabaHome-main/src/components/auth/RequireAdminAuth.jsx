import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearAdminSession, isAdminAuthenticated } from '../../utils/adminAuth.ts';
import { isSessionExpiredByInactivity } from '../../utils/idleSession.ts';

export default function RequireAdminAuth() {
  const location = useLocation();

  if (!isAdminAuthenticated() || isSessionExpiredByInactivity()) {
    if (isSessionExpiredByInactivity()) {
      clearAdminSession();
    }
    return <Navigate to="/admin-login" replace state={{ from: location, sessionTimeout: true }} />;
  }

  return <Outlet />;
}
