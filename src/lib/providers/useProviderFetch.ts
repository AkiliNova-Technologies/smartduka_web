"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseProviderFetchOptions {
  enabled: boolean;
  deps?: unknown[];
}

export function useProviderFetch<T>(
  fetchFn: () => Promise<T>,
  options: UseProviderFetchOptions
) {
  const { enabled, deps = [] } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: enabled,
    error: null,
  });

  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const fetchFnRef = useRef(fetchFn);

  // ✅ FIXED: Update ref in useEffect, not during render
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(async () => {
    if (!enabled || fetchingRef.current || hasFetchedRef.current) return;

    fetchingRef.current = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fetchFnRef.current();
      setState({ data, loading: false, error: null });
      hasFetchedRef.current = true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setState({ data: null, loading: false, error: message });
    } finally {
      fetchingRef.current = false;
    }
  }, [enabled]);

  const refetch = useCallback(() => {
    hasFetchedRef.current = false;
    fetchingRef.current = false;
  }, []);

  useEffect(() => {
    if (enabled && !hasFetchedRef.current) {
      queueMicrotask(() => {
        execute();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, execute, ...deps]);

  // ✅ FIXED: Use ref-based check instead of setState in effect
  const prevEnabledRef = useRef(enabled);
  useEffect(() => {
    if (prevEnabledRef.current && !enabled) {
      // Reset state when disabled
      setState({ data: null, loading: false, error: null });
      hasFetchedRef.current = false;
      fetchingRef.current = false;
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

  return { ...state, refetch };
}

export async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error || `Request failed with status ${response.status}`
    );
  }

  const json = await response.json();

  if (json.success !== undefined) {
    if (!json.success) {
      throw new Error(json.error || "Request failed");
    }
    return json.data as T;
  }

  return json as T;
}

export function authHeaders(uid: string | null): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(uid ? { "x-marketplace-user-id": uid } : {}),
  };
}