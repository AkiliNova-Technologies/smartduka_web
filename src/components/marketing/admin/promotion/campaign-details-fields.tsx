import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Change, PromotionFormValue } from "./types";
export function CampaignDetailsFields({
  form,
  change,
  errors = {},
}: {
  form: PromotionFormValue;
  change: Change;
  errors?: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Promotion title *</Label>
        <Input
          required
          aria-invalid={!!errors.title}
          value={form.title}
          onChange={(e) => change("title", e.target.value)}
          placeholder="Promotion title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-destructive">{errors.title}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Supporting text</Label>
        <Textarea
          value={form.subtitle ?? ""}
          onChange={(e) => change("subtitle", e.target.value)}
          placeholder="Supporting text"
        />
      </div>
    </div>
  );
}
