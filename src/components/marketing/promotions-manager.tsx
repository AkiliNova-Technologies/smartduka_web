"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/marketplace/error-state";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";
import { useAdminMarketing } from "@/hooks/use-admin-marketing";
import { PromotionForm } from "./admin/promotion/promotion-form";
import { PromotionPreview } from "./admin/promotion/promotion-preview";
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
          <h1 className="text-2xl font-semibold">Hero Promotions</h1>
          <p className="text-sm text-muted-foreground">
            Create promotional banners and control where and when customers see
            them.
          </p>
        </div>
        {admin.promotions.length > 0 && (
          <Button onClick={openCreate}>Create promotion</Button>
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
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Promotion</th>
                  <th>Placement</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {admin.promotions.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="cursor-pointer border-b hover:bg-muted/40">
                    <td className="p-3 font-medium">
                      {p.title || "Untitled promotion"}
                    </td>
                    <td>{p.placements?.join(", ") || "—"}</td>
                    <td>{p.status}</td>
                    <td>{p.priority}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing({
                            id: p.id,
                            mode: "edit",
                            value: {
                              ...emptyPromotion,
                              ...p,
                              startsAt: p.startsAt?.slice(0, 16) || "",
                              endsAt: p.endsAt?.slice(0, 16) || "",
                            },
                          });
                        }}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
