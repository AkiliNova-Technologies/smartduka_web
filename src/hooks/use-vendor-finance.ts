"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type VendorFinanceSummary, type VendorWithdrawal, vendorFinanceClient } from "@/lib/vendor-finance-client";

export function useVendorFinance() {
  const [summary, setSummary] = useState<VendorFinanceSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<VendorWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = (async () => { setLoading(true); setError(null); try { const [nextSummary, history] = await Promise.all([vendorFinanceClient.getSummary(), vendorFinanceClient.getWithdrawals()]); setSummary(nextSummary); setWithdrawals(history.withdrawals); } catch { setError("We couldn’t load your finance information. Please try again."); } finally { setLoading(false); } })();
    requestRef.current = request;
    try { await request; } finally { requestRef.current = null; }
  }, []);
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  return { summary, withdrawals, loading, error, refresh, requestWithdrawal: vendorFinanceClient.requestWithdrawal };
}
