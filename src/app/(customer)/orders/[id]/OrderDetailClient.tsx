"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CreditCard, MapPin, Package, Truck } from "lucide-react";
import { useCustomerOrder } from "@/hooks/use-customer-orders";
import { authHeaders } from "@/lib/providers/useProviderFetch";
import {
  fulfillmentSummary,
  paymentSummary,
  subOrderFulfillmentLabel,
  uniqueFulfillmentText,
} from "@/lib/customer-order-status";
import { PageContainer } from "@/components/marketplace/page-container";
import {
  PriceDisplay,
  formatUGX,
} from "@/components/marketplace/price-display";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { DetailPageHeader } from "@/components/detail-page-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const providerName = (value: string) =>
  value === "MTN_MOMO"
    ? "MTN Mobile Money"
    : value === "AIRTEL_MONEY"
      ? "Airtel Money"
      : value.replaceAll("_", " ");
export function OrderDetailFallback() {
  return (
    <PageContainer className="py-6">
      <Skeleton className="h-16" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </PageContainer>
  );
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { order, state, error: loadError, retry } = useCustomerOrder(orderId);
  const [selected, setSelected] = useState<
    Record<string, "MTN_MOMO" | "AIRTEL_MONEY">
  >({});
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const hasPending = order?.subOrders.some((sub) =>
    sub.paymentIntents.some((intent) =>
      ["CREATED", "PENDING", "SUBMITTED"].includes(intent.status),
    ),
  );
  useEffect(() => {
    if (!hasPending) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      void retry();
      if (count >= 12) window.clearInterval(timer);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasPending, retry]);
  if (state === "loading") return <OrderDetailFallback />;
  if (state === "not-found")
    return (
      <State
        title="Order not found"
        description="This order does not exist or is not available for this account."
      />
    );
  if (state === "error" || !order)
    return (
      <State
        title="We couldn’t load this order"
        description={loadError ?? "Please try again."}
        retry={() => void retry()}
      />
    );
  
  const paid = order.subOrders.filter((sub) =>
    sub.paymentIntents.some((intent) => intent.status === "SUCCESSFUL"),
  ).length;
  const pay = async (
    subOrderId: string,
    provider: "MTN_MOMO" | "AIRTEL_MONEY",
  ) => {
    if (
      order.subOrders
        .find((sub) => sub.id === subOrderId)
        ?.paymentIntents.some((intent) => intent.status === "REVERSED")
    ) {
      setPaymentError(
        "There is an issue with this payment and it is being reviewed. Do not pay again yet.",
      );
      return;
    }
    setBusy(subOrderId);
    setPaymentError("");
    try {
      const response = await fetch(`/api/v1/orders/${order.id}/payments`, {
        method: "POST",
        headers: { ...authHeaders(), "content-type": "application/json" },
        body: JSON.stringify({
          subOrderId,
          provider,
          paymentRequestId: crypto.randomUUID(),
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message || "Unable to start this payment.");
      await retry();
    } catch (cause) {
      setPaymentError(
        cause instanceof Error
          ? cause.message
          : "Unable to start this payment.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <PageContainer className="py-6 pb-24 sm:py-8">
      <DetailPageHeader
        backHref="/orders"
        backLabel="Back to orders"
        title={`Order #${order.orderNumber}`}
        description={new Date(order.createdAt).toLocaleDateString("en-UG", {
          dateStyle: "long",
        })}>
      </DetailPageHeader>
      {paymentError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 p-3 text-sm text-destructive">
          {paymentError}
        </p>
      )}
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-5" aria-label="Items by shop">
          {order.subOrders.map((sub) => {
            const items = order.items.filter(
              (item) => item.subOrderId === sub.id,
            );
            const intent = sub.paymentIntents[0];
            const status = intent?.status ?? "PENDING";
            const subPayment = paymentSummary(status);
            const provider = selected[sub.id] ?? sub.paymentOptions[0];
            const pickup = sub.fulfillmentMethod === "PICKUP";
            const subFulfillment = fulfillmentSummary([{ status: sub.status }]);
            const location = pickup
              ? uniqueFulfillmentText(sub.branchName, sub.pickupLocation).join(
                  " · ",
                )
              : sub.deliveryAddress;
            const fulfillmentDetails = uniqueFulfillmentText(
              location,
              pickup ? sub.pickupDirections : null,
              pickup ? sub.pickupInstructions : sub.deliveryInstructions,
            );
            return (
              <article
                key={sub.id}
                className="overflow-hidden rounded-xl border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div>
                    <h2 className="font-semibold">{sub.vendorName}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sub.subOrderNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <StatusLabel
                      label="Payment"
                      tone={subPayment.tone}
                      value={subPayment.label}
                    />
                    <StatusLabel
                      label="Fulfillment"
                      tone={subFulfillment.tone}
                      value={subOrderFulfillmentLabel(
                        sub.status,
                        sub.fulfillmentMethod,
                      )}
                    />
                  </div>
                </div>
                <Separator />
                <div className="divide-y">
                  {items.length ? (
                    items.map((item) => (
                      <div key={item.id} className="flex gap-4 p-4 sm:p-5">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt=""
                            width={80}
                            height={80}
                            className="size-20 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-muted">
                            <Package className="size-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          {item.variantName && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.variantName}
                            </p>
                          )}
                          {item.variantOptions && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {Object.entries(item.variantOptions)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(" · ")}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
                            <span>
                              {item.quantity} × {formatUGX(item.price)}
                            </span>
                            <span className="font-semibold">
                              {formatUGX(item.lineTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 text-sm text-muted-foreground">
                      Product details are unavailable for this historical order.
                      The persisted shop total and payment record are shown
                      below.
                    </div>
                  )}
                </div>
                <Separator />
                <div className="p-5">
                  <div className="rounded-xl bg-muted/50 p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {pickup ? (
                        <MapPin className="size-4" />
                      ) : (
                        <Truck className="size-4" />
                      )}
                      {pickup ? "Pickup" : "Delivery"}
                    </div>
                    {fulfillmentDetails.length ? (
                      fulfillmentDetails.map((detail, index) => (
                        <p
                          key={`${index}-${detail}`}
                          className={
                            index === 0
                              ? "mt-2 text-muted-foreground"
                              : "mt-1 text-xs text-muted-foreground"
                          }>
                          {detail}
                        </p>
                      ))
                    ) : (
                      <p className="mt-2 text-muted-foreground">
                        {pickup
                          ? "Pickup details pending"
                          : "Delivery address unavailable"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Contact: {sub.fulfillmentContact}
                    </p>
                  </div>
                  {status === "REVERSED" ? (
                    <div className="mt-4 text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">
                        Payment reversed — review required
                      </p>
                      <p className="mt-1 text-xs">
                        Do not pay again while this payment is being reviewed.
                      </p>
                    </div>
                  ) : (
                    status !== "SUCCESSFUL" && (
                      <div className="mt-4">
                        <p className="text-sm font-medium">
                          Choose payment method
                        </p>
                        {sub.paymentOptions.length ? (
                          <>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {sub.paymentOptions.map((option) => (
                                <Button
                                  key={option}
                                  size="sm"
                                  variant={
                                    provider === option ? "default" : "outline"
                                  }
                                  onClick={() =>
                                    setSelected((current) => ({
                                      ...current,
                                      [sub.id]: option,
                                    }))
                                  }>
                                  {providerName(option)}
                                </Button>
                              ))}
                            </div>
                            <Button
                              className="mt-4"
                              disabled={
                                !provider ||
                                busy === sub.id ||
                                ["CREATED", "PENDING", "SUBMITTED"].includes(
                                  status,
                                )
                              }
                              onClick={() =>
                                provider && void pay(sub.id, provider)
                              }>
                              {busy === sub.id
                                ? "Sending request…"
                                : ["CREATED", "PENDING", "SUBMITTED"].includes(
                                      status,
                                    )
                                  ? "Waiting for confirmation"
                                  : "Pay now"}
                            </Button>
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-destructive">
                            Payment is temporarily unavailable for this seller.
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </section>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              <h2 className="font-semibold">Order summary</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <SummaryRow label="Items" value={formatUGX(order.subTotal)} />
              <SummaryRow
                label="Delivery"
                value={formatUGX(order.totalShipping)}
              />
              {order.discountAmount > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`−${formatUGX(order.discountAmount)}`}
                />
              )}
              {order.taxAmount > 0 && (
                <SummaryRow label="Tax" value={formatUGX(order.taxAmount)} />
              )}
              <Separator />
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span>Total</span>
                <PriceDisplay price={order.totalAmount} />
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              {paid} of {order.subOrders.length} seller payments confirmed. Each
              seller is paid directly to their verified merchant account;
              Mwezora does not hold your funds.
            </p>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function StatusLabel({
  label,
  tone,
  value,
}: {
  label: string;
  tone: Parameters<typeof StatusBadge>[0]["tone"];
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <StatusBadge tone={tone}>{value}</StatusBadge>
    </div>
  );
}
function State({
  title,
  description,
  retry,
}: {
  title: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <PageContainer className="py-12">
      <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center">
        <AlertCircle className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-center gap-3">
          {retry && <Button onClick={retry}>Try again</Button>}
          <Button asChild variant="outline">
            <Link href="/orders">Back to orders</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
