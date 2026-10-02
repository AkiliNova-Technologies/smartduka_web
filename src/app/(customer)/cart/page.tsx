"use client";

import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { MediaImage } from "@/components/marketplace/media-image";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/media";
import Link from "next/link";
import { useUserData } from "@/providers/UserDataProvider";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const {
    cart,
    cartCount,
    cartTotal,
    cartLoading,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useUserData();
  const groups = Object.entries(
    cart.reduce<Record<string, typeof cart>>((all, item) => {
      (all[item.vendorName || "Marketplace seller"] ||= []).push(item);
      return all;
    }, {}),
  );

  if (!cartLoading && !cart.length)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 pb-24 sm:px-6">
        <IllustratedEmptyState
          illustration="/illustrations/empty-cart.svg"
          title="Your cart is empty"
          description="Browse products from local shops."
          action={{ label: "Continue shopping", href: "/products" }}
          size="prominent"
        />
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:py-10">
      <div className="flex items-center justify-between border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="inline-flex h-10 items-center gap-2 text-sm text-muted-foreground rounded-full hover:text-foreground border border border-border px-3">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Your cart
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cartCount} item{cartCount === 1 ? "" : "s"} from{" "}
              {groups.length || 0} seller{groups.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {cart.length > 0 && (
          <Button
            variant="outline"
            onClick={clearCart}
            className="text-sm font-medium rounded-full text-muted-foreground hover:text-destructive">
            Clear cart
          </Button>
        )}
      </div>
      <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)] lg:items-start">
        <section className="min-w-0 space-y-7" aria-label="Cart items">
          {groups.map(([vendor, items]) => (
            <section key={vendor} className="border-t first:border-t-0">
              <h2 className="py-3 text-sm font-semibold text-foreground">
                Sold by {vendor}
              </h2>
              <div className="divide-y rounded-2xl border bg-card">
                {items.map((item) => (
                  <article
                    key={`${item.productId}:${item.variantId ?? "simple"}`}
                    className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-4">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
                      <MediaImage
                        src={item.image}
                        fallback={PRODUCT_IMAGE_FALLBACK}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        fallbackClassName="object-contain p-3"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.productId}`}
                        className="line-clamp-2 text-sm font-semibold hover:text-primary">
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        <PriceDisplay price={item.price} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:justify-start">
                        <div className="flex h-9 items-center rounded-full border">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() =>
                              updateCartQuantity(
                                item.productId,
                                item.quantity - 1,
                                item.variantId,
                              )
                            }
                            className="grid size-9 place-items-center hover:bg-muted">
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            aria-label="Increase quantity"
                            onClick={() =>
                              updateCartQuantity(
                                item.productId,
                                item.quantity + 1,
                                item.variantId,
                              )
                            }
                            className="grid size-9 place-items-center hover:bg-muted">
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center justify-between gap-3 border-t pt-3 sm:col-span-1 sm:row-span-1 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:pt-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Line total
                        </p>
                        <PriceDisplay price={item.price * item.quantity} />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${item.name}`}
                        onClick={() =>
                          removeFromCart(item.productId, item.variantId)
                        }
                        className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>
          <div className="mt-4 space-y-3 border-y py-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subtotal</span>
              <PriceDisplay price={cartTotal} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Delivery</span>
              <span className="text-xs text-muted-foreground">At checkout</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </main>
  );
}
