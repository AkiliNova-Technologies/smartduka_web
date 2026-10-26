import type { EntitlementResource, VendorEntitlementSnapshotDto } from "@/lib/vendor-entitlements-client";

const labels: Record<EntitlementResource, string> = { ACTIVE_PRODUCTS: "Active products", SHOP_BRANCHES: "Branches", STAFF_ACCOUNTS: "Staff" };
export function ResourceUsage({ resource, entitlement, compact = false }: { resource: EntitlementResource; entitlement: VendorEntitlementSnapshotDto; compact?: boolean }) {
  const used = entitlement.usage[resource], configured = entitlement.limits[resource];
  const expanded = resource === "ACTIVE_PRODUCTS" && configured === null;
  const limit = expanded ? entitlement.limits.ACTIVE_PRODUCTS_SAFETY_CEILING : configured;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const percent = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : used > 0 ? 100 : 0;
  return <div className={compact ? "space-y-1.5" : "space-y-2 rounded-xl border bg-card p-4"}>
    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{labels[resource]}</span><span className="tabular-nums text-muted-foreground">{expanded ? `${used.toLocaleString()} · Expanded capacity` : `${used.toLocaleString()} / ${(limit ?? 0).toLocaleString()}`}</span></div>
    {!expanded && <div role="progressbar" aria-label={`${labels[resource]} usage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} /></div>}
    {!compact && <p className="text-xs text-muted-foreground">{expanded ? "Fair-use capacity applies; usage is shown without an unlimited percentage." : `${remaining?.toLocaleString() ?? 0} remaining`}</p>}
  </div>;
}

export function ResourceUsageGrid({ entitlement }: { entitlement: VendorEntitlementSnapshotDto }) {
  return <div className="grid gap-3 md:grid-cols-3">{(["ACTIVE_PRODUCTS", "SHOP_BRANCHES", "STAFF_ACCOUNTS"] as const).map(resource => <ResourceUsage key={resource} resource={resource} entitlement={entitlement} />)}</div>;
}
