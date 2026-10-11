"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PaymentRecheckButton({ paymentIntentId, enabled }: { paymentIntentId: string; enabled: boolean }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const recheck = async () => {
    setChecking(true); setError("");
    try {
      const response = await fetch(`/api/admin/payment-intents/${paymentIntentId}/reconcile`, { method: "POST" });
      const body = await response.json();
      if (!response.ok || body.data?.outcome === "RETRY_SCHEDULED") throw new Error("Unable to confirm payment status.");
      router.refresh();
    } catch {
      setError("Could not confirm the latest status from MTN. The payment state has not been changed.");
    } finally { setChecking(false); }
  };
  if (!enabled) return null;
  return <div><Button type="button" disabled={checking} onClick={() => void recheck()}>{checking ? "Checking MTN…" : "Recheck MTN status"}</Button>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}<p className="mt-2 text-xs text-muted-foreground">This queries MTN and records a provider event. It cannot manually mark a payment paid.</p></div>;
}
