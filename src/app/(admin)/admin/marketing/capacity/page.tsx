import { AdvertisingPlacement } from "@prisma/client";
import { Suspense } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cacheTags } from "@/lib/cache-policy";
import { PromotionInventoryService } from "@/services/promotion-inventory";

async function updateCapacity(formData: FormData) {
  "use server";
  const placement = String(formData.get("placement")) as AdvertisingPlacement,
    capacity = Number(formData.get("capacity"));
  await PromotionInventoryService.updateCapacity(placement, capacity);
  revalidateTag(cacheTags.marketplace.promotions, "max");
  revalidateTag(cacheTags.marketplace.discovery, "max");
  revalidatePath("/admin/marketing/capacity");
}
const title = (placement: string) =>
  placement === "HOMEPAGE_FEATURED_PRODUCTS"
    ? "Homepage featured products"
    : "Homepage featured shops";
export default function PromotionCapacityPage() {
  return (
    <Suspense fallback={<CapacitySkeleton />}>
      <PromotionCapacityContent />
    </Suspense>
  );
}
async function PromotionCapacityContent() {
  // JWT verification validates expiry against the current clock. Keep that
  // request- and user-specific work out of the prerendered shell while the
  // page-level Suspense boundary remains available for instant navigation.
  await connection();
  const state = await PromotionInventoryService.adminState();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Promotion capacity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure simultaneous sponsored positions. Each homepage section
          renders four visible positions; unreserved positions remain curated.
          Existing paid commitments are never cancelled automatically.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2">
        {state.inventories.map((item) => (
          <form
            key={item.id}
            action={updateCapacity}
            className="rounded-2xl border bg-card p-5">
            <input type="hidden" name="placement" value={item.placement} />
            <h2 className="font-semibold">{title(item.placement)}</h2>
            <label
              className="mt-4 block text-sm font-medium"
              htmlFor={`capacity-${item.id}`}>
              Paid slots
            </label>
            <Input
              id={`capacity-${item.id}`}
              name="capacity"
              type="number"
              min={1}
              max={4}
              defaultValue={item.capacity}
              className="mt-2"
            />
            <Button className="mt-4 rounded-full" type="submit">
              Save capacity
            </Button>
          </form>
        ))}
      </section>
      {state.conflicts.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <h2 className="font-semibold">Existing over-capacity periods</h2>
          {state.conflicts.map((item) => (
            <p key={item.placement} className="mt-2 text-sm">
              {title(item.placement)}: peak {item.peak}, configured{" "}
              {item.capacity}. Commitments were preserved.
            </p>
          ))}
        </section>
      )}
      <section>
        <h2 className="text-lg font-semibold">Paid booking exceptions</h2>
        <div className="mt-3 space-y-2">
          {state.recovery.length ? (
            state.recovery.map((item) => (
              <div key={item.id} className="rounded-xl border p-4 text-sm">
                <p className="font-medium">
                  {item.product?.name ?? item.vendor.storeName}
                </p>
                <p className="text-muted-foreground">
                  Paid but unfulfilled · campaign {item.id.slice(0, 8)} · review
                  refund or promotional-credit recovery.
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No paid booking exceptions.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
function CapacitySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-5 max-w-2xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-2xl border bg-card" />
        <div className="h-48 animate-pulse rounded-2xl border bg-card" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl border bg-card" />
    </div>
  );
}
