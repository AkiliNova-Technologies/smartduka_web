"use client";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { useUserData } from "@/providers/UserDataProvider";
import { PageContainer } from "@/components/marketplace/page-container";
import { PageHeader } from "@/components/marketplace/page-header";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
const payment = (s: string) =>
  s === "COMPLETED"
    ? ["Paid", "success"]
    : s === "FAILED"
      ? ["Payment failed", "danger"]
      : (["Awaiting payment", "warning"] as const);
const fulfillment = (s: string) =>
  s === "DELIVERED"
    ? ["Delivered", "success"]
    : s === "CANCELLED"
      ? ["Cancelled", "danger"]
      : s === "SHIPPED"
        ? ["Shipped", "info"]
        : s === "PROCESSING"
          ? ["Preparing", "info"]
          : (["Awaiting fulfillment", "warning"] as const);
export default function OrdersPage() {
  const { orders, ordersLoading } = useUserData();
  if (ordersLoading && !orders.length)
    return (
      <PageContainer className="py-8">
        <Skeleton className="h-20" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </PageContainer>
    );
  return (
    <PageContainer className="py-6 pb-24 sm:py-8">
      <PageHeader
        title="My orders"
        description="View and track your purchases."
      />
      {!orders.length ? (
        <div className="mt-7">
          <IllustratedEmptyState
            illustration="/illustrations/empty-orders.svg"
            title="No orders yet"
            description="Your purchases will appear here after you place an order."
            action={{ label: "Start shopping", href: "/products" }}
            size="standard"
          />
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {orders.map((order) => {
            const [pay, payTone] = payment(order.paymentStatus);
            const [ship, shipTone] = fulfillment(order.status);
            const itemCount = order.items.reduce(
              (n, item) => n + item.quantity,
              0,
            );
            return (
              <article key={order.id} className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">
                      Order #{order.orderNumber}
                    </h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {new Date(order.createdAt).toLocaleDateString("en-UG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/10">
                    View order <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="mt-5 grid gap-4 border-y py-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Items</p>
                    <p className="mt-1 text-sm font-medium">
                      {itemCount} item{itemCount === 1 ? "" : "s"} from{" "}
                      {order.subOrders.length} shop
                      {order.subOrders.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <StatusBadge
                      tone={
                        payTone as
                          | "success"
                          | "danger"
                          | "warning"
                          | "info"
                          | "neutral"
                      }>
                      {pay}
                    </StatusBadge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery</p>
                    <StatusBadge
                      tone={
                        shipTone as
                          | "success"
                          | "danger"
                          | "warning"
                          | "info"
                          | "neutral"
                      }>
                      {ship}
                    </StatusBadge>
                  </div>
                </div>
                <div className="mt-4 flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Order total
                  </span>
                  <PriceDisplay price={order.totalAmount} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
