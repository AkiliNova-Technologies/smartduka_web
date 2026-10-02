import Image from "next/image";
import type { PromotionFormValue } from "./types";

export function PromotionPreview({ form }: { form: PromotionFormValue }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <p className="border-b px-4 py-2 text-sm font-medium">Live preview</p>
      <div className="relative min-h-44 overflow-hidden bg-muted p-6 text-white">
        {form.desktopImageUrl && <Image src={form.desktopImageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 32rem" className="object-cover" />}
        <div className="relative max-w-xs drop-shadow-sm">
          <p className="text-xl font-semibold">{form.title || "Promotion title"}</p>
          {form.subtitle && <p className="mt-2 text-sm text-white/90">{form.subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
