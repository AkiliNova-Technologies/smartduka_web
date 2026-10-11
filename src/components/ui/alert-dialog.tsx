"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return <AlertDialogPrimitive.Portal><AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"/><AlertDialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-card p-6 shadow-xl data-open:animate-in data-open:zoom-in-95", className)} {...props}/></AlertDialogPrimitive.Portal>;
}
export function AlertDialogHeader(props: React.ComponentProps<"div">) { return <div {...props} className={cn("space-y-2", props.className)}/>; }
export function AlertDialogFooter(props: React.ComponentProps<"div">) { return <div {...props} className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", props.className)}/>; }
export function AlertDialogTitle(props: React.ComponentProps<typeof AlertDialogPrimitive.Title>) { return <AlertDialogPrimitive.Title {...props} className={cn("text-lg font-semibold", props.className)}/>; }
export function AlertDialogDescription(props: React.ComponentProps<typeof AlertDialogPrimitive.Description>) { return <AlertDialogPrimitive.Description {...props} className={cn("text-sm text-muted-foreground", props.className)}/>; }
export function AlertDialogAction(props: React.ComponentProps<typeof AlertDialogPrimitive.Action>) { return <AlertDialogPrimitive.Action {...props} className={cn(buttonVariants({ variant: "destructive" }), props.className)}/>; }
export function AlertDialogCancel(props: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) { return <AlertDialogPrimitive.Cancel {...props} className={cn(buttonVariants({ variant: "outline" }), props.className)}/>; }
