"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  MapPin,
  User,
  ShieldCheck,
  CreditCard,
  Wallet,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserData } from "@/providers/UserDataProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Step = "shipping" | "payment";

const DELIVERY_DISTRICTS = ["Nakawa", "Central", "Makindye", "Rubaga", "Kawempe"];
const PAYMENT_METHODS = [
  { id: "cod", label: "Cash on Delivery", icon: Wallet, desc: "Pay when your order arrives" },
  { id: "mtn", label: "MTN Mobile Money", icon: CreditCard, desc: "Pay securely via MoMo" },
  { id: "airtel", label: "Airtel Money", icon: CreditCard, desc: "Pay securely via Airtel Money" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, cartCount, clearCart, settings, placeOrder } = useUserData();
  const [step, setStep] = useState<Step>("shipping");

  // Shipping form
  const [fullName, setFullName] = useState(settings.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber || "");
  const [district, setDistrict] = useState(settings.deliveryDistrict || "");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deliveryFee = 0;
  const totalAmount = cartTotal + deliveryFee;

   const handlePlaceOrder = async () => {
  if (!fullName || !phoneNumber || !address) {
    toast.error("Please fill in all required fields.");
    return;
  }

  setIsSubmitting(true);

  const paymentGateway = paymentMethod === "cod"
    ? "CASH_ON_DELIVERY" as const
    : paymentMethod === "mtn"
      ? "MTN_MOMO" as const
      : "AIRTEL_MONEY" as const;

  const result = await placeOrder({
    items: cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      vendorId: item.vendorId,
    })),
    shippingAddress: address,
    shippingPhone: phoneNumber,
    paymentGateway,
    notes,
  });

  if (result.success) {
    clearCart();
    toast.success("Order placed successfully!");
    router.push("/orders");
  } else {
    toast.error(result.error || "Failed to place order.");
  }

  setIsSubmitting(false);
};

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Your cart is empty</h2>
          <p className="text-xs text-muted-foreground">Add items before checking out.</p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-4 h-9 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all"
        >
          Browse Products
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 selection:bg-emerald-500/10 selection:text-emerald-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="p-2 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-foreground">Checkout</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {cartCount} item{cartCount !== 1 ? "s" : ""} · UGX {cartTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 select-none">
        {(["shipping", "payment"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                step === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 border-zinc-900 dark:border-zinc-50"
                  : "bg-card text-muted-foreground border-border/60 hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                  step === s
                    ? "bg-white/20 border-white/20"
                    : "bg-muted border-border/40"
                )}
              >
                {i + 1}
              </span>
              {s === "shipping" ? "Delivery" : "Payment"}
            </button>
            {i === 0 && <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form */}
        <div className="lg:col-span-7 space-y-6">
          {step === "shipping" && (
            <div className="bg-card border border-border/60 rounded-[24px] p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <MapPin className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Delivery Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Full Name *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-10 rounded-full text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Phone Number *</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+256 7XX XXX XXX"
                    className="h-10 rounded-full text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Delivery District</Label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_DISTRICTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDistrict(d)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer",
                        district === d
                          ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 border-zinc-900 dark:border-zinc-50"
                          : "bg-card text-muted-foreground border-border/60 hover:bg-muted"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Street Address *</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot number, street name, landmark..."
                  rows={2}
                  className="rounded-2xl text-xs font-semibold resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Delivery Notes (optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Call when you arrive, leave with reception"
                  className="h-10 rounded-full text-xs font-semibold"
                />
              </div>

              <button
                onClick={() => setStep("payment")}
                disabled={!fullName || !phoneNumber || !address}
                className="w-full h-11 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full text-xs font-bold hover:bg-primary dark:hover:bg-primary dark:hover:text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                Continue to Payment
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {step === "payment" && (
            <div className="bg-card border border-border/60 rounded-[24px] p-6 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Wallet className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Payment Method</h2>
              </div>

              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left cursor-pointer",
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5"
                        : "border-border/60 hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        paymentMethod === method.id
                          ? "bg-primary text-white"
                          : "bg-muted text-zinc-400"
                      )}
                    >
                      <method.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground">{method.label}</p>
                      <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                    </div>
                    {paymentMethod === method.id && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Delivery summary */}
              <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-400">{address}, {district || "Kampala"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="text-zinc-600 dark:text-zinc-400">{fullName} · {phoneNumber}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("shipping")}
                  className="px-4 h-11 border border-border/60 rounded-full text-xs font-bold text-muted-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-primary text-primary-foreground rounded-full text-xs font-bold hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    "Placing Order..."
                  ) : (
                    <>
                      Place Order · UGX {totalAmount.toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-card border border-border/60 rounded-[24px] p-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 border-b border-border/40 pb-3">
              Order Summary
            </h3>

            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted border border-border/40 overflow-hidden relative shrink-0">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">
                    UGX {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-foreground">UGX {cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-primary font-bold uppercase text-[10px]">Free</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-base font-bold text-foreground">
                  UGX {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                Your payment is protected. Pay only after inspecting your items.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}