"use client";

import { useState } from "react";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CartItem {
  id: string;
  brand: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

interface Product {
  id: string;
  brand: string;
  title: string;
  price: number;
  rating: number;
  image: string;
}

// Dummy Data
const initialCartItems: CartItem[] = [
  {
    id: "cart-1",
    brand: "Nike Sportswear",
    title: "Air Max 270 React Premium",
    price: 480000,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "cart-2",
    brand: "Sony",
    title: "WH-1000XM5 Headphones",
    price: 1100000,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
  },
];

const recentlyViewedProducts: Product[] = [
  {
    id: "recent-1",
    brand: "Marshall",
    title: "Emberton II Portable Speaker",
    price: 650000,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "recent-2",
    brand: "Chanel",
    title: "Chance Eau Tendre Spray",
    price: 340000,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=300&q=80",
  },
];

export function RightSidebar() {
  const [cart, setCart] = useState<CartItem[]>(initialCartItems);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  return (
    <aside className="w-full lg:w-[400px] shrink-0">
      <div className="sticky top-6 space-y-6">
        
        {/* COMPONENT 1: MY CART PANEL */}
        <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              My Kaveera
            </h4>
            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-border px-2.5 py-1 rounded-full uppercase tracking-wider">
              {cart.length} {cart.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          {/* Cart Item Feed */}
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-3 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border flex items-center justify-center text-zinc-400 shadow-inner">
                  <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Your cart is empty</p>
                  <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 max-w-[200px] leading-normal">
                    Looks like you haven&apos;t added any pieces to your rotation yet.
                  </p>
                </div>
                <Link 
                  href="/products" 
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-emerald-500 transition-colors"
                >
                  <span>Browse marketplace</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 p-2 rounded-2xl border border-transparent hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {/* Item Image Display */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 shrink-0 flex items-center justify-center relative border border-border">
                    <Image
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      fill
                      src={item.image}
                      alt={item.title}
                      sizes="180px"
                    />
                  </div>

                  {/* Meta Details */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                      {item.brand}
                    </span>
                    <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
                      {item.title}
                    </h5>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 tracking-tight block mt-0.5">
                      UGX {item.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity & Action Controls */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-zinc-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center bg-zinc-50 dark:bg-zinc-800 border border-border rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-5 h-5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-card dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-md transition-all shadow-none hover:shadow-sm"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-bold px-1.5 text-zinc-800 dark:text-zinc-200 min-w-[16px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-5 h-5 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-card dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-50 rounded-md transition-all shadow-none hover:shadow-sm"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Order Summary & CTA */}
          {cart.length > 0 && (
            <div className="border-t border-border mt-4 pt-4 space-y-3">
              <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                <span>Subtotal</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-50">
                  UGX {subtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-xs font-medium">
                <span>Estimated Delivery</span>
                <span className="text-primary font-bold uppercase tracking-wide text-[10px]">
                  Free
                </span>
              </div>
              <div className="border-t border-border border-dashed pt-2.5 flex justify-between items-end">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300">
                  Total Order Amount
                </span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  UGX {subtotal.toLocaleString()}
                </span>
              </div>

              <button className="w-full h-11 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold rounded-full flex items-center justify-center gap-2 text-xs transition-colors hover:bg-primary dark:hover:bg-primary dark:hover:text-white shadow-xs mt-1">
                Proceed to Checkout
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* COMPONENT 2: RECENTLY VIEWED PANEL */}
        <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 p-5 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:shadow-none">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-3.5">
            Recently Viewed
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {recentlyViewedProducts.map((product) => (
              <div
                key={product.id}
                className="group relative bg-zinc-50/50 dark:bg-zinc-800/30 p-2 border border-border rounded-xl flex flex-col justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <div>
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-card dark:bg-zinc-900 flex items-center justify-center p-1.5 relative border border-border/40">
                    <Image
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      fill
                      src={product.image}
                      alt={product.title}
                      sizes="120px"
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    {product.brand}
                  </span>
                  <h5 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary mt-0.5">
                    {product.title}
                  </h5>
                </div>
                <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50 mt-2">
                  UGX {product.price.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPONENT 4: WHATSAPP COMMUNITY JOIN TRIGGER */}
        <div className="bg-zinc-900 dark:bg-zinc-900/40 rounded-[24px] p-6 md:p-8 flex flex-col items-start justify-between gap-6 relative overflow-hidden shadow-inner border border-zinc-800/80 dark:border-zinc-800">
          {/* Ambient background glow matching platform signature colors */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 text-left space-y-1.5 flex-1">
            <h3 className="text-xl font-bold tracking-tight text-white">
              Get Hot Deals Straight on WhatsApp
            </h3>
            <p className="text-xs text-zinc-400 font-medium max-w-lg leading-relaxed">
              Join our community chat to receive instant flash sale alerts,
              price cuts from top Kampala Dukas, and early lookbook drops before
              things sell out.
            </p>
          </div>

          <div className="w-full flex relative z-10 shrink-0 flex-1 justify-start">
            <a
              href="https://whatsapp.com/channel/0029VbDBwkc11ulVILRb9t17"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-emerald-500 font-bold text-sm px-6 h-11 rounded-full transition-all duration-200 shadow-md active:scale-95 whitespace-nowrap"
            >
              Join Channel
            </a>
          </div>
        </div>
        
      </div>
    </aside>
  );
}