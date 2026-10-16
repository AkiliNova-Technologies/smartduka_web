"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Boxes, Building2, Loader2, MapPin, MoreHorizontal, PackageCheck, Pencil, Plus, Store, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBranchInventory } from "@/hooks/use-branch-inventory";
import { useShopBranches } from "@/hooks/use-shop-branches";
import type { ShopBranchDto, ShopBranchInput } from "@/lib/shop-branches-client";

const blank: ShopBranchInput = {
  name: "", slug: "", branchType: "STORE", isPrimary: false, isActive: true,
  pickupEnabled: true, deliveryEnabled: false, addressLine: null, city: "Kampala",
  district: null, country: "Uganda", contactPhone: null, openingHours: null,
  pickupInstructions: null, deliveryAreas: [], deliveryFee: null, deliveryEstimate: null,
};
const fromDto = (branch: ShopBranchDto): ShopBranchInput => ({ ...branch, deliveryFee: branch.deliveryFee == null ? null : Number(branch.deliveryFee) });
type FieldName = "name" | "slug" | "addressLine" | "pickupEnabled" | "deliveryFee";
type FieldErrors = Partial<Record<FieldName, string>>;

export function LocationsFulfillmentTab() {
  const { branches, loading, saving, error, save } = useShopBranches();
  const inventory = useBranchInventory();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmInventory, setConfirmInventory] = useState(false);
  const [enablingInventory, setEnablingInventory] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<ShopBranchInput>(blank);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const activeBranches = branches.filter((branch) => branch.isActive);
  const pickupAvailable = activeBranches.some((branch) => branch.pickupEnabled);
  const deliveryAvailable = activeBranches.some((branch) => branch.deliveryEnabled);

  const edit = useCallback((branch?: ShopBranchDto) => {
    setEditingId(branch?.id);
    setForm(branch ? fromDto(branch) : { ...blank, isPrimary: branches.length === 0 });
    setFieldErrors({});
    setDialogOpen(true);
  }, [branches.length]);

  function set<K extends keyof ShopBranchInput>(key: K, value: ShopBranchInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next: FieldErrors = {};
    if (form.name.trim().length < 2) next.name = "Enter at least two characters.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) next.slug = "Use lowercase letters, numbers, and hyphens only.";
    if (form.isActive && !form.pickupEnabled && !form.deliveryEnabled) next.pickupEnabled = "An active location must offer pickup or delivery.";
    if (form.pickupEnabled && !form.addressLine?.trim()) next.addressLine = "A pickup address is required.";
    if (form.deliveryEnabled && form.deliveryFee == null) next.deliveryFee = "Set a delivery fee, including zero for free delivery.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (saving || !validate()) return;
    if (await save(form, editingId)) {
      toast.success(editingId ? "Location updated." : "Location added.");
      setDialogOpen(false);
      setEditingId(undefined);
    }
  }

  async function enableInventory() {
    if (enablingInventory) return;
    setEnablingInventory(true);
    try {
      await inventory.enableLocations();
      toast.success("Location-specific inventory enabled.");
      setConfirmInventory(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to enable location inventory.");
    } finally { setEnablingInventory(false); }
  }

  const columns = useMemo<ColumnDef<ShopBranchDto, unknown>[]>(() => [
    { accessorKey: "name", header: "Location", cell: ({ row }) => <div className="min-w-40"><div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /><span className="font-semibold">{row.original.name}</span>{row.original.isPrimary && <Badge>Primary</Badge>}</div><p className="mt-1 pl-6 text-xs text-muted-foreground">{typeLabel(row.original.branchType)}</p></div> },
    { id: "address", header: "Address", accessorFn: (branch) => [branch.addressLine, branch.city, branch.district].filter(Boolean).join(", "), cell: ({ row }) => <span className="block max-w-64 whitespace-normal text-xs text-muted-foreground">{[row.original.addressLine, row.original.city, row.original.district].filter(Boolean).join(", ") || "No address provided"}</span> },
    { id: "fulfilment", header: "Fulfilment", accessorFn: (branch) => [branch.pickupEnabled && "Pickup", branch.deliveryEnabled && "Delivery"].filter(Boolean).join(" "), cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.pickupEnabled && <Badge variant="secondary">Pickup</Badge>}{row.original.deliveryEnabled && <Badge variant="secondary">Delivery</Badge>}</div> },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "outline" : "secondary"}>{row.original.isActive ? "Active" : "Inactive"}</Badge> },
    { id: "actions", header: () => <span className="sr-only">Actions</span>, enableSorting: false, cell: ({ row }) => <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" aria-label={`Location options for ${row.original.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => edit(row.original)}><Pencil className="size-4" />Edit location</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ], [edit]);

  return <div className="space-y-6">
    <header><h2 className="text-xl font-semibold tracking-tight">Locations &amp; fulfilment</h2><p className="mt-1 text-sm text-muted-foreground">Configure where your business operates and how each location fulfils customer orders.</p></header>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="size-4" />How customers receive orders</CardTitle><CardDescription>Choose how customers can receive purchases from your shop.</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        {branches.length ? <><p className="text-xs text-muted-foreground">These are the methods currently offered across active locations. Edit a location to change its methods.</p><div className="grid gap-3 sm:grid-cols-2"><MethodSummary label="Delivery" description="Deliver from at least one active location." checked={deliveryAvailable} /><MethodSummary label="Store pickup" description="Customers collect from an active location." checked={pickupAvailable} /></div></> : <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="font-medium">Using your main shop settings</p><p className="mt-1 text-sm text-muted-foreground">Delivery and pickup continue to use the standard Fulfilment &amp; Returns settings. Additional locations are optional.</p></div>}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="size-4" />Your locations</CardTitle><CardDescription>Manage the places where your business operates and fulfils orders.</CardDescription><CardAction><Button type="button" size="sm" onClick={() => edit()}><Plus className="size-4" />Add location</Button></CardAction></CardHeader>
      <CardContent>{loading ? <LocationSkeleton /> : branches.length ? <DataTable columns={columns} data={branches} getRowId={(branch) => branch.id} defaultPageSize={5} isLoading={false} features={{ search: branches.length > 5, pagination: branches.length > 5, columnVisibility: false, rowSelection: false, footer: branches.length > 5, toolbar: branches.length > 5 }} getSearchText={(branch) => [branch.name, branch.addressLine, branch.city, branch.district, branch.branchType].filter(Boolean).join(" ")} searchPlaceholder="Search locations..." className="rounded-xl border-0 p-0 shadow-none ring-0" /> : <EmptyLocations onAdd={() => edit()} />}</CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Boxes className="size-4" />Manage inventory by location</CardTitle><CardDescription>Track product availability separately at each of your locations.</CardDescription>{inventory.data?.mode === "LOCATION_MANAGED" && <CardAction><Badge>Enabled</Badge></CardAction>}</CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">{inventory.data?.mode === "LOCATION_MANAGED" ? "Products can be allocated and adjusted independently at each configured location." : "Standard inventory is active. Products use one canonical stock quantity, and adding a location does not change this."}</p></CardContent>
      <CardFooter className="border-t">{inventory.data?.mode === "LOCATION_MANAGED" ? <Button asChild variant="outline"><Link href="/vendor/inventory">Open inventory</Link></Button> : <Button type="button" variant="outline" onClick={() => setConfirmInventory(true)} disabled={!activeBranches.length} title={!activeBranches.length ? "Add and activate a location first" : undefined}>Enable location inventory</Button>}</CardFooter>
    </Card>

    <LocationDialog open={dialogOpen} onOpenChange={(next) => !saving && setDialogOpen(next)} editing={Boolean(editingId)} form={form} set={set} fieldErrors={fieldErrors} serviceError={error} saving={saving} onSubmit={submit} />
    <Dialog open={confirmInventory} onOpenChange={(next) => !enablingInventory && setConfirmInventory(next)}><DialogContent><DialogHeader><DialogTitle>Enable location inventory?</DialogTitle><DialogDescription>This advanced mode tracks stock separately at every location and does not enable automatically when you add a location.</DialogDescription></DialogHeader><div className="flex gap-3 rounded-xl border border-border bg-muted/30 p-4"><TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary" /><p className="text-sm text-muted-foreground">Unallocated stock cannot fulfil location-based orders until it is assigned. Existing stock constraints and active-order protections remain in place.</p></div><DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmInventory(false)} disabled={enablingInventory}>Cancel</Button><Button type="button" onClick={() => void enableInventory()} disabled={enablingInventory}>{enablingInventory && <Loader2 className="size-4 animate-spin" />}{enablingInventory ? "Enabling…" : "Enable inventory mode"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function MethodSummary({ label, description, checked }: { label: string; description: string; checked: boolean }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"><div><Label className="font-medium">{label}</Label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} disabled aria-label={`${label} availability`} /></div>;
}

function EmptyLocations({ onAdd }: { onAdd: () => void }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center"><span className="flex size-11 items-center justify-center rounded-full bg-muted"><Store className="size-5 text-muted-foreground" /></span><h3 className="mt-4 font-semibold">Your main shop is all you need</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Additional locations are optional. Add one when customers can collect from, or orders can dispatch from, another place.</p><Button type="button" variant="outline" className="mt-5" onClick={onAdd}><Plus className="size-4" />Add a location</Button></div>;
}

function LocationSkeleton() { return <div className="space-y-3" aria-label="Loading locations"><div className="h-14 animate-pulse rounded-xl bg-muted" /><div className="h-14 animate-pulse rounded-xl bg-muted" /></div>; }

function LocationDialog({ open, onOpenChange, editing, form, set, fieldErrors, serviceError, saving, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; editing: boolean; form: ShopBranchInput; set: <K extends keyof ShopBranchInput>(key: K, value: ShopBranchInput[K]) => void; fieldErrors: FieldErrors; serviceError: string; saving: boolean; onSubmit: () => Promise<void> }) {
  const openingHours = form.openingHours?.general ?? "";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit location" : "Add location"}</DialogTitle><DialogDescription>Configure this location’s details, fulfilment methods, and operating information.</DialogDescription></DialogHeader><form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>
    <FormSection title="Basic details"><div className="grid gap-4 sm:grid-cols-2"><Field label="Location name" error={fieldErrors.name}><Input value={form.name} aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => { set("name", event.target.value); if (!editing) set("slug", slugify(event.target.value)); }} /></Field><Field label="Location type"><Select value={form.branchType} onValueChange={(value) => set("branchType", value as ShopBranchInput["branchType"])}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="STORE">Store</SelectItem><SelectItem value="WAREHOUSE">Warehouse</SelectItem><SelectItem value="PICKUP_POINT">Pickup point</SelectItem></SelectContent></Select></Field><Field label="Location identifier" error={fieldErrors.slug}><Input value={form.slug} aria-invalid={Boolean(fieldErrors.slug)} onChange={(event) => set("slug", event.target.value)} /></Field></div></FormSection>
    <FormSection title="Address"><div className="grid gap-4 sm:grid-cols-2"><Field label="District"><Input value={form.district ?? ""} onChange={(event) => set("district", event.target.value || null)} /></Field><Field label="City / town"><Input value={form.city ?? ""} onChange={(event) => set("city", event.target.value || null)} /></Field><Field label="Address details" error={fieldErrors.addressLine} className="sm:col-span-2"><Textarea value={form.addressLine ?? ""} aria-invalid={Boolean(fieldErrors.addressLine)} onChange={(event) => set("addressLine", event.target.value || null)} placeholder="Street, building, or nearby landmark" /></Field></div></FormSection>
    <FormSection title="Contact"><Field label="Contact phone"><Input type="tel" value={form.contactPhone ?? ""} onChange={(event) => set("contactPhone", event.target.value || null)} /></Field></FormSection>
    <FormSection title="Fulfilment"><div className="grid gap-3 sm:grid-cols-2"><ToggleField label="Store pickup" description="Customers can collect orders here." checked={form.pickupEnabled} onCheckedChange={(value) => set("pickupEnabled", value)} /><ToggleField label="Delivery" description="Orders can dispatch from here." checked={form.deliveryEnabled} onCheckedChange={(value) => set("deliveryEnabled", value)} /></div><FieldError id="location-method-error">{fieldErrors.pickupEnabled}</FieldError>{form.deliveryEnabled && <div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Delivery fee (UGX)" error={fieldErrors.deliveryFee}><Input type="number" min="0" value={form.deliveryFee ?? ""} aria-invalid={Boolean(fieldErrors.deliveryFee)} onChange={(event) => set("deliveryFee", event.target.value === "" ? null : Number(event.target.value))} /></Field><Field label="Delivery estimate"><Input value={form.deliveryEstimate ?? ""} onChange={(event) => set("deliveryEstimate", event.target.value || null)} placeholder="e.g. 1–2 business days" /></Field><Field label="Delivery areas" className="sm:col-span-2"><Input value={form.deliveryAreas.join(", ")} onChange={(event) => set("deliveryAreas", event.target.value.split(",").map((area) => area.trim()).filter(Boolean))} placeholder="Kampala, Entebbe" /></Field></div>}</FormSection>
    <FormSection title="Operations"><div className="grid gap-4 sm:grid-cols-2"><Field label="Opening hours"><Input value={openingHours} onChange={(event) => set("openingHours", event.target.value ? { general: event.target.value } : null)} placeholder="e.g. Mon–Sat, 8am–6pm" /><p className="text-xs text-muted-foreground">Stored as a general hours note; day-by-day scheduling is not yet supported.</p></Field>{form.pickupEnabled && <Field label="Pickup instructions"><Textarea value={form.pickupInstructions ?? ""} onChange={(event) => set("pickupInstructions", event.target.value || null)} placeholder="Collection desk, landmark, or identification needed" /></Field>}</div></FormSection>
    <FormSection title="Status"><div className="grid gap-3 sm:grid-cols-2"><ToggleField label="Active location" description="Available for eligible new orders." checked={form.isActive} onCheckedChange={(value) => set("isActive", value)} /><ToggleField label="Primary location" description="Shown first across location choices." checked={form.isPrimary} onCheckedChange={(value) => set("isPrimary", value)} /></div>{editing && form.isActive && <p className="mt-3 text-xs text-muted-foreground">Locations with active orders cannot be deactivated until those orders are completed.</p>}</FormSection>
    {serviceError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{serviceError}</p>}
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Saving…" : "Save location"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <fieldset className="space-y-3 border-t border-border pt-4 first:border-0 first:pt-0"><legend className="mb-3 text-sm font-semibold">{title}</legend>{children}</fieldset>; }
function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: React.ReactNode }) { return <div className={`space-y-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}<FieldError id={`${slugify(label)}-error`}>{error}</FieldError></div>; }
function ToggleField({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) { return <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"><div><Label>{label}</Label><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function typeLabel(value: ShopBranchDto["branchType"]) { return value === "PICKUP_POINT" ? "Pickup point" : value === "WAREHOUSE" ? "Warehouse" : "Store"; }
