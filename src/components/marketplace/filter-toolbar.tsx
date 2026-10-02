"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CatalogSort = "newest" | "price-asc" | "price-desc";
export function FilterToolbar({ count, sort, children }: { count: number; sort: CatalogSort; children?: React.ReactNode }) {
  const router = useRouter(); const params = useSearchParams();
  const changeSort = (nextSort: CatalogSort) => { const next = new URLSearchParams(params.toString()); if (nextSort === "newest") { next.delete("sort"); } else { next.set("sort", nextSort); } const query = next.toString(); router.push(query ? `/products?${query}` : "/products"); };
  return <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{count}</span> {count === 1 ? "product" : "products"}</p><div className="flex items-center gap-2"><label htmlFor="catalog-sort" className="text-sm font-medium text-muted-foreground">Sort</label><Select value={sort} onValueChange={(value) => changeSort(value as CatalogSort)}><SelectTrigger id="catalog-sort" className="h-11 w-44 rounded-xl bg-background text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="price-asc">Price: Low to High</SelectItem><SelectItem value="price-desc">Price: High to Low</SelectItem></SelectContent></Select>{children}</div></div>;
}
