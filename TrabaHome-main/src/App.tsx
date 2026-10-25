import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

const LandingPage = lazy(() => import("./pages/LandingPage.tsx"));
const ServicesPage = lazy(() => import("./pages/ServicesPage.tsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const SignUpPage = lazy(() => import("./pages/SignUpPage.tsx"));
const HomeownerForgotPassword = lazy(() => import("./pages/HomeownerForgotPassword.tsx"));
const HomeownerResetPassword = lazy(() => import("./pages/HomeownerResetPassword.tsx"));
const HomeownerResetSuccess = lazy(() => import("./pages/HomeownerResetSuccess.tsx"));
const HomeownerHome = lazy(() => import("./pages/HomeownerHome.tsx"));
const HomeownerProfile = lazy(() => import("./pages/HomeownerProfile.tsx"));
const HomeownerBookings = lazy(() => import("./pages/HomeownerBookings.tsx"));
const HomeownerSavedWorkers = lazy(() => import("./pages/HomeownerSavedWorkers.tsx"));
const HomeownerSettings = lazy(() => import("./pages/HomeownerSettings.tsx"));
const HomeownerHelp = lazy(() => import("./pages/HomeownerHelp.tsx"));
const HomeownerChangePassword = lazy(() => import("./pages/HomeownerChangePassword.tsx"));
const HomeownerNotifications = lazy(() => import("./pages/HomeownerNotifications.tsx"));
const SearchResult = lazy(() => import("./pages/SearchResult.tsx"));
const WorkerList = lazy(() => import("./pages/WorkerList.tsx"));
const FullMap = lazy(() => import("./pages/FullMap.tsx"));
const WorkerProfile = lazy(() => import("./pages/WorkerProfile.tsx"));
const ViewRequests = lazy(() => import("./pages/ViewRequests.tsx"));
const SubmissionSuccess = lazy(() => import("./pages/SubmissionSuccess.tsx"));
const BookingMessagesPage = lazy(() => import("./pages/BookingMessagesPage.tsx"));

const WorkerLoginPage = lazy(() => import("./workerpages/WorkerLoginPage.tsx"));
const HomeWorker = lazy(() => import("./workerpages/HomeWorker.tsx"));
const WorkersJobs = lazy(() => import("./workerpages/WorkersJobs.tsx"));
const WorkerOwnProfile = lazy(() => import("./workerpages/WorkerOwnProfile.tsx"));
const WorkerSettings = lazy(() => import("./workerpages/WorkerSettings.tsx"));
const WorkerHelp = lazy(() => import("./workerpages/WorkerHelp.tsx"));
const WorkerChangePassword = lazy(() => import("./workerpages/WorkerChangePassword.tsx"));
const WorkerNotifications = lazy(() => import("./workerpages/WorkerNotifications.tsx"));
const WorkerSignup = lazy(() => import("./workerpages/WorkerSignup.tsx"));
const WorkerForgotPassword = lazy(() => import("./workerpages/WorkerForgotPassword.tsx"));
const WorkerResetPassword = lazy(() => import("./workerpages/WorkerResetPassword.tsx"));
const WorkerResetSuccess = lazy(() => import("./workerpages/WorkerResetSuccess.tsx"));

const AdminDashboard = lazy(() => import("./adminPages/Admin-Dashboard.jsx"));
const AdminHomeowners = lazy(() => import("./adminPages/Admin-Homeowners.jsx"));
const AdminWorkers = lazy(() => import("./adminPages/Admin-Workers.jsx"));
const AdminRequest = lazy(() => import("./adminPages/Admin-Request.jsx"));
const AdminEmaillogs = lazy(() => import("./adminPages/Admin-Emaillogs.jsx"));
const AdminLogin = lazy(() => import("./adminPages/Admin-Login.jsx"));
const AdminRegister = lazy(() => import("./adminPages/Admin-Register.jsx"));
const AdminHelpRequests = lazy(() => import("./adminPages/Admin-HelpRequests.jsx"));
const AdminSkills = lazy(() => import("./adminPages/Admin-Skills.jsx"));
const AdminNotifications = lazy(() => import("./adminPages/Admin-Notifications.tsx"));

import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";
import HomeownerGuestOnlyRoute from "./components/auth/HomeownerGuestOnlyRoute.jsx";
import RequireHomeownerAuth from "./components/auth/RequireHomeownerAuth.jsx";
import RequireAnyAuth from "./components/auth/RequireAnyAuth.jsx";
import RequireAdminAuth from "./components/auth/RequireAdminAuth.jsx";
import IdleLogoutHandler from "./components/auth/IdleLogoutHandler.tsx";
import DocumentTitleHandler from "./components/common/DocumentTitleHandler.tsx";
import TrabaHomeChatbot from "./components/chatbot/TrabaHomeChatbot.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import ThemeToggle from "./components/common/ThemeToggle.tsx";

const MessagesRedirect = () => {
  const workerAuth = typeof window !== "undefined" ? localStorage.getItem("trabahome_worker_auth") : null;
  if (workerAuth) {
    try {
      const parsed = JSON.parse(workerAuth);
      if (parsed?.token) return <Navigate to="/worker-messages" replace />;
    } catch {}
  }
  return <Navigate to="/homeowner-messages" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <DocumentTitleHandler />
        <IdleLogoutHandler />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#F9F6F2] text-[#0B3B68] text-sm font-semibold">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/services" element={<ServicesPage />} />

          <Route element={<HomeownerGuestOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/homeowner-forgot-password" element={<HomeownerForgotPassword />} />
            <Route path="/homeowner-reset-password" element={<HomeownerResetPassword />} />
            <Route path="/homeowner-reset-success" element={<HomeownerResetSuccess />} />
          </Route>

          <Route element={<GuestOnlyRoute />}>
            <Route path="/worker-login" element={<WorkerLoginPage />} />
            <Route path="/worker-signup" element={<WorkerSignup />} />
            <Route path="/worker-forgot-password" element={<WorkerForgotPassword />} />
            <Route path="/worker-reset-password" element={<WorkerResetPassword />} />
            <Route path="/worker-reset-success" element={<WorkerResetSuccess />} />
          </Route>

          <Route
            path="/home"
            element={
              <HomeownerHome
                showWhySection={true}
                showHowItWorks={true}
                showFooter={true}
                useContentScroll={false}
              />
            }
          />

          <Route element={<RequireHomeownerAuth />}>
            <Route path="/homeowner-profile" element={<HomeownerProfile />} />
            <Route path="/homeowner-bookings" element={<HomeownerBookings />} />
            <Route path="/homeowner-saved-workers" element={<HomeownerSavedWorkers />} />
            <Route path="/homeowner-settings" element={<HomeownerSettings />} />
            <Route path="/homeowner-change-password" element={<HomeownerChangePassword />} />
            <Route path="/homeowner-help" element={<HomeownerHelp />} />
            <Route path="/homeowner-notifications" element={<HomeownerNotifications />} />
            <Route path="/search" element={<SearchResult />} />
            <Route path="/list" element={<WorkerList />} />
            <Route path="/map" element={<FullMap />} />
            <Route path="/profile/:id" element={<WorkerProfile />} />
            <Route path="/my-requests" element={<ViewRequests />} />
            <Route path="/homeowner-messages" element={<BookingMessagesPage role="homeowner" />} />
          </Route>

          <Route element={<RequireAnyAuth />}>
            <Route path="/homeowner-profile/:id" element={<HomeownerProfile />} />
            <Route path="/messages" element={<MessagesRedirect />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/home-worker" element={<HomeWorker />} />
            <Route path="/HomeWorker" element={<Navigate to="/home-worker" replace />} />
            <Route path="/worker-jobs" element={<WorkersJobs />} />
            <Route path="/worker-messages" element={<BookingMessagesPage role="worker" />} />
            <Route path="/worker-own-profile" element={<WorkerOwnProfile />} />
            <Route path="/worker-settings" element={<WorkerSettings />} />
            <Route path="/worker-help" element={<WorkerHelp />} />
            <Route path="/worker-change-password" element={<WorkerChangePassword />} />
            <Route path="/worker-notifications" element={<WorkerNotifications />} />
            <Route path="/worker-profile" element={<Navigate to="/worker-own-profile" replace />} />
          </Route>

          <Route path="/submission-success" element={<SubmissionSuccess />} />

          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route element={<RequireAdminAuth />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-homeowners" element={<AdminHomeowners />} />
            <Route path="/admin-workers" element={<AdminWorkers />} />
            <Route path="/admin-requests" element={<AdminRequest />} />
            <Route path="/admin-request" element={<Navigate to="/admin-requests" replace />} />
            <Route path="/admin-help-requests" element={<AdminHelpRequests />} />
            <Route path="/admin-help" element={<Navigate to="/admin-help-requests" replace />} />
            <Route path="/admin-emaillogs" element={<AdminEmaillogs />} />
            <Route path="/admin-skills" element={<AdminSkills />} />
            <Route path="/admin-smslogs" element={<Navigate to="/admin-emaillogs" replace />} />
            <Route path="/admin-notifications" element={<AdminNotifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
        <TrabaHomeChatbot />
        <ThemeToggle variant="floating" />
      </Router>
    </ThemeProvider>
  );
}
