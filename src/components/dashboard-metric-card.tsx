import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricTone = "default" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<MetricTone, string> = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

export function DashboardMetricCard({ label, value, description, icon: Icon, tone = "default", href }: { label: string; value: ReactNode; description?: ReactNode; icon?: LucideIcon; tone?: MetricTone; href?: string }) {
  const content = <><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p>{Icon && <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}><Icon className="size-5" aria-hidden="true" /></span>}</div><p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</>;
  const className = "rounded-xl border border-border/60 bg-card p-4";
  return href ? <Link href={href} className={`${className} transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}>{content}</Link> : <section className={className}>{content}</section>;
}
