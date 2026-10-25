import axios from 'axios';
import { getAdminAuthToken } from '../utils/adminAuth.ts';
import { hydrateServiceRequestActors } from './serviceRequestActors.ts';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const DEFAULT_ADMIN_ROUTE_PREFIXES = ['/admins', '/admin'];
const ADMIN_REQUEST_CACHE_TTL_MS = 15_000;
const adminRequestCache = new Map<string, { createdAt: number; promise: Promise<unknown> }>();

export const invalidateAdminRequestCache = () => {
  adminRequestCache.clear();
};

const getCachedAdminRequest = <TResponse>(key: string, load: () => Promise<TResponse>): Promise<TResponse> => {
  const cached = adminRequestCache.get(key);
  if (cached && Date.now() - cached.createdAt < ADMIN_REQUEST_CACHE_TTL_MS) {
    return cached.promise as Promise<TResponse>;
  }

  const promise = load();
  adminRequestCache.set(key, { createdAt: Date.now(), promise });
  promise.catch(() => {
    if (adminRequestCache.get(key)?.promise === promise) {
      adminRequestCache.delete(key);
    }
  });
  return promise;
};

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

apiClient.interceptors.request.use((config) => {
  const token = getAdminAuthToken();
  if (token) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as typeof config.headers;
  }
  return config;
});

type AdminRouteSuffix = string;

export interface AdminRegisterPayload {
  name?: string;
  email: string;
  password: string;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminLoginOtpPayload {
  email: string;
  code: string;
  otpId?: string;
}

export interface AdminSessionResponse {
  token?: string;
  admin?: Record<string, unknown>;
  email?: string;
  message?: string;
  otpRequired?: boolean;
  requiresOtp?: boolean;
  otpId?: string;
}

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt?: string;
  readAt?: string | null;
  meta?: Record<string, unknown> | null;
  cursor?: string;
}

export interface AdminSupportMessage {
  id: string;
  senderId: string;
  senderRole: 'Homeowner' | 'Worker' | 'Admin';
  message: string;
  createdAt: string;
}

export interface AdminSupportTicket {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  role: 'Homeowner' | 'Worker';
  category: string;
  issueCategory: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages?: AdminSupportMessage[];
}

export interface AdminEmailLog {
  id: string;
  requestId: string;
  recipientName: string;
  recipientRole: string;
  emailAddress: string;
  emailType: string;
  subject: string;
  message: string;
  dateSent: string;
  timestamp: string;
  status: string;
  gatewayResponse: string;
  attempts: number;
}

export interface AdminDashboardDayItem {
  key: string;
  label: string;
  count: number;
}

const buildLastSevenDays = (): AdminDashboardDayItem[] => {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' });

  return Array.from({ length: 7 }, (_value, index) => {
    const day = new Date(utcToday);
    day.setUTCDate(utcToday.getUTCDate() - (6 - index));
    return {
      key: day.toISOString().slice(0, 10),
      label: formatter.format(day),
      count: 0,
    };
  });
};

const isAxios404 = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

const normalizeServiceRequestItem = (item: any) => ({
  id: String(item?.id || item?.bookingNumber || item?._id || ""),
  requestNumber: String(item?.requestNumber || item?.id || item?.bookingNumber || item?._id || ""),
  homeownerId: String(item?.homeownerId || ""),
  targetWorkerId: String(item?.targetWorkerId || item?.workerId || ""),
  homeownerName: String(item?.homeownerName || item?.name || "Homeowner"),
  homeownerEmail: String(item?.homeownerEmail || item?.email || ""),
  workerName: String(item?.workerName || ""),
  workerEmail: String(item?.workerEmail || ""),
  description: String(item?.description || item?.notes || ""),
  contactNumber: String(item?.contactNumber || item?.phone || ""),
  province: String(item?.province || ""),
  city: String(item?.city || ""),
  barangay: String(item?.barangay || ""),
  location: String(item?.location || item?.address || item?.serviceAddress || ""),
  preferredDate: item?.preferredDate || item?.scheduledAt || "",
  preferredTime: String(item?.preferredTime || ""),
  serviceType: String(item?.serviceType || item?.needs || "General Repair"),
  address: String(item?.address || ""),
  status: String(item?.status || "Pending"),
  cancelledBy: item?.cancelledBy ?? null,
  declineReason: String(item?.declineReason || ""),
  adminNote: String(item?.adminNote || ""),
  reviewRating: item?.reviewRating ?? null,
  reviewText: String(item?.reviewText || ""),
  reviewedAt: item?.reviewedAt || null,
  createdAt: item?.createdAt,
  updatedAt: item?.updatedAt,
});

const postAdminWithFallback = async <TResponse>(
  suffix: string,
  payload: unknown,
  prefixes: string[] = DEFAULT_ADMIN_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.post<TResponse>(`${prefix}${suffix}`, payload);
      invalidateAdminRequestCache();
      return response.data;
    } catch (error) {
      const isLastPrefix = index === prefixes.length - 1;
      if (!isAxios404(error) || isLastPrefix) {
        throw error;
      }
      fallbackError = error;
    }
  }

  throw fallbackError;
};

const patchAdminWithFallback = async <TResponse>(
  suffix: string,
  payload: unknown,
  prefixes: string[] = DEFAULT_ADMIN_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.patch<TResponse>(`${prefix}${suffix}`, payload);
      invalidateAdminRequestCache();
      return response.data;
    } catch (error) {
      const isLastPrefix = index === prefixes.length - 1;
      if (!isAxios404(error) || isLastPrefix) {
        throw error;
      }
      fallbackError = error;
    }
  }

  throw fallbackError;
};

const getAdminWithFallback = async <TResponse>(suffix: string, useCache = true): Promise<TResponse> => {
  const cacheKey = `${getAdminAuthToken() || "anonymous"}:${suffix}`;
  const load = async () => {
    let fallbackError: unknown = null;
    for (let index = 0; index < DEFAULT_ADMIN_ROUTE_PREFIXES.length; index += 1) {
      const prefix = DEFAULT_ADMIN_ROUTE_PREFIXES[index];
      try {
        const response = await apiClient.get<TResponse>(`${prefix}${suffix}`);
        return response.data;
      } catch (error) {
        const isLastPrefix = index === DEFAULT_ADMIN_ROUTE_PREFIXES.length - 1;
        if (!isAxios404(error) || isLastPrefix) {
          throw error;
        }
        fallbackError = error;
      }
    }

    throw fallbackError;
  };
  return useCache ? getCachedAdminRequest(cacheKey, load) : load();
};

export const adminAPI = {
  login: async (payload: AdminLoginPayload): Promise<AdminSessionResponse> =>
    postAdminWithFallback<AdminSessionResponse>('/login', payload),

  verifyLoginOtp: async (payload: AdminLoginOtpPayload): Promise<AdminSessionResponse> =>
    postAdminWithFallback<AdminSessionResponse>('/verify-login-otp', payload),

  resendLoginOtp: async (email: string): Promise<{ success: boolean; message: string; otpId?: string }> =>
    postAdminWithFallback<{ success: boolean; message: string; otpId?: string }>('/resend-login-otp', { email }),

  me: async (): Promise<{ admin?: Record<string, unknown> }> =>
    getAdminWithFallback<{ admin?: Record<string, unknown> }>('/me'),

  listHomeowners: async (): Promise<{ success: boolean; count: number; data: unknown[] }> =>
    getAdminWithFallback<{ success: boolean; count: number; data: unknown[] }>('/homeowners'),

  updateHomeowner: async (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      city: string;
      barangay: string;
      province: string;
      address: string;
    }
  ): Promise<{ success: boolean; message?: string; data?: Record<string, unknown> }> => {
    const prefixes = DEFAULT_ADMIN_ROUTE_PREFIXES;
    let fallbackError: unknown = null;

    for (let index = 0; index < prefixes.length; index += 1) {
      const prefix = prefixes[index];
      try {
        const response = await apiClient.patch<{
          success: boolean;
          message?: string;
          data?: Record<string, unknown>;
        }>(`${prefix}/homeowners/${encodeURIComponent(id)}`, payload);
        invalidateAdminRequestCache();
        return response.data;
      } catch (error) {
        const isLastPrefix = index === prefixes.length - 1;
        if (!isAxios404(error) || isLastPrefix) throw error;
        fallbackError = error;
      }
    }

    throw fallbackError;
  },

  createHomeowner: async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    city: string;
    barangay: string;
    province?: string;
    address?: string;
    status?: string;
  }): Promise<{ success: boolean; message?: string; data?: Record<string, unknown> }> => {
    invalidateAdminRequestCache();
    return postAdminWithFallback<{ success: boolean; message?: string; data?: Record<string, unknown> }>(
      '/homeowners',
      payload
    );
  },

  createWorker: async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    profession: string;
    city: string;
    barangay: string;
    province?: string;
    status?: string;
    bio?: string;
    yearsExperience?: number;
    workingSchedule?: string;
    availabilityStatus?: string;
    price?: string;
  }): Promise<{ success: boolean; message?: string; data?: Record<string, unknown>; worker?: Record<string, unknown> }> => {
    invalidateAdminRequestCache();
    return postAdminWithFallback<{ success: boolean; message?: string; data?: Record<string, unknown>; worker?: Record<string, unknown> }>(
      '/workers',
      payload
    );
  },

  getHomeownerProfile: async (id: string): Promise<{
    success?: boolean;
    canEdit?: boolean;
    viewerRole?: string;
    homeowner?: Record<string, unknown>;
    summary?: Record<string, number>;
    requests?: unknown[];
  }> =>
    getAdminWithFallback<{
      success?: boolean;
      canEdit?: boolean;
      viewerRole?: string;
      homeowner?: Record<string, unknown>;
      summary?: Record<string, number>;
      requests?: unknown[];
    }>(`/homeowner-profiles/${encodeURIComponent(id)}`),

  getDashboardStats: async (): Promise<{
    success: boolean;
    totalWorkers: number;
    pendingVerifications: number;
    pendingRequests: number;
    totalHomeowners: number;
    supportTickets: number;
    requestPerDay: AdminDashboardDayItem[];
  }> => {
    try {
      return await getAdminWithFallback<{
        success: boolean;
        totalWorkers: number;
        pendingVerifications: number;
        pendingRequests: number;
        totalHomeowners: number;
        supportTickets: number;
        requestPerDay: AdminDashboardDayItem[];
      }>('/dashboard');
    } catch (error) {
      if (!isAxios404(error)) throw error;

      const [workersResult, pendingWorkersResult, requestsResult, homeownersResult, ticketsResult] = await Promise.all([
        adminAPI.getWorkers(undefined, true),
        adminAPI.getWorkers('Pending', true),
        adminAPI.listServiceRequests(undefined, true),
        adminAPI.listHomeowners(),
        adminAPI.listSupportTickets(true),
      ]);

      const requests = Array.isArray(requestsResult?.items) ? requestsResult.items : [];
      const days = buildLastSevenDays();
      const counts = new Map<string, number>();

      requests.forEach((request: any) => {
        const createdAt = request?.createdAt ? new Date(request.createdAt) : null;
        if (!createdAt || Number.isNaN(createdAt.getTime())) return;
        const key = createdAt.toISOString().slice(0, 10);
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      return {
        success: true,
        totalWorkers: Number(workersResult?.count ?? 0),
        pendingVerifications: Number(pendingWorkersResult?.count ?? 0),
        pendingRequests: requests.filter((request: any) => String(request?.status || '').toUpperCase() === 'PENDING').length,
        totalHomeowners: Number(homeownersResult?.count ?? 0),
        supportTickets: Number(ticketsResult?.count ?? 0),
        requestPerDay: days.map((day) => ({
          ...day,
          count: counts.get(day.key) || 0,
        })),
      };
    }
  },

  register: async (payload: AdminRegisterPayload): Promise<{ success?: boolean; message?: string }> =>
    postAdminWithFallback<{ success?: boolean; message?: string }>('/register', payload),

  getWorkers: async (
    status?: string,
    summary = false
  ): Promise<{ success: boolean; count: number; data: unknown[]; averageRating?: number }> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (summary) params.set('summary', 'true');
    const query = params.toString();
    return getAdminWithFallback<{ success: boolean; count: number; data: unknown[]; averageRating?: number }>(
      `/workers${query ? `?${query}` : ''}`
    );
  },

  getWorker: async (id: string): Promise<{ success: boolean; data?: any; worker?: any }> =>
    getAdminWithFallback<{ success: boolean; data?: any; worker?: any }>(
      `/workers/${encodeURIComponent(id)}`,
      false
    ),

  updateWorker: async (
    id: string,
    payload: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      profession: string;
      barangay: string;
      city: string;
      province: string;
    }
  ): Promise<{ success: boolean; message?: string; data?: Record<string, unknown> }> =>
    patchAdminWithFallback<{ success: boolean; message?: string; data?: Record<string, unknown> }>(
      `/workers/${encodeURIComponent(id)}`,
      payload
    ),

  getNotifications: async (): Promise<{ success: boolean; unreadCount: number; items: AdminNotificationItem[] }> =>
    getAdminWithFallback<{ success: boolean; unreadCount: number; items: AdminNotificationItem[] }>('/notifications'),

  markNotificationRead: async (id: string): Promise<{ success: boolean; item?: AdminNotificationItem }> =>
    postAdminWithFallback<{ success: boolean; item?: AdminNotificationItem }>(`/notifications/${encodeURIComponent(id)}/read`, {}),

  markAllNotificationsRead: async (): Promise<{ success: boolean; readAt?: string }> =>
    postAdminWithFallback<{ success: boolean; readAt?: string }>('/notifications/read-all', {}),

  listBookings: async (
    summary = false
  ): Promise<{ success: boolean; count: number; items: unknown[]; pendingCount?: number }> =>
    getAdminWithFallback<{ success: boolean; count: number; items: unknown[]; pendingCount?: number }>(
      `/bookings${summary ? '?summary=true' : ''}`
    ),

  getEmailLogs: async (): Promise<{
    success: boolean;
    count: number;
    summary: { total: number; delivered: number; failed: number; deliveryRate: string };
    data: Array<{
      id: string;
      requestId: string;
      recipientName: string;
      recipientRole: string;
      emailAddress: string;
      emailType: string;
      subject: string;
      message: string;
      dateSent: string;
      timestamp: string;
      status: string;
      gatewayResponse: string;
      attempts: number;
    }>;
  }> =>
    getAdminWithFallback<{
      success: boolean;
      count: number;
      summary: { total: number; delivered: number; failed: number; deliveryRate: string };
      data: Array<any>;
    }>('/email-logs', false),

  listServiceRequests: async (
    status?: string,
    summary = false,
    avatarMode: 'include' | 'none' | 'only' = 'include'
  ): Promise<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (summary) params.set('summary', 'true');
    params.set('includeProof', 'true');
    if (avatarMode !== 'include') params.set('avatars', avatarMode);
    const query = params.toString();
    return hydrateServiceRequestActors(
      await getAdminWithFallback<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }>(
        `/service-requests${query ? `?${query}` : ''}`
      ).catch(async (error) => {
      if (!isAxios404(error)) throw error;
      const fallback = await adminAPI.listBookings();
      const items = fallback.items
        .map(normalizeServiceRequestItem)
        .filter((item: any) => !status || String(item.status || "").toLowerCase() === String(status || "").toLowerCase());
      return {
        success: true,
        count: items.length,
        items,
      };
      })
    );
  },

  getBookings: async () => adminAPI.listServiceRequests(),

  getServiceRequest: async (id: string): Promise<{ success: boolean; item?: any; request?: any; data?: any }> =>
    getAdminWithFallback<{ success: boolean; item?: any; request?: any; data?: any }>(
      `/service-requests/${encodeURIComponent(id)}`,
      false
    ),

  updateServiceRequest: async (id: string, payload: { status?: string; adminNote?: string }) =>
    patchAdminWithFallback(`/service-requests/${encodeURIComponent(id)}`, payload),

  getServiceRequestMessages: async (id: string): Promise<{ success: boolean; messages: any[] }> =>
    getAdminWithFallback<{ success: boolean; messages: any[] }>(
      `/service-requests/${encodeURIComponent(id)}/messages`,
      false
    ),

  sendServiceRequestMessage: async (
    id: string,
    payload: { message: string; attachments?: any[] }
  ): Promise<{ success: boolean; message: any }> =>
    postAdminWithFallback<{ success: boolean; message: any }>(
      `/service-requests/${encodeURIComponent(id)}/messages`,
      payload
    ),

  listSupportTickets: async (
    summary = false
  ): Promise<{ success: boolean; count: number; items: AdminSupportTicket[] }> =>
    getAdminWithFallback<{ success: boolean; count: number; items: AdminSupportTicket[] }>(
      `/support/tickets${summary ? '?summary=true' : ''}`
    ),

  getSupportTicket: async (
    id: string
  ): Promise<{ success: boolean; ticket: AdminSupportTicket }> =>
    getAdminWithFallback<{ success: boolean; ticket: AdminSupportTicket }>(
      `/support/tickets/${encodeURIComponent(id)}`,
      false
    ),

  replyToSupportTicket: async (
    id: string,
    message: string
  ): Promise<{ success: boolean; ticket: AdminSupportTicket }> =>
    postAdminWithFallback<{ success: boolean; ticket: AdminSupportTicket }>(
      `/support/tickets/${encodeURIComponent(id)}/replies`,
      { message }
    ),

  updateSupportTicketStatus: async (
    id: string,
    status: string
  ): Promise<{ success: boolean; message?: string; ticket?: unknown }> =>
    patchAdminWithFallback<{ success: boolean; message?: string; ticket?: unknown }>(
      `/support/tickets/${encodeURIComponent(id)}/status`,
      { status }
    ),

  updateWorkerStatus: async (id: string, status: string): Promise<{ success: boolean; message?: string; data?: unknown }> => {
    const prefixes = DEFAULT_ADMIN_ROUTE_PREFIXES;
    let fallbackError: unknown = null;

    for (let index = 0; index < prefixes.length; index += 1) {
      const prefix = prefixes[index];
      try {
        const response = await apiClient.patch<{ success: boolean; message?: string; data?: unknown }>(`${prefix}/workers/${id}/status`, { status });
        invalidateAdminRequestCache();
        return response.data;
      } catch (error) {
        const isLastPrefix = index === prefixes.length - 1;
        if (!isAxios404(error) || isLastPrefix) {
          throw error;
        }
        fallbackError = error;
      }
    }

    throw fallbackError;
  },

  updateHomeownerStatus: async (id: string, status: string): Promise<{ success: boolean; message?: string; data?: unknown }> => {
    const prefixes = DEFAULT_ADMIN_ROUTE_PREFIXES;
    let fallbackError: unknown = null;

    for (let index = 0; index < prefixes.length; index += 1) {
      const prefix = prefixes[index];
      try {
        const response = await apiClient.patch<{ success: boolean; message?: string; data?: unknown }>(`${prefix}/homeowners/${id}/status`, { status });
        invalidateAdminRequestCache();
        return response.data;
      } catch (error) {
        const isLastPrefix = index === prefixes.length - 1;
        if (!isAxios404(error) || isLastPrefix) {
          throw error;
        }
        fallbackError = error;
      }
    }

    throw fallbackError;
  },

  getEmailLogs: async (
    useCache = false
  ): Promise<{
    success: boolean;
    count: number;
    summary: {
      total: number;
      delivered: number;
      failed: number;
      deliveryRate: string;
    };
    data: AdminEmailLog[];
  }> =>
    getAdminWithFallback<{
      success: boolean;
      count: number;
      summary: {
        total: number;
        delivered: number;
        failed: number;
        deliveryRate: string;
      };
      data: AdminEmailLog[];
    }>('/email-logs', useCache),

  logout: async (): Promise<{ message?: string }> =>
    postAdminWithFallback<{ message?: string }>('/logout', {}),

  // Skills Management
  getSkillsAdmin: async (): Promise<{ success: boolean; count: number; skills: any[] }> => {
    const res = await apiClient.get('/skills/admin');
    return res.data;
  },

  createSkill: async (payload: { name: string; category?: string; startingPrice: number; description?: string; isActive?: boolean }): Promise<any> => {
    const res = await apiClient.post('/skills/admin', payload);
    return res.data;
  },

  updateSkill: async (id: string, payload: Partial<{ name: string; category: string; startingPrice: number; description: string; isActive: boolean }>): Promise<any> => {
    const res = await apiClient.patch(`/skills/admin/${id}`, payload);
    return res.data;
  },

  deleteSkill: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/skills/admin/${id}`);
    return res.data;
  },

  // Worker Profile Updates
  getPendingWorkerProfileUpdates: async (): Promise<{ success: boolean; count: number; updates: any[] }> => {
    const res = await apiClient.get('/admin/workers/profile-updates');
    return res.data;
  },

  reviewWorkerProfileUpdate: async (workerId: string, payload: { action: 'approve' | 'reject'; rejectionReason?: string }): Promise<any> => {
    const res = await apiClient.patch(`/admin/workers/${workerId}/profile-update`, payload);
    return res.data;
  },

  invalidateCache: invalidateAdminRequestCache,
};

export const fetchPublicSkills = async (): Promise<Array<{ _id: string; name: string; category: string; startingPrice: number; description?: string }>> => {
  try {
    const res = await apiClient.get('/skills');
    return res.data?.skills || [];
  } catch (err) {
    console.error('Failed to fetch public skills:', err);
    return [];
  }
};
