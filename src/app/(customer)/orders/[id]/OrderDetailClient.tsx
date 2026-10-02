"use client";

import Link from "next/link";
import { ChevronLeft, CreditCard, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/marketplace/media-image";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/media";
import { useUserData } from "@/providers/UserDataProvider";
import { PageContainer } from "@/components/marketplace/page-container";
import { PriceDisplay } from "@/components/marketplace/price-display";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { ReviewDialog } from "@/components/reviews/ReviewDialog";
import { Skeleton } from "@/components/ui/skeleton";

const payment = (value: string) => value === "COMPLETED" ? ["Paid", "success"] : value === "FAILED" ? ["Payment failed", "danger"] : ["Payment verification pending", "warning"] as const;

export function OrderDetailFallback() {
  return <PageContainer className="py-6 pb-24 sm:py-8"><Skeleton className="h-10 w-28" /><div className="mt-4 flex justify-between border-b pb-6"><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-40" /></div><Skeleton className="h-7 w-24" /></div><div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div></PageContainer>;
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { orders, ordersLoading, refreshOrders } = useUserData();
  const order = orders.find((item) => item.id === orderId);
  if (ordersLoading && !orders.length) return <OrderDetailFallback />;
  if (!order) notFound();
  const [pay, payTone] = payment(order.paymentStatus);
  const groups = Object.entries(order.items.reduce<Record<string, typeof order.items>>((all, item) => { (all[item.subOrderId] ||= []).push(item); return all; }, {}));
  return <PageContainer className="py-6 pb-24 sm:py-8"><Link href="/orders" className="inline-flex h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />My orders</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b pb-6"><div><h1 className="text-2xl font-semibold">Order #{order.orderNumber}</h1><p className="mt-1 text-sm text-muted-foreground">Placed {new Date(order.createdAt).toLocaleDateString("en-UG", { month: "long", day: "numeric", year: "numeric" })}</p></div><StatusBadge tone={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>{order.status.replaceAll("_", " ")}</StatusBadge></div><div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]"><section className="space-y-6">{groups.map(([subOrderId, items]) => { const subOrder = order.subOrders.find((candidate) => candidate.id === subOrderId); return <div key={subOrderId} className="rounded-xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3"><h2 className="font-semibold">Sold by {items[0].vendorName}</h2>{subOrder?.canReview ? <ReviewDialog kind="shop" purchaseId={subOrder.id} label={items[0].vendorName} existing={subOrder.review} onSaved={() => void refreshOrders()} /> : null}</div><div className="divide-y">{items.map((item) => <div key={item.id} className="flex gap-3 p-4"><div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted"><MediaImage src={item.image} fallback={PRODUCT_IMAGE_FALLBACK} alt={item.name} fill sizes="64px" className="object-cover" fallbackClassName="object-contain p-2" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.variantName ? `${item.variantName} · ` : ""}Quantity {item.quantity}</p>{item.canReview ? <ReviewDialog kind="product" purchaseId={item.id} label={item.name} image={item.image} variantName={item.variantName} existing={item.review} onSaved={() => void refreshOrders()} /> : null}</div><PriceDisplay price={item.price * item.quantity} /></div>)}</div></div>; })}</section><aside className="space-y-4"><div className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2"><CreditCard className="size-4 text-primary" /><h2 className="font-semibold">Payment</h2></div><div className="mt-3"><StatusBadge tone={payTone as "success" | "danger" | "warning" | "info" | "neutral"}>{pay}</StatusBadge><p className="mt-2 text-sm text-muted-foreground">Paid securely through {order.paymentGateway === "PESAPAL" ? "Pesapal" : "SmartDuka"}.</p></div></div><div className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2"><Truck className="size-4 text-primary" /><h2 className="font-semibold">Order total</h2></div><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Products</span><PriceDisplay price={order.subTotal} /></div><div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><PriceDisplay price={order.totalShipping} /></div><div className="flex justify-between border-t pt-3 font-semibold"><span>Total</span><PriceDisplay price={order.totalAmount} size="large" /></div></div></div></aside></div></PageContainer>;
}
