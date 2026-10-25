import { getAdminAuthToken, getAdminSession } from "../utils/adminAuth.ts";
import { getHomeownerAuthToken, getHomeownerSession } from "../utils/homeownerAuth.ts";
import { getWorkerAuthToken, getWorkerSession } from "../utils/workerAuth.ts";

export type NotificationRole = "admin" | "homeowner" | "worker";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  readAt: string | null;
  route?: string;
  meta?: Record<string, unknown> | null;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  actorAvatar?: string;
  [key: string]: unknown;
};

export type NotificationActor = {
  id: string;
  role: string;
  name: string;
  avatar: string;
};

export type NotificationPage = {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env || {};
export const NOTIFICATION_API_BASE_URL = viteEnv.VITE_API_BASE_URL || "http://localhost:8000/api";
export const NOTIFICATION_SOCKET_URL = NOTIFICATION_API_BASE_URL.startsWith("http")
  ? NOTIFICATION_API_BASE_URL.replace(/\/api\/?$/, "")
  : (typeof window !== "undefined" ? window.location.origin : "");

const rolePath: Record<NotificationRole, string> = {
  admin: "admins",
  homeowner: "homeowners",
  worker: "workers",
};

export const getNotificationToken = (role: NotificationRole) => {
  if (role === "admin") return getAdminAuthToken();
  if (role === "homeowner") return getHomeownerAuthToken();
  return getWorkerAuthToken();
};

export const getNotificationCacheIdentity = (role: NotificationRole) => {
  const session = role === "admin"
    ? getAdminSession()
    : role === "homeowner"
      ? getHomeownerSession()
      : getWorkerSession();
  return String(session?.email || session?.token?.slice(0, 16) || "anonymous").trim().toLowerCase();
};

const request = async <T,>(role: NotificationRole, path: string, options: RequestInit = {}): Promise<T> => {
  const token = getNotificationToken(role);
  if (!token) throw new Error("Unauthorized.");

  const response = await fetch(`${NOTIFICATION_API_BASE_URL}/${rolePath[role]}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(String(payload?.message || "Notification request failed."));
  }
  return response.json() as Promise<T>;
};

export const normalizeNotificationItem = (value: any): NotificationItem | null => {
  const id = String(value?.id || value?._id || "").trim();
  if (!id) return null;
  return {
    ...value,
    id,
    title: String(value?.title || "Notification"),
    message: String(value?.message || ""),
    type: String(value?.type || "info"),
    createdAt: value?.createdAt || new Date().toISOString(),
    readAt: value?.readAt || null,
    route: String(value?.route || value?.meta?.route || "").trim(),
    actorId: String(value?.actorId || value?.meta?.actorId || "").trim(),
    actorRole: String(value?.actorRole || value?.meta?.actorRole || "").trim().toLowerCase(),
    actorName: String(value?.actorName || value?.meta?.actorName || "").trim(),
    actorAvatar: String(value?.actorAvatar || value?.meta?.actorAvatar || "").trim(),
    meta: value?.meta ?? null,
  };
};

const firstNotificationString = (...values: unknown[]) => {
  for (const value of values) {
    const candidate = String(value || "").trim();
    if (candidate) return candidate;
  }
  return "";
};

export const resolveNotificationActor = (
  recipientRole: NotificationRole,
  item: NotificationItem
): NotificationActor => {
  const meta = item.meta || {};
  const explicitRole = firstNotificationString(item.actorRole, meta.actorRole).toLowerCase();
  const homeowner = {
    id: firstNotificationString(item.homeownerId, meta.homeownerId),
    role: "homeowner",
    name: firstNotificationString(item.homeownerName, meta.homeownerName),
    avatar: firstNotificationString(
      item.homeownerAvatar,
      item.homeownerProfileImage,
      meta.homeownerAvatar,
      meta.homeownerProfileImage
    ),
  };
  const worker = {
    id: firstNotificationString(item.workerId, meta.workerId),
    role: "worker",
    name: firstNotificationString(item.workerName, meta.workerName),
    avatar: firstNotificationString(
      item.workerAvatar,
      item.workerProfileImage,
      meta.workerAvatar,
      meta.workerProfileImage
    ),
  };

  const fallback = explicitRole === "worker"
    ? worker
    : explicitRole === "homeowner"
      ? homeowner
      : recipientRole === "homeowner"
        ? worker
        : recipientRole === "worker"
          ? homeowner
          : homeowner.id || homeowner.name || homeowner.avatar
            ? homeowner
            : worker;

  return {
    id: firstNotificationString(item.actorId, meta.actorId, fallback.id),
    role: explicitRole || fallback.role,
    name: firstNotificationString(item.actorName, meta.actorName, meta.senderName, fallback.name),
    avatar: firstNotificationString(
      item.actorAvatar,
      meta.actorAvatar,
      meta.actorProfileImage,
      meta.senderAvatar,
      fallback.avatar
    ),
  };
};

export const sortNotificationsNewestFirst = (items: NotificationItem[]) =>
  [...items].sort((left, right) => {
    const timeDifference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return timeDifference || right.id.localeCompare(left.id);
  });

export const mergeNotificationItems = (
  current: NotificationItem[],
  incoming: NotificationItem[],
  limit?: number
) => {
  const byId = new Map<string, NotificationItem>();
  [...current, ...incoming].forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });
  const sorted = sortNotificationsNewestFirst([...byId.values()]);
  return limit ? sorted.slice(0, limit) : sorted;
};

export const listNotifications = async (
  role: NotificationRole,
  { limit = 20, cursor }: { limit?: number; cursor?: string | null } = {}
): Promise<NotificationPage> => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  const data = await request<any>(role, `/notifications?${params.toString()}`);
  const actorByKey = new Map<string, NotificationActor>();
  (Array.isArray(data?.actors) ? data.actors : []).forEach((value: unknown) => {
    const actor = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const id = String(actor.id || "").trim();
    const actorRole = String(actor.role || "").trim().toLowerCase();
    if (!id || !actorRole) return;
    actorByKey.set(`${actorRole}:${id}`, {
      id,
      role: actorRole,
      name: String(actor.name || "").trim(),
      avatar: String(actor.avatar || "").trim(),
    });
  });
  return {
    items: ((Array.isArray(data?.items) ? data.items : [])
      .map(normalizeNotificationItem)
      .filter(Boolean) as NotificationItem[]).map((item) => {
        const actor = actorByKey.get(`${String(item.actorRole || '').toLowerCase()}:${String(item.actorId || '')}`);
        if (!actor) return item;
        return {
          ...item,
          actorName: item.actorName || actor.name,
          actorAvatar: item.actorAvatar || actor.avatar,
        };
      }),
    unreadCount: Math.max(0, Number(data?.unreadCount) || 0),
    nextCursor: data?.nextCursor || null,
  };
};

export const markNotificationRead = (role: NotificationRole, id: string) =>
  request<{ success: boolean; item?: NotificationItem }>(
    role,
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: "POST" }
  );

export const markAllNotificationsRead = (role: NotificationRole) =>
  request<{ success: boolean }>(role, "/notifications/read-all", { method: "POST" });

export const resolveNotificationRoute = (role: NotificationRole, item: NotificationItem) => {
  const route = String(item.route || item.meta?.route || "").trim();
  if (!route.startsWith("/")) return "";
  if (role === "admin") return route.startsWith("/admin-") ? route : "";
  if (role === "worker") return route === "/home-worker" || route.startsWith("/worker-") ? route : "";
  return route === "/home" || route.startsWith("/homeowner-") || route.startsWith("/profile/") || route === "/my-requests"
    ? route
    : "";
};

export const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
