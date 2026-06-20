"use client";

import {
  ArrowRight,
  Calendar,
  Layers,
  Package,
} from "lucide-react";
import Link from "next/link";
import { mockDatabase } from "@/data/mockDatabase";

export default function OrdersPage() {
  const dynamicOrders = mockDatabase.orders;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 py-10 space-y-12 selection:bg-emerald-500/10 selection:text-emerald-700">
      
      {/* 1. Synchronized Page Header Architecture */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
            <Package className="w-4 h-4 fill-primary/10" />
            <span>Order History</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Track Your Orders
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            Check the status of your items coming from different dukas on the platform.
          </p>
        </div>
      </div>

      {/* 2. Dynamic Order Timeline List */}
      <section className="space-y-5">
        {(!dynamicOrders || dynamicOrders.length === 0) ? (
          <div className="text-center py-20 bg-card border border-border/60 rounded-[24px]">
            <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No orders placed yet</h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Your purchase history records will drop right here.</p>
          </div>
        ) : (
          dynamicOrders.map((order) => {
            // Aggregate totals over purchase lines to find combined package item quantities
            const totalItemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);

            return (
              <div
                key={order.id}
                className="group relative bg-card text-card-foreground rounded-[24px] border border-border/60 p-5 sm:p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 ease-out flex flex-col justify-between gap-6"
              >
                {/* Top Row Header Block inside Card */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Order Token:
                    </span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-tight font-mono">
                      {order.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 font-bold text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>{order.date}</span>
                  </div>
                </div>

                {/* Middle Row Content Architecture */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                        Sold By
                      </span>
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 tracking-tight group-hover:text-primary transition-colors duration-200">
                        {order.vendor}
                      </p>
                    </div>

                    {/* Embedded Meta Pill Indicators */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-muted border border-border/40 px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                        <span>
                          {totalItemsCount} {totalItemsCount === 1 ? "Item" : "Items"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator Pillar Block — Flat, thematic look */}
                  <div className="shrink-0 flex sm:justify-end">
                    <span className="inline-flex items-center h-8 px-3.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border bg-muted text-zinc-600 dark:text-zinc-300 border-border/60">
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Bottom Row Pricing Coordinates & Dynamic Footer Button Row */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none mb-1">
                      Total Invoice Amount
                    </span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                      UGX {order.total.toLocaleString()}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-4 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold shadow-xs transition-all duration-200 hover:bg-primary dark:hover:bg-primary dark:hover:text-white active:scale-95 cursor-pointer"
                  >
                    <span>View Order</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}