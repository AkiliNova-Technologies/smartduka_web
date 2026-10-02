import { cn } from "@/lib/utils";

export function formatUGX(amount: number) { return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount); }

export function PriceDisplay({ price, compareAtPrice, className, size = "default" }: { price: number; compareAtPrice?: number | null; className?: string; size?: "default" | "large" }) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);
  const discount = hasDiscount ? Math.round((((compareAtPrice as number) - price) / (compareAtPrice as number)) * 100) : null;
  return <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}><span className={cn("font-semibold tracking-tight text-foreground", size === "large" ? "text-2xl" : "text-base")}>{formatUGX(price)}</span>{hasDiscount && <><span className="text-xs text-muted-foreground line-through">{formatUGX(compareAtPrice as number)}</span><span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Save {discount}%</span></>}</div>;
}
