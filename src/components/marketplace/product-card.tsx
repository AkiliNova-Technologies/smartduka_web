"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, ShoppingCart, SlidersHorizontal, Star } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useUserData } from "@/providers/UserDataProvider";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { MediaImage } from "@/components/marketplace/media-image";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/media";
import { getPublicProductAction } from "@/actions/product";

export type MarketplaceProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice?: number | null;
  inventoryCount?: number;
  image: string;
  vendorId: string;
  vendorName: string;
  category?: { id?: string; name: string; slug?: string } | null;
  categoryName?: string | null;
  subCategory?: { id?: string; name: string; slug?: string } | null;
  subCategoryName?: string | null;
  mostSpecificCategory?: { id: string; name: string; slug: string } | null;
  categoryPath?: { id: string; name: string; slug: string }[];
  createdAt?: string;
  isNewArrival?: boolean;
  priceFrom?: boolean;
  requiresVariantSelection?: boolean;
  isPurchasable?: boolean;
  rating?: number;
  reviews?: number;
};
export function ProductCard({ product }: { product: MarketplaceProduct }) {
  const { isWishlisted, toggleWishlist, addToCart } = useUserData();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<{
    variants: Array<{
      id: string;
      name: string;
      price: number;
      inventoryCount: number;
      options: Record<string, string>;
      isActive: boolean;
    }>;
  } | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const wishlisted = isWishlisted(product.id);
  const inventoryCount = product.inventoryCount ?? 0;
  const isOutOfStock = inventoryCount <= 0 || product.isPurchasable === false;
  const isLowStock = inventoryCount > 0 && inventoryCount <= 5;
  const isDeal = Boolean(
    product.compareAtPrice && product.compareAtPrice > product.basePrice,
  );
  const isNew = product.isNewArrival === true;
  const categoryName = product.categoryName ?? product.category?.name ?? null;
  const subCategoryName =
    product.subCategoryName ?? product.subCategory?.name ?? null;
  const promotionalBadge = isDeal ? "Deal" : isNew ? "New" : null;
  const secondaryMetadata = subCategoryName ?? categoryName;
  const openQuickAdd = async () => {
    setQuickAddOpen(true);
    setQuickAddLoading(true);
    const result = await getPublicProductAction(product.slug);
    if (result.success && result.data) {
      const variants = result.data.product.variants.filter(
        (variant) => variant.isActive,
      );
      setQuickAddProduct({ variants });
      setSelectedOptions({});
    }
    setQuickAddLoading(false);
  };
  const optionGroups =
    quickAddProduct?.variants.reduce<Record<string, string[]>>(
      (groups, variant) => {
        Object.entries(variant.options).forEach(([key, value]) => {
          if (!groups[key]?.includes(value)) (groups[key] ||= []).push(value);
        });
        return groups;
      },
      {},
    ) ?? {};
  const optionNames = Object.keys(optionGroups);
  const selectedVariant =
    optionNames.length > 0
      ? quickAddProduct?.variants.find((variant) =>
          optionNames.every(
            (name) => selectedOptions[name] === variant.options[name],
          ),
        )
      : undefined;
  const isOptionAvailable = (name: string, value: string) =>
    quickAddProduct?.variants.some(
      (variant) =>
        variant.inventoryCount > 0 &&
        variant.options[name] === value &&
        Object.entries(selectedOptions).every(
          ([selectedName, selectedValue]) =>
            selectedName === name ||
            !selectedValue ||
            variant.options[selectedName] === selectedValue,
        ),
    ) ?? false;
  const selectOption = (name: string, value: string) => {
    setSelectedOptions((current) => {
      const next = { ...current, [name]: value };
      for (const [otherName, otherValue] of Object.entries(next)) {
        if (
          otherName !== name &&
          !quickAddProduct?.variants.some(
            (variant) =>
              variant.inventoryCount > 0 &&
              variant.options[otherName] === otherValue &&
              Object.entries(next).every(
                ([selectedName, selectedValue]) =>
                  selectedName === otherName ||
                  variant.options[selectedName] === selectedValue,
              ),
          )
        ) {
          delete next[otherName];
        }
      }
      return next;
    });
  };
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow motion-safe:hover:shadow-md">
      <button
        type="button"
        aria-label={
          wishlisted
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        }
        onClick={() =>
          toggleWishlist({
            productId: product.id,
            name: product.name,
            slug: product.slug,
            brand: product.brand,
            image: product.image,
            price: product.basePrice,
            basePrice: product.basePrice,
            compareAtPrice: product.compareAtPrice ?? null,
            vendorId: product.vendorId,
            vendorName: product.vendorName,
            addedAt: new Date().toISOString(),
          })
        }
        className={cn(
          "absolute right-3 top-3 z-10 flex size-11 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-xs backdrop-blur transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          wishlisted && "border-primary bg-primary/10 text-primary",
        )}>
        <Heart className={cn("size-5", wishlisted && "fill-current")} />
      </button>
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <div className="relative m-2 aspect-square overflow-hidden rounded-xl bg-muted">
          <MediaImage
            src={product.image}
            fallback={PRODUCT_IMAGE_FALLBACK}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
            fallbackClassName="object-cover"
          />
          <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
            {(isOutOfStock || isLowStock) && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  isOutOfStock
                    ? "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
                )}>
                {isOutOfStock
                  ? "Out of stock"
                  : "Only " + inventoryCount + " left"}
              </span>
            )}
            {promotionalBadge && (
              <span className="rounded-full bg-primary bg-emerald-950 px-2 py-0.5 text-xs font-medium text-white dark:bg-primary dark:text-white">
                {promotionalBadge}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1 px-4 pt-2">
          <p
            className="truncate text-xs font-medium text-muted-foreground"
            title={secondaryMetadata ?? undefined}>
            {secondaryMetadata}
          </p>
          <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">
            {product.name}
          </h2>
          {product.reviews ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3 fill-amber-400 text-amber-400" />{product.rating?.toFixed(1)} ({product.reviews})</p> : <p className="text-xs text-muted-foreground">No reviews yet</p>}
        </div>
      </Link>
      <div className="mt-auto flex items-end justify-between gap-2 px-4 pb-4 pt-3">
        <div>
          {product.isPurchasable === false ? (
            <span className="text-sm font-medium text-muted-foreground">
              Unavailable
            </span>
          ) : (
            <>
              {product.priceFrom && (
                <span className="mb-0.5 block text-xs text-muted-foreground">
                  From
                </span>
              )}
              <PriceDisplay
                price={product.basePrice}
                compareAtPrice={product.compareAtPrice}
              />
            </>
          )}
        </div>
        {isOutOfStock ? (
          <button
            type="button"
            disabled aria-label={`${product.name} is out of stock`}
            className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-3 text-xs font-medium text-muted-foreground">
            Out of Stock
          </button>
        ) : product.requiresVariantSelection ? (
          <Dialog.Root open={quickAddOpen} onOpenChange={setQuickAddOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                onClick={() => void openQuickAdd()}
                aria-label={`Choose options for ${product.name}`}
                className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <SlidersHorizontal className="size-4" /> Choose Options
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-lg">
                <Dialog.Title className="text-base font-semibold">
                  Choose options
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  Select an available combination for {product.name}.
                </Dialog.Description>
                {quickAddLoading ? (
                  <div
                    className="mt-5 space-y-4"
                    aria-busy="true"
                    aria-label="Loading product options">
                    {Array.from({ length: 2 }, (_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>
                    ))}
                    <Skeleton className="h-10 w-full rounded-full" />
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {Object.entries(optionGroups).map(([name, values]) => (
                      <div key={name} className="space-y-2">
                        <p className="text-sm font-medium">{name}</p>
                        <Select
                          value={selectedOptions[name] ?? ""}
                          onValueChange={(value) => selectOption(name, value)}>
                          <SelectTrigger aria-label={`Choose ${name}`} className="min-h-10 w-full">
                            <SelectValue placeholder={`Choose ${name}`} />
                          </SelectTrigger>
                          <SelectContent className="p-2">
                            {values.map((value) => (
                              <SelectItem
                                key={value}
                                value={value}
                                disabled={!isOptionAvailable(name, value)}>
                                {value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {selectedVariant && selectedVariant.inventoryCount <= 0 && (
                      <p className="text-sm text-destructive">
                        This combination is out of stock.
                      </p>
                    )}
                    {selectedVariant && selectedVariant.inventoryCount > 0 && (
                      <p className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{selectedVariant.inventoryCount} in stock</span>
                        <PriceDisplay price={selectedVariant.price} />
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={
                        !selectedVariant || selectedVariant.inventoryCount <= 0
                      }
                      onClick={() => {
                        if (!selectedVariant) return;
                        addToCart({
                          productId: product.id,
                          name: product.name,
                          image: product.image,
                          price: selectedVariant.price,
                          vendorId: product.vendorId,
                          vendorName: product.vendorName,
                          variantId: selectedVariant.id,
                          variantName: selectedVariant.name,
                          variantOptions: selectedVariant.options,
                          quantity: 1,
                        });
                        setQuickAddOpen(false);
                      }}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground">
                      <ShoppingCart className="size-4" />
                    </button>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        ) : (
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            disabled={isOutOfStock}
            onClick={() =>
              addToCart({
                productId: product.id,
                name: product.name,
                image: product.image,
                price: product.basePrice,
                vendorId: product.vendorId,
                vendorName: product.vendorName,
                quantity: 1,
              })
            }
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}>
            <ShoppingCart className="size-4" /> Add to Cart
          </button>
        )}
      </div>
    </article>
  );
}
