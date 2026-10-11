import type { DocumentType } from "@prisma/client";

export type VendorVerificationData = {
  eligibility: { eligible: boolean; missing: string[]; vendorId: string };
  application: null | {
    status: string;
    submittedAt: string;
    verifiedAt: string | null;
    rejectionReason: string | null;
    informationRequest: string | null;
    activities: Array<{ id: string; type: string; toValue: string | null; createdAt: string }>;
  };
  documents: Array<{ id: string; type: DocumentType; name: string; mimeType: string | null; size: number | null; createdAt: string }>;
};

type Envelope<T> = { success?: boolean; data?: T; error?: string };

export async function getVendorVerification(signal?: AbortSignal) {
  const response = await fetch("/api/vendor/verification", { signal, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as Envelope<VendorVerificationData>;
  if (!response.ok || !body.success || !body.data) throw new Error(body.error || "Unable to load shop verification.");
  return body.data;
}

export async function updateVendorVerification(input: { action?: "provide-information"; response?: string } = {}) {
  const response = await fetch("/api/vendor/verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as Envelope<unknown>;
  if (!response.ok || !body.success) throw new Error(body.error || "Unable to update shop verification.");
}
