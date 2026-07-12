"use client";

import { ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { VendorKycForm } from "@/components/vendor/kyc-form";
import { useAuth } from "@/hooks/use-auth";

export default function BecomeSellerPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-svh bg-background flex flex-col items-center justify-center gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          Verifying authorization parameters...
        </p>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* LEFT SIDEBAR PANEL: SELLER ASPIRATIONAL IMAGE CANVAS */}
      <div className="relative hidden bg-zinc-950 lg:block border-r border-border/40 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85"
          alt="SmartDuka Vendor Marketplace Opportunity"
          fill
          className="absolute inset-0 h-full w-full object-cover opacity-80 object-center transition-transform duration-10000 ease-out brightness-[0.85] dark:brightness-[0.3]"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute top-10 left-12 z-10">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-white select-none group"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/10 text-white shadow-xs transition-transform group-hover:rotate-6">
              <ShoppingBag className="size-4 stroke-[2.2]" />
            </div>
            <span>
              Smart<span className="text-emerald-400">Duka</span>
            </span>
          </Link>
        </div>

        <div className="absolute bottom-12 left-12 right-12 z-10 text-white max-w-sm space-y-2 select-none">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full inline-block">
            Vendor Partnership Program
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
            Turn your inventory into a digital storefront.
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Join hundreds of verified merchants on SmartDuka. List products, manage orders, and grow your customer base — all from a single dashboard built for Ugandan commerce.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: KYC ONBOARDING FORM */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground select-none group lg:hidden"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:rotate-6">
              <ShoppingBag className="size-4 stroke-[2.2]" />
            </div>
            <span>
              Smart<span className="text-primary">Duka</span>
            </span>
          </Link>
          <div className="hidden lg:block" />
          <Link
            href="/help"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            KYC Requirements
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-4">
          <div className="w-full max-w-md">
            <div className="space-y-1.5 mb-6 text-center select-none">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Open Your Storefront
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete your vendor profile to begin selling. Review typically takes 24 hours.
              </p>
            </div>

            <VendorKycForm />
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground/50 select-none">
          Protected by SmartDuka Vendor Compliance
        </div>
      </div>
    </div>
  );
}