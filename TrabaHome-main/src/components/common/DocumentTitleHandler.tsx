import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isHomeownerAuthenticated } from "../../utils/homeownerAuth.ts";
import { isWorkerAuthenticated } from "../../utils/workerAuth.ts";
import { isAdminAuthenticated } from "../../utils/adminAuth.ts";

export default function DocumentTitleHandler() {
  const location = useLocation();

  useEffect(() => {
    const path = String(location.pathname || "").toLowerCase();

    // 1. Admin Portal routes
    if (path.startsWith("/admin")) {
      if (path === "/admin-login") document.title = "TrabaHome | Admin Login";
      else if (path === "/admin-register") document.title = "TrabaHome | Admin Register";
      else document.title = "TrabaHome | Admin Dashboard";
      return;
    }

    // 2. Worker Portal routes
    if (path.startsWith("/worker") || path === "/home-worker" || path.startsWith("/home-worker")) {
      if (path === "/worker-login") document.title = "TrabaHome | Worker Login";
      else if (path === "/worker-signup") document.title = "TrabaHome | Worker Sign Up";
      else if (path === "/worker-jobs") document.title = "TrabaHome | Worker Jobs";
      else if (path === "/worker-own-profile") document.title = "TrabaHome | Worker Profile";
      else if (path === "/worker-messages") document.title = "TrabaHome | Worker Messages";
      else if (path === "/worker-help") document.title = "TrabaHome | Worker Help";
      else document.title = "TrabaHome | Skilled Worker";
      return;
    }

    // 3. Homeowner Portal routes
    if (
      path.startsWith("/homeowner") ||
      path === "/home" ||
      path.startsWith("/home/") ||
      path === "/search" ||
      path.startsWith("/search") ||
      path === "/workers" ||
      path.startsWith("/workers") ||
      path === "/worker-list" ||
      path.startsWith("/worker-list") ||
      path === "/map" ||
      path.startsWith("/map") ||
      path === "/full-map" ||
      path.startsWith("/full-map") ||
      path === "/profile" ||
      path.startsWith("/profile/") ||
      path === "/my-requests" ||
      path.startsWith("/my-requests")
    ) {
      if (path === "/login") document.title = "TrabaHome | Homeowner Login";
      else if (path === "/signup") document.title = "TrabaHome | Homeowner Sign Up";
      else if (path === "/homeowner-bookings") document.title = "TrabaHome | My Bookings";
      else if (path === "/homeowner-profile") document.title = "TrabaHome | Homeowner Profile";
      else if (path === "/homeowner-help") document.title = "TrabaHome | Help & Support";
      else document.title = "TrabaHome | Homeowner";
      return;
    }

    // 4. Public auth pages
    if (path === "/login") {
      document.title = "TrabaHome | Homeowner Login";
      return;
    }
    if (path === "/signup") {
      document.title = "TrabaHome | Homeowner Sign Up";
      return;
    }
    if (path === "/worker-login") {
      document.title = "TrabaHome | Worker Login";
      return;
    }
    if (path === "/worker-signup") {
      document.title = "TrabaHome | Worker Sign Up";
      return;
    }

    // 5. Shared routes
    if (path === "/messages" || path.startsWith("/messages")) {
      if (isWorkerAuthenticated() && !isHomeownerAuthenticated()) {
        document.title = "TrabaHome | Worker Messages";
      } else {
        document.title = "TrabaHome | Messages";
      }
      return;
    }

    // 6. Landing page & root
    if (path === "/" || path === "") {
      if (isHomeownerAuthenticated()) {
        document.title = "TrabaHome | Homeowner";
      } else if (isWorkerAuthenticated()) {
        document.title = "TrabaHome | Skilled Worker";
      } else if (isAdminAuthenticated()) {
        document.title = "TrabaHome | Admin Dashboard";
      } else {
        document.title = "TrabaHome | Guest Mode";
      }
      return;
    }

    // Fallback based on authenticated role
    if (isHomeownerAuthenticated()) {
      document.title = "TrabaHome | Homeowner";
    } else if (isWorkerAuthenticated()) {
      document.title = "TrabaHome | Skilled Worker";
    } else if (isAdminAuthenticated()) {
      document.title = "TrabaHome | Admin Dashboard";
    } else {
      document.title = "TrabaHome | Guest Mode";
    }
  }, [location.pathname]);

  return null;
}
