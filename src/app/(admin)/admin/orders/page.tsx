"use client";

import * as React from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTableStatusFilter } from "@/components/data-table-status-filter";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { StatusBadge } from "@/components/marketplace/status-badge";
import { useAdmin } from "@/hooks/use-admin";
import { OrderRow } from "@/types/marketplace";

const statuses = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value: number) => `UGX ${value.toLocaleString("en-UG")}`;

export default function AdminOrdersPage() {
  const { orders, ordersLoading } = useAdmin();
  const [tab, setTab] = React.useState<(typeof statuses)[number]>("ALL");
  const [selected, setSelected] = React.useState<OrderRow | null>(null);
  const counts = React.useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status,
          status === "ALL"
            ? orders.length
            : orders.filter((order) => order.subOrderStatus === status).length,
        ]),
      ),
    [orders],
  );
  const filtered = React.useMemo(
    () =>
      orders.filter((order) => tab === "ALL" || order.subOrderStatus === tab),
    [orders, tab],
  );
  const columns = React.useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order",
        cell: ({ row }) => (
          <button
            onClick={() => setSelected(row.original)}
            className="max-w-28 truncate font-mono text-xs font-medium text-primary hover:underline"
            title={row.original.orderNumber}>
            {row.original.orderNumber}
          </button>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <span
            className="block max-w-36 truncate text-xs font-medium"
            title={row.original.customerName}>
            {row.original.customerName}
          </span>
        ),
      },
      {
        accessorKey: "storeName",
        header: "Vendor",
        cell: ({ row }) => (
          <span
            className="block max-w-36 truncate text-xs font-medium"
            title={row.original.storeName}>
            {row.original.storeName}
          </span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="text-xs font-medium tabular-nums">
            {money(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: "subOrderStatus",
        header: "Vendor fulfillment",
        cell: ({ row }) => <StatusBadge status={row.original.subOrderStatus} />,
      },
      {
        accessorKey: "date",
        header: "Placed",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {new Date(row.original.date).toLocaleDateString("en-UG", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                id: "view",
                label: `View ${row.original.orderNumber}`,
                icon: Eye,
                onSelect: () => setSelected(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Orders</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Payment and vendor fulfillment are shown separately for each order
          segment.
        </p>
      </div>
      <DataTableStatusFilter
        value={tab}
        onValueChange={setTab}
        options={statuses.map((status) => ({
          value: status,
          label: status === "ALL" ? "All statuses" : label(status),
          count: counts[status],
        }))}
      />
      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.id}
        isLoading={ordersLoading && !orders.length}
        features={{ search: true }}
        searchPlaceholder="Search orders..."
        getSearchText={(order) =>
          [
            order.orderNumber,
            order.customerName,
            order.customerEmail,
            order.storeName,
          ]
            .filter(Boolean)
            .join(" ")
        }
      />
      <Sheet
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Order {selected.orderNumber}</SheetTitle>
              <SheetDescription className="font-mono">
                Internal fulfillment ID: {selected.id}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6 text-sm">
              <section>
                <h2 className="font-semibold">Summary</h2>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Detail
                    label="Placed"
                    value={new Date(selected.date).toLocaleDateString("en-UG", {
                      dateStyle: "medium",
                    })}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Payment status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={selected.paymentStatus} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Vendor fulfillment
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={selected.subOrderStatus} />
                    </div>
                  </div>
                  <Detail
                    label="Order total"
                    value={money(selected.totalAmount)}
                  />
                </div>
              </section>
              <section>
                <h2 className="font-semibold">Items</h2>
                <div className="mt-3 divide-y rounded-xl border">
                  {selected.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-muted-foreground">
                            {item.variant}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {money(item.unitPrice)} ·{" "}
                          {selected.storeName}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium tabular-nums">
                        {money(item.lineTotal)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Unit and line amounts are stored at purchase time.
                </p>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h2 className="font-semibold">Customer</h2>
                  <div className="mt-3 space-y-1 rounded-xl border p-3">
                    <p>{selected.customerName}</p>
                    <p className="break-all text-xs text-muted-foreground">
                      {selected.customerEmail || "No email"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.customerPhone}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground">
                      {selected.deliveryLocation}
                    </p>
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold">Vendor fulfillment</h2>
                  <div className="mt-3 space-y-1 rounded-xl border p-3">
                    <p>{selected.storeName}</p>
                    <p className="text-xs text-muted-foreground">
                      Shipping: {money(selected.totalShipping)}
                    </p>
                    {selected.notes && (
                      <p className="border-t pt-2 text-xs text-muted-foreground">
                        Note: {selected.notes}
                      </p>
                    )}
                  </div>
                </div>
              </section>
              {selected.paymentAttempt && (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Payment</h2>
                    <Link
                      href="/admin/finance/payments"
                      className="text-xs font-medium text-primary hover:underline">
                      View payment investigation
                    </Link>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border p-3 text-xs">
                    <Detail
                      label="Gateway"
                      value={label(selected.paymentGateway)}
                    />
                    <Detail
                      label="Attempt"
                      value={label(selected.paymentAttempt.status)}
                    />
                    <Detail
                      label="Provider status"
                      value={
                        selected.paymentAttempt.providerStatus
                          ? label(selected.paymentAttempt.providerStatus)
                          : "Not reported"
                      }
                    />
                    <Detail
                      label="Verified"
                      value={
                        selected.paymentAttempt.verifiedAt
                          ? new Date(
                              selected.paymentAttempt.verifiedAt,
                            ).toLocaleDateString("en-UG")
                          : "Not verified"
                      }
                    />
                  </div>
                </section>
              )}
              {Object.values(selected.issues).some((items) => items.length) && (
                <section>
                  <h2 className="font-semibold">Related issues</h2>
                  <div className="mt-3 space-y-2 rounded-xl border p-3 text-xs">
                    {selected.issues.returns.map((status, index) => (
                      <p key={`return-${index}`}>
                        Return {label(status).toLowerCase()}
                      </p>
                    ))}
                    {selected.issues.refunds.map((status, index) => (
                      <p key={`refund-${index}`}>
                        Refund {label(status).toLowerCase()}
                      </p>
                    ))}
                    {selected.issues.disputes.map((status, index) => (
                      <p key={`dispute-${index}`}>
                        Open dispute: {label(status)}
                      </p>
                    ))}
                    {selected.issues.riskFlags.map((status, index) => (
                      <p key={`risk-${index}`}>Risk flag: {label(status)}</p>
                    ))}
                    {selected.issues.financialExceptions.map((type, index) => (
                      <p key={`exception-${index}`}>
                        Financial exception: {label(type)}
                      </p>
                    ))}
                    <div className="flex gap-3 pt-1">
                      <Link
                        href="/admin/issues"
                        className="font-medium text-primary hover:underline">
                        Customer issues
                      </Link>
                      <Link
                        href="/admin/financial-exceptions"
                        className="font-medium text-primary hover:underline">
                        Financial exceptions
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
