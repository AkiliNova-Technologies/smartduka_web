"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Store,
  MapPin,
  Wallet,
  Link2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function VendorKycForm() {
  const router = useRouter();
  const { uid, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const businessType = "Sole Proprietorship";
  const registrationNumber = "";
  const taxId = "";

  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const website = "";

  const [streetAddress, setStreetAddress] = useState("");
  const city = "Kampala";
  const [district, setDistrict] = useState("");

  const [hasPhysicalStore, setHasPhysicalStore] = useState(false);
  const [storeLocation, setStoreLocation] = useState("");

  const [momoNetwork, setMomoNetwork] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [codAcknowledged, setCodAcknowledged] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleStoreNameChange = (name: string) => {
    setStoreName(name);
    setStoreSlug(generateSlug(name));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login first to submit a vendor application.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: uid,
        storeName,
        storeSlug,
        businessType,
        registrationNumber,
        taxId,
        businessEmail,
        businessPhone,
        website,
        streetAddress,
        city,
        district,
        hasPhysicalStore,
        storeLocation,
        momoNetwork: momoNetwork || null,
        momoNumber: momoNumber || null,
      };

      const response = await fetch("/api/vendors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok) {
        toast.success("Application submitted successfully!");
        setStep(4);
      } else {
        toast.error(resData.error || "Failed to process application.");
      }
    } catch {
      toast.error("An unexpected validation issue occurred. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Business", icon: Store },
    { num: 2, label: "Operations", icon: MapPin },
    { num: 3, label: "Settlement", icon: Wallet },
  ];

  return (
    <div className="w-full">
      {/* STEP INDICATORS */}
      <div className="flex items-center justify-center gap-1 mb-6 select-none">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              disabled={s.num > step || step === 4}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all duration-200",
                step === s.num &&
                  "bg-primary text-white shadow-sm",
                step > s.num &&
                  "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/60",
                step < s.num &&
                  "bg-muted text-muted-foreground cursor-not-allowed",
                step === 4 && "opacity-50 pointer-events-none"
              )}
            >
              {step > s.num ? (
                <CheckCircle2 className="size-3.5 shrink-0" />
              ) : (
                <s.icon className="size-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px shrink-0 transition-colors duration-300",
                  step > s.num
                    ? "bg-emerald-300 dark:bg-emerald-700"
                    : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md mx-auto bg-card/50 p-6 rounded-2xl border border-border/60 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.02)]">
        <form onSubmit={handleSubmit}>
          {/* STEP 1: BUSINESS BASE INFO */}
          {step === 1 && (
            <FieldGroup className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <Field className="-space-y-2">
                <FieldLabel className="text-xs text-muted-foreground font-medium">
                  Store / Brand Name
                </FieldLabel>
                <Input
                  required
                  placeholder="e.g. SmartDuka Retailers"
                  value={storeName}
                  onChange={(e) => handleStoreNameChange(e.target.value)}
                  className="rounded-full mt-1.5 h-10"
                />
              </Field>

              <Field className="-space-y-2">
                <FieldLabel className="text-xs text-muted-foreground font-medium">
                  Your Store Web Address
                </FieldLabel>
                <div className="flex items-center gap-1.5 mt-1.5 bg-muted/40 rounded-xl px-3 border border-border/60">
                  <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground/70 select-none shrink-0">
                    smartduka.com/brands/
                  </span>
                  <Input
                    required
                    readOnly
                    placeholder="your-store-name"
                    value={storeSlug}
                    className="border-0 bg-transparent px-0 h-10 shadow-none focus-visible:ring-0 text-xs font-medium cursor-default"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-1.5 leading-relaxed">
                  This is your unique store link. It&apos;s automatically created from your brand name — customers will find you here.
                </p>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field className="-space-y-2">
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    Business Email
                  </FieldLabel>
                  <Input
                    required
                    type="email"
                    placeholder="biz@gmail.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
                <Field className="-space-y-2">
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    Business Phone
                  </FieldLabel>
                  <Input
                    required
                    type="tel"
                    placeholder="+256 7XXXXXXXX"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
              </div>
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-full text-xs font-semibold tracking-wide gap-2 bg-primary text-white mt-2 cursor-pointer"
              >
                Continue <ArrowRight className="size-3.5" />
              </Button>
            </FieldGroup>
          )}

          {/* STEP 2: OPERATIONS & ADDRESS */}
          {step === 2 && (
            <FieldGroup className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <Field className="-space-y-2">
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    District
                  </FieldLabel>
                  <Input
                    required
                    placeholder="Kampala Central"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
                <Field className="-space-y-2">
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    Street Address
                  </FieldLabel>
                  <Input
                    required
                    placeholder="Plot 45, Kampala Rd"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 py-2">
                <Checkbox
                  id="physicalStore"
                  checked={hasPhysicalStore}
                  onCheckedChange={(checked) =>
                    setHasPhysicalStore(checked === true)
                  }
                />
                <label
                  htmlFor="physicalStore"
                  className="text-xs font-medium text-muted-foreground cursor-pointer select-none"
                >
                  I operate a physical shop/warehouse
                </label>
              </div>

              {hasPhysicalStore && (
                <Field className="-space-y-2">
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    Physical Location / Landmark
                  </FieldLabel>
                  <Input
                    required
                    placeholder="Mapeera House, Ground Floor Room 4"
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
              )}
              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-auto h-11 rounded-full text-xs font-semibold px-5 cursor-pointer gap-1.5"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 h-11 rounded-full text-xs font-semibold bg-primary text-white cursor-pointer gap-2"
                >
                  Continue <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </FieldGroup>
          )}

          {/* STEP 3: SETTLEMENT PREFERENCES */}
          {step === 3 && (
            <FieldGroup className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">

              <Field>
                <FieldLabel className="text-xs text-muted-foreground font-medium">
                  Preferred Future Settlement Method{" "}
                  <span className="text-muted-foreground/50">(Optional)</span>
                </FieldLabel>
                <Select value={momoNetwork} onValueChange={setMomoNetwork}>
                  <SelectTrigger className="w-full h-10! mt-1.5 rounded-xl text-sm">
                    <SelectValue placeholder="I'll configure this later" />
                  </SelectTrigger>
                  <SelectContent className="text-xs p-1">
                    <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                    <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {momoNetwork && (
                <Field>
                  <FieldLabel className="text-xs text-muted-foreground font-medium">
                    {momoNetwork === "MTN" ? "MTN MoMo" : "Airtel Money"} Number
                    (For Future Use)
                  </FieldLabel>
                  <Input
                    placeholder="077XXXXXXX"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    className="rounded-full mt-1.5 h-10"
                  />
                </Field>
              )}

              <div className="flex items-start gap-2 py-2 bg-muted/30 rounded-xl p-3 border border-border/30">
                <Checkbox
                  id="codAck"
                  checked={codAcknowledged}
                  onCheckedChange={(checked) =>
                    setCodAcknowledged(checked === true)
                  }
                  className="mt-0.5"
                />
                <label
                  htmlFor="codAck"
                  className="text-[11px] text-muted-foreground leading-relaxed cursor-pointer select-none"
                >
                  I understand that SmartDuka currently operates on{" "}
                  <strong>Cash on Delivery</strong> terms. I will collect
                  payments directly from customers upon delivery.
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => setStep(2)}
                  className="w-auto h-11 rounded-full text-xs font-semibold px-5 cursor-pointer gap-1.5"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !codAcknowledged}
                  className="flex-1 h-11 rounded-full text-xs font-semibold bg-primary text-white cursor-pointer transition-all hover:bg-emerald-600"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </FieldGroup>
          )}

          {/* STEP 4: SUCCESS SCREEN */}
          {step === 4 && (
            <div className="text-center py-6 flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
              <CheckCircle2 className="size-14 text-primary animate-bounce" />
              <h3 className="text-lg font-semibold text-foreground tracking-tight">
                Application Submitted
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Our compliance team is reviewing your storefront details. We&apos;ll
                notify you at{" "}
                <span className="font-semibold text-foreground">
                  {businessEmail}
                </span>{" "}
                once approved.
              </p>
              <Button
                type="button"
                onClick={() => router.push("/")}
                className="h-10 rounded-full text-xs font-medium px-6 bg-primary text-white mt-3 cursor-pointer"
              >
                Return to Marketplace
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}