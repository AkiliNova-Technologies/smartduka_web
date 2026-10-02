"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import * as React from "react";
import type { PromotionStatus } from "@prisma/client";
import { useAuth } from "@/hooks/use-auth";
import {
  getAdminMarketingCacheEntry,
  isAdminMarketingCacheEntryFresh,
  loadAdminMarketingCacheGroup,
  setAdminMarketingCacheIdentity,
  writeAdminMarketingCacheGroup,
  type AdminMarketingCacheGroup,
} from "@/lib/admin-marketing-cache";
import { marketingClient, type PromotionMutation } from "@/lib/marketing-client";

type Featured = Awaited<ReturnType<typeof marketingClient.getAdminFeatured>>;
type Pickers = Awaited<ReturnType<typeof marketingClient.getPickers>>;
type Groups = readonly AdminMarketingCacheGroup[];

const allGroups = ["promotions", "featured", "pickers"] as const;

export function useAdminMarketing({ groups = allGroups }: { groups?: Groups } = {}) {
  const { uid, sessionReady, sessionRevision } = useAuth();
  const identity = sessionReady && uid ? `${uid}:${sessionRevision}` : null;
  const groupsKey = groups.join(":");
  const requestedGroups = React.useMemo(() => groups, [groups]);
  const initialEntries = requestedGroups.map((group) => getAdminMarketingCacheEntry(group, identity));
  const [promotions, setPromotions] = React.useState<Awaited<ReturnType<typeof marketingClient.getAdminPromotions>>["promotions"]>(() => getAdminMarketingCacheEntry("promotions", identity)?.data?.promotions ?? []);
  const [featured, setFeatured] = React.useState<Featured | null>(() => getAdminMarketingCacheEntry("featured", identity)?.data ?? null);
  const [pickers, setPickers] = React.useState<Pickers | null>(() => getAdminMarketingCacheEntry("pickers", identity)?.data ?? null);
  const [initialLoading, setInitialLoading] = React.useState(() => Boolean(identity) && initialEntries.some((entry) => !entry?.data));
  const [refreshing, setRefreshing] = React.useState(() => initialEntries.some((entry) => Boolean(entry?.data) && !isAdminMarketingCacheEntryFresh(entry)));
  const [error, setError] = React.useState<string | null>(null);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);

  const applyGroup = React.useCallback((group: AdminMarketingCacheGroup, data: unknown) => {
    if (group === "promotions") setPromotions((data as Awaited<ReturnType<typeof marketingClient.getAdminPromotions>>).promotions);
    if (group === "featured") setFeatured(data as Featured);
    if (group === "pickers") setPickers(data as Pickers);
  }, []);

  const refreshGroups = React.useCallback(async (requestedGroups: Groups, { force = true }: { force?: boolean } = {}) => {
    if (!identity) return;
    const entries = requestedGroups.map((group) => getAdminMarketingCacheEntry(group, identity));
    const missing = entries.some((entry) => !entry?.data);
    const stale = entries.some((entry) => Boolean(entry?.data) && !isAdminMarketingCacheEntryFresh(entry));
    setInitialLoading(missing);
    setRefreshing(!missing && (force || stale));
    setError(null);
    setRefreshError(null);
    const results = await Promise.allSettled(requestedGroups.map((group) => loadAdminMarketingCacheGroup(group, { force }).then((data) => ({ group, data }))));
    if (!getAdminMarketingCacheEntry(requestedGroups[0], identity)) return;
    let failure: string | null = null;
    for (const result of results) {
      if (result.status === "fulfilled") applyGroup(result.value.group, result.value.data);
      else failure = result.reason instanceof Error ? result.reason.message : "Marketing request failed.";
    }
    if (failure) {
      if (missing) setError(failure);
      else setRefreshError(failure);
    }
    setInitialLoading(false);
    setRefreshing(false);
  }, [applyGroup, identity]);

  React.useEffect(() => {
    setAdminMarketingCacheIdentity(identity);
    if (!identity) {
      setPromotions([]);
      setFeatured(null);
      setPickers(null);
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }
    const entries = requestedGroups.map((group) => getAdminMarketingCacheEntry(group, identity));
    entries.forEach((entry, index) => entry?.data && applyGroup(requestedGroups[index], entry.data));
    const missing = entries.some((entry) => !entry?.data);
    const stale = entries.some((entry) => Boolean(entry?.data) && !isAdminMarketingCacheEntryFresh(entry));
    setInitialLoading(missing);
    setRefreshing(!missing && stale);
    setError(null);
    setRefreshError(null);
    void refreshGroups(requestedGroups, { force: false });
  }, [applyGroup, groupsKey, identity, refreshGroups, requestedGroups]);

  const refreshPromotions = React.useCallback(() => refreshGroups(["promotions"], { force: true }), [refreshGroups]);
  const refreshFeatured = React.useCallback(() => refreshGroups(["featured"], { force: true }), [refreshGroups]);
  const refreshPickers = React.useCallback(() => refreshGroups(["pickers"], { force: true }), [refreshGroups]);
  const refresh = React.useCallback(() => refreshGroups(requestedGroups, { force: true }), [refreshGroups, requestedGroups]);
  const replaceFeatured = React.useCallback((kind: "product" | "shop", items: unknown[]) => {
    setFeatured((current) => {
      if (!current) return current;
      const next = { ...current, [kind === "product" ? "products" : "shops"]: items };
      writeAdminMarketingCacheGroup("featured", next);
      return next;
    });
  }, []);

  return {
    promotions, featured, pickers, initialLoading, refreshing, loading: initialLoading, error, refreshError,
    refresh, refreshPromotions, refreshFeatured, refreshPickers,
    createPromotion: async (input: PromotionMutation) => { await marketingClient.createPromotion(input); await refreshPromotions(); },
    updatePromotion: async (id: string, input: PromotionMutation) => { await marketingClient.updatePromotion(id, input); await refreshPromotions(); },
    setPromotionStatus: async (id: string, status: PromotionStatus) => { await marketingClient.setPromotionStatus(id, status); await refreshPromotions(); },
    saveFeatured: async (input: Parameters<typeof marketingClient.saveFeatured>[0]) => { await marketingClient.saveFeatured(input); await refreshFeatured(); },
    reorderFeaturedProducts: async (orderedIds: string[]) => { const products = await marketingClient.reorderFeaturedProducts(orderedIds); replaceFeatured("product", products); return products; },
    reorderFeaturedShops: async (orderedIds: string[]) => { const shops = await marketingClient.reorderFeaturedShops(orderedIds); replaceFeatured("shop", shops); return shops; },
    removeFeatured: async (kind: "product" | "shop", id: string) => { await marketingClient.removeFeatured(kind, id); await refreshFeatured(); },
  };
}
