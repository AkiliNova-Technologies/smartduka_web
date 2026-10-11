"use client";
/* eslint-disable react-hooks/set-state-in-effect -- the hook owns request lifecycle state */

import * as React from "react";
import { testDataCleanupClient, type CleanupOverview, type CleanupPreview } from "@/lib/test-data-cleanup-client";

export function useTestDataCleanup() {
  const [overview, setOverview] = React.useState<CleanupOverview | null>(null);
  const [preview, setPreview] = React.useState<CleanupPreview | null>(null);
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof testDataCleanupClient.execute>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [planning, setPlanning] = React.useState(false);
  const [executing, setExecuting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null);
    try { setOverview(await testDataCleanupClient.overview(signal)); }
    catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Unable to load cleanup data."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  React.useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);

  return {
    overview, preview, result, loading, planning, executing, error,
    clearPreview: () => { setPreview(null); setResult(null); },
    refresh: () => refresh(),
    createPreview: async (input: Parameters<typeof testDataCleanupClient.preview>[0]) => {
      setPlanning(true); setError(null); setResult(null);
      try { const next = await testDataCleanupClient.preview(input); setPreview(next); return next; }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to preview cleanup."); throw cause; }
      finally { setPlanning(false); }
    },
    execute: async (confirmation: string) => {
      if (!preview) return;
      setExecuting(true); setError(null);
      try { const next = await testDataCleanupClient.execute({ planId: preview.planId, confirmation }); setResult(next); setPreview(null); await refresh(); return next; }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Cleanup failed."); throw cause; }
      finally { setExecuting(false); }
    },
  };
}
