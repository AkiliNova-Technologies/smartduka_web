"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const dbOrder = mockDatabase.orders.find((o) => o.id === id);
  if (!dbOrder) notFound();

  const fullOrderItems = dbOrder.items.map((orderItem) => {
    const matchingProduct = mockDatabase.products.find(
      (p) => p.id === orderItem.productId,
    );

    return {
      id: orderItem.productId,
      title: matchingProduct?.title || "Marketplace Product Drop",
      price: orderItem.priceAtPurchase,
      quantity: orderItem.quantity,
      image:
        matchingProduct?.image ||
        "https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?auto=format&fit=crop&w=600&q=80",
      brand: matchingProduct?.brand || dbOrder.vendor,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. STRUCTURAL HISTORY CONTROLS HEADER */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex flex-1 justify-between items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-muted text-card-foreground shadow-xs transition-all duration-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-50 dark:hover:text-zinc-950 active:scale-95 shrink-0 flex items-center justify-center border border-border/40 cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            <Link
              href="/"
              className="hover:text-primary transition-colors hidden sm:inline"
            >
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700 hidden sm:inline" />
            <Link
              href="/orders"
              className="hover:text-primary transition-colors"
            >
              Orders
            </Link>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
            <span className="text-zinc-900 dark:text-zinc-100 tracking-tight font-mono truncate max-w-[140px] sm:max-w-[none]">
              {dbOrder.id}
            </span>
          </nav>
        </div>
      </div>

      {/* 2. ORDER STATUS SUMMARY DECK */}
      <div className="bg-card text-card-foreground rounded-[24px] p-5 sm:p-6 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Order Reference
            </span>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200 font-mono tracking-tight">
              {dbOrder.id}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Placed On
            </span>
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{dbOrder.date}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
              Fulfilled By
            </span>
            <p className="text-xs font-bold text-primary uppercase tracking-wide">
              {dbOrder.vendor}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center h-8 px-3.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-muted text-zinc-600 dark:text-zinc-300 border-border/60">
            {dbOrder.status}
          </span>
        </div>
      </div>

      {/* 3. LOGISTICS DETAILS METRIC SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Identity Info Block */}
        <div className="bg-card text-card-foreground rounded-[24px] p-5 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-3">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Customer Details
            </h3>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {dbOrder.customerName}
            </p>
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-500">
              <Phone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>{dbOrder.customerPhone}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Delivery Location Info Block */}
        <div className="bg-card text-card-foreground rounded-[24px] p-5 border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-3 md:col-span-2">
          <div className="flex items-center gap-2 border-b border-border/40 pb-2">
            <MapPin className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Kampala Speed Delivery Location
            </h3>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {dbOrder.deliveryAddress}
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>Standard Express Transit</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ITEMS MANIFEST AND PRICE TOTALS INVOICE */}
      <div className="bg-card text-card-foreground rounded-[24px] border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none overflow-hidden">
        {/* Manifest Header Label */}
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center gap-2">
          <Package className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Pieces in this Order
          </h3>
        </div>

        {/* Relational Items Manifest Rows */}
        <div className="divide-y divide-border/60">
          {fullOrderItems.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Product Image Canvas Box */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 border border-border/40 relative shrink-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                {/* Brand & Line Title Item */}
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                    {item.brand}
                  </span>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 line-clamp-1">
                    {item.title}
                  </h4>
                  <span className="inline-block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-muted border border-border/20 px-1.5 py-0.5 rounded">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>

              {/* Price Calculation Anchor Block */}
              <div className="text-right w-full sm:w-auto pt-2 sm:pt-0 border-t border-dashed border-border sm:border-0 flex sm:block items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block sm:hidden">
                  Price
                </span>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                  UGX {item.price.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Invoice Summary Aggregate Matrix */}
        <div className="p-5 bg-muted/40 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Secured via Platform Escrow Guarantee</span>
          </div>

          <div className="flex items-baseline justify-between sm:justify-end gap-6 border-t border-dashed border-border sm:border-0 pt-3 sm:pt-0 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Total Paid
            </span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              UGX {dbOrder.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}