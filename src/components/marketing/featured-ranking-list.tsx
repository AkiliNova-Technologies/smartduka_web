"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingEntityCombobox } from "@/components/marketing/admin/marketing-entity-combobox";
import { IllustratedEmptyState } from "@/components/marketplace/illustrated-empty-state";

type FeaturedRow = { id: string; [key: string]: unknown };
type PickerOption = { id: string; label: string };
type Props = {
  kind: "product" | "shop";
  title: string;
  description: string;
  rows: FeaturedRow[];
  options: PickerOption[];
  name: (row: FeaturedRow) => string;
  emptyIllustration: string;
  onAdd: (id: string) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onReorder: (ids: string[]) => Promise<unknown[]>;
  onRefresh: () => Promise<unknown>;
};

function SortableRow({ row, rank, label, disabled, onRemove }: { row: FeaturedRow; rank: number; label: string; disabled: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-1 border-b px-2 py-2 last:border-b-0 sm:px-3 ${isDragging ? "z-10 rounded-md border bg-muted/70 shadow-sm opacity-75" : ""}`}>
    <span className="text-sm font-medium tabular-nums text-muted-foreground">{rank}</span>
    <Button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Reorder ${label}`} className="size-10 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"><GripVertical className="size-4" /></Button>
    <span className="min-w-0 truncate text-sm font-medium">{label}</span>
    <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>Remove from featured</Button>
  </li>;
}

export function FeaturedRankingList({ kind, title, description, rows, options, name, emptyIllustration, onAdd, onRemove, onReorder, onRefresh }: Props) {
  const [dialogOpen, setDialogOpen] = React.useState(false), [selectedId, setSelectedId] = React.useState(""), [message, setMessage] = React.useState(""), [adding, setAdding] = React.useState(false), [reordering, setReordering] = React.useState(false), [optimisticRows, setOptimisticRows] = React.useState<FeaturedRow[] | null>(null);
  const displayRows = optimisticRows ?? rows;
  const availableOptions = options.filter((option) => !rows.some((row) => row.id === option.id || (kind === "product" ? row.productId === option.id : row.vendorId === option.id)));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const close = () => { if (!adding) { setDialogOpen(false); setMessage(""); } };
  const add = async () => { if (!selectedId) { setMessage(`Choose a ${kind} first.`); return; } setAdding(true); setMessage(""); try { await onAdd(selectedId); setSelectedId(""); setDialogOpen(false); setOptimisticRows(null); } catch (error) { setMessage(error instanceof Error ? error.message : `Could not add featured ${kind}.`); } finally { setAdding(false); } };
  const remove = async (id: string) => { setMessage(""); try { setOptimisticRows(null); await onRemove(id); } catch (error) { setMessage(error instanceof Error ? error.message : `Could not remove featured ${kind}.`); } };
  const handleDragEnd = async ({ active, over }: DragEndEvent) => { if (reordering || !over || active.id === over.id) return; const oldIndex = displayRows.findIndex((row) => row.id === active.id), newIndex = displayRows.findIndex((row) => row.id === over.id); if (oldIndex < 0 || newIndex < 0) return; const previousOrder = displayRows, nextOrder = arrayMove(displayRows, oldIndex, newIndex); setOptimisticRows(nextOrder); setReordering(true); setMessage(""); try { const canonical = await onReorder(nextOrder.map((row) => row.id)); setOptimisticRows(canonical as FeaturedRow[]); } catch (error) { setOptimisticRows(previousOrder); const conflict = error instanceof Error && error.message.includes("featured list changed"); setMessage(conflict ? "The featured list changed. Refresh and try again." : error instanceof Error ? error.message : "Could not save the featured order."); if (conflict) { setOptimisticRows(null); await onRefresh(); } } finally { setReordering(false); } };
  const singular = kind === "product" ? "product" : "shop";
  const addLabel = `Add ${singular}`;
  const dialogTitle = `Add featured ${singular}`;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{displayRows.length ? <Button onClick={() => setDialogOpen(true)}>{addLabel}</Button> : null}</div>
    {message ? <p role="status" className="text-sm text-destructive">{message}</p> : null}
    {displayRows.length === 0 ? <IllustratedEmptyState illustration={emptyIllustration} title={`No featured ${kind}s`} description={`Choose ${kind}s you want SmartDuka to highlight.`} action={{ label: `Add featured ${singular}`, onClick: () => setDialogOpen(true) }} /> : <div className="rounded-xl border bg-card"><div className="flex items-center justify-between border-b px-3 py-3 text-sm"><span className="font-medium">Ranked {kind}s</span>{reordering ? <span role="status" className="text-muted-foreground">Saving order...</span> : null}</div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}><SortableContext items={displayRows.map((row) => row.id)} strategy={verticalListSortingStrategy}><ol>{displayRows.map((row, index) => <SortableRow key={row.id} row={row} rank={index + 1} label={name(row)} disabled={reordering} onRemove={() => void remove(row.id)} />)}</ol></SortableContext></DndContext></div>}
    <Dialog.Root open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : close()}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-lg"><Dialog.Title className="text-lg font-semibold">{dialogTitle}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">Choose a {singular} to add to the featured list.</Dialog.Description><div className="mt-5"><MarketingEntityCombobox label={kind === "product" ? "Product" : "Shop"} value={selectedId} onValueChange={setSelectedId} options={availableOptions} placeholder={`Search ${kind}s...`} emptyText={`No ${kind}s found.`} /></div>{message ? <p role="alert" className="mt-3 text-sm text-destructive">{message}</p> : null}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={close} disabled={adding}>Cancel</Button><Button type="button" onClick={() => void add()} disabled={adding}>{adding ? "Adding..." : "Add to featured"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
