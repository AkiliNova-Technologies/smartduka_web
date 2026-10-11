"use client";

import * as React from "react";
import Image from "next/image";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePromotionBooking } from "@/hooks/use-vendor-marketing";
import type {
  CreatedPromotion,
  VendorEntitlement,
  VendorPromotionProduct,
} from "@/lib/vendor-promotions-client";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "PRODUCT" | "SHOP";
  initialProductId?: string;
  entitlement: VendorEntitlement | null;
  onChanged: () => Promise<unknown> | void;
};
const cash = (value: number) => `UGX ${value.toLocaleString("en-UG")}`;
const kampalaIso = (value: string) =>
  value ? new Date(`${value}:00+03:00`).toISOString() : null;

export function PromotionSheet({
  open,
  onOpenChange,
  targetType,
  initialProductId = "",
  entitlement,
  onChanged,
}: Props) {
  const booking = usePromotionBooking(onChanged),
    [step, setStep] = React.useState<Step>(1),
    [product, setProduct] = React.useState<VendorPromotionProduct | null>(null),
    [productOpen, setProductOpen] = React.useState(false),
    [productQuery, setProductQuery] = React.useState(""),
    [days, setDays] = React.useState(3),
    [applyCredit, setApplyCredit] = React.useState(true),
    [schedule, setSchedule] = React.useState<"NOW" | "LATER">("NOW"),
    [start, setStart] = React.useState(""),
    [phone, setPhone] = React.useState("");
  const { searchProducts, invalidateQuote } = booking;
  React.useEffect(() => {
    if (open && targetType === "PRODUCT") void searchProducts("");
  }, [open, targetType, searchProducts]);
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (open && targetType === "PRODUCT") void searchProducts(productQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, productQuery, searchProducts, targetType]);
  const selectedProduct =
    product ??
    booking.products.find((item) => item.id === initialProductId) ??
    null;
  const input = React.useMemo(
    () => ({
      targetType,
      targetId: targetType === "PRODUCT" ? selectedProduct?.id : undefined,
      durationDays: days,
      applyCredit,
      requestedStartAt: schedule === "LATER" ? kampalaIso(start) : null,
    }),
    [applyCredit, days, schedule, selectedProduct, start, targetType],
  );
  const valid = targetType === "SHOP" || Boolean(selectedProduct);
  const review = async () => {
    if (!valid) return;
    const quote = await booking.requestQuote(input);
    if (quote) setStep(2);
  };
  const beginPayment = async () => {
    const created = await booking.createCampaign();
    if (created) setStep(3);
  };
  const handleOpen = (next: boolean) => {
    if (
      !next &&
      step > 1 &&
      !booking.created &&
      !window.confirm(
        "Close and keep these unsaved promotion details for later?",
      )
    )
      return;
    onOpenChange(next);
  };
  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent className="flex h-dvh min-w-lg w-full flex-col p-0 sm:h-auto sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <SheetHeader className="border-b px-5 py-5 sm:px-6">
          <SheetTitle>
            {targetType === "PRODUCT" ? "Promote a product" : "Promote my shop"}
          </SheetTitle>
          <SheetDescription>
            Review the real cost before payment. Times are shown in
            Africa/Kampala.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <PromotionStepper
            step={step}
            onStep={(next) => next < step && setStep(next)}
          />
          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Step {step} of 3
            </p>
            <h2 className="mt-1 text-lg font-semibold">
              {step === 1
                ? "Promotion details"
                : step === 2
                  ? "Review booking"
                  : "Payment"}
            </h2>
          </div>
          {step === 1 && (
            <DetailsPanel
              targetType={targetType}
              product={selectedProduct}
              setProduct={(value) => {
                setProduct(value);
                invalidateQuote();
              }}
              open={productOpen}
              setOpen={setProductOpen}
              query={productQuery}
              setQuery={setProductQuery}
              products={booking.products}
              loading={booking.productLoading}
              error={booking.productError}
              days={days}
              setDays={(value) => {
                setDays(value);
                invalidateQuote();
              }}
              schedule={schedule}
              setSchedule={(value) => {
                setSchedule(value);
                invalidateQuote();
              }}
              start={start}
              setStart={(value) => {
                setStart(value);
                invalidateQuote();
              }}
              applyCredit={applyCredit}
              setApplyCredit={(value) => {
                setApplyCredit(value);
                invalidateQuote();
              }}
              credit={entitlement?.promotionalCreditAvailable ?? 0}
            />
          )}{" "}
          {step === 2 && (
            <ReviewPanel
              target={
                targetType === "SHOP"
                  ? "Your active shop"
                  : (selectedProduct?.name ?? "Product")
              }
              days={days}
              schedule={schedule}
              start={start}
              quote={booking.quote}
              paymentReady={booking.paymentReadiness?.ready ?? null}
              onEdit={() => setStep(1)}
            />
          )}{" "}
          {step === 3 && (
            <PaymentPanel
              amount={booking.quote?.amountDue ?? 0}
              phone={phone}
              setPhone={setPhone}
              readiness={booking.paymentReadiness?.ready ?? null}
              state={booking.paymentState}
              created={booking.created}
            />
          )}{" "}
          {booking.message && (
            <p
              role="status"
              aria-live="polite"
              className="mt-4 rounded-xl bg-muted p-3 text-sm">
              {booking.message}
            </p>
          )}
        </div>
        <PromotionFooter
          step={step}
          busy={booking.quoting || booking.submitting}
          canContinue={valid && (schedule === "NOW" || Boolean(start))}
          hasQuote={Boolean(booking.quote?.availability.available)}
          created={Boolean(booking.created)}
          creditOnly={(booking.quote?.amountDue ?? 1) === 0}
          paymentReady={booking.paymentReadiness?.ready ?? null}
          onBack={() => setStep((step - 1) as Step)}
          onReview={() => void review()}
          onCreate={() => void beginPayment()}
          onPay={() => void booking.requestPayment(phone)}
        />
      </SheetContent>
    </Sheet>
  );
}

export function PromotionStepper({
  step,
  onStep,
}: {
  step: Step;
  onStep: (step: Step) => void;
}) {
  return (
    <ol className="flex items-start" aria-label="Promotion progress">
      {(["Details", "Review", "Payment"] as const).map((label, index) => {
        const value = (index + 1) as Step,
          done = value < step,
          active = value === step;
        return (
          <React.Fragment key={label}>
            <li className="flex min-w-16 flex-col items-center">
              <button
                type="button"
                disabled={!done}
                onClick={() => onStep(value)}
                aria-current={active ? "step" : undefined}
                aria-label={`${done ? "Completed" : "Step"} ${value}: ${label}`}
                className={cn(
                  "grid size-8 place-items-center rounded-full border text-sm font-semibold",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "text-muted-foreground",
                )}>
                {done ? <Check className="size-4" aria-hidden /> : value}
              </button>
              <span
                className={cn(
                  "mt-2 text-xs",
                  active ? "font-semibold" : "text-muted-foreground",
                )}>
                {label}
              </span>
            </li>
            {index < 2 && (
              <span
                aria-hidden
                className={cn(
                  "mt-4 h-px flex-1",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

function ProductPicker(props: {
  product: VendorPromotionProduct | null;
  setProduct: (p: VendorPromotionProduct) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  products: VendorPromotionProduct[];
  loading: boolean;
  error: string;
}) {
  return (
    <div>
      <Label>Product</Label>
      <Popover open={props.open} onOpenChange={props.setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={props.open}
            className="mt-2 h-auto min-h-11 w-full justify-between rounded-xl px-3 py-2 font-normal">
            {props.product ? (
              <ProductRow product={props.product} />
            ) : (
              <span className="text-muted-foreground">
                Search active products
              </span>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2">
          <Command>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <CommandInput
                className="pl-8"
                value={props.query}
                onChange={(e) => props.setQuery(e.target.value)}
                placeholder="Search by product name…"
                aria-label="Search products"
              />
            </div>
            <CommandList>
              {props.loading && (
                <p className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading products…
                </p>
              )}
              {props.error && (
                <p className="px-2 py-3 text-sm text-destructive">
                  {props.error}
                </p>
              )}
              {!props.loading &&
                !props.error &&
                props.products.length === 0 && (
                  <CommandEmpty>
                    {props.query
                      ? "No matching active products."
                      : "No eligible products available."}
                  </CommandEmpty>
                )}
              <CommandGroup>
                {props.products.map((item) => (
                  <CommandItem
                    key={item.id}
                    onClick={() => {
                      props.setProduct(item);
                      props.setOpen(false);
                    }}>
                    <ProductRow product={item} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
function ProductRow({ product }: { product: VendorPromotionProduct }) {
  const image =
    product.images?.find((item) => item.isFeatured)?.url ??
    product.images?.[0]?.url;
  return (
    <span className="flex min-w-0 items-center gap-3">
      {image ? (
        <Image
          src={image}
          alt=""
          width={36}
          height={36}
          className="size-9 rounded-lg object-cover"
        />
      ) : (
        <span className="grid size-9 place-items-center rounded-lg bg-muted text-xs">
          No image
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium">{product.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {product.sku || product.slug}
        </span>
      </span>
    </span>
  );
}

function DetailsPanel(p: {
  targetType: "PRODUCT" | "SHOP";
  product: VendorPromotionProduct | null;
  setProduct: (p: VendorPromotionProduct) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  products: VendorPromotionProduct[];
  loading: boolean;
  error: string;
  days: number;
  setDays: (v: number) => void;
  schedule: "NOW" | "LATER";
  setSchedule: (v: "NOW" | "LATER") => void;
  start: string;
  setStart: (v: string) => void;
  applyCredit: boolean;
  setApplyCredit: (v: boolean) => void;
  credit: number;
}) {
  return (
    <div className="mt-5 space-y-6">
      <section className="space-y-3">
        <h3 className="font-medium">What to promote</h3>
        {p.targetType === "PRODUCT" ? (
          <ProductPicker {...p} />
        ) : (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="font-medium">Your active shop</p>
            <p className="text-sm text-muted-foreground">
              Shop identity is verified by the server.
            </p>
          </div>
        )}
      </section>
      <section className="space-y-4">
        <h3 className="font-medium">Schedule & credits</h3>
        <div>
          <Label htmlFor="duration">Duration (days)</Label>
          <div className="relative mt-2">
            <Input
              id="duration"
              type="number"
              min={1}
              max={30}
              value={p.days}
              onChange={(e) =>
                p.setDays(
                  Math.min(30, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="pr-14"
            />
            <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
              days
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose between 1 and 30 days.
          </p>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Start</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(["NOW", "LATER"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant={p.schedule === value ? "default" : "outline"}
                className="rounded-full"
                onClick={() => p.setSchedule(value)}
                aria-pressed={p.schedule === value}>
                {value === "NOW"
                  ? "After payment confirmation"
                  : "Schedule for later"}
              </Button>
            ))}
          </div>
        </fieldset>
        {p.schedule === "LATER" && (
          <div>
            <Label htmlFor="start">Date and time</Label>
            <Input
              id="start"
              type="datetime-local"
              className="mt-2"
              value={p.start}
              onChange={(e) => p.setStart(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Africa/Kampala (UTC+3)
            </p>
          </div>
        )}
        <div className="flex gap-3 rounded-xl border p-4">
          <Checkbox
            id="credit"
            checked={p.applyCredit && p.credit > 0}
            disabled={p.credit <= 0}
            onCheckedChange={(v) => p.setApplyCredit(v === true)}
          />
          <div>
            <Label htmlFor="credit">Apply promotional credit</Label>
            <p className="mt-1 text-sm font-medium">
              {cash(p.credit)} available
            </p>
            <p className="text-xs text-muted-foreground">
              {p.credit > 0
                ? "Credit is applied up to the authoritative quoted amount."
                : "No promotional credit is currently available."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReviewPanel({
  target,
  days,
  schedule,
  start,
  quote,
  paymentReady,
  onEdit,
}: {
  target: string;
  days: number;
  schedule: "NOW" | "LATER";
  start: string;
  quote: ReturnType<typeof usePromotionBooking>["quote"];
  paymentReady: boolean | null;
  onEdit: () => void;
}) {
  if (!quote)
    return (
      <p className="mt-5 text-sm text-destructive">
        The quote is unavailable or stale. Return to details and request it
        again.
      </p>
    );
  const end =
    schedule === "LATER" && start
      ? new Date(new Date(`${start}:00+03:00`).getTime() + days * 86400000)
      : null;
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border">
        <dl className="divide-y">
          {[
            ["Promoting", target],
            [
              "Start",
              schedule === "NOW"
                ? "After payment confirmation"
                : `${start} Africa/Kampala`,
            ],
            [
              "End",
              end
                ? new Intl.DateTimeFormat("en-UG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Kampala",
                  }).format(end)
                : "Calculated after payment confirmation",
            ],
            ["Duration", `${days} days`],
            ["Base price", cash(quote.subtotal)],
            ["Credits applied", `− ${cash(quote.creditApplied)}`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-4 px-4 py-3 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="bg-muted/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Final amount due
          </p>
          <p className="mt-1 text-2xl font-semibold">{cash(quote.amountDue)}</p>
        </div>
      </div>
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">Homepage placement availability</p>
        <p className="mt-1 text-muted-foreground">{quote.availability.available} of {quote.availability.capacity} paid slots available for this interval.</p>
        {quote.availability.available===0&&quote.availability.alternatives.length>0&&<p className="mt-2">Next available starts: {quote.availability.alternatives.map(value=>new Intl.DateTimeFormat("en-UG",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Kampala"}).format(new Date(value))).join(", ")}</p>}
        <p className="mt-2 text-xs text-muted-foreground">Availability can change until the temporary hold is acquired.</p>
      </div>
      {quote.amountDue > 0 && paymentReady === false && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          MTN payment requests are currently unavailable. You can review this
          quote, but cannot confirm a paid booking.
        </p>
      )}
      <Button variant="ghost" className="rounded-full" onClick={onEdit}>
        Edit details
      </Button>
      <p className="text-xs text-muted-foreground">
        This quote does not reserve or guarantee an advertising slot.
      </p>
    </div>
  );
}

function PaymentPanel({
  amount,
  phone,
  setPhone,
  readiness,
  state,
  created,
}: {
  amount: number;
  phone: string;
  setPhone: (v: string) => void;
  readiness: boolean | null;
  state: string;
  created: CreatedPromotion | null;
}) {
  const [clock,setClock]=React.useState(()=>Date.now());
  React.useEffect(()=>{if(!created?.holdExpiresAt)return;const timer=window.setInterval(()=>setClock(Date.now()),1_000);return()=>window.clearInterval(timer)},[created?.holdExpiresAt]);
  const holdRemaining=created?.holdExpiresAt?Math.max(0,new Date(created.holdExpiresAt).getTime()-clock):null;
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">Amount due</p>
        <p className="text-2xl font-semibold">{cash(amount)}</p>
      </div>
      {holdRemaining!==null&&amount>0&&<p className="rounded-xl border p-3 text-sm font-medium">Temporary slot hold: {Math.floor(holdRemaining/60_000)}:{String(Math.floor(holdRemaining/1_000)%60).padStart(2,"0")} remaining</p>}
      {amount === 0 ? (
        <p className="text-sm">
          No provider payment is required. Promotional credit funds the campaign
          atomically.
        </p>
      ) : (
        <>
          <div>
            <Label htmlFor="provider">Payment provider</Label>
            <Input
              id="provider"
              className="mt-2"
              value="MTN Mobile Money"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="payer-phone">MTN phone number</Label>
            <Input
              id="payer-phone"
              className="mt-2"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. 0772 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {Boolean(created) && readiness === false && (
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              MTN payment requests are currently unavailable. Your unpaid
              booking remains available for safe recovery.
            </p>
          )}
          {state === "PENDING" && (
            <p className="rounded-xl bg-muted p-3 text-sm">
              Payment confirmation is pending. Approve the request on your phone
              and do not submit again.
            </p>
          )}
          {state === "FAILED" && (
            <p className="text-sm text-destructive">
              The payment request failed. Review the number and retry safely.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PromotionFooter({
  step,
  busy,
  canContinue,
  hasQuote,
  created,
  creditOnly,
  paymentReady,
  onBack,
  onReview,
  onCreate,
  onPay,
}: {
  step: Step;
  busy: boolean;
  canContinue: boolean;
  hasQuote: boolean;
  created: boolean;
  creditOnly: boolean;
  paymentReady: boolean | null;
  onBack: () => void;
  onReview: () => void;
  onCreate: () => void;
  onPay: () => void;
}) {
  return (
    <footer className="border-t bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      {step === 1 ? (
        <Button
          className="w-full rounded-full"
          disabled={!canContinue || busy}
          onClick={onReview}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading quote…
            </>
          ) : (
            "Continue to review"
          )}
        </Button>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={onBack}>
            Back
          </Button>
          {step === 2 ? (
            <Button
              className="flex-1 rounded-full"
              disabled={
                !hasQuote || busy || (!creditOnly && paymentReady === false)
              }
              onClick={onCreate}>
              {busy ? "Creating…" : "Continue to payment"}
            </Button>
          ) : (
            <Button
              className="flex-1 rounded-full"
              disabled={
                busy ||
                (created && creditOnly) ||
                (created && !creditOnly && paymentReady === false)
              }
              onClick={created && !creditOnly ? onPay : onCreate}>
              {busy
                ? "Submitting…"
                : creditOnly
                  ? created
                    ? "Confirmed"
                    : "Confirm with credit"
                  : created
                    ? "Request payment"
                    : "Prepare payment"}
            </Button>
          )}
        </div>
      )}
    </footer>
  );
}
