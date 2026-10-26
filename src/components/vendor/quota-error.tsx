import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { EntitlementResource } from "@/lib/vendor-entitlements-client";

const labels: Record<EntitlementResource, string> = { ACTIVE_PRODUCTS: "active products", SHOP_BRANCHES: "branches", STAFF_ACCOUNTS: "staff accounts" };
export function QuotaError({ resource, currentUsage, limit }: { resource: EntitlementResource; currentUsage: number; limit: number }) {
  return <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"><p className="font-medium">You&apos;ve reached your plan limit of {limit.toLocaleString()} {labels[resource]}.</p><p className="mt-1 text-muted-foreground">Current usage: {currentUsage.toLocaleString()} of {limit.toLocaleString()}. Upgrade for additional capacity.</p><Button asChild size="sm" className="mt-3"><Link href="/vendor/subscription">View plans</Link></Button></div>;
}
