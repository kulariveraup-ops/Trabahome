import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { clearWorkerSession, isWorkerAuthenticated } from '../../utils/workerAuth.ts';
import { isSessionExpiredByInactivity } from '../../utils/idleSession.ts';

export default function RequireAuth() {
  const location = useLocation();

  if (!isWorkerAuthenticated() || isSessionExpiredByInactivity()) {
    if (isSessionExpiredByInactivity()) {
      clearWorkerSession();
    }
    return <Navigate to="/worker-login" replace state={{ from: location, sessionTimeout: true }} />;
  }

  return <Outlet />;
}
