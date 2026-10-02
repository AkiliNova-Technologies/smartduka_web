import * as React from "react"
import { cn } from "@/lib/utils"
function Command({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="command" className={cn("overflow-hidden", className)} {...props} /> }
function CommandInput({ className, ...props }: React.ComponentProps<"input">) { return <input data-slot="command-input" className={cn("h-9 w-full rounded-sm border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-emerald-600", className)} {...props} /> }
function CommandList({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="command-list" className={cn("max-h-60 overflow-y-auto overscroll-contain", className)} {...props} /> }
function CommandGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="command-group" className={cn("p-1", className)} {...props} /> }
function CommandItem({ className, ...props }: React.ComponentProps<"button">) { return <button data-slot="command-item" type="button" className={cn("flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted", className)} {...props} /> }
function CommandEmpty({ className, ...props }: React.ComponentProps<"p">) { return <p data-slot="command-empty" className={cn("px-2 py-3 text-sm text-muted-foreground", className)} {...props} /> }
export { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandEmpty }
