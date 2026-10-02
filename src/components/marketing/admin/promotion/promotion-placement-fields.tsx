import type { PromotionPlacement } from "@prisma/client";
import { Checkbox } from "@/components/ui/checkbox";
import type { Change, PromotionFormValue } from "./types";
export function PromotionPlacementFields({
  form,
  change,
}: {
  form: PromotionFormValue;
  change: Change;
}) {
  return (
    <div className="grid gap-2">
      {(["HOMEPAGE", "PRODUCTS", "SHOPS"] as PromotionPlacement[]).map(
        (placement) => (
          <label
            key={placement}
            className="flex gap-2 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={form.placements.includes(placement)}
              onCheckedChange={(checked) =>
                change(
                  "placements",
                  checked
                    ? [...form.placements, placement]
                    : form.placements.filter((item) => item !== placement),
                )
              }
            />
            {placement}
          </label>
        ),
      )}
    </div>
  );
}
