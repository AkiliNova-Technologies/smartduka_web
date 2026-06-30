"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* AUTH INTERFACE ENTRY CONTAINER */}
      <div className="flex flex-col gap-4 p-6 md:p-10 justify-between">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground select-none group">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform group-hover:rotate-6">
              <ShoppingBag className="size-4 stroke-[2.2]" />
            </div>
            <span>Smart<span className="text-primary">Duka</span></span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR PANEL: EDITORIAL LIFESTYLE IMAGE CANVAS */}
      <div className="relative hidden bg-zinc-950 lg:block border-l border-border/40 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
          alt="Premium SmartDuka Marketplace"
          fill
          className="absolute inset-0 h-full w-full object-cover opacity-80 object-center transition-transform duration-10000 ease-out brightness-[0.85] dark:brightness-[0.3]"
        />
        
        {/* Deep background vignette shielding text elements from graphical variance noise */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        
        {/* Bottom context block overlay card info */}
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white max-w-sm space-y-2 select-none">
          <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full inline-block">
            SmartDuka Protection Scheme
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100 leading-tight">
            Touch before paying. Zero risk.
          </h2>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            Our verification system protects every transaction. Riders wait at your location for physical check before Mobile Money locks release.
          </p>
        </div>
      </div>

    </div>
  );
}