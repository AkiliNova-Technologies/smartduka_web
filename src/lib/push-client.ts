export type PushApiConfig = { enabled: boolean; publicKey: string | null };
export type PushApiStatus = { configured: boolean; subscribed: boolean };
export type PushTestEnqueueResult = { requestId: string; status: "QUEUED" | "PROCESSING" | "ACCEPTED" | "FAILED" | "EXPIRED" };

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || body.data === undefined) throw new Error(body.error?.message ?? "Unable to update push notifications.");
  return body.data;
}

export const pushClient = {
  configuration: () => request<PushApiConfig>("/api/v1/push/config"),
  status: (endpoint: string) => request<PushApiStatus>("/api/v1/push/subscription/status", { method: "POST", body: JSON.stringify({ endpoint }) }),
  register: (subscription: { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string }; deviceName?: string }) => request("/api/v1/push/subscription", { method: "POST", body: JSON.stringify(subscription) }),
  remove: (endpoint?: string) => request("/api/v1/push/subscription", { method: "DELETE", body: JSON.stringify(endpoint ? { endpoint } : {}) }),
  enqueueTest: (input: { endpoint: string; requestId: string }) => request<PushTestEnqueueResult>("/api/v1/push/test", { method: "POST", body: JSON.stringify(input) }),
};
