"use client";

import * as React from "react";
import { useState } from "react";
import { 
  Star, 
  ShoppingBag, Heart,
  ChevronRight, 
  ShoppingCart,
  ChevronLeft,
  User,
  Calendar,
  PenTool
} from "lucide-react";
import { IconRosetteDiscountCheckFilled } from '@tabler/icons-react';
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { mockDatabase } from "@/data/mockDatabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface MockReview {
  id: string;
  user: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const router = useRouter();

  // 1. Fully interactive reviews local state architecture
  const [reviewsList, setReviewsList] = React.useState<MockReview[]>([
    { id: "rev-1", user: "Peter Ochieng", rating: 5, date: "2026-06-12", comment: "The cushioning is incredible for everyday running around Kampala. Authentic quality, completely worth the price.", verifiedPurchase: true },
    { id: "rev-2", user: "Sarah Namubiru", rating: 4, date: "2026-06-05", comment: "Very comfortable and light. Fits well, but I recommend ordering half a size up for absolute perfect comfort.", verifiedPurchase: true }
  ]);

  // Form input bindings
  const [newComment, setNewComment] = React.useState("");
  const [newRating, setNewRating] = React.useState(5);
  const [newName, setNewName] = React.useState("");

  // Aggregate metrics summaries 
  const averageRating = (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length || 0).toFixed(1);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newComment.trim()) {
      toast.error("Please fill in your name and review feedback message.");
      return;
    }

    const reviewObject: MockReview = {
      id: `rev-${Date.now()}`,
      user: newName.trim(),
      rating: newRating,
      date: new Date().toISOString().split("T")[0],
      comment: newComment.trim(),
      verifiedPurchase: false
    };

    setReviewsList([reviewObject, ...reviewsList]);
    setNewName("");
    setNewComment("");
    setNewRating(5);
    toast.success("Thank you! Your feedback has been published onto the ledger.");
  };
  
  // Local state tracking systems
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Look up item context reactively out of the relational mockDatabase engine
  const targetItem = mockDatabase.products.find(p => p.id === resolvedParams.id) || mockDatabase.products[0];
  const associatedStore = mockDatabase.stores.find(s => s.id === targetItem.vendorId) || mockDatabase.stores[0];
  
  // Find related products matching the same category scope
  const relatedProducts = mockDatabase.products
    .filter(p => p.categoryId === targetItem.categoryId && p.id !== targetItem.id)
    .slice(0, 4);

  // Fallback rich metadata context matching local Kampala retail paradigms
  const productDetails = {
    description: "Premium engineering matched with elite craftsmanship provides complete agility and comfort. Featuring responsive dual cushioning layers and high-tensile breathability architectures tailored for active city grids or rugged trail pathways.",
    availability: "In Stock - Dispatch Available via Boda Riders", // FIXED: Added missing availability string token
    specs: [
      { name: "Manufacturer", value: "Nike International" },
      { name: "Primary Material", value: "Dura-Mesh Fabric & Synthetic Leather" },
      { name: "Cushioning Tech", value: "Air Max Alpha Foam Layer V2" },
      { name: "Origin Matrix", value: "Made in Vietnam / imported" },
      { name: "Weight Balance", value: "340g per unit metric balance" },
      { name: "Outsole Grip", value: "High-traction carbon compound rubber" }
    ]
  };

  // Compile full image preview stream (simulating product variants)
  const imageStream = [
    targetItem.image,
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=85"
  ];

  const discountPercentage = targetItem.compareAtPrice 
    ? Math.round(((targetItem.compareAtPrice - targetItem.basePrice) / targetItem.compareAtPrice) * 100) 
    : 0;

  return (
    <div className="max-w-8xl mx-auto px-4 lg:px-8 py-8 space-y-12 text-foreground antialiased selection:bg-emerald-500/10 selection:text-emerald-700">

      {/* 1. BREADCRUMB HEADER PLATFORM CONTROLS */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex flex-1 justify-between items-center gap-3">
          <Button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground shadow-xs transition-all duration-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-95 shrink-0 border border-border/40 cursor-pointer"
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
              {targetItem.name}
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
              alt={targetItem.name}
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

          <div className="space-y-2">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {targetItem.name}
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
              UGX {targetItem.basePrice.toLocaleString()}
            </span>
            {targetItem.compareAtPrice && (
              <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 line-through">
                UGX {targetItem.compareAtPrice.toLocaleString()}
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
                  className={`w-10 h-10 text-xs font-bold rounded-full border transition-all active:scale-95 cursor-pointer ${
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
              <div className="flex items-center border border-border bg-card rounded-full overflow-hidden h-11 shrink-0">
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

              <button className="flex-1 bg-primary hover:bg-emerald-500 text-primary-foreground font-bold text-xs tracking-wider uppercase rounded-full flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer">
                <ShoppingBag className="w-4 h-4" />
                Add to Cart
              </button>

              <button className="w-11 h-11 border border-border hover:bg-muted rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors group cursor-pointer">
                <Heart className="w-4 h-4 transition-transform group-hover:scale-110" />
              </button>
            </div>
          </div>

          {/* VENDOR PROFILE HIGHLIGHT CARD */}
          <div className="p-4 rounded-full bg-card text-card-foreground border border-border/60 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.01)] dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center border border-border relative overflow-hidden">
                <Image src={associatedStore.logo} alt={associatedStore.name} fill className="object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 leading-tight">{associatedStore.name}</h4>
                  {associatedStore.verified && <IconRosetteDiscountCheckFilled className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                </div>
              </div>
            </div>
            <Link href={`/shop/${associatedStore.slug}`}>
              <Button variant="outline" size="sm" className="rounded-full font-bold text-xs h-8 border-border bg-card text-foreground hover:bg-muted cursor-pointer">
                Visit Store
              </Button>
            </Link>
          </div>

        </div>
      </div>

      <div className="border-t border-border/60 pt-8 animate-in fade-in duration-200">
      
      {/* PREMIUM TABS SWITCH PANEL LAYOUT */}
      <div className="flex gap-6 border-b border-border/60 pb-3 select-none">
        {["description", "specifications", "reviews"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-bold uppercase tracking-widest relative pb-3 transition-colors capitalize cursor-pointer ${
              activeTab === tab ? "text-foreground font-extrabold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab === "reviews" ? `Reviews (${reviewsList.length})` : tab}</span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-in fade-in duration-200" />
            )}
          </button>
        ))}
      </div>

      {/* CORE CANVAS WORKSPACE BUFFER */}
      <div className="py-6 max-w-4xl text-xs font-semibold leading-relaxed">
        
        {/* A. PRODUCT DESCRIPTION TEXT CONTAINER */}
        {activeTab === "description" && (
          <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-2xl select-text">
            {productDetails.description}
          </p>
        )}

        {/* B. PREMIUM MINIMAL SPECIFICATIONS CARD MATRIX BLOCK */}
        {activeTab === "specifications" && (
          <div className="bg-card text-card-foreground border border-border/60 rounded-2xl overflow-hidden shadow-[0_16px_40px_-12px_rgba(0,0,0,0.01)] select-text">
            <div className="divide-y divide-border/40">
              {productDetails.specs.map((spec, index) => (
                <div 
                  key={spec.name} 
                  className={`grid grid-cols-1 sm:grid-cols-3 p-4 items-baseline gap-2 sm:gap-6 ${
                    index % 2 === 1 ? "bg-muted/20" : "bg-transparent"
                  }`}
                >
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {spec.name}
                  </span>
                  <span className="sm:col-span-2 text-xs font-bold text-foreground tracking-tight">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* C. EXTENSIVE RATINGS AND FEEDBACK ENGINE */}
        {activeTab === "reviews" && (
          <div className="space-y-8 select-none">
            
            {/* Upper Overview Metrics Dashboard Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-card border border-border/60 rounded-2xl p-5 items-center">
              <div className="text-center sm:border-r border-border/40 py-2 space-y-1">
                <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{averageRating}</h3>
                <div className="flex items-center justify-center gap-0.5 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(averageRating)) ? "fill-current" : "opacity-30"}`} />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">Average Buyer Rating</p>
              </div>

              {/* Graphical distribution visual percentages bar block */}
              <div className="sm:col-span-2 space-y-2 px-2">
                {[5, 4, 3, 2, 1].map((score) => {
                  const occurrences = reviewsList.filter(r => r.rating === score).length;
                  // FIXED: Changed totalRows expression variables to accurate reviewsList tracking counts
                  const ratio = reviewsList.length === 0 ? 0 : (occurrences / reviewsList.length) * 100;
                  return (
                    <div key={score} className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
                      <span className="w-3 text-right">{score}★</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/80 rounded-full transition-all duration-500" style={{ width: `${ratio}%` }} />
                      </div>
                      <span className="w-4 text-right opacity-60">{occurrences}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Middle split grid framing input submission form vs live commentary list stream */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
              
              {/* FEEDBACK COMMENTARY SUBMISSION LOGS */}
              <div className="lg:col-span-3 space-y-4 max-h-[480px] overflow-y-auto pr-2 select-text">
                {reviewsList.map((review) => (
                  <div key={review.id} className="bg-card border border-border/60 rounded-2xl p-4 space-y-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] animate-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-muted border border-border/40 rounded-full flex items-center justify-center text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground text-xs leading-none">{review.user}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 inline-flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {review.date}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 select-none">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "opacity-20"}`} />
                          ))}
                        </div>
                        {review.verifiedPurchase && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider scale-90 origin-right">
                            Verified Buyer
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed pl-1">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>

              {/* WRITE AN ACTIVE STORE REVIEW FORM MODULE */}
              <div className="lg:col-span-2 bg-muted/30 border border-border/60 rounded-2xl p-5 space-y-4">
                <div className="space-y-0.5 border-b border-border/40 pb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground inline-flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-muted-foreground" />
                    Share Your Feedback
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium">Your feedback details will register instantly into public view loops.</p>
                </div>

                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reviewer-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Full Name</label>
                    <Input 
                      id="reviewer-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Mukasa John"
                      className="h-9 border-border/60 rounded-xl text-xs font-medium bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Score Rating</span>
                    <div className="flex items-center gap-1.5 bg-background border border-border/60 rounded-xl h-9 px-3">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setNewRating(score)}
                          className="text-muted-foreground hover:text-amber-500 transition-colors cursor-pointer"
                        >
                          <Star className={`w-4 h-4 transition-transform active:scale-90 ${score <= newRating ? "text-amber-500 fill-current" : "opacity-30"}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reviewer-message" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Review Message</label>
                    <textarea
                      id="reviewer-message"
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write your item experience details transparently here..."
                      className="w-full border border-border/60 rounded-xl p-3 text-xs font-medium text-foreground placeholder-muted-foreground/70 bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
                    />
                  </div>

                  <Button type="submit" className="w-full h-9 bg-primary hover:bg-emerald-600 text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-all cursor-pointer">
                    Submit Entry Log
                  </Button>
                </form>
              </div>

            </div>
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {relatedProducts.map((item) => (
              <div key={item.id} className="group relative bg-card text-card-foreground rounded-[24px] p-0 border border-border/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-[0_32px_64px_-8px_rgba(0,0,0,0.06)]">
                
                <button className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 border border-border/40 dark:border-zinc-700 shadow-xs transition-colors hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-90 cursor-pointer">
                  <Heart className="w-4 h-4" />
                </button>

                <Link href={`/products/${item.id}`} className="flex flex-col h-full flex-1">
                  <div>
                    <div className="aspect-square rounded-[18px] overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative m-2 mb-0 border border-border/20">
                      <Image
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        src={item.image}
                        alt={item.name}
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
                        {item.name}
                      </h3>
                    </div>
                  </div>
                </Link>

                <div className="flex justify-between items-center mt-4 pt-1 px-4 pb-4 relative z-10">
                  <div className="flex flex-col">
                    {item.compareAtPrice && (
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through font-medium leading-none mb-0.5">
                        UGX {item.compareAtPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {item.basePrice.toLocaleString()}
                    </span>
                  </div>
                  <button className="w-9 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl flex items-center justify-center shadow-xs transition-all duration-200 active:scale-95 hover:bg-primary dark:hover:bg-primary dark:hover:text-white cursor-pointer">
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