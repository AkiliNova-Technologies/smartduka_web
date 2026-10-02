import Link from "next/link";
import { MediaImage } from "@/components/marketplace/media-image";

export type MarketplaceCategoryCard = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
};
export function CategoryCard({
  category,
  variant = "default",
  className = "",
}: {
  category: MarketplaceCategoryCard;
  variant?: "default" | "compact" | "featured";
  className?: string;
}) {
  const ratio = variant === "featured" ? "aspect-[5/4]" : "aspect-[4/3]";
  const labelSize =
    variant === "featured" ? "text-base sm:text-lg" : "text-xs sm:text-base";
  return (
    <Link
      href={`/categories/${category.slug}`}
      className={`group relative block ${ratio} overflow-hidden rounded-xl border border-border/70 bg-muted outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none ${className}`}>
      <MediaImage
        src={category.image}
        fallback="/placeholders/category-image.svg"
        alt=""
        fill
        sizes={
          variant === "compact"
            ? "(max-width: 640px) 48vw, 186px"
            : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        }
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none"
        fallbackClassName="object-cover"
      />
      <span
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        aria-hidden="true"
      />
      <span
        className={`absolute inset-x-0 bottom-0 p-3 font-semibold text-center text-wrap leading-snug text-white ${labelSize} line-clamp-2`}>
        {category.name}
      </span>
    </Link>
  );
}
