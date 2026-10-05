"use client";

import { useCallback, useEffect, useState } from "react";
import { type VendorPayoutAccount, vendorPayoutsClient } from "@/lib/vendor-payouts-client";

export function useVendorPayouts() {
  const [accounts, setAccounts] = useState<VendorPayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setAccounts(await vendorPayoutsClient.getAccounts()); setError(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load payout details."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  const mutate = useCallback(async (operation: () => Promise<unknown>) => {
    setSaving(true); setError(null);
    try { await operation(); await refresh(); return true; }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update payout details."); return false; }
    finally { setSaving(false); }
  }, [refresh]);
  return { accounts, loading, saving, error, refresh, add: (input: Parameters<typeof vendorPayoutsClient.createAccount>[0]) => mutate(() => vendorPayoutsClient.createAccount(input)), setDefault: (id: string) => mutate(() => vendorPayoutsClient.setDefault(id)), disable: (id: string) => mutate(() => vendorPayoutsClient.disable(id)) };
}
