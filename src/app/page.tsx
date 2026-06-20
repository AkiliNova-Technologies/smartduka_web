"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShoppingBag,
  Store,
  Zap,
  Layers,
  Sparkles,
  Phone,
  HelpCircle,
  Plus,
  Minus,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove("dark");
      setDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  };

  const localFaqs = [
    {
      q: "How does the Mobile Money Safe Lock Escrow operate?",
      a: "Your payload funds stay securely locked in the platform pool tracker module. Payout disbursal routes to the Duka merchant wallet only when standard express transit fulfills and you physically confirm the items match your fit expectations.",
    },
    {
      q: "Are all Kampala Dukas verified physical counter storefronts?",
      a: "Yes. Every boutique undergo strict location authentication audits spanning Nakawa, Makindye, and Central Region hubs. You can explore directly online or walk straight to their checkout register counter in town.",
    },
    {
      q: "Can I bundle pieces across separate categories in a single Multi-Cart?",
      a: "Absolutely. Load your Kaveera with multiple pieces from unrelated local boutiques across town and complete your invoice verification in a unified single mobile escrow check stream.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-emerald-500/10 selection:text-emerald-700">
      <div className="w-full fixed top-4 inset-x-0 z-50 px-4 sm:px-6">
        <nav className="max-w-7xl mx-auto w-full h-16 bg-background/60 dark:bg-zinc-950/60 backdrop-blur-xl border border-border/40 rounded-full shadow-[0_8px_32px_-6px_rgba(0,0,0,0.04)] transition-all duration-300">
          <div className="w-full h-full px-6 flex items-center justify-between">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2.5 select-none shrink-0">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-tight">
                Smart<span className="text-primary">Duka</span>
              </span>
            </div>


            {/* Right: Interactive Controls & Theme Toggle */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle Layout Color Theme"
                className="w-9 h-9 rounded-full border border-border/60 bg-card text-muted-foreground flex items-center justify-center hover:bg-muted active:scale-95 transition-all cursor-pointer shadow-2xs">
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-in fade-in zoom-in-70 duration-300" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-700 animate-in fade-in zoom-in-70 duration-300" />
                )}
              </button>

              <Link
                href="/brands"
                className="text-xs font-bold text-zinc-400 hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors hidden lg:block">
                Login
              </Link>

              <Link
                href="/products"
                className="inline-flex items-center justify-center h-9 px-4 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 rounded-full text-xs font-bold tracking-tight transition-all hover:bg-primary dark:hover:bg-primary dark:hover:text-white active:scale-95 shadow-sm">
                Enter Marketplace
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* 2. HERO FUNNEL STACK WITH CONCENTRIC RADIAL GLOW ENGINE */}
      <header className="relative pt-36 pb-24 sm:pt-48 sm:pb-36 overflow-hidden border-b border-border/40 bg-background flex items-center justify-center min-h-[85vh]">
        {/* Concentric Glass Ring Structures verbatim from template layout illustration inside Modern Hero.jpeg */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          {/* Outer Ring */}
          <div className="w-[320px] sm:w-[580px] aspect-square rounded-full border border-primary/[0.03] dark:border-primary/[0.015] flex items-center justify-center animate-pulse duration-[8000ms]">
            {/* Middle Ring */}
            <div className="w-[240px] sm:w-[440px] aspect-square rounded-full border border-primary/[0.05] dark:border-primary/[0.025] flex items-center justify-center">
              {/* Inner Focus Ring */}
              <div className="w-[160px] sm:w-[300px] aspect-square rounded-full border border-primary/[0.08] dark:border-primary/[0.04] bg-radial from-primary/[0.04] dark:from-primary/[0.02] to-transparent" />
            </div>
          </div>
        </div>

        {/* Content Stack Presentation Frame */}
        <div className="max-w-7xl mx-auto px-6 text-center space-y-6 relative z-20">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-muted border border-border/40 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Zap className="w-3.5 h-3.5 text-primary fill-primary/10" />
            <span>Tired of &ldquo;Check DM for price&rdquo;? We are too.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white max-w-7xl mx-auto leading-[1.1] text-balance">
            Shop Top Kampala Boutiques Without Getting{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-650 to-teal-500 dark:from-emerald-400 dark:to-teal-400">
              &rdquo;Weuzed&rdquo; Online
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-md text-zinc-400 dark:text-zinc-500 font-medium max-w-3xl mx-auto leading-relaxed text-balance">
            Zero upfront deposits. Zero stories. Just fresh fits from verified
            town Dukas delivered straight to your door. The rider pulls up, you
            check the quality, and you only pay when you love it.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs sm:max-w-none mx-auto">
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-primary text-primary-foreground rounded-full text-xs font-bold uppercase tracking-wider shadow-md shadow-primary/10 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/10 active:scale-95 group w-full sm:w-auto cursor-pointer">
              <span>Clear Your Wishlist</span>
              <div className="w-5 h-5 bg-primary-foreground/10 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            <Link
              href="/help"
              className="inline-flex items-center justify-center h-12 px-6 bg-muted text-zinc-700 dark:text-zinc-300 border border-border/40 hover:bg-border/80 rounded-full text-xs font-bold transition-all w-full sm:w-auto">
              No Risk, Just Safe Fits
            </Link>
          </div>
        </div>

        {/* Global ambient backdrop diffuse point source */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] aspect-square bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      </header>

      {/* 3. ASYMMETRIC BENTO FEATURE BLOCK LAYER */}
      <section className="max-w-7xl mx-auto px-6 py-20 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Main Large Bento Hero Feature Box */}
          <div className="lg:col-span-7 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-[32px] p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-lg border border-transparent dark:border-zinc-800 min-h-[380px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent)] pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[9px] font-bold uppercase tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                Secure Escrow Flow
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight mt-6 max-w-md leading-tight">
                Lock your MoMo payloads with absolute safety
              </h2>
              <p className="text-xs text-emerald-100/80 font-semibold leading-relaxed mt-4 max-w-lg">
                Your Mobile Money payload is held securely by the platform pool
                system. Kampala Duka vendors are compensated only after you
                inspect your packages.
              </p>
            </div>

            <div className="relative z-10 pt-8">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 bg-white text-zinc-950 h-10 px-5 rounded-full text-xs font-bold tracking-tight hover:bg-zinc-50 active:scale-95 transition-all">
                <span>Browse Products</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Hand Stacked Secondary Bento Blocks */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
            {/* Stat Block 1 */}
            <div className="bg-card text-card-foreground p-6 rounded-[24px] border border-border/60 shadow-xs flex flex-col justify-between gap-6 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                  Verified Network
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Verified Local Sellers
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold leading-relaxed">
                  We link inventory straight to physical counter storefronts
                  across town, from Nakawa to the City Centre.
                </p>
              </div>
            </div>

            {/* Stat Block 2 */}
            <div className="bg-card text-card-foreground p-6 rounded-[24px] border border-border/60 shadow-xs flex flex-col justify-between gap-6 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                  Unified Disbursal
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  Dynamic Multi-Cart
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold leading-relaxed">
                  Load your Kaveera with items from separate vendors and
                  checkout your invoice parameters cleanly in one single stream.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SPLIT INTERACTIVE MATRIX: ACCORDION & TEASER CODES */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side: Policy & Accordion Framework */}
          <div className="lg:col-span-7 bg-card text-card-foreground border border-border/60 rounded-[32px] p-6 sm:p-8 dark:border-zinc-800/80">
            <div className="pb-4 border-b border-border/40 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Platform Rules & Guidelines
              </h3>
            </div>

            <div className="divide-y divide-border/40">
              {localFaqs.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between text-left font-bold text-sm text-zinc-800 dark:text-zinc-200 py-2 hover:text-primary transition-colors cursor-pointer">
                      <span>{item.q}</span>
                      {isOpen ? (
                        <Minus className="w-4 h-4 text-zinc-400 shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-3xl pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Showcase Action Teaser Grid Asset */}
          <div className="lg:col-span-5 bg-muted/40 border border-border/60 rounded-[32px] p-6 sm:p-8 flex flex-col justify-between h-full min-h-[340px] dark:border-zinc-800/80">
            <div className="space-y-4">
              <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-primary">
                <Sparkles className="w-4 h-4 fill-primary/10" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Ready to review real inventory lines?
              </h3>
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 leading-relaxed">
                Dive directly into interactive hot catalog collection boards,
                test customized lookbooks, or synchronize your active
                preferences parameters now.
              </p>
            </div>

            <div className="pt-8">
              <Link
                href="/products"
                className="w-full inline-flex items-center justify-center gap-1.5 h-11 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all cursor-pointer">
                <span>Open Marketplace Feed</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MULTI-COLUMN DESIGN SITEMAP FOOTER */}
      <footer className="bg-muted/50 border-t border-border/60 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
              Marketplace
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <li>
                <Link
                  href="/products"
                  className="hover:text-primary transition-colors">
                  All Product Feeds
                </Link>
              </li>
              <li>
                <Link
                  href="/new-arrivals"
                  className="hover:text-primary transition-colors">
                  New Arrivals Today
                </Link>
              </li>
              <li>
                <Link
                  href="/deals"
                  className="hover:text-primary transition-colors">
                  Flash Sales
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
              Boutiques
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <li>
                <Link
                  href="/brands"
                  className="hover:text-primary transition-colors">
                  Browse Trusted Dukas
                </Link>
              </li>
              <li>
                <Link
                  href="/collections"
                  className="hover:text-primary transition-colors">
                  Trending Lookbooks
                </Link>
              </li>
              <li>
                <Link
                  href="/coupons"
                  className="hover:text-primary transition-colors">
                  Discount Vouchers
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
              User Workspace
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <li>
                <Link
                  href="/orders"
                  className="hover:text-primary transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="hover:text-primary transition-colors">
                  My Wishlist
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="hover:text-primary transition-colors">
                  Account Settings
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
              Support Node
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <li>
                <Link
                  href="/help"
                  className="hover:text-primary transition-colors">
                  Help Center Guidelines
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>+256 700 000000</span>
              </li>
              <li className="text-[10px] tracking-tight font-mono text-zinc-400/70 select-none">
                SmartDuka Node v2.0.26
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 select-none">
          <p>
            © 2026 SmartDuka Platform ecosystem. Locked with Mobile Escrow
            Guarantee.
          </p>
          <p className="font-mono">Kampala, Uganda</p>
        </div>
      </footer>
    </div>
  );
}
