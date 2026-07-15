"use client";

import { ArrowRight, Calendar, Layers, Package } from "lucide-react";
import Link from "next/link";
import { useUserData } from "@/providers/UserDataProvider";
import { Skeleton } from "@/components/ui/skeleton";

function OrdersSkeleton() {
  return (
    <div className="max-w-8xl w-full mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="border-b border-border/60 pb-6 space-y-2">
        <Skeleton className="h-7 w-48 rounded-md" />
        <Skeleton className="h-3 w-72 rounded-md" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-[24px] border border-border/60 p-5 sm:p-6 space-y-4"
          >
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
            <div className="flex justify-between pt-4 border-t border-border/60">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { orders, ordersLoading } = useUserData();

  if (ordersLoading && orders.length === 0) return <OrdersSkeleton />;

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 py-10 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Track Your Orders
          </h1>
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
            {orders.length > 0
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""} placed`
              : "Check the status of your items coming from different dukas."}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="max-w-8xl w-full mx-auto">
          <div className="bg-card border border-border/60 rounded-[24px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Package className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  No orders placed yet
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  Your purchase history will appear here once you complete your first order.
                </p>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-95"
              >
                Browse Products
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const totalItems = order.items.reduce(
              (acc, item) => acc + item.quantity,
              0
            );

            return (
              <div
                key={order.id}
                className="group relative bg-card text-card-foreground rounded-[24px] border border-border/60 p-5 sm:p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:border-zinc-800/80 dark:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 flex flex-col gap-5"
              >
                {/* Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Order
                    </span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                      #{order.orderNumber}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 font-bold text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Middle Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 bg-muted border border-border/40 px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3" />
                        <span>
                          {totalItems} {totalItems === 1 ? "Item" : "Items"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center h-8 px-3.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        order.status === "DELIVERED"
                          ? "bg-emerald-500/5 text-emerald-600 border-emerald-500/20"
                          : order.status === "SHIPPED"
                            ? "bg-blue-500/5 text-blue-600 border-blue-500/20"
                            : "bg-amber-500/5 text-amber-600 border-amber-500/20"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider leading-none mb-1">
                      Total
                    </span>
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                      UGX {order.totalAmount.toLocaleString()}
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
          })}
        </div>
      )}
    </div>
  );
}