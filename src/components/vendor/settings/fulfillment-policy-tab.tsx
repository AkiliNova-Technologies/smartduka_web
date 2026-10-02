"use client";

import { useState, useTransition } from "react";
import { Loader2, PackageCheck, RotateCcw } from "lucide-react";
import { FULFILLMENT_METHODS, type FulfillmentMethod } from "@/lib/fulfillment";
import {
  updateFulfillmentSettings,
  updateReturnPolicy,
} from "@/actions/vendor-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "sonner";

export interface FulfillmentPolicyProfile {
  fulfillmentMethods: FulfillmentMethod[];
  deliveryFee: { toString(): string } | number | null;
  deliveryEstimate: string | null;
  pickupLocation: string | null;
  pickupDirections: string | null;
  pickupInstructions: string | null;
  returnWindowDays: number | null;
  returnPolicy: string | null;
  returnInstructions: string | null;
  returnAddress: string | null;
  acceptsExchanges: boolean;
  exchangePolicy: string | null;
}

type SettingsFieldErrors = Partial<Record<"methods" | "deliveryFee" | "pickupLocation" | "returnWindowDays" | "exchangePolicy", string>>;

export function FulfillmentPolicyTab({ profile }: { profile: FulfillmentPolicyProfile }) {
  const [pending, startTransition] = useTransition();
  const [methods, setMethods] = useState<FulfillmentMethod[]>(
    profile.fulfillmentMethods ?? ["DELIVERY"],
  );
  const [fee, setFee] = useState(String(profile.deliveryFee ?? 3500));
  const [estimate, setEstimate] = useState(profile.deliveryEstimate ?? "");
  const [location, setLocation] = useState(profile.pickupLocation ?? "");
  const [directions, setDirections] = useState(profile.pickupDirections ?? "");
  const [pickupInstructions, setPickupInstructions] = useState(
    profile.pickupInstructions ?? "",
  );
  const [windowDays, setWindowDays] = useState(
    String(profile.returnWindowDays ?? 7),
  );
  const [policy, setPolicy] = useState(profile.returnPolicy ?? "");
  const [returnInstructions, setReturnInstructions] = useState(
    profile.returnInstructions ?? "",
  );
  const [returnAddress, setReturnAddress] = useState(
    profile.returnAddress ?? "",
  );
  const [exchanges, setExchanges] = useState(profile.acceptsExchanges ?? false);
  const [exchangePolicy, setExchangePolicy] = useState(profile.exchangePolicy ?? "");
  const [errors, setErrors] = useState<SettingsFieldErrors>({});
  const toggle = (method: FulfillmentMethod) =>
    setMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  const saveFulfillment = () =>
    startTransition(async () => {
      setErrors({});
      const result = await updateFulfillmentSettings({
        methods,
        deliveryFee: Number(fee),
        deliveryEstimate: estimate,
        pickupLocation: location,
        pickupDirections: directions,
        pickupInstructions,
      });
      if (result.success) toast.success("Fulfilment settings saved.");
      else if ("fieldErrors" in result) setErrors(result.fieldErrors ?? {});
    });
  const savePolicy = () =>
    startTransition(async () => {
      setErrors({});
      const result = await updateReturnPolicy({
        returnWindowDays: Number(windowDays),
        returnPolicy: policy,
        returnInstructions,
        returnAddress,
        acceptsExchanges: exchanges,
        exchangePolicy,
      });
      if (result.success) toast.success("Returns policy saved.");
      else if ("fieldErrors" in result) setErrors(result.fieldErrors ?? {});
    });
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/30 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <PackageCheck className="size-4" /> Fulfilment
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose how customers receive orders from your shop.
          </p>
        </div>
        <div className="space-y-5 p-6 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              FULFILLMENT_METHODS
            ).map((method) => (
              <label
                key={method}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
                <Checkbox
                  id={`fulfillment-${method.toLowerCase()}`}
                  checked={methods.includes(method)}
                  onCheckedChange={() => toggle(method)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold">
                    {method === "DELIVERY" ? "Delivery" : "Store pickup"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {method === "DELIVERY"
                      ? "Deliver to the customer’s saved address."
                      : "Customers collect from your configured location."}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {errors.methods && <FieldError id="fulfilment-methods-error">{errors.methods}</FieldError>}
          {methods.includes("DELIVERY") && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Delivery fee (UGX)"
                value={fee}
                onChange={setFee}
                type="number"
              />
              <FieldError id="delivery-fee-error">{errors.deliveryFee}</FieldError>
              <Field
                label="Estimated delivery time"
                value={estimate}
                onChange={setEstimate}
                placeholder="e.g. 1–2 business days"
              />
            </div>
          )}
          {methods.includes("PICKUP") && (
            <div className="space-y-4">
              <Field
                label="Collection location"
                value={location}
                onChange={setLocation}
                placeholder="Shop address or collection point"
              />
              <FieldError id="pickup-location-error">{errors.pickupLocation}</FieldError>
              <Area
                label="Directions"
                value={directions}
                onChange={setDirections}
                placeholder="Landmarks or access instructions"
              />
              <Area
                label="Collection instructions"
                value={pickupInstructions}
                onChange={setPickupInstructions}
                placeholder="What customers need when collecting"
              />
            </div>
          )}
          <Button
            onClick={saveFulfillment}
            disabled={pending}
            className="rounded-full">
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}Save
            fulfilment
          </Button>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <div className="border-b border-border/60 bg-muted/30 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <RotateCcw className="size-4" /> Returns & refunds
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Platform protection remains available; your policy can add
            customer-friendly terms.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <Field
            label="Return window (days)"
            value={windowDays}
            onChange={setWindowDays}
            type="number"
          />
          <FieldError id="return-window-error">{errors.returnWindowDays}</FieldError>
          <Area
            label="Policy summary"
            value={policy}
            onChange={setPolicy}
            placeholder="Eligible conditions and exclusions"
          />
          <Area
            label="Return instructions"
            value={returnInstructions}
            onChange={setReturnInstructions}
            placeholder="How customers should start a return"
          />
          <Area
            label="Return address"
            value={returnAddress}
            onChange={setReturnAddress}
            placeholder="Address for approved returns"
          />

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              id="accepts-exchanges"
              checked={exchanges}
              onCheckedChange={(checked) => setExchanges(checked === true)}
              className="mt-0.5"
            />
            <span>Offer exchanges where suitable</span>
          </label>
          {exchanges && (
            <>
              <Area
                label="Exchange Policy"
                value={exchangePolicy}
                onChange={setExchangePolicy}
                placeholder="Which items can be exchanged, time limits, condition requirements, stock availability, and price differences"
              />
              <FieldError id="exchange-policy-error">{errors.exchangePolicy}</FieldError>
            </>
          )}
          <Button
            onClick={savePolicy}
            disabled={pending}
            className="rounded-full">
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}Save
            policy
          </Button>
        </div>
      </section>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      <span className="mb-1.5 block">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-full bg-background px-4 text-sm text-foreground"
      />
    </label>
  );
}
function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      <span className="mb-1.5 block">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-20 rounded-xl bg-background text-sm font-normal text-foreground"
      />
    </label>
  );
}
