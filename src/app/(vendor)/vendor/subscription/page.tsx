"use client";
/* eslint-disable react-hooks/set-state-in-effect -- loads account-scoped data after mount */
import * as React from "react";
import { Check, CircleDollarSign, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { type ColumnDef, type Row } from "@tanstack/react-table";
type Plan = {
  code: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  staffSeats: number;
  features: unknown;
};
type Item = {
  id: string;
  plan: { code: string; name: string };
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  amount: string;
  payment: { status: string; reference: string | null } | null;
};
type PlanComparison = {
  id: string;
  feature: string;
  values: Record<string, string>;
};
type Data = {
  entitlement: {
    status: string;
    daysRemaining: number;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    activeSubscription: { plan: Plan; currentPeriodEnd: string | null } | null;
  };
  plans: Plan[];
  history: Item[];
};
const names: Record<string, string> = {
  PRODUCT_MANAGEMENT: "Product management",
  ORDER_MANAGEMENT: "Order management",
  INVENTORY_MANAGEMENT: "Inventory tracking",
  MARKETING: "Marketing tools",
  BASIC_ANALYTICS: "Basic shop insights",
  ADVANCED_ANALYTICS: "Advanced shop insights",
  REPORT_EXPORT: "Export reports",
  STAFF_SEATS: "Team access",
};
const list = (p: Plan) =>
    Array.isArray(p.features)
      ? p.features.filter((x): x is string => typeof x === "string")
      : [],
  label = (x: string) => names[x] ?? "Included plan feature",
  money = (x: string) => `UGX ${Number(x).toLocaleString("en-UG")}`,
  date = (x: string | null) =>
    x
      ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(
          new Date(x),
        )
      : "—",
  error = (b: unknown, f: string) =>
    b &&
    typeof b === "object" &&
    "error" in b &&
    b.error &&
    typeof b.error === "object" &&
    "message" in b.error &&
    typeof b.error.message === "string"
      ? b.error.message
      : f;
export default function SubscriptionPage() {
  const [data, setData] = React.useState<Data | null>(null),
    [ready, setReady] = React.useState(false),
    [failure, setFailure] = React.useState(""),
    [selected, setSelected] = React.useState<Plan | null>(null),
    [phone, setPhone] = React.useState(""),
    [notice, setNotice] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setFailure("");
    try {
      const [a, b] = await Promise.all([
          fetch("/api/v1/vendor/subscription", { cache: "no-store" }),
          fetch("/api/v1/vendor/platform-payments", { cache: "no-store" }),
        ]),
        body = await a.json();
      if (!a.ok)
        throw new Error(error(body, "Unable to load subscription packages."));
      setData(body.data);
      if (b.ok) setReady(Boolean((await b.json()).data.ready));
    } catch (e) {
      setData(null);
      setFailure(
        e instanceof Error
          ? e.message
          : "Unable to load subscription packages.",
      );
    }
  }, []);
  React.useEffect(() => {
    void load();
  }, [load]);
  const pay = async () => {
    if (!selected || !phone.trim())
      return setNotice("Enter the MTN mobile-money number to continue.");
    setBusy(true);
    try {
      const order = await fetch("/api/v1/vendor/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planCode: selected.code,
            idempotencyKey: crypto.randomUUID(),
          }),
        }),
        ob = await order.json();
      if (!order.ok) throw new Error(error(ob, "Unable to create purchase."));
      const payment = await fetch("/api/v1/vendor/platform-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revenueOrderId: ob.data.id,
            payerPhone: phone.trim(),
            idempotencyKey: crypto.randomUUID(),
          }),
        }),
        pb = await payment.json();
      if (!payment.ok) throw new Error(error(pb, "Unable to start payment."));
      setSelected(null);
      setNotice(
        "Payment request sent. Your plan activates only after MTN confirms payment.",
      );
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to start payment.");
      await load();
    } finally {
      setBusy(false);
    }
  };
  const columns = React.useMemo<ColumnDef<Item>[]>(
    () => [
      {
        accessorKey: "plan",
        header: "Plan",
        cell: ({ row }) => row.original.plan.name,
      },
      {
        id: "period",
        header: "Billing period",
        cell: ({ row }) => (
          <span>
            {date(row.original.currentPeriodStart)} →{" "}
            {date(row.original.currentPeriodEnd)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => money(row.original.amount),
      },
      {
        accessorKey: "status",
        header: "Subscription",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "payment",
        header: "Payment",
        cell: ({ row }) => <StatusBadge status={row.original.payment?.status ?? "AWAITING_PAYMENT"} />,
      },
    ],
    [],
  );
  const comparisonRows = React.useMemo<PlanComparison[]>(
    () => {
      const plans = data?.plans ?? [];
      const features = [...new Set(plans.flatMap(list))];

      return [
        ...features.map((feature) => ({
          id: feature,
          feature: label(feature),
          values: Object.fromEntries(
            plans.map((plan) => [
              plan.code,
              list(plan).includes(feature) ? "Included" : "—",
            ]),
          ),
        })),
        {
          id: "team-members",
          feature: "Team members",
          values: Object.fromEntries(
            plans.map((plan) => [plan.code, `Up to ${plan.staffSeats}`]),
          ),
        },
      ];
    },
    [data?.plans],
  );
  const comparisonColumns = React.useMemo<ColumnDef<PlanComparison>[]>(
    () => [
      { accessorKey: "feature", header: "Feature" },
      ...(data?.plans ?? []).map((plan) => ({
        id: plan.code,
        header: plan.name,
        cell: ({ row }: { row: Row<PlanComparison> }) =>
          row.original.values[plan.code],
      })),
    ],
    [data?.plans],
  );
  const active = data?.entitlement.activeSubscription;
  return (
    <div className="min-w-0 space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">Shop subscription</p>
        <h1 className="mt-1 text-2xl font-semibold">
          Choose a plan for your shop
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Compare tools and team access as your business grows.
        </p>
      </header>
      {failure ? (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-semibold">Packages could not be loaded</h2>
          <p className="mt-1 text-sm text-muted-foreground">{failure}</p>
          <Button
            className="mt-4 rounded-full"
            variant="outline"
            onClick={() => void load()}>
            Try again
          </Button>
        </section>
      ) : !data ? (
        <section className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
          Loading subscription packages…
        </section>
      ) : (
        <>
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Your shop access
                  </p>
                  <h2 className="text-lg font-semibold">
                    {active?.plan.name ??
                      (data.entitlement.status === "TRIAL"
                        ? "Free trial"
                        : "Subscription required")}
                  </h2>
                </div>
              </div>
              <Badge variant={active ? "default" : "secondary"}>
                {active
                  ? "Active"
                  : data.entitlement.status === "TRIAL"
                    ? "Trial active"
                    : "Limited access"}
              </Badge>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {active
                ? `Current period ends ${date(active.currentPeriodEnd)}.`
                : `Trial ends ${date(data.entitlement.trialEndsAt)} · ${data.entitlement.daysRemaining} days remaining.`}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Available plans</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the tools that fit how you run your shop.
            </p>
            {!ready && (
              <p className="mt-4 rounded-xl border bg-muted/60 p-3 text-sm text-muted-foreground">
                Subscription payments are temporarily unavailable. You can still
                compare plans.
              </p>
            )}
            {data.plans.length === 0 ? (
              <p className="mt-4 rounded-2xl border bg-card p-5 text-sm">
                Subscription plans need setup. An administrator must run{" "}
                <code>npm run seed:subscription-plans</code>.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {data.plans.map((plan) => {
                  const current = active?.plan.code === plan.code;
                  return (
                    <article
                      key={plan.code}
                      className={`flex flex-col rounded-2xl border bg-card p-5 shadow-sm ${plan.code === "BUSINESS" ? "border-primary/40" : ""}`}>
                      <div className="flex justify-between">
                        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                          <CircleDollarSign className="size-4" />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {plan.code}
                        </span>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                      <p className="mt-5 text-3xl font-semibold">
                        {money(plan.price)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          / month
                        </span>
                      </p>
                      <p className="mt-5 flex items-center gap-2 rounded-xl bg-muted/70 p-3 text-sm">
                        <Users className="size-4 text-primary" />
                        Up to {plan.staffSeats} team members
                      </p>
                      <ul className="mt-5 space-y-2 text-sm">
                        {list(plan)
                          .slice(0, 5)
                          .map((x) => (
                            <li key={x} className="flex gap-2">
                              <Check className="size-4 text-primary" />
                              {label(x)}
                            </li>
                          ))}
                      </ul>
                      <Button
                        className="mt-7 w-full rounded-full"
                        disabled={current || !ready}
                        onClick={() => setSelected(plan)}>
                        {current
                          ? "Current plan"
                          : ready
                            ? `Choose ${plan.name}`
                            : "Payments unavailable"}
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          {data.plans.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Compare plan features</h2>
              <DataTable
                className="mt-4"
                columns={comparisonColumns}
                data={comparisonRows}
                getRowId={(row) => row.id}
                features={{
                  pagination: false,
                  search: false,
                  columnVisibility: false,
                  sorting: false,
                  filtering: false,
                  rowSelection: false,
                  footer: false,
                }}
              />
            </section>
          )}
          <section>
            <h2 className="text-xl font-semibold">
              Subscription & payment history
            </h2>
            <div className="mt-4">
              <DataTable
                columns={columns}
                data={data.history}
                getRowId={(r) => r.id}
                features={{
                  pagination: false,
                  search: false,
                  columnVisibility: false,
                  sorting: false,
                  filtering: false,
                  rowSelection: false,
                  footer: false,
                }}
                emptyStateContent={<span>No subscription purchases yet.</span>}
              />
            </div>
          </section>
        </>
      )}
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelected(null);
        }}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md sm:rounded-none">
          <SheetHeader>
            <SheetTitle>Confirm your plan</SheetTitle>
            <SheetDescription>
              We’ll send an MTN mobile-money prompt for this subscription.
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-5 px-4">
              <div className="rounded-xl bg-muted p-4">
                <strong>{selected.name}</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  {money(selected.price)} · Monthly billing
                </p>
              </div>
              <label
                className="block text-sm font-medium"
                htmlFor="subscription-phone">
                MTN mobile-money number
                <Input
                  id="subscription-phone"
                  className="mt-2"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                />
              </label>
              <p className="text-sm text-muted-foreground">
                Access activates only after confirmed payment.
              </p>
            </div>
          )}
          <SheetFooter>
            <Button
              className="w-full rounded-full"
              disabled={busy}
              onClick={() => void pay()}>
              {busy
                ? "Sending payment request…"
                : `Request payment for ${selected ? money(selected.price) : ""}`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {notice && (
        <p
          className="rounded-xl bg-muted p-3 text-sm text-muted-foreground"
          role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
