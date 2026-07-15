"use client";

import { useState } from "react";
import {
  Star,
  ShoppingBag,
  Heart,
  ChevronRight,
  ShoppingCart,
  ChevronLeft,
  User,
  Calendar,
  PenTool,
  Package,
} from "lucide-react";
import { IconRosetteDiscountCheckFilled } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ───

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
  status: string;
  sizes: string[];
  colors: string[];
  specs: { name: string; value: string }[];
  tags: string[];
  images: { id: string; url: string; isFeatured: boolean }[];
  category: { id: string; name: string; slug: string } | null;
  subCategory: { id: string; name: string; slug: string } | null;
  vendor: {
    id: string;
    storeName: string;
    slug: string;
    logoUrl: string | null;
    isVerified: boolean;
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
  }[];
  createdAt: string;
  availability: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  image: string;
  vendorId: string;
  rating: number;
  reviews: number;
}

interface ProductDetailContentProps {
  product: ProductData;
  relatedProducts: RelatedProduct[];
}

export function ProductDetailContent({
  product,
  relatedProducts,
}: ProductDetailContentProps) {
  const router = useRouter();

  const [reviewsList, setReviewsList] = useState(product.reviews);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState("");

  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "M");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const averageRating =
    reviewsList.length > 0
      ? (
          reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length
        ).toFixed(1)
      : "0.0";

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim()) {
      toast.error("Please fill in your name and review.");
      return;
    }

    const review = {
      id: `rev-${Date.now()}`,
      user: newName.trim(),
      avatarUrl: null,
      rating: newRating,
      date: new Date().toISOString().split("T")[0],
      comment: newComment.trim(),
      verifiedPurchase: false,
    };

    setReviewsList([review, ...reviewsList]);
    setNewName("");
    setNewComment("");
    setNewRating(5);
    toast.success("Thank you! Your review has been published.");
  };

  const imageStream =
    product.images.length > 0
      ? product.images.map((img) => img.url)
      : [product.images[0]?.url || "/placeholder-product.png"];

  const discountPercentage = product.compareAtPrice
    ? Math.round(
        ((product.compareAtPrice - product.basePrice) /
          product.compareAtPrice) *
          100,
      )
    : 0;

  const isOutOfStock = product.inventoryCount === 0;
  const isLowStock = product.inventoryCount > 0 && product.inventoryCount <= 5;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* 1. BREADCRUMB HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
              <Link
                href="/products"
                className="hover:text-primary transition-colors">
                Products
              </Link>
              {product.category && (
                <>
                  <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 shrink-0" />
                  <Link
                    href={`/categories/${product.category.slug}`}
                    className="hover:text-primary transition-colors truncate max-w-[100px]">
                    {product.category.name}
                  </Link>
                </>
              )}
            </nav>

            <h1 className="text-xl font-medium tracking-tight text-foreground truncate mt-0.5">
              {product.name}
            </h1>

            {/* <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {product.vendor && (
                <>
                  By{" "}
                  <Link href={`/brands/${product.vendor.slug}`} className="hover:text-primary transition-colors font-bold">
                    {product.vendor.storeName}
                  </Link>
                  {" · "}
                </>
              )}
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {product.rating} ({product.reviewCount} reviews)
              </span>
            </p> */}
          </div>
        </div>
      </div>

      {/* 2. PRODUCT HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* LEFT: Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square w-full bg-muted/40 rounded-[24px] border border-border/60 overflow-hidden relative group shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none">
            {discountPercentage > 0 && (
              <span className="absolute top-4 left-4 z-10 bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs">
                -{discountPercentage}% OFF
              </span>
            )}
            <Image
              src={imageStream[activeImgIndex] || imageStream[0]}
              alt={product.name}
              fill
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {imageStream.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {imageStream.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIndex(i)}
                  className={cn(
                    "aspect-square bg-muted/30 border relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200",
                    activeImgIndex === i
                      ? "border-primary ring-2 ring-primary/10 scale-[0.96]"
                      : "border-border/60 hover:border-zinc-400 dark:hover:border-zinc-600",
                  )}>
                  <Image
                    src={imgUrl}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Details */}
        <div className="lg:col-span-6 space-y-5">
          {/* Product Identity — Brand + Name */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug">
              {product.name}
            </h2>
          </div>

          {/* Rating + SKU row */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-md">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-bold">{product.rating}</span>
            </div>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="text-zinc-400 dark:text-zinc-500">
              {product.reviewCount} review{product.reviewCount !== 1 ? "s" : ""}
            </span>
            {product.sku && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  SKU: {product.sku}
                </span>
              </>
            )}
          </div>

          {/* Short Description — first 2-3 lines from the product description */}
          {product.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
              {product.description}
            </p>
          )}

          {/* Key Highlights — specs summary */}
          {product.specs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.specs.slice(0, 2).map((spec) => (
                <span
                  key={spec.name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted/50 border border-border/40 rounded-full text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {spec.name}:
                  </span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-semibold truncate max-w-[120px]">
                    {spec.value}
                  </span>
                </span>
              ))}
              {product.specs.length > 3 && (
                <span className="inline-flex items-center px-2.5 py-1 bg-muted/30 border border-border/30 rounded-full text-[10px] text-muted-foreground">
                  +{product.specs.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="border-t border-border/60 pt-4 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              UGX {product.basePrice.toLocaleString()}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 line-through">
                UGX {product.compareAtPrice.toLocaleString()}
              </span>
            )}
            {product.compareAtPrice &&
              product.compareAtPrice > product.basePrice && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {Math.round(
                    ((product.compareAtPrice - product.basePrice) /
                      product.compareAtPrice) *
                      100,
                  )}
                  % OFF
                </span>
              )}
          </div>

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Select Size
              </span>
              <div className="flex gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "w-10 h-10 text-xs font-bold rounded-full border transition-all active:scale-95 cursor-pointer",
                      selectedSize === size
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                        : "border-border bg-card text-zinc-700 dark:text-zinc-300 hover:bg-muted",
                    )}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {product.colors.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Colors
              </span>
              <div className="flex gap-1.5">
                {product.colors.map((color) => (
                  <span
                    key={color}
                    className="px-2.5 py-1 bg-muted/50 border border-border/40 rounded-full text-[10px] font-medium text-foreground">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-1">
            <p
              className={cn(
                "text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wide",
                isOutOfStock
                  ? "text-rose-500"
                  : isLowStock
                    ? "text-amber-500"
                    : "text-emerald-600 dark:text-emerald-400",
              )}>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  isOutOfStock
                    ? "bg-rose-500"
                    : isLowStock
                      ? "bg-amber-500"
                      : "bg-emerald-500",
                )}
              />
              {product.availability}
            </p>
            <div className="flex gap-3">
              <div className="flex items-center border border-border bg-card rounded-full overflow-hidden h-11 shrink-0">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-full text-sm font-semibold hover:bg-muted transition-colors cursor-pointer">
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold text-foreground">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-full text-sm font-semibold hover:bg-muted transition-colors cursor-pointer">
                  +
                </button>
              </div>

              <button
                disabled={isOutOfStock}
                className="flex-1 bg-primary hover:bg-emerald-500 text-primary-foreground font-bold text-xs tracking-wider uppercase rounded-full flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50">
                <ShoppingBag className="w-4 h-4" />
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>

              <button className="w-11 h-11 border border-border hover:bg-muted rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Store card */}
          {product.vendor && (
            <Link
              href={`/brands/${product.vendor.slug}`}
              className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:shadow-none hover:border-primary/30 transition-all group/store">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-border/30 relative overflow-hidden shrink-0">
                  {product.vendor.logoUrl ? (
                    <Image
                      src={product.vendor.logoUrl}
                      alt={product.vendor.storeName}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <Package className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                      {product.vendor.storeName}
                    </h4>
                    {product.vendor.isVerified && (
                      <IconRosetteDiscountCheckFilled className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    View full store
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover/store:text-primary transition-colors" />
            </Link>
          )}
        </div>
      </div>

      {/* 3. TABS */}
      <div className="border-t border-border/60 pt-8 animate-in fade-in duration-200">
        <div className="flex gap-6 border-b border-border/60 pb-3 select-none">
          {["description", "specifications", "reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-xs font-bold uppercase tracking-widest relative pb-3 transition-colors capitalize cursor-pointer",
                activeTab === tab
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}>
              {tab === "reviews" ? `Reviews (${reviewsList.length})` : tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="py-6 max-w-3xl">
          {activeTab === "description" && (
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              {product.description || "No description provided."}
            </p>
          )}

          {activeTab === "specifications" && (
            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
              <div className="divide-y divide-border/40">
                {product.specs.length > 0 ? (
                  product.specs.map((spec, index) => (
                    <div
                      key={spec.name}
                      className={cn(
                        "grid grid-cols-1 sm:grid-cols-3 p-4 items-baseline gap-2 sm:gap-6",
                        index % 2 === 1 && "bg-muted/20",
                      )}>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        {spec.name}
                      </span>
                      <span className="sm:col-span-2 text-xs font-bold text-foreground tracking-tight">
                        {spec.value}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No specifications provided.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-card border border-border/60 rounded-2xl p-5 items-center">
                <div className="text-center sm:border-r border-border/40 py-2 space-y-1">
                  <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
                    {averageRating}
                  </h3>
                  <div className="flex items-center justify-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-3.5 h-3.5",
                          i < Math.round(Number(averageRating))
                            ? "fill-current"
                            : "opacity-30",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                    Average Rating
                  </p>
                </div>

                <div className="sm:col-span-2 space-y-2 px-2">
                  {[5, 4, 3, 2, 1].map((score) => {
                    const count = reviewsList.filter(
                      (r) => r.rating === score,
                    ).length;
                    const ratio =
                      reviewsList.length === 0
                        ? 0
                        : (count / reviewsList.length) * 100;
                    return (
                      <div
                        key={score}
                        className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                        <span className="w-3 text-right">{score}★</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/80 rounded-full transition-all duration-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <span className="w-4 text-right opacity-60">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                <div className="lg:col-span-3 space-y-4 max-h-[480px] overflow-y-auto pr-2">
                  {reviewsList.map((review) => (
                    <div
                      key={review.id}
                      className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-muted border border-border/40 rounded-full flex items-center justify-center text-muted-foreground overflow-hidden">
                            {review.avatarUrl ? (
                              <Image
                                src={review.avatarUrl}
                                alt={review.user}
                                width={28}
                                height={28}
                                className="object-cover"
                              />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-foreground text-xs">
                              {review.user}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {review.date}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3 h-3",
                                  i < review.rating
                                    ? "fill-current"
                                    : "opacity-20",
                                )}
                              />
                            ))}
                          </div>
                          {review.verifiedPurchase && (
                            <span className="text-[9px] text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-2 bg-muted/30 border border-border/60 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-muted-foreground" />
                    Share Your Feedback
                  </h4>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Your name"
                      className="h-9 border-border/60 rounded-xl text-xs font-medium bg-background"
                    />
                    <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-xl h-9 px-3">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setNewRating(score)}>
                          <Star
                            className={cn(
                              "w-4 h-4 transition-transform active:scale-90",
                              score <= newRating
                                ? "text-amber-500 fill-current"
                                : "opacity-30",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your experience..."
                      className="w-full border border-border/60 rounded-xl p-3 text-xs font-medium bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none"
                    />
                    <button
                      type="submit"
                      className="w-full h-9 bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer">
                      Submit Review
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-border/60 pt-10 space-y-6">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Related Products
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="group relative bg-card rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden">
                <Link
                  href={`/products/${item.slug || item.id}`}
                  className="flex flex-col h-full flex-1">
                  <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 relative m-2 mb-0 border border-border/20">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1 px-4 pt-3">
                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      {item.brand || "—"}
                    </p>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                  </div>
                </Link>
                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4">
                  <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                    UGX {item.basePrice.toLocaleString()}
                  </span>
                  <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
