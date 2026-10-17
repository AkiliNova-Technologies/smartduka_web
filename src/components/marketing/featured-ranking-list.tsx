"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, PackageSearch, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MarketingEntityCombobox } from "@/components/marketing/admin/marketing-entity-combobox";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { DataTable } from "@/components/data-table";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { StatusBadge } from "@/components/marketplace/status-badge";
import {
  MarketingPreviewEmpty,
  MarketingPreviewShell,
} from "@/components/marketing/admin/marketing-preview-shell";

export type FeaturedRow = {
  id: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  [key: string]: unknown;
};
type PickerOption = { id: string; label: string };
type Props = {
  kind: "product" | "shop";
  title: string;
  description: string;
  rows: FeaturedRow[];
  options: PickerOption[];
  name: (row: FeaturedRow) => string;
  emptyIllustration: string;
  renderPreview?: (row: FeaturedRow) => React.ReactNode;
  onAdd: (id: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onReorder: (ids: string[]) => Promise<unknown[]>;
  onRefresh: () => Promise<unknown>;
};

export function FeaturedRankingList({
  kind,
  title,
  description,
  rows,
  options,
  name,
  emptyIllustration,
  renderPreview,
  onAdd,
  onRemove,
  onReorder,
  onRefresh,
}: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState("");
  const [selected, setSelected] = React.useState<FeaturedRow | null>(null);
  const [pendingRemoval, setPendingRemoval] =
    React.useState<FeaturedRow | null>(null);
  const [message, setMessage] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [reordering, setReordering] = React.useState(false);
  const [optimisticRows, setOptimisticRows] = React.useState<
    FeaturedRow[] | null
  >(null);
  const displayRows = optimisticRows ?? rows;
  const availableOptions = options.filter(
    (option) =>
      !rows.some(
        (row) =>
          row.id === option.id ||
          (kind === "product"
            ? row.productId === option.id
            : row.vendorId === option.id),
      ),
  );
  const singular = kind === "product" ? "product" : "shop";

  const add = async () => {
    if (!selectedId) {
      setMessage(`Choose a ${kind} first.`);
      return;
    }
    setAdding(true);
    setMessage("");
    try {
      await onAdd(selectedId);
      setSelectedId("");
      setDialogOpen(false);
      setOptimisticRows(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `Could not add featured ${kind}.`,
      );
    } finally {
      setAdding(false);
    }
  };
  const remove = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    setMessage("");
    try {
      await onRemove(pendingRemoval.id);
      if (selected?.id === pendingRemoval.id) setSelected(null);
      setPendingRemoval(null);
      setOptimisticRows(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `Could not remove featured ${kind}.`,
      );
    } finally {
      setRemoving(false);
    }
  };
  const reorder = async (nextRows: FeaturedRow[]) => {
    if (reordering) return;
    const previous = displayRows;
    setOptimisticRows(nextRows);
    setReordering(true);
    setMessage("");
    try {
      setOptimisticRows(await onReorder(nextRows.map((row) => row.id)) as FeaturedRow[]);
    } catch (error) {
      setOptimisticRows(previous);
      const conflict =
        error instanceof Error &&
        error.message.includes("featured list changed");
      setMessage(
        conflict
          ? "The featured list changed. Refresh and try again."
          : error instanceof Error
            ? error.message
            : "Could not save the featured order.",
      );
      if (conflict) {
        setOptimisticRows(null);
        await onRefresh();
      }
    } finally {
      setReordering(false);
    }
  };
  const columns = React.useMemo<ColumnDef<FeaturedRow>[]>(
    () => [
      {
        id: "name",
        header: kind === "product" ? "Product" : "Shop",
        cell: ({ row }) => (
          <button
            type="button"
            className="max-w-72 truncate text-left font-medium hover:text-primary"
            onClick={() => setSelected(row.original)}>
            {name(row.original)}
          </button>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive === false ? "INACTIVE" : "ACTIVE"}
          />
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {String(row.original.priority ?? "—")}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DataTableRowActions
            actions={[
              {
                id: "preview",
                label: `Preview ${singular}`,
                icon: Eye,
                onSelect: () => setSelected(row.original),
              },
              {
                id: "remove",
                label: `Remove featured ${singular}`,
                icon: Trash2,
                destructive: true,
                onSelect: () => setPendingRemoval(row.original),
              },
            ]}
          />
        ),
      },
    ],
    [kind, name, singular],
  );

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title={title}
        description={description}
        trailing={
          displayRows.length ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus aria-hidden="true" />
              Add {singular}
            </Button>
          ) : null
        }
      />
      {message ? (
        <p
          role="status"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {displayRows.length === 0 ? (
        <IllustratedEmptyState
          illustration={emptyIllustration}
          title={`No featured ${kind}s`}
          description={`Choose ${kind}s you want Mwezora to highlight.`}
          action={{
            label: `Add featured ${singular}`,
            onClick: () => setDialogOpen(true),
          }}
        />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)]">
          <DataTable
            columns={columns}
            data={displayRows}
            getRowId={(row) => row.id}
            onReorder={(next) => void reorder(next)}
            features={{ search: true, columnVisibility: false, footer: false }}
            getSearchText={name}
            searchPlaceholder={`Search featured ${kind}s`}
            toolbarActions={
              reordering ? (
                <span role="status" className="text-xs text-muted-foreground">
                  Saving order…
                </span>
              ) : null
            }
          />
          <div className="xl:sticky xl:top-20">
            {selected && renderPreview ? (
              <MarketingPreviewShell
                title={`${kind === "shop" ? "Shop" : "Product"} preview`}
                description="Rendered with the customer-facing marketplace component.">
                {renderPreview(selected)}
              </MarketingPreviewShell>
            ) : (
              <MarketingPreviewShell>
                <MarketingPreviewEmpty
                  illustration={
                    <PackageSearch
                      aria-hidden="true"
                      className="size-8 text-muted-foreground"
                    />
                  }
                  title={
                    kind === "shop"
                      ? "See your featured shop come to life"
                      : "Preview a featured product"
                  }
                  description={
                    kind === "shop"
                      ? "Select a shop to preview how customers will discover it on the Mwezora homepage."
                      : "Select a product to preview its customer-facing card."
                  }
                />
              </MarketingPreviewShell>
            )}
          </div>
        </div>
      )}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !adding && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add featured {singular}</DialogTitle>
            <DialogDescription>
              Choose an eligible {singular} to add to the curated list.
            </DialogDescription>
          </DialogHeader>
          <MarketingEntityCombobox
            label={kind === "product" ? "Product" : "Shop"}
            value={selectedId}
            onValueChange={setSelectedId}
            options={availableOptions}
            placeholder={`Search ${kind}s...`}
            emptyText={`No eligible ${kind}s found.`}
          />
          {message ? (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={adding}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void add()} disabled={adding}>
              {adding ? "Adding…" : "Add to featured"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => !open && !removing && setPendingRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove featured {singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              {pendingRemoval ? name(pendingRemoval) : `this ${singular}`} from
              the curated homepage list. It does not delete the underlying{" "}
              {singular} or affect paid placements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={removing}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}>
              {removing ? "Removing…" : "Remove from featured"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
