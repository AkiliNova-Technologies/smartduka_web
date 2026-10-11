import { StatusBadge } from "@/components/marketplace/status-badge";

const config: Record<string, { label: string }> = {
  NOT_APPLIED: { label: "Not applied" }, PENDING: { label: "Pending" }, UNDER_REVIEW: { label: "Under review" }, NEEDS_INFORMATION: { label: "Needs information" }, VERIFIED: { label: "Verified" }, REJECTED: { label: "Rejected" }, SUSPENDED: { label: "Suspended" }, REVOKED: { label: "Revoked" },
};

export function verificationLabel(status?: string | null) {
  return config[status || "NOT_APPLIED"]?.label ?? "Not applied";
}

export function ShopVerificationStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  return <StatusBadge status={status || "NOT_APPLIED"} className={className} />;
}
