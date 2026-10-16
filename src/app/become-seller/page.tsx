"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { VendorKycForm } from "@/components/vendor/kyc-form";
import { useAuth } from "@/hooks/use-auth";
import { MwezoraLogoLink } from "@/components/brand/MwezoraLogo";

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
          src="/images/branding/seller/seller-boutique-editorial-v2.webp"
          alt="East African fashion entrepreneur arranging clothing in her boutique"
          fill
          sizes="50vw"
          className="absolute inset-0 h-full w-full object-cover object-center"
          priority
        />

        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/75 via-zinc-950/10 to-transparent" />

        <div className="absolute top-10 left-12 z-10">
          <MwezoraLogoLink variant="monochrome" size="md" label="Mwezora marketplace home" linkClassName="text-white" />
        </div>

        <div className="absolute bottom-12 left-12 right-12 z-10 text-white max-w-sm space-y-2 select-none">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full inline-block">
            Sell on Mwezora
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
            Your Store. Your Story. Your Next Chapter.
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Bring your beautiful products to more customers and grow your business with Mwezora.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: KYC ONBOARDING FORM */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex items-center justify-between">
          <MwezoraLogoLink variant="horizontal" size="sm" label="Mwezora marketplace home" linkClassName="lg:hidden" />
          <div className="hidden lg:block" />
          <Link
            href="/help"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Seller help
          </Link>
        </div>

        <div className="relative -mx-6 h-44 overflow-hidden sm:mx-0 sm:rounded-2xl lg:hidden">
          <Image src="/images/branding/seller/seller-boutique-mobile-v2.webp" alt="East African fashion entrepreneur arranging clothing in her boutique" fill sizes="100vw" priority className="object-cover object-[center_28%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </div>

        <div className="flex flex-1 items-center justify-center py-4">
          <div className="w-full max-w-md">
            <div className="space-y-1.5 mb-6 text-center select-none">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Your Store. Your Story. Your Next Chapter.
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bring your beautiful products to more customers. Tell us about your business so we can review your seller application.
              </p>
            </div>

            <VendorKycForm />
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground/50 select-none">
          Seller applications are reviewed before shops can start selling.
        </div>
      </div>
    </div>
  );
}
