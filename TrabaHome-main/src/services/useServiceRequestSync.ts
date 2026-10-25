import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { invalidateAdminRequestCache } from './AdminApi.ts';

// Keeps separate portal sessions (Homeowner, Worker, Admin) in sync without relying on a page refresh.
export const useServiceRequestSync = (token: string | null | undefined, onChange: () => void) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = (customEvents: string[] = []) => {
      if (debounceId) return;
      debounceId = setTimeout(() => {
        debounceId = null;
        try {
          invalidateAdminRequestCache();
        } catch (_) {}

        if (typeof window !== 'undefined') {
          for (const evt of customEvents) {
            window.dispatchEvent(new Event(evt));
          }
          window.dispatchEvent(new Event('trabahome:dashboard-refresh'));
        }

        try {
          onChangeRef.current?.();
        } catch (error) {
          console.error('Error invoking sync callback:', error);
        }
      }, 100);
    };

    // Cross-tab synchronization via localStorage storage event
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('trabahome_sync_') || event.key.startsWith('trabahome_last_')) {
        triggerRefresh([
          'trabahome:service-request-changed',
          'trabahome:support-ticket-changed',
          'trabahome:user-registered',
          'trabahome:homeowner-changed',
          'trabahome:worker-changed',
        ]);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    if (!token) {
      return () => {
        if (debounceId) clearTimeout(debounceId);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', handleStorage);
        }
      };
    }

    const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    const apiBase = env?.VITE_API_BASE_URL || 'http://localhost:8000/api';
    const socket = io(apiBase.replace(/\/api\/?$/, ''), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const onServiceRequest = () => triggerRefresh(['trabahome:service-request-changed']);
    const onSupportTicket = () => triggerRefresh(['trabahome:support-ticket-changed']);
    const onHomeowner = () => triggerRefresh(['trabahome:user-registered', 'trabahome:homeowner-changed']);
    const onWorker = () => triggerRefresh(['trabahome:user-registered', 'trabahome:worker-changed']);
    const onDashboard = () => triggerRefresh(['trabahome:dashboard-refresh']);
    const onAccountStatus = () => triggerRefresh(['trabahome:account-status-updated']);

    socket.on('service-request:created', onServiceRequest);
    socket.on('service-request:updated', onServiceRequest);
    socket.on('service-request:deleted', onServiceRequest);

    socket.on('support-ticket:created', onSupportTicket);
    socket.on('support-ticket:updated', onSupportTicket);

    socket.on('homeowner:registered', onHomeowner);
    socket.on('homeowner:updated', onHomeowner);

    socket.on('worker:registered', onWorker);
    socket.on('worker:updated', onWorker);

    socket.on('dashboard:refresh', onDashboard);
    socket.on('account:status-updated', onAccountStatus);
    socket.on('notification:new', onDashboard);
    socket.on('service-request:message', (payload) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trabahome:service-request-message', { detail: payload }));
      }
    });

    return () => {
      if (debounceId) clearTimeout(debounceId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      socket.disconnect();
    };
  }, [token]);
};
