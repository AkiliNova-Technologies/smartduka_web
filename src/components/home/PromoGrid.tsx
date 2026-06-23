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
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
      {dynamicPromos.map((promo) => {
        const BadgeIcon = PROMO_ICON_MAP[promo.badgeIcon] || HelpCircle;

        return (
          <Link
            key={promo.id}
            href={promo.href}
            className="group relative h-48 sm:h-52 overflow-hidden rounded-[32px] p-6 flex items-end cursor-pointer transition-all duration-500 bg-zinc-950 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)] hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
          >
            <Image
              src={promo.image}
              alt={promo.imgAlt}
              fill
              sizes="(max-w-768px) 100vw, (max-w-1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-80 dark:opacity-70"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 z-10" />

            <div className="flex flex-col items-start space-y-2 w-full relative z-20 text-white text-left select-none">
              
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/15 backdrop-blur-md border border-white/10 text-white">
                <BadgeIcon className="w-3 h-3 stroke-[2.5]" />
                {promo.badge}
              </span>
              
              <div className="space-y-0.5 w-full">
                <h4 className="text-xl font-bold tracking-tight leading-tight text-white drop-shadow-xs">
                  {promo.title}
                </h4>
                <p className="text-xs font-semibold tracking-wide text-zinc-300/90 leading-normal max-w-[90%]">
                  {promo.description}
                </p>
              </div>

              {/* Action trigger anchor pointer link */}
              <span className="text-xs font-bold flex items-center gap-1.5 pt-1 text-emerald-400 transition-colors group-hover:text-emerald-300">
                <span>{promo.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}