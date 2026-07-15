"use client";

import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUserData } from "@/providers/UserDataProvider";

export default function CartPage() {
  const {
    cart,
    cartCount,
    cartTotal,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  } = useUserData();

  const deliveryFee = 0;

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground">
          <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Your Cart is empty
          </h2>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            Looks like you haven&apos;t added any items to your order yet.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full shadow-xs hover:bg-emerald-500 active:scale-95 transition-all w-full cursor-pointer mt-2">
          <span>Explore Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-8xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between border-b border-border/40 pb-5 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              Review Your Cart
            </h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {cartCount} item{cartCount !== 1 ? "s" : ""} · UGX{" "}
              {cartTotal.toLocaleString()} total
            </p>
          </div>
        </div>

        <button
          onClick={clearCart}
          className="text-[10px] font-bold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer">
          Clear all
        </button>
      </div>

      {/* TWO-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Cart Items */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="group bg-card text-card-foreground border border-border/60 rounded-[24px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] transition-all duration-300">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted border border-border/40 shrink-0 relative">
                  <Image
                    src={item.image || "/placeholder-product.png"}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                    {item.vendorName}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 tracking-tight group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <span className="text-sm font-bold text-foreground tracking-tight block pt-1 sm:hidden">
                    UGX {item.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 shrink-0">
                <span className="text-sm sm:text-base font-bold text-foreground tracking-tight hidden sm:block">
                  UGX {item.price.toLocaleString()}
                </span>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-muted border border-border/60 rounded-xl p-0.5">
                    <button
                      onClick={() =>
                        updateCartQuantity(item.productId, item.quantity - 1)
                      }
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground rounded-lg transition-all cursor-pointer">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold px-2.5 text-foreground min-w-[20px] text-center select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateCartQuantity(item.productId, item.quantity + 1)
                      }
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground rounded-lg transition-all cursor-pointer">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="w-8 h-8 rounded-xl border border-border/40 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 flex items-center justify-center transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Summary */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
            <h2 className="text-base font-bold text-foreground tracking-tight border-b border-border pb-3.5">
              Order Details
            </h2>

            <div className="space-y-3 text-xs font-semibold text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="font-bold text-foreground">
                  UGX {cartTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Estimated Delivery</span>
                <span className="text-primary font-bold uppercase text-[10px] tracking-wider">
                  Free Delivery
                </span>
              </div>

              <div className="border-t border-border border-dashed pt-3.5 flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">
                    Total Invoice Amount
                  </span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">
                    Pay On Delivery
                  </span>
                </div>
                <span className="text-xl font-bold text-foreground tracking-tight">
                  UGX {(cartTotal + deliveryFee).toLocaleString()}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full h-11 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 shadow-xs hover:bg-emerald-500 active:scale-95 transition-all mt-2 cursor-pointer">
              <span>Proceed to Checkout</span>
              <div className="w-5 h-5 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
