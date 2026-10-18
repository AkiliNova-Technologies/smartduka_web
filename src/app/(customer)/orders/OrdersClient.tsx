"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Calendar, Package } from "lucide-react";
import { useCustomerOrders } from "@/hooks/use-customer-orders";
import {
  fulfillmentSummary,
  paymentSummary,
} from "@/lib/customer-order-status";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const filters = [
  { value: "all", label: "All orders" },
  { value: "awaiting-payment", label: "Awaiting payment" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const href = (page: number, filter: string) => {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (filter !== "all") query.set("filter", filter);
  return `/orders${query.size ? `?${query}` : ""}`;
};

export function OrdersFallback() {
  return (
    <PageContainer className="py-6 pb-24 sm:py-8">
      <Skeleton className="h-16" />
      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}

export function OrdersClient({
  page,
  filter,
}: {
  page: number;
  filter: string;
}) {
  const { result, loading, error, retry } = useCustomerOrders(page, filter);
  const router = useRouter();
  useEffect(() => {
    if (loading || error || !result || result.data.length || page <= 1) return;
    router.replace(href(Math.max(1, result.meta.pageCount), filter), { scroll: false });
  }, [error, filter, loading, page, result, router]);
  return (
    <PageContainer className="py-6 pb-24 sm:py-8">
      <PageHeader
        title="My orders"
        description="Track your purchases, payments, and deliveries."
      />
      <nav
        aria-label="Order filters"
        className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={href(1, item.value)}
            aria-current={filter === item.value ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              filter === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}>
            {item.label}
          </Link>
        ))}
      </nav>
      {loading ? (
        <div className="mt-6 space-y-4" aria-label="Loading orders">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-7 rounded-xl border bg-card p-8 text-center">
          <AlertCircle className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-semibold">We couldn’t load your orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => void retry()}>
            Try again
          </Button>
        </div>
      ) : !result?.data.length && page === 1 ? (
        <div className="mt-7">
          <IllustratedEmptyState
            illustration="/illustrations/empty-orders.svg"
            title={filter === "all" ? "No orders yet" : "No matching orders"}
            description={
              filter === "all"
                ? "Your purchases will appear here after you place an order."
                : "Try another filter to find your orders."
            }
            action={
              filter === "all"
                ? { label: "Start shopping", href: "/products" }
                : { label: "View all orders", href: "/orders" }
            }
            size="standard"
          />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {result?.data.map((order) => {
              const payment = paymentSummary(order.paymentStatus);
              const fulfillment = fulfillmentSummary(order.subOrders);
              const itemCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              const previews = order.items.slice(0, 3);
              return (
                <article
                  key={order.id}
                  className="rounded-xl border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div
                        className="hidden shrink-0 -space-x-3 sm:flex"
                        aria-label={`${itemCount} purchased items`}>
                        {previews.length ? (
                          previews.map((item, index) =>
                            item.image ? (
                              <Image
                                key={item.id}
                                src={item.image}
                                alt=""
                                width={64}
                                height={64}
                                className="size-14 rounded-lg border-2 border-card object-cover"
                                style={{ zIndex: previews.length - index }}
                              />
                            ) : (
                              <span
                                key={item.id}
                                className="grid size-14 place-items-center rounded-lg border-2 border-card bg-muted">
                                <Package className="size-5 text-muted-foreground" />
                              </span>
                            ),
                          )
                        ) : (
                          <span className="grid size-14 place-items-center rounded-lg bg-muted">
                            <Package className="size-5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold">
                          Order #{order.orderNumber}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-UG",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                          <span>
                            {itemCount
                              ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
                              : "Item details unavailable"}{" "}
                            · {order.subOrders.length} shop
                            {order.subOrders.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {previews.length > 0 && (
                          <p className="mt-2 truncate text-sm">
                            {previews
                              .map((item) => `${item.quantity}× ${item.name}`)
                              .join(" · ")}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Payment:</span>
                            <StatusBadge tone={payment.tone}>{payment.label}</StatusBadge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Fulfillment:</span>
                            <StatusBadge tone={fulfillment.tone}>{fulfillment.label}</StatusBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-4 border-t pt-4 lg:min-w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Order total
                        </p>
                        <PriceDisplay price={order.totalAmount} />
                      </div>
                      <Button asChild variant="outline" className="rounded-full px-4">
                        <Link href={`/orders/${order.id}`}>
                          View order <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            page={page}
            pageCount={result?.meta.pageCount ?? 0}
            filter={filter}
          />
        </>
      )}
    </PageContainer>
  );
}

function Pagination({
  page,
  pageCount,
  filter,
}: {
  page: number;
  pageCount: number;
  filter: string;
}) {
  if (pageCount <= 1 && page <= 1) return null;
  return (
    <nav
      aria-label="Order history pages"
      className="mt-6 flex items-center justify-between gap-3">
      <Button asChild={page > 1} variant="outline" disabled={page <= 1}>
        {page > 1 ? (
          <Link href={href(page - 1, filter)}>Previous</Link>
        ) : (
          <span>Previous</span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {Math.max(1, pageCount)}
      </span>
      <Button
        asChild={page < pageCount}
        variant="outline"
        disabled={page >= pageCount}>
        {page < pageCount ? (
          <Link href={href(page + 1, filter)}>Next</Link>
        ) : (
          <span>Next</span>
        )}
      </Button>
    </nav>
  );
}
