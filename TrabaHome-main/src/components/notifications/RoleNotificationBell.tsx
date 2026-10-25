import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { io } from "socket.io-client";
import { readJsonCache, writeJsonCache } from "../../services/pageCache.ts";
import NotificationActorAvatar from "./NotificationActorAvatar.tsx";
import {
  formatNotificationTime,
  getNotificationCacheIdentity,
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

type RoleNotificationBellProps = {
  role: NotificationRole;
  seeAllPath: string;
  onOpen?: () => void;
};

type BellSnapshot = {
  items: NotificationItem[];
  unreadCount: number;
  loadedAt: number;
};

const DROPDOWN_LIMIT = 5;
const CACHE_TTL_MS = 45_000;
const memoryCache = new Map<string, BellSnapshot>();
const requestCache = new Map<string, Promise<BellSnapshot>>();

const cacheKeyFor = (role: NotificationRole) =>
  `trabahome_notifications:${role}:${getNotificationCacheIdentity(role)}`;

const snapshotWithReadItem = (snapshot: BellSnapshot, id: string, readAt: string): BellSnapshot => {
  const wasUnread = snapshot.items.some((item) => item.id === id && !item.readAt);
  return {
    ...snapshot,
    items: snapshot.items.map((item) => item.id === id ? { ...item, readAt: item.readAt || readAt } : item),
    unreadCount: Math.max(0, snapshot.unreadCount - (wasUnread ? 1 : 0)),
  };
};

const RoleNotificationBell: React.FC<RoleNotificationBellProps> = ({ role, seeAllPath, onOpen }) => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<BellSnapshot>(() => {
    const key = cacheKeyFor(role);
    return memoryCache.get(key) || readJsonCache<BellSnapshot>(key, CACHE_TTL_MS) || {
      items: [],
      unreadCount: 0,
      loadedAt: 0,
    };
  });

  const storeSnapshot = (next: BellSnapshot) => {
    const key = cacheKeyFor(role);
    memoryCache.set(key, next);
    writeJsonCache(key, next);
    setSnapshot(next);
  };

  const load = async (force = false) => {
    const key = cacheKeyFor(role);
    const cached = memoryCache.get(key) || readJsonCache<BellSnapshot>(key, CACHE_TTL_MS);
    if (!force && cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      setSnapshot(cached);
      return;
    }

    let pending = requestCache.get(key);
    if (!pending) {
      pending = listNotifications(role, { limit: DROPDOWN_LIMIT }).then((page) => ({
        items: mergeNotificationItems([], page.items, DROPDOWN_LIMIT),
        unreadCount: page.unreadCount,
        loadedAt: Date.now(),
      }));
      requestCache.set(key, pending);
      pending.finally(() => {
        if (requestCache.get(key) === pending) requestCache.delete(key);
      });
    }

    setIsLoading(true);
    try {
      storeSnapshot(await pending);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = getNotificationToken(role);
    if (!token) return;
    const initialLoadTimer = window.setTimeout(() => {
      void load();
    }, 500);

    const socket = NOTIFICATION_SOCKET_URL
      ? io(NOTIFICATION_SOCKET_URL, { auth: { token } })
      : null;

    socket?.on("notification:new", (value: unknown) => {
      const item = normalizeNotificationItem(value);
      if (!item) return;
      setIsAcknowledged(false);
      setSnapshot((current) => {
        const isNewUnread = !item.readAt && !current.items.some((entry) => entry.id === item.id);
        const next = {
          items: mergeNotificationItems(current.items, [item], DROPDOWN_LIMIT),
          unreadCount: current.unreadCount + (isNewUnread ? 1 : 0),
          loadedAt: Date.now(),
        };
        memoryCache.set(cacheKeyFor(role), next);
        writeJsonCache(cacheKeyFor(role), next);
        return next;
      });
    });

    socket?.on("notification:read", (payload: { id?: string; readAt?: string; all?: boolean }) => {
      setSnapshot((current) => {
        const readAt = payload?.readAt || new Date().toISOString();
        const next = payload?.all
          ? { ...current, items: current.items.map((item) => ({ ...item, readAt })), unreadCount: 0 }
          : payload?.id
            ? snapshotWithReadItem(current, payload.id, readAt)
            : current;
        memoryCache.set(cacheKeyFor(role), next);
        writeJsonCache(cacheKeyFor(role), next);
        return next;
      });
    });

    const handleOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.clearTimeout(initialLoadTimer);
      document.removeEventListener("mousedown", handleOutside);
      socket?.disconnect();
    };
  }, [role]);

  const handleItemClick = async (item: NotificationItem) => {
    const previous = snapshot;
    const readAt = item.readAt || new Date().toISOString();
    const next = snapshotWithReadItem(snapshot, item.id, readAt);
    storeSnapshot(next);
    try {
      await markNotificationRead(role, item.id);
    } catch {
      storeSnapshot(previous);
      return;
    }
    setIsOpen(false);
    const route = resolveNotificationRoute(role, item);
    if (route) navigate(route, { state: item.meta || undefined });
  };

  const handleMarkAllRead = async () => {
    const previous = snapshot;
    const readAt = new Date().toISOString();
    storeSnapshot({
      ...snapshot,
      items: snapshot.items.map((item) => ({ ...item, readAt })),
      unreadCount: 0,
    });
    try {
      await markAllNotificationsRead(role);
    } catch {
      storeSnapshot(previous);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            setIsAcknowledged(true);
            onOpen?.();
            void load();
          }
        }}
        className="relative rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5"
        aria-label={`${role} notifications`}
        aria-expanded={isOpen}
      >
        <Bell className="h-6 w-6" />
        {!isAcknowledged && snapshot.unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">
            {snapshot.unreadCount > 99 ? "99+" : snapshot.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-x-2 sm:inset-x-auto sm:absolute sm:right-0 top-14 sm:top-12 z-[80] w-auto sm:w-96 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-black text-[#0B3B68]">Notifications</p>
              <p className="text-[11px] text-gray-500">Newest updates first</p>
            </div>
            {snapshot.unreadCount > 0 && (
              <button type="button" onClick={() => void handleMarkAllRead()} className="text-xs font-bold text-[#0B3B68] hover:text-[#00AF91]">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && snapshot.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Loading notifications...</p>
            ) : snapshot.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : snapshot.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleItemClick(item)}
                className={`w-full border-b border-gray-50 px-3.5 sm:px-4 py-2.5 sm:py-3 text-left transition-colors hover:bg-[#F8FBFF] ${item.readAt ? "bg-white" : "bg-[#F3F8FF]"}`}
              >
                <div className="flex gap-2.5 sm:gap-3 items-start">
                  <NotificationActorAvatar item={item} role={role} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs sm:text-sm font-semibold text-[#0B3B68] truncate">{item.title}</p>
                      {!item.readAt && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0066CC] shrink-0" title="Unread notification" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] sm:text-xs leading-normal sm:leading-5 text-gray-500 line-clamp-2">{item.message}</p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400">{formatNotificationTime(item.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              navigate(seeAllPath);
            }}
            className="w-full border-t border-gray-100 px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-bold text-[#0B3B68] hover:bg-[#F8FBFF]"
          >
            See All
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleNotificationBell;
