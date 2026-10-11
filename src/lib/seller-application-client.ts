export type SellerApplicationSummary = {
  storeName: string;
  businessEmail: string;
  status: string;
  reviewerNotes: string | null;
  createdAt: string;
};

export type SellerApplicationInput = {
  storeName: string;
  storeSlug: string;
  businessType: string;
  businessEmail: string;
  businessPhone: string;
  streetAddress: string;
  city: string;
  district: string;
  hasPhysicalStore: boolean;
  storeLocation: string | null;
};

type ApiEnvelope<T> = { data?: T; error?: string };

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json().catch(() => ({})) as Promise<ApiEnvelope<T>>;
}

export async function getSellerApplication(signal?: AbortSignal): Promise<SellerApplicationSummary | null> {
  const response = await fetch("/api/vendors/apply", { signal, cache: "no-store" });
  if (response.status === 404) return null;
  const body = await readEnvelope<{ application: SellerApplicationSummary | null; profile: { storeName: string; email: string | null; createdAt: string } | null }>(response);
  if (!response.ok) throw new Error(body.error || "Unable to load your seller application.");
  if (body.data?.application) return body.data.application;
  if (body.data?.profile) return {
    storeName: body.data.profile.storeName,
    businessEmail: body.data.profile.email || "",
    status: "APPROVED",
    reviewerNotes: null,
    createdAt: body.data.profile.createdAt,
  };
  return null;
}

export async function submitSellerApplication(input: SellerApplicationInput): Promise<SellerApplicationSummary> {
  const response = await fetch("/api/vendors/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await readEnvelope<SellerApplicationSummary>(response);
  if (!response.ok || !body.data) throw new Error(body.error || "We could not submit the application yet.");
  return body.data;
}
