"use client";

import React, { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";
import { mockDatabase } from "@/data/mockDatabase";

export default function CouponsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Read data straight from our centralized app mock database backbone
  const activeCoupons = mockDatabase.coupons || [];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. Grounded Local Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <Ticket className="w-4 h-4 fill-primary/10" />
            <span>Discounts & Vouchers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Available Discount Offers
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Copy these promo codes to save money when checking out items from different dukas.
          </p>
        </div>
      </div>

      {/* 2. PREMIUM TICKET-STUB VOUCHER GRID SYSTEM */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeCoupons.map((coupon) => (
          <div 
            key={coupon.code} 
            className="group relative bg-card text-card-foreground border border-dashed border-border hover:border-primary rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none hover:shadow-[0_32px_64px_-8px_rgba(5,150,105,0.04)] transition-all duration-300 flex items-stretch overflow-hidden min-h-[140px]"
          >
            
            {/* LEFT TICKET CODES HUB (Main Context Platform) */}
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="bg-muted text-zinc-600 dark:text-zinc-400 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-border/40">
                    {coupon.vendor}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight font-mono uppercase group-hover:text-primary transition-colors">
                  {coupon.code}
                </h3>
              </div>
              
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed line-clamp-2">
                {coupon.desc}
              </p>
            </div>

            {/* DESIGN STUB DIVISION LINE CONTEXT */}
            <div className="relative flex flex-col justify-between items-center w-px my-3 shrink-0">
              {/* Upper Semi-Circle Punchout Cutout */}
              <div className="absolute -top-6 -left-2 w-4 h-4 rounded-full bg-background border border-border group-hover:border-primary transition-colors" />
              {/* Dashed vertical ticket thread divider */}
              <div className="h-full border-r border-dashed border-border group-hover:border-primary/50 transition-colors" />
              {/* Lower Semi-Circle Punchout Cutout */}
              <div className="absolute -bottom-6 -left-2 w-4 h-4 rounded-full bg-background border border-border group-hover:border-primary transition-colors" />
            </div>

            {/* RIGHT TICKET ACTION FRAME (Interactive Clipboard Action Anchor) */}
            <div className="p-5 sm:p-6 bg-muted/40 flex items-center justify-center shrink-0 min-w-[110px] group-hover:bg-muted/70 transition-colors">
              <button 
                onClick={() => handleCopy(coupon.code)}
                className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-xs font-bold shadow-xs transition-all duration-200 shrink-0 active:scale-95 cursor-pointer ${
                  copiedCode === coupon.code 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 hover:bg-primary dark:hover:bg-primary dark:hover:text-white"
                }`}
              >
                {copiedCode === coupon.code ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </section>

    </div>
  );
}