"use client";
/* eslint-disable react-hooks/set-state-in-effect -- begins and cancels an account-scoped external request */
import * as React from "react";
import { loadVendorEntitlement, type VendorEntitlementResponse } from "@/lib/vendor-entitlements-client";

export function useVendorEntitlement() {
  const [data, setData] = React.useState<VendorEntitlementResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const request = React.useRef(0);
  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    const id = ++request.current;
    setLoading(true); setError("");
    try { const next = await loadVendorEntitlement(signal); if (!signal?.aborted && id === request.current) setData(next); }
    catch (cause) { if (!signal?.aborted && id === request.current) { setData(null); setError(cause instanceof Error ? cause.message : "Unable to load subscription access."); } }
    finally { if (!signal?.aborted && id === request.current) setLoading(false); }
  }, []);
  React.useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => { request.current += 1; controller.abort(); setData(null); }; }, [refresh]);
  return { data, entitlement: data?.entitlement ?? null, loading, error, refresh };
}
