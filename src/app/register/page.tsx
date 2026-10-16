"use client";

import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import Image from "next/image";
import { MwezoraLogoLink } from "@/components/brand/MwezoraLogo";

export default function RegisterPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* AUTH INTERFACE ENTRY CONTAINER */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex justify-center gap-2 md:justify-start">
          <MwezoraLogoLink variant="horizontal" size="md" label="Mwezora marketplace home" />
        </div>

        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">
            <RegisterForm />
            <p className="mt-5 text-center text-xs text-muted-foreground">By creating an account, you acknowledge the <Link href="/terms" className="hover:text-primary hover:underline">Terms</Link> and <Link href="/privacy-policy" className="hover:text-primary hover:underline">Privacy Policy</Link>.</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR PANEL: EDITORIAL LIFESTYLE IMAGE CANVAS */}
      <div className="relative hidden bg-zinc-950 lg:block border-l border-border/40 overflow-hidden">
        <Image
          src="/images/branding/auth/auth-fashion-editorial-v2.webp"
          alt=""
          fill
          sizes="50vw"
          className="absolute inset-0 h-full w-full object-cover object-center"
          priority
        />

        {/* Deep background vignette shielding text elements from graphical variance noise */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/10 to-transparent" />

        {/* Bottom context block overlay card info */}
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white max-w-sm space-y-2 select-none">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full inline-block">
            Shopping, Redefined
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
            Discover something wonderful.
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Beautiful finds, inspiring stores, and styles made for you.
          </p>
        </div>
      </div>
    </div>
  );
}
