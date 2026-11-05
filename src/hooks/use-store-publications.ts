"use client";
import * as React from "react";
import { StorePublicationsClient, type AudienceMetrics, type StorePublication, type StorePublicationDraft, type StorePublicationProduct } from "@/lib/store-publications-client";

export function useStorePublications() {
  const [metrics, setMetrics] = React.useState<AudienceMetrics | null>(null), [items, setItems] = React.useState<StorePublication[]>([]), [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  const [products, setProducts] = React.useState<StorePublicationProduct[]>([]), [productLoading, setProductLoading] = React.useState(false);
  const refresh = React.useCallback(async (signal?: AbortSignal) => { setLoading(true); setError(""); try { const [nextMetrics, nextItems] = await Promise.all([StorePublicationsClient.metrics(signal), StorePublicationsClient.list(signal)]); setMetrics(nextMetrics); setItems(nextItems); } catch (cause) { if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Unable to load audience data."); } finally { if (!signal?.aborted) setLoading(false); } }, []);
  React.useEffect(() => { const controller = new AbortController(); void Promise.resolve().then(() => refresh(controller.signal)); return () => controller.abort(); }, [refresh]);
  const mutate = React.useCallback(async (operation: () => Promise<unknown>) => { await operation(); await refresh(); }, [refresh]);
  const searchProducts = React.useCallback(async (query: string) => { setProductLoading(true); try { setProducts((await StorePublicationsClient.products(query)).filter(product => product.status === "ACTIVE" || product.status === "PUBLISHED")); } finally { setProductLoading(false); } }, []);
  return { metrics, items, products, productLoading, loading, error, refresh, searchProducts, create: (draft: StorePublicationDraft) => mutate(() => StorePublicationsClient.create(draft)), submit: (id: string) => mutate(() => StorePublicationsClient.submit(id)), publish: (id: string) => mutate(() => StorePublicationsClient.publish(id)), archive: (id: string) => mutate(() => StorePublicationsClient.archive(id)) };
}
