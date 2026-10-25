import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isHomeownerAuthenticated } from '../../utils/homeownerAuth.ts';
import { isWorkerAuthenticated } from '../../utils/workerAuth.ts';
import { isAdminAuthenticated } from '../../utils/adminAuth.ts';

export default function RequireAnyAuth() {
  const location = useLocation();

  if (!isHomeownerAuthenticated() && !isWorkerAuthenticated() && !isAdminAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
