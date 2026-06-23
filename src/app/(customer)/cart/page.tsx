"use client";

import { useState } from "react";
import { 
  Trash2, Plus, Minus, ArrowRight, ShoppingBag, 
  ArrowLeft 
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CartItem {
  id: string;
  brand: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
}

// Dummy initial data mirroring your platform mock architecture
const initialCartItems: CartItem[] = [
  {
    id: "cart-1",
    brand: "Nike Sportswear",
    title: "Air Max 270 React Premium",
    price: 480000,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    size: "UK 9",
  },
  {
    id: "cart-2",
    brand: "Sony",
    title: "WH-1000XM5 Wireless Headphones",
    price: 1100000,
    quantity: 1,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    size: "One Size",
  },
];

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>(initialCartItems);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      )
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = 0; // Free delivery token aligned with platform guidelines
  const totalAmount = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground shadow-inner">
          <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Your Kaveera is empty</h2>
          <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
            {"Looks like you haven't added any premium fits or tech gear to your order cycle yet."}
          </p>
        </div>
        <Link 
          href="/products" 
          className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full shadow-xs hover:bg-emerald-500 active:scale-95 transition-all w-full cursor-pointer mt-2"
        >
          <span>Explore Marketplace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-8xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* PAGE HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-5">
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <span>Review Your Cart</span>
            <span className="text-xs font-bold text-muted-foreground bg-muted border border-border/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {cart.length} {cart.length === 1 ? "Item" : "Items"}
            </span>
          </h1>
          <p className="text-xs font-semibold text-muted-foreground">
            Manage your items, verify your selected configurations, and finalize your delivery options.
          </p>
        </div>
        
        <Link 
          href="/products" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors self-start sm:self-auto group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* TWO-COLUMN GRID RESPONSIVE STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COMPONENT: CORE ITEM FEED LIST */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {cart.map((item) => (
            <div 
              key={item.id}
              className="group bg-card text-card-foreground border border-border/60 rounded-[24px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-border"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Product Render Asset Container */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted border border-border/40 shrink-0 relative">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>

                {/* Metadata Column Block */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                    {item.brand}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 tracking-tight group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.size && (
                    <span className="inline-block text-[10px] font-bold text-muted-foreground bg-muted border border-border/40 px-2 py-0.5 rounded-md mt-1 select-none">
                      Size: {item.size}
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground tracking-tight block pt-1 sm:hidden">
                    UGX {item.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Vectors & Interactive Control Pod */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 w-full sm:w-auto border-t sm:border-t-0 border-border/40 pt-3 sm:pt-0 shrink-0">
                <span className="text-sm sm:text-base font-bold text-foreground tracking-tight hidden sm:block">
                  UGX {item.price.toLocaleString()}
                </span>

                <div className="flex items-center gap-3">
                  {/* Quantity Configuration Incrementors */}
                  <div className="flex items-center bg-muted border border-border/60 rounded-xl p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground rounded-lg transition-all shadow-none hover:shadow-2xs cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold px-2.5 text-foreground min-w-[20px] text-center select-none">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-card hover:text-foreground rounded-lg transition-all shadow-none hover:shadow-2xs cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Complete Wipe Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 rounded-xl border border-border/40 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Remove item from basket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* RIGHT COMPONENT: SUMMARY INVOICE CARD */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          <div className="bg-card text-card-foreground rounded-[28px] border border-border/60 p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:shadow-none space-y-4">
            <h2 className="text-base font-bold text-foreground tracking-tight border-b border-border pb-3.5">
              Order Details
            </h2>

            <div className="space-y-3 text-xs font-semibold text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Items Subtotal</span>
                <span className="font-bold text-foreground">UGX {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Estimated Delivery</span>
                <span className="text-primary font-bold uppercase text-[10px] tracking-wider">Free Delivery</span>
              </div>
              
              <div className="border-t border-border border-dashed pt-3.5 flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Total Invoice Amount</span>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Pay On Delivery</span>
                </div>
                <span className="text-xl font-bold text-foreground tracking-tight">
                  UGX {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <button className="w-full h-12 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 shadow-xs hover:bg-emerald-500 active:scale-95 transition-all mt-2 cursor-pointer">
              <span>Proceed to Checkout</span>
              <div className="w-5 h-5 bg-primary-foreground/10 rounded-full flex items-center justify-center">
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>

          {/* CASH ON DELIVERY TRUST ASSURANCE BADGES */}
          {/* <div className="bg-muted/40 border border-border/60 rounded-[28px] p-5 space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
              SmartDuka Order Protection
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center text-primary shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">100% Cash on Delivery</h4>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-normal">
                    Zero upfront commitments. No hidden digital escrow configurations. Pay only after touching.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Physical Fit Verification</h4>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-normal">
                    The dispatch rider waits patiently while you inspect quality or test fit sizes at your doorstep.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center text-primary shrink-0">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-foreground">Instant Refusal Security</h4>
                  <p className="text-[11px] font-semibold text-muted-foreground leading-normal">
                    Fits not matching your expectations? Send them back immediately with the rider at zero charge.
                  </p>
                </div>
              </div>
            </div>
          </div> */}

        </div>

      </div>

    </div>
  );
}