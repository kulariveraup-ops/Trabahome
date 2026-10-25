// @ts-nocheck
import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

export default function MyRequests() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/homeowner-bookings", { replace: true, state: location.state });
  }, [location.state, navigate]);

  return <Navigate to="/homeowner-bookings" replace state={location.state} />;
}
