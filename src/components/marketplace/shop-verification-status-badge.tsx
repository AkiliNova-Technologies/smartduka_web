import { CheckCircle2, Clock3, FileSearch, PauseCircle, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const config: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  NOT_APPLIED: { label: "Not applied", className: "bg-muted text-muted-foreground", icon: Clock3 },
  PENDING: { label: "Pending", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: Clock3 },
  UNDER_REVIEW: { label: "Under review", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300", icon: FileSearch },
  NEEDS_INFORMATION: { label: "Needs information", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: FileSearch },
  VERIFIED: { label: "Verified", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: XCircle },
  SUSPENDED: { label: "Suspended", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300", icon: PauseCircle },
  REVOKED: { label: "Revoked", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: RotateCcw },
};

export function verificationLabel(status?: string | null) {
  return config[status || "NOT_APPLIED"]?.label ?? "Not applied";
}

export function ShopVerificationStatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const item = config[status || "NOT_APPLIED"] ?? config.NOT_APPLIED;
  const Icon = item.icon;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", item.className, className)}><Icon aria-hidden="true" className="size-3.5" />{item.label}</span>;
}
