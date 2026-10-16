import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DetailPageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function DetailPageHeader({
  title,
  description,
  backHref = "/",
  backLabel = "Go back",
  children,
  className,
}: DetailPageHeaderProps) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 items-start gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={backHref} aria-label={backLabel} className="grid size-10 shrink-0 place-items-center rounded-full border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>{backLabel}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="min-w-0">
          <h1 className="break-words text-xl font-medium tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {description && <div className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">{description}</div>}
        </div>
      </div>
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{children}</div>}
    </header>
  );
}
