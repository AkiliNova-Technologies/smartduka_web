"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/marketplace/error-state";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
import { PromotionForm } from "./admin/promotion/promotion-form";
import { PromotionPreview } from "./admin/promotion/promotion-preview";
import { DataTable } from "@/components/data-table";
import { MediaImage } from "@/components/marketplace/media-image";
import type { ColumnDef } from "@tanstack/react-table";
import {
  emptyPromotion,
  type PromotionFormValue,
} from "./admin/promotion/types";
import type { PromotionMutation, PromotionDto } from "@/lib/marketing-client";
const marketingGroups = ["promotions", "pickers"] as const;
export function PromotionsManager() {
  const admin = useAdminMarketing({ groups: marketingGroups });
  const [editing, setEditing] = React.useState<{
    id: string;
    value: PromotionFormValue;
    mode: "create" | "edit";
  } | null>(null);
  const [selected, setSelected] = React.useState<PromotionDto | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [scheduleNow, setScheduleNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setScheduleNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const openEdit = React.useCallback((promotion: PromotionDto) => {
    setEditing({ id: promotion.id, mode: "edit", value: { ...emptyPromotion, ...promotion, startsAt: promotion.startsAt?.slice(0, 16) || "", endsAt: promotion.endsAt?.slice(0, 16) || "" } });
  }, []);
  const columns = React.useMemo<ColumnDef<PromotionDto>[]>(() => [
    { id: "promotion", header: "Promotion", cell: ({ row }) => <button type="button" onClick={() => setSelected(row.original)} className="flex min-w-0 items-center gap-3 text-left"><MediaImage src={row.original.desktopImageUrl} fallback="/illustrations/empty-deals.svg" alt="" width={48} height={28} className="h-8 w-12 rounded object-cover" /><span className="truncate font-medium">{row.original.title || "Untitled promotion"}</span></button> },
    { id: "placement", header: "Placement", cell: ({ row }) => <span>{row.original.placements?.join(", ") || "—"}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <span className="capitalize">{promotionStatus(row.original, scheduleNow)}</span> },
    { accessorKey: "priority", header: "Priority" },
    { id: "actions", header: "Actions", cell: ({ row }) => <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>Edit</Button> },
  ], [openEdit, scheduleNow]);
  const openCreate = () => {
    setMessage(null);
    setEditing({ id: "", mode: "create", value: emptyPromotion });
  };
  const close = () => setEditing(null);
  const save = async (input: PromotionMutation) => {
    setSaving(true);
    setMessage(null);
    try {
      if (editing?.id) await admin.updatePromotion(editing.id, input);
      else await admin.createPromotion(input);
      close();
      setMessage("Promotion saved.");
    } catch (error) {
      console.error("[Marketing] Promotion save failed", error);
      setMessage(error instanceof Error && error.message ? error.message : "We could not save this promotion. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  if (admin.loading)
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />;
  if (admin.error)
    return (
      <ErrorState
        title="Couldn't load promotions"
        description="Try again to reload your Marketing workspace."
        actions={<Button onClick={() => void admin.refresh()}>Retry</Button>}
      />
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Marketing</p>
          <h1 className="text-2xl font-semibold">Promotions</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage promotional banners displayed across the marketplace.
          </p>
        </div>
        {admin.promotions.length > 0 && (
          <Button onClick={openCreate}>New promotion</Button>
        )}
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {admin.promotions.length === 0 ? (
        <IllustratedEmptyState
          illustration="/illustrations/empty-deals.svg"
          title="No promotions yet"
          description="Create your first promotion to highlight products, shops, or marketplace announcements."
          action={{ label: "Create promotion", onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
          <DataTable columns={columns} data={admin.promotions} getRowId={(promotion) => promotion.id} features={{ search: true, columnVisibility: false, footer: false }} searchPlaceholder="Search promotions" />
          <div>
            {selected ? (
              <PromotionPreview
                form={{
                  ...emptyPromotion,
                  ...selected,
                  startsAt: selected.startsAt?.slice(0, 16) || "",
                  endsAt: selected.endsAt?.slice(0, 16) || "",
                }}
              />
            ) : (
              <div className="rounded-xl border p-5 text-sm text-muted-foreground">
                Select a promotion to preview it.
              </div>
            )}
          </div>
        </div>
      )}
      {editing && (
        <PromotionForm
          mode={editing.mode}
          open
          onOpenChange={(open) => !open && close()}
          initial={editing.value}
          pickers={admin.pickers}
          saving={saving}
          error={message}
          onSubmit={save}
        />
      )}
    </div>
  );
}

function promotionStatus(promotion: PromotionDto, now: number | null) {
  if (promotion.status === "DISABLED") return "Disabled";
  if (promotion.status !== "ACTIVE") return "Draft";
  if (now !== null && promotion.startsAt && new Date(promotion.startsAt).getTime() > now) return "Scheduled";
  if (now !== null && promotion.endsAt && new Date(promotion.endsAt).getTime() <= now) return "Expired";
  return "Live";
}
