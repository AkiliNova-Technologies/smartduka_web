"use client";
import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CalendarClock,
  CircleAlert,
  Eye,
  Megaphone,
  WalletCards,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { DataTable } from "@/components/data-table";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PromotionSheet } from "@/components/vendor/marketing/promotion-sheet";
import { useVendorMarketingList } from "@/hooks/use-vendor-marketing";
import type { VendorEntitlement } from "@/lib/vendor-promotions-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Payment = {
  status: string;
  provider: string;
  reference: string | null;
  lastChecked: string | null;
} | null;
type Campaign = {
  id: string;
  targetType: "PRODUCT" | "SHOP";
  targetName: string;
  durationDays: number;
  dailyRate: string;
  subtotal: string;
  creditApplied: string;
  amountDue: string;
  requestedStartAt: string | null;
  startAt: string | null;
  endAt: string | null;
  status: string;
  fulfillmentStatus: string;
  viewPath: string;
  payment: Payment;
};
const filters = [
  ["ALL", "All"],
  ["AWAITING_PAYMENT", "Awaiting payment"],
  ["SCHEDULED", "Scheduled"],
  ["ACTIVE", "Active"],
  ["COMPLETED", "Completed"],
  ["PAYMENT_FAILED", "Failed"],
  ["CANCELLED", "Cancelled"],
  ["REVIEW_REQUIRED", "Needs review"],
] as const;
const money = (n: number | string) =>
  `UGX ${Number(n).toLocaleString("en-UG")}`;
const label = (s: string) =>
  s
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (x) => x.toUpperCase());
const date = (v: string | null, time = false) =>
  v
    ? new Intl.DateTimeFormat("en-UG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(new Date(v))
    : "—";
const shortDate = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("en-UG", {
        day: "numeric",
        month: "short",
      }).format(new Date(v))
    : "—";
const queued = (c: Campaign) =>
  Boolean(
    c.requestedStartAt &&
    c.startAt &&
    new Date(c.requestedStartAt).getTime() !== new Date(c.startAt).getTime(),
  );
const paymentLabel = (c: Campaign) =>
  !c.payment
    ? Number(c.amountDue) === 0
      ? "Credit funded"
      : "Awaiting payment"
    : ({
        PENDING: "Confirming",
        CONFIRMATION_DELAYED: "Confirmation delayed",
        SUCCESSFUL: "Paid",
        FAILED: "Failed",
        EXPIRED: "Failed",
        CANCELLED: "Failed",
        REVERSED: "Reversed",
      }[c.payment.status] ?? label(c.payment.status));

export default function VendorMarketingPage() {
  const params = useSearchParams(),
    initialProduct = params.get("productId") ?? "";
  const [search, setSearch] = React.useState(""),
    [status, setStatus] = React.useState("ALL"),
    [page, setPage] = React.useState(1),
    [pageSize, setPageSize] = React.useState(10),
    [selected, setSelected] = React.useState<Campaign | null>(null),
    [targetType, setTargetType] = React.useState<"PRODUCT" | "SHOP">(
      initialProduct ? "PRODUCT" : "SHOP",
    ),
    [promotionOpen, setPromotionOpen] = React.useState(false);
  const {
    result,
    entitlement,
    loading,
    error: loadError,
    refresh,
  } = useVendorMarketingList({ page, pageSize, search, status });
  const columns = React.useMemo<ColumnDef<Campaign>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Campaign",
        cell: ({ row }) => (
          <div className="min-w-24">
            <p className="font-mono text-xs font-semibold text-primary">
              {row.original.id.slice(0, 8)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {row.original.targetType === "PRODUCT" ? "Product" : "Shop"}{" "}
              promotion
            </p>
          </div>
        ),
      },
      {
        accessorKey: "targetName",
        header: "Target",
        cell: ({ row }) => (
          <p className="max-w-36 truncate font-medium">
            {row.original.targetName}
          </p>
        ),
      },
      {
        id: "schedule",
        header: "Schedule",
        cell: ({ row }) => (
          <div className="min-w-28">
            <p>{row.original.durationDays} days</p>
            <p className="text-[11px] text-muted-foreground">
              {shortDate(row.original.startAt)} →{" "}
              {shortDate(row.original.endAt)}
            </p>
            {queued(row.original) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Queued after existing promotion
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "amountDue",
        header: "Cost",
        cell: ({ row }) => (
          <div>
            <p>{money(row.original.subtotal)}</p>
            {Number(row.original.creditApplied) > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {money(row.original.creditApplied)} credit
              </p>
            )}
          </div>
        ),
      },
      {
        id: "payment",
        header: () => <span className="hidden lg:inline">Payment</span>,
        cell: ({ row }) => (
          <span className="hidden lg:inline">{paymentLabel(row.original)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <CampaignStatus status={row.original.status} />,
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => <DataTableRowActions actions={[{ id: "view", label: "View", icon: Eye, onSelect: () => setSelected(row.original) }]} />,
      },
    ],
    [],
  );
  const active = result.rows.filter((x) => x.status === "ACTIVE").length,
    scheduled = result.rows.filter((x) => x.status === "SCHEDULED").length,
    attention = result.rows.filter((x) =>
      ["AWAITING_PAYMENT", "REVIEW_REQUIRED", "PAYMENT_FAILED"].includes(
        x.status,
      ),
    ).length;
  const choose = (type: "PRODUCT" | "SHOP") => {
    setTargetType(type);
    setPromotionOpen(true);
  };
  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create product or shop promotions, review costs, and follow
            payment-backed campaign status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full" onClick={() => choose("PRODUCT")}>
            Promote a product
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => choose("SHOP")}>
            Promote my shop
          </Button>
        </div>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          label="Promotional credit"
          value={
            entitlement ? money(entitlement.promotionalCreditAvailable) : "—"
          }
          description="Use this credit toward product and shop promotions."
          icon={WalletCards}
          tone="info"
        />
        <DashboardMetricCard
          label="Active campaigns"
          value={active}
          icon={Megaphone}
          tone="success"
        />
        <DashboardMetricCard
          label="Scheduled campaigns"
          value={scheduled}
          icon={CalendarClock}
          tone="info"
        />
        <DashboardMetricCard
          label="Needs attention"
          value={attention}
          icon={CircleAlert}
          tone="warning"
        />
      </section>
      <EntitlementSummary entitlement={entitlement} />
      <PromotionSheet
        open={promotionOpen}
        onOpenChange={setPromotionOpen}
        targetType={targetType}
        initialProductId={initialProduct}
        entitlement={entitlement}
        onChanged={refresh}
      />
      {/* <section id="promotion-form" className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Create a promotion</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review the platform-calculated cost before creating a campaign.
          Duration provides rotation eligibility, not guaranteed traffic.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="promotion-target">
              What do you want to promote?
            </Label>
            <Select
              value={targetType}
              onValueChange={(value) => {
                setTargetType(value as "PRODUCT" | "SHOP");
                setQuote(null);
              }}>
              <SelectTrigger id="promotion-target" className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOP">Feature my shop</SelectItem>
                <SelectItem value="PRODUCT">Promote a product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {targetType === "PRODUCT" && (
            <div>
              <Label htmlFor="promotion-product">Product ID</Label>
              <Input
                id="promotion-product"
                className="mt-2"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setQuote(null);
                }}
                placeholder="Use a product Promote action"
                aria-describedby="promotion-product-help"
              />
              <p
                id="promotion-product-help"
                className="mt-1 text-xs text-muted-foreground">
                Only your active products can be promoted.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="promotion-duration">Duration (1–30 days)</Label>
            <Input
              id="promotion-duration"
              className="mt-2"
              type="number"
              min="1"
              max="30"
              value={durationDays}
              onChange={(e) => {
                const value = Number(e.target.value);
                setDurationDays(
                  Number.isFinite(value) ? Math.min(30, Math.max(1, value)) : 1,
                );
                setQuote(null);
              }}
            />
          </div>
          <div className="flex items-center gap-3 self-end rounded-xl border p-3">
            <Checkbox
              id="promotion-credit"
              checked={applyCredit}
              onCheckedChange={(checked) => {
                setApplyCredit(checked === true);
                setQuote(null);
              }}
            />
            <div>
              <Label htmlFor="promotion-credit">Apply promotional credit</Label>
              <p className="text-xs text-muted-foreground">
                Applied automatically up to the quoted amount.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            className="rounded-full"
            disabled={quoting || creating}
            onClick={() => void getQuote()}>
            {quoting ? "Calculating…" : "Review pricing"}
          </Button>
          {quote && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={creating || quoting}
              onClick={() => void create()}>
              {creating ? "Creating…" : "Create campaign"}
            </Button>
          )}
        </div>
        {quote && <Pricing quote={quote} />}{" "}
        {message && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {message}
          </p>
        )}
      </section> */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Campaign history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search and filter your product and shop promotions.
          </p>
        </div>
        {loadError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {loadError}
          </p>
        )}
        <DataTableStatusFilter
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          options={filters.map(([value, label]) => ({ value, label: value === "ALL" ? "All statuses" : label }))}
        />
        <DataTable
          columns={columns}
          data={result.rows}
          getRowId={(x) => x.id}
          isLoading={loading}
          features={{
            pagination: false,
            search: true,
            columnVisibility: false,
            sorting: false,
            filtering: false,
            rowSelection: false,
            footer: false,
          }}
          search={{
            value: search,
            onValueChange: (value) => {
              setSearch(value);
              setPage(1);
            },
            placeholder: "Search campaigns",
            ariaLabel: "Search campaigns",
          }}
          emptyStateContent={
            <span>No campaigns match your search and filters.</span>
          }
        />
        <PaginationControls
          pageIndex={Math.max(0, result.pagination.page - 1)}
          pageSize={result.pagination.pageSize}
          pageCount={result.pagination.totalPages}
          total={result.pagination.total}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={(i) => setPage(i + 1)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
      <Details
        campaign={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  );
}
function EntitlementSummary({
  entitlement,
}: {
  entitlement: VendorEntitlement | null;
}) {
  if (!entitlement)
    return (
      // TODO: Replace with a skeleton loader or spinner component
      <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Loading entitlement…
      </section>
    );
  const title =
    entitlement.status === "ACTIVE_SUBSCRIPTION"
      ? "Subscription active"
      : entitlement.status === "EXPIRED"
        ? "Free trial ended"
        : "Free trial";
  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="font-medium">{title}</p>
      {entitlement.status === "TRIAL" && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {entitlement.daysRemaining} days remaining
          </p>
          <p className="text-sm text-muted-foreground">
            Ends {date(entitlement.trialEndsAt)}
          </p>
        </>
      )}
      <p className="mt-3 text-sm font-medium">Promotional credit</p>
      <p className="text-xl font-semibold tabular-nums">
        {money(entitlement.promotionalCreditAvailable)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Use this credit toward product and shop promotions.
      </p>
    </section>
  );
}
function CampaignStatus({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}
function Details({
  campaign,
  onOpenChange,
}: {
  campaign: Campaign | null;
  onOpenChange: (open: boolean) => void;
}) {
  const notice = !campaign
    ? null
    : campaign.payment?.status === "PENDING"
      ? "Payment confirmation is pending. Do not pay again while SmartDuka verifies the transaction."
      : campaign.payment?.status === "CONFIRMATION_DELAYED"
        ? "Payment confirmation is taking longer than expected."
        : ["FAILED", "EXPIRED", "CANCELLED"].includes(
              campaign.payment?.status ?? "",
            )
          ? "Payment failed. Any reserved promotional credit has been restored."
          : campaign.payment?.status === "REVERSED"
            ? "Payment reversed — review required."
            : campaign.status === "REVIEW_REQUIRED"
              ? "This paid promotion is not being delivered. SmartDuka support must review recovery or refund options."
            : campaign.status === "SCHEDULED"
              ? "This campaign is scheduled and will activate automatically."
              : null;
  const section = (title: string, rows: [string, string][]) => (
    <section>
      <h3 className="font-medium">{title}</h3>
      <dl className="mt-3 space-y-3">
        {rows.map(([a, b]) => (
          <div
            key={a}
            className="flex items-start justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{a}</dt>
            <dd className="text-right font-medium break-all">{b}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
  return (
    <Sheet open={!!campaign} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Campaign details</SheetTitle>
          <SheetDescription>{campaign?.id.slice(0, 8)}</SheetDescription>
        </SheetHeader>
        {campaign && (
          <div className="space-y-6 px-4 pb-6">
            {section("Summary", [
              ["Campaign ID", campaign.id],
              ["Target type", label(campaign.targetType)],
              ["Target", campaign.targetName],
              ["Campaign status", label(campaign.status)],
              ["Delivery status", label(campaign.fulfillmentStatus)],
              ["Payment status", paymentLabel(campaign)],
            ])}
            {section("Schedule", [
              ["Requested start", date(campaign.requestedStartAt)],
              ["Effective start", date(campaign.startAt)],
              ["End", date(campaign.endAt)],
              ["Duration", `${campaign.durationDays} days`],
            ])}
            {queued(campaign) && (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                This promotion was scheduled after another campaign for the same
                target.
              </p>
            )}
            {section("Pricing", [
              ["Daily rate", money(campaign.dailyRate)],
              ["Duration", `${campaign.durationDays} days`],
              ["Service value", money(campaign.subtotal)],
              [
                "Promotional credit applied",
                `- ${money(campaign.creditApplied)}`,
              ],
              ["Cash amount", money(campaign.amountDue)],
            ])}
            {section("Payment details", [
              [
                "Provider",
                campaign.payment ? label(campaign.payment.provider) : "—",
              ],
              ["Payment status", paymentLabel(campaign)],
              ["Masked provider reference", campaign.payment?.reference ?? "—"],
              [
                "Last checked",
                date(campaign.payment?.lastChecked ?? null, true),
              ],
            ])}
            {notice && (
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {notice}
              </p>
            )}
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href={campaign.viewPath}>View homepage placement</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
