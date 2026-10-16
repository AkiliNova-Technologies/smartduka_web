"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BranchInventoryData } from "@/lib/branch-inventory-client";
import { cn } from "@/lib/utils";

type Operation = "RESTOCK" | "CORRECTION";
type StandardMutation = (input: { productId: string; variantId?: string | null; operation: "INCREMENT" | "DECREMENT" | "SET"; quantity: number; reason: "RESTOCK" | "CORRECTION" | "DAMAGE" | "RETURN" | "OTHER" }) => Promise<unknown>;
type LocationMutation = (input: { requestId: string; branchId: string; productId: string; variantId?: string | null; operation: "ALLOCATE" | "RESTOCK" | "ADJUST"; quantity: number; reason?: string }) => Promise<unknown>;

export function calculateInventoryProjection(current: number, operation: Operation, amount: number) {
  const next = operation === "RESTOCK" ? current + amount : amount;
  return { current, change: next - current, next };
}

export function InventoryUpdateDialog({ open, onOpenChange, data, initialProductId, initialVariantId, adjustStandard, mutateLocation, refresh }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: BranchInventoryData | null;
  initialProductId?: string;
  initialVariantId?: string | null;
  adjustStandard: StandardMutation;
  mutateLocation: LocationMutation;
  refresh: () => Promise<void>;
}) {
  const managed = data?.mode === "LOCATION_MANAGED";
  const [productId, setProductId] = useState(initialProductId ?? "");
  const [variantId, setVariantId] = useState(initialVariantId ?? "");
  const [branchId, setBranchId] = useState("");
  const [operation, setOperation] = useState<Operation>("RESTOCK");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) => [product.name, product.sku, ...product.variants.flatMap((variant) => [variant.name, variant.sku])].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(query)));
  }, [products, search]);
  const product = products.find((item) => item.id === productId);
  const variant = product?.variants.find((item) => item.id === variantId);
  const validIdentity = Boolean(product && (!product.variants.length || variant));
  const current = useMemo(() => {
    if (!product || !validIdentity) return 0;
    if (!managed) return variant?.inventoryCount ?? product.inventoryCount;
    if (!branchId) return 0;
    return (data?.inventories ?? []).find((row) => row.branchId === branchId && row.productId === product.id && row.variantId === (variant?.id ?? null))?.onHandQuantity ?? 0;
  }, [branchId, data?.inventories, managed, product, validIdentity, variant]);
  const amount = Number(quantity);
  const projection = calculateInventoryProjection(current, operation, Number.isFinite(amount) ? amount : 0);
  const reduction = operation === "CORRECTION" && projection.change < 0;

  function chooseProduct(value: string) {
    setProductId(value);
    const next = products.find((item) => item.id === value);
    setVariantId(next?.variants.length ? "" : "");
    setError("");
  }

  function validate() {
    if (!product) return "Select a product.";
    if (product.variants.length && !variant) return "Select a variant.";
    if (managed && !branchId) return "Select a location.";
    if (!Number.isSafeInteger(amount) || amount < 0) return "Enter a valid whole-number quantity.";
    if (operation === "RESTOCK" && amount === 0) return "Restock quantity must be greater than zero.";
    if (operation === "CORRECTION" && projection.change === 0) return "The corrected quantity must differ from current stock.";
    if (operation === "CORRECTION" && !reason.trim()) return "Add a reason for this correction.";
    return "";
  }

  async function submit() {
    if (saving) return;
    const message = validate();
    if (message) return setError(message);
    if (reduction && !confirming) {
      setError("");
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (managed) {
        await mutateLocation({ requestId: crypto.randomUUID(), branchId, productId, variantId: variant?.id ?? null, operation: operation === "RESTOCK" ? "RESTOCK" : "ADJUST", quantity: operation === "RESTOCK" ? amount : projection.change, reason: reason.trim() || undefined });
      } else {
        await adjustStandard({ productId, variantId: variant?.id ?? null, operation: operation === "RESTOCK" ? "INCREMENT" : "SET", quantity: amount, reason: operation === "RESTOCK" ? "RESTOCK" : "CORRECTION" });
      }
      toast.success("Inventory updated.");
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inventory update failed.");
      setConfirming(false);
      await refresh().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  const itemName = product ? `${product.name}${variant ? ` · ${variant.name}` : ""}` : "Selected item";
  return <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
    <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto p-0">
      <DialogHeader className="border-b border-border/60 px-6 py-5">
        <DialogTitle>{confirming ? "Confirm stock reduction" : "Update inventory"}</DialogTitle>
        <DialogDescription>{confirming ? "Review this correction before reducing available stock." : "Manage stock quantities and keep your product availability accurate."}</DialogDescription>
      </DialogHeader>
      {confirming ? <div className="space-y-4 px-6 py-2">
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" /><div><p className="font-medium">{itemName}</p><p className="mt-1 text-sm text-muted-foreground">Stock will change from <strong>{projection.current}</strong> to <strong>{projection.next}</strong> units.</p></div></div>
        <div className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Reduction</span><br /><strong className="text-destructive">{projection.change} units</strong></p><p><span className="text-muted-foreground">Reason</span><br /><strong>{reason.trim()}</strong></p></div>
      </div> : <form className="space-y-5 px-6 py-2" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {managed && <div className="space-y-2"><Label htmlFor="inventory-dialog-location">Location</Label><Select value={branchId} onValueChange={setBranchId} disabled={saving}><SelectTrigger id="inventory-dialog-location" className="w-full"><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent>{data?.branches.map((branch) => <SelectItem key={branch.id} value={branch.id} disabled={!branch.isActive}>{branch.name}</SelectItem>)}</SelectContent></Select></div>}
        <div className="space-y-2"><Label htmlFor="inventory-product-search">Product</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="inventory-product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by product or SKU" className="pl-9" disabled={saving} /></div><Select value={productId} onValueChange={chooseProduct} disabled={saving}><SelectTrigger aria-label="Product" className="w-full"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{filteredProducts.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ""}</SelectItem>)}</SelectContent></Select></div>
        {product?.variants.length ? <div className="space-y-2"><Label htmlFor="inventory-dialog-variant">Variant</Label><Select value={variantId} onValueChange={setVariantId} disabled={saving}><SelectTrigger id="inventory-dialog-variant" className="w-full"><SelectValue placeholder="Select variant" /></SelectTrigger><SelectContent>{product.variants.map((item) => <SelectItem key={item.id} value={item.id} disabled={!item.isActive}>{item.name}{item.sku ? ` · ${item.sku}` : ""}</SelectItem>)}</SelectContent></Select></div> : null}
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="inventory-dialog-operation">Operation</Label><Select value={operation} onValueChange={(value) => setOperation(value as Operation)} disabled={saving}><SelectTrigger id="inventory-dialog-operation" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="RESTOCK">Restock</SelectItem><SelectItem value="CORRECTION">Correct stock</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{operation === "RESTOCK" ? "Add units to current stock." : "Set the corrected total stock quantity."}</p></div><div className="space-y-2"><Label htmlFor="inventory-dialog-quantity">{operation === "RESTOCK" ? "Units to add" : "Corrected quantity"}</Label><Input id="inventory-dialog-quantity" type="number" min="0" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={saving} /></div></div>
        {operation === "CORRECTION" && <div className="space-y-2"><Label htmlFor="inventory-dialog-reason">Correction reason</Label><Input id="inventory-dialog-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why stock is being corrected" disabled={saving} required /></div>}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-center"><PreviewValue label="Current" value={current} /><ArrowRight className="size-4 text-muted-foreground" /><PreviewValue label="New total" value={projection.next} danger={projection.next < current} /><p className={cn("col-span-3 text-xs", projection.change < 0 ? "text-destructive" : "text-muted-foreground")}>{operation === "RESTOCK" ? "Adding" : "Change"}: {projection.change >= 0 ? "+" : ""}{projection.change} units</p></div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      </form>}
      <DialogFooter className="border-t border-border/60 px-6 py-4"><Button type="button" variant="outline" onClick={() => confirming ? setConfirming(false) : onOpenChange(false)} disabled={saving}>{confirming ? "Back" : "Cancel"}</Button><Button type="button" onClick={() => void submit()} disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{saving ? "Updating…" : confirming ? "Confirm reduction" : "Update inventory"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function PreviewValue({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className={cn("mt-1 text-xl font-semibold", danger && "text-destructive")}>{value} <span className="text-xs font-normal">units</span></p></div>;
}
