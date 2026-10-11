"use client";
import type { ComponentType } from "react";
import Link from "next/link";
import { Loader2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ActionIcon = ComponentType<{
  className?: string;
  "aria-hidden"?: boolean;
}>;
export type DataTableRowAction = {
  id: string;
  label: string;
  icon: ActionIcon;
  href?: string;
  onSelect?: () => void;
  hidden?: boolean;
  authorized?: boolean;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
};

export function partitionRowActions(
  actions: readonly DataTableRowAction[],
  maxTopLevel = 3,
) {
  const visible = actions.filter(
    (action) => !action.hidden && action.authorized !== false,
  );
  const limit = Math.max(1, Math.min(3, maxTopLevel));
  return visible.length <= limit
    ? { direct: visible, overflow: [] }
    : {
        direct: visible.slice(0, limit - 1),
        overflow: visible.slice(limit - 1),
      };
}

export function DataTableRowActions({
  actions,
  maxTopLevel = 3,
  className,
  optionsLabel = "More options",
}: {
  actions: readonly DataTableRowAction[];
  maxTopLevel?: number;
  className?: string;
  optionsLabel?: string;
}) {
  const { direct, overflow } = partitionRowActions(actions, maxTopLevel);
  if (!direct.length && !overflow.length) return null;
  return (
    <TooltipProvider>
      <div
        className={cn("flex items-center justify-end gap-1.5", className)}
        onClick={(event) => event.stopPropagation()}>
        {direct.map((action) => (
          <DirectAction key={action.id} action={action} />
        ))}
        {overflow.length > 0 && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0 rounded-full border-border/40 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={optionsLabel}>
                    <MoreVertical aria-hidden="true" className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>{optionsLabel}</TooltipContent>
            </Tooltip>
          <DropdownMenuContent
            align="end"
            className="z-60 min-w-44 rounded-xl border border-border/60 p-1">
            {overflow.map((action) => {
              const Icon = action.loading ? Loader2 : action.icon;
              const content = (
                <>
                  {Icon && (
                    <Icon
                      aria-hidden={true}
                      className={cn(
                        "size-3.5",
                        action.loading && "animate-spin",
                      )}
                    />
                  )}
                  {action.label}
                </>
              );
              return action.href && !action.disabled ? (
                <DropdownMenuItem
                  key={action.id}
                  asChild
                  variant={action.destructive ? "destructive" : "default"}>
                  <Link href={action.href}>{content}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled || action.loading}
                  variant={action.destructive ? "destructive" : "default"}
                  onSelect={() => action.onSelect?.()}>
                  {content}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  );
}

function DirectAction({ action }: { action: DataTableRowAction }) {
  const Icon = action.loading ? Loader2 : action.icon;
  const controlClassName = cn(
    "size-8 shrink-0 rounded-full border-border/40",
    !action.destructive &&
      "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  );
  const content = Icon && <Icon aria-hidden={true} className={cn("size-3.5", action.loading && "animate-spin")} />;
  const control = action.href && !action.disabled ? (
    <Button asChild size="icon" variant={action.destructive ? "destructive" : "outline"} className={controlClassName}>
      <Link href={action.href} aria-label={action.label}>{content}</Link>
    </Button>
  ) : (
    <Button type="button" size="icon" variant={action.destructive ? "destructive" : "outline"} className={controlClassName} aria-label={action.label} disabled={action.disabled || action.loading} onClick={() => action.onSelect?.()}>{content}</Button>
  );
  return <Tooltip><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent side="top" sideOffset={6}>{action.label}</TooltipContent></Tooltip>;
}
