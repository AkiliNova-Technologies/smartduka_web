"use client";

import { useEffect, useRef, useState } from "react";
import { MediaImage } from "@/components/marketplace/media-image";
import { PRODUCT_IMAGE_FALLBACK, SHOP_LOGO_FALLBACK } from "@/lib/media";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  Dot,
  Heart,
  Minus,
  Plus,
  Star,
} from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { PriceDisplay } from "@/components/marketplace/price-display";
import {
  ProductCard,
  type MarketplaceProduct,
} from "@/components/marketplace/product-card";
import { useUserData } from "@/providers/UserDataProvider";
import { ReviewEntryPoint } from "@/components/reviews/ReviewEntryPoint";

interface ProductData {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  inventoryCount: number;
  sku: string | null;
  sizes: string[];
  colors: string[];
  specs: { name: string; value: string }[];
  images: { id: string; url: string; isFeatured: boolean }[];
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
    fulfillmentMethods: ("DELIVERY" | "PICKUP")[];
    deliveryFee: number | null;
    deliveryEstimate: string | null;
    pickupLocation: string | null;
    returnWindowDays: number | null;
    returnPolicy: string | null;
    returnInstructions: string | null;
    acceptsExchanges: boolean;
    exchangePolicy: string | null;
  } | null;
  rating: number;
  reviewCount: number;
  reviews: {
    id: string;
    user: string;
    avatarUrl: string | null;
    rating: number;
    date: string;
    comment: string;
    verifiedPurchase: boolean;
    title: string | null;
    imageUrls: string[];
    variantName: string | null;
    vendorReply: string | null;
  }[];
  availability: string;
  hasVariants: boolean;
  variants: {
    id: string;
    sku: string;
    name: string;
    price: number;
    inventoryCount: number;
    options: Record<string, string>;
    isActive: boolean;
  }[];
}
export function ProductDetailContent({
  product,
  relatedProducts,
}: {
  product: ProductData;
  relatedProducts: MarketplaceProduct[];
}) {
  const { addToCart, isWishlisted, toggleWishlist, trackProductView } =
    useUserData();
  const trackedProductId = useRef<string | null>(null);
  useEffect(() => {
    // This runs only after a valid public detail has rendered. The provider keeps
    // the UI responsive and treats the persisted write as non-critical.
    if (trackedProductId.current !== product.id) {
      trackedProductId.current = product.id;
      trackProductView(product.id);
    }
  }, [product.id, trackProductView]);
  const realImages = product.images.filter((image) => image.url);
  const hasRealImages = realImages.length > 0;
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  const initiallyAvailableVariant =
    activeVariants.find((variant) => variant.inventoryCount > 0) ??
    activeVariants[0];
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >(initiallyAvailableVariant?.options ?? {});
  const selectedVariant = activeVariants.find((variant) =>
    Object.entries(variant.options).every(
      ([key, value]) => selectedOptions[key] === value,
    ),
  );
  // The server exposes whether variant records exist even when all are retired.
  // Such a product must never fall back to parent-product purchase behavior.
  const variantProduct = product.hasVariants;
  const availableStock =
    selectedVariant?.inventoryCount ??
    (variantProduct ? 0 : product.inventoryCount);
  const displayedPrice = selectedVariant?.price ?? product.basePrice;
  const outOfStock = availableStock <= 0;
  const lowStock = availableStock > 0 && availableStock <= 5;
  const optionGroups = activeVariants.reduce<Record<string, string[]>>(
    (groups, variant) => {
      Object.entries(variant.options).forEach(([key, value]) => {
        if (!groups[key]?.includes(value)) (groups[key] ||= []).push(value);
      });
      return groups;
    },
    {},
  );
  const featuredImage =
    realImages.find((image) => image.isFeatured)?.url ||
    realImages[0]?.url ||
    PRODUCT_IMAGE_FALLBACK;
  const imageUrl = realImages[activeImage]?.url || featuredImage;
  const wishlisted = isWishlisted(product.id);

  const addItem = () => {
    if (outOfStock || (variantProduct && !selectedVariant)) return;
    addToCart({
      productId: product.id,
      name: product.name,
      image: featuredImage,
      price: displayedPrice,
      quantity,
      vendorId: product.vendor?.id || "",
      vendorName: product.vendor?.storeName || "Marketplace seller",
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      variantOptions: selectedVariant?.options ?? null,
    });
  };
  const toggleProductWishlist = () =>
    toggleWishlist({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      image: featuredImage,
      price: product.basePrice,
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      vendorId: product.vendor?.id ?? "",
      vendorName: product.vendor?.storeName ?? "Marketplace seller",
      addedAt: new Date().toISOString(),
    });

  return (
    <main className="mx-auto max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:pb-12 lg:pt-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <ChevronLeft aria-hidden="true" className="size-4" /> Products
        </Link>
        {product.category && (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={`/categories/${product.category.slug}`}
              className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>
      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,.88fr)] lg:gap-12">
        <section
          aria-label="Product media"
          className={cn(
            "min-w-0",
            !hasRealImages && "lg:flex lg:justify-center",
          )}>
          {hasRealImages ? (
            <>
              <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                <MediaImage
                  src={imageUrl}
                  fallback={PRODUCT_IMAGE_FALLBACK}
                  alt={`${product.name}, image ${activeImage + 1} of ${realImages.length}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  className="object-cover"
                  fallbackClassName="object-cover"
                />
              </div>
              {realImages.length > 1 && (
                <div
                  className="mt-3 flex gap-2 overflow-x-auto pb-1"
                  role="list"
                  aria-label="Product images">
                  {realImages.map((image, index) => (
                    <button
                      key={image.id}
                      aria-label={`View product image ${index + 1}`}
                      aria-current={activeImage === index ? "true" : undefined}
                      onClick={() => setActiveImage(index)}
                      className={cn(
                        "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeImage === index
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/40",
                      )}
                      role="listitem">
                      <MediaImage
                        src={image.url}
                        fallback={PRODUCT_IMAGE_FALLBACK}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        fallbackClassName="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex relative aspect-square w-full max-w-[460px] items-center justify-center rounded-xl border bg-zinc-50 p-10 dark:bg-zinc-900/50 overflow-hidden">
              <MediaImage
                src={PRODUCT_IMAGE_FALLBACK}
                fallback={PRODUCT_IMAGE_FALLBACK}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="object-cover opacity-75"
                fallbackClassName="object-cover"
              />
            </div>
          )}
        </section>
        <section className="min-w-0">
          <h1 className="max-w-2xl text-[clamp(1.5rem,2.2vw,2rem)] font-semibold leading-tight tracking-tight text-foreground">
            {product.name}
          </h1>
          {(product.category || product.subCategory) && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
              {product.category && (
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {product.category.name}
                </Link>
              )}
              {product.category && product.subCategory && (
                <span aria-hidden="true">
                  <Dot className="size-5" />
                </span>
              )}
              {product.subCategory && (
                <Link
                  href={`/categories/${product.subCategory.slug}`}
                  className="rounded-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {product.subCategory.name}
                </Link>
              )}
            </div>
          )}
          {product.reviewCount > 0 && (
            <div
              className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"
              aria-label={`${product.rating.toFixed(1)} out of 5 stars from ${product.reviewCount} reviews`}>
              <Star
                aria-hidden="true"
                className="size-4 fill-amber-400 text-amber-400"
              />
              <span className="font-medium text-foreground">
                {product.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">
                ({product.reviewCount} review
                {product.reviewCount === 1 ? "" : "s"})
              </span>
            </div>
          )}
          <div className="mt-5 flex items-end gap-3">
            {variantProduct && !selectedVariant ? (
              <span className="text-lg font-semibold text-muted-foreground">
                No eligible variant
              </span>
            ) : (
              <PriceDisplay
                price={displayedPrice}
                compareAtPrice={product.compareAtPrice}
                size="large"
              />
            )}
          </div>
          <p
            aria-live="polite"
            className={cn(
              "mt-3 text-sm font-medium",
              outOfStock
                ? "text-muted-foreground"
                : lowStock
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-700 dark:text-emerald-400",
            )}>
            {outOfStock ? "Out of stock" : lowStock ? "Low stock" : "In stock"}
          </p>
          {(variantProduct ||
            product.sizes.length > 0 ||
            product.colors.length > 0) && (
            <div className="mt-6 space-y-4 border-t pt-5">
              {variantProduct ? (
                Object.entries(optionGroups).map(([group, values]) => (
                  <fieldset key={group}>
                    <legend className="text-sm font-medium">{group}</legend>
                    <div
                      className="mt-2 flex flex-wrap gap-2"
                      role="group"
                      aria-label={`Select ${group}`}>
                      {values.map((value) => {
                        const possible = activeVariants.some(
                          (variant) =>
                            variant.inventoryCount > 0 &&
                            variant.options[group] === value &&
                            Object.entries(selectedOptions).every(
                              ([key, selected]) =>
                                key === group ||
                                variant.options[key] === selected,
                            ),
                        );
                        return (
                          <button
                            key={value}
                            disabled={!possible}
                            aria-pressed={selectedOptions[group] === value}
                            onClick={() =>
                              setSelectedOptions((current) => ({
                                ...current,
                                [group]: value,
                              }))
                            }
                            className={cn(
                              "min-h-10 min-w-10 rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                              selectedOptions[group] === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-40",
                            )}>
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))
              ) : (
                <>
                  {product.sizes.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sizes: {product.sizes.join(", ")}
                    </p>
                  )}
                  {product.colors.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Colours: {product.colors.join(", ")}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <div className="mt-6 border-t pt-5">
            {outOfStock ? (
              <div className="flex gap-3">
                <button
                  disabled
                  aria-disabled="true"
                  className="h-11 flex-1 rounded-lg bg-zinc-200 px-4 text-sm font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Out of stock
                </button>
                <WishlistButton
                  active={wishlisted}
                  onClick={toggleProductWishlist}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <div
                    role="group"
                    aria-label="Quantity"
                    className="flex h-11 items-center rounded-full border">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQuantity((value) => Math.max(1, value - 1))
                      }
                      disabled={quantity <= 1}
                      className="grid size-11 place-items-center rounded-l-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <output
                      aria-live="polite"
                      className="w-8 text-center text-sm font-medium">
                      {quantity}
                    </output>
                    <button
                      aria-label="Increase quantity"
                      onClick={() =>
                        setQuantity((value) =>
                          Math.min(availableStock, value + 1),
                        )
                      }
                      disabled={quantity >= availableStock}
                      className="grid size-11 place-items-center rounded-r-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={addItem}
                    disabled={
                      outOfStock || (variantProduct && !selectedVariant)
                    }
                    className="flex h-11 min-w-36 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {outOfStock
                      ? "Out of stock"
                      : variantProduct && !selectedVariant
                        ? "Select options"
                        : "Add to cart"}
                  </button>
                  <WishlistButton
                    active={wishlisted}
                    onClick={toggleProductWishlist}
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-6 space-y-3 border-t pt-5 text-sm">
            {product.vendor && (
              <div className="flex items-center gap-3 rounded-full border bg-card p-3">
                <div className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  <MediaImage
                    src={product.vendor.logoUrl}
                    fallback={SHOP_LOGO_FALLBACK}
                    alt={`${product.vendor.storeName} logo`}
                    fill
                    sizes="40px"
                    className="object-cover rounded-full"
                    fallbackClassName="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Sold by</p>
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">
                      {product.vendor.storeName}
                    </p>
                    {product.vendor.isVerified && (
                      <IconRosetteDiscountCheckFilled
                        aria-label="Verified shop"
                        className="size-4 shrink-0 text-blue-500"
                      />
                    )}
                  </div>
                </div>
                <Link
                  href={`/shops/${product.vendor.slug}`}
                  aria-label={`Visit ${product.vendor.storeName}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
      <div className="mt-10 grid gap-8 border-t pt-8 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <section>
          <h2 className="text-xl font-semibold">About this product</h2>
          <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {product.description ||
              "No description has been provided for this product."}
          </p>
          {(product.brand || product.sku || product.specs.length > 0) && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold">Product details</h2>
              <dl className="mt-3 divide-y border-y text-sm">
                {product.brand && (
                  <Detail label="Brand" value={product.brand} />
                )}
                {product.sku && <Detail label="SKU" value={product.sku} />}
                {product.specs.map((spec) => (
                  <Detail
                    key={spec.name}
                    label={spec.name}
                    value={spec.value}
                  />
                ))}
              </dl>
            </div>
          )}
          <section className="mt-8" aria-labelledby="reviews-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="reviews-title" className="text-xl font-semibold">
                Customer reviews
              </h2>
              <ReviewEntryPoint
                kind="product"
                resourceId={product.id}
                label={product.name}
                image={featuredImage}
                showEligibilityMessage={false}
              />
            </div>
            {product.reviews.length ? (
              <div className="mt-4 space-y-4 rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3 border-b pb-4">
                  <span className="text-3xl font-semibold">
                    {product.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="size-4 fill-current" />{" "}
                    {product.reviewCount}{" "}
                    {product.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </div>
                {product.reviews.slice(0, 3).map((review) => (
                  <article
                    key={review.id}
                    className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-medium">{review.user}</span>
                      <span
                        className="flex items-center gap-0.5 text-amber-500"
                        aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: review.rating }).map(
                          (_, index) => (
                            <Star
                              key={index}
                              aria-hidden="true"
                              className="size-3 fill-current"
                            />
                          ),
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.date).toLocaleDateString("en-UG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {review.title ? (
                      <p className="mt-2 text-sm font-medium">{review.title}</p>
                    ) : null}
                    {review.comment ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                    {review.variantName ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Purchased: {review.variantName}
                      </p>
                    ) : null}
                    {review.imageUrls.length ? (
                      <div className="mt-2 flex gap-2">
                        {review.imageUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="relative size-14 overflow-hidden rounded border">
                            <MediaImage
                              src={url}
                              fallback={PRODUCT_IMAGE_FALLBACK}
                              alt="Customer review photo"
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {review.verifiedPurchase ? (
                      <span className="mt-2 inline-block text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Verified purchase
                      </span>
                    ) : null}
                    {review.vendorReply ? (
                      <p className="mt-2 rounded-lg bg-muted p-2 text-sm">
                        <span className="font-medium">Shop reply: </span>
                        {review.vendorReply}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-5 py-6 text-center">
                <MediaImage
                  src="/illustrations/empty-notifications.svg"
                  fallback="/illustrations/empty-products.svg"
                  alt=""
                  width={112}
                  height={88}
                  className="h-20 w-24 object-contain opacity-80"
                />
                <h3 className="mt-3 font-semibold">No reviews yet</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                  Be the first verified customer to share your experience with
                  this product.
                </p>
              </div>
            )}
          </section>
        </section>
        <DeliveryReturnsCard vendor={product.vendor} />
      </div>
      <section className="mt-10 border-t pt-8">
        <h2 className="text-xl font-semibold">Related products</h2>
        {relatedProducts.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No related products are available right now.
          </p>
        )}
      </section>
      {!outOfStock && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <PriceDisplay
              price={displayedPrice}
              compareAtPrice={product.compareAtPrice}
            />
            <button
              onClick={addItem}
              disabled={variantProduct && !selectedVariant}
              className="ml-auto h-11 shrink-0 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {variantProduct && !selectedVariant
                ? "Select options"
                : "Add to cart"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
type FulfillmentVendor = ProductData["vendor"];

function DeliveryReturnsCard({ vendor }: { vendor: FulfillmentVendor }) {
  if (!vendor) return null;
  const offersDelivery = vendor.fulfillmentMethods.includes("DELIVERY");
  const offersPickup = vendor.fulfillmentMethods.includes("PICKUP");
  const hasReturns =
    vendor.returnWindowDays !== null || Boolean(vendor.returnPolicy);
  if (
    !offersDelivery &&
    !offersPickup &&
    !hasReturns &&
    !vendor.acceptsExchanges
  )
    return null;

  const deliveryFee =
    vendor.deliveryFee !== null
      ? new Intl.NumberFormat("en-UG", {
          style: "currency",
          currency: "UGX",
          maximumFractionDigits: 0,
        }).format(vendor.deliveryFee)
      : null;

  return (
    <aside
      className="h-fit min-w-md w-full rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
      aria-labelledby="delivery-returns-title">
      <h2
        id="delivery-returns-title"
        className="text-lg font-semibold tracking-tight">
        Delivery &amp; Returns
      </h2>
      <ul className="mt-5 space-y-4 text-sm">
        {offersDelivery ? (
          <PolicyRow
            title="Delivery available"
            description={
              [vendor.deliveryEstimate, deliveryFee]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
        ) : null}
        {offersPickup ? (
          <PolicyRow
            title="Pickup available"
            description={
              [vendor.storeName, vendor.pickupLocation]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          />
        ) : null}
        {hasReturns ? (
          <PolicyRow
            title={
              vendor.returnWindowDays !== null
                ? `${vendor.returnWindowDays}-day returns`
                : "Returns accepted"
            }
            description={
              vendor.returnWindowDays !== null
                ? `Return eligible items within ${vendor.returnWindowDays} days of delivery or pickup.`
                : "Review the full policy for return eligibility."
            }
          />
        ) : null}
        {vendor.acceptsExchanges ? (
          <PolicyRow
            title="Exchanges available"
            description={
              vendor.exchangePolicy
                ? "Exchange terms are available in the full policy."
                : undefined
            }
          />
        ) : null}
      </ul>
      {vendor.returnPolicy ||
      vendor.returnInstructions ||
      vendor.exchangePolicy ||
      offersDelivery ||
      offersPickup ? (
        <details className="group mt-6 border-t border-border/70 pt-4 text-sm">
          <summary className="flex h-11 cursor-pointer list-none items-center justify-between rounded-lg border border-border bg-background px-4 font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Review delivery &amp; return policy</span>
            <ArrowRight
              className="size-4 transition-transform group-open:translate-x-0.5"
              aria-hidden="true"
            />
          </summary>
          <div className="mt-4 space-y-3 leading-6 text-muted-foreground">
            {offersDelivery && vendor.deliveryEstimate ? (
              <p>
                <span className="font-medium text-foreground">Delivery: </span>
                {vendor.deliveryEstimate}
                {deliveryFee ? ` · ${deliveryFee}` : ""}
              </p>
            ) : null}
            {offersPickup && vendor.pickupLocation ? (
              <p>
                <span className="font-medium text-foreground">Pickup: </span>
                {vendor.pickupLocation}
              </p>
            ) : null}
            {vendor.returnPolicy ? (
              <p>
                <span className="font-medium text-foreground">Returns: </span>
                {vendor.returnPolicy}
              </p>
            ) : null}
            {vendor.returnInstructions ? (
              <p>
                <span className="font-medium text-foreground">
                  How to return:{" "}
                </span>
                {vendor.returnInstructions}
              </p>
            ) : null}
            {vendor.acceptsExchanges && vendor.exchangePolicy ? (
              <p>
                <span className="font-medium text-foreground">Exchanges: </span>
                {vendor.exchangePolicy}
              </p>
            ) : null}
          </div>
        </details>
      ) : null}
    </aside>
  );
}

function PolicyRow({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="pt-0.5 text-primary" aria-hidden="true">
        •
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </li>
  );
}
function WishlistButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-full border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-primary bg-primary/10 text-primary",
      )}>
      <Heart className={cn("size-5", active && "fill-current")} />
    </button>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
