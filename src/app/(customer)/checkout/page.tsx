"use client";

import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
type BranchOption = { id: string; name: string; isPrimary: boolean; pickupEnabled: boolean; deliveryEnabled: boolean; addressLine: string | null; district: string | null; city: string | null; pickupInstructions: string | null; deliveryFee: number | null; deliveryEstimate: string | null };
type ShopFulfillment = { id: string; storeName: string; configurationMode: "BRANCH" | "LEGACY"; fulfillmentMethods: ("DELIVERY" | "PICKUP")[]; deliveryFee: number; deliveryEstimate: string | null; pickupLocation: string | null; pickupDirections: string | null; pickupInstructions: string | null; returnWindowDays: number; returnPolicy: string | null; acceptsExchanges: boolean; exchangePolicy: string | null; branches: BranchOption[] };

function useHydrated() {
  return useSyncExternalStore(subscribeAfterHydration, () => true, () => false);
}

export default function CheckoutPage() {
  const router = useRouter();
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shops, setShops] = useState<ShopFulfillment[]>([]);
  const [fulfillment, setFulfillment] = useState<Record<string, "DELIVERY" | "PICKUP">>({});
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({});
  const [branchAvailability, setBranchAvailability] = useState<Record<string, "AVAILABLE" | "INSUFFICIENT_STOCK" | "UNAVAILABLE" | "INACTIVE">>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const checkoutRequestId = useRef<string | null>(null);
  const [checkoutIdsReady, setCheckoutIdsReady] = useState(false);

  const filledFullName = fullName ?? settings.fullName ?? user?.displayName ?? "";
  const filledPhoneNumber =
    phoneNumber ?? settings.phoneNumber ?? user?.phoneNumber ?? "";
  const filledDistrict = district ?? settings.deliveryDistrict ?? "";
  const vendorIds = [...new Set(cart.map((item) => item.vendorId))];
  const vendorIdKey = vendorIds.join(",");
  const basketAvailabilityKey = JSON.stringify(cart.map(({ vendorId, productId, variantId, quantity }) => ({ vendorId, productId, variantId: variantId ?? null, quantity })));
  const hasDelivery = Object.values(fulfillment).includes("DELIVERY");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      checkoutRequestId.current ??= crypto.randomUUID();
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
      setFulfillment((current) => Object.fromEntries(next.flatMap((shop) => { const method = current[shop.id] && shop.fulfillmentMethods.includes(current[shop.id]) ? current[shop.id] : shop.fulfillmentMethods.includes("DELIVERY") ? "DELIVERY" : shop.fulfillmentMethods.includes("PICKUP") ? "PICKUP" : null; return method ? [[shop.id, method]] : []; })) as Record<string, "DELIVERY" | "PICKUP">);
      setSelectedBranches((current) => Object.fromEntries(next.map((shop) => {
        const method = shop.fulfillmentMethods.includes("DELIVERY") ? "DELIVERY" : "PICKUP";
        const eligible = shop.branches.filter((branch) => method === "DELIVERY" ? branch.deliveryEnabled : branch.pickupEnabled);
        return [shop.id, eligible.some((branch) => branch.id === current[shop.id]) ? current[shop.id] : (eligible.find((branch) => branch.isPrimary) ?? eligible[0])?.id ?? ""];
      })));
    }).catch(() => setShops([]));
  }, [vendorIdKey]);

  useEffect(() => {
    if (!cart.length) return;
    const controller = new AbortController();
    const grouped = [...new Set(cart.map((item) => item.vendorId))].map((vendorId) => ({ vendorId, method: fulfillment[vendorId], district: filledDistrict || undefined, items: cart.filter((item) => item.vendorId === vendorId).map(({ productId, variantId, quantity }) => ({ productId, variantId: variantId ?? null, quantity })) }));
    fetch("/api/checkout/fulfillment", { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ shops: grouped }), signal: controller.signal })
      .then((response) => response.json()).then((body) => {
        const statuses = Object.fromEntries((body?.data?.shops ?? []).flatMap((shop: { branches: Array<{ id: string; status: "AVAILABLE" | "INSUFFICIENT_STOCK" | "UNAVAILABLE" | "INACTIVE" }> }) => shop.branches.map((branch) => [branch.id, branch.status])));
        setBranchAvailability(statuses);
        setSelectedBranches((current) => Object.fromEntries(Object.entries(current).map(([vendorId, branchId]) => {
          if (statuses[branchId] === "AVAILABLE") return [vendorId, branchId];
          const replacement = shops.find((shop) => shop.id === vendorId)?.branches.find((branch) => statuses[branch.id] === "AVAILABLE");
          return [vendorId, replacement?.id ?? ""];
        })));
      }).catch((error) => { if (error instanceof Error && error.name !== "AbortError") setBranchAvailability({}); });
    return () => controller.abort();
  // The serialized basket intentionally drives revalidation after any item or quantity change.
  // cart is represented by basketAvailabilityKey so equivalent provider array identities do not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketAvailabilityKey, shops, fulfillment, filledDistrict]);

  const startPayment = async () => {
    const checkoutId = checkoutRequestId.current;
    if (!checkoutIdsReady || !checkoutId) return;
    const nextErrors: Record<string, string> = {};
    if (!filledFullName.trim()) nextErrors.fullName = "Enter your full name.";
    if (!filledPhoneNumber.trim()) nextErrors.phoneNumber = "Enter a phone number.";
    if (hasDelivery && !address.trim()) nextErrors.address = "Enter a delivery address.";
    if (shops.length !== vendorIds.length) nextErrors.fulfillment = "Fulfilment options are still loading. Please try again.";
    if (shops.some((shop) => shop.fulfillmentMethods.length === 0)) nextErrors.fulfillment = "A shop in your cart has no active fulfilment location. Remove its items or contact the seller.";
    if (shops.some((shop) => shop.configurationMode === "BRANCH" && !selectedBranches[shop.id])) nextErrors.fulfillment = "No branch can currently fulfil every item from one location.";
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
      deliveryDistrict: hasDelivery ? filledDistrict.trim() : undefined,
      // Checkout creates the order first. Seller-specific MTN payment setup
      // is selected afterwards on the order, never as one global cart rail.
      paymentGateway: "MTN_MOMO",
      fulfillmentSelections: Object.entries(fulfillment).map(([vendorId, method]) => ({ vendorId, method, branchId: selectedBranches[vendorId] || undefined, pickupContact: method === "PICKUP" ? filledPhoneNumber.trim() : undefined })),
      notes: notes.trim() || undefined,
    });
    if (!result.success || !result.orderId) {
      toast.error(
        result.error || "We could not create your order. Please try again.",
      );
      setIsSubmitting(false);
      return;
    }
    // Each vendor payment is initiated from its order detail/payment group.
    // Do not redirect through a marketplace gateway or claim payment client-side.
    clearCart();
    router.push(`/orders/${result.orderId}`);
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
              Contact information
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
              {hasDelivery && <Field
                label="District / area"
                id="delivery-district"
                value={filledDistrict}
                onChange={setDistrict}
                placeholder="e.g. Nakawa"
              />}
            </div>
            {hasDelivery && <div className="mt-4 space-y-2">
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
            </div>}
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
            <div className="mt-4 space-y-3">{shops.map((shop) => { const method = fulfillment[shop.id]; const eligibleBranches = shop.branches.filter((branch) => (method === "DELIVERY" ? branch.deliveryEnabled : branch.pickupEnabled) && branchAvailability[branch.id] !== "INACTIVE"); const branch = eligibleBranches.find((item) => item.id === selectedBranches[shop.id]) ?? eligibleBranches.find((item) => branchAvailability[item.id] === "AVAILABLE"); const fee = method === "PICKUP" ? 0 : branch?.deliveryFee ?? shop.deliveryFee; return <div key={shop.id} className="min-w-0 rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words font-medium">{shop.storeName}</p><span className="shrink-0 text-xs text-muted-foreground">{method === "PICKUP" ? "No delivery fee" : `UGX ${fee.toLocaleString()}`}</span></div><div className="mt-3 flex flex-wrap gap-2">{shop.fulfillmentMethods.map((option) => <Button key={option} type="button" size="sm" variant={method === option ? "default" : "outline"} className="min-h-11 rounded-full" onClick={() => { setFulfillment((current) => ({ ...current, [shop.id]: option })); const eligible = shop.branches.filter((item) => (option === "DELIVERY" ? item.deliveryEnabled : item.pickupEnabled) && branchAvailability[item.id] === "AVAILABLE"); setSelectedBranches((current) => ({ ...current, [shop.id]: (eligible.find((item) => item.isPrimary) ?? eligible[0])?.id ?? "" })); }}>{option === "DELIVERY" ? <Truck className="mr-1.5 size-3.5" /> : <MapPin className="mr-1.5 size-3.5" />}{option === "DELIVERY" ? "Delivery" : "Pickup"}</Button>)}</div>{eligibleBranches.length > 0 && <div className="mt-3"><Label htmlFor={`branch-${shop.id}`}>{method === "PICKUP" ? "Pickup location" : "Dispatch location"}</Label><select id={`branch-${shop.id}`} className="mt-1 h-11 w-full rounded-xl border bg-background px-3 text-sm" value={selectedBranches[shop.id] ?? ""} onChange={(event) => setSelectedBranches((current) => ({ ...current, [shop.id]: event.target.value }))}><option value="">Select a location</option>{eligibleBranches.map((item) => <option key={item.id} value={item.id} disabled={branchAvailability[item.id] !== "AVAILABLE"}>{item.name}{branchAvailability[item.id] !== "AVAILABLE" ? " — unavailable for this basket" : ""}</option>)}</select></div>}{shop.configurationMode === "BRANCH" && !branch && <p className="mt-3 text-xs text-destructive">No single location has every item in your basket.</p>}{method === "PICKUP" && branch && <p className="mt-3 break-words text-xs text-muted-foreground"><span className="font-medium text-foreground">Collect from:</span> {branch.addressLine ?? shop.pickupLocation}{branch.pickupInstructions ? ` · ${branch.pickupInstructions}` : shop.pickupInstructions ? ` · ${shop.pickupInstructions}` : ""}</p>}{method === "DELIVERY" && (branch?.deliveryEstimate ?? shop.deliveryEstimate) && <p className="mt-3 break-words text-xs text-muted-foreground">Estimated delivery: {branch?.deliveryEstimate ?? shop.deliveryEstimate}</p>}{shop.returnPolicy && <p className="mt-3 break-words text-xs text-muted-foreground">Returns: {shop.returnWindowDays} days · {shop.acceptsExchanges ? "Exchanges available" : "Refund/return policy applies"}</p>}</div>})}</div>
            {errors.fulfillment && <FieldError id="fulfilment-error">{errors.fulfillment}</FieldError>}
          </section>
          <section className="mt-5 rounded-2xl border bg-card p-5" aria-labelledby="payment-method">
            <h2 id="payment-method" className="text-lg font-semibold">Payment happens per shop</h2>
            <p className="mt-2 text-sm text-muted-foreground">After placing the order, choose an available payment method for each seller. Payments go directly to that seller’s verified merchant account.</p>
            <p className="mt-2 text-xs text-muted-foreground">Availability is confirmed per shop; marketplace payments are not enabled until direct merchant routing is verified.</p>
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
                    fallbackClassName="object-cover"
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
              {isSubmitting ? "Creating order…" : "Place order"}
            </Button>
            <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">By placing this order, you acknowledge the <Link href="/terms" className="text-primary hover:underline">Terms</Link> and the seller’s delivery and returns information.</p>
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
