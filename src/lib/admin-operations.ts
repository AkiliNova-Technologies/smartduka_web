export function humanizeOperation(value: string | null | undefined) {
  if (!value) return "—";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const operationBadgeClass = (value: string) => {
  if (["CRITICAL", "HIGH", "FAILED", "REJECTED"].includes(value)) return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (["WARNING", "MEDIUM", "REQUESTED", "OPEN", "UNDER_REVIEW", "READY_FOR_PROVIDER_REFUND"].includes(value)) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  if (["RESOLVED", "COMPLETED", "APPROVED", "RECEIVED", "LOW", "INFO"].includes(value)) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return "bg-muted text-muted-foreground";
};

export function shortReference(value: string | null | undefined) {
  return value ? `${value.slice(0, 8)}…` : "—";
}
