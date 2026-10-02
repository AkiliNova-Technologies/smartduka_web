import { ImageUpload } from "@/components/image-upload";
import { Label } from "@/components/ui/label";
import type { Change, PromotionFormValue } from "./types";
export function PromotionArtworkFields({
  form,
  change,
  errors = {},
}: {
  form: PromotionFormValue;
  change: Change;
  errors?: Record<string, string>;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Desktop banner *</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Used on wider screens.
        </p>
        <ImageUpload
          value={form.desktopImageUrl}
          onChange={(url) => change("desktopImageUrl", url)}
          folder="marketing"
        />
        {errors.desktopImageUrl && (
          <p className="mt-1 text-sm text-destructive">
            {errors.desktopImageUrl}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Mobile banner</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Optional. Used on smaller screens when provided.
        </p>
        <ImageUpload
          value={form.mobileImageUrl ?? ""}
          onChange={(url) => change("mobileImageUrl", url)}
          folder="marketing"
        />
      </div>
    </div>
  );
}
