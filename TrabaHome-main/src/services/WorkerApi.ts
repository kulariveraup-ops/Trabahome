import axios from 'axios';
import { getWorkerAuthToken } from '../utils/workerAuth.ts';
import { hydrateServiceRequestActors } from './serviceRequestActors.ts';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || 'http://localhost:8000/api';
// The plural worker API is the canonical route. It responds immediately, while
// the legacy singular route can be delayed by overlapping route middleware.
const DEFAULT_WORKER_ROUTE_PREFIXES = ['/workers', '/worker'];
const REGISTER_ROUTE_PREFIXES = ['/workers', '/worker'];
const WORKER_REQUEST_CACHE_TTL_MS = 15_000;
const workerRequestCache = new Map<string, { createdAt: number; promise: Promise<unknown> }>();

const invalidateWorkerRequestCache = () => {
  workerRequestCache.clear();
};

const getCachedWorkerRequest = <TResponse>(key: string, load: () => Promise<TResponse>): Promise<TResponse> => {
  const cached = workerRequestCache.get(key);
  if (cached && Date.now() - cached.createdAt < WORKER_REQUEST_CACHE_TTL_MS) {
    return cached.promise as Promise<TResponse>;
  }

  const promise = load();
  workerRequestCache.set(key, { createdAt: Date.now(), promise });
  promise.catch(() => {
    if (workerRequestCache.get(key)?.promise === promise) {
      workerRequestCache.delete(key);
    }
  });
  return promise;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

apiClient.interceptors.request.use((config) => {
  const token = getWorkerAuthToken();
  if (token) {
    const headers = (config.headers ?? {}) as Record<string, string>;
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers as typeof config.headers;
  }
  return config;
});

type WorkerRouteSuffix =
  | '/register'
  | '/verify-id'
  | '/signin'
  | '/verify-login-otp'
  | '/me'
  | '/logout'
  | '/bookings'
  | '/profile-update-request'
  | string;

export interface WorkerBookingStatusPayload {
  status: string;
}

interface WorkerLoginPayload {
  email: string;
  password: string;
}

interface WorkerLoginOtpPayload {
  email: string;
  code: string;
  otpId: string;
}

interface WorkerProfileRequestOptions {
  includeCompletedJobs?: boolean;
  light?: boolean;
}

interface WorkerSessionResponse {
  token?: string;
  worker?: Record<string, unknown>;
  email?: string;
  message?: string;
  otpRequired?: boolean;
  requiresOtp?: boolean;
  otpId?: string;
  mustChangePassword?: boolean;
}

const isAxios404 = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 404;
};

const normalizeServiceRequestItem = (item: any) => {
  const rawStatus = String(item?.status || "Pending");
  const normalizedStatus = rawStatus.trim().toUpperCase();
  const status =
    normalizedStatus === "PENDING"
      ? "Pending"
      : normalizedStatus === "ONGOING" || normalizedStatus === "ACCEPTED" || normalizedStatus === "IN_PROGRESS"
        ? "In Progress"
        : normalizedStatus === "COMPLETED"
          ? "Completed"
          : normalizedStatus === "CANCELLED" || normalizedStatus === "CANCELED"
            ? "Cancelled"
            : normalizedStatus === "DECLINED"
              ? "Declined"
              : rawStatus === "Accepted"
                ? "In Progress"
                : rawStatus;

  return {
    id: String(item?.id || item?.bookingNumber || item?._id || ""),
    homeownerName: String(item?.homeownerName || item?.name || "Homeowner"),
    homeownerEmail: String(item?.homeownerEmail || item?.email || ""),
    address: String(item?.address || ""),
    serviceType: String(item?.serviceType || item?.needs || "General Repair"),
    description: String(item?.description || item?.notes || ""),
    contactNumber: String(item?.contactNumber || item?.phone || ""),
    province: String(item?.province || ""),
    city: String(item?.city || ""),
    barangay: String(item?.barangay || ""),
    location: String(item?.location || item?.address || item?.serviceAddress || ""),
    preferredDate: item?.preferredDate || item?.scheduledAt || "",
    preferredTime: String(item?.preferredTime || ""),
    status,
    createdAt: item?.createdAt,
    updatedAt: item?.updatedAt,
    declineReason: String(item?.declineReason || ""),
    cancelledBy: item?.cancelledBy || null,
    acceptedOn: item?.acceptedOn || null,
    completedOn: item?.completedOn || null,
    cancelledOn: item?.cancelledOn || null,
    reviewRating: item?.reviewRating ?? null,
    reviewText: String(item?.reviewText || ""),
    reviewedAt: item?.reviewedAt || null,
    estimatedStartingCost: item?.estimatedStartingCost ?? null,
    rescheduleRequest: item?.rescheduleRequest ?? null,
  };
};

const postWorkerWithFallback = async <TResponse>(
  suffix: WorkerRouteSuffix,
  payload: unknown,
  prefixes: string[] = DEFAULT_WORKER_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.post<TResponse>(`${prefix}${suffix}`, payload);
      invalidateWorkerRequestCache();
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

const patchWorkerWithFallback = async <TResponse>(
  suffix: string,
  payload: unknown,
  prefixes: string[] = DEFAULT_WORKER_ROUTE_PREFIXES
): Promise<TResponse> => {
  let fallbackError: unknown = null;

  for (let index = 0; index < prefixes.length; index += 1) {
    const prefix = prefixes[index];
    try {
      const response = await apiClient.patch<TResponse>(`${prefix}${suffix}`, payload);
      invalidateWorkerRequestCache();
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

const getWorkerWithFallback = async <TResponse>(
  suffix: WorkerRouteSuffix,
  config?: { signal?: AbortSignal; useCache?: boolean }
): Promise<TResponse> => {
  const fetcher = async () => {
    let fallbackError: unknown = null;
    for (let index = 0; index < DEFAULT_WORKER_ROUTE_PREFIXES.length; index += 1) {
      const prefix = DEFAULT_WORKER_ROUTE_PREFIXES[index];
      try {
        const response = await apiClient.get<TResponse>(`${prefix}${suffix}`, config);
        return response.data;
      } catch (error) {
        const isLastPrefix = index === DEFAULT_WORKER_ROUTE_PREFIXES.length - 1;
        if (!isAxios404(error) || isLastPrefix) {
          throw error;
        }
        fallbackError = error;
      }
    }

    throw fallbackError;
  };

  if (config?.useCache === false) {
    return fetcher();
  }

  const cacheKey = `${getWorkerAuthToken() || "anonymous"}:${suffix}`;
  return getCachedWorkerRequest(cacheKey, fetcher);
};

export const workerAPI = {
  register: async (formData: FormData) => {
    return postWorkerWithFallback<{
      success?: boolean;
      message?: string;
      email?: string;
      token?: string;
      isImmediatelyApproved?: boolean;
      worker?: Record<string, unknown>;
      data?: Record<string, unknown>;
    }>(
      '/register',
      formData,
      REGISTER_ROUTE_PREFIXES
    );
  },

  verifyId: async (formData: FormData) => {
    return postWorkerWithFallback<{
      success: boolean;
      isVerified: boolean;
      status: 'Approved' | 'Failed';
      confidence?: number;
      message?: string;
      reason?: string;
      details?: any;
    }>('/verify-id', formData, REGISTER_ROUTE_PREFIXES);
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
    }>(`/workers/check-email?email=${encodeURIComponent(normalized)}`);
    return response.data;
  },

  login: async (payload: WorkerLoginPayload): Promise<WorkerSessionResponse> => {
    return postWorkerWithFallback<WorkerSessionResponse>('/signin', payload);
  },

  verifyLoginOtp: async (payload: WorkerLoginOtpPayload): Promise<WorkerSessionResponse> => {
    return postWorkerWithFallback<WorkerSessionResponse>('/verify-login-otp', payload, ['/workers']);
  },

  updateInitialPassword: async (newPassword: string, confirmPassword?: string): Promise<{ success: boolean; message: string }> => {
    return postWorkerWithFallback<{ success: boolean; message: string }>('/update-initial-password', {
      newPassword,
      confirmPassword: confirmPassword || newPassword,
    }, ['/workers']);
  },

  resendLoginOtp: async (email: string): Promise<{ success: boolean; message?: string; otpId?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string; otpId?: string }>('/workers/resend-login-otp', {
      email,
    });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/auth/otp/request', {
      userType: 'worker',
      email,
    });
    return response.data;
  },

  verifyForgotPasswordOtp: async (payload: {
    email: string;
    code: string;
    userType: 'worker';
    purpose: 'forgot_password';
  }): Promise<{ success: boolean; resetToken: string; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; resetToken: string; message?: string }>('/auth/otp/verify', payload);
    return response.data;
  },

  resetPassword: async (payload: { resetToken: string; newPassword: string; confirmPassword: string }): Promise<{ success: boolean; message?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string }>('/auth/reset-password', payload);
    return response.data;
  },

  requestChangePasswordOtp: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success?: boolean; message?: string }> => {
    const response = await apiClient.post<{ success?: boolean; message?: string }>('/workers/change-password/request-otp', payload);
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    code: string;
  }): Promise<{ success?: boolean; message?: string }> => {
    const response = await apiClient.post<{ success?: boolean; message?: string }>('/workers/change-password', payload);
    return response.data;
  },

  me: async (options: { summary?: boolean; images?: boolean; assets?: 'avatar' | 'profile' } = {}): Promise<{ worker?: Record<string, unknown> }> => {
    const params = new URLSearchParams();
    if (options.summary) params.set('summary', '1');
    if (options.images === false) params.set('images', '0');
    if (options.assets) params.set('assets', options.assets);
    const query = params.toString();
    return getWorkerWithFallback<{ worker?: Record<string, unknown> }>(`/me${query ? `?${query}` : ''}`);
  },

  updateMe: async (payload: Record<string, unknown>): Promise<{ success?: boolean; worker?: Record<string, unknown> }> => {
    return patchWorkerWithFallback<{ success?: boolean; worker?: Record<string, unknown> }>('/me', payload);
  },

  updateWorkerById: async (id: string, payload: Record<string, unknown>): Promise<{ success?: boolean; worker?: Record<string, unknown> }> => {
    const response = await apiClient.patch<{ success?: boolean; worker?: Record<string, unknown> }>(`/workers/${encodeURIComponent(id)}`, payload);
    invalidateWorkerRequestCache();
    return response.data;
  },

  getWorkerById: async (
    id: string,
    options: WorkerProfileRequestOptions = {}
  ): Promise<{ success?: boolean; data?: Record<string, unknown> }> => {
    const params = new URLSearchParams();
    if (options.includeCompletedJobs) {
      params.set('includeCompletedJobs', '1');
    } else if (options.light) {
      params.set('includeCompletedJobs', '0');
    }
    const query = params.toString();
    const suffix = `/workers/${encodeURIComponent(id)}${query ? `?${query}` : ''}`;
    return getCachedWorkerRequest(
      `${getWorkerAuthToken() || "anonymous"}:${suffix}`,
      async () => {
        const response = await apiClient.get<{ success?: boolean; data?: Record<string, unknown> }>(suffix);
        return response.data;
      }
    );
  },

  getHomeownerProfile: async (
    id: string,
    options: { light?: boolean } = {}
  ): Promise<{
    success?: boolean;
    canEdit?: boolean;
    viewerRole?: string;
    homeowner?: Record<string, unknown>;
    summary?: Record<string, number>;
    requests?: unknown[];
  }> =>
    getWorkerWithFallback<{
      success?: boolean;
      canEdit?: boolean;
      viewerRole?: string;
      homeowner?: Record<string, unknown>;
      summary?: Record<string, number>;
      requests?: unknown[];
    }>(
      `/homeowner-profiles/${encodeURIComponent(id)}${options.light ? '?lite=1' : ''}` as WorkerRouteSuffix
    ),

  listBookings: async (): Promise<{ success: boolean; count: number; items: unknown[] }> => {
    return getWorkerWithFallback<{ success: boolean; count: number; items: unknown[] }>('/bookings');
  },

  listServiceRequests: async (
    options: { deferAvatars?: boolean; avatarsOnly?: boolean } = {}
  ): Promise<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }> => {
    return hydrateServiceRequestActors(
      await getWorkerWithFallback<{ success: boolean; count: number; items: unknown[]; actors?: unknown[] }>(
        `/service-requests${options.avatarsOnly ? '?avatars=only' : options.deferAvatars ? '?avatars=none' : ''}` as WorkerRouteSuffix
      ).catch(async (error) => {
        if (!isAxios404(error)) throw error;
        const fallback = await workerAPI.listBookings();
        return {
          success: true,
          count: fallback.items.length,
          items: fallback.items.map(normalizeServiceRequestItem),
        };
      })
    );
  },

  getServiceRequest: async (
    id: string
  ): Promise<{ success: boolean; request?: any; item?: any; data?: any }> =>
    getWorkerWithFallback<{ success: boolean; request?: any; item?: any; data?: any }>(
      `/service-requests/${encodeURIComponent(id)}` as WorkerRouteSuffix
    ),

  updateServiceRequest: async (
    id: string,
    payload: {
      status: string;
      declineReason?: string;
      completionDetails?: {
        proofOfWork: string[];
        proofOfPayment?: string[];
        paymentAmount: number;
        jobSummary: string;
      };
      homeownerReview?: {
        rating: number;
        reviewText?: string;
        reviewTags?: string[];
      };
    }
  ): Promise<{ success: boolean; request?: { id: string; status: string } }> =>
    patchWorkerWithFallback(`/service-requests/${encodeURIComponent(id)}`, payload).catch(async (error) => {
      if (!isAxios404(error)) throw error;

      const nextStatus = String(payload.status || "").toUpperCase();
      const bookingStatus =
        nextStatus === "ONGOING"
          ? "Accepted"
          : nextStatus === "COMPLETED"
            ? "Completed"
            : nextStatus === "DECLINED"
              ? "Declined"
              : nextStatus === "CANCELLED"
                ? "Cancelled"
                : "Pending";

      const booking = await workerAPI.updateBookingStatus(id, bookingStatus);
      return {
        success: true,
        request: {
          id,
          status: nextStatus || booking.booking?.status || bookingStatus,
        },
      };
    }),

  submitServiceRequestReview: async (
    id: string,
    payload: { rating: number; reviewText?: string; reviewTags?: string[] }
  ): Promise<{ success: boolean; request?: any }> => {
    return postWorkerWithFallback<{ success: boolean; request?: any }>(
      `/service-requests/${encodeURIComponent(id)}/review` as WorkerRouteSuffix,
      payload
    );
  },

  updateBookingStatus: async (
    id: string,
    status: string
  ): Promise<{ booking?: { id: string; status: string } }> => {
    return patchWorkerWithFallback<{ booking?: { id: string; status: string } }>(
      `/bookings/${encodeURIComponent(id)}/status`,
      { status }
    );
  },

  getServiceRequestMessages: async (
    id: string
  ): Promise<{ success: boolean; messages: any[] }> => {
    return getWorkerWithFallback<{ success: boolean; messages: any[] }>(
      `/service-requests/${encodeURIComponent(id)}/messages` as WorkerRouteSuffix,
      { useCache: false }
    );
  },

  sendServiceRequestMessage: async (
    id: string,
    payload: { message?: string; attachments?: Array<{ url: string; name?: string; fileType?: string }> }
  ): Promise<{ success: boolean; message: any }> => {
    return postWorkerWithFallback<{ success: boolean; message: any }>(
      `/service-requests/${encodeURIComponent(id)}/messages` as WorkerRouteSuffix,
      payload
    );
  },

  requestProfileUpdate: async (
    payload: {
      fullName?: string;
      phone?: string;
      city?: string;
      barangay?: string;
      skills?: string[];
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string; pendingProfileUpdate: any }> => {
    return postWorkerWithFallback<{ success: boolean; message: string; pendingProfileUpdate: any }>(
      '/profile-update-request',
      payload
    );
  },

  proposeReschedule: async (
    id: string,
    payload: {
      proposedDate: string;
      proposedTime: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; message: string; request: any }> => {
    return patchWorkerWithFallback<{ success: boolean; message: string; request: any }>(
      `/service-requests/${encodeURIComponent(id)}/reschedule`,
      payload
    );
  },

  logout: async (): Promise<{ message?: string }> => {
    return postWorkerWithFallback<{ message?: string }>('/logout', {});
  },

  markGuideSeen: async (): Promise<{ success: boolean }> => {
    return patchWorkerWithFallback<{ success: boolean }>('/guide-seen', {}).catch(() => ({ success: false }));
  },
};
