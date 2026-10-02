"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { fetchApi } from "@/lib/providers/useProviderFetch";
import { ReviewDialog, type ExistingReview } from "./ReviewDialog";

type Purchase = { id: string; variantName: string | null; existing: ExistingReview };
const eligibilityRequests = new Map<string, Promise<{ purchases: Purchase[] }>>();

function getEligibility(kind: "product" | "shop", resourceId: string) {
  const url = `/api/reviews/eligible?kind=${kind}&id=${encodeURIComponent(resourceId)}`;
  const existing = eligibilityRequests.get(url);
  if (existing) return existing;
  const request = fetchApi<{ purchases: Purchase[] }>(url).finally(() => eligibilityRequests.delete(url));
  eligibilityRequests.set(url, request);
  return request;
}

export function ReviewEntryPoint({ kind, resourceId, label, image, showEligibilityMessage = true }: { kind: "product" | "shop"; resourceId: string; label: string; image?: string | null; showEligibilityMessage?: boolean }) {
  return <Suspense fallback={<ReviewEntryPointFallback />}><ReviewEntryPointRuntime kind={kind} resourceId={resourceId} label={label} image={image} showEligibilityMessage={showEligibilityMessage} /></Suspense>;
}

function ReviewEntryPointFallback() {
  return <span aria-hidden="true" className="inline-flex h-10 w-28 rounded-lg border border-transparent" />;
}

function ReviewEntryPointRuntime({ kind, resourceId, label, image, showEligibilityMessage = true }: { kind: "product" | "shop"; resourceId: string; label: string; image?: string | null; showEligibilityMessage?: boolean }) {
  const { isAuthenticated, sessionReady } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);

  const load = async () => {
    const result = await getEligibility(kind, resourceId);
    setPurchases(result.purchases);
  };
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void getEligibility(kind, resourceId)
      .then((result) => { if (!cancelled) setPurchases(result.purchases); })
      .catch(() => { if (!cancelled) setPurchases([]); });
    return () => { cancelled = true; };
  }, [isAuthenticated, kind, resourceId]);

  if (!sessionReady) return null;
  if (!isAuthenticated) return <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="mt-3 inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">Sign in to review</Link>;
  if (purchases === null) return null;
  if (!purchases.length) return showEligibilityMessage ? <p className="mt-3 text-sm text-muted-foreground">Reviews are available after a paid order from this {kind === "product" ? "product" : "shop"} has been delivered.</p> : null;
  if (purchases.length === 1) return <ReviewDialog kind={kind} purchaseId={purchases[0].id} label={label} image={image} variantName={purchases[0].variantName} existing={purchases[0].existing} triggerLabel={purchases[0].existing ? "Edit your review" : "Write a review"} onSaved={() => { void load(); router.refresh(); }} />;
  return <><button type="button" onClick={() => setChooserOpen(true)} className="mt-3 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">Write a review</button><Dialog.Root open={chooserOpen} onOpenChange={setChooserOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40"/><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-xl"><Dialog.Title className="font-semibold">Choose a delivered purchase</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">Select the purchase you want to review.</Dialog.Description><div className="mt-4 space-y-2">{purchases.map((purchase, index) => <button type="button" key={purchase.id} onClick={() => { setSelected(purchase); setChooserOpen(false); }} className="flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm hover:bg-muted"><span>Delivered purchase {index + 1}{purchase.variantName ? ` · ${purchase.variantName}` : ""}</span><span className="font-medium">{purchase.existing ? "Edit" : "Review"}</span></button>)}</div></Dialog.Content></Dialog.Portal></Dialog.Root>{selected && <ReviewDialog kind={kind} purchaseId={selected.id} label={label} image={image} variantName={selected.variantName} existing={selected.existing} open onOpenChange={(open) => !open && setSelected(null)} onSaved={() => { setSelected(null); void load(); router.refresh(); }} />}</>;
}
