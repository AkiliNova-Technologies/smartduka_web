"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSellerApplication,
  submitSellerApplication,
  type SellerApplicationInput,
  type SellerApplicationSummary,
} from "@/lib/seller-application-client";

export function useSellerApplication(enabled: boolean) {
  const [application, setApplication] = useState<SellerApplicationSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const controller = new AbortController();
    void getSellerApplication(controller.signal)
      .then(setApplication)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load your seller application.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled]);

  const submit = useCallback(async (input: SellerApplicationInput) => {
    setError("");
    const created = await submitSellerApplication(input);
    setApplication(created);
    return created;
  }, []);

  return { application, loading, error, submit };
}
