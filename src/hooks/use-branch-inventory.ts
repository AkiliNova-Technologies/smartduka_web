"use client";
import { useCallback, useEffect, useState } from "react";
import { adjustStandardInventory, enableLocationInventory, loadBranchInventory, mutateBranchInventory, type BranchInventoryData } from "@/lib/branch-inventory-client";

export function useBranchInventory() {
  const [data, setData] = useState<BranchInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => { setLoading(true); try { setData(await loadBranchInventory(signal)); setError(""); } catch (value) { if (!(value instanceof Error && value.name === "AbortError")) setError(value instanceof Error ? value.message : "Unable to load inventory."); } finally { setLoading(false); } }, []);
  useEffect(() => { const controller = new AbortController(); void loadBranchInventory(controller.signal).then((value) => { setData(value); setError(""); }).catch((value: unknown) => { if (!(value instanceof Error && value.name === "AbortError")) setError(value instanceof Error ? value.message : "Unable to load inventory."); }).finally(() => setLoading(false)); return () => controller.abort(); }, []);
  const mutate = useCallback(async (input: Parameters<typeof mutateBranchInventory>[0]) => { const result = await mutateBranchInventory(input); await refresh(); return result; }, [refresh]);
  const adjustStandard = useCallback(async (input: Parameters<typeof adjustStandardInventory>[0]) => { const result = await adjustStandardInventory(input); await refresh(); return result; }, [refresh]);
  const enableLocations = useCallback(async () => { const result = await enableLocationInventory(); await refresh(); return result; }, [refresh]);
  return { data, loading, error, refresh, mutate, adjustStandard, enableLocations };
}
