const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL || "http://localhost:8000/api";

export const SUPPORT_ISSUE_CATEGORIES = [
  "Other",
  "Booking Issue",
  "Safety & Trust",
  "Account & Profile",
  "Payments",
] as const;

export interface SupportTicketPayload {
  name: string;
  email: string;
  issueCategory: string;
  message: string;
}

export interface SupportTicketResponse {
  ticketNumber: string;
  status: string;
  createdAt: string;
}

export interface SupportTicketMessage {
  id: string;
  senderId: string;
  senderRole: "Homeowner" | "Worker" | "Admin";
  message: string;
  createdAt: string;
}

export interface SupportTicketSummary extends SupportTicketResponse {
  id: string;
  name: string;
  email: string;
  role: "Homeowner" | "Worker";
  category: string;
  issueCategory: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportTicketMessage[];
}

const supportRequest = async <TResponse,>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<TResponse> => {
  if (!token) throw new Error("Unauthorized.");
  const response = await fetch(`${API_BASE_URL}/support${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Support request failed.");
  }
  return data as TResponse;
};

export const submitSupportTicket = async (
  token: string,
  payload: SupportTicketPayload
): Promise<SupportTicketResponse> => {
  const response = await fetch(`${API_BASE_URL}/support/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Unable to send message. Please try again.");
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trabahome:support-ticket-changed", { detail: data }));
    window.dispatchEvent(new CustomEvent("trabahome:dashboard-refresh", { detail: data }));
    try {
      localStorage.setItem("trabahome_sync_support", Date.now().toString());
    } catch (_) {}
  }

  return data as SupportTicketResponse;
};

export const listOwnSupportTickets = (token: string) =>
  supportRequest<{ success: boolean; count: number; items: SupportTicketSummary[] }>(
    token,
    "/tickets"
  );

export const getOwnSupportTicket = (token: string, ticketId: string) =>
  supportRequest<{ success: boolean; ticket: SupportTicketDetail }>(
    token,
    `/tickets/${encodeURIComponent(ticketId)}`
  );

export const replyToOwnSupportTicket = async (token: string, ticketId: string, message: string) => {
  const result = await supportRequest<{ success: boolean; ticket: SupportTicketDetail }>(
    token,
    `/tickets/${encodeURIComponent(ticketId)}/replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trabahome:support-ticket-changed", { detail: result }));
    window.dispatchEvent(new CustomEvent("trabahome:dashboard-refresh", { detail: result }));
    try {
      localStorage.setItem("trabahome_sync_support", Date.now().toString());
    } catch (_) {}
  }

  return result;
};
