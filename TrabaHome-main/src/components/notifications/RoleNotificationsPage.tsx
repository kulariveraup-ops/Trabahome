import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import Navbar from "../requestpages/Navbar.jsx";
import WorkerHeader from "../workersjobs/Header.tsx";
import Sidebar from "../workersjobs/SideBar.tsx";
import AdminNotificationBell from "../adminNotifications/AdminNotificationBell.tsx";
import NotificationActorAvatar from "./NotificationActorAvatar.tsx";
import { clearWorkerSession, getWorkerSession } from "../../utils/workerAuth.ts";
import {
  formatNotificationTime,
  getNotificationToken,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  mergeNotificationItems,
  normalizeNotificationItem,
  NOTIFICATION_SOCKET_URL,
  resolveNotificationRoute,
  type NotificationItem,
  type NotificationRole,
} from "../../services/notificationClient.ts";

type RoleNotificationsPageProps = {
  role: NotificationRole;
};

const PAGE_LIMIT = 20;

const RoleNotificationsPage: React.FC<RoleNotificationsPageProps> = ({ role }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const workerHeaderRef = useRef<HTMLElement | null>(null);
  const [workerHeaderHeight, setWorkerHeaderHeight] = useState(0);
  const workerSession = role === "worker" ? getWorkerSession() : null;
  const worker = workerSession?.worker || {};
  const workerName = String(
    [worker.firstName, worker.lastName].filter(Boolean).join(" ").trim() ||
      worker.name ||
      worker.fullName ||
      "Worker"
  ).trim();
  const workerAvatar = String(
    worker.avatar || worker.profileImage || worker.photoUrl || worker.image || worker.photo || ""
  ).trim();
  const workerProfession = String(worker.profession || "").trim() || "Profession not set";
  const workerRating = Number.isFinite(Number(worker.rating)) ? Number(worker.rating) : null;

  const load = async (cursor?: string | null) => {
    cursor ? setIsLoadingMore(true) : setIsLoading(true);
    setError("");
    try {
      const page = await listNotifications(role, { limit: PAGE_LIMIT, cursor });
      setItems((current) => mergeNotificationItems(cursor ? current : [], page.items));
      setNextCursor(page.nextCursor);
      setUnreadCount(page.unreadCount);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load notifications.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void load();
    const token = getNotificationToken(role);
    if (!token || !NOTIFICATION_SOCKET_URL) return;

    const socket = io(NOTIFICATION_SOCKET_URL, { auth: { token } });
    socket.on("notification:new", (value: unknown) => {
      const item = normalizeNotificationItem(value);
      if (!item) return;
      setItems((current) => mergeNotificationItems(current, [item]));
      if (!item.readAt) setUnreadCount((count) => count + 1);
    });
    socket.on("notification:read", (payload: { id?: string; readAt?: string; all?: boolean }) => {
      const readAt = payload?.readAt || new Date().toISOString();
      if (payload?.all) {
        setItems((current) => current.map((item) => ({ ...item, readAt })));
        setUnreadCount(0);
      } else if (payload?.id) {
        setItems((current) => {
          const wasUnread = current.some((item) => item.id === payload.id && !item.readAt);
          if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
          return current.map((item) => item.id === payload.id ? { ...item, readAt: item.readAt || readAt } : item);
        });
      }
    });
    return () => socket.disconnect();
  }, [role]);

  useLayoutEffect(() => {
    if (role !== "worker" || !workerHeaderRef.current) return;
    const node = workerHeaderRef.current;
    const update = () => setWorkerHeaderHeight(node.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [role]);

  const handleClick = async (item: NotificationItem) => {
    const wasUnread = !item.readAt;
    const readAt = item.readAt || new Date().toISOString();
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt } : entry));
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await markNotificationRead(role, item.id);
    } catch {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: item.readAt || null } : entry));
      if (wasUnread) setUnreadCount((count) => count + 1);
      return;
    }
    const route = resolveNotificationRoute(role, item);
    if (route) navigate(route, { state: item.meta || undefined });
  };

  const handleMarkAllRead = async () => {
    const readAt = new Date().toISOString();
    setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt || readAt })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead(role);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const backPath = role === "admin" ? "/admin-dashboard" : role === "worker" ? "/home-worker" : "/home";
  const workerSidebarTop = workerHeaderHeight ? workerHeaderHeight + 24 : 88;
  const workerSidebarHeight = workerHeaderHeight
    ? `calc(100vh - ${workerHeaderHeight + 48}px)`
    : "calc(100vh - 112px)";

  const handleWorkerLogout = () => {
    clearWorkerSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      {role === "homeowner" ? (
        <Navbar />
      ) : role === "worker" ? (
        <>
          <WorkerHeader ref={workerHeaderRef} onLogoClick={() => navigate("/home-worker")} />
          <div aria-hidden="true" style={{ height: workerHeaderHeight || 72 }} />
        </>
      ) : (
        <header className="sticky top-0 z-50 border-b border-[#E7E2DA] bg-[#F9F5F0]">
          <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
            <img src="/assets/Logo.png" alt="TrabaHome" className="h-8 cursor-pointer" onClick={() => navigate("/admin-dashboard")} />
            <AdminNotificationBell />
          </div>
        </header>
      )}

      <div className={role === "worker" ? "mx-auto flex flex-col lg:flex-row w-full max-w-[1280px] items-start gap-4 lg:gap-6 p-3 sm:p-6 pb-24 lg:pb-6" : ""}>
        {role === "worker" && (
          <Sidebar
            location={{ pathname: "/worker-notifications" }}
            navigate={navigate}
            workerName={workerName}
            workerAvatar={workerAvatar}
            workerProfession={workerProfession}
            workerRating={workerRating}
            onLogout={handleWorkerLogout}
            stickyTop={workerSidebarTop}
            stickyHeight={workerSidebarHeight}
          />
        )}

      <main className={role === "worker" ? "min-w-0 max-w-[1080px] flex-1 w-full" : "mx-auto max-w-4xl px-4 sm:px-5 py-6 sm:py-8"}>
        <button type="button" onClick={() => navigate(backPath)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0B3B68]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <section className="overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0B3B68]">Notifications</h1>
              <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">Newest updates appear first.</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs sm:text-sm font-bold text-[#0B3B68] hover:text-[#00AF91] hover:underline transition-colors px-2 py-1 rounded-lg cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#F3F8FF] px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#0B3B68]">
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {unreadCount} unread
              </div>
            </div>
          </div>

          {error && <p className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">{error}</p>}

          <div>
            {isLoading && items.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-gray-500">Loading notifications...</p>
            ) : items.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : items.map((item) => {
              const route = resolveNotificationRoute(role, item);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleClick(item)}
                  className={`w-full border-b border-gray-100 px-3.5 sm:px-6 py-3.5 sm:py-5 text-left transition-colors hover:bg-[#F8FBFF] ${item.readAt ? "bg-white" : "bg-[#F3F8FF]"}`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <NotificationActorAvatar item={item} role={role} size="small" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-xs sm:text-sm md:text-base font-bold text-[#0B3B68] truncate">{item.title}</p>
                          {!item.readAt && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#0066CC] shrink-0" title="Unread notification" />
                          )}
                        </div>
                        <time className="text-[10px] sm:text-xs text-gray-400 shrink-0">{formatNotificationTime(item.createdAt)}</time>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm leading-relaxed text-gray-600">{item.message}</p>
                      {route && <p className="mt-1.5 text-[11px] sm:text-xs font-semibold text-[#00A884]">Open related item →</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {nextCursor && (
            <div className="p-4 text-center">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => void load(nextCursor)}
                className="rounded-xl bg-[#0B3B68] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {isLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </section>
      </main>
      </div>
    </div>
  );
};

export default RoleNotificationsPage;
