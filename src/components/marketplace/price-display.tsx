import { cn } from "@/lib/utils";

export function formatUGX(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PriceDisplay({
  price,
  compareAtPrice,
  className,
  size = "default",
}: {
  price: number;
  compareAtPrice?: number | null;
  className?: string;
  size?: "default" | "large";
}) {
  const hasDiscount = Boolean(compareAtPrice && compareAtPrice > price);
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-1",
        className,
      )}>
        {hasDiscount && (
        <>
          <span className="text-xs text-muted-foreground line-through">
            {formatUGX(compareAtPrice as number)}
          </span>
        </>
      )}
      <span
        className={cn(
          "font-semibold tracking-tight text-foreground",
          size === "large" ? "text-2xl" : "text-base",
        )}>
        {formatUGX(price)}
      </span>

    </div>
  );
}
