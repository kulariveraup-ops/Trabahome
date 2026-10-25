import { homeownerAPI } from './HomeownerApi.ts';

const PENDING_SERVICE_REQUEST_KEY = 'trabahome_pending_service_request';

export interface PendingServiceRequestDraft {
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

const isBrowser = (): boolean => typeof window !== 'undefined';

export const savePendingServiceRequest = (draft: PendingServiceRequestDraft): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    PENDING_SERVICE_REQUEST_KEY,
    JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString(),
    })
  );
};

export const getPendingServiceRequest = (): PendingServiceRequestDraft | null => {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(PENDING_SERVICE_REQUEST_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingServiceRequestDraft;
    if (!parsed || !parsed.targetWorkerId || !parsed.description || !parsed.preferredDate) return null;
    return {
      targetWorkerId: String(parsed.targetWorkerId),
      description: String(parsed.description),
      preferredDate: String(parsed.preferredDate),
      preferredTime: String(parsed.preferredTime || '00:00'),
      serviceType: String(parsed.serviceType || 'General Repair'),
      contactNumber: String(parsed.contactNumber || ''),
      province: String(parsed.province || ''),
      city: String(parsed.city || ''),
      barangay: String(parsed.barangay || ''),
      location: String(parsed.location || parsed.address || ''),
      address: String(parsed.address || ''),
    };
  } catch {
    return null;
  }
};

export const clearPendingServiceRequest = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PENDING_SERVICE_REQUEST_KEY);
};

export const flushPendingServiceRequest = async () => {
  const draft = getPendingServiceRequest();
  if (!draft) return null;

  const response = await homeownerAPI.createServiceRequest(draft);
  clearPendingServiceRequest();
  return response;
};
