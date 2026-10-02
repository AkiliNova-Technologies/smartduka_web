"use client";
import * as React from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PromotionMutation } from "@/lib/marketing-client";
import { CampaignDetailsFields } from "./campaign-details-fields";
import { PromotionArtworkFields } from "./promotion-artwork-fields";
import { PromotionPlacementFields } from "./promotion-placement-fields";
import { PromotionActionFields } from "./promotion-action-fields";
import { PromotionPublishingFields } from "./promotion-publishing-fields";
import { PromotionPreview } from "./promotion-preview";
import {
  emptyPromotion,
  type PickerData,
  type PromotionFormValue,
} from "./types";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: PromotionFormValue;
  pickers: PickerData;
  saving: boolean;
  error?: string | null;
  onSubmit: (input: PromotionMutation) => Promise<void>;
};
const steps = ["Campaign", "Placement", "Publishing", "Review"];
export function PromotionForm({
  open,
  onOpenChange,
  mode,
  initial,
  pickers,
  saving,
  error,
  onSubmit,
}: Props) {
  const [form, setForm] = React.useState<PromotionFormValue>(
    initial ?? emptyPromotion,
  );
  const [step, setStep] = React.useState(1);
  const [visited, setVisited] = React.useState(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const change = <K extends keyof PromotionFormValue>(
    key: K,
    value: PromotionFormValue[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const validate = (target: number) => {
    const next: Record<string, string> = {};
    if (target === 1) {
      if (!form.title.trim()) next.title = "Enter a promotion title.";
      if (!form.desktopImageUrl)
        next.desktopImageUrl = "Upload a desktop banner.";
    }
    if (target === 2) {
      if (!form.placements.length)
        next.placements =
          "Choose at least one place where this promotion should appear.";
      if (form.primaryCtaLabel?.trim() && !form.primaryCtaValue?.trim())
        next.primaryCtaValue = "Choose where this button should lead.";
    }
    if (
      target === 3 &&
      form.startsAt &&
      form.endsAt &&
      new Date(form.endsAt) <= new Date(form.startsAt)
    )
      next.endsAt = "End time must be after the start time.";
    setErrors(next);
    return !Object.keys(next).length;
  };
  const next = () => {
    if (!validate(step)) return;
    setVisited((v) => Math.max(v, step + 1));
    setStep((s) => Math.min(4, s + 1));
  };
  const submit = async () => {
    for (let target = 1; target <= 3; target++) {
      if (!validate(target)) {
        setStep(target);
        return;
      }
    }
    const text = (value?: string | null) => value?.trim() || null;
    await onSubmit({
      ...form,
      subtitle: text(form.subtitle),
      mobileImageUrl: text(form.mobileImageUrl),
      startsAt: text(form.startsAt),
      endsAt: text(form.endsAt),
      primaryCtaLabel: text(form.primaryCtaLabel),
      primaryCtaType: form.primaryCtaType ?? null,
      primaryCtaValue: text(form.primaryCtaValue),
      secondaryCtaLabel: text(form.secondaryCtaLabel),
      secondaryCtaType: form.secondaryCtaType ?? null,
      secondaryCtaValue: text(form.secondaryCtaValue),
    });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex min-w-lg w-full flex-col gap-0 p-0 sm:max-w-lg ">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 text-left">
          <SheetTitle>
            {mode === "edit" ? "Edit promotion" : "Create promotion"}
          </SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Update this promotion's content, placement, actions, or schedule."
              : "Set up what customers will see and when the promotion should appear."}
          </SheetDescription>
        </SheetHeader>
        <ol
          className="flex shrink-0 items-center gap-1 px-6 pb-3"
          aria-label="Promotion steps">
          {steps.map((name, index) => {
            const number = index + 1;
            const done = number < step;
            return (
              <React.Fragment key={name}>
                <li>
                  <button
                    type="button"
                    disabled={number > visited}
                    onClick={() => number <= visited && setStep(number)}
                    aria-current={number === step ? "step" : undefined}
                    className="inline-flex size-7 items-center justify-center rounded-full border text-xs disabled:cursor-not-allowed disabled:opacity-60 data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
                    data-active={number === step}>
                    {done ? <Check className="size-3.5" /> : number}
                    <span className="sr-only">{name}</span>
                  </button>
                  <span className="ml-1 hidden text-xs sm:inline">{name}</span>
                </li>
                {number < 4 && (
                  <span className="h-px min-w-2 flex-1 bg-border" />
                )}
              </React.Fragment>
            );
          })}
        </ol>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            {step === 1 && (
              <section className="space-y-5">
                <StepTitle
                  title="Campaign"
                  description="Set the message and artwork customers will see."
                />
                <CampaignDetailsFields
                  form={form}
                  change={change}
                  errors={errors}
                />
                <PromotionArtworkFields
                  form={form}
                  change={change}
                  errors={errors}
                />
              </section>
            )}
            {step === 2 && (
              <section className="space-y-5">
                <StepTitle
                  title="Placement & actions"
                  description="Choose where the promotion appears and where its buttons lead."
                />
                <PromotionPlacementFields form={form} change={change} />
                {errors.placements && (
                  <p className="text-sm text-destructive">
                    {errors.placements}
                  </p>
                )}
                <PromotionActionFields
                  form={form}
                  change={change}
                  pickers={pickers}
                />
                {errors.primaryCtaValue && (
                  <p className="text-sm text-destructive">
                    {errors.primaryCtaValue}
                  </p>
                )}
              </section>
            )}
            {step === 3 && (
              <section className="space-y-5">
                <StepTitle
                  title="Publishing"
                  description="Control when this promotion is eligible to appear."
                />
                <PromotionPublishingFields form={form} change={change} />
                {errors.endsAt && (
                  <p className="text-sm text-destructive">{errors.endsAt}</p>
                )}
              </section>
            )}
            {step === 4 && (
              <section className="space-y-5">
                <StepTitle
                  title="Review"
                  description="Check the promotion before saving."
                />
                <div className="space-y-3 rounded-xl border p-4 text-sm">
                  <p>
                    <b>Campaign</b>
                    <br />
                    {form.title || "Untitled promotion"}
                  </p>
                  <p>
                    <b>Placement</b>
                    <br />
                    {form.placements.join(", ")}
                  </p>
                  <p>
                    <b>Publishing</b>
                    <br />
                    {form.status} · priority {form.priority}
                  </p>
                </div>
                <PromotionPreview form={form} />
              </section>
            )}
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-3 dark:text-white"
                onClick={() =>
                  step === 1 ? onOpenChange(false) : setStep(step - 1)
                }
                disabled={saving}>
                {step === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ChevronLeft />
                    Back
                  </>
                )}
              </Button>
              <Button
                type={step === 4 ? "submit" : "button"}
                className="rounded-full px-3 dark:text-white w-[140px]"
                onClick={step === 4 ? undefined : next}
                disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                {step === 4 ? (
                  saving ? (
                    initial ? (
                      "Saving promotion..."
                    ) : (
                      "Creating promotion..."
                    )
                  ) : initial ? (
                    "Save changes"
                  ) : (
                    "Create promotion"
                  )
                ) : (
                  <>
                    {"Continue"}
                    <ChevronRight />
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
function StepTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
