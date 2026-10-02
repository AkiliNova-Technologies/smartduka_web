"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import * as React from "react";
import type { PromotionPlacement } from "@prisma/client";
import {
  marketingClient,
  type FeaturedProductDto,
  type FeaturedShopDto,
} from "@/lib/marketing-client";
type Query<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};
function useQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  initial: T,
  deps: React.DependencyList,
): Query<T> {
  const [data, setData] = React.useState<T>(initial),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState<string | null>(null),
    [revision, setRevision] = React.useState(0);
  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    load(controller.signal)
      .then(setData)
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Marketing request failed.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]);
  return {
    data,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
export function usePromotions(placement: PromotionPlacement) {
  return useQuery(
    (signal) =>
      marketingClient
        .getPromotions(placement, signal)
        .then((r) => r.promotions),
    [],
    [placement],
  );
}
export function useFeaturedProducts() {
  return useQuery(
    (signal) => marketingClient.getFeatured(signal).then((r) => r.products),
    [] as FeaturedProductDto[],
    [],
  );
}
export function useFeaturedShops() {
  return useQuery(
    (signal) => marketingClient.getFeatured(signal).then((r) => r.shops),
    [] as FeaturedShopDto[],
    [],
  );
}
