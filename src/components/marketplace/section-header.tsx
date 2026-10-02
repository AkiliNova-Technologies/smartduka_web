import { cn } from "@/lib/utils";

export function SectionHeader({ title, description, action, className }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-end justify-between gap-4", className)}><div className="min-w-0 space-y-1"><h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>{action && <div className="shrink-0">{action}</div>}</div>;
}
