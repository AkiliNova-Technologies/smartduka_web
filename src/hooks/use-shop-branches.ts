"use client";
import { useCallback, useEffect, useState } from "react";
import { shopBranchesClient, type ShopBranchDto, type ShopBranchInput } from "@/lib/shop-branches-client";

export function useShopBranches() {
  const [branches, setBranches] = useState<ShopBranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => { setLoading(true); setError(""); try { setBranches(await shopBranchesClient.list()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load locations."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    shopBranchesClient.list().then((items) => { if (active) setBranches(items); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load locations."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const save = useCallback(async (input: ShopBranchInput, id?: string) => { setSaving(true); setError(""); try { if (id) await shopBranchesClient.update(id, input); else await shopBranchesClient.create(input); await reload(); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save this location."); return false; } finally { setSaving(false); } }, [reload]);
  return { branches, loading, saving, error, save };
}
