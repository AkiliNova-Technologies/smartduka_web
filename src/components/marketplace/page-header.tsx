import { cn } from "@/lib/utils";

type PageHeaderProps = { title: React.ReactNode; description?: React.ReactNode; context?: React.ReactNode; actions?: React.ReactNode; className?: string };

export function PageHeader({ title, description, context, actions, className }: PageHeaderProps) {
  return <header className={cn("flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between", className)}><div className="min-w-0 space-y-1.5">{context && <div className="text-sm text-muted-foreground">{context}</div>}<h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] sm:leading-8">{title}</h1>{description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{actions && <div className="shrink-0">{actions}</div>}</header>;
}
