"use client";

import { Layers, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

export default function CollectionsPage() {
  const dynamicCollections = mockDatabase.collections;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">

      {/* 1. REFINED LOCALIZED HEADER ARCHITECTURE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 fill-primary/10" />
            <span>Premium Style Edits</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Trending Outfits & Lookbooks
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Fully matched item combinations and premium setups put together by platform curators and top-tier Dukas.
          </p>
        </div>
      </div>

      {/* 2. PREMIUM LOOKBOOK GRID EXHIBIT */}
      <section className="space-y-6">
        {(!dynamicCollections || dynamicCollections.length === 0) ? (
          <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
            <Layers className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No lookbooks live yet</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Check back soon for upcoming style drops!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dynamicCollections.map((collection) => {
              return (
                <div
                  key={collection.id}
                  className="group relative aspect-[16/10] rounded-[24px] overflow-hidden bg-zinc-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] dark:shadow-none flex flex-col justify-end p-6 sm:p-8 transition-all duration-300 ease-out cursor-pointer border border-transparent dark:border-zinc-800"
                >
                  {/* Media Presentation Canvas */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      src={collection.coverImage}
                      alt={collection.name}
                      fill
                      sizes="(max-w-1200px) 50vw, 100vw"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent dark:from-black dark:via-black/40 transition-opacity duration-300 group-hover:opacity-95" />
                  </div>

                  {/* Floating Volume Info Badge */}
                  <div className="absolute top-6 left-6 z-10">
                    <span className="bg-white/10 dark:bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 text-[9px] font-bold tracking-wider text-white uppercase">
                      {collection.volume}
                    </span>
                  </div>

                  {/* Clean Bottom Typography Stack */}
                  <div className="relative z-10 flex items-end justify-between gap-4 w-full">
                    <div className="relative z-10 space-y-4 w-full">
                      <div className="space-y-1.5 max-w-xl">
                        <h3 className="font-extrabold text-xl tracking-tight text-white sm:text-2xl">
                          {collection.name}
                        </h3>

                        <p className="text-xs text-zinc-200 dark:text-zinc-300 leading-relaxed font-semibold line-clamp-2 pt-0.5">
                          {collection.description}
                        </p>
                      </div>

                      {/* Interaction Footer Segment */}
                      <div className="pt-3 flex items-center justify-between border-t border-white/10 dark:border-zinc-800/60">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          By {collection.curatorName}
                        </p>
                        
                        {/* Action Link button realigned to pull theme token classes on hover */}
                        <Link
                          href={`/collections/${collection.id}`}
                          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-white text-zinc-900 rounded-full text-xs font-bold transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-95 shadow-xs"
                        >
                          <span>See the Fit</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}