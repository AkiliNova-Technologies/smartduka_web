"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { OrderClient, OrderRequestError, type OrderPage } from "@/lib/order-client";
import type { UserOrder } from "@/providers/UserDataProvider";

export function useCustomerOrders(page: number, filter: string) {
  const { uid, sessionReady, sessionRevision } = useAuth();
  const [result, setResult] = useState<OrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!uid || !sessionReady) return;
    const current = ++generation.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError(null); setResult(null);
    try { const next = await OrderClient.list(page, filter, controller.signal); if (current === generation.current) setResult(next); }
    catch (cause) { if (current === generation.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load orders."); }
    finally { if (current === generation.current) setLoading(false); }
  }, [filter, page, sessionReady, uid]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load(); }); return () => { active = false; generation.current += 1; abortRef.current?.abort(); }; }, [load, sessionRevision]);
  return { result, loading, error, retry: load };
}

export function useCustomerOrder(orderId: string) {
  const { uid, sessionReady, sessionRevision } = useAuth();
  const [order, setOrder] = useState<UserOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!uid || !sessionReady) return;
    const current = ++generation.current; abortRef.current?.abort(); const controller = new AbortController(); abortRef.current = controller;
    setState((currentState) => currentState === "ready" ? "ready" : "loading"); setError(null);
    try { const next = await OrderClient.get(orderId, controller.signal); if (current === generation.current) { setOrder(next); setState("ready"); } }
    catch (cause) { if (current !== generation.current || controller.signal.aborted) return; if (cause instanceof OrderRequestError && cause.status === 404) setState("not-found"); else { setError(cause instanceof Error ? cause.message : "Unable to load this order."); setState("error"); } }
  }, [orderId, sessionReady, uid]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) { setOrder(null); setState("loading"); void load(); } }); return () => { active = false; generation.current += 1; abortRef.current?.abort(); }; }, [load, sessionRevision]);
  return { order, state, error, retry: load };
}
