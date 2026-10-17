export type VerificationDocument = {
  id: string;
  source: string;
  type: string;
  name: string;
  status: string;
  uploadedAt: string;
  submittedAt: string;
  viewUrl: string;
  downloadUrl: string;
};

export type VerificationApplication = {
  publicId: string;
  status: string;
  submittedAt: string;
  reviewStartedAt: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  informationRequest: string | null;
  suspensionReason: string | null;
  revocationReason: string | null;
  assignedAdminId: string | null;
  assignedAdmin: { name: string; email: string } | null;
  decisionBy: { name: string; email: string } | null;
  snapshot: { shopName?: string; legalName?: string; contact?: { email?: string; phone?: string }; kycStatus?: string; address?: string };
  vendorApplicationId: string | null;
  vendor: { storeName: string; owner: { name: string | null; email: string } };
  documents: VerificationDocument[];
  eligibility: { eligible: boolean; missing: string[] };
  context: { openReports: number; severeReports: number; openRiskFlags: number };
  notes: Array<{ id: string; body: string; createdAt: string; admin: { name: string } }>;
  activities: Array<{ id: string; type: string; toValue: string | null; createdAt: string; actor: { name: string } | null; metadata?: { reason?: string } | null }>;
};

export type AdminOption = { id: string; name: string; platformRole: string | null };
export type VerificationQueue = {
  items: Array<{ id: string; publicId: string; status: string; submittedAt: string; assignedAdmin?: { name: string } | null; vendor: { storeName: string; slug: string; owner: { name: string | null; email: string } } }>;
  metrics: { pending: number; reviewing: number; needsInformation: number; verified: number };
};

type Envelope<T> = { success?: boolean; data?: T; error?: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({})) as Envelope<T>;
  if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error || "Unable to update verification.");
  return body.data;
}

export const adminShopVerificationClient = {
  queue: (status: string, signal?: AbortSignal) => request<VerificationQueue>(`/api/admin/verifications${status ? `?status=${encodeURIComponent(status)}` : ""}`, { signal }),
  detail: (id: string, signal?: AbortSignal) => request<{ application: VerificationApplication }>(`/api/admin/verifications/${encodeURIComponent(id)}`, { signal }),
  admins: (signal?: AbortSignal) => request<{ admins: AdminOption[] }>("/api/admin/verifications?admins=1", { signal }),
  update: (id: string, body: object) => request<unknown>(`/api/admin/verifications/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
};
