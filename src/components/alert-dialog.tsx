"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  itemType?: string;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
  variant?: "danger" | "warning";
}

export function DeleteDialog({
  open,
  onOpenChange,
  title = "Delete Item",
  description,
  itemName,
  itemType = "item",
  onConfirm,
  isDeleting = false,
  variant = "danger",
}: DeleteDialogProps) {
  const [isConfirmed, setIsConfirmed] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wasOpenRef = React.useRef(false);

  // Reset state when dialog closes using a key approach
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset confirmation state when closing
      setIsConfirmed(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Track open state changes for cleanup
  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened
      wasOpenRef.current = true;
    } else if (!open && wasOpenRef.current) {
      // Dialog just closed
      wasOpenRef.current = false;
    }
  }, [open]);

  const handleConfirm = async () => {
    if (itemName && !isConfirmed) return;
    await onConfirm();
    handleOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (!itemName || isConfirmed)) {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      handleOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => !isDeleting && handleOpenChange(false)} 
      />
      
      {/* Dialog */}
      <div 
        className={cn(
          "relative z-50 w-full max-w-md mx-4 bg-card border border-border/60 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200",
          "p-6 space-y-6"
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="space-y-2">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            variant === "danger" 
              ? "bg-rose-500/10 text-rose-500" 
              : "bg-amber-500/10 text-amber-500"
          )}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-foreground tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {description || (
                <>
                  Are you sure you want to delete{" "}
                  {itemName ? (
                    <span className="font-semibold text-foreground">
                      &ldquo;{itemName}&rdquo;
                    </span>
                  ) : (
                    <span>this {itemType}</span>
                  )}
                  ? This action is permanent and cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Confirmation Input for Named Items */}
        {itemName && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Type <span className="text-foreground">{itemName}</span> to confirm
            </Label>
            <Input
              ref={inputRef}
              type="text"
              placeholder={`Type "${itemName}" to confirm`}
              onChange={(e) => setIsConfirmed(e.target.value === itemName)}
              className="w-full h-10 px-4 rounded-full border border-border/60 bg-muted/30 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
          </div>
        )}

        {/* Warning Message */}
        <div className={cn(
          "p-3 rounded-lg border text-xs font-medium",
          variant === "danger"
            ? "bg-rose-500/5 border-rose-500/10 text-rose-600"
            : "bg-amber-500/5 border-amber-500/10 text-amber-600"
        )}>
          <div className="flex items-start gap-2">
            <span>
              {itemType === "category" 
                ? "Deleting this category will also remove all associated subcategories and may affect product listings."
                : itemType === "product"
                ? "Deleting this product will permanently remove it from all stores and cannot be recovered."
                : itemType === "vendor" || itemType === "store"
                ? "Deleting this vendor will remove their store and all associated products from the marketplace."
                : "This action cannot be reversed. Please confirm you want to proceed."}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-full text-xs font-medium border-border/70 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting || (!!itemName && !isConfirmed)}
            className={cn(
              "flex-1 h-10 rounded-full text-xs font-medium gap-2 cursor-pointer disabled:opacity-50",
              variant === "danger"
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-white"
            )}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <span>Delete {itemType}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}