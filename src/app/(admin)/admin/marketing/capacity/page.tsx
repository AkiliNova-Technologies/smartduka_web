import { AdvertisingPlacement } from "@prisma/client";
import { Suspense } from "react";
import { revalidatePath, revalidateTag } from "next/cache";
import { connection } from "next/server";
import { Input } from "@/components/ui/input";
import { cacheTags } from "@/lib/cache-policy";
import { PromotionInventoryService } from "@/services/promotion-inventory";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge } from "lucide-react";
import { CapacitySubmitButton } from "@/components/marketing/admin/capacity-submit-button";

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
      <DashboardPageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Gauge aria-hidden="true" className="size-5" />
            Promotion capacity
          </span>
        }
        description={
          <>
            Configure simultaneous sponsored positions. Each homepage section
            renders four visible positions; unreserved positions remain curated.
            Existing paid commitments are never cancelled automatically.
          </>
        }
      />
      <section className="grid gap-4 md:grid-cols-2">
        {state.inventories.map((item) => (
          <form
            key={item.id}
            action={updateCapacity}
            className="rounded-xl border border-border/60 bg-card p-5">
            <Input type="hidden" name="placement" value={item.placement} />
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
            <CapacitySubmitButton />
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
              <div
                key={item.id}
                className="rounded-xl border border-border/60 bg-card p-4 text-sm">
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
            <p className="rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
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
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}
