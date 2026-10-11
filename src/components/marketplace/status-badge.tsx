import type { ElementType, ReactNode } from "react";
import { AlertCircle, Ban, CheckCircle2, Circle, Clock3, FileSearch, PauseCircle, RotateCcw, Truck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";
type StatusPresentation = { label?: string; tone: StatusTone; icon: ElementType };

const toneStyles: Record<StatusTone, string> = {
  success: "border-transparent bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white",
  warning: "border-transparent bg-amber-500 text-white dark:bg-amber-500 dark:text-white",
  danger: "border-transparent bg-rose-600 text-white dark:bg-rose-600 dark:text-white",
  info: "border-transparent bg-blue-600 text-white dark:bg-blue-600 dark:text-white",
  neutral: "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const success = (label?: string): StatusPresentation => ({ label, tone: "success", icon: CheckCircle2 });
const warning = (label?: string): StatusPresentation => ({ label, tone: "warning", icon: Clock3 });
const danger = (label?: string): StatusPresentation => ({ label, tone: "danger", icon: XCircle });
const info = (label?: string): StatusPresentation => ({ label, tone: "info", icon: FileSearch });
const neutral = (label?: string): StatusPresentation => ({ label, tone: "neutral", icon: Circle });

/** Explicit mappings prevent similarly named statuses from inheriting incorrect semantics. */
export const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  ACTIVE: success("Active"), APPROVED: success("Approved"), COMPLETED: success("Completed"), SUCCESSFUL: success("Successful"), DELIVERED: success("Delivered"), PAID: success("Paid"), VERIFIED: success("Verified"), PUBLISHED: success("Published"), SETTLED: success("Settled"), RESOLVED: success("Resolved"), HEALTHY: success("Healthy"), RECEIVED: success("Received"), PROCESSED: success("Processed"), READY: success("Ready"), REPLIED: success("Replied"), LOW: success("Low"),
  PENDING: warning("Pending"), REQUESTED: warning("Requested"), PROCESSING: warning("Processing"), AWAITING_PAYMENT: warning("Awaiting payment"), AWAITING_REPLY: warning("Awaiting reply"), UNDER_REVIEW: warning("Under review"), NEEDS_INFORMATION: warning("Needs information"), AWAITING_INFORMATION: warning("Awaiting information"), ACTION_REQUIRED: warning("Action required"), DRAFT: warning("Draft"), ON_HOLD: warning("On hold"), SCHEDULED: warning("Scheduled"), CONFIRMATION_DELAYED: warning("Confirmation delayed"), OPEN: warning("Open"), MEDIUM: warning("Medium"), WARNING: warning("Warning"), UNASSESSED: warning("Unassessed"), READY_FOR_PROVIDER_REFUND: warning("Ready for provider refund"),
  REJECTED: danger("Rejected"), FAILED: danger("Failed"), PAYMENT_FAILED: danger("Payment failed"), CANCELLED: danger("Cancelled"), BANNED: { label: "Banned", tone: "danger", icon: Ban }, REVOKED: { label: "Revoked", tone: "danger", icon: RotateCcw }, REFUNDED: danger("Refunded"), REVERSED: danger("Reversed"), EXPIRED: danger("Expired"), DISMISSED: danger("Dismissed"), REMOVED: danger("Removed"), CRITICAL: danger("Critical"), HIGH: danger("High"),
  REVIEW_REQUIRED: info("Needs review"), NEEDS_REVIEW: info("Needs review"), SHIPPED: { label: "Shipped", tone: "info", icon: Truck }, READY_FOR_PICKUP: info("Ready for pickup"), IN_TRANSIT: { label: "In transit", tone: "info", icon: Truck }, TRIAL: info("Trial"), INFO: info("Info"), SUBMITTED: info("Submitted"),
  SUSPENDED: { label: "Suspended", tone: "warning", icon: PauseCircle }, INACTIVE: neutral("Inactive"), DEACTIVATED: neutral("Deactivated"), ARCHIVED: neutral("Archived"), HIDDEN: neutral("Hidden"), NOT_APPLIED: neutral("Not applied"), OUT_OF_STOCK: neutral("Out of stock"),
};

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "Unknown";
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusPresentation(status: string | null | undefined) {
  const normalized = status?.trim().toUpperCase() || "UNKNOWN";
  const presentation = STATUS_PRESENTATION[normalized] ?? { tone: "neutral" as const, icon: AlertCircle };
  return { ...presentation, label: presentation.label ?? formatStatusLabel(normalized) };
}

export function StatusBadge({ status, children, tone, label, icon, className }: { status?: string | null; children?: ReactNode; tone?: StatusTone; label?: string; icon?: ElementType | false; className?: string }) {
  const presentation = getStatusPresentation(status);
  const resolvedTone = tone ?? presentation.tone;
  const Icon = icon === false ? null : (icon ?? (status ? presentation.icon : null));
  return <span className={cn("inline-flex min-h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-none", toneStyles[resolvedTone], className)}>{Icon && <Icon aria-hidden="true" className="size-3" />}{label ?? children ?? presentation.label}</span>;
}
