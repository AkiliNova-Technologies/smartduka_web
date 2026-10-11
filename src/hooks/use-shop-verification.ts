"use client";

import { useCallback, useEffect, useState } from "react";
import { getVendorVerification, updateVendorVerification, type VendorVerificationData } from "@/lib/shop-verification-client";

export function useShopVerification() {
  const [data, setData] = useState<VendorVerificationData>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try { const next = await getVendorVerification(signal); setError(""); setData(next); }
    catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Unable to load shop verification."); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void getVendorVerification(controller.signal)
      .then((next) => { setError(""); setData(next); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load shop verification."); });
    return () => controller.abort();
  }, []);

  const submit = useCallback(async (input: { action?: "provide-information"; response?: string } = {}) => {
    setSaving(true); setError("");
    try { await updateVendorVerification(input); await load(); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update shop verification."); return false; }
    finally { setSaving(false); }
  }, [load]);

  return { data, error, saving, reload: load, submit };
}
