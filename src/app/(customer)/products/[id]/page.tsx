"use client";

import * as React from "react";
import { useState } from "react";
import { 
  Star, 
  ShoppingBag, Heart, MessageSquare, 
  ChevronRight, CheckCircle2, 
  ShoppingCart,
  ChevronLeft
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { mockDatabase } from "@/data/mockDatabase";
import { useRouter } from "next/navigation";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  
  // Local state tracking systems
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Look up item context reactively out of the relational mockDatabase engine
  const targetItem = mockDatabase.products.find(p => p.id === resolvedParams.id) || mockDatabase.products[0];
  const associatedStore = mockDatabase.stores.find(s => s.id === targetItem.storeId) || mockDatabase.stores[0];
  
  // Find related products matching the same category scope
  const relatedProducts = mockDatabase.products
    .filter(p => p.categoryId === targetItem.categoryId && p.id !== targetItem.id)
    .slice(0, 4);

  // Fallback rich metadata context matching local Kampala retail paradigms
  const productDetails = {
    availability: targetItem.inventoryCount > 0 ? `In Stock (${targetItem.inventoryCount} items left)` : "Out of Stock",
    description: "Crafted from highly durable certified organic materials. This premium item features dual-lined reinforced structure, dropped shoulder semantics, and weighted density composites designed to retain structural profile definitions through infinite lifecycle washes.",
    specs: [
      { name: "Material Composition", value: "Premium Composite Blend" },
      { name: "Inventory Unit Code", value: targetItem.id.toUpperCase() },
      { name: "Primary Location", value: "Kampala Hub, Uganda" },
      { name: "Care Directives", value: "Machine wash cold, air dry naturally" }
    ]
  };

  // Compile full image preview stream (simulating product variants)
  const imageStream = [
    targetItem.image,
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=85"
  ];

  const discountPercentage = targetItem.originalPrice 
    ? Math.round(((targetItem.originalPrice - targetItem.price) / targetItem.originalPrice) * 100) 
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-12 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">

      {/* 1. BREADCRUMB HEADER PLATFORM CONTROLS */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-1 justify-between items-center gap-3">
          <Button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground shadow-xs transition-all duration-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-95 shrink-0 border border-border/40"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </Button>

          <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <Link href="/" className="hover:text-primary transition-colors hidden sm:inline">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 hidden sm:inline" />
            <Link href="/new-arrivals" className="hover:text-primary transition-colors">
              Products
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
            <span className="text-zinc-900 dark:text-zinc-100 truncate">
              {targetItem.title}
            </span>
          </nav>
        </div>
      </div>

      {/* CORE HUB GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT GALLERY BLOCK */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/5] w-full bg-muted/40 rounded-[28px] border border-border/60 overflow-hidden relative group shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] dark:shadow-none">
            {discountPercentage > 0 && (
              <span className="absolute top-4 left-4 z-10 bg-orange-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs">
                Save {discountPercentage}%
              </span>
            )}
            
            <Image
              src={imageStream[activeImgIndex]}
              alt={targetItem.title}
              fill
              priority
              className="object-cover w-full h-full dark:opacity-95"
              sizes="(max-w-1024px) 100vw, 60vw"
            />
          </div>

          {/* Clickable Active Thumbnail Row Matrix */}
          <div className="grid grid-cols-4 gap-4">
            {imageStream.map((imgUrl, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImgIndex(i)}
                className={`aspect-square bg-muted/30 border relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  activeImgIndex === i 
                    ? "border-primary ring-2 ring-primary/10 scale-[0.98]" 
                    : "border-border/60 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}
              >
                <Image src={imgUrl} alt="Thumbnail preview" fill className="object-cover" sizes="150px" />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT CONTROL PANEL */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* VENDOR PROFILE HIGHLIGHT CARD */}
          <div className="p-4 rounded-2xl bg-card text-card-foreground border border-border/60 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.01)] dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-border relative overflow-hidden">
                <Image src={associatedStore.logo} alt={associatedStore.name} fill className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 leading-tight">{associatedStore.name}</h4>
                  {associatedStore.verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/10" />}
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wide mt-0.5">{associatedStore.subscriptionPlan}</p>
              </div>
            </div>
            <Link href={`/shop/${associatedStore.slug}`}>
              <Button variant="outline" size="sm" className="rounded-full font-bold text-xs h-8 border-border bg-card text-foreground hover:bg-muted cursor-pointer">
                Visit Store
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {targetItem.title}
            </h1>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <div className="flex items-center gap-1 text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-md">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{targetItem.rating}</span>
              </div>
              <span className="text-border">|</span>
              <span className="text-zinc-400 dark:text-zinc-500">{targetItem.reviews} Customer Reviews</span>
            </div>
          </div>

          <div className="border-t border-b border-border/60 py-4 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              UGX {targetItem.price.toLocaleString()}
            </span>
            {targetItem.originalPrice && (
              <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 line-through">
                UGX {targetItem.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* SIZES */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <span>Select Size</span>
              <button className="text-primary normal-case hover:underline font-bold cursor-pointer">Size Guide</button>
            </div>
            <div className="flex gap-2">
              {["S", "M", "L", "XL"].map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`w-12 h-10 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer ${
                    selectedSize === size
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                      : "border-border bg-card text-zinc-700 dark:text-zinc-300 hover:bg-muted"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* QUANTITY & ACTIONS */}
          <div className="space-y-3 pt-2">
            <p className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {productDetails.availability}
            </p>
            <div className="flex gap-3">
              <div className="flex items-center border border-border bg-card rounded-xl overflow-hidden h-11 shrink-0">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-full text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold text-foreground">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-full text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button className="flex-1 bg-primary hover:bg-emerald-500 text-primary-foreground font-bold text-xs tracking-wider uppercase rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer">
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </button>

              <button className="w-11 h-11 border border-border hover:bg-muted rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors group cursor-pointer">
                <Heart className="w-4 h-4 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DETAIL TABS SECTION */}
      <div className="border-t border-border/60 pt-8">
        <div className="flex gap-6 border-b border-border/60 pb-3">
          {["description", "specifications", "reviews"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-bold uppercase tracking-wider relative pb-3 transition-colors capitalize cursor-pointer ${
                activeTab === tab ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="py-6 max-w-4xl text-xs font-semibold leading-relaxed text-zinc-400 dark:text-zinc-500">
          {activeTab === "description" && <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">{productDetails.description}</p>}
          {activeTab === "specifications" && (
            <div className="border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/60 bg-card shadow-[0_16px_40px_-12px_rgba(0,0,0,0.01)] dark:shadow-none">
              {productDetails.specs.map((spec) => (
                <div key={spec.name} className="grid grid-cols-3 p-4 text-xs">
                  <span className="font-bold text-zinc-400 dark:text-zinc-500">{spec.name}</span>
                  <span className="col-span-2 text-zinc-800 dark:text-zinc-200 font-bold">{spec.value}</span>
                </div>
              ))}
            </div>
          )}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">Customer Feedback ({targetItem.reviews})</span>
              </div>
              <p className="text-zinc-400 dark:text-zinc-500">Reviews and ratings modules are dynamically loaded from our customer checkout records layer context.</p>
            </div>
          )}
        </div>
      </div>

      {/* RELATED PRODUCTS FEED AT BOTTOM */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-border/60 pt-10 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-lg lg:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Explore Related Products
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">Other dynamic catalog variations matching this category.</p>
            </div>
            <button className="h-8 px-4 inline-flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-muted rounded-full hover:text-white dark:hover:text-zinc-900 hover:bg-zinc-900 dark:hover:bg-zinc-50 transition-colors duration-200 cursor-pointer">
              Explore All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {relatedProducts.map((item) => (
              <div key={item.id} className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]">
                
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                  <Heart className="w-4 h-4" />
                </button>

                <Link href={`/products/${item.id}`} className="flex flex-col h-full flex-1">
                  <div>
                    <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-w-768px) 50vw, 25vw"
                        loading="lazy"
                      />
                      {discountPercentage > 0 && (
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-orange-600 text-white rounded-md font-bold text-[9px] uppercase tracking-wider shadow-sm">
                          -{discountPercentage}% OFF
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 px-4 pt-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{item.rating}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">({item.reviews})</span>
                      </div>
                      
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                        {item.brand}
                      </p>
                      
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {item.originalPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {item.originalPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {item.price.toLocaleString()}
                    </span>
                  </div>
                  <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
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