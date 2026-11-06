"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ProductSaveStatus =
  | "unsaved"
  | "saving-local"
  | "saved-local"
  | "saving-draft"
  | "draft-saved"
  | "save-failed";

const statusLabels: Record<ProductSaveStatus, string> = {
  unsaved: "Unsaved changes",
  "saving-local": "Saving locally…",
  "saved-local": "Saved locally",
  "saving-draft": "Saving draft…",
  "draft-saved": "Draft saved",
  "save-failed": "Save failed — changes remain saved locally",
};

type ProductFormFooterProps = {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  saveStatus: ProductSaveStatus;
  isSavingDraft: boolean;
  isSubmitting: boolean;
  submitLabel?: string;
  recovery?: {
    savedAt: string;
    onRestore: () => void;
    onDiscard: () => void;
  };
};

export function ProductFormFooter({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onSaveDraft,
  saveStatus,
  isSavingDraft,
  isSubmitting,
  submitLabel = "Publish Product",
  recovery,
}: ProductFormFooterProps) {
  const isFirst = currentStep === 1;
  const isFinal = currentStep === totalSteps;

  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-6 space-y-3 border-t border-border/60 bg-card/95 px-6 pb-1 pt-4 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      {recovery && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground">
            Unsaved changes from {new Date(recovery.savedAt).toLocaleString()} are available.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={recovery.onDiscard}>
              Discard
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={recovery.onRestore}>
              Restore Changes
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!isFirst && (
            <Button type="button" variant="outline" className="rounded-full" onClick={onPrevious} disabled={isSavingDraft || isSubmitting}>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
          )}
          {onSaveDraft && (
            <Button type="button" variant="outline" className="rounded-full" onClick={onSaveDraft} disabled={isSavingDraft || isSubmitting}>
              Save Draft
            </Button>
          )}
          <span className="basis-full text-xs text-muted-foreground sm:basis-auto" role="status" aria-live="polite">
            {statusLabels[saveStatus]}
          </span>
        </div>

        {isFinal ? (
          <Button type="submit" className="w-full rounded-full sm:w-auto" disabled={isSubmitting || isSavingDraft}>
            {isSubmitting ? "Publishing…" : submitLabel}
          </Button>
        ) : (
          <Button type="button" className="w-full rounded-full sm:w-auto" onClick={onNext} disabled={isSavingDraft || isSubmitting}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
