"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Star, 
  Heart, 
  ShoppingCart, 
  ChevronRight, 
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ShoppingBag
} from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";
import { Product } from "@/types/marketplace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CollectionDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const collection = mockDatabase.collections.find((c) => c.id === id);
  if (!collection) notFound();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [tileOffset, setTileOffset] = useState(0); 
  
  const slides = collection.mediaGallery;
  const shoppableProducts = mockDatabase.products.slice(0, collection.itemCount);
  
  const TILES_TO_SHOW = 4;

  const syncTileOffsetForIndex = (index: number) => {
    if (index < tileOffset) {
      setTileOffset(index);
    } else if (index >= tileOffset + TILES_TO_SHOW) {
      setTileOffset(index - TILES_TO_SHOW + 1);
    }
  };

  const nextSlide = () => {
    const nextIdx = (currentIndex + 1) % slides.length;
    setCurrentIndex(nextIdx);
    syncTileOffsetForIndex(nextIdx);
  };

  const prevSlide = () => {
    const prevIdx = (currentIndex - 1 + slides.length) % slides.length;
    setCurrentIndex(prevIdx);
    syncTileOffsetForIndex(prevIdx);
  };

  const handleTileClick = (index: number) => {
    setCurrentIndex(index);
    syncTileOffsetForIndex(index);
  };

  useEffect(() => {
    if (isHovered || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIdx = (prevIndex + 1) % slides.length;
        
        if (nextIdx < tileOffset) {
          setTileOffset(nextIdx);
        } else if (nextIdx >= tileOffset + TILES_TO_SHOW) {
          setTileOffset(nextIdx - TILES_TO_SHOW + 1);
        }
        
        return nextIdx;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [isHovered, slides.length, tileOffset]);

  const scrollTilesUp = () => {
    setTileOffset((prev) => Math.max(0, prev - 1));
  };

  const scrollTilesDown = () => {
    setTileOffset((prev) => Math.min(slides.length - TILES_TO_SHOW, prev + 1));
  };

  const visibleTiles = slides.slice(tileOffset, tileOffset + TILES_TO_SHOW);

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. STRUCTURAL CONTROLS HEADER */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-1 justify-between items-center gap-3">
          <Link
            href="/collections"
            className="w-9 h-9 rounded-full bg-muted text-card-foreground shadow-xs transition-all duration-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-95 shrink-0 flex items-center justify-center border border-border/40"
            title="Back to Collections"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <Link href="/" className="hover:text-primary transition-colors hidden sm:inline">
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 hidden sm:inline" />
            <Link href="/collections" className="hover:text-primary transition-colors">
              Collections
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
            <span className="text-zinc-900 dark:text-zinc-100 truncate">
              {collection.name}
            </span>
          </nav>
        </div>
      </div>

      {/* 2. CORE CAROUSEL INTERACTIVE VIEWPORT EXHIBIT */}
      <div className="bg-card text-card-foreground rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none p-4 border border-border/60 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Main Stage Stage Wrapper Box */}
          <section 
            className="relative lg:col-span-10 h-[350px] sm:h-[480px] rounded-[18px] overflow-hidden group/stage bg-zinc-950"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {slides.map((slide, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                        isActive ? "scale-105" : "scale-100"
                      }`}
                      fill
                      priority={index === 0}
                      alt=""
                      src={slide.url}
                      sizes="(max-w-1024px) 100vw, 80vw"
                    />
                  </div>
                </div>
              );
            })}

            {/* Ambient vignette shadow layer */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent z-15 pointer-events-none" />

            {/* Slide Control Handles */}
            {slides.length > 1 && (
              <>
                <button 
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 border border-zinc-100 text-zinc-900 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover/stage:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button 
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 border border-zinc-100 text-zinc-900 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover/stage:opacity-100 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </>
            )}
          </section>

          {/* ASYMMETRIC FILMSTRIP COMPONENT */}
          <div className="hidden lg:flex lg:col-span-2 flex-col justify-between items-center bg-muted/40 border border-border/60 p-3 rounded-[18px] relative">
            <button
              onClick={scrollTilesUp}
              disabled={tileOffset === 0}
              className={`w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-xs transition-all cursor-pointer ${
                tileOffset === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-90"
              }`}
            >
              <ChevronUp className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="flex-1 w-full flex flex-col justify-center gap-3 py-2 overflow-hidden">
              {visibleTiles.map((media, tileIdx) => {
                const originalIndex = tileOffset + tileIdx;
                const isSelected = originalIndex === currentIndex;

                return (
                  <div
                    key={originalIndex}
                    onClick={() => handleTileClick(originalIndex)}
                    className={`flex-1 w-full relative rounded-[12px] overflow-hidden cursor-pointer bg-zinc-200 dark:bg-zinc-900 border-2 transition-all group/tile duration-200 ${
                      isSelected 
                        ? "border-primary shadow-sm ring-1 ring-primary/20" 
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={media.url}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-300 group-hover/tile:scale-105"
                      sizes="15vw"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={scrollTilesDown}
              disabled={tileOffset >= slides.length - TILES_TO_SHOW}
              className={`w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-xs transition-all cursor-pointer ${
                tileOffset >= slides.length - TILES_TO_SHOW ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-90"
              }`}
            >
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Lookbook Branding Metadata Row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 px-2">
          <div className="space-y-1 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {collection.name}
            </h1>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 leading-relaxed">
              {collection.description}
            </p>
          </div>
          <div className="shrink-0 pt-1 text-left md:text-right">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Curated Fit By</span>
            <span className="text-xs font-bold text-primary uppercase tracking-wide">{collection.curatorName}</span>
          </div>
        </div>
      </div>

      {/* 3. LOWER CATALOG SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-3">
          <ShoppingBag className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Shop this Drop ({shoppableProducts.length} Items)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {shoppableProducts.map((product: Product) => {
            const discountPercentage = product.compareAtPrice 
              ? Math.round(((product.compareAtPrice - product.basePrice) / product.compareAtPrice) * 100) 
              : 0;

            return (
              <div 
                key={product.id}
                className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]"
              >
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90">
                  <Heart className="w-4 h-4" />
                </button>

                <Link href={`/products/${product.id}`} className="flex flex-col h-full flex-1">
                  <div>
                    <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        src={product.image}
                        alt={product.name}
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
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{product.rating}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">({product.reviews || 0})</span>
                      </div>
                      
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider pt-0.5">
                        {product.brand}
                      </p>
                      
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1 tracking-tight transition-colors group-hover:text-primary">
                        {product.name}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {product.compareAtPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {product.compareAtPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {product.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white">
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}