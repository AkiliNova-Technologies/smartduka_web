"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminVendorVerificationDetailsAction } from "@/actions/admin";

type SuccessfulActionData<T> = T extends { success: true; data: infer D } ? D : never;
export type AdminVendorVerificationDetails = SuccessfulActionData<Awaited<ReturnType<typeof getAdminVendorVerificationDetailsAction>>>;

export function useAdminVendorVerificationDetails(applicationId: string | null) {
  const [data, setData] = useState<AdminVendorVerificationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!applicationId) { setData(null); return; }
    setLoading(true); setError("");
    const result = await getAdminVendorVerificationDetailsAction(applicationId);
    if (result.success) setData(result.data as AdminVendorVerificationDetails);
    else setError(result.error || "Unable to load documents and verification history.");
    setLoading(false);
  }, [applicationId]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  return { data, loading, error, refresh: load };
}
