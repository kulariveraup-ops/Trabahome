import axios from 'axios';

import { hydrateServiceRequestActors } from './serviceRequestActors.ts';

const HOMEOWNER_AUTH_STORAGE_KEY = 'trabahome_homeowner_auth';

const getHomeownerAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(HOMEOWNER_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { token?: unknown };
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
      return parsed.token;
    }
  } catch {
    if (raw.trim()) return raw;
  }

  return null;
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const DEFAULT_HOMEOWNER_ROUTE_PREFIXES = ['/homeowners', '/homeowner'];

const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 45000 });

apiClient.interceptors.request.use((config) => {
  const token = getHomeownerAuthToken();
  if (token) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as typeof config.headers;
  }
  return config;
});

type HomeownerRouteSuffix = string;

export interface HomeownerRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  city: string;
  barangay: string;
  province: string;
  address?: string;
  password: string;
  confirmPassword?: string;
  agreeToTerms?: boolean;
  agreeToPrivacy?: boolean;
  agreeTerms?: boolean;
  agreePrivacy?: boolean;
  code?: string;
  otpCode?: string;
  otpId?: string;
  [key: string]: unknown;
}

export interface HomeownerLoginOtpPayload {
  email: string;
  code: string;
  otpId: string;
}

export interface HomeownerChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  code: string;
}

export interface HomeownerSessionResponse {
  token?: string;
  homeowner?: Record<string, unknown>;
  email?: string;
  message?: string;
  otpRequired?: boolean;
  requiresOtp?: boolean;
  otpId?: string;
  mustChangePassword?: boolean;
}

export interface HomeownerUpdatePayload {
  avatar?: string;
  profileImage?: string;
  emailNotifications?: boolean;
  email_notifications?: boolean;
  [key: string]: unknown;
}

export interface HomeownerBookingPayload {
  workerId: string;
  serviceType: string;
  scheduledAt: string;
  address: string;
  notes?: string;
  photos?: string[];
}

export interface HomeownerBookingResponse {
  booking: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export interface ServiceRequestPayload {
  targetWorkerId: string;
  description: string;
  preferredDate: string;
  preferredTime: string;
  serviceType?: string;
  contactNumber: string;
  province: string;
  city: string;
  barangay: string;
  location: string;
  address: string;
}

export interface ServiceRequestResponse {
  success: boolean;
  request: { id: string; status: string; [key: string]: unknown };
}

export interface ServiceRequestReviewPayload {
  rating: number;
  reviewText: string;
  reviewTags?: string[];
}

export const SUSPENDED_HOMEOWNER_REQUEST_MESSAGE =
  "Your account has been suspended by the administrator. You cannot request services until your account is reactivated.";

export const isSuspendedHomeownerAccount = (homeowner?: Record<string, unknown> | null): boolean => {
  const status = String(homeowner?.status || "").trim().toLowerCase();
  if (status === "suspended" || status === "disabled" || status === "inactive") return true;
  if (homeowner?.disabled === true) return true;
  if (homeowner?.isDisabled === true) return true;
  if (homeowner?.isActive === false) return true;
  return false;
};

const isAxios404 = (error: unknown): boolean =>
  axios.isAxiosError(error) && error.response?.status === 404;

type RequestCacheEntry<TResponse> = {
  promise: Promise<TResponse>;
  createdAt: number;
};

const HOMEOWNER_REQUEST_CACHE_TTL_MS = 15_000;
const homeownerRequestCache = new Map<string, RequestCacheEntry<unknown>>();
let freshHomeownerMeInFlight: {
  key: string;
  promise: Promise<{ homeowner?: Record<string, unknown> }>;
} | null = null;

const invalidateHomeownerRequestCache = () => {
  homeownerRequestCache.clear();
};

const getCachedRequest = <TResponse>(key: string) => {
  const entry = homeownerRequestCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > HOMEOWNER_REQUEST_CACHE_TTL_MS) {
    homeownerRequestCache.delete(key);
    return null;
  }
  return entry.promise as Promise<TResponse>;
};

const setCachedRequest = <TResponse>(key: string, promise: Promise<TResponse>) => {
  homeownerRequestCache.set(key, { promise, createdAt: Date.now() });
  promise.then(
    () => {
      const current = homeownerRequestCache.get(key);
      if (current?.promise === promise && Date.now() - current.createdAt > HOMEOWNER_REQUEST_CACHE_TTL_MS) {
        homeownerRequestCache.delete(key);
      }
    },
    () => {
      const current = homeownerRequestCache.get(key);
      if (current?.promise === promise) {
        homeownerRequestCache.delete(key);
      }
    }
  );
  return promise;
};

const SERVICE_REQUEST_SYNC_EVENT = 'trabahome:service-request-changed';

const emitServiceRequestChanged = (requestId: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      'trabahome_service_request_changed',
      JSON.stringify({ time: Date.now(), id: requestId })
    );
    window.dispatchEvent(new Event(SERVICE_REQUEST_SYNC_EVENT));
  } catch {
    // ignore browser storage issues
  }
};

const normalizeServiceRequestItem = (item: any) => {
  const scheduledAt = item?.scheduledAt || item?.preferredDate || item?.createdAt || "";
  const worker = item?.worker || {};
  const preferredDate =
    item?.preferredDate ||
    (scheduledAt ? String(scheduledAt).slice(0, 10) : "") ||
    "";
  const preferredTime = item?.preferredTime || "";

  return {
    id: String(item?.id || item?.bookingNumber || item?._id || ""),
    requestNumber: String(item?.requestNumber || item?.id || item?.bookingNumber || item?._id || ""),
    homeownerId: String(item?.homeownerId || ""),
    targetWorkerId: String(item?.targetWorkerId || item?.workerId || worker?._id || worker?.id || ""),
    homeownerName: String(item?.homeownerName || ""),
    homeownerEmail: String(item?.homeownerEmail || ""),
    workerName: String(item?.workerName || worker?.name || worker?.fullName || worker?.firstName || item?.name || ""),
    workerEmail: String(item?.workerEmail || worker?.email || item?.email || ""),
    workerPhone: String(item?.workerPhone || worker?.phone || item?.phone || ""),
    workerAvatar: String(
      item?.workerAvatar ||
      item?.workerProfileImage ||
      worker?.avatar ||
      worker?.profileImage ||
      worker?.profilePicture ||
      worker?.photoUrl ||
      worker?.image ||
      worker?.photo ||
      worker?.picture ||
      item?.avatar ||
      item?.profileImage ||
      ""
    ),
    workerCity: String(item?.workerCity || worker?.city || ""),
    workerBarangay: String(item?.workerBarangay || worker?.barangay || ""),
    worker: worker && typeof worker === "object" ? worker : undefined,
    description: String(item?.description || item?.notes || ""),
    preferredDate,
    preferredTime,
    serviceType: String(item?.serviceType || item?.needs || "General Repair"),
    contactNumber: String(item?.contactNumber || item?.phone || ""),
    province: String(item?.province || ""),
    city: String(item?.city || ""),
    barangay: String(item?.barangay || ""),
    location: String(item?.location || item?.address || item?.serviceAddress || ""),
    address: String(item?.address || ""),
    status: String(item?.status || "PENDING"),
    cancelledBy: item?.cancelledBy ?? null,
    declineReason: String(item?.declineReason || ""),
    adminNote: String(item?.adminNote || ""),
    reviewRating: item?.reviewRating ?? null,
    reviewText: String(item?.reviewText || ""),
    reviewedAt: item?.reviewedAt || null,
    estimatedStartingCost: item?.estimatedStartingCost ?? null,
    rescheduleRequest: item?.rescheduleRequest ?? null,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
  };
};

const postHomeownerWithFallback = async <TResponse>(
  suffix: HomeownerRouteSuffix,
  payload: unknown,
  prefixes: string[] = DEFAULT_HOMEOWNER_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.post<TResponse>(`${prefix}${suffix}`, payload);
      invalidateHomeownerRequestCache();
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

const patchHomeownerWithFallback = async <TResponse>(
  suffix: HomeownerRouteSuffix,
  payload: unknown,
  prefixes: string[] = DEFAULT_HOMEOWNER_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.patch<TResponse>(`${prefix}${suffix}`, payload);
      invalidateHomeownerRequestCache();
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

const getHomeownerWithFallback = async <TResponse>(
  suffix: HomeownerRouteSuffix,
  config?: { signal?: AbortSignal; useCache?: boolean }
): Promise<TResponse> => {
  const requestPromise = (async () => {
    let fallbackError: unknown = null;

    for (let index = 0; index < DEFAULT_HOMEOWNER_ROUTE_PREFIXES.length; index += 1) {
      const prefix = DEFAULT_HOMEOWNER_ROUTE_PREFIXES[index];
      try {
        const response = await apiClient.get<TResponse>(`${prefix}${suffix}`, config);
        return response.data;
      } catch (error) {
        const isLastPrefix = index === DEFAULT_HOMEOWNER_ROUTE_PREFIXES.length - 1;
        if (!isAxios404(error) || isLastPrefix) {
          throw error;
        }
        fallbackError = error;
      }
    }

    throw fallbackError;
  })();

  if (config?.useCache === false) {
    return requestPromise;
  }

  const cacheKey = `get:${getHomeownerAuthToken() || "anonymous"}:${suffix}`;
  const cachedRequest = getCachedRequest<TResponse>(cacheKey);
  if (cachedRequest) return cachedRequest;

  return setCachedRequest(cacheKey, requestPromise);
};

const getFreshHomeownerMe = (
  options: { images?: boolean; asset?: 'avatar' } = {}
): Promise<{ homeowner?: Record<string, unknown> }> => {
  const params = new URLSearchParams({ fresh: '1' });
  if (options.images === false) params.set('images', '0');
  if (options.asset) params.set('asset', options.asset);
  const query = params.toString();
  const key = `${getHomeownerAuthToken() || "anonymous"}:${query}`;
  if (freshHomeownerMeInFlight?.key === key) return freshHomeownerMeInFlight.promise;

  const promise = (async () => {
    let fallbackError: unknown = null;
    for (let index = 0; index < DEFAULT_HOMEOWNER_ROUTE_PREFIXES.length; index += 1) {
      const prefix = DEFAULT_HOMEOWNER_ROUTE_PREFIXES[index];
      try {
        const response = await apiClient.get<{ homeowner?: Record<string, unknown> }>(`${prefix}/me?${query}`);
        return response.data;
      } catch (error) {
        const isLastPrefix = index === DEFAULT_HOMEOWNER_ROUTE_PREFIXES.length - 1;
        if (!isAxios404(error) || isLastPrefix) throw error;
        fallbackError = error;
      }
    }
    throw fallbackError;
  })();

  freshHomeownerMeInFlight = { key, promise };
  void promise.then(
    () => {
      if (freshHomeownerMeInFlight?.promise === promise) freshHomeownerMeInFlight = null;
    },
    () => {
      if (freshHomeownerMeInFlight?.promise === promise) freshHomeownerMeInFlight = null;
    }
  );
  return promise;
};

export const homeownerAPI = {
  requestRegistrationOtp: async (payload: {
    email: string;
    mobileNumber: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ success: boolean; message?: string; otpId?: string }> => {
    return postHomeownerWithFallback<{ success: boolean; message?: string; otpId?: string }>(
      '/register/send-otp',
      payload
    );
  },

  checkEmailAvailability: async (email: string): Promise<{
    success: boolean;
    available: boolean;
    message?: string;
  }> => {
    const normalized = String(email || '').trim().toLowerCase();
    const response = await apiClient.get<{
      success: boolean;
      available: boolean;
      message?: string;
    }>(`/homeowners/check-email?email=${encodeURIComponent(normalized)}`);
    return response.data;
  },

  register: async (payload: FormData | HomeownerRegisterPayload) =>
    postHomeownerWithFallback<{
      success?: boolean;
      message?: string;
      token?: string;
      email?: string;
      homeowner?: Record<string, unknown>;
      data?: Record<string, unknown>;
    }>(
      '/register',
      payload
    ),

  login: async (payload: HomeownerLoginPayload): Promise<HomeownerSessionResponse> =>
    postHomeownerWithFallback<HomeownerSessionResponse>('/login', payload),

  verifyLoginOtp: async (payload: HomeownerLoginOtpPayload): Promise<HomeownerSessionResponse> =>
    postHomeownerWithFallback<HomeownerSessionResponse>('/verify-login-otp', payload),

  updateInitialPassword: async (newPassword: string, confirmPassword?: string): Promise<{ success: boolean; message: string }> =>
    postHomeownerWithFallback<{ success: boolean; message: string }>('/update-initial-password', {
      newPassword,
      confirmPassword: confirmPassword || newPassword,
    }),

  resendLoginOtp: async (email: string): Promise<{ success: boolean; message?: string; otpId?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string; otpId?: string }>('/homeowners/resend-login-otp', {
      email,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/auth/otp/request', {
      userType: 'homeowner',
      email,
    });
    return response.data;
  },

  verifyForgotPasswordOtp: async (payload: {
    email: string;
    code: string;
    userType: 'homeowner';
    purpose: 'forgot_password';
  }): Promise<{ success: boolean; resetToken: string; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; resetToken: string; message?: string }>('/auth/otp/verify', payload);
    return response.data;
  },

  resetPassword: async (payload: { resetToken: string; newPassword: string; confirmPassword: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/auth/reset-password', payload);
    return response.data;
  },

  requestChangePasswordOtp: async (payload: Omit<HomeownerChangePasswordPayload, 'code'>): Promise<{ success: boolean; message?: string }> =>
    postHomeownerWithFallback<{ success: boolean; message?: string }>('/change-password/request-otp', payload),

  changePassword: async (payload: HomeownerChangePasswordPayload): Promise<{ message?: string }> =>
    postHomeownerWithFallback<{ message?: string }>('/change-password', payload),

  me: async (options?: { fresh?: boolean; images?: boolean; asset?: 'avatar' }): Promise<{ homeowner?: Record<string, unknown> }> =>
    options?.fresh
      ? getFreshHomeownerMe(options)
      : getHomeownerWithFallback<{ homeowner?: Record<string, unknown> }>('/me'),

  getSharedHomeownerProfile: async (id: string): Promise<{
    success?: boolean;
    canEdit?: boolean;
    viewerRole?: string;
    homeowner?: Record<string, unknown>;
    summary?: Record<string, number>;
    requests?: unknown[];
  }> =>
    getHomeownerWithFallback<{
      success?: boolean;
      canEdit?: boolean;
      viewerRole?: string;
      homeowner?: Record<string, unknown>;
      summary?: Record<string, number>;
      requests?: unknown[];
    }>(`/homeowner-profiles/${encodeURIComponent(id)}` as HomeownerRouteSuffix),

  createBooking: async (
    payload: HomeownerBookingPayload
  ): Promise<HomeownerBookingResponse> =>
    postHomeownerWithFallback<HomeownerBookingResponse>('/bookings', payload),

  createServiceRequest: async (payload: ServiceRequestPayload): Promise<ServiceRequestResponse> => {
      const response = await postHomeownerWithFallback<ServiceRequestResponse>(
        '/service-requests' as HomeownerRouteSuffix,
        payload
      );
      emitServiceRequestChanged(response?.request?.id ? String(response.request.id) : null);
      return response;
    },

  listServiceRequests: async (
    options: { deferAvatars?: boolean; avatarsOnly?: boolean } = {}
  ): Promise<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }> =>
    hydrateServiceRequestActors(
      await getHomeownerWithFallback<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }>(
        `/service-requests${options.avatarsOnly ? '?avatars=only' : options.deferAvatars ? '?avatars=none' : ''}` as HomeownerRouteSuffix
      ).catch(async (error) => {
      try {
        const fallback = await homeownerAPI.listBookings();
        return {
          success: true,
          count: fallback.items.length,
          items: fallback.items.map(normalizeServiceRequestItem),
        };
      } catch (fallbackError) {
        console.error('Service request list fallback failed:', fallbackError);
        throw error;
      }
      })
    ),

  getServiceRequest: async (
    id: string
  ): Promise<ServiceRequestResponse> =>
    getHomeownerWithFallback<ServiceRequestResponse>(
      `/service-requests/${encodeURIComponent(id)}` as HomeownerRouteSuffix
    ),

  updateServiceRequest: async (id: string, payload: { status?: string }): Promise<ServiceRequestResponse> =>
    patchHomeownerWithFallback<ServiceRequestResponse>(`/service-requests/${encodeURIComponent(id)}` as HomeownerRouteSuffix, payload).catch(async (error) => {
      if (!isAxios404(error)) throw error;
      if (String(payload?.status || "").toUpperCase() === "CANCELLED") {
        const booking = await homeownerAPI.cancelBooking(id);
        return {
          success: true,
          request: {
            id: booking.booking.id,
            status: booking.booking.status,
          },
        };
      }
      throw error;
    }),

  respondReschedule: async (
    id: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; message: string; request: any }> => {
    const response = await patchHomeownerWithFallback<{ success: boolean; message: string; request: any }>(
      `/service-requests/${encodeURIComponent(id)}/reschedule-response` as HomeownerRouteSuffix,
      { action }
    );
    emitServiceRequestChanged(id);
    return response;
  },

  submitServiceRequestReview: async (
    id: string,
    payload: ServiceRequestReviewPayload
  ): Promise<ServiceRequestResponse> =>
    postHomeownerWithFallback<ServiceRequestResponse>(
      `/service-requests/${encodeURIComponent(id)}/review` as HomeownerRouteSuffix,
      payload
    ),

  getServiceRequestMessages: async (
    id: string
  ): Promise<{ success: boolean; messages: any[] }> =>
    getHomeownerWithFallback<{ success: boolean; messages: any[] }>(
      `/service-requests/${encodeURIComponent(id)}/messages` as HomeownerRouteSuffix,
      { useCache: false }
    ),

  sendServiceRequestMessage: async (
    id: string,
    payload: { message?: string; attachments?: Array<{ url: string; name?: string; fileType?: string }> }
  ): Promise<{ success: boolean; message: any }> =>
    postHomeownerWithFallback<{ success: boolean; message: any }>(
      `/service-requests/${encodeURIComponent(id)}/messages` as HomeownerRouteSuffix,
      payload
    ),

  listBookings: async (): Promise<{ items: unknown[] }> =>
    getHomeownerWithFallback<{ items: unknown[] }>('/bookings'),

  listSavedWorkers: async (): Promise<{ items: unknown[] }> =>
    getHomeownerWithFallback<{ items: unknown[] }>('/saved-workers'),

  saveWorker: async (workerId: string): Promise<{ saved?: boolean }> =>
    postHomeownerWithFallback<{ saved?: boolean }>(`/saved-workers/${encodeURIComponent(workerId)}`, {}),

  removeSavedWorker: async (workerId: string): Promise<{ saved?: boolean }> =>
    apiClient.delete<{ saved?: boolean }>(`/homeowner/saved-workers/${encodeURIComponent(workerId)}`).then((response) => response.data),

  cancelBooking: async (id: string): Promise<HomeownerBookingResponse> =>
    patchHomeownerWithFallback<HomeownerBookingResponse>(`/bookings/${encodeURIComponent(id)}/cancel`, {}),

  updateMe: async (payload: HomeownerUpdatePayload): Promise<{ homeowner?: Record<string, unknown> }> =>
    patchHomeownerWithFallback<{ homeowner?: Record<string, unknown> }>('/me', payload),

  markGuideSeen: async (): Promise<{ success: boolean }> =>
    patchHomeownerWithFallback<{ success: boolean }>('/guide-seen', {}).catch(() => ({ success: false })),

  logout: async (): Promise<{ message?: string }> =>
    postHomeownerWithFallback<{ message?: string }>('/logout', {}),
};

export { HOMEOWNER_AUTH_STORAGE_KEY, getHomeownerAuthToken };
