"use client";

import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { MediaImage } from "@/components/marketplace/media-image";
import { PRODUCT_IMAGE_FALLBACK } from "@/lib/media";
import { ArrowLeft, MapPin, ShoppingBag, Truck } from "lucide-react";
import { toast } from "sonner";
import { useUserData } from "@/providers/UserDataProvider";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import { Button } from "@/components/ui/button";
import { authHeaders } from "@/lib/providers/useProviderFetch";
import { PriceDisplay } from "@/components/marketplace/price-display";

const subscribeAfterHydration = () => () => {};
type ShopFulfillment = { id: string; storeName: string; fulfillmentMethods: ("DELIVERY" | "PICKUP")[]; deliveryFee: number; deliveryEstimate: string | null; pickupLocation: string | null; pickupDirections: string | null; pickupInstructions: string | null; returnWindowDays: number; returnPolicy: string | null; acceptsExchanges: boolean; exchangePolicy: string | null };

function useHydrated() {
  return useSyncExternalStore(subscribeAfterHydration, () => true, () => false);
}

export default function CheckoutPage() {
  const {
    cart,
    cartCount,
    cartTotal,
    clearCart,
    settings,
    placeOrder,
    cartLoading,
  } = useUserData();
  const { user } = useAuth();
  const hasHydrated = useHydrated();
  const [fullName, setFullName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<"PESAPAL">("PESAPAL");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shops, setShops] = useState<ShopFulfillment[]>([]);
  const [fulfillment, setFulfillment] = useState<Record<string, "DELIVERY" | "PICKUP">>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const checkoutRequestId = useRef<string | null>(null);
  const paymentInitiationRequestId = useRef<string | null>(null);
  const [checkoutIdsReady, setCheckoutIdsReady] = useState(false);

  const filledFullName = fullName ?? settings.fullName ?? user?.displayName ?? "";
  const filledPhoneNumber =
    phoneNumber ?? settings.phoneNumber ?? user?.phoneNumber ?? "";
  const filledDistrict = district ?? settings.deliveryDistrict ?? "";
  const vendorIds = [...new Set(cart.map((item) => item.vendorId))];
  const vendorIdKey = vendorIds.join(",");
  const hasDelivery = Object.values(fulfillment).includes("DELIVERY");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      checkoutRequestId.current ??= crypto.randomUUID();
      paymentInitiationRequestId.current ??= crypto.randomUUID();
      setCheckoutIdsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!vendorIdKey) return;
    const params = new URLSearchParams(); vendorIdKey.split(",").forEach((vendorId) => params.append("vendorId", vendorId));
    fetch(`/api/checkout/fulfillment?${params}`, { headers: authHeaders() }).then((response) => response.json()).then((body) => {
      const next = (body?.data?.shops ?? []) as ShopFulfillment[];
      setShops(next);
      setFulfillment((current) => Object.fromEntries(next.map((shop) => [shop.id, current[shop.id] && shop.fulfillmentMethods.includes(current[shop.id]) ? current[shop.id] : (shop.fulfillmentMethods.includes("DELIVERY") ? "DELIVERY" : "PICKUP")])) as Record<string, "DELIVERY" | "PICKUP">);
    }).catch(() => setShops([]));
  }, [vendorIdKey]);

  const startPayment = async () => {
    const checkoutId = checkoutRequestId.current;
    const paymentInitiationId = paymentInitiationRequestId.current;
    if (!checkoutIdsReady || !checkoutId || !paymentInitiationId) return;
    const nextErrors: Record<string, string> = {};
    if (!filledFullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!filledPhoneNumber.trim()) nextErrors.phoneNumber = "Enter a phone number.";
    if (hasDelivery && !address.trim()) nextErrors.address = "Enter a delivery address.";
    if (shops.length !== vendorIds.length) nextErrors.fulfillment = "Fulfilment options are still loading. Please try again.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      (nextErrors.fullName
        ? fullNameRef
        : nextErrors.phoneNumber
          ? phoneRef
          : addressRef
      ).current?.focus();
      return;
    }
    if (!cart.length) return;
    setIsSubmitting(true);
    const shippingAddress = [
      filledFullName.trim(),
      filledDistrict.trim(),
      address.trim(),
    ]
      .filter(Boolean)
      .join(" · ");
    const result = await placeOrder({
      items: cart.map(({ productId, variantId, quantity }) => ({
        productId,
        variantId,
        quantity,
      })),
      checkoutRequestId: checkoutId,
      shippingAddress,
      shippingPhone: filledPhoneNumber.trim(),
      paymentGateway: "PESAPAL",
      fulfillmentSelections: Object.entries(fulfillment).map(([vendorId, method]) => ({ vendorId, method })),
      notes: notes.trim() || undefined,
    });
    if (!result.success || !result.orderId) {
      toast.error(
        result.error || "We could not create your order. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          orderId: result.orderId,
          initiationRequestId: paymentInitiationId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      const redirectUrl = body?.data?.redirectUrl;
      if (!response.ok || typeof redirectUrl !== "string")
        throw new Error(body?.error || "Unable to start Pesapal.");
      clearCart();
      window.location.assign(redirectUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start Pesapal.",
      );
      setIsSubmitting(false);
    }
  };

  if (!cartLoading && cart.length === 0)
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <ShoppingBag className="mb-4 size-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add an item before starting checkout.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
          Browse products
        </Link>
      </main>
    );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:py-10">
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,13fr)_minmax(20rem,7fr)] lg:items-start lg:gap-8">
        <section className="min-w-0">
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex h-10 items-center rounded-full border border-border px-3 gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Checkout
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Contact and delivery details
              </p>
            </div>
          </div>
          <section
            className="mt-6 rounded-2xl border bg-card p-5 sm:p-6"
            aria-labelledby="delivery-details">
            <h2 id="delivery-details" className="text-lg font-semibold">
              Delivery information
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Full name"
                id="full-name"
                value={filledFullName}
                onChange={(value) => {
                  setFullName(value);
                  setErrors((current) => ({ ...current, fullName: "" }));
                }}
                placeholder="Your full name"
                inputRef={fullNameRef}
                error={errors.fullName}
              />
              <Field
                label="Phone number"
                id="phone-number"
                value={filledPhoneNumber}
                onChange={(value) => {
                  setPhoneNumber(value);
                  setErrors((current) => ({ ...current, phoneNumber: "" }));
                }}
                placeholder="+256 7XX XXX XXX"
                inputRef={phoneRef}
                error={errors.phoneNumber}
              />
              <Field
                label="District / area"
                id="delivery-district"
                value={filledDistrict}
                onChange={setDistrict}
                placeholder="e.g. Nakawa"
              />
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="delivery-address">Delivery address</Label>
              <Textarea
                ref={addressRef}
                id="delivery-address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setErrors((current) => ({ ...current, address: "" }));
                }}
                placeholder="Building, street, and a helpful landmark"
                rows={3}
                aria-invalid={!!errors.address}
                aria-describedby={
                  errors.address ? "delivery-address-error" : undefined
                }
                className="rounded-xl bg-background px-3 py-2.5"
              />
              <FieldError id="delivery-address-error">
                {errors.address}
              </FieldError>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="delivery-notes">
                Delivery notes{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="delivery-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Call when you arrive"
                className="h-11 rounded-full px-4"
              />
            </div>
          </section>
          <section className="mt-5 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="fulfilment-options">
            <h2 id="fulfilment-options" className="text-lg font-semibold">How you’ll receive each order</h2>
            <div className="mt-4 space-y-3">{shops.map((shop) => <div key={shop.id} className="min-w-0 rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words font-medium">{shop.storeName}</p><span className="shrink-0 text-xs text-muted-foreground">{fulfillment[shop.id] === "PICKUP" ? "No delivery fee" : `UGX ${shop.deliveryFee.toLocaleString()}`}</span></div><div className="mt-3 flex flex-wrap gap-2">{shop.fulfillmentMethods.map((method) => <Button key={method} type="button" size="sm" variant={fulfillment[shop.id] === method ? "default" : "outline"} className="min-h-11 rounded-full" onClick={() => setFulfillment((current) => ({ ...current, [shop.id]: method }))}>{method === "DELIVERY" ? <Truck className="mr-1.5 size-3.5" /> : <MapPin className="mr-1.5 size-3.5" />}{method === "DELIVERY" ? "Delivery" : "Pickup"}</Button>)}</div>{fulfillment[shop.id] === "PICKUP" && <p className="mt-3 break-words text-xs text-muted-foreground"><span className="font-medium text-foreground">Collect from:</span> {shop.pickupLocation}{shop.pickupDirections ? ` · ${shop.pickupDirections}` : ""}{shop.pickupInstructions ? ` · ${shop.pickupInstructions}` : ""}</p>}{fulfillment[shop.id] === "DELIVERY" && shop.deliveryEstimate && <p className="mt-3 break-words text-xs text-muted-foreground">Estimated delivery: {shop.deliveryEstimate}</p>}{shop.returnPolicy && <p className="mt-3 break-words text-xs text-muted-foreground">Returns: {shop.returnWindowDays} days · {shop.acceptsExchanges ? "Exchanges available" : "Refund/return policy applies"}</p>}</div>)}</div>
            {errors.fulfillment && <FieldError id="fulfilment-error">{errors.fulfillment}</FieldError>}
          </section>
          <section
            className="mt-5 rounded-2xl border bg-card p-5"
            aria-labelledby="payment-method">
            <h2 id="payment-method" className="text-lg font-semibold">
              Payment method
            </h2>
            <div role="radiogroup" aria-labelledby="payment-method" className="mt-4">
              <label
                className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${selectedPaymentGateway === "PESAPAL" ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50 hover:bg-muted/40"} ${isSubmitting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  name="payment-method"
                  value="PESAPAL"
                  checked={selectedPaymentGateway === "PESAPAL"}
                  onChange={() => setSelectedPaymentGateway("PESAPAL")}
                  disabled={isSubmitting}
                  className="sr-only"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold">Pesapal</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay securely with card, Mobile Money, or other available methods.
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selectedPaymentGateway === "PESAPAL" ? "border-primary" : "border-muted-foreground/50"}`}>
                  {selectedPaymentGateway === "PESAPAL" && <span className="size-2.5 rounded-full bg-primary" />}
                </span>
              </label>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              You’ll continue to Pesapal to complete payment securely.
            </p>
          </section>
        </section>
        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {cartCount} item{cartCount === 1 ? "" : "s"}
          </p>
          <div className="mt-4 space-y-3 border-y py-4">
            {cart.map((item) => (
              <div
                key={`${item.productId}:${item.variantId ?? "simple"}`}
                className="flex gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <MediaImage
                    src={item.image}
                    fallback={PRODUCT_IMAGE_FALLBACK}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                    fallbackClassName="object-contain p-2"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-sm font-medium">{item.name}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {item.variantName ? `${item.variantName} · ` : ""}Qty{" "}
                    {item.quantity}
                  </p>
                </div>
                <PriceDisplay
                  price={item.price * item.quantity}
                  size="default"
                  className="shrink-0 text-right"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2 py-4 text-sm border-b mb-4">
            <div className="flex justify-between gap-4">
              <span className="min-w-0 text-muted-foreground">Items subtotal</span>
              <PriceDisplay price={cartTotal} className="shrink-0 text-right" />
            </div>
            <div className="flex justify-between gap-4">
              <span className="min-w-0 text-muted-foreground">Fulfilment</span>
              <span className="shrink-0 text-right text-xs font-medium text-muted-foreground">Calculated securely</span>
            </div>
          </div>
          <div className="sticky bottom-0 z-30 -mx-5 mt-5 border-t bg-card/95 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mx-0 lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <Button
              onClick={startPayment}
              disabled={!hasHydrated || !checkoutIdsReady || isSubmitting || cartLoading || !cart.length}
              className="h-12 w-full rounded-full">
              {isSubmitting ? "Preparing secure payment…" : "Continue to Pesapal"}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  inputRef,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-11 rounded-full px-4"
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
