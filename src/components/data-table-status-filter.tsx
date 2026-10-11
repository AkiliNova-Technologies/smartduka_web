"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DataTableStatusFilterOption<T extends string = string> = { value: T; label: string; count?: number; disabled?: boolean };

export function DataTableStatusFilter<T extends string>({ value, onValueChange, options, label = "Status", className, triggerClassName }: { value: T; onValueChange: (value: T) => void; options: readonly DataTableStatusFilterOption<T>[]; label?: string; className?: string; triggerClassName?: string }) {
  return <div className={cn("flex w-full items-center gap-2 sm:w-auto", className)}><span className="shrink-0 text-xs font-medium text-muted-foreground">{label}:</span><Select value={value} onValueChange={(next) => onValueChange(next as T)}><SelectTrigger aria-label={`${label} filter`} size="sm" className={cn("w-full min-w-44 rounded-lg text-xs sm:w-auto", triggerClassName)}><SelectValue /></SelectTrigger><SelectContent align="start">{options.map((option) => <SelectItem key={option.value} value={option.value} disabled={option.disabled}><span>{option.label}</span>{option.count !== undefined && <span className="text-muted-foreground">{option.count}</span>}</SelectItem>)}</SelectContent></Select></div>;
}
