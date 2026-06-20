"use client";

import { ArrowRight, Sparkles, Percent, Truck, HelpCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

// Type-safe structural map to translate database icon string tokens into native Lucide elements
const PROMO_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Percent: Percent,
  Truck: Truck,
  Sparkles: Sparkles,
};

export function PromoGrid() {
  const dynamicPromos = mockDatabase.promos;

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
      {dynamicPromos.map((promo) => {
        // Fall back gracefully to HelpCircle if a misaligned token string is specified
        const BadgeIcon = PROMO_ICON_MAP[promo.badgeIcon] || HelpCircle;

        return (
          <Link
            key={promo.id}
            href={promo.href}
            className="group relative overflow-hidden rounded-[28px] p-6 border border-border/60 flex justify-between items-center cursor-pointer transition-all duration-300 ease-out bg-card text-card-foreground shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none hover:shadow-[0_30px_60px_-10px_rgba(0,0,0,0.06)]"
          >
            {/* Left Column: Contextual Copy details */}
            <div className="flex flex-col items-start space-y-2.5 max-w-[55%] relative z-10">
              {/* Dynamic Badge layout pill */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider dark:bg-zinc-800 dark:text-zinc-200 ${promo.badgeBg}`}>
                <BadgeIcon className="w-3 h-3" />
                {promo.badge}
              </span>
              
              <div className="space-y-0.5">
                <h4 className="text-xl font-black tracking-tight leading-tight text-zinc-900 dark:text-zinc-50">
                  {promo.title}
                </h4>
                <p className="text-xs font-semibold tracking-wide text-zinc-400 dark:text-zinc-500">
                  {promo.description}
                </p>
              </div>

              {/* Action trigger anchor link */}
              <span className={`text-xs font-bold flex items-center gap-1.5 pt-1 transition-colors dark:text-primary ${promo.accentText}`}>
                <span>{promo.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>

            {/* Right Column: Premium Framed Product Display */}
            <div className="w-26 h-26 sm:w-30 sm:h-30 relative overflow-hidden rounded-2xl border border-border bg-white dark:bg-zinc-900 shadow-xs transition-transform duration-500 ease-out group-hover:scale-105 group-hover:rotate-3 shrink-0">
              <Image
                src={promo.image}
                alt={promo.imgAlt}
                fill
                sizes="(max-w-768px) 120px, 150px"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
            </div>
          </Link>
        );
      })}
    </section>
  );
}